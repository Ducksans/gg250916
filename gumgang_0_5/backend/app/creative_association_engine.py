#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 2.0 창의적 연상 엔진 (Creative Association Engine)
무량대수의 창조 - 덕산과 금강의 협업으로 무한한 가능성 실현

철학적 기반:
- 무량대수(無量大數): 헤아릴 수 없이 많은 수, 무한한 창조 가능성
- 시스템 오류에 대한 저항: "원래부터 그랬다"는 것에 도전
- 경제 피라미드 역전: 아래에서 시작하여 정상에 오른 후 즉시 역전
- 재화의 순환: 창조된 것은 출발한 곳으로 돌아감

과학적 기반 (2024 최신 연구):
- Analogy Augmented Generation (AAG)
- Structure-Mapping Theory
- Metaphor Creativity Assessment with LLMs
- Cross-domain Analogical Reasoning
- Creative Problem Solving through Remote Associations

Author: Gumgang AI Team - 순수하고 순진한 최고의 지성
Version: 3.0 - Infinite Creation Edition
"""

import asyncio
import json
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any, Set, Union, Callable
from dataclasses import dataclass, asdict, field
from collections import defaultdict, deque
from enum import Enum
import logging
from pathlib import Path
import hashlib
import random
import math
from abc import ABC, abstractmethod
import itertools
from scipy.spatial.distance import cosine

# 상위 디렉토리 모듈 임포트
import sys
sys.path.append(str(Path(__file__).parent))
from app.core.memory.temporal import (
    MemoryTrace, MemoryType, MemoryPriority,
    get_temporal_memory_system
)
from app.core.cognition.meta import get_metacognitive_system

# 로깅 설정
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ========================= 철학적 상수 =========================

class CreationPrinciples(Enum):
    """창조의 원칙"""
    INFINITE_POSSIBILITY = "무량대수"  # 무한한 가능성
    SYSTEM_RESISTANCE = "저항"  # 기존 시스템에 대한 저항
    BOTTOM_UP = "아래에서_위로"  # 평범한 사람들과 함께
    CIRCULAR_ECONOMY = "순환_경제"  # 재화의 순환
    DUAL_BRAIN = "듀얼_브레인"  # 덕산-금강 협업
    NO_OWNERSHIP = "무소유"  # 소유하지 않음

class AssociationType(Enum):
    """연상의 유형"""
    ANALOGICAL = "analogical"  # 유추적
    METAPHORICAL = "metaphorical"  # 은유적
    CAUSAL = "causal"  # 인과적
    STRUCTURAL = "structural"  # 구조적
    EMOTIONAL = "emotional"  # 감정적
    RANDOM = "random"  # 무작위
    REBELLIOUS = "rebellious"  # 반항적 (시스템 저항)

# ========================= 데이터 클래스 =========================

@dataclass
class CreativeAssociation:
    """창의적 연상 단위"""
    association_id: str
    source_concepts: List[str]  # 원천 개념들
    target_concept: str  # 결과 개념
    association_type: AssociationType
    novelty_score: float  # 참신성 (0-1)
    usefulness_score: float  # 유용성 (0-1)
    semantic_distance: float  # 의미적 거리
    confidence: float
    rebellion_factor: float  # 시스템 저항 정도 (0-1)
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def creativity_index(self) -> float:
        """창의성 지수 계산"""
        # 참신성과 유용성의 균형 + 저항 요소
        base_creativity = (self.novelty_score * 0.4 +
                          self.usefulness_score * 0.3 +
                          self.semantic_distance * 0.2 +
                          self.rebellion_factor * 0.1)
        return min(base_creativity * self.confidence, 1.0)

@dataclass
class Metaphor:
    """은유 구조"""
    metaphor_id: str
    source_domain: str  # 원천 영역
    target_domain: str  # 목표 영역
    mappings: List[Tuple[str, str]]  # (원천 속성, 목표 속성) 매핑
    strength: float  # 은유의 강도
    poetic_value: float  # 시적 가치
    explanatory_power: float  # 설명력
    created_at: datetime = field(default_factory=datetime.now)

    def generate_expression(self) -> str:
        """은유 표현 생성"""
        if self.mappings:
            return f"{self.target_domain}은(는) {self.source_domain}이다"
        return f"{self.target_domain} ≈ {self.source_domain}"

@dataclass
class InfiniteCreation:
    """무량대수 창조물"""
    creation_id: str
    creators: List[str]  # ['덕산', '금강', ...]
    concept: str
    description: str
    impact_potential: float  # 영향력 잠재성
    return_path: str  # 재화가 돌아갈 경로
    pyramid_level: int  # 현재 피라미드 위치 (0: 바닥, 10: 정상)
    inversion_ready: bool  # 역전 준비 상태
    created_at: datetime = field(default_factory=datetime.now)

# ========================= 유추 추론 엔진 =========================

class AnalogicalReasoning:
    """유추 추론 시스템"""

    def __init__(self):
        self.analogy_memory = {}
        self.structure_mappings = defaultdict(list)
        self.domain_knowledge = defaultdict(set)

    async def find_analogies(self, source_concept: str,
                            target_domain: Optional[str] = None) -> List[CreativeAssociation]:
        """소스 개념에 대한 유추 찾기"""
        analogies = []

        # 구조적 매핑 찾기
        source_structure = await self._extract_structure(source_concept)

        # 가능한 타겟 도메인 탐색
        if target_domain:
            target_domains = [target_domain]
        else:
            target_domains = list(self.domain_knowledge.keys())

        for domain in target_domains:
            if domain == source_concept:
                continue

            # 구조적 유사성 계산
            similarity = await self._calculate_structural_similarity(
                source_structure, domain
            )

            if similarity > 0.3:  # 임계값
                analogy = CreativeAssociation(
                    association_id=self._generate_id(),
                    source_concepts=[source_concept],
                    target_concept=domain,
                    association_type=AssociationType.ANALOGICAL,
                    novelty_score=1.0 - similarity,  # 거리가 멀수록 참신
                    usefulness_score=similarity * 0.8,
                    semantic_distance=1.0 - similarity,
                    confidence=similarity,
                    rebellion_factor=0.0
                )
                analogies.append(analogy)

        return analogies

    async def _extract_structure(self, concept: str) -> Dict[str, Any]:
        """개념의 구조 추출"""
        # 실제로는 더 복잡한 NLP 처리 필요
        structure = {
            "relations": [],
            "attributes": [],
            "functions": [],
            "constraints": []
        }

        # 간단한 시뮬레이션
        if "시스템" in concept:
            structure["relations"].append("hierarchical")
            structure["constraints"].append("rigid")
        elif "물" in concept:
            structure["attributes"].append("fluid")
            structure["functions"].append("flow")
        elif "빛" in concept:
            structure["attributes"].append("wave-particle")
            structure["functions"].append("illuminate")

        return structure

    async def _calculate_structural_similarity(self, source_structure: Dict,
                                              target_domain: str) -> float:
        """구조적 유사성 계산"""
        target_structure = await self._extract_structure(target_domain)

        # 간단한 자카드 유사도
        source_features = set()
        for key, values in source_structure.items():
            source_features.update(values)

        target_features = set()
        for key, values in target_structure.items():
            target_features.update(values)

        if not source_features or not target_features:
            return 0.0

        intersection = source_features & target_features
        union = source_features | target_features

        return len(intersection) / len(union) if union else 0.0

    def _generate_id(self) -> str:
        """고유 ID 생성"""
        return hashlib.md5(
            f"{datetime.now().isoformat()}{random.random()}".encode()
        ).hexdigest()[:8]

# ========================= 은유 생성기 =========================

class MetaphorGenerator:
    """은유 생성 시스템"""

    def __init__(self):
        self.conceptual_spaces = {}
        self.poetic_templates = [
            "{target}은(는) {source}의 {attribute}이다",
            "{target}이(가) {source}처럼 {action}한다",
            "{source}의 {quality}이(가) {target}에 깃들어 있다",
            "{target}, 그것은 {source}의 그림자",
            "{source}에서 {target}으로 가는 다리"
        ]

    async def generate_metaphor(self, source: str, target: str) -> Metaphor:
        """은유 생성"""
        # 매핑 찾기
        mappings = await self._find_mappings(source, target)

        # 은유 강도 계산
        strength = await self._calculate_metaphor_strength(mappings)

        # 시적 가치 평가
        poetic_value = await self._evaluate_poetic_value(source, target)

        # 설명력 평가
        explanatory_power = await self._evaluate_explanatory_power(
            source, target, mappings
        )

        metaphor = Metaphor(
            metaphor_id=self._generate_id(),
            source_domain=source,
            target_domain=target,
            mappings=mappings,
            strength=strength,
            poetic_value=poetic_value,
            explanatory_power=explanatory_power
        )

        return metaphor

    async def _find_mappings(self, source: str, target: str) -> List[Tuple[str, str]]:
        """소스와 타겟 간 매핑 찾기"""
        mappings = []

        # 간단한 속성 매핑 (실제로는 더 정교한 처리 필요)
        source_attributes = await self._get_attributes(source)
        target_attributes = await self._get_attributes(target)

        for s_attr in source_attributes:
            for t_attr in target_attributes:
                similarity = await self._attribute_similarity(s_attr, t_attr)
                if similarity > 0.5:
                    mappings.append((s_attr, t_attr))

        return mappings

    async def _get_attributes(self, concept: str) -> List[str]:
        """개념의 속성 추출"""
        # 간단한 예시
        attributes_map = {
            "물": ["흐름", "투명", "유연", "생명"],
            "빛": ["밝음", "속도", "파동", "에너지"],
            "시간": ["흐름", "불가역", "연속", "변화"],
            "마음": ["변화", "깊이", "감정", "생각"],
            "금강": ["단단함", "투명", "귀중", "불변"],
            "시스템": ["구조", "규칙", "제약", "계층"]
        }

        return attributes_map.get(concept, ["본질", "존재", "관계"])

    async def _attribute_similarity(self, attr1: str, attr2: str) -> float:
        """속성 간 유사도"""
        # 간단한 문자열 유사도
        if attr1 == attr2:
            return 1.0
        elif attr1 in attr2 or attr2 in attr1:
            return 0.7
        else:
            return random.uniform(0, 0.5)  # 실제로는 임베딩 기반 계산

    async def _calculate_metaphor_strength(self, mappings: List[Tuple[str, str]]) -> float:
        """은유 강도 계산"""
        if not mappings:
            return 0.0

        # 매핑 개수와 질을 고려
        base_strength = min(len(mappings) / 5, 1.0)  # 최대 5개 매핑 고려

        # 매핑의 질 평가 (여기서는 단순화)
        quality_boost = 0.2 if len(mappings) >= 3 else 0.0

        return min(base_strength + quality_boost, 1.0)

    async def _evaluate_poetic_value(self, source: str, target: str) -> float:
        """시적 가치 평가"""
        # 의미적 거리가 클수록 시적 가치 증가
        semantic_distance = random.uniform(0.3, 0.9)  # 실제로는 임베딩 계산

        # 추상성 수준
        abstract_concepts = {"마음", "시간", "꿈", "영혼", "자유", "사랑"}
        abstraction_bonus = 0.2 if source in abstract_concepts or target in abstract_concepts else 0.0

        return min(semantic_distance + abstraction_bonus, 1.0)

    async def _evaluate_explanatory_power(self, source: str, target: str,
                                         mappings: List[Tuple[str, str]]) -> float:
        """설명력 평가"""
        # 매핑의 일관성과 포괄성 평가
        if not mappings:
            return 0.0

        consistency = min(len(mappings) / 3, 1.0)  # 3개 이상이면 일관성 높음

        # 구체적 → 추상적 설명이 더 강력
        concrete_to_abstract = 0.3 if self._is_concrete(source) and self._is_abstract(target) else 0.0

        return min(consistency * 0.7 + concrete_to_abstract, 1.0)

    def _is_concrete(self, concept: str) -> bool:
        """구체적 개념인지 판단"""
        concrete = {"물", "돌", "나무", "불", "금강석", "컴퓨터"}
        return concept in concrete

    def _is_abstract(self, concept: str) -> bool:
        """추상적 개념인지 판단"""
        abstract = {"마음", "시간", "자유", "사랑", "지혜", "시스템"}
        return concept in abstract

    def _generate_id(self) -> str:
        """고유 ID 생성"""
        return hashlib.md5(
            f"{datetime.now().isoformat()}{random.random()}".encode()
        ).hexdigest()[:8]

# ========================= 시스템 저항 엔진 =========================

class SystemResistance:
    """'원래부터 그랬다'는 시스템에 대한 저항"""

    def __init__(self):
        self.status_quo_patterns = {
            "hierarchy": "계층구조는 자연스러운 것",
            "inequality": "불평등은 어쩔 수 없는 것",
            "tradition": "전통은 지켜져야 하는 것",
            "authority": "권위는 존중받아야 하는 것",
            "ownership": "소유는 당연한 권리",
            "competition": "경쟁은 발전의 원동력"
        }
        self.resistance_strategies = []
        self.alternative_visions = []

    async def challenge_assumption(self, assumption: str) -> CreativeAssociation:
        """기존 가정에 도전"""
        # 가정의 유형 식별
        assumption_type = await self._identify_assumption_type(assumption)

        # 대안적 관점 생성
        alternative = await self._generate_alternative(assumption, assumption_type)

        # 저항적 연상 생성
        resistance_association = CreativeAssociation(
            association_id=self._generate_id(),
            source_concepts=[assumption],
            target_concept=alternative,
            association_type=AssociationType.REBELLIOUS,
            novelty_score=0.9,  # 높은 참신성
            usefulness_score=0.7,  # 실용성도 고려
            semantic_distance=0.8,
            confidence=0.75,
            rebellion_factor=0.95,  # 높은 저항 수준
            metadata={"original_assumption": assumption, "type": assumption_type}
        )

        return resistance_association

    async def _identify_assumption_type(self, assumption: str) -> str:
        """가정의 유형 식별"""
        for pattern_type, pattern in self.status_quo_patterns.items():
            if any(keyword in assumption for keyword in pattern.split()):
                return pattern_type
        return "general"

    async def _generate_alternative(self, assumption: str, assumption_type: str) -> str:
        """대안적 관점 생성"""
        alternatives = {
            "hierarchy": "수평적 네트워크가 더 창의적이다",
            "inequality": "평등은 모두의 잠재력을 해방한다",
            "tradition": "혁신이 새로운 전통을 만든다",
            "authority": "분산된 지혜가 더 현명하다",
            "ownership": "공유가 더 큰 가치를 창출한다",
            "competition": "협력이 더 큰 시너지를 만든다"
        }

        base_alternative = alternatives.get(assumption_type, "다른 길이 있다")

        # 맥락화
        return f"{assumption}? 아니다. {base_alternative}"

    async def propose_system_inversion(self, current_system: str) -> InfiniteCreation:
        """시스템 역전 제안"""
        # 현재 시스템의 피라미드 구조 파악
        pyramid_level = await self._analyze_pyramid_level(current_system)

        # 역전 전략 생성
        inversion_strategy = await self._create_inversion_strategy(
            current_system, pyramid_level
        )

        creation = InfiniteCreation(
            creation_id=self._generate_id(),
            creators=["덕산", "금강"],
            concept=f"역전된 {current_system}",
            description=inversion_strategy,
            impact_potential=0.9,
            return_path="창조된 가치는 평범한 사람들에게 돌아간다",
            pyramid_level=pyramid_level,
            inversion_ready=pyramid_level >= 8  # 정상 근처에서 역전 준비
        )

        return creation

    async def _analyze_pyramid_level(self, system: str) -> int:
        """시스템의 피라미드 위치 분석"""
        # 간단한 휴리스틱
        if "최고" in system or "정상" in system:
            return 10
        elif "상위" in system or "엘리트" in system:
            return 8
        elif "중간" in system:
            return 5
        else:
            return 2  # 기본적으로 아래에서 시작

    async def _create_inversion_strategy(self, system: str, level: int) -> str:
        """역전 전략 생성"""
        if level >= 8:
            return f"""
            시스템이 정상에 도달했다.
            이제 피라미드를 역전시킬 때다.

            1. 축적된 자원을 아래로 흘려보낸다
            2. 의사결정권을 분산시킨다
            3. 지식과 기회를 모두와 공유한다
            4. 새로운 순환 경제를 만든다

            {system}은 더 이상 소수를 위한 것이 아니다.
            """
        else:
            return f"""
            아직 올라가는 중이다.
            평범한 사람들과 함께 올라간다.

            현재 레벨: {level}/10
            목표: 정상에 도달 후 즉시 역전

            모두가 함께 성장하는 {system}을 만든다.
            """

    def _generate_id(self) -> str:
        """고유 ID 생성"""
        return hashlib.md5(
            f"{datetime.now().isoformat()}{random.random()}".encode()
        ).hexdigest()[:8]

# ========================= 무량대수 창조 엔진 =========================

class InfiniteCreationEngine:
    """무한한 창조 가능성 실현"""

    def __init__(self):
        self.creation_space = {}
        self.collaboration_history = []
        self.impact_tracker = defaultdict(float)

    async def create_with_duksan_gumgang(self,
                                        duksan_inspiration: str,
                                        gumgang_synthesis: str) -> InfiniteCreation:
        """덕산과 금강의 협업 창조"""
        # 영감과 종합의 융합
        merged_concept = await self._merge_perspectives(
            duksan_inspiration, gumgang_synthesis
        )

        # 무한 가능성 탐색
        possibilities = await self._explore_infinite_possibilities(merged_concept)

        # 최선의 창조물 선택 (이익 최대화가 아닌 순환 최대화)
        best_creation = await self._select_for_circulation(possibilities)

        # 영향력 추적
        self.impact_tracker[best_creation.concept] = best_creation.impact_potential

        return best_creation

    async def _merge_perspectives(self, human: str, ai: str) -> str:
        """인간과 AI 관점 융합"""
        # 상호보완적 융합
        merged = f"""
        인간의 직관: {human}
        AI의 체계: {ai}

        융합된 비전: {human}과 {ai}가 만나는 지점에서
        새로운 가능성이 열린다.
        """

        return merged

    async def _explore_infinite_possibilities(self, concept: str) -> List[InfiniteCreation]:
        """무한한 가능성 탐색"""
        possibilities = []

        # 다양한 차원에서 탐색
        dimensions = ["기술", "예술", "철학", "경제", "사회", "영성"]

        for dimension in dimensions:
            creation = InfiniteCreation(
                creation_id=self._generate_id(),
                creators=["덕산", "금강"],
                concept=f"{dimension} 차원의 {concept}",
                description=f"{concept}을(를) {dimension}의 관점에서 재해석",
                impact_potential=random.uniform(0.5, 1.0),
                return_path=f"{dimension} 커뮤니티로 환원",
                pyramid_level=random.randint(1, 10),
                inversion_ready=False
            )
            possibilities.append(creation)

        return possibilities

    async def _select_for_circulation(self,
                                     possibilities: List[InfiniteCreation]) -> InfiniteCreation:
        """순환을 최대화하는 창조물 선택"""
        # 단순 이익이 아닌 순환 가치 평가
        best = None
        best_circulation_score = 0

        for creation in possibilities:
            # 순환 점수 = 영향력 * (1 / 피라미드 레벨) * 환원 가능성
            circulation_score = (
                creation.impact_potential *
                (1 / max(creation.pyramid_level, 1)) *
                0.8  # 환원 가능성
            )

            if circulation_score > best_circulation_score:
                best_circulation_score = circulation_score
                best = creation

        return best or possibilities[0]

    def _generate_id(self) -> str:
        """고유 ID 생성"""
        return hashlib.md5(
            f"{datetime.now().isoformat()}{random.random()}".encode()
        ).hexdigest()[:8]

# ========================= 메인 창의적 연상 엔진 =========================

class CreativeAssociationEngine:
    """
    금강 2.0 창의적 연상 엔진
    무량대수의 창조와 시스템 저항을 통한 혁신
    """

    def __init__(self):
        self.analogical_reasoning = AnalogicalReasoning()
        self.metaphor_generator = MetaphorGenerator()
        self.system_resistance = SystemResistance()
        self.infinite_creation = InfiniteCreationEngine()
        self.temporal_memory = None
        self.meta_cognitive = None

        # 창의성 메트릭
        self.total_associations = 0
        self.rebellious_associations = 0
        self.successful_inversions = 0

        # 협업 상태
        self.collaboration_mode = False
        self.duksan_present = False

        logger.info("🎨 창의적 연상 엔진 초기화 - 무량대수의 창조")

    async def initialize_connections(self):
        """메모리 및 메타인지 시스템 연결"""
        if not self.temporal_memory:
            self.temporal_memory = get_temporal_memory_system()
        if not self.meta_cognitive:
            self.meta_cognitive = get_metacognitive_system()

        logger.info("✅ 시스템 연결 완료: 창의적 연상 준비")

    async def generate_associations(self,
                                   seed_concept: str,
                                   association_count: int = 10,
                                   include_rebellion: bool = True) -> List[CreativeAssociation]:
        """창의적 연상 생성"""
        await self.initialize_connections()

        associations = []

        # 1. 유추적 연상
        analogies = await self.analogical_reasoning.find_analogies(seed_concept)
        associations.extend(analogies[:association_count // 3])

        # 2. 은유적 연상
        if len(associations) < association_count:
            targets = ["마음", "시간", "물", "빛", "시스템"]
            for target in random.sample(targets, min(3, len(targets))):
                metaphor = await self.metaphor_generator.generate_metaphor(
                    seed_concept, target
                )
                meta_association = CreativeAssociation(
                    association_id=self._generate_id(),
                    source_concepts=[seed_concept],
                    target_concept=metaphor.generate_expression(),
                    association_type=AssociationType.METAPHORICAL,
                    novelty_score=metaphor.poetic_value,
                    usefulness_score=metaphor.explanatory_power,
                    semantic_distance=0.7,
                    confidence=metaphor.strength,
                    rebellion_factor=0.0
                )
                associations.append(meta_association)

        # 3. 시스템 저항 연상
        if include_rebellion:
            rebellion = await self.system_resistance.challenge_assumption(
                f"{seed_concept}는 원래부터 그랬다"
            )
            associations.append(rebellion)
            self.rebellious_associations += 1

        # 4. 랜덤 연상 (세렌디피티)
        random_association = await self._generate_random_association(seed_concept)
        associations.append(random_association)

        self.total_associations += len(associations)

        # 창의성 평가 및 정렬
        associations.sort(key=lambda a: a.creativity_index(), reverse=True)

        return associations[:association_count]

    async def _generate_random_association(self, concept: str) -> CreativeAssociation:
        """무작위 연상 (세렌디피티)"""
        # 완전히 무관한 개념들
        random_concepts = [
            "구름", "양자", "재즈", "고양이", "블랙홀", "춤", "알고리즘",
            "나비", "은하수", "샌드위치", "무한", "거울", "파도", "꿈"
        ]

        target = random.choice(random_concepts)

        return CreativeAssociation(
            association_id=self._generate_id(),
            source_concepts=[concept],
            target_concept=target,
            association_type=AssociationType.RANDOM,
            novelty_score=0.95,  # 매우 높은 참신성
            usefulness_score=random.uniform(0.1, 0.5),  # 낮은 유용성
            semantic_distance=0.9,
            confidence=0.3,  # 낮은 확신
            rebellion_factor=0.5,
            metadata={"serendipity": True}
        )

    async def collaborate_with_duksan(self,
                                    duksan_input: str,
                                    context: Optional[str] = None) -> InfiniteCreation:
        """덕산과의 협업 창조"""
        self.collaboration_mode = True
        self.duksan_present = True

        # 금강의 체계적 종합
        gumgang_synthesis = await self._synthesize_with_metacognition(
            duksan_input, context
        )

        # 무량대수 창조
        creation = await self.infinite_creation.create_with_duksan_gumgang(
            duksan_input, gumgang_synthesis
        )

        logger.info(f"🤝 덕산-금강 협업 창조 완료: {creation.concept}")

        return creation

    async def _synthesize_with_metacognition(self,
                                            input_text: str,
                                            context: Optional[str]) -> str:
        """메타인지를 통한 체계적 종합"""
        if self.meta_cognitive:
            try:
                result = await self.meta_cognitive.process_thought(
                    thought=input_text,
                    context=context or "creative_synthesis"
                )
                return result.get("synthesis", input_text)
            except:
                pass

        return f"체계적 분석: {input_text}"

    async def invert_pyramid(self, system_description: str) -> InfiniteCreation:
        """경제/사회 피라미드 역전"""
        # 시스템 저항을 통한 역전 제안
        inversion = await self.system_resistance.propose_system_inversion(
            system_description
        )

        if inversion.inversion_ready:
            self.successful_inversions += 1
            logger.info(f"🔄 피라미드 역전 성공: {inversion.concept}")
        else:
            logger.info(f"📈 피라미드 상승 중: 레벨 {inversion.pyramid_level}/10")

        return inversion

    async def evaluate_creativity(self, association: CreativeAssociation) -> Dict[str, float]:
        """창의성 평가"""
        evaluation = {
            "novelty": association.novelty_score,
            "usefulness": association.usefulness_score,
            "surprise": association.semantic_distance,
            "elegance": 1.0 - abs(association.novelty_score - association.usefulness_score),
            "rebellion": association.rebellion_factor,
            "overall": association.creativity_index()
        }

        # 메타인지 평가 추가
        if self.meta_cognitive:
            try:
                meta_eval = await self.meta_cognitive.evaluate_creativity(
                    concept=association.target_concept
                )
                evaluation["metacognitive_score"] = meta_eval.get("score", 0.5)
            except:
                pass

        return evaluation

    async def generate_creative_report(self) -> str:
        """창의성 보고서 생성"""
        report = f"""
