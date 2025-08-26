#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
금강 0.5 → 1.0 리팩토링: 고급 라우터 테스트 스크립트
"""

import sys
import os
import re
from enum import Enum
from typing import Dict, List, Tuple, Optional

# 백엔드 경로 추가
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

class IntentType(Enum):
    IDENTITY = "identity"      # 자기 정체성 관련
    META = "meta"             # 시스템 상태/구조 관련
    KNOWLEDGE = "knowledge"   # 지식 검색 관련
    ACTION = "action"         # 실행/작업 관련
    CASUAL = "casual"         # 일상 대화 관련

class IntentAnalyzer:
    def __init__(self):
        self.patterns = {
            IntentType.IDENTITY: [
                r'(나는|내가|금강.*누구|정체성|자기.*소개)',
                r'(내.*역할|무엇.*하는|어떤.*존재)',
                r'(자기.*설명|스스로.*설명)'
            ],
            IntentType.META: [
                r'(상태|구조|시스템|아키텍처|현재.*상황)',
                r'(로드맵|계획|개발.*현황|버전)',
                r'(기능.*목록|능력.*목록|할.*수.*있)',
                r'(전체.*구조|내부.*구조|작동.*방식)',
                r'(메모리.*구조|데이터베이스|벡터)'
            ],
            IntentType.ACTION: [
                r'(해줘|실행|처리|작업|수행)',
                r'(만들어|생성|작성|개발)',
                r'(수정|변경|업데이트|리팩토링)',
                r'(분석|검토|확인|점검)'
            ],
            IntentType.KNOWLEDGE: [
                r'(.*에.*대해|.*관련|.*정보)',
                r'(.*설명|.*뜻|.*의미|.*개념)',
                r'(.*방법|.*어떻게|.*왜|.*언제)',
                r'(기억.*있|알고.*있|학습.*했)'
            ],
            IntentType.CASUAL: [
                r'(안녕|hello|hi|반가)',
                r'(어떻게.*지내|잘.*있|괜찮)',
                r'(좋.*날씨|오늘.*어때|기분.*어때)',
                r'(고마워|감사|수고)'
            ]
        }

    def analyze_intent(self, query: str) -> Tuple[IntentType, float, Dict]:
        """의도 분석 및 신뢰도 계산"""
        query_lower = query.lower()
        scores = {}
        details = {}

        for intent_type, patterns in self.patterns.items():
            score = 0
            matched_patterns = []

            for pattern in patterns:
                matches = re.findall(pattern, query_lower)
                if matches:
                    score += len(matches) * 10  # 패턴당 10점
                    matched_patterns.append(pattern)

            scores[intent_type] = score
            details[intent_type.value] = {
                "score": score,
                "matched_patterns": matched_patterns
            }

        # 최고 점수 의도 선택
        if scores:
            primary_intent = max(scores, key=scores.get)
            confidence = min(scores[primary_intent] / 10.0, 1.0)  # 0-1 정규화
        else:
            primary_intent = IntentType.KNOWLEDGE  # 기본값
            confidence = 0.1

        return primary_intent, confidence, details

class ContextAnalyzer:
    @staticmethod
    def analyze_context(query: str, memory: Optional[str] = None) -> Dict:
        """컨텍스트 분석"""
        context = {
            "has_memory": bool(memory),
            "query_length": len(query),
            "question_type": "unknown",
            "urgency": "normal",
            "specificity": "medium"
        }

        # 질문 유형 분석
        if any(marker in query for marker in ["?", "무엇", "어떻게", "왜", "언제", "어디서"]):
            context["question_type"] = "interrogative"
        elif any(marker in query for marker in ["해줘", "실행", "만들어"]):
            context["question_type"] = "imperative"
        else:
            context["question_type"] = "declarative"

        # 긴급도 분석
        if any(word in query for word in ["긴급", "급해", "빨리", "즉시"]):
            context["urgency"] = "high"
        elif any(word in query for word in ["천천히", "나중에", "언젠가"]):
            context["urgency"] = "low"

        # 구체성 분석
        if len(query) > 100 or any(word in query for word in ["구체적", "자세히", "정확히"]):
            context["specificity"] = "high"
        elif len(query) < 20:
            context["specificity"] = "low"

        return context

def make_routing_decision(intent: IntentType, confidence: float, context: Dict,
                         memory: Optional[str] = None, verbose: bool = False) -> str:
    """라우팅 결정 로직"""

    # 1. IDENTITY 의도 → identity_reflect
    if intent == IntentType.IDENTITY and confidence > 0.3:
        return "identity_reflect"

    # 2. META 의도 → status_report
    if intent == IntentType.META and confidence > 0.2:
        return "status_report"

    # 3. ACTION 의도 → 메모리 있으면 status_report, 없으면 no_memory_generate
    if intent == IntentType.ACTION:
        if memory or confidence > 0.7:
            return "status_report"
        else:
            return "no_memory_generate_node"

    # 4. KNOWLEDGE 의도 → 메모리 우선 검색
    if intent == IntentType.KNOWLEDGE:
        if memory:
            return "recall_chatgpt"
        elif confidence > 0.5:
            return "no_memory_generate_node"
        else:
            return "recall_chatgpt"  # 불확실하면 메모리 검색 시도

    # 5. CASUAL 의도 → 직접 생성
    if intent == IntentType.CASUAL:
        return "no_memory_generate_node"

    # 6. 기본값: 메모리 있으면 recall, 없으면 생성
    if memory:
        return "recall_chatgpt"
    else:
        return "no_memory_generate_node"

def test_router():
    """라우터 테스트 함수"""
    print("🎯 금강 고급 라우터 테스트 시작\n")

    analyzer = IntentAnalyzer()

    test_cases = [
        # IDENTITY 테스트
        {"query": "나는 누구야?", "memory": None},
        {"query": "금강은 어떤 존재인가요?", "memory": None},
        {"query": "자기 소개를 해주세요", "memory": None},

        # META 테스트
        {"query": "금강의 현재 상태는?", "memory": None},
        {"query": "전체 시스템 구조를 알려줘", "memory": None},
        {"query": "개발 로드맵이 어떻게 되나요?", "memory": None},

        # ACTION 테스트
        {"query": "코드를 수정해줘", "memory": None},
        {"query": "분석을 해주세요", "memory": "기존 분석 데이터"},
        {"query": "새로운 기능을 만들어줘", "memory": None},

        # KNOWLEDGE 테스트
        {"query": "Python에 대해 알려주세요", "memory": None},
        {"query": "머신러닝 관련 정보가 있나요?", "memory": "ML 관련 기억"},
        {"query": "FastAPI는 어떻게 작동하나요?", "memory": None},

        # CASUAL 테스트
        {"query": "안녕하세요!", "memory": None},
        {"query": "오늘 기분이 어때요?", "memory": None},
        {"query": "고마워요", "memory": None},

        # 복합/애매한 케이스
        {"query": "금강의 기억 기능에 대해 설명해주세요", "memory": None},
        {"query": "자기 상태를 분석해서 보고해줘", "memory": None},
        {"query": "프로그래밍을 어떻게 배웠나요?", "memory": None}
    ]

    for i, case in enumerate(test_cases, 1):
        query = case["query"]
        memory = case["memory"]

        print(f"🧪 테스트 {i}: {query}")

        # 의도 분석
        intent, confidence, details = analyzer.analyze_intent(query)

        # 컨텍스트 분석
        context = ContextAnalyzer.analyze_context(query, memory)

        # 라우팅 결정
        decision = make_routing_decision(intent, confidence, context, memory)

        # 결과 출력
        print(f"   🎯 의도: {intent.value} (신뢰도: {confidence:.2f})")
        print(f"   📊 컨텍스트: {context['question_type']}, {context['urgency']}, {context['specificity']}")
        print(f"   🔀 라우팅: {decision}")
        print(f"   💾 메모리: {'있음' if memory else '없음'}")

        # 매칭된 패턴 표시
        matched = details.get(intent.value, {}).get("matched_patterns", [])
        if matched:
            print(f"   ✅ 매칭 패턴: {matched}")

        print()

if __name__ == "__main__":
    test_router()
