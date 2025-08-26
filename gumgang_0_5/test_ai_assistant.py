#!/usr/bin/env python3
"""
AI 코딩 어시스턴트 테스트 스크립트
====================================
테스트 항목:
1. 백엔드 /ask API 연결 확인
2. 다양한 액션 테스트 (explain, fix, refactor, complete, generate)
3. 세션 관리 테스트
4. 에러 처리 테스트
"""

import asyncio
import json
import time
from typing import Dict, Any, Optional
import requests
from datetime import datetime
import sys

# ANSI 색상 코드
class Colors:
    RESET = '\033[0m'
    BOLD = '\033[1m'
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    PURPLE = '\033[95m'
    CYAN = '\033[96m'

# 테스트 설정
API_BASE_URL = "http://localhost:8001"
TEST_SESSION_ID = None

def print_header(title: str):
    """테스트 섹션 헤더 출력"""
    print(f"\n{Colors.CYAN}{'='*60}{Colors.RESET}")
    print(f"{Colors.BOLD}{Colors.BLUE}{title}{Colors.RESET}")
    print(f"{Colors.CYAN}{'='*60}{Colors.RESET}")

def print_test(name: str, status: str, message: str = ""):
    """테스트 결과 출력"""
    if status == "PASS":
        print(f"{Colors.GREEN}✅ {name}: PASS{Colors.RESET}")
    elif status == "FAIL":
        print(f"{Colors.RED}❌ {name}: FAIL - {message}{Colors.RESET}")
    elif status == "WARN":
        print(f"{Colors.YELLOW}⚠️  {name}: WARNING - {message}{Colors.RESET}")
    else:
        print(f"{Colors.CYAN}ℹ️  {name}: {message}{Colors.RESET}")

def test_backend_health():
    """백엔드 헬스체크"""
    print_header("백엔드 상태 확인")

    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            print_test("Backend Health Check", "PASS")
            return True
        else:
            print_test("Backend Health Check", "FAIL", f"Status code: {response.status_code}")
            return False
    except Exception as e:
        print_test("Backend Health Check", "FAIL", str(e))
        return False

def test_ask_api(query: str, action: str = "chat", code: str = "", language: str = "python") -> Optional[Dict]:
    """AI API 테스트"""
    global TEST_SESSION_ID

    try:
        payload = {
            "query": query,
        }

        if TEST_SESSION_ID:
            payload["session_id"] = TEST_SESSION_ID

        # 액션별 쿼리 구성
        if action == "explain" and code:
            payload["query"] = f"다음 코드를 설명해주세요:\n```{language}\n{code}\n```"
        elif action == "fix" and code:
            payload["query"] = f"다음 코드의 버그를 수정해주세요:\n```{language}\n{code}\n```"
        elif action == "refactor" and code:
            payload["query"] = f"다음 코드를 리팩토링해주세요:\n```{language}\n{code}\n```"
        elif action == "complete" and code:
            payload["query"] = f"다음 코드를 완성해주세요:\n```{language}\n{code}\n```"
        elif action == "generate":
            payload["query"] = f"다음 요구사항에 맞는 {language} 코드를 생성해주세요:\n{query}"

        response = requests.post(
            f"{API_BASE_URL}/ask",
            json=payload,
            timeout=30
        )

        if response.status_code == 200:
            data = response.json()

            # 세션 ID 저장
            if "session_id" in data:
                TEST_SESSION_ID = data["session_id"]

            return data
        else:
            print_test(f"API Call ({action})", "FAIL", f"Status code: {response.status_code}")
            return None

    except Exception as e:
        print_test(f"API Call ({action})", "FAIL", str(e))
        return None

def test_code_explain():
    """코드 설명 테스트"""
    print_header("코드 설명 기능 테스트")

    test_code = """
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)
"""

    result = test_ask_api("", action="explain", code=test_code, language="python")

    if result and result.get("response"):
        print_test("Code Explain", "PASS")
        print(f"{Colors.CYAN}응답 길이: {len(result['response'])} 문자{Colors.RESET}")
        print(f"{Colors.YELLOW}응답 미리보기: {result['response'][:200]}...{Colors.RESET}")
        return True
    else:
        print_test("Code Explain", "FAIL", "No response received")
        return False

def test_code_fix():
    """버그 수정 테스트"""
    print_header("버그 수정 기능 테스트")

    buggy_code = """
def divide_numbers(a, b):
    result = a / b  # 0으로 나누기 에러 가능
    return result

print(divide_numbers(10, 0))
"""

    result = test_ask_api("", action="fix", code=buggy_code, language="python")

    if result and result.get("response"):
        print_test("Code Fix", "PASS")
        if "try" in result["response"].lower() or "except" in result["response"].lower():
            print_test("Error Handling Detection", "PASS", "에러 처리 코드 감지됨")
        else:
            print_test("Error Handling Detection", "WARN", "에러 처리 코드 미감지")
        return True
    else:
        print_test("Code Fix", "FAIL", "No response received")
        return False

def test_code_refactor():
    """리팩토링 테스트"""
    print_header("코드 리팩토링 테스트")

    messy_code = """
def calc(x,y,z):
    a=x+y
    b=a*z
    c=b/2
    return c
"""

    result = test_ask_api("", action="refactor", code=messy_code, language="python")

    if result and result.get("response"):
        print_test("Code Refactor", "PASS")
        return True
    else:
        print_test("Code Refactor", "FAIL", "No response received")
        return False

