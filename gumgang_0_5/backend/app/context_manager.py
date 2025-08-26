#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 2.0 통합 컨텍스트 관리 시스템
- 4계층 시간적 메모리 시스템 통합
- 대화 히스토리 관리
- 사용자 세션 추적
- 컨텍스트 연속성 분석
- 시간적 맥락 처리
- 적응형 메모리 통합
"""

import json
import re
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, asdict
from collections import deque
import hashlib
import logging

# 4계층 메모리 시스템 임포트
from .temporal_memory import (
    get_temporal_memory_system, MemoryType, MemoryPriority,
    MemoryTrace, TemporalMemorySystem
)

@dataclass
class ConversationTurn:
    """단일 대화 턴 데이터 - 4계층 메모리 시스템 호환"""
    turn_id: str
    timestamp: datetime
    user_query: str
    system_response: str
    intent: str
    confidence: float
    source: str
    response_quality: float
    session_id: str
    memory_trace_id: Optional[str] = None  # 연결된 메모리 트레이스 ID
    emotional_context: float = 0.0  # 감정적 맥락
    importance_score: float = 0.5  # 중요도 점수

    def to_dict(self) -> Dict:
        return {
            **asdict(self),
            'timestamp': self.timestamp.isoformat()
        }

    @classmethod
    def from_dict(cls, data: Dict) -> 'ConversationTurn':
        data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)

@dataclass
class UserContext:
    """사용자 컨텍스트 정보"""
    user_id: str
    session_id: str
    preferences: Dict[str, Any]
    interaction_patterns: Dict[str, int]
    frequent_intents: List[str]
    avg_response_quality: float
    total_interactions: int
    last_active: datetime

class ConversationMemory:
    """대화 히스토리 관리 - 4계층 메모리 시스템 통합"""

    def __init__(self, max_history: int = 20):
        self.max_history = max_history
        self.conversations: deque = deque(maxlen=max_history)
        self.session_conversations: Dict[str, deque] = {}

        # 4계층 메모리 시스템 연결
        self.temporal_memory = get_temporal_memory_system()

        # 메모리 통합 설정
        self.auto_store_to_memory = True
        self.emotional_analysis_enabled = True

    def add_turn(self, turn: ConversationTurn):
        """새로운 대화 턴 추가 - 4계층 메모리 시스템에 자동 저장"""
        self.conversations.append(turn)

        # 세션별 대화 저장
        if turn.session_id not in self.session_conversations:
            self.session_conversations[turn.session_id] = deque(maxlen=self.max_history)

        self.session_conversations[turn.session_id].append(turn)

        # 4계층 메모리 시스템에 저장
        if self.auto_store_to_memory:
            self._store_turn_to_temporal_memory(turn)

    def get_recent_history(self, session_id: str, count: int = 5) -> List[ConversationTurn]:
        """최근 대화 히스토리 조회 - 4계층 메모리에서 보강"""
        # 기본 세션 히스토리
        if session_id not in self.session_conversations:
            session_history = []
        else:
            session_history = list(self.session_conversations[session_id])
            session_history = session_history[-count:] if len(session_history) >= count else session_history

        # 4계층 메모리에서 추가 컨텍스트 검색
        if len(session_history) < count:
            additional_context = self._get_memory_enhanced_context(session_id, count - len(session_history))
            session_history.extend(additional_context)

        return session_history

    def get_related_conversations(self, query: str, session_id: str, threshold: float = 0.3) -> List[ConversationTurn]:
        """관련 대화 검색"""
        if session_id not in self.session_conversations:
            return []

        query_keywords = set(re.findall(r'\w+', query.lower()))
        related = []

        for turn in self.session_conversations[session_id]:
            turn_keywords = set(re.findall(r'\w+', turn.user_query.lower()))

            if query_keywords.intersection(turn_keywords):
                similarity = len(query_keywords.intersection(turn_keywords)) / len(query_keywords.union(turn_keywords))
                if similarity >= threshold:
                    related.append(turn)

        return sorted(related, key=lambda x: x.timestamp, reverse=True)

    def _store_turn_to_temporal_memory(self, turn: ConversationTurn):
        """대화 턴을 4계층 메모리 시스템에 저장"""
        try:
            # 감정적 맥락 분석
            emotional_valence = self._analyze_emotional_context(turn)
            turn.emotional_context = emotional_valence

            # 중요도 계산
            importance = self._calculate_turn_importance(turn)
            turn.importance_score = importance

            # 메모리 타입 결정
            memory_type = self._determine_memory_type(turn)

            # 우선순위 결정
            priority = self._determine_priority(turn)

            # 태그 생성
            tags = self._extract_tags(turn)

            # 메모리 저장
            memory_content = f"사용자: {turn.user_query}\n시스템: {turn.system_response}"

            memory_trace_id = self.temporal_memory.store_memory(
                content=memory_content,
                memory_type=memory_type,
                priority=priority,
                session_id=turn.session_id,
                emotional_valence=emotional_valence,
                tags=tags
            )

            turn.memory_trace_id = memory_trace_id

        except Exception as e:
            logging.error(f"Failed to store turn to temporal memory: {e}")

    def _analyze_emotional_context(self, turn: ConversationTurn) -> float:
        """감정적 맥락 분석"""
        if not self.emotional_analysis_enabled:
            return 0.0

        # 간단한 감정 분석 (실제로는 더 정교한 모델 사용 가능)
        positive_words = ['좋다', '감사', '훌륭', '완벽', '만족', '기쁘다', '행복']
        negative_words = ['나쁘다', '싫다', '화나다', '실망', '문제', '오류', '어려워']

        query_words = turn.user_query.lower()
        response_words = turn.system_response.lower()

        positive_count = sum(1 for word in positive_words if word in query_words or word in response_words)
        negative_count = sum(1 for word in negative_words if word in query_words or word in response_words)

        # -1.0 ~ 1.0 범위로 정규화
        if positive_count + negative_count == 0:
            return 0.0

        return (positive_count - negative_count) / max(positive_count + negative_count, 1)

    def _calculate_turn_importance(self, turn: ConversationTurn) -> float:
        """대화 턴 중요도 계산"""
        factors = {
            'confidence': turn.confidence * 0.2,
            'response_quality': turn.response_quality * 0.3,
            'intent_importance': self._get_intent_importance(turn.intent) * 0.3,
            'length_factor': min(len(turn.user_query) / 100, 1.0) * 0.1,
            'emotional_intensity': abs(turn.emotional_context) * 0.1
        }

        return sum(factors.values())

    def _get_intent_importance(self, intent: str) -> float:
        """의도별 중요도 반환"""
        intent_weights = {
            'identity': 0.9,     # 정체성 관련 질문은 매우 중요
            'action': 0.8,       # 행동 요청도 중요
            'knowledge': 0.7,    # 지식 요청
            'meta': 0.6,         # 메타 질문
            'casual': 0.4        # 일반 대화
        }
        return intent_weights.get(intent, 0.5)

    def _determine_memory_type(self, turn: ConversationTurn) -> MemoryType:
        """메모리 타입 결정"""
        intent_to_memory_type = {
            'identity': MemoryType.SEMANTIC,
            'knowledge': MemoryType.SEMANTIC,
            'action': MemoryType.PROCEDURAL,
            'casual': MemoryType.EPISODIC,
            'meta': MemoryType.CONTEXTUAL
        }

        # 감정적 맥락이 강하면 감정 메모리로 분류
        if abs(turn.emotional_context) > 0.5:
            return MemoryType.EMOTIONAL

        return intent_to_memory_type.get(turn.intent, MemoryType.EPISODIC)

    def _determine_priority(self, turn: ConversationTurn) -> MemoryPriority:
        """우선순위 결정"""
        if turn.importance_score >= 0.8:
            return MemoryPriority.CRITICAL
        elif turn.importance_score >= 0.6:
            return MemoryPriority.HIGH
        elif turn.importance_score >= 0.4:
            return MemoryPriority.MEDIUM
        elif turn.importance_score >= 0.2:
            return MemoryPriority.LOW
        else:
            return MemoryPriority.MINIMAL

    def _extract_tags(self, turn: ConversationTurn) -> set:
        """태그 추출"""
        tags = {turn.intent, turn.source}

        # 키워드 기반 태그 추가
        keywords = re.findall(r'\w+', turn.user_query.lower())
        important_keywords = [w for w in keywords if len(w) > 3][:5]
        tags.update(important_keywords)

        return tags

    def _get_memory_enhanced_context(self, session_id: str, needed_count: int) -> List[ConversationTurn]:
        """메모리에서 추가 컨텍스트 검색"""
        try:
            # 현재 세션의 최근 쿼리들을 기반으로 관련 메모리 검색
            recent_queries = []
            if session_id in self.session_conversations:
                recent_turns = list(self.session_conversations[session_id])[-3:]
                recent_queries = [turn.user_query for turn in recent_turns]

            if not recent_queries:
                return []

            # 통합 쿼리 생성
            combined_query = " ".join(recent_queries)

            # 4계층 메모리에서 검색
            memory_results = self.temporal_memory.retrieve_memories(
                query=combined_query,
                session_id=session_id,
                max_results=needed_count * 2  # 여유분 확보
            )

            # 메모리 결과를 ConversationTurn으로 변환
            enhanced_context = []
            for result in memory_results[:needed_count]:
                trace = result['trace']

                # 메모리 내용을 파싱하여 ConversationTurn 생성
                if '\n시스템:' in trace.content:
                    user_part, system_part = trace.content.split('\n시스템:', 1)
                    user_query = user_part.replace('사용자:', '').strip()
                    system_response = system_part.strip()

                    turn = ConversationTurn(
                        turn_id=f"memory_{trace.trace_id}",
                        timestamp=trace.timestamp,
                        user_query=user_query,
                        system_response=system_response,
                        intent="unknown",
                        confidence=0.8,
                        source="memory_enhanced",
                        response_quality=0.8,
                        session_id=session_id,
                        memory_trace_id=trace.trace_id,
                        emotional_context=trace.emotional_valence,
                        importance_score=trace.activation_strength
                    )

                    enhanced_context.append(turn)

            return enhanced_context

        except Exception as e:
            logging.error(f"Failed to get memory enhanced context: {e}")
            return []

class ContextAnalyzer:
    """컨텍스트 연속성 분석"""

    @staticmethod
    def analyze_conversation_flow(current_query: str, history: List[ConversationTurn]) -> Dict[str, Any]:
        """대화 흐름 분석"""
        if not history:
            return {
                "is_followup": False,
                "context_type": "new_conversation",
                "continuity_score": 0.0,
                "related_turns": []
            }

        recent_turn = history[-1]

        # 시간적 연속성 (5분 이내)
        time_gap = datetime.now() - recent_turn.timestamp
        is_recent = time_gap.total_seconds() < 300  # 5분

        # 의미적 연속성
        current_keywords = set(re.findall(r'\w+', current_query.lower()))
        recent_keywords = set(re.findall(r'\w+', recent_turn.user_query.lower()))

        keyword_overlap = len(current_keywords.intersection(recent_keywords))
        semantic_similarity = keyword_overlap / max(len(current_keywords), 1)

        # 참조 표현 감지
        reference_patterns = [
            r'(그것|그거|이것|이거|그|이)',
            r'(위에서|앞서|이전에|방금)',
            r'(더|또|추가로|계속)',
            r'(왜|어떻게|언제)',
            r'(자세히|구체적으로|더 알고)'
        ]

        has_reference = any(re.search(pattern, current_query) for pattern in reference_patterns)

        # 연속성 점수 계산
        continuity_score = 0.0
        if is_recent:
            continuity_score += 0.3
        if semantic_similarity > 0.2:
            continuity_score += 0.4
        if has_reference:
            continuity_score += 0.3

        # 컨텍스트 타입 결정
        if continuity_score > 0.6:
            context_type = "direct_followup"
        elif continuity_score > 0.3:
            context_type = "related_topic"
        else:
            context_type = "topic_shift"

        return {
            "is_followup": continuity_score > 0.3,
            "context_type": context_type,
            "continuity_score": continuity_score,
            "time_gap_seconds": time_gap.total_seconds(),
            "semantic_similarity": semantic_similarity,
            "has_reference": has_reference,
            "related_turns": [recent_turn] if continuity_score > 0.3 else []
        }

    @staticmethod
    def extract_context_cues(query: str, history: List[ConversationTurn]) -> Dict[str, Any]:
        """컨텍스트 단서 추출"""
        cues = {
            "pronouns": [],
            "temporal_refs": [],
            "topic_refs": [],
            "comparison_refs": []
        }

        # 대명사 추출
        pronoun_patterns = [
            r'(그것|그거|이것|이거|그|이|저것|저거)',
            r'(그분|그사람|이분|이사람)',
            r'(그곳|거기|이곳|여기)'
        ]

        for pattern in pronoun_patterns:
            matches = re.findall(pattern, query)
            cues["pronouns"].extend(matches)

        # 시간적 참조
        temporal_patterns = [
            r'(방금|아까|이전에|앞서|위에서)',
            r'(다음에|나중에|이후에)',
            r'(지금|현재|요즘|최근)'
        ]

        for pattern in temporal_patterns:
            matches = re.findall(pattern, query)
            cues["temporal_refs"].extend(matches)

        # 주제 참조
        if history:
            recent_topics = []
            for turn in history[-3:]:  # 최근 3턴
                topic_keywords = re.findall(r'\w+', turn.user_query)
                recent_topics.extend(topic_keywords)

            for keyword in recent_topics:
                if keyword.lower() in query.lower():
                    cues["topic_refs"].append(keyword)

        return cues

class UserSessionManager:
    """사용자 세션 및 패턴 관리"""

    def __init__(self):
        self.sessions: Dict[str, UserContext] = {}
        self.active_sessions: Dict[str, datetime] = {}

    def create_session(self, user_id: str = None) -> str:
        """새 세션 생성"""
        session_id = str(uuid.uuid4())
        if not user_id:
            user_id = self._generate_user_id()

        context = UserContext(
            user_id=user_id,
            session_id=session_id,
            preferences={},
            interaction_patterns={},
            frequent_intents=[],
            avg_response_quality=0.0,
            total_interactions=0,
            last_active=datetime.now()
        )

        self.sessions[session_id] = context
        self.active_sessions[session_id] = datetime.now()

        return session_id

    def get_session(self, session_id: str) -> Optional[UserContext]:
        """세션 정보 조회"""
        if session_id in self.sessions:
            self.active_sessions[session_id] = datetime.now()
            return self.sessions[session_id]
        return None

    def update_session(self, session_id: str, turn: ConversationTurn):
        """세션 정보 업데이트"""
        if session_id not in self.sessions:
            return

        context = self.sessions[session_id]
        context.total_interactions += 1
        context.last_active = datetime.now()

        # 의도 패턴 업데이트
        intent = turn.intent
        if intent in context.interaction_patterns:
            context.interaction_patterns[intent] += 1
        else:
            context.interaction_patterns[intent] = 1

        # 평균 응답 품질 업데이트
        total_quality = context.avg_response_quality * (context.total_interactions - 1)
        context.avg_response_quality = (total_quality + turn.response_quality) / context.total_interactions

        # 빈번한 의도 업데이트
        sorted_intents = sorted(context.interaction_patterns.items(), key=lambda x: x[1], reverse=True)
        context.frequent_intents = [intent for intent, count in sorted_intents[:5]]

    def _generate_user_id(self) -> str:
        """익명 사용자 ID 생성"""
        timestamp = datetime.now().isoformat()
        return hashlib.md5(timestamp.encode()).hexdigest()[:8]

class TemporalContextProcessor:
    """시간적 맥락 처리"""

    @staticmethod
    def analyze_temporal_patterns(history: List[ConversationTurn]) -> Dict[str, Any]:
        """시간적 패턴 분석"""
        if not history:
            return {"patterns": [], "peak_hours": [], "session_duration": 0}

        # 시간대별 활동 분석
        hour_counts = {}
        for turn in history:
            hour = turn.timestamp.hour
            hour_counts[hour] = hour_counts.get(hour, 0) + 1

        # 피크 시간 계산
        if hour_counts:
            max_count = max(hour_counts.values())
            peak_hours = [hour for hour, count in hour_counts.items() if count == max_count]
        else:
            peak_hours = []

        # 세션 지속 시간
        if len(history) > 1:
            session_start = min(turn.timestamp for turn in history)
            session_end = max(turn.timestamp for turn in history)
            session_duration = (session_end - session_start).total_seconds() / 60  # 분 단위
        else:
            session_duration = 0

        return {
            "total_interactions": len(history),
            "peak_hours": peak_hours,
            "session_duration_minutes": session_duration,
            "avg_response_interval": TemporalContextProcessor._calculate_avg_interval(history)
        }

    @staticmethod
    def _calculate_avg_interval(history: List[ConversationTurn]) -> float:
        """평균 응답 간격 계산"""
        if len(history) < 2:
            return 0.0

        intervals = []
        for i in range(1, len(history)):
            interval = (history[i].timestamp - history[i-1].timestamp).total_seconds()
            intervals.append(interval)

        return sum(intervals) / len(intervals) if intervals else 0.0

class ContextualResponseEnhancer:
    """컨텍스트 기반 응답 개선 - 4계층 메모리 시스템 통합"""

    def __init__(self, conversation_memory: ConversationMemory, session_manager: UserSessionManager):
        self.conversation_memory = conversation_memory
        self.session_manager = session_manager
        self.context_analyzer = ContextAnalyzer()
        self.temporal_memory = get_temporal_memory_system()

    def enhance_prompt(self, query: str, session_id: str, base_intent: str) -> Tuple[str, Dict[str, Any]]:
        """4계층 메모리 시스템을 활용한 컨텍스트 강화 프롬프트 생성"""

        # 대화 히스토리 조회 (메모리 보강 포함)
        history = self.conversation_memory.get_recent_history(session_id, count=5)

        # 4계층 메모리에서 관련 컨텍스트 검색
        memory_context = self._get_memory_context(query, session_id)

        # 컨텍스트 분석
        flow_analysis = self.context_analyzer.analyze_conversation_flow(query, history)
        context_cues = self.context_analyzer.extract_context_cues(query, history)

        # 사용자 세션 정보
        user_context = self.session_manager.get_session(session_id)

        # 사용자 프로필 정보 (장기 메모리에서)
        user_profile = self.temporal_memory.get_user_profile()

        # 컨텍스트 강화 프롬프트 생성
        enhanced_prompt = self._build_contextual_prompt(
            query, history, memory_context, flow_analysis, context_cues,
            user_context, user_profile, base_intent
        )

        context_info = {
            "flow_analysis": flow_analysis,
            "context_cues": context_cues,
            "user_patterns": user_context.frequent_intents if user_context else [],
            "history_count": len(history),
            "memory_context_count": len(memory_context),
            "user_profile": user_profile,
            "memory_stats": self.temporal_memory.get_memory_stats()
        }

        return enhanced_prompt, context_info

    def _get_memory_context(self, query: str, session_id: str) -> List[Dict]:
        """4계층 메모리에서 관련 컨텍스트 검색"""
        try:
            memory_results = self.temporal_memory.retrieve_memories(
                query=query,
                session_id=session_id,
                max_results=5,
                min_relevance=0.3
            )
            return memory_results
        except Exception as e:
            logging.error(f"Failed to get memory context: {e}")
            return []

    def _build_contextual_prompt(self, query: str, history: List[ConversationTurn],
                                memory_context: List[Dict], flow_analysis: Dict, context_cues: Dict,
                                user_context: Optional[UserContext], user_profile: Dict, base_intent: str) -> str:
        """4계층 메모리를 활용한 컨텍스트 기반 프롬프트 구성"""

        prompt_parts = []

        # 기본 역할 설정 (개선된 버전)
        prompt_parts.append("당신은 금강이라는 지능형 AI 어시스턴트입니다. 4계층 메모리 시스템을 통해 과거의 경험을 기억하고 학습합니다.")

        # 사용자 프로필 정보
        if user_profile and user_profile.get('memory_preferences'):
            top_preferences = sorted(
                user_profile['memory_preferences'].items(),
                key=lambda x: x[1], reverse=True
            )[:3]
            if top_preferences:
                pref_str = ", ".join([pref[0] for pref in top_preferences])
                prompt_parts.append(f"\n[사용자 프로필] 주요 관심사: {pref_str}")

        # 관련 기억 컨텍스트
        if memory_context:
            prompt_parts.append("\n[관련 기억]")
            for i, mem_result in enumerate(memory_context[:3]):  # 상위 3개
                trace = mem_result['trace']
                layer = mem_result['layer']
                relevance = mem_result['relevance']

                # 메모리 내용 요약
                content_preview = trace.content[:150] + "..." if len(trace.content) > 150 else trace.content
                prompt_parts.append(f"기억 {i+1} ({layer}, 관련도: {relevance:.2f}): {content_preview}")

        # 대화 히스토리 컨텍스트
        if history and flow_analysis["is_followup"]:
            prompt_parts.append("\n[최근 대화]")
            for turn in history[-2:]:  # 최근 2턴
                prompt_parts.append(f"이전 질문: {turn.user_query}")
                prompt_parts.append(f"이전 답변: {turn.system_response[:200]}...")

                # 감정적 맥락 추가
                if hasattr(turn, 'emotional_context') and abs(turn.emotional_context) > 0.3:
                    emotion_desc = "긍정적" if turn.emotional_context > 0 else "부정적"
                    prompt_parts.append(f"감정적 맥락: {emotion_desc}")

        # 연속성 정보 (개선됨)
        if flow_analysis["context_type"] == "direct_followup":
            prompt_parts.append("\n이것은 이전 대화의 직접적인 후속 질문입니다. 기억된 맥락과 최근 대화를 모두 고려하여 답변하세요.")
        elif flow_analysis["context_type"] == "related_topic":
            prompt_parts.append("\n이것은 이전 대화와 관련된 주제입니다. 관련 기억들을 참고하여 연관성을 고려한 답변을 제공하세요.")

        # 참조 표현 처리 (개선됨)
        if context_cues["pronouns"]:
            prompt_parts.append(f"\n질문에 대명사({', '.join(context_cues['pronouns'])})가 포함되어 있습니다. 기억된 맥락과 최근 대화를 참조하여 명확히 해석하세요.")

        # 사용자 패턴 정보 (개선됨)
        if user_context and user_context.frequent_intents:
            frequent_intents_str = ", ".join(user_context.frequent_intents[:3])
            prompt_parts.append(f"\n사용자의 최근 관심사: {frequent_intents_str}")

        # 감정적 상태 고려
        if user_profile and 'emotional_baseline' in user_profile:
            baseline = user_profile['emotional_baseline']
            if abs(baseline) > 0.2:
                emotion_note = "일반적으로 긍정적" if baseline > 0 else "일반적으로 신중함"
                prompt_parts.append(f"\n사용자 성향: {emotion_note}")

        # 현재 질문
        prompt_parts.append(f"\n현재 질문: {query}")

        # 의도별 가이드라인 (개선됨)
        intent_guidelines = {
            "identity": "자신의 정체성에 대해 일관되고 친근하게 답변하되, 기억된 이전 대화들을 고려하세요.",
            "casual": "자연스럽고 친근한 대화체로 답변하되, 사용자와의 관계 히스토리를 반영하세요.",
            "knowledge": "정확하고 도움이 되는 정보를 제공하되, 이전 맥락과 관련 기억들을 활용하세요.",
            "action": "구체적이고 실행 가능한 조언을 제공하며, 사용자의 이전 경험과 선호도를 고려하세요.",
            "meta": "시스템에 대한 정보를 제공하되, 사용자와의 대화 히스토리와 학습된 패턴을 고려하세요."
        }

        guideline = intent_guidelines.get(base_intent, "도움이 되는 답변을 제공하되, 기억된 맥락을 최대한 활용하세요.")
        prompt_parts.append(f"\n답변 가이드라인: {guideline}")

        # 메모리 활용 지침
        if memory_context:
            prompt_parts.append("\n메모리 활용: 위의 관련 기억들을 참고하여 더 개인화되고 맥락에 맞는 답변을 제공하세요.")

        return "\n".join(prompt_parts)

# 전역 인스턴스 (싱글톤 패턴) - 4계층 메모리 통합
_conversation_memory = ConversationMemory()
_session_manager = UserSessionManager()
_response_enhancer = ContextualResponseEnhancer(_conversation_memory, _session_manager)

def get_conversation_memory() -> ConversationMemory:
    return _conversation_memory

def get_session_manager() -> UserSessionManager:
    return _session_manager

def get_response_enhancer() -> ContextualResponseEnhancer:
    return _response_enhancer
