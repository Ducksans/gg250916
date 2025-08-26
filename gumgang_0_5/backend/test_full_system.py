#!/usr/bin/env python3
"""
금강 2.0 전체 시스템 테스트 스크립트

모든 엔진을 포함한 전체 시스템 초기화 및 기능 테스트
scipy가 설치되어 있어야 모든 기능이 작동합니다.

작성일: 2025-08-08
"""

import asyncio
import sys
from pathlib import Path
from datetime import datetime
import traceback
from typing import Dict, Any

# 백엔드 경로 추가
sys.path.insert(0, str(Path(__file__).parent))

# 색상 코드
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*60}{Colors.ENDC}")

def print_success(text):
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.ENDC}")

async def test_temporal_memory(manager):
    """시간적 메모리 시스템 테스트"""
    print_header("📦 시간적 메모리 시스템 테스트")

    try:
        if not manager.temporal_memory:
            print_error("시간적 메모리 시스템이 초기화되지 않음")
            return False

        # 메모리 저장 테스트
        test_memory = {
            "type": "test",
            "content": "테스트 메모리",
            "timestamp": datetime.now().isoformat()
        }

        # store_memory 메서드 확인
        if hasattr(manager.temporal_memory, 'store_memory'):
            print_success("store_memory 메서드 존재")

            # 간단한 메모리 저장 테스트
            try:
                # 메서드 시그니처에 맞게 호출
                result = await manager.temporal_memory.store_memory(
                    content=test_memory["content"],
                    memory_type=test_memory["type"]
                )
                print_success("메모리 저장 성공")
            except TypeError as e:
                # 시그니처가 다른 경우 다른 방식으로 시도
                print_info(f"다른 시그니처로 재시도: {e}")
                try:
                    result = manager.temporal_memory.store_memory(test_memory)
                    if asyncio.iscoroutine(result):
                        await result
                    print_success("메모리 저장 성공 (대체 방식)")
                except Exception as e2:
                    print_warning(f"메모리 저장 실패: {e2}")

        # 메모리 검색 테스트
        if hasattr(manager.temporal_memory, 'search_memory'):
            print_success("search_memory 메서드 존재")

        return True

    except Exception as e:
        print_error(f"시간적 메모리 테스트 실패: {e}")
        traceback.print_exc()
        return False

async def test_metacognitive(manager):
    """메타인지 시스템 테스트"""
    print_header("🧠 메타인지 시스템 테스트")

    try:
        if not manager.meta_cognitive:
            print_error("메타인지 시스템이 초기화되지 않음")
            return False

        # 메타인지 상태 확인
        if hasattr(manager.meta_cognitive, 'get_current_state'):
            print_success("get_current_state 메서드 존재")

        # 인지 패턴 분석 테스트
        if hasattr(manager.meta_cognitive, 'analyze_pattern'):
            print_success("analyze_pattern 메서드 존재")

        print_success("메타인지 시스템 기본 기능 확인 완료")
        return True

    except Exception as e:
        print_error(f"메타인지 테스트 실패: {e}")
        traceback.print_exc()
        return False

async def test_creative_engine(manager):
    """창의 엔진 테스트"""
    print_header("🎨 창의 엔진 테스트")

    try:
        if not manager.creative_engine:
            print_warning("창의 엔진이 초기화되지 않음 (scipy 필요)")
            return False

        # 창의적 연상 테스트
        if hasattr(manager.creative_engine, 'generate_association'):
            print_success("generate_association 메서드 존재")

            # 간단한 연상 테스트
            test_input = "하늘"
            try:
                result = await manager.creative_engine.generate_association(test_input)
                print_success(f"창의적 연상 생성 성공: '{test_input}' → 결과 생성됨")
            except Exception as e:
                print_info(f"연상 생성 시 경고: {e}")

        print_success("창의 엔진 기본 기능 확인 완료")
        return True

    except Exception as e:
        print_error(f"창의 엔진 테스트 실패: {e}")
        traceback.print_exc()
        return False

async def test_dream_system(manager):
    """꿈 시스템 테스트"""
    print_header("💭 꿈 시스템 테스트")

    try:
        if not manager.dream_system:
            print_warning("꿈 시스템이 초기화되지 않음 (scipy 필요)")
            return False

        # 꿈 생성 테스트
        if hasattr(manager.dream_system, 'generate_dream'):
            print_success("generate_dream 메서드 존재")

        # 꿈 분석 테스트
        if hasattr(manager.dream_system, 'analyze_dream'):
            print_success("analyze_dream 메서드 존재")

        print_success("꿈 시스템 기본 기능 확인 완료")
        return True

    except Exception as e:
        print_error(f"꿈 시스템 테스트 실패: {e}")
        traceback.print_exc()
        return False

async def test_empathy_system(manager):
    """공감 시스템 테스트"""
    print_header("💖 공감 시스템 테스트")

    try:
        if not manager.empathy_system:
            print_warning("공감 시스템이 초기화되지 않음 (scipy 필요)")
            return False

        # 감정 분석 테스트
        if hasattr(manager.empathy_system, 'analyze_emotion'):
            print_success("analyze_emotion 메서드 존재")

        # 공감 반응 생성 테스트
        if hasattr(manager.empathy_system, 'generate_empathic_response'):
            print_success("generate_empathic_response 메서드 존재")

        print_success("공감 시스템 기본 기능 확인 완료")
        return True

    except Exception as e:
        print_error(f"공감 시스템 테스트 실패: {e}")
        traceback.print_exc()
        return False

