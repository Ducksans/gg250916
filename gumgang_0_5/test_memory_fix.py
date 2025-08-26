#!/usr/bin/env python3
"""
Gumgang 2.0 메모리 시스템 연결 테스트
2025-08-10 작성
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://localhost:8000"

def test_memory_status():
    """메모리 상태 엔드포인트 테스트"""
    print("=" * 60)
    print("1. 메모리 상태 확인 (/memory/status)")
    print("-" * 60)

    try:
        response = requests.get(f"{BASE_URL}/memory/status", timeout=5)
        print(f"상태 코드: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            print(f"응답 데이터:")
            print(json.dumps(data, indent=2, ensure_ascii=False))

            # 메모리 레벨별 개수 표시
            if "memories_by_level" in data:
                print("\n메모리 레벨별 상태:")
                levels = data["memories_by_level"]
                level_names = {
                    "level1": "임시 기억",
                    "level2": "에피소드",
                    "level3": "의미 기억",
                    "level4": "절차 기억",
                    "level5": "메타인지"
                }
                for level, count in levels.items():
                    name = level_names.get(level, level)
                    print(f"  - {name}: {count}개")
                print(f"  총합: {data.get('total_memories', 0)}개")

            return True
        else:
            print(f"❌ 에러: HTTP {response.status_code}")
            print(f"응답: {response.text}")
            return False

    except requests.exceptions.ConnectionError:
        print("❌ 연결 실패: 백엔드가 실행 중인지 확인하세요")
        return False
    except Exception as e:
        print(f"❌ 예외 발생: {str(e)}")
        return False

def test_memory_search():
    """메모리 검색 엔드포인트 테스트"""
    print("\n" + "=" * 60)
    print("2. 메모리 검색 테스트 (/memory/search)")
    print("-" * 60)

    test_queries = ["Gumgang", "Blueprint", "메모리", ""]

    for query in test_queries:
        print(f"\n검색어: '{query}'")
        try:
            params = {"query": query} if query else {}
            response = requests.get(f"{BASE_URL}/memory/search", params=params, timeout=5)

            if response.status_code == 200:
                data = response.json()
                print(f"  결과 개수: {data.get('count', 0)}개")
                if data.get('results'):
                    print(f"  첫 번째 결과: {data['results'][0].get('content', '')[:50]}...")
            else:
                print(f"  ❌ 에러: HTTP {response.status_code}")

        except Exception as e:
            print(f"  ❌ 예외: {str(e)}")

def test_api_memory_status():
    """API 경로 메모리 상태 테스트 (더미 데이터)"""
    print("\n" + "=" * 60)
    print("3. API 메모리 상태 (/api/memory/status)")
    print("-" * 60)

    try:
        response = requests.get(f"{BASE_URL}/api/memory/status", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ API 메모리 상태 (더미 데이터):")
            print(json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"❌ 에러: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ 예외: {str(e)}")

def test_backend_health():
    """백엔드 헬스체크"""
    print("\n" + "=" * 60)
    print("4. 백엔드 헬스체크 (/health)")
    print("-" * 60)

    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ 백엔드 상태: {data.get('status', 'unknown')}")
            if 'timestamp' in data:
                print(f"   시간: {data['timestamp']}")
        else:
            print(f"❌ 에러: HTTP {response.status_code}")
    except Exception as e:
        print(f"❌ 예외: {str(e)}")

def main():
    """메인 테스트 실행"""
    print("\n" + "🧪" * 30)
    print(" Gumgang 2.0 메모리 시스템 연결 테스트")
    print(" 시작 시간:", datetime.now().strftime("%Y-%m-%d %H:%M:%S"))
    print("🧪" * 30)

    # 백엔드 헬스체크
    test_backend_health()

    # 메모리 상태 테스트
    memory_ok = test_memory_status()

    # 메모리 검색 테스트
    if memory_ok:
        test_memory_search()

    # API 메모리 상태 (더미)
    test_api_memory_status()

    print("\n" + "=" * 60)
    print("✅ 테스트 완료!")
    print("=" * 60)

    if memory_ok:
        print("\n💡 메모리 시스템이 정상적으로 연결되었습니다!")
        print("   브라우저에서 http://localhost:3000/memory 를 새로고침하면")
        print("   메모리 개수가 표시될 것입니다.")
    else:
        print("\n⚠️ 메모리 시스템 연결에 문제가 있습니다.")
        print("   1. 백엔드를 재시작해주세요:")
        print("      pkill -f simple_main.py")
        print("      cd backend && python simple_main.py")
        print("   2. 다시 이 스크립트를 실행해주세요.")

if __name__ == "__main__":
    main()
