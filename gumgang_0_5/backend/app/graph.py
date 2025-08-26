from langgraph.graph import StateGraph, END
from typing import TypedDict, Optional, Dict, List, Tuple
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain.chains import RetrievalQA
from langchain.prompts import PromptTemplate
from langchain_community.vectorstores import Chroma
from langchain.retrievers.ensemble import EnsembleRetriever
from langchain_community.retrievers import BM25Retriever
from langchain.text_splitter import RecursiveCharacterTextSplitter
from dotenv import load_dotenv
import os
import re
import json
import uuid
from enum import Enum
from datetime import datetime

# ✅ 컨텍스트 관리 시스템 (4계층 메모리 통합)
from app.context_manager import (
    ConversationTurn,
    get_conversation_memory,
    get_session_manager,
    get_response_enhancer
)

# ✅ 4계층 시간적 메모리 시스템
from app.core.memory.temporal import (
    get_temporal_memory_system,
    MemoryType,
    MemoryPriority
)

# ✅ 메타 인지 시스템 (Claude 4.1 Think Engine Enhanced)
from app.core.cognition.meta import (
    get_metacognitive_system,
    CognitiveState,
    MetaCognitiveInsight
)

# ✅ 외부 노드
from app.nodes.identity_reflect_node import identity_reflect_node
from app.nodes.status_report import status_report as status_report_node
from app.nodes.status_formatter import format_for_chat
from app.nodes.generate_only_node import generate_only_node
from app.nodes.reflect_router_node import build_reflect_router_node

# ✅ 환경변수 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

# ✅ 상태 정의
class IntentType(Enum):
    IDENTITY = "identity"      # 자기 정체성 관련
    META = "meta"             # 시스템 상태/구조 관련
    KNOWLEDGE = "knowledge"   # 지식 검색 관련
    ACTION = "action"         # 실행/작업 관련
    CASUAL = "casual"         # 일상 대화 관련

class State(TypedDict):
    status: Optional[str]
    output: Optional[str]
    memory: Optional[str]
    router_decision: Optional[str]
    source: Optional[str]
    suggest_ingest: Optional[bool]
    intent_analysis: Optional[Dict]
    confidence_score: Optional[float]
    search_results: Optional[List[Dict]]
    response_quality: Optional[Dict]
    context_history: Optional[List[str]]
    session_id: Optional[str]
    conversation_context: Optional[Dict]
    enhanced_prompt: Optional[str]
    temporal_memory_context: Optional[List[Dict]]
    memory_enhanced_response: Optional[str]
    metacognitive_analysis: Optional[Dict]  # 메타 인지 분석 결과
    cognitive_state: Optional[Dict]  # 현재 인지 상태
    reasoning_chain: Optional[List[Dict]]  # 추론 체인

# ✅ 초기 입력 저장 노드 (4계층 메모리 통합)
def reflect_node(state: State, verbose: bool = False) -> State:
    if verbose:
        print("📡 [reflect_node] 4계층 메모리 시스템과 컨텍스트 초기화 중...")
        print(f"🔎 입력: {state.get('output', '')}")

    # 세션 ID 생성 또는 기존 세션 사용
    session_manager = get_session_manager()
    session_id = state.get("session_id")

    if not session_id:
        session_id = session_manager.create_session()
        if verbose:
            print(f"🆕 새 세션 생성: {session_id}")
    else:
        if verbose:
            print(f"🔄 기존 세션 사용: {session_id}")

    # 4계층 메모리 시스템 초기화
    temporal_memory = get_temporal_memory_system()

    # 메모리 통계 출력 (디버깅용)
    if verbose:
        memory_stats = temporal_memory.get_memory_stats()
        print(f"🧠 메모리 상태: {memory_stats['layers']}")

    return {
        **state,
        "status": "reflect 완료 (4계층 메모리 활성화)",
        "output": state.get("output", ""),
        "memory": None,
        "session_id": session_id,
        "temporal_memory_context": [],
        "metacognitive_analysis": None,
        "cognitive_state": None,
        "reasoning_chain": []
    }

# ✅ 의도 분석기 클래스
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

# ✅ 컨텍스트 분석기
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

