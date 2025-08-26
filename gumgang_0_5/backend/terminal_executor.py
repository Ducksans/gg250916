#!/usr/bin/env python3
"""
Terminal Executor Module
Secure command execution with validation and safety controls
"""

import asyncio
import os
import subprocess
import json
import re
import shlex
import signal
import time
from typing import Dict, List, Optional, Tuple, Any
from datetime import datetime
from pathlib import Path
import logging
from enum import Enum

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CommandRisk(Enum):
    """Command risk levels"""
    SAFE = "safe"
    CAUTION = "caution"
    DANGEROUS = "dangerous"
    BLOCKED = "blocked"

class TerminalExecutor:
    """Secure terminal command executor with validation"""

    # Patterns for dangerous commands that should be blocked
    DANGEROUS_PATTERNS = [
        r'^rm\s+-rf\s+/',  # rm -rf /
        r'^dd\s+if=.*of=/dev/[sh]d[a-z]',  # dd to disk
        r'^mkfs\.',  # format filesystem
        r':(){.*}:&',  # fork bomb
        r'^cat\s+/dev/urandom.*>.*/dev/[sh]d[a-z]',  # overwrite disk
        r'^chmod\s+-R\s+777\s+/',  # chmod 777 /
        r'^chown\s+-R.*/',  # chown root /
        r'>/dev/[sh]d[a-z]',  # redirect to disk
        r'^wget.*\|\s*sh',  # download and execute
        r'^curl.*\|\s*bash',  # download and execute
        r'^python\s+-c.*os\.system',  # python system command
        r'^eval\s+',  # eval arbitrary code
        r'^exec\s+',  # exec arbitrary code
        r'rm\s+-rf\s+\*',  # rm -rf *
        r':(){ :|:& };:',  # fork bomb alternative
    ]

    # Patterns for commands that need caution
    CAUTION_PATTERNS = [
        r'^sudo\s+',  # sudo commands
        r'^rm\s+',  # any rm command
        r'^mv\s+.*/',  # move to root paths
        r'^cp\s+.*/',  # copy to root paths
        r'^kill\s+',  # kill processes
        r'^pkill\s+',  # pkill processes
        r'^killall\s+',  # killall processes
        r'^service\s+.*stop',  # stop services
        r'^systemctl\s+.*stop',  # stop systemd services
        r'^npm\s+install',  # npm install
        r'^pip\s+install',  # pip install
        r'^apt\s+install',  # apt install
        r'^git\s+push\s+--force',  # force push
        r'^git\s+reset\s+--hard',  # hard reset
        r'>\s*/',  # redirect to root
        r'^/bin/',  # direct binary execution
        r'^/usr/bin/',  # direct binary execution
    ]

    # Allowed safe commands (whitelist)
    SAFE_COMMANDS = [
        'ls', 'pwd', 'cd', 'echo', 'cat', 'grep', 'find', 'which',
        'whoami', 'date', 'uptime', 'df', 'du', 'free', 'ps', 'top',
        'git status', 'git diff', 'git log', 'git branch', 'npm list',
        'pip list', 'python --version', 'node --version', 'npm --version'
    ]

    def __init__(self, max_output_size: int = 1024 * 1024):  # 1MB max output
        """
        Initialize the terminal executor

        Args:
            max_output_size: Maximum allowed output size in bytes
        """
        self.max_output_size = max_output_size
        self.execution_history: List[Dict[str, Any]] = []
        self.blocked_commands: List[Dict[str, Any]] = []

    def assess_command_risk(self, command: str) -> Tuple[CommandRisk, List[str]]:
        """
        Assess the risk level of a command

        Args:
            command: Command to assess

        Returns:
            Tuple of (risk_level, warnings)
        """
        command_lower = command.strip().lower()
        warnings = []

        # Check for dangerous patterns
        for pattern in self.DANGEROUS_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                warnings.append(f"Dangerous pattern detected: {pattern}")
                return CommandRisk.DANGEROUS, warnings

        # Check for caution patterns
        for pattern in self.CAUTION_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                warnings.append(f"Caution pattern detected: {pattern}")

        if warnings:
            return CommandRisk.CAUTION, warnings

        # Check if it's in the safe list
        for safe_cmd in self.SAFE_COMMANDS:
            if command_lower.startswith(safe_cmd.lower()):
                return CommandRisk.SAFE, []

        # Default to caution for unknown commands
        warnings.append("Unknown command - proceed with caution")
        return CommandRisk.CAUTION, warnings

    def validate_working_directory(self, work_dir: str) -> bool:
        """
        Validate that the working directory is safe

        Args:
            work_dir: Directory path to validate

        Returns:
            True if safe, False otherwise
        """
        if not work_dir:
            return False

        try:
            path = Path(work_dir).resolve()

            # Check if path exists
            if not path.exists():
                logger.warning(f"Working directory does not exist: {work_dir}")
                return False

            # Check if it's a directory
            if not path.is_dir():
                logger.warning(f"Working directory is not a directory: {work_dir}")
                return False

            # Prevent access to sensitive system directories
            sensitive_dirs = ['/etc', '/sys', '/proc', '/dev', '/boot', '/root']
            path_str = str(path)

            for sensitive in sensitive_dirs:
                if path_str.startswith(sensitive):
                    logger.warning(f"Attempted access to sensitive directory: {path_str}")
                    return False

            return True

        except Exception as e:
            logger.error(f"Error validating working directory: {e}")
            return False

    async def execute_command(
        self,
        command: str,
        work_dir: str = None,
        timeout: int = 30,
        env: Dict[str, str] = None,
        allow_dangerous: bool = False
    ) -> Dict[str, Any]:
        """
        Execute a terminal command with safety checks

        Args:
            command: Command to execute
            work_dir: Working directory for command execution
            timeout: Command timeout in seconds
            env: Environment variables
            allow_dangerous: Allow dangerous commands (use with extreme caution)

        Returns:
            Dict with execution results
        """
        execution_id = f"exec_{int(time.time() * 1000)}"
        start_time = datetime.now()

        result = {
            'id': execution_id,
            'command': command,
            'timestamp': start_time.isoformat(),
            'success': False,
            'output': '',
            'error': '',
            'exit_code': -1,
            'risk_level': None,
            'warnings': [],
            'execution_time': 0
        }

        try:
            # Assess command risk
            risk_level, warnings = self.assess_command_risk(command)
            result['risk_level'] = risk_level.value
            result['warnings'] = warnings

            # Block dangerous commands unless explicitly allowed
            if risk_level == CommandRisk.DANGEROUS and not allow_dangerous:
                result['error'] = 'Command blocked due to high risk'
                result['success'] = False
                self.blocked_commands.append(result)
                logger.warning(f"Blocked dangerous command: {command}")
                return result

            # Validate working directory
            if work_dir:
                if not self.validate_working_directory(work_dir):
                    result['error'] = 'Invalid working directory'
                    return result
            else:
                work_dir = os.getcwd()

            # Prepare environment
            cmd_env = os.environ.copy()
            if env:
                cmd_env.update(env)

            # Add safety environment variables
            cmd_env['PYTHONDONTWRITEBYTECODE'] = '1'
            cmd_env['TERM'] = 'xterm-256color'

            # Parse command (use shell=True cautiously)
            # For better security, we should parse and validate each argument
            # but for compatibility, we'll use shell=True with restrictions

            # Execute command with timeout
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=work_dir,
                env=cmd_env,
                limit=self.max_output_size
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=timeout
                )

                # Decode output
                output = stdout.decode('utf-8', errors='replace') if stdout else ''
                error = stderr.decode('utf-8', errors='replace') if stderr else ''

                # Check output size
                if len(output) > self.max_output_size:
                    output = output[:self.max_output_size] + '\n... [OUTPUT TRUNCATED]'
                if len(error) > self.max_output_size // 4:
                    error = error[:self.max_output_size // 4] + '\n... [ERROR TRUNCATED]'

                result['output'] = output
                result['error'] = error
                result['exit_code'] = process.returncode
                result['success'] = process.returncode == 0

            except asyncio.TimeoutError:
                # Kill the process if it times out
                try:
                    process.kill()
                    await process.wait()
                except:
                    pass

                result['error'] = f'Command timed out after {timeout} seconds'
                result['success'] = False

        except Exception as e:
            logger.error(f"Command execution error: {e}")
            result['error'] = str(e)
            result['success'] = False

        finally:
            # Calculate execution time
            end_time = datetime.now()
            result['execution_time'] = (end_time - start_time).total_seconds()

            # Add to history
            self.execution_history.append(result)

            # Log execution
            logger.info(f"Command executed: {command[:50]}... (risk: {result['risk_level']}, success: {result['success']})")

        return result

    def get_execution_history(
        self,
        limit: int = 100,
        include_blocked: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Get command execution history

        Args:
            limit: Maximum number of entries to return
            include_blocked: Include blocked commands in history

        Returns:
            List of execution history entries
        """
        history = self.execution_history.copy()

        if include_blocked:
            history.extend(self.blocked_commands)

        # Sort by timestamp (newest first)
        history.sort(key=lambda x: x['timestamp'], reverse=True)

        return history[:limit]

    def clear_history(self):
        """Clear execution history"""
        self.execution_history.clear()
        self.blocked_commands.clear()
        logger.info("Execution history cleared")

    def get_statistics(self) -> Dict[str, Any]:
        """
        Get execution statistics

        Returns:
            Dict with statistics
        """
        total_executed = len(self.execution_history)
        total_blocked = len(self.blocked_commands)

        if total_executed > 0:
            success_count = sum(1 for e in self.execution_history if e['success'])
            avg_execution_time = sum(e['execution_time'] for e in self.execution_history) / total_executed

            risk_distribution = {
                'safe': sum(1 for e in self.execution_history if e['risk_level'] == 'safe'),
                'caution': sum(1 for e in self.execution_history if e['risk_level'] == 'caution'),
                'dangerous': sum(1 for e in self.execution_history if e['risk_level'] == 'dangerous')
            }
        else:
            success_count = 0
            avg_execution_time = 0
            risk_distribution = {'safe': 0, 'caution': 0, 'dangerous': 0}

        return {
            'total_executed': total_executed,
            'total_blocked': total_blocked,
            'success_count': success_count,
            'failure_count': total_executed - success_count,
            'success_rate': (success_count / total_executed * 100) if total_executed > 0 else 0,
            'avg_execution_time': avg_execution_time,
            'risk_distribution': risk_distribution
        }


# FastAPI integration
from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from typing import Optional

class CommandRequest(BaseModel):
    """Request model for command execution"""
    command: str = Field(..., description="Command to execute")
    workDir: Optional[str] = Field(None, description="Working directory")
    timeout: Optional[int] = Field(30, description="Timeout in seconds", ge=1, le=300)
    env: Optional[Dict[str, str]] = Field(None, description="Environment variables")
    allowDangerous: Optional[bool] = Field(False, description="Allow dangerous commands")

class CommandResponse(BaseModel):
    """Response model for command execution"""
    success: bool
    output: str
    error: str
    exit_code: int
    risk_level: str
    warnings: List[str]
    execution_time: float

# Create global executor instance
executor = TerminalExecutor()

def register_terminal_routes(app: FastAPI):
    """
    Register terminal execution routes with FastAPI app

    Args:
        app: FastAPI application instance
    """

    @app.post("/api/terminal/execute", response_model=CommandResponse)
    async def execute_terminal_command(request: CommandRequest):
        """Execute a terminal command with safety checks"""
        try:
            result = await executor.execute_command(
                command=request.command,
                work_dir=request.workDir,
                timeout=request.timeout,
                env=request.env,
                allow_dangerous=request.allowDangerous
            )

            return CommandResponse(
                success=result['success'],
                output=result['output'],
                error=result['error'],
                exit_code=result['exit_code'],
                risk_level=result['risk_level'],
                warnings=result['warnings'],
                execution_time=result['execution_time']
            )

        except Exception as e:
            logger.error(f"Terminal execution error: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/terminal/history")
    async def get_terminal_history(limit: int = 100, include_blocked: bool = True):
        """Get command execution history"""
        try:
            history = executor.get_execution_history(limit, include_blocked)
            return JSONResponse(content={"history": history})
        except Exception as e:
            logger.error(f"Error getting history: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.get("/api/terminal/statistics")
    async def get_terminal_statistics():
        """Get terminal execution statistics"""
        try:
            stats = executor.get_statistics()
            return JSONResponse(content=stats)
        except Exception as e:
            logger.error(f"Error getting statistics: {e}")
            raise HTTPException(status_code=500, detail=str(e))

    @app.delete("/api/terminal/history")
    async def clear_terminal_history():
        """Clear terminal execution history"""
        try:
            executor.clear_history()
            return JSONResponse(content={"message": "History cleared successfully"})
        except Exception as e:
            logger.error(f"Error clearing history: {e}")
            raise HTTPException(status_code=500, detail=str(e))

# Standalone testing
if __name__ == "__main__":
    import asyncio

    async def test_executor():
        """Test the terminal executor"""
        test_executor = TerminalExecutor()

        # Test safe command
        print("Testing safe command...")
        result = await test_executor.execute_command("ls -la")
        print(f"Success: {result['success']}")
        print(f"Risk: {result['risk_level']}")
        print(f"Output: {result['output'][:100]}...")

        # Test dangerous command (should be blocked)
        print("\nTesting dangerous command...")
        result = await test_executor.execute_command("rm -rf /")
        print(f"Success: {result['success']}")
        print(f"Risk: {result['risk_level']}")
        print(f"Error: {result['error']}")

        # Get statistics
        print("\nStatistics:")
        stats = test_executor.get_statistics()
        print(json.dumps(stats, indent=2))

    # Run test
    asyncio.run(test_executor())
