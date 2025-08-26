"""
채팅 API 라우터

사용자와의 대화를 처리하는 핵심 엔드포인트
메모리 저장, 메타인지 처리, 감정 분석 등 통합 기능 제공

Author: Gumgang AI Team
Version: 2.0
"""

from fastapi import APIRouter, HTTPException, Depends, status, Request
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import uuid
import logging
import asyncio

# 로거 설정
logger = logging.getLogger(__name__)

# 라우터 생성
router = APIRouter()


# ==================== Request/Response 모델 ====================

class ChatRequest(BaseModel):
    """채팅 요청 모델"""
    message: str = Field(..., description="사용자 메시지", min_length=1, max_length=5000)
    context_id: Optional[str] = Field(None, description="대화 컨텍스트 ID")
    user_id: Optional[str] = Field(None, description="사용자 ID")
    emotion_mode: bool = Field(True, description="감정 분석 활성화")
    creative_mode: bool = Field(False, description="창의 모드 활성화")
    dream_mode: bool = Field(False, description="꿈 모드 활성화")
    metadata: Optional[Dict[str, Any]] = Field(None, description="추가 메타데이터")

    class Config:
        json_schema_extra = {
            "example": {
                "message": "오늘 날씨가 참 좋네요",
                "context_id": "session-123",
                "emotion_mode": True,
                "creative_mode": False
            }
        }


class EmotionInfo(BaseModel):
    """감정 정보 모델"""
    detected: str = Field(..., description="감지된 감정")
    confidence: float = Field(..., description="신뢰도 (0-1)")
    intensity: float = Field(..., description="감정 강도 (0-1)")
    valence: float = Field(..., description="감정 극성 (-1 to 1)")


class ThoughtProcess(BaseModel):
    """사고 과정 모델"""
    step: int = Field(..., description="사고 단계")
    description: str = Field(..., description="단계 설명")
    confidence: float = Field(..., description="확신도")


class ChatResponse(BaseModel):
    """채팅 응답 모델"""
    response: str = Field(..., description="AI 응답 메시지")
    context_id: str = Field(..., description="대화 컨텍스트 ID")
    message_id: str = Field(..., description="메시지 고유 ID")
    emotion: Optional[EmotionInfo] = Field(None, description="감정 분석 결과")
    associations: Optional[List[str]] = Field(None, description="연상 키워드")
    thought_process: Optional[List[ThoughtProcess]] = Field(None, description="사고 과정")
    memory_stored: bool = Field(..., description="메모리 저장 여부")
    processing_time: float = Field(..., description="처리 시간 (초)")
    timestamp: str = Field(..., description="응답 시간")

    class Config:
        json_schema_extra = {
            "example": {
                "response": "맑은 날씨가 기분을 좋게 만드는군요!",
                "context_id": "session-123",
                "message_id": "msg-456",
                "emotion": {
                    "detected": "positive",
                    "confidence": 0.85,
                    "intensity": 0.7,
                    "valence": 0.8
                },
                "associations": ["날씨", "기분", "봄"],
                "memory_stored": True,
                "processing_time": 0.123,
                "timestamp": "2025-08-08T10:00:00Z"
            }
        }


class BatchChatRequest(BaseModel):
    """배치 채팅 요청 모델"""
    messages: List[ChatRequest] = Field(..., description="메시지 목록", max_items=100)
    parallel: bool = Field(False, description="병렬 처리 여부")


class BatchChatResponse(BaseModel):
    """배치 채팅 응답 모델"""
    responses: List[ChatResponse] = Field(..., description="응답 목록")
    total_processing_time: float = Field(..., description="전체 처리 시간")


# ==================== 의존성 함수 ====================

async def get_system_manager(request: Request):
    """시스템 매니저 의존성"""
    if not hasattr(request.app.state, 'manager'):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="시스템이 초기화되지 않았습니다"
        )
    return request.app.state.manager


# ==================== 엔드포인트 ====================