# ✅ 고급 라우터 노드 (4계층 메모리 통합 의미론적 분기)
def route_node(state: dict, verbose: bool = False) -> dict:
    if verbose:
        print("🧭 [route_node] 4계층 메모리 통합 고급 의미론적 라우터 진입")

    query = state.get("output", "")
    memory = state.get("memory")
    session_id = state.get("session_id", "default")

    if not query:
        return {**state, "router_decision": "no_memory_generate_node"}

    # 4계층 메모리 시스템에서 컨텍스트 검색
    temporal_memory = get_temporal_memory_system()
    memory_context = temporal_memory.retrieve_memories(
        query=query,
        session_id=session_id,
        max_results=5,
        min_relevance=0.2
    )

    # 의도 분석
    analyzer = IntentAnalyzer()
    primary_intent, confidence, intent_details = analyzer.analyze_intent(query)

    # 컨텍스트 분석 (메모리 컨텍스트 포함)
    context = ContextAnalyzer.analyze_context(query, memory)

    # 메모리 기반 컨텍스트 강화
    if memory_context:
        context["has_memory_context"] = True
        context["memory_layers"] = [result['layer'] for result in memory_context]
        context["memory_relevance"] = sum(result['relevance'] for result in memory_context) / len(memory_context)
    else:
        context["has_memory_context"] = False
        context["memory_relevance"] = 0.0

    # 라우팅 결정 로직 (메모리 컨텍스트 고려)
    decision = _make_routing_decision(primary_intent, confidence, context, memory, memory_context, verbose)

    if verbose:
        print(f"🔍 의도 분석: {primary_intent.value} (신뢰도: {confidence:.2f})")
        print(f"📊 컨텍스트: {context}")
        print(f"🧠 메모리 컨텍스트: {len(memory_context)}개 결과")
        print(f"🔀 라우팅 결정: {decision}")

    return {
        **state,
        "router_decision": decision,
        "intent_analysis": {
            "primary_intent": primary_intent.value,
            "confidence": confidence,
            "details": intent_details,
            "context": context
        },
        "confidence_score": confidence,
        "temporal_memory_context": memory_context
    }

def _make_routing_decision(intent: IntentType, confidence: float, context: Dict,
                          memory: Optional[str], memory_context: List[Dict], verbose: bool = False) -> str:
    """4계층 메모리 시스템을 고려한 라우팅 결정 로직"""

    has_memory_context = context.get("has_memory_context", False)
    memory_relevance = context.get("memory_relevance", 0.0)

    # 메모리 컨텍스트 강도 계산
    memory_strength = len(memory_context) * memory_relevance if memory_context else 0

    # 1. IDENTITY 의도 → identity_reflect (메모리 컨텍스트로 강화)
    if intent == IntentType.IDENTITY and confidence > 0.3:
        return "identity_reflect"

    # 2. META 의도 → status_report (메모리 기반 시스템 정보 강화)
    if intent == IntentType.META and confidence > 0.2:
        return "status_report"

    # 3. ACTION 의도 → 메모리 컨텍스트 기반 결정
    if intent == IntentType.ACTION:
        if has_memory_context and memory_relevance > 0.4:
            return "recall_chatgpt"  # 관련 기억이 있으면 메모리 기반 응답
        elif memory or confidence > 0.7:
            return "status_report"
        else:
            return "no_memory_generate_node"

    # 4. KNOWLEDGE 의도 → 계층적 메모리 검색 우선
    if intent == IntentType.KNOWLEDGE:
        if has_memory_context and memory_relevance > 0.3:
            return "recall_chatgpt"  # 관련 기억 활용
        elif memory:
            return "recall_chatgpt"  # 기존 메모리 활용
        elif confidence > 0.5:
            return "no_memory_generate_node"
        else:
            return "recall_chatgpt"  # 불확실하면 메모리 검색 시도

    # 5. CASUAL 의도 → 메모리 컨텍스트가 강하면 개인화된 응답
    if intent == IntentType.CASUAL:
        if has_memory_context and memory_relevance > 0.5:
            return "recall_chatgpt"  # 개인화된 캐주얼 응답
        else:
            return "no_memory_generate_node"

    # 6. 기본값: 메모리 컨텍스트 우선, 없으면 기존 로직
    if has_memory_context and memory_relevance > 0.3:
        return "recall_chatgpt"
    elif memory:
        return "recall_chatgpt"
    else:
        return "no_memory_generate_node"

# ✅ 응답 품질 평가기
class ResponseQualityEvaluator:
    @staticmethod
    def evaluate_memory_relevance(query: str, memory_results: List[str]) -> Dict:
        """메모리 검색 결과의 관련성 평가"""
        if not memory_results:
            return {"relevance_score": 0.0, "confidence": 0.0, "reasons": ["No memory results"]}

        # 간단한 키워드 매칭 기반 관련성 점수
        query_keywords = set(re.findall(r'\w+', query.lower()))
        total_score = 0

        for result in memory_results:
            result_keywords = set(re.findall(r'\w+', result.lower()))
            overlap = len(query_keywords.intersection(result_keywords))
            total_score += overlap / max(len(query_keywords), 1)

        avg_score = total_score / len(memory_results)

        return {
            "relevance_score": min(avg_score, 1.0),
            "confidence": 0.8 if avg_score > 0.3 else 0.4,
            "reasons": [f"키워드 매칭 점수: {avg_score:.2f}"],
            "result_count": len(memory_results)
        }

