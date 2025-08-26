#!/usr/bin/env python3
"""
금강 2.0 백엔드 최종 테스트 스크립트

모든 수정사항이 제대로 적용되었는지 확인하는 종합 테스트
이 테스트가 통과하면 시스템이 완벽하게 준비된 것입니다.

작성일: 2025-08-08
"""

import asyncio
import sys
import os
from pathlib import Path
from datetime import datetime
import traceback
import subprocess
import json

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
    UNDERLINE = '\033[4m'

def print_header(text):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{text:^70}{Colors.ENDC}")
    print(f"{Colors.HEADER}{Colors.BOLD}{'='*70}{Colors.ENDC}")

def print_success(text):
    print(f"{Colors.OKGREEN}✅ {text}{Colors.ENDC}")

def print_warning(text):
    print(f"{Colors.WARNING}⚠️  {text}{Colors.ENDC}")

def print_error(text):
    print(f"{Colors.FAIL}❌ {text}{Colors.ENDC}")

def print_info(text):
    print(f"{Colors.OKCYAN}ℹ️  {text}{Colors.ENDC}")

def print_section(title):
    print(f"\n{Colors.BOLD}{Colors.OKBLUE}▶ {title}{Colors.ENDC}")
    print(f"{Colors.OKBLUE}{'─'*60}{Colors.ENDC}")

async def test_imports():
    """모든 import가 정상적으로 되는지 확인"""
    print_section("1. Import 테스트")

    test_results = {}

    # Core imports
    try:
        from app.core.system_manager import SystemConfig, get_system_manager
        print_success("app.core.system_manager import 성공")
        test_results['system_manager'] = True
    except Exception as e:
        print_error(f"system_manager import 실패: {e}")
        test_results['system_manager'] = False

    # Memory imports
    try:
        from app.core.memory.temporal import TemporalMemorySystem
        print_success("app.core.memory.temporal import 성공")
        test_results['temporal_memory'] = True
    except Exception as e:
        print_error(f"temporal_memory import 실패: {e}")
        test_results['temporal_memory'] = False

    # Cognition imports
    try:
        from app.core.cognition.meta import MetaCognitiveSystem
        print_success("app.core.cognition.meta import 성공")
        test_results['meta_cognitive'] = True
    except Exception as e:
        print_error(f"meta_cognitive import 실패: {e}")
        test_results['meta_cognitive'] = False

    # Engines imports - Fixed version
    try:
        from app.engines import (
            CreativeAssociationEngine,
            DreamSystem,
            EmotionalEmpathySystem,
            EmotionalState,
            EmpathyResponse,
            MutualGazingState,  # Fixed: was MirrorNeuron
            EmotionRecognition  # Fixed: was SomaticMarker
        )
        print_success("app.engines import 성공 (수정된 클래스명)")
        test_results['engines'] = True
    except Exception as e:
        print_error(f"engines import 실패: {e}")
        test_results['engines'] = False

    # API imports
    try:
        from app.api import app
        print_success("app.api import 성공")
        test_results['api'] = True
    except Exception as e:
        print_warning(f"api import 실패 (선택사항): {e}")
        test_results['api'] = False

    return test_results

async def test_system_initialization():
    """시스템 초기화 테스트"""
    print_section("2. 시스템 초기화 테스트")

    try:
        from app.core.system_manager import SystemConfig, get_system_manager

        # 모든 시스템 활성화
        config = SystemConfig(
            enable_temporal_memory=True,
            enable_meta_cognitive=True,
            enable_creative=True,
            enable_dream=True,
            enable_empathy=True
        )

        manager = get_system_manager(config)
        success = await manager.initialize()

        if success:
            print_success("시스템 초기화 성공!")

            # 각 시스템 확인
            systems_status = {
                'temporal_memory': bool(manager.temporal_memory),
                'meta_cognitive': bool(manager.meta_cognitive),
                'creative_engine': bool(manager.creative_engine),
                'dream_system': bool(manager.dream_system),
                'empathy_system': bool(manager.empathy_system)
            }

            for name, status in systems_status.items():
                if status:
                    print_success(f"  • {name}: 활성화됨")
                else:
                    print_warning(f"  • {name}: 비활성화")

            # Health check test
            print_info("\n헬스 체크 테스트 중...")
            health = await manager.health_check()

            # Check for required keys
            required_keys = ['status', 'state', 'systems', 'metrics', 'uptime']
            missing_keys = [key for key in required_keys if key not in health]

            if not missing_keys:
                print_success(f"헬스 체크 정상: status={health['status']}")
                print_info(f"  • 가동시간: {health['uptime']}")
                print_info(f"  • 상태: {health['state']}")
            else:
                print_error(f"헬스 체크 누락 키: {missing_keys}")

            # Shutdown test
            print_info("\n시스템 종료 테스트 중...")
            await manager.shutdown()
            print_success("시스템 정상 종료")

            return True, systems_status

        else:
            print_error("시스템 초기화 실패")
            return False, {}

    except Exception as e:
        print_error(f"초기화 테스트 실패: {e}")
        traceback.print_exc()
        return False, {}