def test_code_generation():
    """코드 생성 테스트"""
    print_header("코드 생성 테스트")

    result = test_ask_api(
        "두 숫자를 입력받아 최대공약수를 구하는 함수",
        action="generate",
        language="python"
    )

    if result and result.get("response"):
        print_test("Code Generation", "PASS")
        if "def" in result["response"] or "function" in result["response"]:
            print_test("Function Generation", "PASS", "함수 생성 확인")
        else:
            print_test("Function Generation", "WARN", "함수 키워드 미감지")
        return True
    else:
        print_test("Code Generation", "FAIL", "No response received")
        return False

def test_session_management():
    """세션 관리 테스트"""
    print_header("세션 관리 테스트")

    global TEST_SESSION_ID

    # 첫 번째 요청
    result1 = test_ask_api("안녕하세요, 저는 테스트 사용자입니다.")
    if result1 and result1.get("session_id"):
        print_test("Session Creation", "PASS", f"Session ID: {result1['session_id'][:8]}...")

        # 같은 세션으로 두 번째 요청
        result2 = test_ask_api("제가 누구라고 했죠?")
        if result2 and result2.get("session_id") == result1.get("session_id"):
            print_test("Session Persistence", "PASS")

            # 컨텍스트 정보 확인
            if result2.get("context_info"):
                context = result2["context_info"]
                print_test("Context Info", "INFO",
                          f"Recent interactions: {context.get('recent_interactions', 0)}")
            return True
        else:
            print_test("Session Persistence", "FAIL", "Session ID mismatch")
            return False
    else:
        print_test("Session Creation", "FAIL", "No session ID received")
        return False

def test_error_handling():
    """에러 처리 테스트"""
    print_header("에러 처리 테스트")

    # 빈 쿼리 테스트
    result = test_ask_api("")
    if result:
        print_test("Empty Query Handling", "PASS", "서버가 빈 쿼리를 처리함")
    else:
        print_test("Empty Query Handling", "WARN", "빈 쿼리 처리 실패")

    # 매우 긴 쿼리 테스트
    long_query = "테스트 " * 1000
    result = test_ask_api(long_query[:500])  # 일부만 전송
    if result:
        print_test("Long Query Handling", "PASS")
    else:
        print_test("Long Query Handling", "WARN")

    return True

def test_performance():
    """성능 테스트"""
    print_header("성능 테스트")

    start_time = time.time()
    result = test_ask_api("간단한 테스트 쿼리")
    end_time = time.time()

    response_time = end_time - start_time

    if result:
        if response_time < 2:
            print_test("Response Time", "PASS", f"{response_time:.2f}초")
        elif response_time < 5:
            print_test("Response Time", "WARN", f"{response_time:.2f}초 (느림)")
        else:
            print_test("Response Time", "FAIL", f"{response_time:.2f}초 (매우 느림)")
        return True
    else:
        print_test("Response Time", "FAIL", "No response")
        return False

def main():
    """메인 테스트 실행"""
    print(f"{Colors.BOLD}{Colors.PURPLE}")
    print("=" * 60)
    print("    AI 코딩 어시스턴트 통합 테스트")
    print("    테스트 시작: " + datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("=" * 60)
    print(Colors.RESET)

    # 테스트 결과 추적
    results = {
        "passed": 0,
        "failed": 0,
        "warnings": 0
    }

    # 테스트 실행
    tests = [
        ("백엔드 연결", test_backend_health),
        ("코드 설명", test_code_explain),
        ("버그 수정", test_code_fix),
        ("코드 리팩토링", test_code_refactor),
        ("코드 생성", test_code_generation),
        ("세션 관리", test_session_management),
        ("에러 처리", test_error_handling),
        ("성능 측정", test_performance),
    ]

    for test_name, test_func in tests:
        try:
            if test_func():
                results["passed"] += 1
            else:
                results["failed"] += 1
        except Exception as e:
            print_test(test_name, "FAIL", f"Exception: {str(e)}")
            results["failed"] += 1

        # 테스트 간 짧은 딜레이
        time.sleep(0.5)

    # 최종 결과 출력
    print_header("테스트 결과 요약")

    total_tests = results["passed"] + results["failed"]
    success_rate = (results["passed"] / total_tests * 100) if total_tests > 0 else 0

    print(f"{Colors.GREEN}✅ 성공: {results['passed']}{Colors.RESET}")
    print(f"{Colors.RED}❌ 실패: {results['failed']}{Colors.RESET}")
    print(f"{Colors.YELLOW}⚠️  경고: {results['warnings']}{Colors.RESET}")
    print(f"\n{Colors.BOLD}성공률: {success_rate:.1f}%{Colors.RESET}")

    if success_rate >= 80:
        print(f"\n{Colors.GREEN}{Colors.BOLD}🎉 AI 어시스턴트가 정상적으로 작동합니다!{Colors.RESET}")
        return 0
    elif success_rate >= 50:
        print(f"\n{Colors.YELLOW}{Colors.BOLD}⚠️  일부 기능에 문제가 있습니다.{Colors.RESET}")
        return 1
    else:
        print(f"\n{Colors.RED}{Colors.BOLD}❌ AI 어시스턴트에 심각한 문제가 있습니다.{Colors.RESET}")
        return 2

if __name__ == "__main__":
    sys.exit(main())