# ✅ 하이브리드 검색 시스템
class HybridSearchSystem:
    def __init__(self):
        self.embedding = OpenAIEmbeddings()
        self.quality_evaluator = ResponseQualityEvaluator()

    def search_memories(self, query: str, verbose: bool = False) -> Tuple[List[str], Dict]:
        """하이브리드 검색: 벡터 + 키워드 + 의미론적"""
        if verbose:
            print(f"🔍 [HybridSearch] 다층 검색 시작: {query}")

        results = []
        search_info = {"methods_used": [], "result_counts": {}}

        try:
            # 1. 벡터 검색 (기존)
            vector_results = self._vector_search(query, verbose)
            results.extend(vector_results)
            search_info["methods_used"].append("vector")
            search_info["result_counts"]["vector"] = len(vector_results)

            # 2. 키워드 검색 시도
            keyword_results = self._keyword_search(query, verbose)
            results.extend(keyword_results)
            search_info["methods_used"].append("keyword")
            search_info["result_counts"]["keyword"] = len(keyword_results)

            # 3. 중복 제거
            unique_results = list(dict.fromkeys(results))  # 순서 유지하며 중복 제거

            # 4. 품질 평가
            quality = self.quality_evaluator.evaluate_memory_relevance(query, unique_results)

            if verbose:
                print(f"🔍 검색 결과: {len(unique_results)}개, 품질 점수: {quality['relevance_score']:.2f}")

            return unique_results, {**search_info, "quality": quality}

        except Exception as e:
            if verbose:
                print(f"❌ 하이브리드 검색 오류: {e}")
            return [], {"error": str(e), "methods_used": [], "result_counts": {}}

    def _vector_search(self, query: str, verbose: bool = False) -> List[str]:
        """벡터 유사도 검색"""
        try:
            retriever_chatgpt = Chroma(
                persist_directory="./memory/vectors/chatgpt_memory",
                embedding_function=self.embedding
            ).as_retriever(search_kwargs={"k": 3})

            retriever_gumgang = Chroma(
                persist_directory="./memory/gumgang_memory",
                embedding_function=self.embedding
            ).as_retriever(search_kwargs={"k": 3})

            # 각 리트리버에서 문서 검색
            docs_chatgpt = retriever_chatgpt.get_relevant_documents(query)
            docs_gumgang = retriever_gumgang.get_relevant_documents(query)

            results = []
            for doc in docs_chatgpt + docs_gumgang:
                if hasattr(doc, 'page_content'):
                    results.append(doc.page_content)
                else:
                    results.append(str(doc))

            return results[:5]  # 상위 5개만

        except Exception as e:
            if verbose:
                print(f"⚠️ 벡터 검색 실패: {e}")
            return []

    def _keyword_search(self, query: str, verbose: bool = False) -> List[str]:
        """키워드 기반 검색 (BM25)"""
        try:
            # 간단한 키워드 매칭 구현 (BM25는 문서 컬렉션이 필요)
            query_keywords = re.findall(r'\w+', query.lower())
            if not query_keywords:
                return []

            # 메모리 파일들에서 키워드 검색 시뮬레이션
            # 실제 구현에서는 색인된 문서에서 검색
            keyword_results = []

            # 간단한 예시 구현
            return keyword_results

        except Exception as e:
            if verbose:
                print(f"⚠️ 키워드 검색 실패: {e}")
            return []

# ✅ 4계층 메모리 통합 기억 검색 노드
def recall_chatgpt_node(state: State, verbose: bool = False) -> State:
    if verbose:
        print(f"🧠 [recall_chatgpt_node] 4계층 메모리 + 하이브리드 검색 시작 → {state['output']}")

    query = state["output"]
    session_id = state.get("session_id", "default")
    temporal_memory_context = state.get("temporal_memory_context", [])

    # 1. 4계층 메모리 시스템에서 우선 검색
    temporal_memory = get_temporal_memory_system()
    memory_results = []

    if not temporal_memory_context:
        # 라우터에서 가져오지 못했다면 여기서 검색
        memory_results = temporal_memory.retrieve_memories(
            query=query,
            session_id=session_id,
            max_results=10,
            min_relevance=0.2
        )
    else:
        memory_results = temporal_memory_context

    # 2. 기존 하이브리드 검색도 병행
    search_system = HybridSearchSystem()
    legacy_results, search_info = search_system.search_memories(query, verbose)

    # 3. 결과 통합 및 품질 평가
    all_results = []

    # 4계층 메모리 결과 처리
    for result in memory_results:
        trace = result['trace']
        all_results.append({
            'content': trace.content,
            'relevance': result['relevance'],
            'source': f"temporal_memory_{result['layer']}",
            'timestamp': trace.timestamp,
            'priority': trace.priority.value,
            'memory_type': trace.memory_type.value
        })

    # 기존 검색 결과 추가
    for content in legacy_results:
        all_results.append({
            'content': content,
            'relevance': 0.5,  # 기본값
            'source': 'legacy_search',
            'timestamp': None,
            'priority': 0.5,
            'memory_type': 'unknown'
        })

    if not all_results:
        if verbose:
            print("🔍 모든 검색에서 결과 없음 → no_memory_generate로 전환 제안")
        return {
            **state,
            "status": "검색 결과 없음 (4계층 + 하이브리드)",
            "memory": None,
            "search_results": [],
            "response_quality": {"search_success": False, "reason": "No results found"},
            "suggest_ingest": True
        }

    # 4. 통합된 결과로 응답 생성
    response = _generate_temporal_memory_response(query, all_results, memory_results, verbose)

    # 5. 응답 품질 평가
    quality_score = _evaluate_temporal_memory_response_quality(all_results, memory_results)

    return {
        **state,
        "status": "4계층 메모리 + 하이브리드 검색 완료",
        "memory": response,
        "source": "temporal_memory_hybrid",
        "search_results": all_results,
        "response_quality": {
            "search_success": True,
            "relevance_score": quality_score,
            "result_count": len(all_results),
            "memory_layers": list(layer_context.keys()) if 'layer_context' in locals() else [],
            "temporal_memory_count": len(memory_results),
            "legacy_search_count": len(legacy_results)
        }
    }