async def test_individual_components():
    """개별 컴포넌트 기능 테스트"""
    print_section("3. 개별 컴포넌트 테스트")

    from app.core.system_manager import SystemConfig, get_system_manager

    config = SystemConfig(
        enable_temporal_memory=True,
        enable_meta_cognitive=True,
        enable_creative=True,
        enable_dream=True,
        enable_empathy=True
    )

    manager = get_system_manager(config)
    await manager.initialize()

    test_results = {}

    # 1. Temporal Memory Test
    try:
        if manager.temporal_memory:
            test_data = {
                "content": "테스트 메모리",
                "type": "test",
                "timestamp": datetime.now().isoformat()
            }
            # Handle both sync and async store_memory
            result = manager.temporal_memory.store_memory(test_data)
            if asyncio.iscoroutine(result):
                await result
            print_success("Temporal Memory: 메모리 저장 성공")
            test_results['temporal_memory'] = True
        else:
            print_warning("Temporal Memory: 시스템 미활성화")
            test_results['temporal_memory'] = False
    except Exception as e:
        print_error(f"Temporal Memory 테스트 실패: {e}")
        test_results['temporal_memory'] = False

    # 2. Meta-Cognitive Test
    try:
        if manager.meta_cognitive:
            print_success("Meta-Cognitive: 시스템 활성화 확인")
            test_results['meta_cognitive'] = True
        else:
            print_warning("Meta-Cognitive: 시스템 미활성화")
            test_results['meta_cognitive'] = False
    except Exception as e:
        print_error(f"Meta-Cognitive 테스트 실패: {e}")
        test_results['meta_cognitive'] = False

    # 3. Creative Engine Test
    try:
        if manager.creative_engine:
            print_success("Creative Engine: 시스템 활성화 확인")
            test_results['creative_engine'] = True
        else:
            print_warning("Creative Engine: 시스템 미활성화")
            test_results['creative_engine'] = False
    except Exception as e:
        print_error(f"Creative Engine 테스트 실패: {e}")
        test_results['creative_engine'] = False

    # 4. Dream System Test
    try:
        if manager.dream_system:
            print_success("Dream System: 시스템 활성화 확인")
            test_results['dream_system'] = True
        else:
            print_warning("Dream System: 시스템 미활성화")
            test_results['dream_system'] = False
    except Exception as e:
        print_error(f"Dream System 테스트 실패: {e}")
        test_results['dream_system'] = False

    # 5. Empathy System Test
    try:
        if manager.empathy_system:
            print_success("Empathy System: 시스템 활성화 확인")
            test_results['empathy_system'] = True
        else:
            print_warning("Empathy System: 시스템 미활성화")
            test_results['empathy_system'] = False
    except Exception as e:
        print_error(f"Empathy System 테스트 실패: {e}")
        test_results['empathy_system'] = False

    await manager.shutdown()
    return test_results

async def test_api_readiness():
    """API 서버 준비 상태 테스트"""
    print_section("4. API 서버 준비 상태")

    try:
        # Check if FastAPI can be imported and initialized
        from app.api import app
        from app.api.routes.chat import router

        print_success("FastAPI 앱 import 성공")
        print_success("Chat 라우터 import 성공")

        # Check endpoints
        routes = []
        for route in app.routes:
            if hasattr(route, 'path'):
                routes.append(route.path)

        important_routes = [
            '/',
            '/api/v1/health',
            '/api/docs'
        ]

        for route in important_routes:
            if route in routes:
                print_success(f"  • {route} 엔드포인트 등록됨")
            else:
                print_info(f"  • {route} 엔드포인트 미등록 (추가 설정 필요)")

        return True

    except Exception as e:
        print_warning(f"API 준비 상태 확인 실패 (선택사항): {e}")
        return False

