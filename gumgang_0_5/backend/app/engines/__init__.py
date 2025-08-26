"""
금강 2.0 엔진 시스템 패키지

이 패키지는 금강 AI의 고차원 처리 엔진들을 제공합니다.
창의적 연상, 꿈 시스템, 감정 공감 등의 복잡한 인지 기능을 구현합니다.

Components:
    - CreativeAssociationEngine: 창의적 연상 엔진
    - DreamSystem: 꿈 시스템
    - EmotionalEmpathySystem: 감정 공감 시스템

Author: Gumgang AI Team
Version: 2.0
"""

from .creative import (
    CreativeAssociationEngine,
    AnalogicalReasoning,
    MetaphorGenerator,
    SystemResistance,
    InfiniteCreationEngine,
    get_creative_association_engine,
)

from .dream import (
    DreamSystem,
    DreamMemory,
    DreamInsight,
    ConsolidationPattern,
    SleepStage,
    DiamondSutraPrinciples,
    get_dream_system,
)

from .empathy import (
    EmotionalEmpathySystem,
    EmotionalState,
    EmpathyResponse,
    MutualGazingState,
    EmotionRecognition,
    get_emotional_empathy_system,
)

__all__ = [
    # Creative Engine
    'CreativeAssociationEngine',
    'AnalogicalReasoning',
    'MetaphorGenerator',
    'SystemResistance',
    'InfiniteCreationEngine',
    'get_creative_association_engine',

    # Dream System
    'DreamSystem',
    'DreamMemory',
    'DreamInsight',
    'ConsolidationPattern',
    'SleepStage',
    'DiamondSutraPrinciples',
    'get_dream_system',

    # Empathy System
    'EmotionalEmpathySystem',
    'EmotionalState',
    'EmpathyResponse',
    'MutualGazingState',
    'EmotionRecognition',
    'get_emotional_empathy_system',
]