# ✅ 메모리 기반 응답 생성 (품질 높음)
def _generate_temporal_memory_response(query: str, all_results: List[Dict], memory_results: List[Dict], verbose: bool = False) -> str:
    """4계층 메모리 결과를 활용한 응답 생성"""
    if verbose:
        print(f"🧠 4계층 메모리 기반 응답 생성: {len(memory_results)}개 메모리 + {len(all_results)}개 전체 결과")

    # 메모리 계층별 컨텍스트 구성
    layer_context = {}
    for result in memory_results:
        layer = result['layer']
        if layer not in layer_context:
            layer_context[layer] = []
        layer_context[layer].append(result['trace'].content)

    # 프롬프트 구성
    context_parts = []

    # 최신 컨텍스트 (초단기/단기 메모리)
    if 'ultra_short' in layer_context or 'short_term' in layer_context:
        recent_context = []
        recent_context.extend(layer_context.get('ultra_short', []))
        recent_context.extend(layer_context.get('short_term', []))
        if recent_context:
            context_parts.append("최근 대화 맥락:")
            context_parts.extend(recent_context[:3])

    # 관련 경험 (중장기 메모리)
    if 'medium_term' in layer_context:
        context_parts.append("\n관련 경험:")
        context_parts.extend(layer_context['medium_term'][:2])

    # 핵심 지식 (장기 메모리)
    if 'long_term' in layer_context:
        context_parts.append("\n핵심 지식:")
        context_parts.extend(layer_context['long_term'][:2])

    # 추가 검색 결과
    other_results = [r['content'] for r in all_results if 'temporal_memory' not in r['source']]
    if other_results:
        context_parts.append("\n추가 정보:")
        context_parts.extend(other_results[:2])

    full_context = "\n".join(context_parts)

    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.6,  # 메모리 컨텍스트가 있으므로 온도 낮춤
            max_tokens=1200   # 더 풍부한 응답을 위해 토큰 증가
        )

        prompt = f"""다음은 4계층 메모리 시스템에서 검색된 관련 정보입니다:

{full_context}

사용자 질문: {query}

위의 계층별 메모리 정보를 활용하여 개인화되고 맥락에 맞는 답변을 제공하세요.
최근 대화는 더 높은 가중치를, 핵심 지식은 기반 정보로 활용하세요."""

        response = llm.invoke(prompt)
        return response.content

    except Exception as e:
        if verbose:
            print(f"❌ 4계층 메모리 응답 생성 실패: {e}")
        return f"죄송합니다. 검색된 정보를 바탕으로 답변을 생성하는 중 오류가 발생했습니다: {str(e)}"

def _evaluate_temporal_memory_response_quality(all_results: List[Dict], memory_results: List[Dict]) -> float:
    """4계층 메모리 응답 품질 평가"""
    if not all_results:
        return 0.0

    # 기본 점수
    base_score = 0.0

    # 메모리 계층별 가중치
    layer_weights = {
        'ultra_short': 0.4,  # 최신성 높음
        'short_term': 0.3,   # 세션 연관성
        'medium_term': 0.2,  # 패턴 기반
        'long_term': 0.1     # 핵심 지식
    }

    # 계층별 점수 계산
    for result in memory_results:
        layer = result['layer']
        relevance = result['relevance']
        weight = layer_weights.get(layer, 0.1)
        base_score += relevance * weight

    # 결과 수 보너스 (적당한 수의 결과)
    result_count = len(all_results)
    if 3 <= result_count <= 7:
        base_score += 0.1
    elif result_count > 10:
        base_score -= 0.1  # 너무 많으면 노이즈

    # 다층 메모리 보너스
    unique_layers = set(result['layer'] for result in memory_results)
    if len(unique_layers) > 1:
        base_score += 0.1 * len(unique_layers)

    return min(1.0, base_score)

