#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 0.5 → 1.0 리팩토링: 2단계 기억-추론 균형 테스트 스크립트
"""

import sys
import os
import json
from datetime import datetime

# 백엔드 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_hybrid_search():
    """하이브리드 검색 시스템 테스트"""
    print("🔍 하이브리드 검색 시스템 테스트")
    print("=" * 50)

    try:
        from app.graph import HybridSearchSystem

        search_system = HybridSearchSystem()

        test_queries = [
            "FastAPI에 대해 알려주세요",
            "금강의 메모리 구조는?",
            "LangGraph 사용법",
            "벡터 데이터베이스 설정"
        ]

        for query in test_queries:
            print(f"\n🧪 테스트: {query}")
            results, info = search_system.search_memories(query, verbose=True)

            print(f"   📊 결과 수: {len(results)}")
            print(f"   🎯 품질 점수: {info.get('quality', {}).get('relevance_score', 0):.2f}")
            print(f"   🔧 사용 방법: {info.get('methods_used', [])}")

            if results:
                print(f"   📝 첫 번째 결과: {results[0][:100]}...")

    except Exception as e:
        print(f"❌ 하이브리드 검색 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_response_quality():
    """응답 품질 평가 테스트"""
    print("\n📊 응답 품질 평가 테스트")
    print("=" * 50)

    try:
        from app.graph import ResponseQualityEvaluator, _evaluate_response_quality

        evaluator = ResponseQualityEvaluator()

        test_cases = [
            {
                "query": "Python에 대해 설명해주세요",
                "memory_results": [
                    "Python은 프로그래밍 언어입니다",
                    "Python은 간단하고 읽기 쉬운 문법을 가지고 있습니다",
                    "Python은 데이터 과학에 많이 사용됩니다"
                ]
            },
            {
                "query": "머신러닝 알고리즘",
                "memory_results": [
                    "데이터베이스 설정 방법",
                    "웹 개발 프레임워크"
                ]
            },
            {
                "query": "FastAPI 사용법",
                "memory_results": []
            }
        ]

        for i, case in enumerate(test_cases, 1):
            print(f"\n🧪 케이스 {i}: {case['query']}")

            # 메모리 관련성 평가
            memory_quality = evaluator.evaluate_memory_relevance(
                case['query'],
                case['memory_results']
            )

            print(f"   🎯 메모리 관련성: {memory_quality['relevance_score']:.2f}")
            print(f"   📝 신뢰도: {memory_quality['confidence']:.2f}")
            print(f"   💡 이유: {memory_quality['reasons']}")

            # 가상 응답 품질 평가
            sample_response = f"이것은 {case['query']}에 대한 답변입니다. 상세한 설명을 포함하고 있습니다."
            response_quality = _evaluate_response_quality(case['query'], sample_response)
            print(f"   📊 응답 품질: {response_quality:.2f}")

    except Exception as e:
        print(f"❌ 응답 품질 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_contextual_generation():
    """의도별 맞춤형 응답 생성 테스트"""
    print("\n🎯 의도별 맞춤형 응답 생성 테스트")
    print("=" * 50)

    try:
        from app.graph import _generate_contextual_response

        test_intents = [
            {"query": "안녕하세요!", "intent": "casual", "confidence": 0.9},
            {"query": "나는 누구인가요?", "intent": "identity", "confidence": 0.8},
            {"query": "Python에 대해 설명해주세요", "intent": "knowledge", "confidence": 0.7},
            {"query": "코드를 수정해주세요", "intent": "action", "confidence": 0.6},
            {"query": "시스템 구조는?", "intent": "meta", "confidence": 0.5}
        ]

        for case in test_intents:
            print(f"\n🧪 의도: {case['intent']} (신뢰도: {case['confidence']:.1f})")
            print(f"   질문: {case['query']}")

            response = _generate_contextual_response(
                case['query'],
                case['intent'],
                case['confidence'],
                verbose=True
            )

            print(f"   응답: {response[:200]}...")

    except Exception as e:
        print(f"❌ 맞춤형 응답 생성 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_integrated_flow():
    """통합 플로우 테스트"""
    print("\n🚀 통합 플로우 테스트")
    print("=" * 50)

    try:
        from app.graph import route_node, recall_chatgpt_node, no_memory_generate_node

        test_scenarios = [
            {
                "query": "금강의 현재 상태는?",
                "expected_route": "status_report",
                "description": "META 의도 → 상태 보고"
            },
            {
                "query": "Python에 대해 알려주세요",
                "expected_route": "no_memory_generate_node",
                "description": "KNOWLEDGE 의도 → 메모리 없음 시 GPT 생성"
            },
            {
                "query": "안녕하세요!",
                "expected_route": "no_memory_generate_node",
                "description": "CASUAL 의도 → 직접 생성"
            }
        ]

        for i, scenario in enumerate(test_scenarios, 1):
            print(f"\n🧪 시나리오 {i}: {scenario['description']}")
            print(f"   질문: {scenario['query']}")

            # 1단계: 라우팅 테스트
            state = {"output": scenario['query'], "memory": None}
            routed_state = route_node(state, verbose=True)

            actual_route = routed_state.get("router_decision")
            print(f"   🔀 라우팅 결과: {actual_route}")
            print(f"   ✅ 예상 일치: {actual_route == scenario['expected_route']}")

            # 2단계: 해당 노드 실행 테스트
            if actual_route == "recall_chatgpt":
                result_state = recall_chatgpt_node(routed_state, verbose=True)
            elif actual_route == "no_memory_generate_node":
                result_state = no_memory_generate_node(routed_state, verbose=True)
            else:
                result_state = routed_state
                print(f"   ⏭️  {actual_route} 노드는 개별 테스트 스킵")
                continue

            # 결과 분석
            response_quality = result_state.get("response_quality", {})
            print(f"   📊 응답 품질: {json.dumps(response_quality, indent=6, ensure_ascii=False)}")

            final_response = result_state.get("output") or result_state.get("memory")
            if final_response:
                print(f"   💬 응답 미리보기: {str(final_response)[:150]}...")

    except Exception as e:
        print(f"❌ 통합 플로우 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_performance_comparison():
    """기존 vs 리팩토링 성능 비교"""
    print("\n⚡ 성능 비교 테스트")
    print("=" * 50)

    test_queries = [
        "금강의 상태가 어때?",
        "Python 프로그래밍 설명",
        "나는 누구야?",
        "코드 리팩토링 방법",
        "안녕하세요!"
    ]

    print("🎯 리팩토링된 시스템 성능:")

    for query in test_queries:
        start_time = datetime.now()

        try:
            from app.graph import route_node
            state = {"output": query, "memory": None}
            result = route_node(state, verbose=False)

            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()

            intent_info = result.get("intent_analysis", {})
            primary_intent = intent_info.get("primary_intent", "unknown")
            confidence = result.get("confidence_score", 0.0)

            print(f"   📝 '{query}'")
            print(f"   ⏱️  처리 시간: {duration:.3f}초")
            print(f"   🎯 의도: {primary_intent} (신뢰도: {confidence:.2f})")
            print(f"   🔀 라우팅: {result.get('router_decision')}")
            print()

        except Exception as e:
            print(f"   ❌ '{query}' 테스트 실패: {e}")

def generate_test_report():
    """테스트 결과 보고서 생성"""
    print("\n📋 2단계 리팩토링 테스트 보고서")
    print("=" * 60)

    report = {
        "test_timestamp": datetime.now().isoformat(),
        "stage": "2단계: 기억-추론 균형 조정",
        "improvements": [
            "하이브리드 검색 시스템 (벡터 + 키워드)",
            "응답 품질 평가 시스템",
            "의도별 맞춤형 응답 생성",
            "적응형 GPT 모델 선택",
            "검색 결과 품질 기반 응답 전략"
        ],
        "test_coverage": [
            "하이브리드 검색 기능",
            "품질 평가 알고리즘",
            "의도별 응답 생성",
            "통합 플로우",
            "성능 측정"
        ]
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))

    return report

def main():
    """메인 테스트 실행"""
    print("🎯 금강 2단계 리팩토링 테스트 시작")
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 각 테스트 실행
    test_hybrid_search()
    test_response_quality()
    test_contextual_generation()
    test_integrated_flow()
    test_performance_comparison()

    # 최종 보고서
    generate_test_report()

    print("\n✅ 모든 테스트 완료!")
    print(f"⏰ 종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