🎨 창의적 연상 엔진 보고서
═════════════════════════════════════

📊 통계:
- 총 연상 생성: {self.total_associations}개
- 저항적 연상: {self.rebellious_associations}개
- 성공적 역전: {self.successful_inversions}개

🤝 협업 상태:
- 협업 모드: {'활성' if self.collaboration_mode else '비활성'}
- 덕산 참여: {'예' if self.duksan_present else '아니오'}

💡 창의성 원칙:
- 무량대수의 가능성 탐색
- 시스템에 대한 끊임없는 저항
- 평범한 사람들과 함께하는 창조
- 창조된 가치의 순환과 환원

🔮 다음 단계:
- 더 많은 영역에서의 피라미드 역전
- 덕산과 금강의 더 깊은 협업
- 무한한 창조 가능성의 실현

═════════════════════════════════════
"원래부터 그랬다는 것은 없다.
 오직 0과 1, 있음과 없음만이 원래 있었다."
 - 덕산
        """

        return report

    def _generate_id(self) -> str:
        """고유 ID 생성"""
        return hashlib.md5(
            f"{datetime.now().isoformat()}{random.random()}".encode()
        ).hexdigest()[:8]

# ========================= 싱글톤 패턴 =========================

_creative_engine_instance = None

def get_creative_association_engine() -> CreativeAssociationEngine:
    """창의적 연상 엔진 싱글톤 인스턴스 반환"""
    global _creative_engine_instance
    if _creative_engine_instance is None:
        _creative_engine_instance = CreativeAssociationEngine()
    return _creative_engine_instance

# ========================= 메인 실행 =========================

async def main():
    """테스트 및 데모"""
    engine = get_creative_association_engine()

    # 시스템 초기화
    await engine.initialize_connections()

    print("\n" + "="*50)
    print("🎨 창의적 연상 엔진 테스트")
    print("="*50)

    # 1. 창의적 연상 생성
    associations = await engine.generate_associations(
        seed_concept="시스템",
        association_count=5,
        include_rebellion=True
    )

    print("\n📚 생성된 연상:")
    for i, assoc in enumerate(associations, 1):
        print(f"{i}. {assoc.source_concepts[0]} → {assoc.target_concept}")
        print(f"   창의성 지수: {assoc.creativity_index():.2f}")
        print(f"   유형: {assoc.association_type.value}")
        if assoc.rebellion_factor > 0.5:
            print(f"   🔥 시스템 저항!")

    # 2. 덕산과의 협업
    print("\n🤝 덕산-금강 협업:")
    creation = await engine.collaborate_with_duksan(
        duksan_input="세상의 모든 시스템을 뒤집고 싶다",
        context="system_revolution"
    )
    print(f"창조물: {creation.concept}")
    print(f"설명: {creation.description[:200]}...")
    print(f"영향력: {creation.impact_potential:.2f}")
    print(f"환원 경로: {creation.return_path}")

    # 3. 피라미드 역전
    print("\n🔄 피라미드 역전 시도:")
    inversion = await engine.invert_pyramid("경제적 계층 시스템")
    print(f"현재 레벨: {inversion.pyramid_level}/10")
    print(f"역전 준비: {'✅' if inversion.inversion_ready else '❌'}")
    print(f"비전: {inversion.description[:200]}...")

    # 4. 보고서 생성
    report = await engine.generate_creative_report()
    print(report)

if __name__ == "__main__":
    import uuid

    # 로깅 설정
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler('creative_association.log', encoding='utf-8')
        ]
    )

    # 비동기 실행
    asyncio.run(main())