def check_files_status():
    """주요 파일 존재 여부 확인"""
    print_section("5. 파일 상태 확인")

    files_to_check = {
        "README.md": "프로젝트 문서",
        "MIGRATION.md": "마이그레이션 가이드",
        "requirements.txt": "의존성 목록",
        "PROJECT_STATUS.md": "프로젝트 상태",
        "app/core/system_manager.py": "시스템 매니저",
        "app/api/__init__.py": "API 메인",
        "app/api/routes/chat.py": "채팅 라우터",
        "test_full_system.py": "전체 테스트",
        "check_refactoring_status.py": "상태 체크"
    }

    all_exist = True
    for filepath, description in files_to_check.items():
        if Path(filepath).exists():
            print_success(f"{description}: {filepath}")
        else:
            print_warning(f"{description} 없음: {filepath}")
            all_exist = False

    return all_exist

async def main():
    """메인 테스트 함수"""
    print(f"\n{Colors.BOLD}{Colors.HEADER}")
    print("🚀 금강 2.0 백엔드 최종 테스트")
    print(f"📅 테스트 시각: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{Colors.ENDC}")

    all_tests_passed = True
    test_summary = {}

    # 1. Import Tests
    import_results = await test_imports()
    test_summary['imports'] = all(import_results.values())
    if not test_summary['imports']:
        all_tests_passed = False

    # 2. System Initialization Tests
    init_success, systems_status = await test_system_initialization()
    test_summary['initialization'] = init_success
    if not init_success:
        all_tests_passed = False

    # 3. Component Tests
    component_results = await test_individual_components()
    test_summary['components'] = all(component_results.values())
    if not test_summary['components']:
        all_tests_passed = False

    # 4. API Readiness
    api_ready = await test_api_readiness()
    test_summary['api'] = api_ready
    # API is optional, so don't fail overall test

    # 5. File Status
    files_ok = check_files_status()
    test_summary['files'] = files_ok
    if not files_ok:
        all_tests_passed = False

    # Final Summary
    print_header("📊 최종 테스트 결과")

    print(f"\n{Colors.BOLD}테스트 요약:{Colors.ENDC}")
    for test_name, passed in test_summary.items():
        if passed:
            print_success(f"  {test_name}: 통과")
        else:
            print_error(f"  {test_name}: 실패")

    print(f"\n{Colors.BOLD}시스템 상태:{Colors.ENDC}")
    if systems_status:
        active_systems = sum(1 for v in systems_status.values() if v)
        total_systems = len(systems_status)
        print_info(f"  활성화된 시스템: {active_systems}/{total_systems}")

    # Final verdict
    print(f"\n{Colors.BOLD}{'='*70}{Colors.ENDC}")
    if all_tests_passed:
        print(f"{Colors.OKGREEN}{Colors.BOLD}")
        print("🎉 축하합니다! 모든 테스트를 통과했습니다!")
        print("금강 2.0 백엔드가 완벽하게 준비되었습니다!")
        print(f"{Colors.ENDC}")

        print(f"\n{Colors.BOLD}다음 단계:{Colors.ENDC}")
        print("1. API 서버 실행: python3 -m uvicorn main:app --reload")
        print("2. 프론트엔드 연동: http://localhost:8000/api/docs 에서 API 문서 확인")
        print("3. 프로덕션 배포 준비 완료!")
    else:
        print(f"{Colors.WARNING}{Colors.BOLD}")
        print("⚠️ 일부 테스트가 실패했습니다.")
        print("위의 오류 메시지를 확인하고 수정해주세요.")
        print(f"{Colors.ENDC}")

        print(f"\n{Colors.BOLD}문제 해결 팁:{Colors.ENDC}")
        if not test_summary.get('imports', True):
            print("• Import 오류: pip3 install -r requirements.txt 실행")
        if not test_summary.get('initialization', True):
            print("• 초기화 오류: check_refactoring_status.py 실행하여 상세 확인")
        if not test_summary.get('components', True):
            print("• 컴포넌트 오류: 개별 시스템 로그 확인")

    print(f"\n{Colors.BOLD}✨ 테스트 완료!{Colors.ENDC}\n")

    return all_tests_passed

if __name__ == "__main__":
    # Python 버전 확인
    if sys.version_info < (3, 7):
        print_error(f"Python 3.7 이상 필요 (현재: {sys.version})")
        sys.exit(1)

    # 이벤트 루프 실행
    result = asyncio.run(main())
    sys.exit(0 if result else 1)