def _generate_memory_response(query: str, search_results: List[str], verbose: bool = False) -> str:
    """고품질 메모리 결과로 응답 생성"""
    if verbose:
        print("🧠 [_generate_memory_response] 메모리 기반 응답 생성")

    try:
        llm = ChatOpenAI(model="gpt-3.5-turbo", temperature=0.2)

        # 메모리 컨텍스트를 활용한 프롬프트
        memory_context = "\n".join([f"- {result}" for result in search_results[:3]])

        prompt = PromptTemplate.from_template("""
관련 기억:
{memory_context}

질문: {question}

위의 기억을 바탕으로 정확하고 도움이 되는 답변을 해주세요. 기억에 없는 내용은 추측하지 마세요.
""")

        chain = prompt | llm
        response = chain.invoke({
            "question": query,
            "memory_context": memory_context
        })

        return response.content if hasattr(response, 'content') else str(response)

    except Exception as e:
        return f"메모리 기반 응답 생성 중 오류: {str(e)}"

# ✅ 하이브리드 응답 생성 (품질 낮음)
def _generate_hybrid_response(query: str, search_results: List[str], verbose: bool = False) -> str:
    """낮은 품질 메모리를 GPT 추론으로 보완"""
    if verbose:
        print("🔧 [_generate_hybrid_response] 하이브리드 응답 생성")

    try:
        llm = ChatOpenAI(model="gpt-4", temperature=0.5)

        memory_context = "\n".join([f"- {result}" for result in search_results[:2]])

        prompt = PromptTemplate.from_template("""
부분적 기억:
{memory_context}

질문: {question}

위의 기억은 질문과 완전히 일치하지 않을 수 있습니다.
기억에서 유용한 부분이 있다면 활용하되, 부족한 부분은 일반적인 지식으로 보완하여 도움이 되는 답변을 해주세요.
답변 시작에 "기억과 추론을 결합한 답변:"이라고 명시해주세요.
""")

        chain = prompt | llm
        response = chain.invoke({
            "question": query,
            "memory_context": memory_context
        })

        return response.content if hasattr(response, 'content') else str(response)

    except Exception as e:
        return f"하이브리드 응답 생성 중 오류: {str(e)}"

# ✅ 4계층 메모리 통합 적응형 GPT 생성 노드
def no_memory_generate_node(state: State, verbose: bool = False) -> State:
    try:
        if verbose:
            print("🌐 [no_memory_generate_node] 4계층 메모리 통합 적응형 응답 생성 중...")

        query = state["output"]
        intent_analysis = state.get("intent_analysis", {})
        primary_intent = intent_analysis.get("primary_intent", "knowledge")
        confidence = state.get("confidence_score", 0.5)
        session_id = state.get("session_id", "default")

        # 4계층 메모리에서 약한 관련성 검색 (메모리가 없어도 컨텍스트 보강)
        temporal_memory = get_temporal_memory_system()
        weak_context = temporal_memory.retrieve_memories(
            query=query,
            session_id=session_id,
            max_results=3,
            min_relevance=0.1  # 낮은 임계값으로 약한 관련성도 포함
        )

        # 의도별 맞춤형 응답 생성 (4계층 메모리 컨텍스트 포함)
        response = _generate_contextual_response(query, primary_intent, confidence, session_id, weak_context, verbose)

        # 응답 품질 평가 (메모리 컨텍스트 고려)
        quality_score = _evaluate_response_quality(query, response, weak_context)

        # 생성된 응답을 4계층 메모리에 저장
        _store_generated_response_to_memory(query, response, primary_intent, quality_score, session_id)

        return {
            **state,
            "status": "4계층 메모리 통합 적응형 응답 완료",
            "output": response,
            "source": "adaptive_gpt_memory_enhanced",
            "suggest_ingest": True,
            "temporal_memory_context": weak_context,
            "memory_enhanced_response": len(weak_context) > 0,
            "response_quality": {
                "generation_method": "adaptive_memory_enhanced",
                "intent_based": True,
                "quality_score": quality_score,
                "primary_intent": primary_intent,
                "context_boost": len(weak_context) > 0,
                "memory_context_count": len(weak_context)
            },
            "ingest_suggestion": {
                "should_ingest": quality_score > 0.7,
                "reason": f"품질 점수 {quality_score:.2f}, 의도: {primary_intent}, 메모리 컨텍스트: {len(weak_context)}개"
            }
        }
    except Exception as e:
        import traceback
        print("❌ [no_memory_generate_node] 오류:", e)
        traceback.print_exc()
        return {
            **state,
            "status": "오류 발생",
            "output": f"[오류]: {str(e)}",
            "response_quality": {"error": True, "message": str(e)}
        }