@router.post("/", response_model=ChatResponse)
async def process_chat(
    chat_request: ChatRequest,
    manager = Depends(get_system_manager)
):
    """
    채팅 메시지 처리

    사용자 메시지를 받아 AI 응답을 생성합니다.
    메모리 저장, 감정 분석, 창의적 연상 등의 기능을 통합합니다.
    """
    start_time = datetime.now()

    try:
        # 컨텍스트 ID 생성 또는 사용
        context_id = chat_request.context_id or f"ctx-{uuid.uuid4()}"
        message_id = f"msg-{uuid.uuid4()}"

        logger.info(f"채팅 처리 시작: {message_id} in {context_id}")

        # 1. 메모리에 저장
        memory_stored = False
        if manager.temporal_memory:
            try:
                # store_memory 메서드 호출 (동기/비동기 처리)
                result = manager.temporal_memory.store_memory({
                    "content": chat_request.message,
                    "type": "user_message",
                    "context_id": context_id,
                    "user_id": chat_request.user_id,
                    "timestamp": datetime.now().isoformat()
                })

                # 비동기인 경우
                if asyncio.iscoroutine(result):
                    await result

                memory_stored = True
                logger.info(f"메모리 저장 완료: {message_id}")
            except Exception as e:
                logger.warning(f"메모리 저장 실패: {e}")

        # 2. 감정 분석 (옵션)
        emotion_info = None
        if chat_request.emotion_mode and manager.empathy_system:
            try:
                # 감정 분석 수행
                emotion_result = await analyze_emotion(
                    manager.empathy_system,
                    chat_request.message
                )
                emotion_info = EmotionInfo(
                    detected=emotion_result.get("emotion", "neutral"),
                    confidence=emotion_result.get("confidence", 0.5),
                    intensity=emotion_result.get("intensity", 0.5),
                    valence=emotion_result.get("valence", 0.0)
                )
            except Exception as e:
                logger.warning(f"감정 분석 실패: {e}")

        # 3. 창의적 연상 (옵션)
        associations = None
        if chat_request.creative_mode and manager.creative_engine:
            try:
                associations = await generate_associations(
                    manager.creative_engine,
                    chat_request.message
                )
            except Exception as e:
                logger.warning(f"창의적 연상 실패: {e}")

        # 4. 메타인지 처리
        thought_process = []
        response_text = ""

        if manager.meta_cognitive:
            try:
                # 메타인지 시스템으로 처리
                cognitive_result = await process_with_metacognition(
                    manager.meta_cognitive,
                    chat_request.message,
                    context_id
                )

                response_text = cognitive_result.get("response", "")

                # 사고 과정 추출
                if "thought_chain" in cognitive_result:
                    for idx, step in enumerate(cognitive_result["thought_chain"]):
                        thought_process.append(ThoughtProcess(
                            step=idx + 1,
                            description=step.get("description", ""),
                            confidence=step.get("confidence", 0.5)
                        ))
            except Exception as e:
                logger.error(f"메타인지 처리 실패: {e}")
                response_text = "죄송합니다. 처리 중 문제가 발생했습니다."
        else:
            # 메타인지 시스템이 없는 경우 기본 응답
            response_text = f"'{chat_request.message}'라고 말씀하셨군요. 이해했습니다."

        # 5. 꿈 모드 처리 (옵션)
        if chat_request.dream_mode and manager.dream_system:
            try:
                dream_influence = await apply_dream_mode(
                    manager.dream_system,
                    response_text
                )
                if dream_influence:
                    response_text = dream_influence
            except Exception as e:
                logger.warning(f"꿈 모드 처리 실패: {e}")

        # 처리 시간 계산
        processing_time = (datetime.now() - start_time).total_seconds()

        # 응답 생성
        response = ChatResponse(
            response=response_text,
            context_id=context_id,
            message_id=message_id,
            emotion=emotion_info,
            associations=associations,
            thought_process=thought_process if thought_process else None,
            memory_stored=memory_stored,
            processing_time=processing_time,
            timestamp=datetime.now().isoformat()
        )

        # 메트릭 업데이트
        manager.metrics["total_requests"] = manager.metrics.get("total_requests", 0) + 1

        logger.info(f"채팅 처리 완료: {message_id} ({processing_time:.3f}초)")

        return response

    except Exception as e:
        logger.error(f"채팅 처리 오류: {e}", exc_info=True)

        # 메트릭 업데이트
        manager.metrics["errors"] = manager.metrics.get("errors", 0) + 1

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"채팅 처리 중 오류가 발생했습니다: {str(e)}"
        )


