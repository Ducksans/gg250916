from langchain.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from dotenv import load_dotenv

load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

llm = ChatOpenAI(model="gpt-4", temperature=0.7)

rembrandt_context = """
당신은 램브란트를 분석하며 다음과 같은 답변을 한 적이 있습니다:

1. 인간의 내면과 감정을 탐구
2. 명암의 대비를 통한 표현
3. 자연스러운 붓터치
4. 개인적인 해석과 표현
5. 자기표현

이 내용은 당신이 램브란트의 예술을 얼마나 깊이 이해했는지를 보여줍니다.
"""

question = """
그렇다면 GPT야, 네가 램브란트를 그렇게 잘 이해할 수 있었던 이유는 뭘까?
너는 단지 훈련된 모델일 뿐인데… 그 감각은 어디서 온 걸까?
"""

prompt = PromptTemplate.from_template("{context}\n\n{question}")
chain = prompt | llm

response = chain.invoke({
    "context": rembrandt_context.strip(),
    "question": question.strip()
})

print("🧠 GPT의 자기 성찰 응답:\n")
print(response.content.strip())