def _generate_contextual_response(query: str, intent: str, confidence: float,
                                 session_id: str = None, memory_context: List[Dict] = None, verbose: bool = False) -> str:
    """4계층 메모리 컨텍스트를 활용한 맞춤형 응답 생성"""

    # 컨텍스트 강화 프롬프트 생성
    if session_id:
        response_enhancer = get_response_enhancer()
        enhanced_prompt, context_info = response_enhancer.enhance_prompt(query, session_id, intent)

        if verbose:
            print(f"🎯 컨텍스트 강화 적용: {context_info.get('flow_analysis', {}).get('context_type', 'unknown')}")
    else:
        enhanced_prompt = f"질문: {query}\n\n도움이 되는 답변을 제공해주세요."

    # 메모리 컨텍스트 추가
    memory_context_str = ""
    if memory_context and len(memory_context) > 0:
        memory_parts = []
        for result in memory_context:
            trace = result['trace']
            layer = result['layer']
            relevance = result['relevance']
            content_preview = trace.content[:100] + "..." if len(trace.content) > 100 else trace.content
            memory_parts.append(f"[{layer}, 관련도: {relevance:.2f}] {content_preview}")

        memory_context_str = f"\n\n관련 기억 (약한 연관성):\n" + "\n".join(memory_parts)
        enhanced_prompt += memory_context_str

    # 의도별 프롬프트 템플릿 (4계층 메모리 강화)
    intent_prompts = {
        "identity": f"""
당신은 금강이라는 AI 어시스턴트입니다. 4계층 메모리 시스템을 통해 개인화된 응답을 제공합니다.
{enhanced_prompt}

자신의 정체성에 대해 일관되고 친근하게 답변하되, 위의 관련 기억이 있다면 이를 참고하여 더 개인화된 응답을 제공하세요.
""",
        "meta": f"""
당신은 금강이라는 AI 어시스턴트입니다. 시스템 정보에 대한 질문입니다.
{enhanced_prompt}

시스템의 구조, 기능, 현재 상태에 대해 정확하고 이해하기 쉽게 설명해주세요.
관련 기억이 있다면 이를 바탕으로 더 구체적인 정보를 제공하세요.
""",
        "knowledge": f"""
당신은 도움이 되는 AI 어시스턴트입니다. 지식 관련 질문입니다.
{enhanced_prompt}

정확하고 유용한 정보를 제공해주세요. 관련 기억이 있다면 이를 활용하여 더 개인화된 답변을 제공하세요.
확실하지 않은 정보는 명시해주세요.
""",
        "action": f"""
당신은 실용적인 조언을 제공하는 AI 어시스턴트입니다. 행동 관련 요청입니다.
{enhanced_prompt}

구체적이고 실행 가능한 조언을 제공해주세요. 관련 기억이 있다면 사용자의 이전 경험을 고려한 맞춤형 조언을 제공하세요.
단계별로 명확하게 설명해주세요.
""",
        "casual": f"""
당신은 친근한 AI 어시스턴트입니다. 일상적인 대화입니다.
{enhanced_prompt}

자연스럽고 친근한 톤으로 대화해주세요. 관련 기억이 있다면 이를 바탕으로 더 개인적이고 따뜻한 응답을 제공하세요.
"""
    }

    # 의도에 맞는 프롬프트 선택
    selected_prompt = intent_prompts.get(intent, f"""
당신은 도움이 되는 AI 어시스턴트입니다.
{enhanced_prompt}

사용자의 질문에 대해 정확하고 도움이 되는 답변을 제공해주세요.
관련 기억이 있다면 이를 활용하여 더 개인화된 응답을 제공하세요.
""")

    try:
        llm = ChatOpenAI(
            model="gpt-4o-mini",
            temperature=0.7,
            max_tokens=1000
        )

        response = llm.invoke(selected_prompt)
        return response.content if hasattr(response, 'content') else str(response)

    except Exception as e:
        if verbose:
            print(f"❌ 컨텍스트 응답 생성 실패: {e}")
        return f"죄송합니다. 응답 생성 중 오류가 발생했습니다: {str(e)}"

def _store_generated_response_to_memory(query: str, response: str, intent: str, quality_score: float, session_id: str):
    """생성된 응답을 4계층 메모리에 저장"""
    try:
        temporal_memory = get_temporal_memory_system()

        # 메모리 타입 결정
        memory_type_map = {
            'identity': MemoryType.SEMANTIC,
            'knowledge': MemoryType.SEMANTIC,
            'action': MemoryType.PROCEDURAL,
            'meta': MemoryType.CONTEXTUAL,
            'casual': MemoryType.EPISODIC
        }
        memory_type = memory_type_map.get(intent, MemoryType.EPISODIC)

        # 우선순위 결정
        if quality_score >= 0.8:
            priority = MemoryPriority.HIGH
        elif quality_score >= 0.6:
            priority = MemoryPriority.MEDIUM
        elif quality_score >= 0.4:
            priority = MemoryPriority.LOW
        else:
            priority = MemoryPriority.MINIMAL

        # 태그 생성
        tags = {intent, 'generated_response', f'quality_{int(quality_score * 10)}'}

        # 메모리 저장
        content = f"사용자: {query}\n시스템: {response}"
        temporal_memory.store_memory(
            content=content,
            memory_type=memory_type,
            priority=priority,
            session_id=session_id,
            emotional_valence=0.1,  # 약간 긍정적 (도움을 제공했으므로)
            tags=tags
        )

    except Exception as e:
        print(f"메모리 저장 실패: {e}")

