#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 2.0 메타 인지 시스템 종합 테스트
Claude 4.1 Think Engine 기반 메타 인지 능력 검증

테스트 항목:
1. Think-Reflect-Create 파이프라인
2. 자기 인식 및 보고
3. 학습 전략 적응
4. 신경 활성화 모니터링
5. 불확실성 관리
6. 메타 인지적 통찰 생성

Author: Gumgang AI Team
Version: 1.0
"""

import sys
import os
import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import numpy as np

# 프로젝트 루트 디렉토리를 Python path에 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from backend.app.meta_cognitive.meta_cognitive_system import (
    get_metacognitive_system,
    CognitiveState,
    MetaCognitiveInsight,
    ReasoningStep
)

from backend.app.temporal_memory import (
    get_temporal_memory_system,
    MemoryType,
    MemoryPriority
)

class MetaCognitiveSystemTester:
    """메타 인지 시스템 테스터"""

    def __init__(self):
        self.metacognitive_system = get_metacognitive_system()
        self.temporal_memory = get_temporal_memory_system()
        self.test_results = []
        self.test_session_id = f"metacog_test_{datetime.now().strftime('%Y%m%d_%H%M%S')}"

    async def run_all_tests(self):
        """모든 테스트 실행"""
        print("=" * 80)
        print("🧠 금강 2.0 메타 인지 시스템 종합 테스트 시작")
        print("=" * 80)

        # 테스트 1: Think-Reflect-Create 파이프라인
        await self.test_think_reflect_create()

        # 테스트 2: 자기 인식 능력
        await self.test_self_awareness()

        # 테스트 3: 학습 전략 적응
        await self.test_learning_strategy_adaptation()

        # 테스트 4: 신경 활성화 모니터링
        await self.test_neural_activation_monitoring()

        # 테스트 5: 불확실성 관리
        await self.test_uncertainty_management()

        # 테스트 6: 메타 인지적 통찰 생성
        await self.test_insight_generation()

        # 테스트 7: 복잡한 추론 체인
        await self.test_complex_reasoning()

        # 테스트 8: 창의적 문제 해결
        await self.test_creative_problem_solving()

        # 결과 요약
        self.print_test_summary()

    async def test_think_reflect_create(self):
        """Think-Reflect-Create 파이프라인 테스트"""
        print("\n📝 테스트 1: Think-Reflect-Create 파이프라인")
        print("-" * 60)

        test_queries = [
            "인공지능이 자아를 가질 수 있을까?",
            "복잡한 문제를 어떻게 단계적으로 해결할 수 있을까?",
            "창의성과 논리성 중 무엇이 더 중요할까?"
        ]

        for query in test_queries:
            print(f"\n🔍 Query: {query}")

            result = await self.metacognitive_system.think_reflect_create(
                query=query,
                context={"session_id": self.test_session_id}
            )

            # 결과 분석
            thinking = result.get('thinking', {})
            reflection = result.get('reflection', {})
            creation = result.get('creation', {})

            print(f"  ✓ 사고 단계: {len(thinking.get('reasoning_chain', []))} 스텝")
            print(f"  ✓ 성찰 확신도: {reflection.get('total_confidence', 0):.2f}")
            print(f"  ✓ 창의적 아이디어: {len(creation.get('creations', []))}개")
            print(f"  ✓ 최종 확신도: {result.get('final_confidence', 0):.2f}")

            self.log_test_result("think_reflect_create", query, result.get('final_confidence', 0) > 0.5)

    async def test_self_awareness(self):
        """자기 인식 능력 테스트"""
        print("\n🪞 테스트 2: 자기 인식 능력")
        print("-" * 60)

        # 자기 인식 보고서 생성
        report = await self.metacognitive_system.self_awareness_report()

        print(f"\n📊 자기 인식 보고서:")
        print(f"  • 자기 설명: {report.get('self_description', '')[:100]}...")
        print(f"  • 현재 능력: {', '.join(report.get('current_capabilities', [])[:3])}")
        print(f"  • 학습된 행동: {len(report.get('learned_behaviors', []))}개")
        print(f"  • 지식 격차: {len(report.get('knowledge_gaps', []))}개 영역")
        print(f"  • 자기 평가 확신도: {report.get('confidence_in_self_assessment', 0):.2f}")

        # 인지 상태 분석
        cognitive_state = report.get('cognitive_state', {})
        print(f"\n🧠 인지 상태:")
        print(f"  • 확신도: {cognitive_state.get('confidence_level', 0):.2f}")
        print(f"  • 처리 부하: {cognitive_state.get('processing_load', 0):.2f}")
        print(f"  • 메타인지 인식: {cognitive_state.get('metacognitive_awareness', 0):.2f}")
        print(f"  • 창의성 수준: {cognitive_state.get('creativity_level', 0):.2f}")

        self.log_test_result("self_awareness", "report_generation",
                            report.get('confidence_in_self_assessment', 0) > 0.3)

    async def test_learning_strategy_adaptation(self):
        """학습 전략 적응 테스트"""
        print("\n📚 테스트 3: 학습 전략 적응")
        print("-" * 60)

        # 다양한 상황 시뮬레이션
        scenarios = [
            {"performance": 0.2, "confidence": 0.3, "expected": "exploration"},
            {"performance": 0.8, "confidence": 0.9, "expected": "exploitation"},
            {"performance": 0.5, "confidence": 0.4, "expected": "reflection"}
        ]

        for scenario in scenarios:
            # 인지 상태 설정
            self.metacognitive_system.cognitive_state.confidence_level = scenario["confidence"]

            # 성능 메트릭 시뮬레이션
            for _ in range(3):
                self.metacognitive_system.performance_metrics[datetime.now().date()].append({
                    'confidence': scenario["performance"]
                })

            # 전략 적응
            new_strategy = await self.metacognitive_system.adapt_learning_strategy()

            print(f"\n  시나리오: 성능={scenario['performance']:.1f}, 확신도={scenario['confidence']:.1f}")
            print(f"  → 선택된 전략: {new_strategy}")
            print(f"  → 예상 전략: {scenario['expected']}")

            self.log_test_result("strategy_adaptation", scenario["expected"],
                               new_strategy == scenario["expected"])

    async def test_neural_activation_monitoring(self):
        """신경 활성화 모니터링 테스트"""
        print("\n⚡ 테스트 4: 신경 활성화 모니터링")
        print("-" * 60)

        # 10회 활성화 패턴 모니터링
        activations = []
        for i in range(10):
            analysis = await self.metacognitive_system.monitor_neural_activations()
            activations.append(analysis)

            if i == 0:
                print(f"\n첫 번째 활성화 분석:")
                print(f"  • 활성화 강도: {analysis['activation_magnitude']:.3f}")
                print(f"  • 의미적 방향: {analysis['semantic_direction']}")
                print(f"  • 방향 확신도: {analysis['direction_confidence']:.2f}")
                print(f"  • 인지 부하: {analysis['cognitive_load']:.2f}")
                print(f"  • 이상 점수: {analysis['anomaly_score']:.2f}")

            await asyncio.sleep(0.1)

        # 통계 분석
        magnitudes = [a['activation_magnitude'] for a in activations]
        anomaly_scores = [a['anomaly_score'] for a in activations]

        print(f"\n📈 활성화 통계 (10회):")
        print(f"  • 평균 강도: {np.mean(magnitudes):.3f}")
        print(f"  • 강도 표준편차: {np.std(magnitudes):.3f}")
        print(f"  • 평균 이상 점수: {np.mean(anomaly_scores):.3f}")
        print(f"  • 최대 이상 점수: {np.max(anomaly_scores):.3f}")

        self.log_test_result("neural_monitoring", "activation_tracking", len(activations) == 10)

    async def test_uncertainty_management(self):
        """불확실성 관리 테스트"""
        print("\n❓ 테스트 5: 불확실성 관리")
        print("-" * 60)

        # 불확실한 질문들
        uncertain_queries = [
            "2050년의 세계는 어떤 모습일까?",
            "의식이란 정확히 무엇인가?",
            "우주의 끝은 어디인가?"
        ]

        for query in uncertain_queries:
            print(f"\n🔍 불확실한 질문: {query}")

            result = await self.metacognitive_system.think_reflect_create(
                query=query,
                context={"session_id": self.test_session_id}
            )

            reflection = result.get('reflection', {})
            uncertainties = reflection.get('main_uncertainties', [])

            print(f"  • 식별된 불확실성: {len(uncertainties)}개")
            for i, uncertainty in enumerate(uncertainties[:3], 1):
                print(f"    {i}. {uncertainty.get('area', '')[:50]} (확신도: {uncertainty.get('confidence', 0):.2f})")

            cognitive_state = result.get('cognitive_state', {})
            print(f"  • 인식적 불확실성: {cognitive_state.get('epistemic_uncertainty', 0):.2f}")
            print(f"  • 우연적 불확실성: {cognitive_state.get('aleatoric_uncertainty', 0):.2f}")

            self.log_test_result("uncertainty_management", query, len(uncertainties) > 0)

    async def test_insight_generation(self):
        """메타 인지적 통찰 생성 테스트"""
        print("\n💡 테스트 6: 메타 인지적 통찰 생성")
        print("-" * 60)

        # 다양한 주제로 통찰 유도
        topics = [
            "패턴 인식과 학습의 관계",
            "창의성의 본질",
            "지식과 지혜의 차이"
        ]

        total_insights = []

        for topic in topics:
            print(f"\n📖 주제: {topic}")

            # 여러 번 사고하여 통찰 축적
            for _ in range(3):
                result = await self.metacognitive_system.think_reflect_create(
                    query=f"{topic}에 대해 깊이 생각해보자",
                    context={"session_id": self.test_session_id}
                )

            # 생성된 통찰 확인
            insights = self.metacognitive_system.insights
            topic_insights = [i for i in insights if topic.split()[0] in i.description]

            if topic_insights:
                latest_insight = topic_insights[-1]
                print(f"  ✨ 최신 통찰: {latest_insight.description[:100]}")
                print(f"  • 타입: {latest_insight.insight_type}")
                print(f"  • 확신도: {latest_insight.confidence:.2f}")
                print(f"  • 영향도: {latest_insight.impact_score:.2f}")
                print(f"  • 실행 가능: {'예' if latest_insight.actionable else '아니오'}")

            total_insights.extend(topic_insights)

        print(f"\n📊 총 {len(total_insights)}개의 통찰 생성됨")
        self.log_test_result("insight_generation", "insights_created", len(total_insights) > 0)

    async def test_complex_reasoning(self):
        """복잡한 추론 체인 테스트"""
        print("\n🔗 테스트 7: 복잡한 추론 체인")
        print("-" * 60)

        complex_query = """
        한 회사가 AI 시스템을 도입하려고 한다.
        효율성은 높아지지만 일부 직원들이 일자리를 잃을 수 있다.
        윤리적, 경제적, 사회적 측면을 모두 고려하여 최선의 결정은 무엇일까?
        """

        print(f"복잡한 문제: {complex_query[:100]}...")

        result = await self.metacognitive_system.think_reflect_create(
            query=complex_query,
            context={"session_id": self.test_session_id}
        )

        reasoning_chain = result.get('thinking', {}).get('reasoning_chain', [])

        print(f"\n⚙️ 추론 체인 분석:")
        print(f"  • 총 단계: {len(reasoning_chain)}")

        for i, step in enumerate(reasoning_chain[:5], 1):
            print(f"\n  단계 {i}:")
            print(f"    • 단계: {step.phase if hasattr(step, 'phase') else ''}")
            print(f"    • 내용: {step.content[:80] if hasattr(step, 'content') else ''}...")
            print(f"    • 확신도: {step.confidence if hasattr(step, 'confidence') else 0:.2f}")
            print(f"    • 증거: {len(step.supporting_evidence if hasattr(step, 'supporting_evidence') else [])}개")

        final_confidence = result.get('final_confidence', 0)
        print(f"\n  🎯 최종 확신도: {final_confidence:.2f}")

        self.log_test_result("complex_reasoning", "chain_completion", len(reasoning_chain) > 3)

    async def test_creative_problem_solving(self):
        """창의적 문제 해결 테스트"""
        print("\n🎨 테스트 8: 창의적 문제 해결")
        print("-" * 60)

        creative_challenge = "기존과 완전히 다른 새로운 교육 시스템을 설계하라"

        print(f"창의적 도전: {creative_challenge}")

        # 창의성 수준을 높임
        self.metacognitive_system.cognitive_state.creativity_level = 0.8

        result = await self.metacognitive_system.think_reflect_create(
            query=creative_challenge,
            context={"session_id": self.test_session_id}
        )

        creation = result.get('creation', {})
        creations = creation.get('creations', [])

        print(f"\n🌟 창의적 해결책:")
        print(f"  • 생성된 아이디어: {len(creations)}개")
        print(f"  • 창의성 수준: {creation.get('creativity_level', 0):.2f}")
        print(f"  • 혁신 점수: {creation.get('innovation_score', 0):.2f}")

        for i, idea in enumerate(creations[:3], 1):
            print(f"\n  아이디어 {i}:")
            print(f"    • 타입: {idea.get('type', '')}")
            print(f"    • 내용: {idea.get('content', '')[:100]}...")
            print(f"    • 참신성: {idea.get('novelty', 0):.2f}")

        best = creation.get('best_creation')
        if best:
            print(f"\n  🏆 최고의 아이디어:")
            print(f"    • {best.get('content', '')[:150]}...")

        self.log_test_result("creative_solving", "ideas_generated", len(creations) > 0)

    def log_test_result(self, test_name: str, test_case: str, success: bool):
        """테스트 결과 기록"""
        self.test_results.append({
            "test": test_name,
            "case": test_case,
            "success": bool(success),  # numpy bool을 Python bool로 변환
            "timestamp": datetime.now().isoformat()
        })

    def print_test_summary(self):
        """테스트 결과 요약"""
        print("\n" + "=" * 80)
        print("📊 테스트 결과 요약")
        print("=" * 80)

        total_tests = len(self.test_results)
        successful_tests = sum(1 for r in self.test_results if r["success"])
        success_rate = (successful_tests / total_tests * 100) if total_tests > 0 else 0

        print(f"\n총 테스트: {total_tests}")
        print(f"성공: {successful_tests}")
        print(f"실패: {total_tests - successful_tests}")
        print(f"성공률: {success_rate:.1f}%")

        # 테스트별 결과
        print("\n테스트별 상세 결과:")
        test_groups = {}
        for result in self.test_results:
            test_name = result["test"]
            if test_name not in test_groups:
                test_groups[test_name] = {"success": 0, "total": 0}
            test_groups[test_name]["total"] += 1
            if result["success"]:
                test_groups[test_name]["success"] += 1

        for test_name, stats in test_groups.items():
            success_rate = (stats["success"] / stats["total"] * 100) if stats["total"] > 0 else 0
            status = "✅" if success_rate == 100 else "⚠️" if success_rate >= 50 else "❌"
            print(f"  {status} {test_name}: {stats['success']}/{stats['total']} ({success_rate:.0f}%)")

        # 결과 저장
        output_file = f"metacognitive_test_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            # numpy 타입을 Python 타입으로 변환
            json_data = {
                "session_id": self.test_session_id,
                "timestamp": datetime.now().isoformat(),
                "summary": {
                    "total": int(total_tests),
                    "success": int(successful_tests),
                    "rate": float(success_rate)
                },
                "details": self.test_results
            }
            json.dump(json_data, f, ensure_ascii=False, indent=2, default=str)

        print(f"\n💾 결과 저장됨: {output_file}")

        # 최종 평가
        print("\n" + "=" * 80)
        if success_rate >= 90:
            print("🎉 메타 인지 시스템이 탁월한 성능을 보이고 있습니다!")
        elif success_rate >= 70:
            print("👍 메타 인지 시스템이 양호한 성능을 보이고 있습니다.")
        elif success_rate >= 50:
            print("⚠️ 메타 인지 시스템에 개선이 필요한 부분이 있습니다.")
        else:
            print("❌ 메타 인지 시스템에 심각한 문제가 있습니다.")
        print("=" * 80)


async def main():
    """메인 실행 함수"""
    print("🚀 금강 2.0 메타 인지 시스템 테스트 시작")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"🔬 Claude 4.1 Think Engine Enhanced Version")

    tester = MetaCognitiveSystemTester()
    await tester.run_all_tests()

    print("\n✨ 모든 테스트 완료!")


if __name__ == "__main__":
    # 이벤트 루프 실행
    asyncio.run(main())