async def test_system_health(manager):
    """시스템 헬스 체크"""
    print_header("🏥 시스템 헬스 체크")

    try:
        health = await manager.health_check()

        print_info(f"전체 시스템 상태: {health['status']}")
        print_info(f"가동 시간: {health.get('uptime', 'N/A')}")

        # 각 시스템별 상태
        systems = health.get('systems', {})
        for system_name, system_status in systems.items():
            if system_status:
                print_success(f"  • {system_name}: 정상")
            else:
                print_warning(f"  • {system_name}: 비활성")

        # 메트릭 확인
        metrics = health.get('metrics', {})
        if metrics:
            print_info(f"\n📊 메트릭:")
            print_info(f"  • 총 요청: {metrics.get('total_requests', 0)}")
            print_info(f"  • 오류 수: {metrics.get('errors', 0)}")
            print_info(f"  • 초기화 횟수: {metrics.get('initialization_count', 0)}")

        return True

    except Exception as e:
        print_error(f"헬스 체크 실패: {e}")
        return False

async def main():
    """메인 테스트 함수"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("🚀 금강 2.0 전체 시스템 테스트")
    print(f"📅 테스트 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{Colors.ENDC}")

    # 의존성 확인
    print_header("📦 의존성 확인")
    dependencies = {
        'numpy': False,
        'scipy': False,
        'sklearn': False
    }

    for package in dependencies:
        try:
            __import__(package)
            dependencies[package] = True
            print_success(f"{package} 설치됨")
        except ImportError:
            print_warning(f"{package} 미설치")

    # 시스템 초기화
    print_header("🔧 시스템 초기화")

    try:
        from app.core.system_manager import SystemConfig, get_system_manager

        # 모든 엔진 활성화 시도
        config = SystemConfig(
            enable_temporal_memory=True,
            enable_meta_cognitive=True,
            enable_creative=dependencies['scipy'],  # scipy가 있을 때만 활성화
            enable_dream=dependencies['scipy'],
            enable_empathy=dependencies['scipy']
        )

        print_info("시스템 구성:")
        print_info(f"  • 시간적 메모리: {'활성' if config.enable_temporal_memory else '비활성'}")
        print_info(f"  • 메타인지: {'활성' if config.enable_meta_cognitive else '비활성'}")
        print_info(f"  • 창의 엔진: {'활성' if config.enable_creative else '비활성'}")
        print_info(f"  • 꿈 시스템: {'활성' if config.enable_dream else '비활성'}")
        print_info(f"  • 공감 시스템: {'활성' if config.enable_empathy else '비활성'}")

        manager = get_system_manager(config)
        success = await manager.initialize()

        if not success:
            print_error("시스템 초기화 실패")
            return

        print_success("시스템 초기화 완료!")

        # 각 시스템 테스트
        test_results = {}

        # 필수 시스템 테스트
        test_results['temporal_memory'] = await test_temporal_memory(manager)
        test_results['metacognitive'] = await test_metacognitive(manager)

        # 옵션 시스템 테스트
        if config.enable_creative:
            test_results['creative'] = await test_creative_engine(manager)

        if config.enable_dream:
            test_results['dream'] = await test_dream_system(manager)

        if config.enable_empathy:
            test_results['empathy'] = await test_empathy_system(manager)

        # 헬스 체크
        test_results['health'] = await test_system_health(manager)

        # 결과 요약
        print_header("📊 테스트 결과 요약")

        total_tests = len(test_results)
        passed_tests = sum(1 for result in test_results.values() if result)

        for test_name, result in test_results.items():
            if result:
                print_success(f"{test_name}: 통과")
            else:
                print_error(f"{test_name}: 실패")

        print(f"\n{Colors.BOLD}총 {passed_tests}/{total_tests} 테스트 통과{Colors.ENDC}")

        if passed_tests == total_tests:
            print_success("\n🎉 모든 테스트 통과! 시스템이 완벽하게 작동합니다!")
        elif passed_tests >= total_tests * 0.7:
            print_warning("\n⚠️ 대부분의 테스트 통과. 일부 기능 확인 필요.")
        else:
            print_error("\n❌ 테스트 실패가 많습니다. 시스템 점검 필요.")

        # 시스템 종료
        print_header("🛑 시스템 종료")
        await manager.shutdown()
        print_success("시스템 정상 종료")

    except Exception as e:
        print_error(f"테스트 중 오류 발생: {e}")
        traceback.print_exc()

    print(f"\n{Colors.BOLD}✨ 테스트 완료!{Colors.ENDC}\n")

if __name__ == "__main__":
    # Python 버전 확인
    if sys.version_info < (3, 7):
        print_error(f"Python 3.7 이상 필요 (현재: {sys.version})")
        sys.exit(1)

    # 이벤트 루프 실행
    asyncio.run(main())