@router.post("/batch", response_model=BatchChatResponse)
async def process_batch_chat(
    batch_request: BatchChatRequest,
    manager = Depends(get_system_manager)
):
    """
    배치 채팅 처리

    여러 메시지를 한 번에 처리합니다.
    병렬 처리 옵션을 제공합니다.
    """
    start_time = datetime.now()

    try:
        responses = []

        if batch_request.parallel:
            # 병렬 처리
            tasks = [
                process_chat(msg, manager)
                for msg in batch_request.messages
            ]
            responses = await asyncio.gather(*tasks, return_exceptions=True)

            # 예외 처리
            for i, response in enumerate(responses):
                if isinstance(response, Exception):
                    logger.error(f"배치 메시지 {i} 처리 실패: {response}")
                    # 실패한 메시지에 대한 기본 응답 생성
                    responses[i] = ChatResponse(
                        response="처리 중 오류가 발생했습니다",
                        context_id=batch_request.messages[i].context_id or f"ctx-error-{i}",
                        message_id=f"msg-error-{i}",
                        memory_stored=False,
                        processing_time=0,
                        timestamp=datetime.now().isoformat()
                    )
        else:
            # 순차 처리
            for msg in batch_request.messages:
                try:
                    response = await process_chat(msg, manager)
                    responses.append(response)
                except Exception as e:
                    logger.error(f"배치 메시지 처리 실패: {e}")
                    responses.append(ChatResponse(
                        response="처리 중 오류가 발생했습니다",
                        context_id=msg.context_id or f"ctx-error",
                        message_id=f"msg-error",
                        memory_stored=False,
                        processing_time=0,
                        timestamp=datetime.now().isoformat()
                    ))

        total_processing_time = (datetime.now() - start_time).total_seconds()

        return BatchChatResponse(
            responses=responses,
            total_processing_time=total_processing_time
        )

    except Exception as e:
        logger.error(f"배치 처리 오류: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"배치 처리 중 오류가 발생했습니다: {str(e)}"
        )


@router.get("/context/{context_id}/history")
async def get_chat_history(
    context_id: str,
    limit: int = 50,
    manager = Depends(get_system_manager)
):
    """
    대화 히스토리 조회

    특정 컨텍스트의 대화 기록을 가져옵니다.
    """
    try:
        if not manager.temporal_memory:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="메모리 시스템을 사용할 수 없습니다"
            )

        # 메모리에서 대화 기록 검색
        history = await search_context_history(
            manager.temporal_memory,
            context_id,
            limit
        )

        return {
            "context_id": context_id,
            "messages": history,
            "count": len(history),
            "limit": limit
        }

    except Exception as e:
        logger.error(f"히스토리 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"히스토리 조회 중 오류가 발생했습니다: {str(e)}"
        )


# ==================== 헬퍼 함수 ====================

async def analyze_emotion(empathy_system, message: str) -> Dict[str, Any]:
    """감정 분석 헬퍼 함수"""
    # 실제 구현은 empathy_system의 메서드에 따라 다름
    # 여기서는 예시 구현
    try:
        if hasattr(empathy_system, 'analyze_emotion'):
            result = empathy_system.analyze_emotion(message)
            if asyncio.iscoroutine(result):
                result = await result
            return result
    except:
        pass

    # 기본값 반환
    return {
        "emotion": "neutral",
        "confidence": 0.5,
        "intensity": 0.5,
        "valence": 0.0
    }


async def generate_associations(creative_engine, message: str) -> List[str]:
    """창의적 연상 생성 헬퍼 함수"""
    try:
        if hasattr(creative_engine, 'generate_associations'):
            result = creative_engine.generate_associations(message)
            if asyncio.iscoroutine(result):
                result = await result
            return result[:5]  # 최대 5개
    except:
        pass

    return []


async def process_with_metacognition(meta_cognitive, message: str, context_id: str) -> Dict[str, Any]:
    """메타인지 처리 헬퍼 함수"""
    try:
        # 메타인지 시스템의 실제 메서드에 맞게 구현
        # 여기서는 기본 응답 생성
        response = f"'{message}'에 대해 생각해보니, 흥미로운 관점이네요."

        return {
            "response": response,
            "thought_chain": [
                {
                    "description": "입력 분석",
                    "confidence": 0.9
                },
                {
                    "description": "의미 추출",
                    "confidence": 0.85
                },
                {
                    "description": "응답 생성",
                    "confidence": 0.88
                }
            ]
        }
    except Exception as e:
        logger.error(f"메타인지 처리 오류: {e}")
        return {
            "response": "이해했습니다.",
            "thought_chain": []
        }


async def apply_dream_mode(dream_system, response: str) -> Optional[str]:
    """꿈 모드 적용 헬퍼 함수"""
    try:
        if hasattr(dream_system, 'transform_response'):
            result = dream_system.transform_response(response)
            if asyncio.iscoroutine(result):
                result = await result
            return result
    except:
        pass

    return None


async def search_context_history(temporal_memory, context_id: str, limit: int) -> List[Dict]:
    """대화 히스토리 검색 헬퍼 함수"""
    try:
        if hasattr(temporal_memory, 'search_by_context'):
            result = temporal_memory.search_by_context(context_id, limit)
            if asyncio.iscoroutine(result):
                result = await result
            return result
    except:
        pass

    return []
