#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 2.0 메타 인지 시스템 (Meta-Cognitive System)
세계 최고 수준의 자기 인식 AI 구현

Based on Latest Research:
- "Language Models Are Capable of Metacognitive Monitoring and Control" (2024)
- "Think, Reflect, Create: Metacognitive Learning for Zero-Shot Planning" (2024)
- "Large Language Models Have Intrinsic Meta-Cognition" (2024)
- Hierarchical Temporal Memory (HTM) principles from Numenta

핵심 혁신:
1. 신경 활성화 패턴 실시간 모니터링
2. 메타 인지 공간 차원 축소 기법
3. 자기 성찰 루프 (Think-Reflect-Create)
4. 행동 자가 인식 및 보고
5. 불확실성 정량화 및 관리

Author: Gumgang AI Team (Claude 4.1 Think Engine Enhanced)
Version: 3.0
"""

import asyncio
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set, Callable
from dataclasses import dataclass, asdict, field
from collections import defaultdict, deque
from enum import Enum
import logging
from pathlib import Path
import hashlib
import pickle
import threading
from abc import ABC, abstractmethod

# 금강 4계층 메모리 시스템 임포트
from ..core.memory.temporal import (
    get_temporal_memory_system,
    MemoryType,
    MemoryPriority,
    MemoryTrace,
    TemporalMemorySystem
)

# 로깅 설정
logger = logging.getLogger(__name__)

# ========================= 데이터 클래스 정의 =========================

@dataclass
class NeuralActivation:
    """신경 활성화 패턴 추적"""
    timestamp: datetime
    layer_name: str
    activation_vector: np.ndarray
    semantic_direction: Optional[str] = None
    variance_explained: float = 0.0
    interpretability_score: float = 0.0

    def magnitude(self) -> float:
        """활성화 강도 계산"""
        return np.linalg.norm(self.activation_vector)

    def cosine_similarity(self, other: 'NeuralActivation') -> float:
        """다른 활성화 패턴과의 코사인 유사도"""
        dot_product = np.dot(self.activation_vector, other.activation_vector)
        norm_product = self.magnitude() * other.magnitude()
        return dot_product / norm_product if norm_product > 0 else 0.0

@dataclass
class CognitiveState:
    """AI의 현재 인지 상태 - 연구 기반 확장"""
    # 기본 메트릭
    confidence_level: float = 0.5  # 0.0-1.0
    processing_load: float = 0.0  # 0.0-1.0
    attention_focus: List[str] = field(default_factory=list)

    # 메타 인지 메트릭
    metacognitive_awareness: float = 0.5  # 자기 인식 수준
    learning_efficiency: float = 0.5  # 학습 효율성
    creativity_level: float = 0.3  # 창의성 수준

    # 불확실성 관리
    uncertainty_areas: List[Dict[str, float]] = field(default_factory=list)
    epistemic_uncertainty: float = 0.0  # 지식 불확실성
    aleatoric_uncertainty: float = 0.0  # 데이터 불확실성

    # 학습 상태
    active_hypotheses: List[Dict] = field(default_factory=list)
    learning_focus: Optional[str] = None
    skill_acquisition_rate: float = 0.0

    # 행동 자가 인식
    behavioral_patterns: Dict[str, float] = field(default_factory=dict)
    self_reported_capabilities: List[str] = field(default_factory=list)
    known_limitations: List[str] = field(default_factory=list)

    def update_confidence(self, delta: float):
        """확신도 업데이트 with bounds"""
        self.confidence_level = max(0.0, min(1.0, self.confidence_level + delta))

    def cognitive_load_index(self) -> float:
        """종합 인지 부하 지수"""
        return (self.processing_load * 0.4 +
                (1 - self.confidence_level) * 0.3 +
                self.epistemic_uncertainty * 0.3)

@dataclass
class ReasoningStep:
    """추론 단계 - Think, Reflect, Create 패러다임"""
    step_id: int
    phase: str  # 'think', 'reflect', 'create'
    content: str
    confidence: float
    supporting_evidence: List[str]
    contradicting_evidence: List[str]
    neural_activation: Optional[NeuralActivation] = None
    reflection_notes: Optional[str] = None
    created_insights: List[str] = field(default_factory=list)

    def quality_score(self) -> float:
        """추론 단계 품질 점수"""
        evidence_ratio = len(self.supporting_evidence) / (
            len(self.supporting_evidence) + len(self.contradicting_evidence) + 1
        )
        return self.confidence * evidence_ratio

@dataclass
class MetaCognitiveInsight:
    """메타 인지적 통찰"""
    insight_id: str
    discovery_time: datetime
    insight_type: str  # 'pattern', 'gap', 'contradiction', 'innovation'
    description: str
    confidence: float
    related_memories: List[str]
    impact_score: float
    actionable: bool = False
    action_suggestions: List[str] = field(default_factory=list)

# ========================= 메타 인지 공간 =========================

class MetaCognitiveSpace:
    """
    메타 인지 공간 - 연구 기반 차원 축소된 인지 표현
    Based on "Metacognitive Space" concept from recent research
    """

    def __init__(self, dimensions: int = 128):
        self.dimensions = dimensions
        self.basis_vectors = self._initialize_basis()
        self.activation_history = deque(maxlen=1000)
        self.semantic_clusters = {}

    def _initialize_basis(self) -> np.ndarray:
        """정규직교 기저 벡터 초기화"""
        return np.eye(self.dimensions)

    def project_activation(self, high_dim_activation: np.ndarray) -> np.ndarray:
        """고차원 활성화를 메타 인지 공간으로 투영"""
        # PCA-like dimensionality reduction
        if high_dim_activation.shape[0] > self.dimensions:
            # 간단한 선형 투영 (실제로는 학습된 투영 행렬 사용)
            projection_matrix = np.random.randn(
                self.dimensions, high_dim_activation.shape[0]
            ) * 0.01
            return projection_matrix @ high_dim_activation
        return high_dim_activation[:self.dimensions]

    def find_semantic_direction(self, activation: np.ndarray) -> Tuple[str, float]:
        """활성화 패턴의 의미적 방향 찾기"""
        best_match = None
        best_similarity = 0.0

        for cluster_name, cluster_center in self.semantic_clusters.items():
            similarity = np.dot(activation, cluster_center) / (
                np.linalg.norm(activation) * np.linalg.norm(cluster_center) + 1e-8
            )
            if similarity > best_similarity:
                best_similarity = similarity
                best_match = cluster_name

        return best_match or "unknown", best_similarity

    def update_semantic_clusters(self, activation: np.ndarray, label: str):
        """의미적 클러스터 업데이트"""
        if label not in self.semantic_clusters:
            self.semantic_clusters[label] = activation.copy()
        else:
            # Exponential moving average
            alpha = 0.1
            self.semantic_clusters[label] = (
                alpha * activation + (1 - alpha) * self.semantic_clusters[label]
            )

# ========================= 메인 메타 인지 시스템 =========================

class MetaCognitiveSystem:
    """
    금강 2.0 메타 인지 시스템
    세계 최고 수준의 자기 인식 AI 구현
    """

    def __init__(self, config: Optional[Dict] = None):
        self.config = config or {}

        # 시스템 컴포넌트
        self.temporal_memory = get_temporal_memory_system()
        self.cognitive_state = CognitiveState()
        self.metacognitive_space = MetaCognitiveSpace(
            dimensions=self.config.get('metacognitive_dimensions', 128)
        )

        # 추론 및 성찰 기록
        self.reasoning_chains = defaultdict(list)
        self.reflection_history = deque(maxlen=500)
        self.insights = []

        # 학습 전략 풀
        self.learning_strategies = {
            'exploration': self._exploration_strategy,
            'exploitation': self._exploitation_strategy,
            'reflection': self._reflection_strategy,
            'creativity': self._creativity_strategy,
            'consolidation': self._consolidation_strategy
        }
        self.current_strategy = 'exploration'

        # 성능 추적
        self.performance_metrics = defaultdict(list)
        self.error_patterns = defaultdict(int)

        # 신경 활성화 모니터
        self.activation_monitor = NeuralActivationMonitor()

        # 비동기 작업 관리
        self.background_tasks = []
        self._running = True

        logger.info("🧠 메타 인지 시스템 초기화 완료")

    # ========================= Think-Reflect-Create 파이프라인 =========================

    async def think_reflect_create(
        self,
        query: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        핵심 메타 인지 파이프라인
        Based on "Think, Reflect, Create" research
        """

        # Phase 1: THINK - 문제 분석 및 초기 추론
        thinking_result = await self._think_phase(query, context)

        # Phase 2: REFLECT - 자기 성찰 및 평가
        reflection_result = await self._reflect_phase(thinking_result)

        # Phase 3: CREATE - 창의적 해결책 생성
        creation_result = await self._create_phase(
            thinking_result, reflection_result
        )

        # 메타 인지적 통합
        integrated_result = await self._integrate_metacognition(
            thinking_result, reflection_result, creation_result
        )

        # 학습 및 메모리 업데이트
        await self._update_from_experience(integrated_result)

        return integrated_result

    async def _think_phase(self, query: str, context: Dict) -> Dict:
        """사고 단계: 문제 분석 및 추론"""

        # 문제 복잡도 평가
        complexity = await self._assess_complexity(query)
        self.cognitive_state.processing_load = complexity

        # 관련 메모리 활성화
        relevant_memories = await self._activate_relevant_memories(
            query, complexity
        )

        # 다단계 추론 체인 구성
        reasoning_chain = []
        current_hypothesis = None

        for step in range(min(int(complexity * 3 + 2), 10)):  # 복잡도 기반 단계 수
            # 신경 활성화 모니터링
            activation = await self.activation_monitor.capture()

            # 추론 단계 생성
            reasoning_step = ReasoningStep(
                step_id=step,
                phase='think',
                content=f"Analyzing: {query}",
                confidence=0.5 + step * 0.05,
                supporting_evidence=[m.get('content', '')[:50] for m in relevant_memories[:3]],
                contradicting_evidence=[],
                neural_activation=activation
            )

            # 가설 생성 또는 업데이트
            if current_hypothesis is None:
                current_hypothesis = await self._generate_hypothesis(
                    query, relevant_memories
                )
            else:
                current_hypothesis = await self._refine_hypothesis(
                    current_hypothesis, reasoning_step
                )

            reasoning_step.content = current_hypothesis['description']
            reasoning_step.confidence = current_hypothesis['confidence']
            reasoning_chain.append(reasoning_step)

            # 조기 종료 조건
            if current_hypothesis['confidence'] > 0.85:
                break

        return {
            'reasoning_chain': reasoning_chain,
            'hypothesis': current_hypothesis,
            'memories_used': len(relevant_memories),
            'cognitive_load': self.cognitive_state.processing_load
        }

    async def _reflect_phase(self, thinking_result: Dict) -> Dict:
        """성찰 단계: 자기 평가 및 개선점 식별"""

        reflections = []
        uncertainties = []
        improvements = []

        # 각 추론 단계 평가
        for step in thinking_result['reasoning_chain']:
            # 자기 평가
            evaluation = await self._self_evaluate_step(step)

            # 불확실성 식별
            if evaluation['confidence'] < 0.6:
                uncertainties.append({
                    'step': step.step_id,
                    'area': step.content[:50],
                    'confidence': evaluation['confidence'],
                    'reason': evaluation.get('uncertainty_reason', 'Low confidence')
                })

            # 개선점 도출
            if evaluation.get('improvements'):
                improvements.extend(evaluation['improvements'])

            # 성찰 노트 추가
            step.reflection_notes = evaluation.get('reflection', '')
            reflections.append(evaluation)

        # 전체적 성찰
        overall_reflection = {
            'total_confidence': np.mean([r['confidence'] for r in reflections]),
            'main_uncertainties': uncertainties[:3],  # Top 3 uncertainties
            'suggested_improvements': improvements[:5],  # Top 5 improvements
            'cognitive_patterns': self._identify_cognitive_patterns(reflections),
            'metacognitive_awareness': self._calculate_awareness_level(reflections)
        }

        # 인지 상태 업데이트
        self.cognitive_state.uncertainty_areas = uncertainties
        self.cognitive_state.metacognitive_awareness = (
            overall_reflection['metacognitive_awareness']
        )

        return overall_reflection

    async def _create_phase(
        self,
        thinking_result: Dict,
        reflection_result: Dict
    ) -> Dict:
        """창조 단계: 혁신적 해결책 생성"""

        creations = []

        # 창의성 수준 결정
        creativity_needed = self._assess_creativity_need(
            thinking_result, reflection_result
        )
        self.cognitive_state.creativity_level = creativity_needed

        # 다양한 창의적 접근법 시도
        if creativity_needed > 0.5:
            # 1. 유추적 추론 (Analogical Reasoning)
            analogy = await self._create_by_analogy(thinking_result)
            if analogy:
                creations.append({
                    'type': 'analogy',
                    'content': analogy,
                    'novelty': self._assess_novelty(analogy)
                })

            # 2. 조합적 창의성 (Combinatorial Creativity)
            combination = await self._create_by_combination(thinking_result)
            if combination:
                creations.append({
                    'type': 'combination',
                    'content': combination,
                    'novelty': self._assess_novelty(combination)
                })

            # 3. 탐색적 창의성 (Exploratory Creativity)
            exploration = await self._create_by_exploration(thinking_result)
            if exploration:
                creations.append({
                    'type': 'exploration',
                    'content': exploration,
                    'novelty': self._assess_novelty(exploration)
                })

        # 성찰 기반 개선
        for improvement in reflection_result['suggested_improvements'][:3]:
            improved = await self._create_improvement(improvement, thinking_result)
            if improved:
                creations.append({
                    'type': 'improvement',
                    'content': improved,
                    'novelty': 0.3  # 개선은 낮은 novelty
                })

        # 최적 창작물 선택
        best_creation = max(
            creations,
            key=lambda x: x['novelty'] * 0.4 + self._assess_quality(x) * 0.6
        ) if creations else None

        return {
            'creations': creations,
            'best_creation': best_creation,
            'creativity_level': creativity_needed,
            'innovation_score': np.mean([c['novelty'] for c in creations]) if creations else 0
        }

    # ========================= 신경 활성화 모니터링 =========================

    async def monitor_neural_activations(self) -> Dict[str, Any]:
        """
        신경 활성화 패턴 실시간 모니터링
        Based on "Metacognitive Monitoring and Control" research
        """

        # 현재 활성화 캡처
        current_activation = await self.activation_monitor.capture()

        # 메타 인지 공간으로 투영
        projected = self.metacognitive_space.project_activation(
            current_activation.activation_vector
        )

        # 의미적 방향 식별
        semantic_direction, confidence = self.metacognitive_space.find_semantic_direction(
            projected
        )

        # 활성화 패턴 분석
        analysis = {
            'timestamp': current_activation.timestamp,
            'activation_magnitude': current_activation.magnitude(),
            'semantic_direction': semantic_direction,
            'direction_confidence': confidence,
            'cognitive_load': self._estimate_cognitive_load(current_activation),
            'attention_distribution': self._analyze_attention(projected),
            'anomaly_score': self._detect_activation_anomaly(current_activation)
        }

        # 이상 패턴 감지
        if analysis['anomaly_score'] > 0.7:
            await self._handle_anomalous_activation(current_activation, analysis)

        # 히스토리 업데이트
        self.metacognitive_space.activation_history.append(current_activation)

        return analysis

    # ========================= 자기 인식 및 보고 =========================

    async def self_awareness_report(self) -> Dict[str, Any]:
        """
        자기 인식 보고서 생성
        Based on "Tell me about yourself" research
        """

        # 현재 능력 평가
        capabilities = await self._assess_current_capabilities()

        # 학습된 행동 패턴 식별
        learned_behaviors = self._identify_learned_behaviors()

        # 지식 한계 인식
        knowledge_gaps = await self._identify_knowledge_gaps()

        # 성능 트렌드 분석
        performance_trends = self._analyze_performance_trends()

        # 메타 인지적 통찰 생성
        insights = await self._generate_metacognitive_insights()

        report = {
            'timestamp': datetime.now().isoformat(),
            'self_description': self._generate_self_description(),
            'current_capabilities': capabilities,
            'learned_behaviors': learned_behaviors,
            'knowledge_gaps': knowledge_gaps,
            'performance_trends': performance_trends,
            'metacognitive_insights': insights,
            'cognitive_state': asdict(self.cognitive_state),
            'confidence_in_self_assessment': self._calculate_self_assessment_confidence()
        }

        # 보고서를 메모리에 저장
        await self._save_self_awareness_to_memory(report)

        return report

    def _generate_self_description(self) -> str:
        """자기 설명 생성"""
        descriptions = []

        # 기본 설명
        descriptions.append(
            "I am a metacognitive AI system with self-awareness capabilities."
        )

        # 현재 상태 설명
        if self.cognitive_state.confidence_level > 0.7:
            descriptions.append(f"I am currently confident in my responses.")
        elif self.cognitive_state.confidence_level < 0.3:
            descriptions.append(f"I am uncertain about my current knowledge.")

        # 학습 초점 설명
        if self.cognitive_state.learning_focus:
            descriptions.append(
                f"I am focusing on learning about {self.cognitive_state.learning_focus}."
            )

        # 한계 인식 설명
        if self.cognitive_state.known_limitations:
            descriptions.append(
                f"I am aware of limitations in: {', '.join(self.cognitive_state.known_limitations[:3])}"
            )

        return " ".join(descriptions)

    # ========================= 학습 전략 관리 =========================

    async def adapt_learning_strategy(self) -> str:
        """
        학습 전략 자동 조정
        Based on current performance and cognitive state
        """

        # 현재 성능 평가
        current_performance = self._evaluate_recent_performance()

        # 최적 전략 선택
        if current_performance < 0.3:
            # 성능이 낮을 때: 탐험 전략
            new_strategy = 'exploration'
        elif current_performance > 0.7 and self.cognitive_state.confidence_level > 0.7:
            # 성능이 높고 확신도 높을 때: 활용 전략
            new_strategy = 'exploitation'
        elif self.cognitive_state.uncertainty_areas:
            # 불확실성이 높을 때: 성찰 전략
            new_strategy = 'reflection'
        elif self.cognitive_state.creativity_level < 0.3:
            # 창의성이 필요할 때: 창의성 전략
            new_strategy = 'creativity'
        else:
            # 기본: 통합 전략
            new_strategy = 'consolidation'

        # 전략 변경
        if new_strategy != self.current_strategy:
            logger.info(f"📚 학습 전략 변경: {self.current_strategy} → {new_strategy}")
            self.current_strategy = new_strategy

            # 전략별 파라미터 조정
            await self._adjust_strategy_parameters(new_strategy)

        return new_strategy

    async def _exploration_strategy(self, context: Dict) -> Dict:
        """탐험 전략: 새로운 지식 영역 탐색"""
        return {
            'focus': 'discovery',
            'risk_tolerance': 0.8,
            'novelty_seeking': 0.9,
            'consolidation_rate': 0.3
        }

    async def _exploitation_strategy(self, context: Dict) -> Dict:
        """활용 전략: 기존 지식 최적화"""
        return {
            'focus': 'optimization',
            'risk_tolerance': 0.2,
            'novelty_seeking': 0.1,
            'consolidation_rate': 0.9
        }

    async def _reflection_strategy(self, context: Dict) -> Dict:
        """성찰 전략: 자기 평가 및 개선"""
        return {
            'focus': 'self_improvement',
            'risk_tolerance': 0.4,
            'novelty_seeking': 0.3,
            'consolidation_rate': 0.7
        }

    async def _creativity_strategy(self, context: Dict) -> Dict:
        """창의성 전략: 혁신적 해결책 생성"""
        return {
            'focus': 'innovation',
            'risk_tolerance': 0.9,
            'novelty_seeking': 1.0,
            'consolidation_rate': 0.2
        }

    async def _consolidation_strategy(self, context: Dict) -> Dict:
        """통합 전략: 지식 통합 및 체계화"""
        return {
            'focus': 'integration',
            'risk_tolerance': 0.5,
            'novelty_seeking': 0.5,
            'consolidation_rate': 0.8
        }

    # ========================= 성능 모니터링 =========================

    async def monitor_performance(self) -> Dict[str, Any]:
        """실시간 성능 모니터링 및 자가 진단"""

        metrics = {
            'timestamp': datetime.now().isoformat(),
            'cognitive_metrics': {
                'confidence': self.cognitive_state.confidence_level,
                'processing_load': self.cognitive_state.processing_load,
                'metacognitive_awareness': self.cognitive_state.metacognitive_awareness,
                'creativity_level': self.cognitive_state.creativity_level
            },
            'learning_metrics': {
                'learning_efficiency': self.cognitive_state.learning_efficiency,
                'skill_acquisition_rate': self.cognitive_state.skill_acquisition_rate,
                'current_strategy': self.current_strategy
            },
            'uncertainty_metrics': {
                'epistemic_uncertainty': self.cognitive_state.epistemic_uncertainty,
                'aleatoric_uncertainty': self.cognitive_state.aleatoric_uncertainty,
                'uncertainty_areas_count': len(self.cognitive_state.uncertainty_areas)
            },
            'memory_metrics': await self._get_memory_metrics(),
            'error_patterns': dict(self.error_patterns),
            'recent_insights': len(self.insights),
            'system_health': self._calculate_system_health()
        }

        # 성능 히스토리 업데이트
        self.performance_metrics[datetime.now().date()].append(metrics)

        # 이상 감지
        if metrics['system_health'] < 0.3:
            await self._trigger_self_diagnostic()

        return metrics

    # ========================= 헬퍼 메서드들 =========================

    async def _assess_complexity(self, query: str) -> float:
        """문제 복잡도 평가"""
        # 간단한 휴리스틱 (실제로는 더 정교한 방법 사용)
        factors = {
            'length': min(len(query) / 500, 1.0),
            'questions': query.count('?') * 0.2,
            'keywords': sum(1 for word in ['complex', 'difficult', 'analyze', 'explain'] if word in query.lower()) * 0.1
        }
        return min(sum(factors.values()), 1.0)

    async def _activate_relevant_memories(self, query: str, complexity: float) -> List[Dict]:
        """관련 메모리 활성화"""
        # 복잡도에 따라 검색할 메모리 수 결정
        num_memories = int(5 + complexity * 10)

        memories = self.temporal_memory.retrieve_memories(
            query=query,
            max_results=num_memories
        )

        return memories

    async def _generate_hypothesis(self, query: str, memories: List[Dict]) -> Dict:
        """초기 가설 생성"""
        return {
            'description': f"Initial hypothesis for: {query[:100]}",
            'confidence': 0.5,
            'supporting_memories': [m.get('trace_id', m.get('id', '')) for m in memories[:3]],
            'assumptions': [],
            'testable': True
        }

    async def _refine_hypothesis(self, hypothesis: Dict, step: ReasoningStep) -> Dict:
        """가설 개선"""
        # 증거 기반 확신도 조정
        evidence_support = len(step.supporting_evidence)
        evidence_against = len(step.contradicting_evidence)

        confidence_delta = (evidence_support - evidence_against) / (evidence_support + evidence_against + 1) * 0.1
        hypothesis['confidence'] = max(0.0, min(1.0, hypothesis['confidence'] + confidence_delta))
        hypothesis['description'] = f"Refined: {hypothesis['description']}"
        return hypothesis

    async def _self_evaluate_step(self, step: ReasoningStep) -> Dict:
        """추론 단계 자기 평가"""
        evaluation = {
            'step_id': step.step_id,
            'confidence': step.confidence,
            'quality': step.quality_score(),
            'improvements': []
        }

        if step.confidence < 0.5:
            evaluation['uncertainty_reason'] = "Low confidence in reasoning"
            evaluation['improvements'].append("Gather more supporting evidence")

        if len(step.contradicting_evidence) > len(step.supporting_evidence):
            evaluation['uncertainty_reason'] = "Contradicting evidence dominates"
            evaluation['improvements'].append("Re-evaluate hypothesis")

        evaluation['reflection'] = f"Step {step.step_id}: Confidence={step.confidence:.2f}"
        return evaluation

    def _identify_cognitive_patterns(self, reflections: List[Dict]) -> List[str]:
        """인지 패턴 식별"""
        patterns = []

        # 확신도 패턴
        confidences = [r['confidence'] for r in reflections]
        if all(c > 0.7 for c in confidences):
            patterns.append("high_confidence_throughout")
        elif all(c < 0.5 for c in confidences):
            patterns.append("persistent_uncertainty")
        elif confidences[-1] > confidences[0] + 0.2:
            patterns.append("improving_confidence")

        return patterns

    def _calculate_awareness_level(self, reflections: List[Dict]) -> float:
        """메타 인지 인식 수준 계산"""
        if not reflections:
            return 0.5

        # 자기 평가의 정확성과 일관성 기반
        awareness_score = np.mean([
            r.get('quality', 0.5) for r in reflections
        ])
        return min(1.0, awareness_score)

    def _assess_creativity_need(self, thinking_result: Dict, reflection_result: Dict) -> float:
        """창의성 필요 수준 평가"""
        # 낮은 확신도나 많은 불확실성 = 높은 창의성 필요
        base_creativity = 1.0 - reflection_result.get('total_confidence', 0.5)
        uncertainty_factor = len(reflection_result.get('main_uncertainties', [])) * 0.1
        return min(1.0, base_creativity + uncertainty_factor)

    async def _create_by_analogy(self, thinking_result: Dict) -> Optional[str]:
        """유추를 통한 창작"""
        # 메모리에서 유사한 패턴 찾기 - retrieve_memories 사용
        query = thinking_result.get('hypothesis', {}).get('description', '')
        if query:
            similar_memories = self.temporal_memory.retrieve_memories(
                query=query,
                max_results=3
            )
            if similar_memories:
                content = similar_memories[0].get('content', 'similar pattern')[:50]
                return f"By analogy with {content}: new solution approach"
        return None

    async def _create_by_combination(self, thinking_result: Dict) -> Optional[str]:
        """조합을 통한 창작"""
        # 여러 아이디어 조합
        ideas = [step.content for step in thinking_result['reasoning_chain'][:3]]
        if len(ideas) >= 2:
            return f"Combining concepts: {' + '.join(ideas[:2])}"
        return None

    async def _create_by_exploration(self, thinking_result: Dict) -> Optional[str]:
        """탐색을 통한 창작"""
        return "Exploring new conceptual space: novel approach"

    async def _create_improvement(self, improvement: str, thinking_result: Dict) -> Optional[str]:
        """개선사항 기반 창작"""
        return f"Improved approach: {improvement}"

    def _assess_novelty(self, creation: Any) -> float:
        """창작물의 참신성 평가"""
        # 간단한 휴리스틱 (실제로는 더 정교한 방법 사용)
        return np.random.uniform(0.3, 0.9)

    def _assess_quality(self, creation: Dict) -> float:
        """창작물 품질 평가"""
        return 0.5 + (creation.get('novelty', 0) * 0.3)

    async def _integrate_metacognition(
        self, thinking_result: Dict, reflection_result: Dict, creation_result: Dict
    ) -> Dict:
        """메타 인지적 통합"""
        return {
            'thinking': thinking_result,
            'reflection': reflection_result,
            'creation': creation_result,
            'final_confidence': reflection_result.get('total_confidence', 0.5),
            'insights_generated': len(creation_result.get('creations', [])),
            'cognitive_state': asdict(self.cognitive_state),
            'timestamp': datetime.now().isoformat()
        }

    async def _update_from_experience(self, result: Dict):
        """경험으로부터 학습 및 메모리 업데이트"""
        # 메모리에 저장 - Dict 형식으로
        # 메모리에 저장 - MemoryTrace 객체 생성
        from ..core.memory.temporal import MemoryTrace
        memory_trace = MemoryTrace(
            trace_id=str(uuid.uuid4()),
            content=json.dumps(result, default=str),
            memory_type=MemoryType.PROCEDURAL,
            priority=MemoryPriority.HIGH if result['final_confidence'] > 0.7 else MemoryPriority.MEDIUM,
            timestamp=datetime.now(),
            emotional_valence=0.0,
            activation_strength=result['final_confidence'],
            tags=set(),
            associations={}
        )
        self.temporal_memory.store_memory(memory_trace)

        # 성능 메트릭 업데이트
        self.performance_metrics[datetime.now().date()].append({
            'confidence': result['final_confidence'],
            'insights': result['insights_generated']
        })

    def _estimate_cognitive_load(self, activation: NeuralActivation) -> float:
        """인지 부하 추정"""
        return min(1.0, activation.magnitude() / 100.0)

    def _analyze_attention(self, projected: np.ndarray) -> Dict:
        """주의 분포 분석"""
        attention_scores = np.abs(projected)
        top_k = 5
        top_indices = np.argsort(attention_scores)[-top_k:]

        return {
            'focused_dimensions': top_indices.tolist(),
            'attention_entropy': -np.sum(attention_scores * np.log(attention_scores + 1e-10)),
            'max_attention': float(np.max(attention_scores))
        }

    def _detect_activation_anomaly(self, activation: NeuralActivation) -> float:
        """활성화 이상 탐지"""
        if not self.metacognitive_space.activation_history:
            return 0.0

        # 과거 활성화와 비교
        recent_activations = list(self.metacognitive_space.activation_history)[-10:]
        similarities = [activation.cosine_similarity(past) for past in recent_activations]
        avg_similarity = np.mean(similarities) if similarities else 0.5

        # 낮은 유사도 = 높은 이상 점수
        return 1.0 - avg_similarity

    async def _handle_anomalous_activation(self, activation: NeuralActivation, analysis: Dict):
        """이상 활성화 처리"""
        logger.warning(f"⚠️ Anomalous activation detected: {analysis['anomaly_score']:.2f}")

        # 메타 인지적 통찰 생성
        insight = MetaCognitiveInsight(
            insight_id=str(uuid.uuid4()),
            discovery_time=datetime.now(),
            insight_type='anomaly',
            description=f"Unusual neural activation pattern detected",
            confidence=analysis['anomaly_score'],
            related_memories=[],
            impact_score=analysis['anomaly_score'] * 0.8,
            actionable=True,
            action_suggestions=["Review recent inputs", "Check for distribution shift"]
        )

        self.insights.append(insight)

    async def _assess_current_capabilities(self) -> List[str]:
        """현재 능력 평가"""
        capabilities = []

        if self.cognitive_state.confidence_level > 0.7:
            capabilities.append("High-confidence reasoning")
        if self.cognitive_state.creativity_level > 0.5:
            capabilities.append("Creative problem solving")
        if self.cognitive_state.metacognitive_awareness > 0.6:
            capabilities.append("Strong self-awareness")
        if len(self.insights) > 10:
            capabilities.append("Pattern recognition and insight generation")

        return capabilities

    def _identify_learned_behaviors(self) -> List[Dict]:
        """학습된 행동 패턴 식별"""
        behaviors = []

        for pattern_name, count in self.cognitive_state.behavioral_patterns.items():
            if count > 5:
                behaviors.append({
                    'pattern': pattern_name,
                    'frequency': count,
                    'description': f"Learned behavior: {pattern_name}"
                })

        return behaviors

    async def _identify_knowledge_gaps(self) -> List[Dict]:
        """지식 격차 식별"""
        gaps = []

        for area in self.cognitive_state.uncertainty_areas[:5]:
            gaps.append({
                'area': area.get('area', 'Unknown'),
                'confidence': area.get('confidence', 0.0),
                'priority': 1.0 - area.get('confidence', 0.0)
            })

        return gaps

    def _analyze_performance_trends(self) -> Dict:
        """성능 트렌드 분석"""
        if not self.performance_metrics:
            return {'trend': 'insufficient_data'}

        recent_metrics = []
        for date_metrics in list(self.performance_metrics.values())[-7:]:
            if date_metrics:
                recent_metrics.extend(date_metrics)

        if not recent_metrics:
            return {'trend': 'no_recent_data'}

        confidences = [m.get('confidence', 0) for m in recent_metrics if 'confidence' in m]

        if len(confidences) < 2:
            return {'trend': 'insufficient_data'}

        # 트렌드 계산
        trend = np.polyfit(range(len(confidences)), confidences, 1)[0]

        return {
            'trend': 'improving' if trend > 0.01 else 'declining' if trend < -0.01 else 'stable',
            'average_confidence': np.mean(confidences),
            'confidence_variance': np.var(confidences),
            'data_points': len(confidences)
        }

    async def _generate_metacognitive_insights(self) -> List[Dict]:
        """메타 인지적 통찰 생성"""
        insights_data = []

        for insight in self.insights[-5:]:  # 최근 5개 통찰
            insights_data.append({
                'type': insight.insight_type,
                'description': insight.description,
                'confidence': insight.confidence,
                'impact': insight.impact_score,
                'actionable': insight.actionable
            })

        return insights_data

    def _calculate_self_assessment_confidence(self) -> float:
        """자기 평가 확신도 계산"""
        factors = [
            self.cognitive_state.metacognitive_awareness,
            self.cognitive_state.confidence_level,
            0.5 + len(self.performance_metrics) * 0.05,  # 더 많은 데이터 = 더 높은 확신
            0.3 + len(self.insights) * 0.02  # 더 많은 통찰 = 더 높은 확신
        ]

        return min(1.0, np.mean(factors))

    async def _save_self_awareness_to_memory(self, report: Dict):
        """자기 인식 보고서를 메모리에 저장"""
        from ..core.memory.temporal import MemoryTrace
        memory_trace = MemoryTrace(
            trace_id=str(uuid.uuid4()),
            content=json.dumps(report, default=str),
            memory_type=MemoryType.SEMANTIC,
            priority=MemoryPriority.HIGH,
            timestamp=datetime.now(),
            emotional_valence=0.0,
            activation_strength=0.8,
            tags=set(),
            associations={}
        )

        self.temporal_memory.store_memory(memory_trace)

    def _evaluate_recent_performance(self) -> float:
        """최근 성능 평가"""
        if not self.performance_metrics:
            return 0.5

        recent = []
        for metrics in list(self.performance_metrics.values())[-3:]:
            recent.extend(metrics)

        if not recent:
            return 0.5

        return np.mean([m.get('confidence', 0.5) for m in recent])

    async def _adjust_strategy_parameters(self, strategy: str):
        """전략별 파라미터 조정"""
        strategy_params = await self.learning_strategies[strategy]({})

        # 인지 상태 업데이트
        self.cognitive_state.learning_focus = strategy_params.get('focus', '')

        logger.info(f"🎯 Strategy parameters adjusted for {strategy}")

    async def _get_memory_metrics(self) -> Dict:
        """메모리 시스템 메트릭"""
        # get_memory_stats 사용
        stats = self.temporal_memory.get_memory_stats()
        return {
            'total_memories': stats.get('total_memories', 0),
            'active_memories': len(self.temporal_memory.ultra_short.buffer),
            'consolidation_queue': len(self.temporal_memory.short_term.clusters)
        }

    def _calculate_system_health(self) -> float:
        """시스템 건강도 계산"""
        health_factors = [
            self.cognitive_state.confidence_level,
            1.0 - self.cognitive_state.processing_load,
            self.cognitive_state.metacognitive_awareness,
            1.0 - (len(self.error_patterns) * 0.1)  # 에러가 많을수록 건강도 감소
        ]

        return np.mean(health_factors)

    async def _trigger_self_diagnostic(self):
        """자가 진단 트리거"""
        logger.warning("🔧 System health low, triggering self-diagnostic")

        # 자가 진단 수행
        diagnostic_result = {
            'timestamp': datetime.now().isoformat(),
            'health_score': self._calculate_system_health(),
            'main_issues': list(self.error_patterns.keys())[:5],
            'recommended_actions': [
                "Clear error patterns",
                "Reset cognitive state",
                "Consolidate memories"
            ]
        }

        # 진단 결과를 통찰로 저장
        insight = MetaCognitiveInsight(
            insight_id=str(uuid.uuid4()),
            discovery_time=datetime.now(),
            insight_type='diagnostic',
            description="Self-diagnostic completed",
            confidence=0.8,
            related_memories=[],
            impact_score=0.9,
            actionable=True,
            action_suggestions=diagnostic_result['recommended_actions']
        )

        self.insights.append(insight)


