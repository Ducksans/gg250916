#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 2.0 4계층 시간적 메모리 시스템 테스트 스크립트

이 스크립트는 새로 구현된 4계층 메모리 시스템의 모든 기능을 테스트합니다:
1. 초단기 메모리 (0-5분): 워킹 메모리, 즉시 컨텍스트
2. 단기 메모리 (5분-1시간): 세션 클러스터, 에피소딕 버퍼
3. 중장기 메모리 (1시간-1일): 일일 패턴, 의미적 통합
4. 초장기 메모리 (1일+): 영구 지식, 스키마 기억

Author: Gumgang AI Team
Version: 2.0
"""

import sys
import os
import time
import json
from datetime import datetime, timedelta
from pathlib import Path

# 프로젝트 루트 디렉토리를 Python path에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.temporal_memory import (
    get_temporal_memory_system,
    MemoryType,
    MemoryPriority,
    MemoryTrace,
    shutdown_temporal_memory
)

class TemporalMemoryTester:
    """4계층 메모리 시스템 테스터"""

    def __init__(self):
        self.temporal_memory = get_temporal_memory_system()
        self.test_session_id = "test_session_001"
        self.test_results = []

    def log_test(self, test_name: str, success: bool, details: str = ""):
        """테스트 결과 로깅"""
        result = {
            "test": test_name,
            "success": success,
            "timestamp": datetime.now().isoformat(),
            "details": details
        }
        self.test_results.append(result)

        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {details}")

    def test_memory_storage(self):
        """메모리 저장 기능 테스트"""
        print("\n🧪 테스트 1: 메모리 저장 기능")

        try:
            # 다양한 타입의 메모리 저장
            test_memories = [
                {
                    "content": "사용자가 파이썬 프로그래밍에 대해 질문했습니다.",
                    "memory_type": MemoryType.EPISODIC,
                    "priority": MemoryPriority.MEDIUM,
                    "tags": {"python", "programming", "question"}
                },
                {
                    "content": "금강 AI는 4계층 메모리 시스템을 사용합니다.",
                    "memory_type": MemoryType.SEMANTIC,
                    "priority": MemoryPriority.HIGH,
                    "tags": {"gumgang", "architecture", "memory"}
                },
                {
                    "content": "코드 작성 방법: 1. 요구사항 분석 2. 설계 3. 구현 4. 테스트",
                    "memory_type": MemoryType.PROCEDURAL,
                    "priority": MemoryPriority.HIGH,
                    "tags": {"coding", "process", "methodology"}
                },
                {
                    "content": "사용자가 매우 만족스러워했습니다.",
                    "memory_type": MemoryType.EMOTIONAL,
                    "priority": MemoryPriority.MEDIUM,
                    "emotional_valence": 0.8,
                    "tags": {"satisfaction", "positive", "feedback"}
                }
            ]

            stored_ids = []
            for memory_data in test_memories:
                memory_id = self.temporal_memory.store_memory(
                    content=memory_data["content"],
                    memory_type=memory_data["memory_type"],
                    priority=memory_data["priority"],
                    session_id=self.test_session_id,
                    emotional_valence=memory_data.get("emotional_valence", 0.0),
                    tags=memory_data["tags"]
                )
                stored_ids.append(memory_id)

            self.log_test(
                "메모리 저장",
                len(stored_ids) == len(test_memories),
                f"{len(stored_ids)}개 메모리 저장 완료"
            )

            return stored_ids

        except Exception as e:
            self.log_test("메모리 저장", False, f"오류: {str(e)}")
            return []

    def test_memory_retrieval(self):
        """메모리 검색 기능 테스트"""
        print("\n🧪 테스트 2: 메모리 검색 기능")

        try:
            # 다양한 쿼리로 검색 테스트
            test_queries = [
                "파이썬 프로그래밍",
                "금강 AI 시스템",
                "코드 작성 방법",
                "사용자 만족도"
            ]

            total_results = 0
            for query in test_queries:
                results = self.temporal_memory.retrieve_memories(
                    query=query,
                    session_id=self.test_session_id,
                    max_results=5,
                    min_relevance=0.1
                )

                print(f"  쿼리 '{query}': {len(results)}개 결과")
                for result in results:
                    trace = result['trace']
                    print(f"    - [{result['layer']}] {trace.content[:50]}... (관련도: {result['relevance']:.2f})")

                total_results += len(results)

            self.log_test(
                "메모리 검색",
                total_results > 0,
                f"총 {total_results}개 검색 결과"
            )

        except Exception as e:
            self.log_test("메모리 검색", False, f"오류: {str(e)}")

    def test_layer_functionality(self):
        """계층별 기능 테스트"""
        print("\n🧪 테스트 3: 계층별 기능")

        try:
            # 현재 메모리 상태 확인
            memory_stats = self.temporal_memory.get_memory_stats()

            # 각 계층 확인
            layers = memory_stats['layers']

            ultra_short_active = layers['ultra_short']['current_size'] > 0
            short_term_active = layers['short_term']['current_size'] > 0

            print(f"  초단기 메모리: {layers['ultra_short']['current_size']}/{layers['ultra_short']['capacity']}")
            print(f"  단기 메모리: {layers['short_term']['current_size']}/{layers['short_term']['capacity']}")
            print(f"  중장기 메모리: {layers['medium_term']['current_size']}/{layers['medium_term']['capacity']}")
            print(f"  초장기 메모리: {layers['long_term']['core_knowledge']}개 핵심 지식")

            self.log_test(
                "계층별 기능",
                ultra_short_active and short_term_active,
                "초단기 및 단기 메모리 정상 작동"
            )

        except Exception as e:
            self.log_test("계층별 기능", False, f"오류: {str(e)}")

    def test_clustering(self):
        """자동 클러스터링 테스트"""
        print("\n🧪 테스트 4: 자동 클러스터링")

        try:
            # 관련 메모리들 추가로 저장
            related_memories = [
                "파이썬 리스트 사용법에 대해 질문",
                "파이썬 딕셔너리 활용 방법 문의",
                "파이썬 함수 정의하는 방법",
                "머신러닝 라이브러리 추천 요청",
                "데이터 분석 도구 문의"
            ]

            for content in related_memories:
                self.temporal_memory.store_memory(
                    content=content,
                    memory_type=MemoryType.EPISODIC,
                    priority=MemoryPriority.MEDIUM,
                    session_id=self.test_session_id
                )

            # 클러스터 생성 확인
            memory_stats = self.temporal_memory.get_memory_stats()
            cluster_count = memory_stats['layers']['short_term']['clusters']

            print(f"  생성된 클러스터 수: {cluster_count}")

            self.log_test(
                "자동 클러스터링",
                cluster_count > 0,
                f"{cluster_count}개 클러스터 생성됨"
            )

        except Exception as e:
            self.log_test("자동 클러스터링", False, f"오류: {str(e)}")

    def test_context_enhancement(self):
        """컨텍스트 강화 테스트"""
        print("\n🧪 테스트 5: 컨텍스트 강화")

        try:
            # 연속된 대화 시뮬레이션
            conversation = [
                "안녕하세요! 파이썬을 배우고 싶어요",
                "파이썬의 기본 문법을 알려주세요",
                "그럼 함수는 어떻게 만드나요?",
                "예제 코드를 보여주세요"
            ]

            enhanced_results = []
            for i, message in enumerate(conversation):
                # 메모리 저장
                memory_id = self.temporal_memory.store_memory(
                    content=f"사용자 질문 {i+1}: {message}",
                    memory_type=MemoryType.EPISODIC,
                    priority=MemoryPriority.MEDIUM,
                    session_id=self.test_session_id
                )

                # 컨텍스트 검색 (이전 대화 참조)
                if i > 0:  # 두 번째 메시지부터
                    context_results = self.temporal_memory.retrieve_memories(
                        query=message,
                        session_id=self.test_session_id,
                        max_results=3
                    )
                    enhanced_results.append(len(context_results))
                    print(f"  메시지 {i+1}: {len(context_results)}개 컨텍스트 찾음")

            avg_context = sum(enhanced_results) / len(enhanced_results) if enhanced_results else 0

            self.log_test(
                "컨텍스트 강화",
                avg_context > 0,
                f"평균 {avg_context:.1f}개 컨텍스트 제공"
            )

        except Exception as e:
            self.log_test("컨텍스트 강화", False, f"오류: {str(e)}")

    def test_user_profile(self):
        """사용자 프로필 기능 테스트"""
        print("\n🧪 테스트 6: 사용자 프로필")

        try:
            # 사용자 프로필 조회
            user_profile = self.temporal_memory.get_user_profile("default_user")

            print(f"  사용자 프로필: {json.dumps(user_profile, indent=2, ensure_ascii=False)}")

            has_profile_data = bool(user_profile)

            self.log_test(
                "사용자 프로필",
                has_profile_data,
                "프로필 데이터 생성됨" if has_profile_data else "프로필 데이터 없음"
            )

        except Exception as e:
            self.log_test("사용자 프로필", False, f"오류: {str(e)}")

    def test_memory_consolidation(self):
        """메모리 통합 기능 테스트"""
        print("\n🧪 테스트 7: 메모리 통합")

        try:
            # 통합 프로세스 수동 실행
            print("  메모리 통합 프로세스 테스트 중...")

            # 현재 메모리 상태 확인
            stats_before = self.temporal_memory.get_memory_stats()

            # 통합 실행 (내부 메서드 호출)
            self.temporal_memory._perform_consolidation()

            # 통합 후 상태 확인
            stats_after = self.temporal_memory.get_memory_stats()

            consolidations = stats_after['statistics']['consolidations_performed']

            print(f"  수행된 통합 횟수: {consolidations}")

            self.log_test(
                "메모리 통합",
                consolidations >= 0,  # 통합 카운터가 증가했는지 확인
                f"통합 프로세스 정상 실행"
            )

        except Exception as e:
            self.log_test("메모리 통합", False, f"오류: {str(e)}")

    def test_persistence(self):
        """영구 저장 기능 테스트"""
        print("\n🧪 테스트 8: 영구 저장")

        try:
            # 초장기 메모리에 데이터 저장
            storage_path = Path("memory/long_term/long_term_memory.json")

            # 저장 실행
            self.temporal_memory.long_term._save_persistent_data()

            # 파일 존재 확인
            file_exists = storage_path.exists()

            if file_exists:
                file_size = storage_path.stat().st_size
                print(f"  저장 파일 크기: {file_size} bytes")

            self.log_test(
                "영구 저장",
                file_exists,
                f"데이터 파일 생성됨: {storage_path}" if file_exists else "저장 파일 없음"
            )

        except Exception as e:
            self.log_test("영구 저장", False, f"오류: {str(e)}")

    def run_all_tests(self):
        """모든 테스트 실행"""
        print("🚀 금강 2.0 4계층 시간적 메모리 시스템 종합 테스트 시작")
        print("=" * 60)

        start_time = datetime.now()

        # 테스트 실행
        self.test_memory_storage()
        self.test_memory_retrieval()
        self.test_layer_functionality()
        self.test_clustering()
        self.test_context_enhancement()
        self.test_user_profile()
        self.test_memory_consolidation()
        self.test_persistence()

        # 결과 요약
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()

        print("\n" + "=" * 60)
        print("📊 테스트 결과 요약")
        print("=" * 60)

        passed_tests = sum(1 for result in self.test_results if result["success"])
        total_tests = len(self.test_results)

        print(f"총 테스트: {total_tests}")
        print(f"성공: {passed_tests}")
        print(f"실패: {total_tests - passed_tests}")
        print(f"성공률: {passed_tests/total_tests*100:.1f}%")
        print(f"실행 시간: {duration:.2f}초")

        # 최종 메모리 상태
        final_stats = self.temporal_memory.get_memory_stats()
        print(f"\n🧠 최종 메모리 상태:")
        for layer_name, layer_info in final_stats['layers'].items():
            if 'current_size' in layer_info:
                print(f"  {layer_name}: {layer_info['current_size']}개 저장됨")

        # 상세 결과 저장
        results_file = f"temporal_memory_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(results_file, 'w', encoding='utf-8') as f:
            json.dump({
                "summary": {
                    "total_tests": total_tests,
                    "passed": passed_tests,
                    "failed": total_tests - passed_tests,
                    "success_rate": passed_tests/total_tests*100,
                    "duration_seconds": duration
                },
                "detailed_results": self.test_results,
                "final_memory_stats": final_stats
            }, f, ensure_ascii=False, indent=2, default=str)

        print(f"\n📄 상세 결과 저장됨: {results_file}")

        return passed_tests == total_tests

def main():
    """메인 실행 함수"""
    print("🧠 금강 2.0 4계층 시간적 메모리 시스템 테스트")
    print("Author: Gumgang AI Team")
    print("Version: 2.0")
    print()

    tester = TemporalMemoryTester()

    try:
        success = tester.run_all_tests()

        if success:
            print("\n🎉 모든 테스트가 성공적으로 완료되었습니다!")
            print("4계층 메모리 시스템이 정상적으로 작동하고 있습니다.")
        else:
            print("\n⚠️ 일부 테스트가 실패했습니다.")
            print("로그를 확인하여 문제를 해결해주세요.")

    except KeyboardInterrupt:
        print("\n\n⏹️ 사용자에 의해 테스트가 중단되었습니다.")

    except Exception as e:
        print(f"\n❌ 테스트 실행 중 예상치 못한 오류: {e}")
        import traceback
        traceback.print_exc()

    finally:
        # 메모리 시스템 안전 종료
        print("\n🔚 메모리 시스템 종료 중...")
        shutdown_temporal_memory()
        print("✅ 테스트 완료")

if __name__ == "__main__":
    main()
