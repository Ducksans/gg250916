from langchain_community.llms import Ollama
from langchain.prompts import PromptTemplate

# ✅ 1. Phi 모델 연결
llm = Ollama(model="phi")

# ✅ 2. 의미 분류 전용 프롬프트
prompt = PromptTemplate.from_template("""
다음 질문을 의미에 따라 분류하세요.
선택지는 다음과 같습니다: [greeting, status, edit, recall, generate]
반드시 하나만 정확히 출력하세요.

질문: {query}
응답:
""")

# ✅ 3. 분류기 함수
def classify_query(query: str) -> str:
    chain = prompt | llm
    response = chain.invoke({"query": query})
    return response.strip().lower()

# ✅ 4. 실험 질문 리스트
test_questions = {
    "금강아": "greeting",
    "지금 상태 알려줘": "status",
    "구조 수정 해줘": "edit",
    "지난 대화 기억 회상해줘": "recall",
    "부동산 플랫폼 어떻게 만들까?": "generate"
}

# ✅ 5. 테스트 실행
if __name__ == "__main__":
    print("📊 Phi 의미 분류 테스트 결과:\n")
    for q, expected in test_questions.items():
        predicted = classify_query(q)
        success = "✅" if predicted == expected else "❌"
        print(f"{success} 질문: {q} → 예측: {predicted} (정답: {expected})")