def _evaluate_response_quality(query: str, response: str, memory_context: List[Dict] = None) -> float:
    """응답 품질 평가 (메모리 컨텍스트 고려)"""
    quality_score = 0.5  # 기본값

    # 응답 길이 평가
    if 50 <= len(response) <= 1000:
        quality_score += 0.1
    elif len(response) < 20:
        quality_score -= 0.2

    # 메모리 컨텍스트 활용 보너스
    if memory_context and len(memory_context) > 0:
        quality_score += 0.1 * len(memory_context)

    # 오류 메시지 감점
    if "오류" in response or "죄송합니다" in response:
        quality_score -= 0.3

    # 구체성 평가 (간단한 휴리스틱)
    if any(word in response for word in ["구체적으로", "예를 들어", "단계적으로"]):
        quality_score += 0.1

    return min(1.0, max(0.0, quality_score))

# ✅ 상태 요약 노드 (4계층 메모리 통합 Chat 전용 요약 출력)
def status_report_wrapper(state: dict, verbose: bool = False) -> dict:
    if verbose:
        print("📊 [status_report_wrapper] 4계층 메모리 통합 상태 보고 실행 중...")

    # 4계층 메모리 시스템 상태 추가
    temporal_memory = get_temporal_memory_system()
    memory_stats = temporal_memory.get_memory_stats()

    # 기존 상태 보고에 메모리 정보 추가
    enhanced_state = {
        **state,
        "memory_stats": memory_stats,
        "temporal_memory_active": True
    }

    report = status_report_node(enhanced_state, verbose=verbose)
    response = format_for_chat(report)

    if verbose:
        print("🧠 메모리 통계:", memory_stats['layers'])
        print("🧾 report:", report)
        print("🗣️ response (chat용):", response)

    return {
        **report,
        "status": "4계층 메모리 통합 상태 보고 완료",
        "output": response or "❌ 출력 없음",
        "memory_stats": memory_stats
    }

# ✅ 메타 인지 노드 (Think-Reflect-Create)
async def metacognitive_node(state: State, verbose: bool = False) -> State:
    """
    메타 인지 시스템 노드
    Claude 4.1 Think Engine의 핵심 기능 구현
    """
    if verbose:
        print("🧠 [metacognitive_node] 메타 인지 시스템 활성화...")

    # 메타 인지 시스템 가져오기
    metacognitive_system = get_metacognitive_system()

    query = state.get("output", "")
    context = {
        "session_id": state.get("session_id"),
        "intent": state.get("intent_analysis"),
        "confidence": state.get("confidence_score", 0.5),
        "temporal_memory": state.get("temporal_memory_context", [])
    }

    # Think-Reflect-Create 파이프라인 실행
    try:
        import asyncio
        metacognitive_result = await metacognitive_system.think_reflect_create(
            query=query,
            context=context
        )

        if verbose:
            print(f"🎯 메타 인지 확신도: {metacognitive_result.get('final_confidence', 0):.2f}")
            print(f"💡 생성된 통찰: {metacognitive_result.get('insights_generated', 0)}개")

        # 학습 전략 조정
        new_strategy = await metacognitive_system.adapt_learning_strategy()
        if verbose:
            print(f"📚 학습 전략: {new_strategy}")

        # 신경 활성화 모니터링
        activation_analysis = await metacognitive_system.monitor_neural_activations()

        # 자기 인식 보고서 생성 (주기적으로)
        import random
        if random.random() < 0.1:  # 10% 확률로 자기 인식 보고
            self_report = await metacognitive_system.self_awareness_report()
            if verbose:
                print(f"🪞 자기 인식: {self_report.get('self_description', '')}")

        return {
            **state,
            "metacognitive_analysis": metacognitive_result,
            "cognitive_state": metacognitive_result.get("cognitive_state"),
            "reasoning_chain": metacognitive_result.get("thinking", {}).get("reasoning_chain", []),
            "confidence_score": metacognitive_result.get("final_confidence", state.get("confidence_score", 0.5))
        }

    except Exception as e:
        if verbose:
            print(f"⚠️ 메타 인지 처리 중 오류: {e}")

        return {
            **state,
            "metacognitive_analysis": {"error": str(e)},
            "cognitive_state": None,
            "reasoning_chain": []
        }

# 동기 래퍼 (LangGraph는 동기 함수 사용)
def metacognitive_node_sync(state: State, verbose: bool = False) -> State:
    """메타 인지 노드 동기 래퍼"""
    import asyncio

    # 이벤트 루프 처리
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        # 이미 실행 중인 루프가 있으면 태스크로 스케줄
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as executor:
            future = executor.submit(asyncio.run, metacognitive_node(state, verbose))
            return future.result()
    else:
        # 새 루프에서 실행
        return loop.run_until_complete(metacognitive_node(state, verbose))

