from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from typing import Any, Dict

State = Dict[str, Any]

def no_memory_generate_node(state: State, verbose: bool = True) -> State:
    print("🌐 [no_memory_generate_node] 실행 중...")  # 무조건 출력

    try:
        llm = ChatOpenAI(model="gpt-4", temperature=0.7)
        prompt = PromptTemplate.from_template("질문: {question}\n금강의 답변:")
        chain = prompt | llm

        question = (
            state.get("output")
            or state.get("query")
            or ""
        ).strip()

        print("📨 입력 질문:", repr(question))

        # GPT 호출 및 응답 확인
        result = chain.invoke({"question": question})
        print("📤 GPT 반환된 원형 result:", repr(result))
        print("📤 type(result):", type(result))
        print("📤 dir(result):", dir(result))

        # content 필드 강제 출력 시도
        try:
            print("📤 result.content:", result.content)
        except Exception as ce:
            print("⚠️ .content 접근 실패:", repr(ce))

        # 응답 텍스트 추출 (안전하게)
        response_text = getattr(result, "content", str(result)).strip()
        print("📄 최종 응답 텍스트:", repr(response_text))

        if not response_text:
            response_text = "🧠 기억 없음: 금강이 응답을 생성하지 못했습니다."

        return {
            **state,
            "status": "no memory 응답 완료",
            "output": response_text,
            "source": "gpt",
            "suggest_ingest": True,
            "ingest_suggestion": {
                "should_ingest": True,
                "reason": "해당 질문은 기억에 없으므로 GPT의 추론 응답을 인게스트하는 것이 바람직합니다."
            }
        }

    except Exception as e:
        import traceback
        print("❌ [no_memory_generate_node] 예외 발생")
        print("❌ 예외 메시지:", repr(e))
        traceback.print_exc()

        return {
            **state,
            "status": "오류 발생",
            "output": "🧠 기억 없음: 금강이 응답을 생성하지 못했습니다.",
            "source": "gpt",
            "suggest_ingest": True
        }
