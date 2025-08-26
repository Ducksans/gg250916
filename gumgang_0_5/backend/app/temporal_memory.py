#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 2.0 시간적 메모리 시스템 (Temporal Memory System)
인간의 기억 체계를 모방한 4계층 아키텍처

기반 연구:
- Hierarchical Temporal Memory (HTM) - Numenta
- HEMA: Hippocampus-Inspired Extended Memory Architecture
- Human memory consolidation neuroscience
- Systems consolidation theory

4계층 구조:
1. 초단기 메모리 (0-5분): 즉시 컨텍스트, 워킹 메모리
2. 단기 메모리 (5분-1시간): 세션 클러스터, 에피소딕 버퍼
3. 중장기 메모리 (1시간-1일): 일일 패턴, 의미적 통합
4. 초장기 메모리 (1일+): 영구 지식, 스키마 기억

Author: Gumgang AI Team
Version: 2.0
"""

import json
import numpy as np
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set
from dataclasses import dataclass, asdict, field
from collections import defaultdict, deque
from enum import Enum
import asyncio
import threading
import time
import hashlib
import pickle
from pathlib import Path
import logging

# 메모리 우선순위 열거형
class MemoryPriority(Enum):
    CRITICAL = 1.0      # 시스템 핵심 정보
    HIGH = 0.8          # 중요한 사용자 정보
    MEDIUM = 0.6        # 일반적인 상호작용
    LOW = 0.4           # 부가적인 정보
    MINIMAL = 0.2       # 임시 정보

# 메모리 타입 열거형
class MemoryType(Enum):
    EPISODIC = "episodic"       # 에피소딕 기억 (경험, 사건)
    SEMANTIC = "semantic"       # 의미적 기억 (지식, 사실)
    PROCEDURAL = "procedural"   # 절차적 기억 (방법, 스킬)
    EMOTIONAL = "emotional"     # 감정적 기억 (감정, 정서)
    CONTEXTUAL = "contextual"   # 맥락적 기억 (상황, 환경)

@dataclass
class MemoryTrace:
    """기본 메모리 트레이스 단위"""
    trace_id: str
    content: str
    memory_type: MemoryType
    priority: MemoryPriority
    timestamp: datetime
    access_count: int = 0
    last_accessed: Optional[datetime] = None
    emotional_valence: float = 0.0  # -1.0 (부정) ~ 1.0 (긍정)
    activation_strength: float = 1.0
    consolidation_level: int = 0  # 0: 초기, 1-4: 계층별 통합 레벨
    tags: Set[str] = field(default_factory=set)
    associations: Dict[str, float] = field(default_factory=dict)  # 연관 메모리 ID와 강도

    def decay(self, time_factor: float = 0.01):
        """시간 경과에 따른 활성화 강도 감소"""
        self.activation_strength *= (1 - time_factor)
        if self.activation_strength < 0.01:
            self.activation_strength = 0.01

    def strengthen(self, boost: float = 0.1):
        """접근 시 강화"""
        self.activation_strength = min(1.0, self.activation_strength + boost)
        self.access_count += 1
        self.last_accessed = datetime.now()

@dataclass
class MemoryCluster:
    """관련 메모리들의 클러스터"""
    cluster_id: str
    theme: str
    traces: List[str]  # MemoryTrace IDs
    centroid_vector: Optional[np.ndarray] = None
    creation_time: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    coherence_score: float = 0.0
    access_frequency: int = 0

    def update_coherence(self, trace_vectors: Dict[str, np.ndarray]):
        """클러스터 일관성 점수 업데이트"""
        if len(self.traces) < 2:
            self.coherence_score = 1.0
            return

        vectors = [trace_vectors[tid] for tid in self.traces if tid in trace_vectors]
        if len(vectors) < 2:
            return

        # 벡터간 평균 코사인 유사도 계산
        similarities = []
        for i in range(len(vectors)):
            for j in range(i+1, len(vectors)):
                sim = np.dot(vectors[i], vectors[j]) / (
                    np.linalg.norm(vectors[i]) * np.linalg.norm(vectors[j]) + 1e-8
                )
                similarities.append(sim)

        self.coherence_score = np.mean(similarities) if similarities else 0.0

class UltraShortTermMemory:
    """초단기 메모리 (0-5분): 워킹 메모리, 즉시 컨텍스트"""

    def __init__(self, capacity: int = 7):  # Miller's 7±2 rule
        self.capacity = capacity
        self.buffer: deque = deque(maxlen=capacity)
        self.attention_weights: Dict[str, float] = {}
        self.current_focus: Optional[str] = None

    def add_trace(self, trace: MemoryTrace):
        """새 트레이스 추가"""
        self.buffer.append(trace.trace_id)
        self.attention_weights[trace.trace_id] = trace.activation_strength
        self._update_focus()

    def get_active_context(self) -> List[str]:
        """현재 활성 컨텍스트 반환"""
        current_time = datetime.now()
        active = []

        for trace_id in self.buffer:
            # 5분 이내의 트레이스만 유지
            if trace_id in self.attention_weights:
                active.append(trace_id)

        return active

    def _update_focus(self):
        """주의 집중 대상 업데이트"""
        if not self.attention_weights:
            self.current_focus = None
            return

        # 가장 높은 주의 가중치를 가진 트레이스에 집중
        self.current_focus = max(
            self.attention_weights.keys(),
            key=lambda x: self.attention_weights[x]
        )

class ShortTermMemory:
    """단기 메모리 (5분-1시간): 세션 클러스터, 에피소딕 버퍼"""

    def __init__(self, capacity: int = 50):
        self.capacity = capacity
        self.traces: Dict[str, MemoryTrace] = {}
        self.clusters: Dict[str, MemoryCluster] = {}
        self.session_map: Dict[str, List[str]] = defaultdict(list)  # session_id -> trace_ids
        self.temporal_chains: List[List[str]] = []  # 시간적 연결 체인

    def add_trace(self, trace: MemoryTrace, session_id: str):
        """새 트레이스 추가 및 클러스터링"""
        if len(self.traces) >= self.capacity:
            self._evict_oldest()

        self.traces[trace.trace_id] = trace
        self.session_map[session_id].append(trace.trace_id)

        # 자동 클러스터링
        self._auto_cluster(trace)

        # 시간적 체인 업데이트
        self._update_temporal_chains(trace.trace_id, session_id)

    def _auto_cluster(self, new_trace: MemoryTrace):
        """자동 의미적 클러스터링"""
        if not self.clusters:
            # 첫 번째 클러스터 생성
            cluster_id = str(uuid.uuid4())
            cluster = MemoryCluster(
                cluster_id=cluster_id,
                theme=self._extract_theme(new_trace),
                traces=[new_trace.trace_id]
            )
            self.clusters[cluster_id] = cluster
            return

        # 기존 클러스터와의 유사도 계산
        best_cluster = None
        best_similarity = 0.0

        # Handle case where content might not be a string
        content = new_trace.content
        if hasattr(content, 'content'):
            content = content.content
        if not isinstance(content, str):
            content = str(content)
        new_keywords = set(content.lower().split())

        for cluster in self.clusters.values():
            if not cluster.traces:
                continue

            # 클러스터 대표 트레이스들과 비교
            cluster_keywords = set()
            for trace_id in cluster.traces[-3:]:  # 최근 3개 트레이스
                if trace_id in self.traces:
                    # Handle case where content might not be a string
                    trace_content = self.traces[trace_id].content
                    if hasattr(trace_content, 'content'):
                        trace_content = trace_content.content
                    if not isinstance(trace_content, str):
                        trace_content = str(trace_content)
                    cluster_keywords.update(
                        trace_content.lower().split()
                    )

            # Jaccard 유사도 계산
            if cluster_keywords:
                intersection = len(new_keywords & cluster_keywords)
                union = len(new_keywords | cluster_keywords)
                similarity = intersection / union if union > 0 else 0

                if similarity > best_similarity:
                    best_similarity = similarity
                    best_cluster = cluster

        # 임계값 기반 클러스터 배정
        if best_similarity > 0.3 and best_cluster:
            best_cluster.traces.append(new_trace.trace_id)
            best_cluster.last_updated = datetime.now()
            best_cluster.access_frequency += 1
        else:
            # 새 클러스터 생성
            cluster_id = str(uuid.uuid4())
            cluster = MemoryCluster(
                cluster_id=cluster_id,
                theme=self._extract_theme(new_trace.content),
                traces=[new_trace.trace_id]
            )
            self.clusters[cluster_id] = cluster

    def _extract_theme(self, content: str) -> str:
        """컨텐츠에서 주제 추출"""
        # content가 MemoryTrace 객체인 경우 처리
        if hasattr(content, 'content'):
            content = content.content
        # content가 문자열이 아닌 경우 문자열로 변환
        if not isinstance(content, str):
            content = str(content)

        words = content.lower().split()
        # 간단한 키워드 기반 주제 추출
        if len(words) >= 3:
            return " ".join(words[:3])
        return content[:30]

    def _update_temporal_chains(self, trace_id: str, session_id: str):
        """시간적 연결 체인 업데이트"""
        session_traces = self.session_map[session_id]
        if len(session_traces) >= 2:
            # 최근 트레이스들을 체인으로 연결
            recent_chain = session_traces[-3:]  # 최근 3개

            # 기존 체인에 추가하거나 새 체인 생성
            added_to_existing = False
            for chain in self.temporal_chains:
                if chain[-1] in recent_chain[:-1]:
                    chain.append(trace_id)
                    added_to_existing = True
                    break

            if not added_to_existing:
                self.temporal_chains.append(recent_chain)

    def _evict_oldest(self):
        """가장 오래된 트레이스 제거"""
        if not self.traces:
            return

        oldest_id = min(
            self.traces.keys(),
            key=lambda x: self.traces[x].timestamp
        )

        # 클러스터에서도 제거
        for cluster in self.clusters.values():
            if oldest_id in cluster.traces:
                cluster.traces.remove(oldest_id)

        # 빈 클러스터 제거
        empty_clusters = [
            cid for cid, cluster in self.clusters.items()
            if not cluster.traces
        ]
        for cid in empty_clusters:
            del self.clusters[cid]

        del self.traces[oldest_id]

    def get_relevant_traces(self, query: str, limit: int = 5) -> List[MemoryTrace]:
        """쿼리와 관련된 트레이스 검색"""
        query_keywords = set(query.lower().split())
        scored_traces = []

        for trace in self.traces.values():
            # Handle case where content might not be a string
            content = trace.content
            if hasattr(content, 'content'):
                content = content.content
            if not isinstance(content, str):
                content = str(content)
            trace_keywords = set(content.lower().split())

            # 키워드 매칭 점수
            keyword_score = len(query_keywords & trace_keywords) / len(query_keywords | trace_keywords)

            # 활성화 강도 및 우선순위 고려
            total_score = (
                keyword_score * 0.5 +
                trace.activation_strength * 0.3 +
                trace.priority.value * 0.2
            )

            scored_traces.append((total_score, trace))

        # 점수순 정렬 및 상위 결과 반환
        scored_traces.sort(key=lambda x: x[0], reverse=True)
        return [trace for _, trace in scored_traces[:limit]]

class MediumTermMemory:
    """중장기 메모리 (1시간-1일): 일일 패턴, 의미적 통합"""

    def __init__(self, capacity: int = 200):
        self.capacity = capacity
        self.traces: Dict[str, MemoryTrace] = {}
        self.daily_patterns: Dict[str, Dict] = defaultdict(dict)  # date -> patterns
        self.concept_map: Dict[str, Set[str]] = defaultdict(set)  # concept -> trace_ids
        self.importance_threshold = 0.6

    def consolidate_from_short_term(self, short_term_traces: Dict[str, MemoryTrace]):
        """단기 메모리에서 중요한 트레이스들을 통합"""
        current_date = datetime.now().strftime('%Y-%m-%d')

        for trace in short_term_traces.values():
            # 중요도 기반 필터링
            importance_score = self._calculate_importance(trace)

            if importance_score >= self.importance_threshold:
                # 통합 레벨 증가
                trace.consolidation_level = max(2, trace.consolidation_level + 1)
                trace.strengthen(0.2)  # 통합 시 강화

                if len(self.traces) >= self.capacity:
                    self._selective_eviction()

                self.traces[trace.trace_id] = trace

                # 개념 맵 업데이트
                self._update_concept_map(trace)

                # 일일 패턴 분석
                self._analyze_daily_patterns(trace, current_date)

    def _calculate_importance(self, trace: MemoryTrace) -> float:
        """트레이스 중요도 계산"""
        # 다중 요인 중요도 스코어
        factors = {
            'priority': trace.priority.value * 0.3,
            'activation': trace.activation_strength * 0.2,
            'access_frequency': min(trace.access_count / 10.0, 1.0) * 0.2,
            'emotional_weight': abs(trace.emotional_valence) * 0.15,
            'recency': self._recency_score(trace.timestamp) * 0.15
        }

        return sum(factors.values())

    def _recency_score(self, timestamp: datetime) -> float:
        """최신성 점수 계산"""
        hours_ago = (datetime.now() - timestamp).total_seconds() / 3600
        return max(0, 1 - hours_ago / 24)  # 24시간 기준으로 감소

    def _selective_eviction(self):
        """선택적 제거 (덜 중요한 트레이스 우선 제거)"""
        if not self.traces:
            return

        # 중요도 기반 정렬
        sorted_traces = sorted(
            self.traces.items(),
            key=lambda x: self._calculate_importance(x[1])
        )

        # 하위 10% 제거
        remove_count = max(1, len(sorted_traces) // 10)
        for i in range(remove_count):
            trace_id, _ = sorted_traces[i]
            self._remove_trace(trace_id)

    def _remove_trace(self, trace_id: str):
        """트레이스 완전 제거"""
        if trace_id in self.traces:
            # 개념 맵에서 제거
            for concept_traces in self.concept_map.values():
                concept_traces.discard(trace_id)

            del self.traces[trace_id]

    def _update_concept_map(self, trace: MemoryTrace):
        """개념 맵 업데이트"""
        # 간단한 키워드 기반 개념 추출
        # Handle case where content might not be a string
        content = trace.content
        if hasattr(content, 'content'):
            content = content.content
        if not isinstance(content, str):
            content = str(content)
        words = content.lower().split()
        important_words = [w for w in words if len(w) > 3]  # 3글자 이상 단어

        for word in important_words[:5]:  # 상위 5개 단어
            self.concept_map[word].add(trace.trace_id)

    def _analyze_daily_patterns(self, trace: MemoryTrace, date: str):
        """일일 패턴 분석"""
        if date not in self.daily_patterns:
            self.daily_patterns[date] = {
                'total_interactions': 0,
                'memory_types': defaultdict(int),
                'emotional_trend': [],
                'peak_hours': defaultdict(int),
                'dominant_themes': defaultdict(int)
            }

        patterns = self.daily_patterns[date]
        patterns['total_interactions'] += 1
        patterns['memory_types'][trace.memory_type.value] += 1
        patterns['emotional_trend'].append(trace.emotional_valence)
        patterns['peak_hours'][trace.timestamp.hour] += 1

        # 주제 추출
        # Handle case where content might not be a string
        content = trace.content
        if hasattr(content, 'content'):
            content = content.content
        if not isinstance(content, str):
            content = str(content)
        theme = " ".join(content.lower().split()[:3])
        patterns['dominant_themes'][theme] += 1

class LongTermMemory:
    """초장기 메모리 (1일+): 영구 지식, 스키마 기억"""

    def __init__(self, storage_path: str = "memory/long_term"):
        self.storage_path = Path(storage_path)
        self.storage_path.mkdir(parents=True, exist_ok=True)

        self.schemas: Dict[str, Dict] = {}  # 스키마 기억
        self.core_knowledge: Dict[str, MemoryTrace] = {}  # 핵심 지식
        self.user_profiles: Dict[str, Dict] = defaultdict(dict)  # 사용자 프로필
        self.permanent_patterns: Dict[str, Any] = {}  # 영구 패턴

        self._load_persistent_data()

    def consolidate_from_medium_term(self, medium_term_traces: Dict[str, MemoryTrace],
                                   daily_patterns: Dict[str, Dict]):
        """중장기 메모리에서 영구 기억으로 통합"""

        # 패턴 기반 스키마 생성
        self._update_schemas(daily_patterns)

        # 핵심 지식 추출
        for trace in medium_term_traces.values():
            if self._is_core_knowledge(trace):
                trace.consolidation_level = 4  # 최고 레벨
                self.core_knowledge[trace.trace_id] = trace

        # 사용자 프로필 업데이트
        self._update_user_profiles(medium_term_traces)

        # 영구 패턴 학습
        self._learn_permanent_patterns(daily_patterns)

        # 디스크에 저장
        self._save_persistent_data()

    def _is_core_knowledge(self, trace: MemoryTrace) -> bool:
        """핵심 지식 여부 판단"""
        criteria = [
            trace.priority == MemoryPriority.CRITICAL,
            trace.access_count >= 5,
            trace.activation_strength > 0.8,
            trace.memory_type in [MemoryType.SEMANTIC, MemoryType.PROCEDURAL]
        ]

        return sum(criteria) >= 2  # 2개 이상 조건 만족

    def _update_schemas(self, daily_patterns: Dict[str, Dict]):
        """스키마 업데이트"""
        for date, patterns in daily_patterns.items():
            # 요일별 패턴 스키마
            weekday = datetime.strptime(date, '%Y-%m-%d').strftime('%A')

            if weekday not in self.schemas:
                self.schemas[weekday] = {
                    'typical_interactions': 0,
                    'common_themes': {},
                    'emotional_baseline': 0.0,
                    'active_hours': {},
                    'memory_distribution': {}
                }

            schema = self.schemas[weekday]

            # 평균 업데이트
            schema['typical_interactions'] = (
                schema['typical_interactions'] * 0.8 +
                patterns['total_interactions'] * 0.2
            )

            # 감정 기준선 업데이트
            if patterns['emotional_trend']:
                daily_emotion = np.mean(patterns['emotional_trend'])
                schema['emotional_baseline'] = (
                    schema['emotional_baseline'] * 0.8 + daily_emotion * 0.2
                )

            # 활성 시간대 업데이트
            for hour, count in patterns['peak_hours'].items():
                if hour not in schema['active_hours']:
                    schema['active_hours'][hour] = 0
                schema['active_hours'][hour] = (
                    schema['active_hours'][hour] * 0.8 + count * 0.2
                )

    def _update_user_profiles(self, traces: Dict[str, MemoryTrace]):
        """사용자 프로필 업데이트"""
        # 여기서는 단일 사용자 가정, 추후 다중 사용자 확장 가능
        user_id = "default_user"
        profile = self.user_profiles[user_id]

        # 선호도 분석
        preferences = defaultdict(float)
        emotional_profile = []

        for trace in traces.values():
            # 메모리 타입 선호도
            preferences[trace.memory_type.value] += trace.activation_strength

            # 감정 프로필
            emotional_profile.append(trace.emotional_valence)

            # 주제 선호도
            for tag in trace.tags:
                preferences[f"topic_{tag}"] += trace.activation_strength

        # 프로필 업데이트
        profile['memory_preferences'] = dict(preferences)
        profile['emotional_baseline'] = np.mean(emotional_profile) if emotional_profile else 0.0
        profile['total_memories'] = len(traces)
        profile['last_updated'] = datetime.now().isoformat()

    def _learn_permanent_patterns(self, daily_patterns: Dict[str, Dict]):
        """영구 패턴 학습"""
        # 시간대별 활동 패턴
        hour_activity = defaultdict(float)

        for patterns in daily_patterns.values():
            for hour, count in patterns['peak_hours'].items():
                hour_activity[hour] += count

        # 정규화
        total_activity = sum(hour_activity.values())
        if total_activity > 0:
            self.permanent_patterns['hourly_activity'] = {
                hour: count / total_activity
                for hour, count in hour_activity.items()
            }

        # 감정 패턴
        all_emotions = []
        for patterns in daily_patterns.values():
            all_emotions.extend(patterns['emotional_trend'])

        if all_emotions:
            self.permanent_patterns['emotional_statistics'] = {
                'mean': np.mean(all_emotions),
                'std': np.std(all_emotions),
                'positive_ratio': sum(1 for e in all_emotions if e > 0) / len(all_emotions)
            }

    def _save_persistent_data(self):
        """영구 데이터 저장"""
        data = {
            'schemas': self.schemas,
            'core_knowledge': {
                tid: asdict(trace) for tid, trace in self.core_knowledge.items()
            },
            'user_profiles': dict(self.user_profiles),
            'permanent_patterns': self.permanent_patterns
        }

        with open(self.storage_path / "long_term_memory.json", 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2, default=str)

    def _load_persistent_data(self):
        """영구 데이터 로드"""
        file_path = self.storage_path / "long_term_memory.json"
        if not file_path.exists():
            return

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            self.schemas = data.get('schemas', {})
            self.user_profiles = defaultdict(dict, data.get('user_profiles', {}))
            self.permanent_patterns = data.get('permanent_patterns', {})

            # MemoryTrace 복원
            core_knowledge_data = data.get('core_knowledge', {})
            for tid, trace_data in core_knowledge_data.items():
                # datetime 복원
                if 'timestamp' in trace_data:
                    trace_data['timestamp'] = datetime.fromisoformat(trace_data['timestamp'])
                if 'last_accessed' in trace_data and trace_data['last_accessed']:
                    trace_data['last_accessed'] = datetime.fromisoformat(trace_data['last_accessed'])

                # Enum 복원
                trace_data['memory_type'] = MemoryType(trace_data['memory_type'])
                trace_data['priority'] = MemoryPriority(trace_data['priority'])
                trace_data['tags'] = set(trace_data.get('tags', []))

                self.core_knowledge[tid] = MemoryTrace(**trace_data)

        except Exception as e:
            logging.error(f"Failed to load long-term memory: {e}")

class TemporalMemorySystem:
    """4계층 시간적 메모리 시스템 메인 클래스"""

    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}

        # 4계층 메모리 초기화
        self.ultra_short = UltraShortTermMemory(
            capacity=self.config.get('ultra_short_capacity', 7)
        )
        self.short_term = ShortTermMemory(
            capacity=self.config.get('short_term_capacity', 50)
        )
        self.medium_term = MediumTermMemory(
            capacity=self.config.get('medium_term_capacity', 200)
        )
        self.long_term = LongTermMemory(
            storage_path=self.config.get('storage_path', 'memory/long_term')
        )

        # 백그라운드 통합 프로세스
        self.consolidation_thread = None
        self.running = True

        # 메모리 통계
        self.stats = {
            'total_memories': 0,
            'successful_retrievals': 0,
            'failed_retrievals': 0,
            'consolidations_performed': 0
        }

        self._start_background_consolidation()

    def store_memory(self, content: str, memory_type: MemoryType = MemoryType.EPISODIC,
                    priority: MemoryPriority = MemoryPriority.MEDIUM,
                    session_id: str = "default", emotional_valence: float = 0.0,
                    tags: Optional[Set[str]] = None) -> str:
        """새 메모리 저장"""

        trace = MemoryTrace(
            trace_id=str(uuid.uuid4()),
            content=content,
            memory_type=memory_type,
            priority=priority,
            timestamp=datetime.now(),
            emotional_valence=emotional_valence,
            tags=tags or set()
        )

        # 초단기 메모리에 먼저 저장
        self.ultra_short.add_trace(trace)

        # 단기 메모리에도 저장 (자동 클러스터링)
        self.short_term.add_trace(trace, session_id)

        self.stats['total_memories'] += 1

        return trace.trace_id

    def retrieve_memories(self, query: str, session_id: str = "default",
                         max_results: int = 10, min_relevance: float = 0.1) -> List[Dict]:
        """계층적 메모리 검색"""

        all_results = []

        # 1. 초단기 메모리에서 즉시 컨텍스트 검색
        ultra_short_context = self.ultra_short.get_active_context()
        for trace_id in ultra_short_context:
            if trace_id in self.short_term.traces:
                trace = self.short_term.traces[trace_id]
                relevance = self._calculate_relevance(query, trace)
                if relevance >= min_relevance:
                    all_results.append({
                        'trace': trace,
                        'relevance': relevance,
                        'layer': 'ultra_short',
                        'recency_boost': 0.3
                    })

        # 2. 단기 메모리에서 관련 트레이스 검색
        short_term_traces = self.short_term.get_relevant_traces(query, limit=max_results)
        for trace in short_term_traces:
            relevance = self._calculate_relevance(query, trace)
            if relevance >= min_relevance:
                all_results.append({
                    'trace': trace,
                    'relevance': relevance,
                    'layer': 'short_term',
                    'recency_boost': 0.2
                })

        # 3. 중장기 메모리에서 개념 기반 검색
        medium_term_traces = self._search_medium_term(query, max_results)
        for trace in medium_term_traces:
            relevance = self._calculate_relevance(query, trace)
            if relevance >= min_relevance:
                all_results.append({
                    'trace': trace,
                    'relevance': relevance,
                    'layer': 'medium_term',
                    'recency_boost': 0.1
                })

        # 4. 초장기 메모리에서 핵심 지식 검색
        long_term_traces = self._search_long_term(query, max_results)
        for trace in long_term_traces:
            relevance = self._calculate_relevance(query, trace)
            if relevance >= min_relevance:
                all_results.append({
                    'trace': trace,
                    'relevance': relevance,
                    'layer': 'long_term',
                    'recency_boost': 0.0
                })

        # 결과 통합 및 랭킹
        final_results = self._rank_and_merge_results(all_results, max_results)

        if final_results:
            self.stats['successful_retrievals'] += 1
        else:
            self.stats['failed_retrievals'] += 1

        return final_results

    def _calculate_relevance(self, query: str, trace: MemoryTrace) -> float:
        """쿼리와 트레이스 간 관련성 계산"""
        query_words = set(query.lower().split())
        # Handle case where trace.content might not be a string
        content = trace.content
        if hasattr(content, 'content'):
            content = content.content
        if not isinstance(content, str):
            content = str(content)
        trace_words = set(content.lower().split())

        if not query_words:
            return 0.0

        # 키워드 매칭 점수
        intersection = len(query_words & trace_words)
        union = len(query_words | trace_words)
        keyword_score = intersection / union if union > 0 else 0

        # 메모리 특성 점수
        activation_score = trace.activation_strength
        priority_score = trace.priority.value
        access_score = min(trace.access_count / 10.0, 1.0)

        # 가중 평균
        relevance = (
            keyword_score * 0.4 +
            activation_score * 0.3 +
            priority_score * 0.2 +
            access_score * 0.1
        )

        return relevance

    def _search_medium_term(self, query: str, limit: int) -> List[MemoryTrace]:
        """중장기 메모리 개념 기반 검색"""
        query_words = query.lower().split()
        relevant_traces = []

        # 개념 맵을 통한 검색
        for word in query_words:
            if word in self.medium_term.concept_map:
                trace_ids = self.medium_term.concept_map[word]
                for trace_id in trace_ids:
                    if trace_id in self.medium_term.traces:
                        relevant_traces.append(self.medium_term.traces[trace_id])

        # 중복 제거 및 점수순 정렬
        unique_traces = list(set(relevant_traces))
        scored_traces = [
            (self._calculate_relevance(query, trace), trace)
            for trace in unique_traces
        ]
        scored_traces.sort(key=lambda x: x[0], reverse=True)

        return [trace for _, trace in scored_traces[:limit]]

    def _search_long_term(self, query: str, limit: int) -> List[MemoryTrace]:
        """초장기 메모리 핵심 지식 검색"""
        query_words = set(query.lower().split())
        relevant_traces = []

        for trace in self.long_term.core_knowledge.values():
            # Handle case where content might not be a string
            content = trace.content
            if hasattr(content, 'content'):
                content = content.content
            if not isinstance(content, str):
                content = str(content)
            trace_words = set(content.lower().split())
            if query_words & trace_words:  # 교집합이 있으면
                relevant_traces.append(trace)

        # 점수순 정렬
        scored_traces = [
            (self._calculate_relevance(query, trace), trace)
            for trace in relevant_traces
        ]
        scored_traces.sort(key=lambda x: x[0], reverse=True)

        return [trace for _, trace in scored_traces[:limit]]

    def _rank_and_merge_results(self, all_results: List[Dict], max_results: int) -> List[Dict]:
        """결과 랭킹 및 병합"""
        # 최종 점수 계산 (관련성 + 계층별 가중치 + 최신성)
        for result in all_results:
            trace = result['trace']
            base_relevance = result['relevance']
            recency_boost = result['recency_boost']

            # 시간 기반 감쇄
            hours_ago = (datetime.now() - trace.timestamp).total_seconds() / 3600
            time_decay = max(0.1, 1 - hours_ago / (24 * 7))  # 1주일 기준

            # 최종 점수
            final_score = base_relevance + recency_boost + (time_decay * 0.1)
            result['final_score'] = final_score

        # 점수순 정렬
        all_results.sort(key=lambda x: x['final_score'], reverse=True)

        # 중복 제거 (같은 트레이스 ID)
        seen_ids = set()
        unique_results = []
        for result in all_results:
            trace_id = result['trace'].trace_id
            if trace_id not in seen_ids:
                seen_ids.add(trace_id)
                unique_results.append(result)

        return unique_results[:max_results]

    def _start_background_consolidation(self):
        """백그라운드 통합 프로세스 시작"""
        def consolidation_worker():
            while self.running:
                try:
                    time.sleep(300)  # 5분마다 실행
                    self._perform_consolidation()
                except Exception as e:
                    logging.error(f"Consolidation error: {e}")

        self.consolidation_thread = threading.Thread(
            target=consolidation_worker, daemon=True
        )
        self.consolidation_thread.start()

    def _perform_consolidation(self):
        """메모리 계층간 통합 수행"""
        current_time = datetime.now()

        # 1. 초단기 → 단기 (5분 경과한 메모리)
        self._consolidate_ultra_to_short()

        # 2. 단기 → 중장기 (1시간 경과한 메모리)
        self._consolidate_short_to_medium()

        # 3. 중장기 → 초장기 (1일 경과한 메모리)
        self._consolidate_medium_to_long()

        self.stats['consolidations_performed'] += 1

    def _consolidate_ultra_to_short(self):
        """초단기에서 단기로 통합"""
        current_time = datetime.now()
        expired_traces = []

        for trace_id in list(self.ultra_short.buffer):
            if trace_id in self.short_term.traces:
                trace = self.short_term.traces[trace_id]
                time_diff = current_time - trace.timestamp

                if time_diff.total_seconds() > 300:  # 5분 경과
                    expired_traces.append(trace_id)

        # 만료된 트레이스를 초단기 메모리에서 제거
        for trace_id in expired_traces:
            if trace_id in self.ultra_short.attention_weights:
                del self.ultra_short.attention_weights[trace_id]

        self.ultra_short._update_focus()

    def _consolidate_short_to_medium(self):
        """단기에서 중장기로 통합"""
        current_time = datetime.now()
        consolidation_candidates = {}

        for trace_id, trace in list(self.short_term.traces.items()):
            time_diff = current_time - trace.timestamp

            if time_diff.total_seconds() > 3600:  # 1시간 경과
                consolidation_candidates[trace_id] = trace

        # 중장기 메모리로 통합
        if consolidation_candidates:
            self.medium_term.consolidate_from_short_term(consolidation_candidates)

            # 단기 메모리에서 제거 (중요도가 높은 것은 유지)
            for trace_id, trace in consolidation_candidates.items():
                if trace.priority.value < 0.8:  # 중요도가 낮으면 제거
                    if trace_id in self.short_term.traces:
                        del self.short_term.traces[trace_id]

                    # 클러스터에서도 제거
                    for cluster in self.short_term.clusters.values():
                        if trace_id in cluster.traces:
                            cluster.traces.remove(trace_id)

    def _consolidate_medium_to_long(self):
        """중장기에서 초장기로 통합"""
        current_time = datetime.now()
        consolidation_candidates = {}

        for trace_id, trace in list(self.medium_term.traces.items()):
            time_diff = current_time - trace.timestamp

            if time_diff.total_seconds() > 86400:  # 1일 경과
                consolidation_candidates[trace_id] = trace

        # 초장기 메모리로 통합
        if consolidation_candidates:
            self.long_term.consolidate_from_medium_term(
                consolidation_candidates,
                self.medium_term.daily_patterns
            )

            # 중장기 메모리에서 선택적 제거
            for trace_id, trace in consolidation_candidates.items():
                # 핵심 지식이 아니면 제거
                if not self.long_term._is_core_knowledge(trace):
                    self.medium_term._remove_trace(trace_id)

    def get_memory_stats(self) -> Dict[str, Any]:
        """메모리 시스템 통계"""
        return {
            'layers': {
                'ultra_short': {
                    'capacity': self.ultra_short.capacity,
                    'current_size': len(self.ultra_short.buffer),
                    'current_focus': self.ultra_short.current_focus
                },
                'short_term': {
                    'capacity': self.short_term.capacity,
                    'current_size': len(self.short_term.traces),
                    'clusters': len(self.short_term.clusters)
                },
                'medium_term': {
                    'capacity': self.medium_term.capacity,
                    'current_size': len(self.medium_term.traces),
                    'concepts': len(self.medium_term.concept_map)
                },
                'long_term': {
                    'core_knowledge': len(self.long_term.core_knowledge),
                    'schemas': len(self.long_term.schemas),
                    'user_profiles': len(self.long_term.user_profiles)
                }
            },
            'statistics': self.stats,
            'patterns': self.long_term.permanent_patterns.get('emotional_statistics', {}),
            'activity_patterns': self.long_term.permanent_patterns.get('hourly_activity', {})
        }

    def get_user_profile(self, user_id: str = "default_user") -> Dict[str, Any]:
        """사용자 프로필 조회"""
        return self.long_term.user_profiles.get(user_id, {})

    def shutdown(self):
        """시스템 종료"""
        self.running = False
        if self.consolidation_thread and self.consolidation_thread.is_alive():
            self.consolidation_thread.join(timeout=5)

        # 최종 데이터 저장
        self.long_term._save_persistent_data()

# 전역 인스턴스 (싱글톤 패턴)
_temporal_memory_system = None

def get_temporal_memory_system(config: Optional[Dict] = None) -> TemporalMemorySystem:
    """템포럴 메모리 시스템 싱글톤 인스턴스 반환"""
    global _temporal_memory_system
    if _temporal_memory_system is None:
        _temporal_memory_system = TemporalMemorySystem(config)
    return _temporal_memory_system

def shutdown_temporal_memory():
    """템포럴 메모리 시스템 종료"""
    global _temporal_memory_system
    if _temporal_memory_system:
        _temporal_memory_system.shutdown()
        _temporal_memory_system = None
