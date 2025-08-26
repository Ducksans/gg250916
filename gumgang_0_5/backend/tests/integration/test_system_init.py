#!/usr/bin/env python3
"""
금강 2.0 시스템 초기화 통합 테스트

이 모듈은 금강 AI 시스템의 초기화 과정을 테스트합니다.
모든 하위 시스템이 올바른 순서로 초기화되고,
의존성이 제대로 주입되는지 확인합니다.

Author: Gumgang AI Team
Version: 1.0
"""

import asyncio
import sys
import logging
from pathlib import Path
from typing import Dict, Any, Optional
import time
from datetime import datetime

# 경로 설정
sys.path.append(str(Path(__file__).parent.parent.parent))

from app.core.system_manager import (
    get_system_manager,
    SystemConfig,
    SystemState,
    initialize_gumgang_system,
    SystemInitializationError
)

# 로깅 설정
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SystemInitializationTest:
    """시스템 초기화 테스트 클래스"""

    def __init__(self):
        """테스트 초기화"""
        self.manager = None
        self.test_results = {
            'passed': [],
            'failed': [],
            'warnings': []
        }
        self.start_time = None

    async def test_basic_initialization(self) -> bool:
        """기본 시스템 초기화 테스트"""
        test_name = "Basic System Initialization"
        logger.info(f"\n{'='*60}")
        logger.info(f"테스트: {test_name}")
        logger.info(f"{'='*60}")

        try:
            # 기본 설정으로 시스템 매니저 생성
            config = SystemConfig(
                enable_temporal_memory=True,
                enable_meta_cognitive=True,
                enable_creative=True,
                enable_dream=True,
                enable_empathy=True,
                initialization_timeout=30.0
            )

            # 시스템 초기화
            self.manager = await initialize_gumgang_system(config)

            # 상태 확인
            assert self.manager.state == SystemState.READY, \
                f"시스템 상태가 READY가 아님: {self.manager.state}"

            # 각 시스템 확인
            assert self.manager.temporal_memory is not None, \
                "시간적 메모리 시스템이 초기화되지 않음"
            assert self.manager.meta_cognitive is not None, \
                "메타인지 시스템이 초기화되지 않음"

            self.test_results['passed'].append(test_name)
            logger.info(f"✅ {test_name} 통과")
            return True

        except Exception as e:
            self.test_results['failed'].append((test_name, str(e)))
            logger.error(f"❌ {test_name} 실패: {e}")
            return False

    async def test_dependency_injection(self) -> bool:
        """의존성 주입 테스트"""
        test_name = "Dependency Injection"
        logger.info(f"\n{'='*60}")
        logger.info(f"테스트: {test_name}")
        logger.info(f"{'='*60}")

        try:
            if not self.manager:
                await self.test_basic_initialization()

            # 창의 엔진의 의존성 확인
            if self.manager.creative_engine:
                assert hasattr(self.manager.creative_engine, 'temporal_memory'), \
                    "창의 엔진에 temporal_memory가 주입되지 않음"
                assert hasattr(self.manager.creative_engine, 'meta_cognitive'), \
                    "창의 엔진에 meta_cognitive가 주입되지 않음"
                logger.info("  ✓ 창의 엔진 의존성 확인")

            # 꿈 시스템의 의존성 확인
            if self.manager.dream_system:
                assert hasattr(self.manager.dream_system, 'temporal_memory'), \
                    "꿈 시스템에 temporal_memory가 주입되지 않음"
                assert hasattr(self.manager.dream_system, 'meta_cognitive'), \
                    "꿈 시스템에 meta_cognitive가 주입되지 않음"
                logger.info("  ✓ 꿈 시스템 의존성 확인")

            # 공감 시스템의 의존성 확인
            if self.manager.empathy_system:
                assert hasattr(self.manager.empathy_system, 'temporal_memory'), \
                    "공감 시스템에 temporal_memory가 주입되지 않음"
                assert hasattr(self.manager.empathy_system, 'meta_cognitive'), \
                    "공감 시스템에 meta_cognitive가 주입되지 않음"
                logger.info("  ✓ 공감 시스템 의존성 확인")

            self.test_results['passed'].append(test_name)
            logger.info(f"✅ {test_name} 통과")
            return True

        except Exception as e:
            self.test_results['failed'].append((test_name, str(e)))
            logger.error(f"❌ {test_name} 실패: {e}")
            return False

    async def test_health_check(self) -> bool:
        """헬스 체크 테스트"""
        test_name = "Health Check"
        logger.info(f"\n{'='*60}")
        logger.info(f"테스트: {test_name}")
        logger.info(f"{'='*60}")

        try:
            if not self.manager:
                await self.test_basic_initialization()

            # 헬스 체크 실행
            health_status = await self.manager.health_check()

            # 헬스 체크 결과 확인
            assert 'state' in health_status, "헬스 체크에 state가 없음"
            assert 'initialized_systems' in health_status, \
                "헬스 체크에 initialized_systems가 없음"
            assert 'metrics' in health_status, "헬스 체크에 metrics가 없음"

            # 초기화된 시스템 확인
            initialized = health_status['initialized_systems']
            logger.info(f"  초기화된 시스템: {initialized}")

            # 메트릭 확인
            metrics = health_status['metrics']
            if metrics['initialization_time']:
                logger.info(f"  초기화 시간: {metrics['initialization_time']:.2f}초")

            self.test_results['passed'].append(test_name)
            logger.info(f"✅ {test_name} 통과")
            return True

        except Exception as e:
            self.test_results['failed'].append((test_name, str(e)))
            logger.error(f"❌ {test_name} 실패: {e}")
            return False

    async def test_selective_initialization(self) -> bool:
        """선택적 시스템 초기화 테스트"""
        test_name = "Selective System Initialization"
        logger.info(f"\n{'='*60}")
        logger.info(f"테스트: {test_name}")
        logger.info(f"{'='*60}")

        try:
            # 일부 시스템만 활성화
            config = SystemConfig(
                enable_temporal_memory=True,
                enable_meta_cognitive=True,
                enable_creative=False,  # 창의 엔진 비활성화
                enable_dream=False,      # 꿈 시스템 비활성화
                enable_empathy=True
            )

            # 새 매니저로 초기화
            from app.core.system_manager import GumgangSystemManager
            test_manager = GumgangSystemManager(config)
            success = await test_manager.initialize()

            assert success, "선택적 초기화 실패"
            assert test_manager.temporal_memory is not None, \
                "시간적 메모리가 초기화되지 않음"
            assert test_manager.meta_cognitive is not None, \
                "메타인지가 초기화되지 않음"
            assert test_manager.creative_engine is None, \
                "창의 엔진이 비활성화되어야 하는데 초기화됨"
            assert test_manager.dream_system is None, \
                "꿈 시스템이 비활성화되어야 하는데 초기화됨"

            # 종료
            await test_manager.shutdown()

            self.test_results['passed'].append(test_name)
            logger.info(f"✅ {test_name} 통과")
            return True

        except Exception as e:
            self.test_results['failed'].append((test_name, str(e)))
            logger.error(f"❌ {test_name} 실패: {e}")
            return False

    async def test_managed_operation(self) -> bool:
        """관리되는 작업 컨텍스트 테스트"""
        test_name = "Managed Operation Context"
        logger.info(f"\n{'='*60}")
        logger.info(f"테스트: {test_name}")
        logger.info(f"{'='*60}")

        try:
            if not self.manager:
                await self.test_basic_initialization()

            # 관리되는 작업 테스트
            async with self.manager.managed_operation("test_operation") as mgr:
                assert mgr is self.manager, "컨텍스트 매니저가 올바르지 않음"
                logger.info("  ✓ 관리되는 작업 컨텍스트 진입")

            # 메트릭 확인
            assert self.manager.metrics.total_requests > 0, \
                "요청 카운트가 증가하지 않음"

            self.test_results['passed'].append(test_name)
            logger.info(f"✅ {test_name} 통과")
            return True

        except Exception as e:
            self.test_results['failed'].append((test_name, str(e)))
            logger.error(f"❌ {test_name} 실패: {e}")
            return False

    async def test_system_shutdown(self) -> bool:
        """시스템 종료 테스트"""
        test_name = "System Shutdown"
        logger.info(f"\n{'='*60}")
        logger.info(f"테스트: {test_name}")
        logger.info(f"{'='*60}")

        try:
            if not self.manager:
                await self.test_basic_initialization()

            # 종료 전 상태 확인
            assert self.manager.state == SystemState.READY, \
                "종료 전 시스템이 READY 상태가 아님"

            # 시스템 종료
            await self.manager.shutdown()

            # 종료 후 상태 확인
            assert self.manager.state == SystemState.SHUTDOWN, \
                f"종료 후 상태가 SHUTDOWN이 아님: {self.manager.state}"

            self.test_results['passed'].append(test_name)
            logger.info(f"✅ {test_name} 통과")
            return True

        except Exception as e:
            self.test_results['failed'].append((test_name, str(e)))
            logger.error(f"❌ {test_name} 실패: {e}")
            return False

    async def run_all_tests(self):
        """모든 테스트 실행"""
        self.start_time = time.time()

        logger.info("\n" + "="*60)
        logger.info("🚀 금강 2.0 시스템 초기화 통합 테스트 시작")
        logger.info("="*60)

        # 테스트 목록
        tests = [
            self.test_basic_initialization,
            self.test_dependency_injection,
            self.test_health_check,
            self.test_selective_initialization,
            self.test_managed_operation,
            self.test_system_shutdown
        ]

        # 각 테스트 실행
        for test_func in tests:
            try:
                await test_func()
            except Exception as e:
                logger.error(f"테스트 실행 중 예외 발생: {e}")

        # 결과 요약 출력
        self.print_summary()

    def print_summary(self):
        """테스트 결과 요약 출력"""
        elapsed_time = time.time() - self.start_time

        logger.info("\n" + "="*60)
        logger.info("📊 테스트 결과 요약")
        logger.info("="*60)

        # 통과한 테스트
        logger.info(f"\n✅ 통과: {len(self.test_results['passed'])}개")
        for test in self.test_results['passed']:
            logger.info(f"  • {test}")

        # 실패한 테스트
        if self.test_results['failed']:
            logger.info(f"\n❌ 실패: {len(self.test_results['failed'])}개")
            for test, error in self.test_results['failed']:
                logger.info(f"  • {test}: {error}")

        # 경고
        if self.test_results['warnings']:
            logger.info(f"\n⚠️ 경고: {len(self.test_results['warnings'])}개")
            for warning in self.test_results['warnings']:
                logger.info(f"  • {warning}")

        # 총 결과
        total_tests = len(self.test_results['passed']) + len(self.test_results['failed'])
        success_rate = (len(self.test_results['passed']) / total_tests * 100) if total_tests > 0 else 0

        logger.info("\n" + "-"*60)
        logger.info(f"총 테스트: {total_tests}개")
        logger.info(f"성공률: {success_rate:.1f}%")
        logger.info(f"실행 시간: {elapsed_time:.2f}초")

        if success_rate == 100:
            logger.info("\n🎉 모든 테스트를 통과했습니다!")
        elif success_rate >= 80:
            logger.info("\n✨ 대부분의 테스트를 통과했습니다.")
        else:
            logger.info("\n⚠️ 일부 테스트가 실패했습니다. 확인이 필요합니다.")


async def main():
    """메인 실행 함수"""
    tester = SystemInitializationTest()
    await tester.run_all_tests()


if __name__ == "__main__":
    # 이벤트 루프 실행
    asyncio.run(main())
