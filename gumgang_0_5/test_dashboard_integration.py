#!/usr/bin/env python3
"""
금강 2.0 대시보드 통합 테스트

백엔드 API와 대시보드 기능의 통합 테스트를 수행합니다.
WebSocket 연결, REST API, 시스템 상태 모니터링 등을 검증합니다.

Author: Gumgang AI Team
Version: 2.0
"""

import asyncio
import json
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional

import aiohttp
import websockets
from colorama import init, Fore, Style

# colorama 초기화
init(autoreset=True)

# API 설정
API_BASE_URL = "http://localhost:8000/api/v1"
WS_URL = "ws://localhost:8000/api/v1/dashboard/ws"

class DashboardTester:
    def __init__(self):
        self.results = []
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0

    def print_header(self, title: str):
        """섹션 헤더 출력"""
        print(f"\n{Fore.CYAN}{'=' * 60}")
        print(f"{Fore.CYAN}{title.center(60)}")
        print(f"{Fore.CYAN}{'=' * 60}{Style.RESET_ALL}")

    def print_test(self, name: str, success: bool, message: str = ""):
        """테스트 결과 출력"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
            status = f"{Fore.GREEN}✓ PASS{Style.RESET_ALL}"
        else:
            self.failed_tests += 1
            status = f"{Fore.RED}✗ FAIL{Style.RESET_ALL}"

        print(f"  [{status}] {name}")
        if message:
            print(f"         {Fore.YELLOW}{message}{Style.RESET_ALL}")

    async def test_health_check(self, session: aiohttp.ClientSession) -> bool:
        """헬스 체크 API 테스트"""
        try:
            async with session.get(f"{API_BASE_URL}/health") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    self.print_test(
                        "Health Check API",
                        True,
                        f"Status: {data.get('status', 'unknown')}"
                    )
                    return True
                else:
                    self.print_test(
                        "Health Check API",
                        False,
                        f"HTTP {resp.status}"
                    )
                    return False
        except Exception as e:
            self.print_test(
                "Health Check API",
                False,
                str(e)
            )
            return False

    async def test_project_status(self, session: aiohttp.ClientSession) -> bool:
        """프로젝트 상태 API 테스트"""
        try:
            async with session.get(f"{API_BASE_URL}/dashboard/status") as resp:
                if resp.status == 200:
                    data = await resp.json()

                    # 백엔드 상태 확인
                    backend_status = data.get('backend', {}).get('status')
                    self.print_test(
                        "Project Status - Backend",
                        backend_status == 'running',
                        f"Status: {backend_status}"
                    )

                    # 시스템 상태 확인
                    systems = data.get('systems', [])
                    for system in systems:
                        is_healthy = system.get('health', 0) > 50
                        self.print_test(
                            f"System Health - {system.get('name')}",
                            is_healthy,
                            f"Health: {system.get('health')}%"
                        )

                    return True
                else:
                    self.print_test(
                        "Project Status API",
                        False,
                        f"HTTP {resp.status}"
                    )
                    return False
        except Exception as e:
            self.print_test(
                "Project Status API",
                False,
                str(e)
            )
            return False

    async def test_task_management(self, session: aiohttp.ClientSession) -> bool:
        """작업 관리 API 테스트"""
        try:
            # 1. 작업 생성
            new_task = {
                "title": "테스트 작업",
                "description": "대시보드 통합 테스트용 작업",
                "type": "test",
                "priority": 3
            }

            async with session.post(
                f"{API_BASE_URL}/dashboard/tasks",
                json=new_task
            ) as resp:
                if resp.status == 200:
                    task = await resp.json()
                    task_id = task.get('id')
                    self.print_test(
                        "Task Creation",
                        True,
                        f"Task ID: {task_id}"
                    )

                    # 2. 작업 조회
                    async with session.get(f"{API_BASE_URL}/dashboard/tasks") as resp2:
                        tasks = await resp2.json()
                        found = any(t.get('id') == task_id for t in tasks)
                        self.print_test(
                            "Task Retrieval",
                            found,
                            f"Found {len(tasks)} tasks"
                        )

                    # 3. 작업 업데이트
                    update_data = {
                        "status": "in_progress",
                        "progress": 50
                    }

                    async with session.patch(
                        f"{API_BASE_URL}/dashboard/tasks/{task_id}",
                        json=update_data
                    ) as resp3:
                        self.print_test(
                            "Task Update",
                            resp3.status == 200,
                            "Status: in_progress, Progress: 50%"
                        )

                    # 4. 작업 삭제
                    async with session.delete(
                        f"{API_BASE_URL}/dashboard/tasks/{task_id}"
                    ) as resp4:
                        self.print_test(
                            "Task Deletion",
                            resp4.status == 200,
                            f"Deleted task {task_id}"
                        )

                    return True
                else:
                    self.print_test(
                        "Task Creation",
                        False,
                        f"HTTP {resp.status}"
                    )
                    return False

        except Exception as e:
            self.print_test(
                "Task Management",
                False,
                str(e)
            )
            return False

    async def test_websocket_connection(self) -> bool:
        """WebSocket 연결 테스트"""
        try:
            async with websockets.connect(WS_URL) as websocket:
                # 연결 메시지 수신
                message = await asyncio.wait_for(
                    websocket.recv(),
                    timeout=5.0
                )
                data = json.loads(message)

                if data.get('type') == 'connection':
                    self.print_test(
                        "WebSocket Connection",
                        True,
                        data.get('message', '')
                    )

                    # Ping 테스트
                    await websocket.send(json.dumps({"type": "ping"}))

                    # Pong 응답 대기
                    response = await asyncio.wait_for(
                        websocket.recv(),
                        timeout=5.0
                    )
                    pong_data = json.loads(response)

                    self.print_test(
                        "WebSocket Ping/Pong",
                        pong_data.get('type') == 'pong',
                        "Ping/Pong successful"
                    )

                    return True
                else:
                    self.print_test(
                        "WebSocket Connection",
                        False,
                        "Unexpected message type"
                    )
                    return False

        except asyncio.TimeoutError:
            self.print_test(
                "WebSocket Connection",
                False,
                "Connection timeout"
            )
            return False
        except Exception as e:
            self.print_test(
                "WebSocket Connection",
                False,
                str(e)
            )
            return False

    async def test_metrics(self, session: aiohttp.ClientSession) -> bool:
        """메트릭 API 테스트"""
        try:
            async with session.get(f"{API_BASE_URL}/dashboard/metrics") as resp:
                if resp.status == 200:
                    data = await resp.json()

                    files = data.get('files', {})
                    self.print_test(
                        "Metrics API",
                        True,
                        f"Python: {files.get('python', 0)} files, "
                        f"JS: {files.get('javascript', 0)} files"
                    )
                    return True
                else:
                    self.print_test(
                        "Metrics API",
                        False,
                        f"HTTP {resp.status}"
                    )
                    return False
        except Exception as e:
            self.print_test(
                "Metrics API",
                False,
                str(e)
            )
            return False

    async def test_system_commands(self, session: aiohttp.ClientSession) -> bool:
        """시스템 명령 API 테스트"""
        try:
            # 테스트 명령 실행
            command = {
                "target": "temporal_memory",
                "action": "test",
                "params": {}
            }

            async with session.post(
                f"{API_BASE_URL}/dashboard/system/command",
                json=command
            ) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    self.print_test(
                        "System Command - Test",
                        result.get('success', False),
                        result.get('message', '')
                    )
                    return True
                else:
                    self.print_test(
                        "System Command",
                        False,
                        f"HTTP {resp.status}"
                    )
                    return False
        except Exception as e:
            self.print_test(
                "System Command",
                False,
                str(e)
            )
            return False

    async def run_all_tests(self):
        """모든 테스트 실행"""
        print(f"{Fore.MAGENTA}🚀 금강 2.0 대시보드 통합 테스트 시작{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}API Base URL: {API_BASE_URL}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}WebSocket URL: {WS_URL}{Style.RESET_ALL}")

        # HTTP 세션 생성
        async with aiohttp.ClientSession() as session:
            # 1. REST API 테스트
            self.print_header("REST API 테스트")

            # 헬스 체크
            await self.test_health_check(session)

            # 프로젝트 상태
            await self.test_project_status(session)

            # 메트릭
            await self.test_metrics(session)

            # 2. 작업 관리 테스트
            self.print_header("작업 관리 테스트")
            await self.test_task_management(session)

            # 3. 시스템 제어 테스트
            self.print_header("시스템 제어 테스트")
            await self.test_system_commands(session)

        # 4. WebSocket 테스트
        self.print_header("WebSocket 테스트")
        await self.test_websocket_connection()

        # 결과 요약
        self.print_summary()

    def print_summary(self):
        """테스트 결과 요약 출력"""
        self.print_header("테스트 결과 요약")

        success_rate = (self.passed_tests / self.total_tests * 100) if self.total_tests > 0 else 0

        print(f"\n  총 테스트: {self.total_tests}")
        print(f"  {Fore.GREEN}성공: {self.passed_tests}{Style.RESET_ALL}")
        print(f"  {Fore.RED}실패: {self.failed_tests}{Style.RESET_ALL}")
        print(f"  성공률: {success_rate:.1f}%")

        if self.failed_tests == 0:
            print(f"\n{Fore.GREEN}✅ 모든 테스트 통과!{Style.RESET_ALL}")
            print(f"{Fore.GREEN}대시보드가 정상적으로 작동하고 있습니다.{Style.RESET_ALL}")
        else:
            print(f"\n{Fore.RED}⚠️ 일부 테스트 실패{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}실패한 테스트를 확인하고 수정이 필요합니다.{Style.RESET_ALL}")

        print(f"\n{Fore.CYAN}테스트 완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}{Style.RESET_ALL}")

async def check_server_running():
    """서버 실행 상태 확인"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_BASE_URL}/health", timeout=2) as resp:
                return resp.status == 200
    except:
        return False

async def main():
    """메인 함수"""
    # 서버 실행 확인
    print(f"{Fore.YELLOW}백엔드 서버 연결 확인 중...{Style.RESET_ALL}")

    server_running = await check_server_running()

    if not server_running:
        print(f"{Fore.RED}❌ 백엔드 서버가 실행되지 않았습니다!{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}다음 명령으로 서버를 시작하세요:{Style.RESET_ALL}")
        print(f"  cd backend && python3 app_new.py")
        sys.exit(1)

    print(f"{Fore.GREEN}✓ 백엔드 서버 연결 성공{Style.RESET_ALL}\n")

    # 테스트 실행
    tester = DashboardTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    # 필요한 패키지 확인
    try:
        import aiohttp
        import websockets
        import colorama
    except ImportError as e:
        print(f"필요한 패키지가 설치되지 않았습니다: {e}")
        print("다음 명령으로 설치하세요:")
        print("  pip install aiohttp websockets colorama")
        sys.exit(1)

    # 테스트 실행
    asyncio.run(main())