def _save_conversation_turn(state: State, response: str):
    """대화 턴을 컨텍스트 관리자에 저장 (4계층 메모리 자동 연동)"""
    try:
        query = state.get("output", "")
        session_id = state.get("session_id", "default")
        intent_analysis = state.get("intent_analysis", {})
        confidence = state.get("confidence_score", 0.5)
        source = state.get("source", "unknown")
        response_quality = state.get("response_quality", {})

        # ConversationTurn 생성
        turn = ConversationTurn(
            turn_id=str(uuid.uuid4()),
            timestamp=datetime.now(),
            user_query=query,
            system_response=response,
            intent=intent_analysis.get("primary_intent", "unknown"),
            confidence=confidence,
            source=source,
            response_quality=response_quality.get("quality_score", 0.5),
            session_id=session_id,
            emotional_context=0.0,  # 기본값
            importance_score=confidence
        )

        # 컨텍스트 메모리에 저장 (자동으로 4계층 메모리에도 저장됨)
        conversation_memory = get_conversation_memory()
        conversation_memory.add_turn(turn)

        # 세션 매니저 업데이트
        session_manager = get_session_manager()
        session_manager.update_session(session_id, turn)

    except Exception as e:
        print(f"대화 턴 저장 실패: {e}")

# ✅ LangGraph 실행 진입점 (4계층 메모리 시스템 통합)
def run_graph(user_input: str, session_id: str = None, verbose: bool = False) -> dict:
    if verbose:
        print(f"🚀 4계층 메모리 통합 LangGraph 시작 → '{user_input}'")

    # 4계층 메모리 시스템 초기화 확인
    temporal_memory = get_temporal_memory_system()
    if verbose:
        memory_stats = temporal_memory.get_memory_stats()
        print(f"🧠 메모리 시스템 활성화: {memory_stats['layers']}")

    workflow = StateGraph(State)

    workflow.add_node("reflect", lambda s: reflect_node(s, verbose=verbose))
    workflow.add_node("metacognitive", lambda s: metacognitive_node_sync(s, verbose=verbose))
    workflow.add_node("route", lambda s: route_node(s, verbose=verbose))
    workflow.add_node("identity_reflect", lambda s: identity_reflect_node(s, verbose=verbose))
    workflow.add_node("recall_chatgpt", lambda s: recall_chatgpt_node(s, verbose=verbose))
    workflow.add_node("generate_only_node", generate_only_node)
    workflow.add_node("status_report", lambda s: status_report_wrapper(s, verbose=verbose))
    workflow.add_node("no_memory_generate_node", lambda s: no_memory_generate_node(s, verbose=verbose))

    workflow.set_entry_point("reflect")

    workflow.add_edge("reflect", "metacognitive")
    workflow.add_edge("metacognitive", "route")
    workflow.add_conditional_edges(
        "route",
        lambda s: s["router_decision"],
        {
            "identity_reflect": "identity_reflect",
            "generate_only_node": "generate_only_node",
            "recall_chatgpt": "recall_chatgpt",
            "no_memory_generate_node": "no_memory_generate_node",
            "status_report": "status_report"
        }
    )

    workflow.add_edge("identity_reflect", "status_report")
    workflow.add_edge("generate_only_node", "status_report")
    workflow.add_edge("recall_chatgpt", "status_report")
    workflow.add_edge("no_memory_generate_node", "status_report")
    workflow.add_edge("status_report", END)

    app = workflow.compile()

    # 세션 ID 처리
    if not session_id:
        session_manager = get_session_manager()
        session_id = session_manager.create_session()

    final_state = app.invoke({
        "status": None,
        "output": user_input,
        "memory": None,
        "session_id": session_id,
        "temporal_memory_context": []
    })

    print("🧪 최종 상태 확인:", final_state)

    # ✅ 3단계 리팩토링된 핵심 리턴부 (컨텍스트 정보 포함)
    response_quality = final_state.get("response_quality", {})
    search_results = final_state.get("search_results", [])
    session_id = final_state.get("session_id")

    # 대화 턴 기록 저장 (4계층 메모리 자동 연동)
    response_text = final_state.get("output") or final_state.get("memory") or "응답 없음"
    if session_id:
        _save_conversation_turn(final_state, response_text)

    # 4계층 메모리 통계 추가
    temporal_memory_context = final_state.get("temporal_memory_context", [])
    memory_enhanced = final_state.get("memory_enhanced_response", False)

    return {
        "response": response_text,
        "source": final_state.get("source", "memory"),
        "suggest_ingest": final_state.get("suggest_ingest", False),
        "router_decision": final_state.get("router_decision", None),
        "status": final_state.get("status", None),
        "response_quality": response_quality,
        "search_results_count": len(search_results),
        "intent_analysis": final_state.get("intent_analysis", {}),
        "confidence_score": final_state.get("confidence_score", 0.0),
        "session_id": session_id,
        "conversation_context": final_state.get("conversation_context", {}),
        "temporal_memory_context": temporal_memory_context,
        "memory_enhanced": memory_enhanced,
        "memory_layers_used": [r['layer'] for r in temporal_memory_context] if temporal_memory_context else []
    }

# Function removed - duplicate version above is more complete
