#!/usr/bin/env python3
"""
금강 2.0 간단한 시스템 초기화 테스트

이 스크립트는 금강 AI 시스템의 기본 초기화를 테스트합니다.
복잡한 테스트 없이 핵심 기능만 확인합니다.

Author: Gumgang AI Team
Version: 1.0
"""

import asyncio
import sys
from pathlib import Path

# 백엔드 경로 추가
sys.path.append(str(Path(__file__).parent))

from app.core.system_manager import SystemConfig, get_system_manager


async def test_basic_init():
    """기본 초기화 테스트"""
    print("=" * 60)
    print("🚀 금강 2.0 간단한 초기화 테스트")
    print("=" * 60)

    # 최소 설정으로 시스템 매니저 생성
    config = SystemConfig(
        enable_temporal_memory=True,
        enable_meta_cognitive=True,
        enable_creative=False,  # scipy 의존성 때문에 비활성화
        enable_dream=False,     # scipy 의존성 때문에 비활성화
        enable_empathy=False    # scipy 의존성 때문에 비활성화
    )

    # 시스템 매니저 가져오기
    manager = get_system_manager(config)

    print("\n1️⃣ 시스템 초기화 시작...")

    try:
        # 초기화
        success = await manager.initialize()

        if success:
            print("✅ 시스템 초기화 성공!")

            # 상태 확인
            health = await manager.health_check()

            print("\n2️⃣ 시스템 상태:")
            print(f"  • 상태: {health['state']}")
            print(f"  • 초기화된 시스템: {health['initialized_systems']}")

            # 개별 시스템 확인
            print("\n3️⃣ 개별 시스템 확인:")

            if manager.temporal_memory:
                print("  ✓ 시간적 메모리 시스템: 활성")
            else:
                print("  ✗ 시간적 메모리 시스템: 비활성")

            if manager.meta_cognitive:
                print("  ✓ 메타인지 시스템: 활성")
            else:
                print("  ✗ 메타인지 시스템: 비활성")

            # 간단한 작업 테스트
            print("\n4️⃣ 관리 작업 테스트...")

            async with manager.managed_operation("test_operation"):
                print("  ✓ 관리 작업 컨텍스트 진입 성공")

            print("  ✓ 관리 작업 컨텍스트 종료 성공")

            # 메트릭 확인
            print(f"\n5️⃣ 메트릭:")
            print(f"  • 총 요청: {manager.metrics.total_requests}")
            print(f"  • 오류 수: {manager.metrics.error_count}")

            # 종료
            print("\n6️⃣ 시스템 종료...")
            await manager.shutdown()
            print("✅ 시스템 종료 완료")

            print("\n" + "=" * 60)
            print("🎉 모든 테스트 통과!")
            print("=" * 60)

        else:
            print("❌ 시스템 초기화 실패")
            print(f"  마지막 오류: {manager.metrics.last_error}")

    except Exception as e:
        print(f"❌ 테스트 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()


async def test_memory_system():
    """메모리 시스템 단독 테스트"""
    print("\n" + "=" * 60)
    print("📦 메모리 시스템 단독 테스트")
    print("=" * 60)

    try:
        from app.core.memory.temporal import get_temporal_memory_system

        memory = get_temporal_memory_system()
        print("✅ 시간적 메모리 시스템 import 성공")

        # 기본 속성 확인
        if hasattr(memory, 'store_memory'):
            print("  ✓ store_memory 메서드 존재")
        if hasattr(memory, 'recall_memories'):
            print("  ✓ recall_memories 메서드 존재")

    except Exception as e:
        print(f"❌ 메모리 시스템 테스트 실패: {e}")


async def test_metacognitive_system():
    """메타인지 시스템 단독 테스트"""
    print("\n" + "=" * 60)
    print("🧠 메타인지 시스템 단독 테스트")
    print("=" * 60)

    try:
        from app.core.cognition import get_metacognitive_system

        meta = get_metacognitive_system()
        print("✅ 메타인지 시스템 import 성공")

        # 기본 속성 확인
        if hasattr(meta, 'monitor_thought'):
            print("  ✓ monitor_thought 메서드 존재")
        if hasattr(meta, 'evaluate_confidence'):
            print("  ✓ evaluate_confidence 메서드 존재")

    except Exception as e:
        print(f"❌ 메타인지 시스템 테스트 실패: {e}")


async def main():
    """메인 테스트 함수"""
    print("\n🔧 금강 2.0 시스템 테스트 시작\n")

    # 개별 시스템 테스트
    await test_memory_system()
    await test_metacognitive_system()

    # 통합 테스트
    await test_basic_init()

    print("\n✨ 모든 테스트 완료!\n")


if __name__ == "__main__":
    # Python 버전 확인
    import sys
    print(f"Python 버전: {sys.version}")

    # 이벤트 루프 실행
    asyncio.run(main())