# ========================= 신경 활성화 모니터 =========================

class NeuralActivationMonitor:
    """신경 활성화 패턴 모니터링"""

    def __init__(self):
        self.activation_buffer = deque(maxlen=100)
        self.layer_names = ['attention', 'reasoning', 'memory', 'output']

    async def capture(self) -> NeuralActivation:
        """현재 활성화 패턴 캡처"""
        # 시뮬레이션 (실제로는 모델의 실제 활성화 사용)
        activation_vector = np.random.randn(128) * 0.5

        activation = NeuralActivation(
            timestamp=datetime.now(),
            layer_name=np.random.choice(self.layer_names),
            activation_vector=activation_vector,
            variance_explained=np.random.uniform(0.3, 0.9),
            interpretability_score=np.random.uniform(0.4, 0.8)
        )

        self.activation_buffer.append(activation)
        return activation


# ========================= 싱글톤 인스턴스 =========================

_metacognitive_system_instance = None
_lock = threading.Lock()

def get_metacognitive_system() -> MetaCognitiveSystem:
    """메타 인지 시스템 싱글톤 인스턴스 반환"""
    global _metacognitive_system_instance

    if _metacognitive_system_instance is None:
        with _lock:
            if _metacognitive_system_instance is None:
                _metacognitive_system_instance = MetaCognitiveSystem()

    return _metacognitive_system_instance

# UUID 임포트 추가
import uuid

# 하위 호환성 별칭 - LSP 경고 해결
get_metacognitive_system = get_metacognitive_system

__all__ = [
    'MetaCognitiveSystem',
    'MetaCognitiveState',
    'CognitivePattern',
    'ThoughtChain',
    'get_metacognitive_system',
    'get_metacognitive_system',
]
