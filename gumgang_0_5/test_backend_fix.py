#!/usr/bin/env python3
"""
백엔드 통합 테스트 스크립트
GG-20250809-FIX-001: 백엔드 통합 수정 검증
"""

import requests
import json
import time
import sys
from datetime import datetime
from typing import Dict, Any

# ANSI 색상 코드
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    RESET = '\033[0m'
    BOLD = '\033[1m'

BASE_URL = "http://localhost:8001"

def test_endpoint(method: str, endpoint: str, data: Dict = None, expected_status: int = 200) -> bool:
    """엔드포인트 테스트"""
    url = f"{BASE_URL}{endpoint}"

    try:
        if method == "GET":
            response = requests.get(url, timeout=5)
        elif method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            print(f"{Colors.RED}❌ Unsupported method: {method}{Colors.RESET}")
            return False

        if response.status_code == expected_status:
            print(f"{Colors.GREEN}✅ {method} {endpoint}: {response.status_code}{Colors.RESET}")

            # JSON 응답 파싱 시도
            try:
                result = response.json()
                print(f"   Response: {json.dumps(result, indent=2)[:200]}...")
            except:
                print(f"   Response: {response.text[:100]}...")

            return True
        else:
            print(f"{Colors.RED}❌ {method} {endpoint}: {response.status_code} (expected {expected_status}){Colors.RESET}")
            print(f"   Error: {response.text[:200]}")
            return False

    except requests.exceptions.ConnectionError:
        print(f"{Colors.RED}❌ {method} {endpoint}: Connection failed (서버가 실행 중이 아님){Colors.RESET}")
        return False
    except Exception as e:
        print(f"{Colors.RED}❌ {method} {endpoint}: {str(e)}{Colors.RESET}")
        return False

def run_tests():
    """모든 테스트 실행"""
    print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}🧪 백엔드 통합 테스트 시작{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}\n")

    tests_passed = 0
    tests_failed = 0

    # 1. 기본 엔드포인트 테스트
    print(f"{Colors.BLUE}📍 기본 엔드포인트 테스트{Colors.RESET}")
    print("-" * 40)

    basic_tests = [
        ("GET", "/health"),
        ("GET", "/"),
        ("GET", "/api/test"),
        ("POST", "/api/echo", {"message": "test", "timestamp": datetime.now().isoformat()}),
        ("GET", "/api/tasks"),
        ("GET", "/api/dashboard/stats"),
        ("GET", "/api/structure"),
        ("GET", "/api/memory/status"),
    ]

    for method, endpoint, *args in basic_tests:
        data = args[0] if args else None
        if test_endpoint(method, endpoint, data):
            tests_passed += 1
        else:
            tests_failed += 1
        time.sleep(0.5)

    # 2. AI Ask 엔드포인트 테스트
    print(f"\n{Colors.BLUE}🤖 AI Ask 엔드포인트 테스트{Colors.RESET}")
    print("-" * 40)

    ask_data = {
        "query": "테스트 질문입니다",
        "code": "def test(): pass",
        "language": "python"
    }

    if test_endpoint("POST", "/ask", ask_data):
        tests_passed += 1
    else:
        tests_failed += 1

    # 3. Protocol 엔드포인트 테스트
    print(f"\n{Colors.BLUE}🛡️ Protocol 엔드포인트 테스트{Colors.RESET}")
    print("-" * 40)

    protocol_tests = [
        ("GET", "/api/protocol/health"),
        ("GET", "/api/git/status"),
        ("GET", "/api/git/checkpoints?limit=5"),
        ("GET", "/api/git/stats"),
        ("GET", "/api/task/statistics"),
        ("POST", "/api/task/generate", {"description": "테스트 작업", "category": "TEST", "risk": "S"}),
    ]

    for method, endpoint, *args in protocol_tests:
        data = args[0] if args else None
        if test_endpoint(method, endpoint, data):
            tests_passed += 1
        else:
            tests_failed += 1
        time.sleep(0.5)

    # 4. 명령 테스트
    print(f"\n{Colors.BLUE}⚡ Protocol 명령 테스트{Colors.RESET}")
    print("-" * 40)

    command_tests = [
        ("POST", "/api/protocol/command", {"action": "pause"}),
        ("POST", "/api/protocol/command", {"action": "resume"}),
        ("POST", "/api/git/checkpoint", {"message": "테스트 체크포인트", "risk": "S"}),
    ]

    for method, endpoint, data in command_tests:
        if test_endpoint(method, endpoint, data):
            tests_passed += 1
        else:
            tests_failed += 1
        time.sleep(0.5)

    # 5. Task 관리 테스트
    print(f"\n{Colors.BLUE}📋 Task 관리 엔드포인트 테스트{Colors.RESET}")
    print("-" * 40)

    task_data = {
        "task_id": "GG-20250809-TEST-001",
        "task_name": "테스트 작업",
        "status": "pending",
        "progress": 0
    }

    if test_endpoint("POST", "/api/tasks", task_data):
        tests_passed += 1
    else:
        tests_failed += 1

    # 결과 요약
    print(f"\n{Colors.BOLD}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}📊 테스트 결과 요약{Colors.RESET}")
    print(f"{Colors.BOLD}{'='*60}{Colors.RESET}")

    total_tests = tests_passed + tests_failed
    success_rate = (tests_passed / total_tests * 100) if total_tests > 0 else 0

    print(f"✅ 성공: {tests_passed}")
    print(f"❌ 실패: {tests_failed}")
    print(f"📈 성공률: {success_rate:.1f}%")

    if tests_failed == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 모든 테스트 통과!{Colors.RESET}")
        return True
    else:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️ 일부 테스트 실패{Colors.RESET}")

        # 실패한 엔드포인트에 대한 수정 제안
        print(f"\n{Colors.BLUE}💡 수정 제안:{Colors.RESET}")
        print("1. Protocol 관련 import 오류 확인")
        print("2. git_safety_guard.py, semantic_task_id.py 파일 위치 확인")
        print("3. ProtocolGuardV3.get_status() 메소드 구현 확인")
        print("4. 백엔드 서버 재시작 필요")

        return False

def check_server_status():
    """서버 상태 확인"""
    print(f"{Colors.BLUE}🔍 서버 상태 확인 중...{Colors.RESET}")

    try:
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        if response.status_code == 200:
            print(f"{Colors.GREEN}✅ 서버가 실행 중입니다 (포트 8001){Colors.RESET}")
            return True
    except:
        pass

    print(f"{Colors.RED}❌ 서버가 응답하지 않습니다{Colors.RESET}")
    print(f"{Colors.YELLOW}서버 시작 명령:{Colors.RESET}")
    print("  cd backend && python3 simple_main.py")
    return False

if __name__ == "__main__":
    print(f"{Colors.BOLD}금강 2.0 백엔드 통합 테스트{Colors.RESET}")
    print(f"작업 ID: GG-20250809-FIX-001")
    print(f"시작 시간: {datetime.now().isoformat()}")

    if not check_server_status():
        print(f"\n{Colors.YELLOW}서버를 먼저 시작해주세요.{Colors.RESET}")
        sys.exit(1)

    success = run_tests()

    if success:
        print(f"\n{Colors.GREEN}✅ GG-20250809-FIX-001: 백엔드 통합 수정 완료{Colors.RESET}")
        sys.exit(0)
    else:
        print(f"\n{Colors.YELLOW}⚠️ GG-20250809-FIX-001: 추가 수정 필요{Colors.RESET}")
        sys.exit(1)
