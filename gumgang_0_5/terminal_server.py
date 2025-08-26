#!/usr/bin/env python3
"""
Standalone Terminal Server
Secure command execution server with FastAPI
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

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Secure Terminal Server",
    description="안전한 터미널 명령어 실행 서버",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Production에서는 특정 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        self.trust_score = 100.0

    def reset_trust_score(self, score: float = 100.0) -> float:
        """
        Reset the trust score

        Args:
            score: New trust score value (0-100)

        Returns:
            New trust score
        """
        self.trust_score = max(0, min(100, score))
        logger.info(f"신뢰도 점수 리셋: {self.trust_score}%")
        return self.trust_score

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
                warnings.append(f"위험한 패턴 감지: {pattern}")
                return CommandRisk.DANGEROUS, warnings

        # Check for caution patterns
        for pattern in self.CAUTION_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                warnings.append(f"주의 필요 패턴: {pattern}")

        if warnings:
            return CommandRisk.CAUTION, warnings

        # Check if it's in the safe list
        for safe_cmd in self.SAFE_COMMANDS:
            if command_lower.startswith(safe_cmd.lower()):
                return CommandRisk.SAFE, []

        # Default to caution for unknown commands
        warnings.append("알 수 없는 명령어 - 주의가 필요합니다")
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
            return True  # Use current directory

        try:
            path = Path(work_dir).resolve()

            # Check if path exists
            if not path.exists():
                logger.warning(f"작업 디렉토리가 존재하지 않음: {work_dir}")
                return False

            # Check if it's a directory
            if not path.is_dir():
                logger.warning(f"디렉토리가 아님: {work_dir}")
                return False

            # Prevent access to sensitive system directories
            sensitive_dirs = ['/etc', '/sys', '/proc', '/dev', '/boot', '/root']
            path_str = str(path)

            for sensitive in sensitive_dirs:
                if path_str.startswith(sensitive):
                    logger.warning(f"민감한 디렉토리 접근 시도: {path_str}")
                    return False

            return True

        except Exception as e:
            logger.error(f"디렉토리 검증 오류: {e}")
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
                result['error'] = '위험한 명령어가 차단되었습니다'
                result['success'] = False
                self.blocked_commands.append(result)
                self.trust_score = max(0, self.trust_score - 10)
                logger.warning(f"위험한 명령어 차단: {command}")
                return result

            # Validate working directory
            if work_dir:
                if not self.validate_working_directory(work_dir):
                    result['error'] = '유효하지 않은 작업 디렉토리'
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

            # Execute command with timeout
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=work_dir,
                env=cmd_env
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
                    output = output[:self.max_output_size] + '\n... [출력 잘림]'
                if len(error) > self.max_output_size // 4:
                    error = error[:self.max_output_size // 4] + '\n... [에러 잘림]'

                result['output'] = output
                result['error'] = error
                result['exit_code'] = process.returncode
                result['success'] = process.returncode == 0

                # Update trust score
                if result['success']:
                    if risk_level == CommandRisk.SAFE:
                        self.trust_score = min(100, self.trust_score + 0.5)
                else:
                    self.trust_score = max(0, self.trust_score - 2)

            except asyncio.TimeoutError:
                # Kill the process if it times out
                try:
                    process.kill()
                    await process.wait()
                except:
                    pass

                result['error'] = f'{timeout}초 후 명령어 시간 초과'
                result['success'] = False
                self.trust_score = max(0, self.trust_score - 5)

        except Exception as e:
            logger.error(f"명령어 실행 오류: {e}")
            result['error'] = str(e)
            result['success'] = False

        finally:
            # Calculate execution time
            end_time = datetime.now()
            result['execution_time'] = (end_time - start_time).total_seconds()

            # Add to history
            self.execution_history.append(result)

            # Log execution
            logger.info(f"명령어 실행: {command[:50]}... (위험도: {result['risk_level']}, 성공: {result['success']})")

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
        logger.info("실행 기록 삭제됨")

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
            'risk_distribution': risk_distribution,
            'trust_score': self.trust_score
        }


# Request/Response models
class CommandRequest(BaseModel):
    """Request model for command execution"""
    command: str = Field(..., description="실행할 명령어")
    workDir: Optional[str] = Field(None, description="작업 디렉토리")
    timeout: Optional[int] = Field(30, description="타임아웃 (초)", ge=1, le=300)
    env: Optional[Dict[str, str]] = Field(None, description="환경 변수")
    allowDangerous: Optional[bool] = Field(False, description="위험한 명령어 허용")

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

# API Routes
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Secure Terminal Server",
        "version": "1.0.0",
        "status": "running",
        "trust_score": executor.trust_score
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "trust_score": executor.trust_score
    }

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
        logger.error(f"터미널 실행 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/terminal/history")
async def get_terminal_history(limit: int = 100, include_blocked: bool = True):
    """Get command execution history"""
    try:
        history = executor.get_execution_history(limit, include_blocked)
        return JSONResponse(content={"history": history})
    except Exception as e:
        logger.error(f"기록 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/terminal/statistics")
async def get_terminal_statistics():
    """Get terminal execution statistics"""
    try:
        stats = executor.get_statistics()
        return JSONResponse(content=stats)
    except Exception as e:
        logger.error(f"통계 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/terminal/history")
async def clear_terminal_history():
    """Clear terminal execution history"""
    try:
        executor.clear_history()
        return JSONResponse(content={"message": "기록이 성공적으로 삭제되었습니다"})
    except Exception as e:
        logger.error(f"기록 삭제 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/terminal/validate")
async def validate_command(command: str):
    """Validate a command without executing it"""
    try:
        risk_level, warnings = executor.assess_command_risk(command)
        return JSONResponse(content={
            "command": command,
            "risk_level": risk_level.value,
            "warnings": warnings,
            "would_block": risk_level == CommandRisk.DANGEROUS
        })
    except Exception as e:
        logger.error(f"명령어 검증 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/terminal/reset-trust")
async def reset_trust_score(trust_score: float = 100.0):
    """Reset the trust score"""
    try:
        new_score = executor.reset_trust_score(trust_score)
        return JSONResponse(content={
            "message": "신뢰도 점수가 리셋되었습니다",
            "trust_score": new_score
        })
    except Exception as e:
        logger.error(f"신뢰도 리셋 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Startup event
@app.on_event("startup")
async def startup_event():
    """Startup event handler"""
    logger.info("🚀 Secure Terminal Server 시작됨")
    logger.info(f"신뢰도 점수: {executor.trust_score}%")
    logger.info("포트 8002에서 실행 중...")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event handler"""
    logger.info("🛑 Secure Terminal Server 종료됨")
    stats = executor.get_statistics()
    logger.info(f"총 실행: {stats['total_executed']}, 차단: {stats['total_blocked']}")

if __name__ == "__main__":
    # Run the server
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8002,
        log_level="info",
        access_log=True
    )
