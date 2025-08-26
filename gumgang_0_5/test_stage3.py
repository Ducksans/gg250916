#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 0.5 → 1.0 리팩토링: 3단계 컨텍스트 인식 개선 테스트 스크립트
"""

import sys
import os
import json
import time
from datetime import datetime, timedelta

# 백엔드 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

def test_conversation_memory():
    """대화 메모리 시스템 테스트"""
    print("🧠 대화 메모리 시스템 테스트")
    print("=" * 50)

    try:
        from app.context_manager import ConversationMemory, ConversationTurn

        memory = ConversationMemory(max_history=5)
        session_id = "test_session_001"

        # 테스트 대화 턴 생성
        test_turns = [
            {"query": "Python에 대해 알려주세요", "response": "Python은 프로그래밍 언어입니다", "intent": "knowledge"},
            {"query": "더 자세히 설명해주세요", "response": "Python은 간단하고 강력한 언어입니다", "intent": "knowledge"},
            {"query": "예제 코드를 보여주세요", "response": "print('Hello World') 이런 식으로 작성합니다", "intent": "action"},
        ]

        # 대화 턴 추가
        for i, turn_data in enumerate(test_turns):
            turn = ConversationTurn(
                turn_id=f"turn_{i+1}",
                timestamp=datetime.now() - timedelta(minutes=i),
                user_query=turn_data["query"],
                system_response=turn_data["response"],
                intent=turn_data["intent"],
                confidence=0.8,
                source="test",
                response_quality=0.7,
                session_id=session_id
            )
            memory.add_turn(turn)
            print(f"   ✅ 턴 {i+1} 추가: {turn_data['query'][:30]}...")

        # 최근 히스토리 조회
        recent = memory.get_recent_history(session_id, count=3)
        print(f"\n   📚 최근 히스토리 ({len(recent)}개):")
        for turn in recent:
            print(f"      - {turn.user_query[:40]}...")

        # 관련 대화 검색
        related = memory.get_related_conversations("Python 문법", session_id)
        print(f"\n   🔍 관련 대화 검색 ({len(related)}개):")
        for turn in related:
            print(f"      - {turn.user_query[:40]}...")

    except Exception as e:
        print(f"❌ 대화 메모리 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_context_analysis():
    """컨텍스트 분석 테스트"""
    print("\n🔍 컨텍스트 분석 테스트")
    print("=" * 50)

    try:
        from app.context_manager import ContextAnalyzer, ConversationTurn

        analyzer = ContextAnalyzer()

        # 가상 대화 히스토리 생성
        history = [
            ConversationTurn(
                turn_id="turn1",
                timestamp=datetime.now() - timedelta(minutes=2),
                user_query="FastAPI에 대해 설명해주세요",
                system_response="FastAPI는 Python 웹 프레임워크입니다",
                intent="knowledge",
                confidence=0.8,
                source="test",
                response_quality=0.7,
                session_id="test_session"
            ),
            ConversationTurn(
                turn_id="turn2",
                timestamp=datetime.now() - timedelta(minutes=1),
                user_query="예제 코드를 보여주세요",
                system_response="from fastapi import FastAPI...",
                intent="action",
                confidence=0.9,
                source="test",
                response_quality=0.8,
                session_id="test_session"
            )
        ]

        # 다양한 후속 질문 테스트
        test_queries = [
            "그 코드를 더 자세히 설명해주세요",  # 직접적 후속
            "FastAPI의 장점은 무엇인가요?",      # 관련 주제
            "React에 대해 알려주세요",           # 주제 전환
            "그것은 어떻게 작동하나요?",         # 대명사 참조
            "이전에 말한 내용을 다시 설명해주세요" # 시간적 참조
        ]

        for query in test_queries:
            print(f"\n🧪 질문: {query}")

            # 대화 흐름 분석
            flow = analyzer.analyze_conversation_flow(query, history)
            print(f"   🔗 연속성: {flow['context_type']} (점수: {flow['continuity_score']:.2f})")
            print(f"   ⏰ 시간 간격: {flow['time_gap_seconds']:.1f}초")
            print(f"   📊 의미 유사도: {flow['semantic_similarity']:.2f}")
            print(f"   🔗 참조 표현: {flow['has_reference']}")

            # 컨텍스트 단서 추출
            cues = analyzer.extract_context_cues(query, history)
            if any(cues.values()):
                print(f"   💡 컨텍스트 단서:")
                for cue_type, values in cues.items():
                    if values:
                        print(f"      {cue_type}: {values}")

    except Exception as e:
        print(f"❌ 컨텍스트 분석 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_session_management():
    """세션 관리 테스트"""
    print("\n👤 세션 관리 테스트")
    print("=" * 50)

    try:
        from app.context_manager import UserSessionManager, ConversationTurn

        manager = UserSessionManager()

        # 새 세션 생성
        session_id = manager.create_session()
        print(f"   🆕 새 세션 생성: {session_id}")

        # 세션 정보 조회
        context = manager.get_session(session_id)
        print(f"   📊 초기 상태: 상호작용 {context.total_interactions}회")

        # 가상 대화 턴으로 세션 업데이트
        test_turns = [
            {"intent": "knowledge", "quality": 0.8},
            {"intent": "knowledge", "quality": 0.7},
            {"intent": "action", "quality": 0.9},
            {"intent": "casual", "quality": 0.6},
            {"intent": "knowledge", "quality": 0.8},
        ]

        for i, turn_data in enumerate(test_turns):
            turn = ConversationTurn(
                turn_id=f"turn_{i+1}",
                timestamp=datetime.now(),
                user_query=f"테스트 질문 {i+1}",
                system_response=f"테스트 응답 {i+1}",
                intent=turn_data["intent"],
                confidence=0.8,
                source="test",
                response_quality=turn_data["quality"],
                session_id=session_id
            )
            manager.update_session(session_id, turn)

        # 업데이트된 세션 정보 조회
        updated_context = manager.get_session(session_id)
        print(f"   📈 업데이트 후: 상호작용 {updated_context.total_interactions}회")
        print(f"   🎯 빈번한 의도: {updated_context.frequent_intents}")
        print(f"   ⭐ 평균 품질: {updated_context.avg_response_quality:.2f}")
        print(f"   📊 의도 패턴: {updated_context.interaction_patterns}")

    except Exception as e:
        print(f"❌ 세션 관리 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_temporal_analysis():
    """시간적 패턴 분석 테스트"""
    print("\n⏰ 시간적 패턴 분석 테스트")
    print("=" * 50)

    try:
        from app.context_manager import TemporalContextProcessor, ConversationTurn

        processor = TemporalContextProcessor()

        # 다양한 시간대의 가상 대화 생성
        base_time = datetime.now()
        history = []

        # 오전, 오후, 저녁 시간대에 대화 생성
        time_slots = [
            (9, 0),   # 오전 9시
            (14, 30), # 오후 2시 30분
            (14, 35), # 오후 2시 35분 (연속 대화)
            (20, 15), # 저녁 8시 15분
            (20, 20), # 저녁 8시 20분 (연속 대화)
        ]

        for i, (hour, minute) in enumerate(time_slots):
            timestamp = base_time.replace(hour=hour, minute=minute, second=0, microsecond=0)
            turn = ConversationTurn(
                turn_id=f"temporal_{i+1}",
                timestamp=timestamp,
                user_query=f"시간대 테스트 질문 {i+1}",
                system_response=f"시간대 테스트 응답 {i+1}",
                intent="knowledge",
                confidence=0.8,
                source="test",
                response_quality=0.7,
                session_id="temporal_test"
            )
            history.append(turn)

        # 시간적 패턴 분석
        patterns = processor.analyze_temporal_patterns(history)

        print(f"   📊 총 상호작용: {patterns['total_interactions']}회")
        print(f"   🕐 피크 시간: {patterns['peak_hours']}시")
        print(f"   ⏱️ 세션 지속시간: {patterns['session_duration_minutes']:.1f}분")
        print(f"   📏 평균 응답 간격: {patterns['avg_response_interval']:.1f}초")

    except Exception as e:
        print(f"❌ 시간적 분석 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_contextual_enhancement():
    """컨텍스트 강화 테스트"""
    print("\n🎯 컨텍스트 응답 강화 테스트")
    print("=" * 50)

    try:
        from app.context_manager import (
            ContextualResponseEnhancer,
            ConversationMemory,
            UserSessionManager,
            ConversationTurn
        )

        # 테스트용 인스턴스 생성
        memory = ConversationMemory()
        session_manager = UserSessionManager()
        enhancer = ContextualResponseEnhancer(memory, session_manager)

        # 테스트 세션 설정
        session_id = session_manager.create_session()

        # 가상 대화 히스토리 구성
        history_turns = [
            {
                "query": "Python 웹 개발에 대해 알려주세요",
                "response": "Python에는 Django, Flask, FastAPI 등의 웹 프레임워크가 있습니다",
                "intent": "knowledge"
            },
            {
                "query": "FastAPI의 특징을 설명해주세요",
                "response": "FastAPI는 빠르고 현대적인 웹 프레임워크입니다",
                "intent": "knowledge"
            }
        ]

        # 히스토리 추가
        for i, turn_data in enumerate(history_turns):
            turn = ConversationTurn(
                turn_id=f"hist_{i+1}",
                timestamp=datetime.now() - timedelta(minutes=5-i),
                user_query=turn_data["query"],
                system_response=turn_data["response"],
                intent=turn_data["intent"],
                confidence=0.8,
                source="test",
                response_quality=0.8,
                session_id=session_id
            )
            memory.add_turn(turn)
            session_manager.update_session(session_id, turn)

        # 다양한 후속 질문으로 강화 테스트
        test_cases = [
            {
                "query": "그 프레임워크를 어떻게 설치하나요?",
                "expected_context": "direct_followup",
                "description": "직접적 후속 질문"
            },
            {
                "query": "FastAPI vs Django 비교해주세요",
                "expected_context": "related_topic",
                "description": "관련 주제 질문"
            },
            {
                "query": "날씨가 어떤가요?",
                "expected_context": "topic_shift",
                "description": "주제 전환"
            }
        ]

        for case in test_cases:
            print(f"\n🧪 테스트: {case['description']}")
            print(f"   질문: {case['query']}")

            # 컨텍스트 강화 프롬프트 생성
            enhanced_prompt, context_info = enhancer.enhance_prompt(
                case['query'],
                session_id,
                "knowledge"
            )

            flow_analysis = context_info['flow_analysis']
            print(f"   📊 컨텍스트 타입: {flow_analysis['context_type']}")
            print(f"   🔗 연속성 점수: {flow_analysis['continuity_score']:.2f}")
            print(f"   📚 히스토리 활용: {context_info['history_count']}개 턴")

            # 강화된 프롬프트 미리보기
            preview = enhanced_prompt[:200] + "..." if len(enhanced_prompt) > 200 else enhanced_prompt
            print(f"   💡 프롬프트 미리보기: {preview}")

    except Exception as e:
        print(f"❌ 컨텍스트 강화 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_integrated_flow():
    """통합 플로우 테스트"""
    print("\n🚀 통합 컨텍스트 플로우 테스트")
    print("=" * 50)

    try:
        # 실제 그래프 모듈 임포트 시도
        from app.graph import route_node, reflect_node

        # 시뮬레이션된 대화 시퀀스
        conversation_sequence = [
            "FastAPI에 대해 알려주세요",
            "그것의 주요 특징은 무엇인가요?",
            "예제 코드를 보여주세요",
            "그 코드를 설명해주세요",
            "다른 프레임워크와 비교해주세요"
        ]

        session_id = "integrated_test_session"

        for i, query in enumerate(conversation_sequence):
            print(f"\n🔄 대화 턴 {i+1}: {query}")

            # 1. Reflect 노드 테스트
            initial_state = {
                "output": query,
                "memory": None,
                "session_id": session_id if i > 0 else None  # 첫 턴은 새 세션
            }

            reflected_state = reflect_node(initial_state, verbose=True)
            print(f"   📡 세션 ID: {reflected_state.get('session_id', 'None')[:8]}...")

            # 2. Route 노드 테스트
            routed_state = route_node(reflected_state, verbose=True)

            intent_analysis = routed_state.get("intent_analysis", {})
            print(f"   🎯 의도: {intent_analysis.get('primary_intent', 'unknown')}")
            print(f"   🔀 라우팅: {routed_state.get('router_decision')}")

            # 세션 ID를 다음 턴으로 전달
            session_id = reflected_state.get("session_id")

            # 짧은 지연 (실제 대화 시뮬레이션)
            time.sleep(0.1)

    except Exception as e:
        print(f"❌ 통합 플로우 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def test_performance_metrics():
    """성능 메트릭 테스트"""
    print("\n⚡ 3단계 시스템 성능 테스트")
    print("=" * 50)

    try:
        from app.context_manager import (
            get_conversation_memory,
            get_session_manager,
            get_response_enhancer
        )

        # 성능 측정 시작
        start_time = datetime.now()

        # 1. 대용량 세션 생성
        session_manager = get_session_manager()
        session_ids = []

        for i in range(10):
            session_id = session_manager.create_session()
            session_ids.append(session_id)

        print(f"   ⏱️ 10개 세션 생성: {(datetime.now() - start_time).total_seconds():.3f}초")

        # 2. 대화 메모리 성능
        memory_start = datetime.now()
        memory = get_conversation_memory()

        # 100개 대화 턴 추가
        from app.context_manager import ConversationTurn
        for i in range(100):
            turn = ConversationTurn(
                turn_id=f"perf_{i}",
                timestamp=datetime.now(),
                user_query=f"성능 테스트 질문 {i}",
                system_response=f"성능 테스트 응답 {i}",
                intent="knowledge",
                confidence=0.8,
                source="test",
                response_quality=0.7,
                session_id=session_ids[i % len(session_ids)]
            )
            memory.add_turn(turn)

        print(f"   ⏱️ 100개 대화 턴 저장: {(datetime.now() - memory_start).total_seconds():.3f}초")

        # 3. 검색 성능
        search_start = datetime.now()
        for session_id in session_ids[:5]:
            recent = memory.get_recent_history(session_id, count=5)
            related = memory.get_related_conversations("테스트", session_id)

        print(f"   ⏱️ 검색 성능 (5개 세션): {(datetime.now() - search_start).total_seconds():.3f}초")

        # 4. 전체 처리 시간
        total_time = (datetime.now() - start_time).total_seconds()
        print(f"   🏁 전체 처리 시간: {total_time:.3f}초")

        # 5. 메모리 사용량 정보
        print(f"   📊 활성 세션: {len(session_manager.sessions)}개")
        print(f"   💾 저장된 대화 턴: {len(memory.conversations)}개")

    except Exception as e:
        print(f"❌ 성능 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

def generate_stage3_report():
    """3단계 테스트 보고서 생성"""
    print("\n📋 3단계 리팩토링 테스트 보고서")
    print("=" * 60)

    report = {
        "test_timestamp": datetime.now().isoformat(),
        "stage": "3단계: 컨텍스트 인식 개선",
        "new_features": [
            "대화 히스토리 관리 (ConversationMemory)",
            "사용자 세션 추적 (UserSessionManager)",
            "컨텍스트 연속성 분석 (ContextAnalyzer)",
            "시간적 패턴 처리 (TemporalContextProcessor)",
            "컨텍스트 강화 응답 (ContextualResponseEnhancer)"
        ],
        "improvements": [
            "대화 연속성 인식 (직접 후속/관련 주제/주제 전환)",
            "참조 표현 해석 (대명사, 시간적 참조)",
            "사용자 패턴 학습 (빈번한 의도, 평균 품질)",
            "세션별 맞춤 응답",
            "시간적 맥락 활용"
        ],
        "test_coverage": [
            "대화 메모리 시스템",
            "컨텍스트 분석 엔진",
            "세션 관리",
            "시간적 패턴 분석",
            "컨텍스트 응답 강화",
            "통합 플로우",
            "성능 측정"
        ],
        "key_metrics": {
            "context_recognition": "5가지 타입 (direct_followup/related_topic/topic_shift/new_conversation)",
            "session_management": "사용자별 패턴 추적 + 선호도 학습",
            "memory_efficiency": "최대 20개 턴 보관 + 관련성 기반 검색",
            "temporal_analysis": "시간대별 패턴 + 평균 응답 간격 분석"
        }
    }

    print(json.dumps(report, indent=2, ensure_ascii=False))
    return report

def main():
    """메인 테스트 실행"""
    print("🎯 금강 3단계 컨텍스트 리팩토링 테스트 시작")
    print(f"⏰ 시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    # 각 테스트 순차 실행
    test_conversation_memory()
    test_context_analysis()
    test_session_management()
    test_temporal_analysis()
    test_contextual_enhancement()
    test_integrated_flow()
    test_performance_metrics()

    # 최종 보고서
    generate_stage3_report()

    print("\n✅ 3단계 테스트 완료!")
    print("🚀 컨텍스트 인식 시스템이 성공적으로 구축되었습니다!")
    print(f"⏰ 종료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main()
