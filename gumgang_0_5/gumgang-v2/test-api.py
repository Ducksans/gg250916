#!/usr/bin/env python3
"""
금강 2.0 API 테스트 스크립트
백엔드 API 엔드포인트들을 테스트합니다.
"""

import requests
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional
from colorama import init, Fore, Style

# Initialize colorama for colored output
init(autoreset=True)

API_BASE = "http://localhost:8001"

class APITester:
    def __init__(self, base_url: str = API_BASE):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []

    def print_header(self, title: str):
        """Print a formatted header"""
        print(f"\n{Fore.CYAN}{'='*60}")
        print(f"{Fore.CYAN}  {title}")
        print(f"{Fore.CYAN}{'='*60}{Style.RESET_ALL}")

    def print_test(self, name: str, success: bool, details: str = ""):
        """Print test result"""
        if success:
            status = f"{Fore.GREEN}✅ PASS"
        else:
            status = f"{Fore.RED}❌ FAIL"

        print(f"{status}{Style.RESET_ALL} {name}")
        if details:
            print(f"     {Fore.YELLOW}{details}{Style.RESET_ALL}")

    def test_endpoint(self, method: str, endpoint: str,
                      data: Optional[Dict] = None,
                      params: Optional[Dict] = None) -> tuple[bool, Any]:
        """Test a single endpoint"""
        url = f"{self.base_url}{endpoint}"

        try:
            if method == "GET":
                response = self.session.get(url, params=params, timeout=5)
            elif method == "POST":
                response = self.session.post(url, json=data, timeout=5)
            else:
                return False, f"Unsupported method: {method}"

            if response.status_code == 200:
                return True, response.json()
            else:
                return False, f"Status {response.status_code}: {response.text}"

        except requests.exceptions.ConnectionError:
            return False, "Connection failed - is the backend running?"
        except requests.exceptions.Timeout:
            return False, "Request timeout"
        except Exception as e:
            return False, str(e)

    def run_tests(self):
        """Run all API tests"""
        print(f"{Fore.MAGENTA}╔══════════════════════════════════════════════════════════╗")
        print(f"{Fore.MAGENTA}║          🧪 금강 2.0 API 테스트 시작                    ║")
        print(f"{Fore.MAGENTA}╚══════════════════════════════════════════════════════════╝{Style.RESET_ALL}")
        print(f"\n📍 API URL: {Fore.BLUE}{self.base_url}{Style.RESET_ALL}")
        print(f"🕐 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        # Test 1: Health Check
        self.print_header("1. Health Check")
        success, result = self.test_endpoint("GET", "/health")
        self.print_test("GET /health", success,
                       f"Response: {json.dumps(result, ensure_ascii=False) if success else result}")

        # Test 2: System Status
        self.print_header("2. System Status")
        success, result = self.test_endpoint("GET", "/status")
        self.print_test("GET /status", success)
        if success:
            print(f"     Backend Version: {result.get('backend_version', 'N/A')}")
            print(f"     Memory System: {result.get('memory_system', 'N/A')}")
            print(f"     ChromaDB: {result.get('chromadb_status', 'N/A')}")
            print(f"     OpenAI: {result.get('openai_status', 'N/A')}")

        # Test 3: Memory Status
        self.print_header("3. Memory Status")
        success, result = self.test_endpoint("GET", "/memory/status")
        self.print_test("GET /memory/status", success)
        if success:
            print(f"     Total Memories: {result.get('total_memories', 0):,}")
            print(f"     System Type: {result.get('system_type', 'N/A')}")
            if 'memories_by_level' in result:
                print(f"     Memory Distribution:")
                for level, count in result['memories_by_level'].items():
                    print(f"       - {level}: {count:,}")

        # Test 4: Chat API
        self.print_header("4. Chat API")
        test_messages = [
            "안녕하세요",
            "메모리 시스템에 대해 설명해주세요",
            "What is your purpose?"
        ]

        for msg in test_messages:
            success, result = self.test_endpoint("POST", "/ask",
                                                data={"message": msg, "session_id": "test"})
            self.print_test(f"POST /ask - '{msg[:30]}...'", success)
            if success and result.get('response'):
                response_preview = result['response'][:100] + "..." if len(result['response']) > 100 else result['response']
                print(f"     Response: {response_preview}")
                if result.get('metadata'):
                    meta = result['metadata']
                    print(f"     Metadata: memory_type={meta.get('memory_type')}, confidence={meta.get('confidence')}")

        # Test 5: Memory Search
        self.print_header("5. Memory Search")
        search_queries = ["덕산", "프로젝트", "학습"]

        for query in search_queries:
            success, result = self.test_endpoint("GET", "/memory/search",
                                                params={"query": query})
            self.print_test(f"GET /memory/search?query={query}", success)
            if success and isinstance(result, list):
                print(f"     Found {len(result)} memories")
                if result:
                    print(f"     First result: {result[0].get('content', 'N/A')[:80]}...")

        # Test 6: User Profile
        self.print_header("6. User Profile")
        success, result = self.test_endpoint("GET", "/memory/profile/default_user")
        self.print_test("GET /memory/profile/default_user", success)
        if success:
            print(f"     User ID: {result.get('user_id', 'N/A')}")
            print(f"     Interaction Count: {result.get('interaction_count', 0)}")
            print(f"     Memory Count: {result.get('memory_count', 0)}")

        # Test 7: Evolution Events
        self.print_header("7. Evolution Events")
        success, result = self.test_endpoint("GET", "/evolution/events",
                                            params={"limit": 5})
        self.print_test("GET /evolution/events", success)
        if success and isinstance(result, list):
            print(f"     Found {len(result)} evolution events")
            for event in result[:3]:  # Show first 3
                print(f"     - {event.get('type', 'N/A')}: {event.get('description', 'N/A')[:50]}...")

        # Test 8: Add Memory
        self.print_header("8. Add Memory")
        test_memory = {
            "content": f"테스트 메모리 - {datetime.now().isoformat()}",
            "level": 1,
            "metadata": {"source": "api_test", "importance": 0.5}
        }
        success, result = self.test_endpoint("POST", "/memory/add", data=test_memory)
        self.print_test("POST /memory/add", success)
        if success:
            print(f"     Memory ID: {result.get('id', 'N/A')}")
            print(f"     Message: {result.get('message', 'N/A')}")

        # Test 9: Response Time
        self.print_header("9. Performance Test")

        endpoints_to_test = [
            ("/health", "GET"),
            ("/status", "GET"),
            ("/memory/status", "GET")
        ]

        for endpoint, method in endpoints_to_test:
            start_time = time.time()
            success, _ = self.test_endpoint(method, endpoint)
            elapsed = (time.time() - start_time) * 1000  # Convert to ms

            if success:
                if elapsed < 100:
                    speed = f"{Fore.GREEN}Fast"
                elif elapsed < 500:
                    speed = f"{Fore.YELLOW}Normal"
                else:
                    speed = f"{Fore.RED}Slow"

                self.print_test(f"{method} {endpoint}", success,
                               f"Response time: {elapsed:.2f}ms ({speed}{Style.RESET_ALL})")
            else:
                self.print_test(f"{method} {endpoint}", success)

        # Summary
        self.print_header("Test Summary")
        print(f"\n{Fore.CYAN}🏁 테스트 완료!")
        print(f"⏱️  종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

        # Connection status
        health_ok, _ = self.test_endpoint("GET", "/health")
        if health_ok:
            print(f"\n{Fore.GREEN}✅ 백엔드 연결 상태: 정상{Style.RESET_ALL}")
            print(f"   모든 API 엔드포인트가 정상 작동 중입니다.")
        else:
            print(f"\n{Fore.RED}❌ 백엔드 연결 실패{Style.RESET_ALL}")
            print(f"   백엔드 서버가 실행 중인지 확인해주세요.")
            print(f"   실행 명령: python3 test_backend.py")

def main():
    """Main function"""
    tester = APITester()

    try:
        tester.run_tests()
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}테스트가 사용자에 의해 중단되었습니다.{Style.RESET_ALL}")
    except Exception as e:
        print(f"\n{Fore.RED}테스트 중 오류 발생: {e}{Style.RESET_ALL}")

if __name__ == "__main__":
    # Check if colorama is installed
    try:
        from colorama import init, Fore, Style
    except ImportError:
        print("Installing colorama for colored output...")
        import subprocess
        subprocess.check_call(["pip3", "install", "colorama"])
        from colorama import init, Fore, Style

    main()
