# ✅ generate_only_node.py
# 순수 GPT 응답만 반환하는 LangGraph 노드

from langchain_core.runnables import RunnableLambda
from langchain_openai import ChatOpenAI
from langchain_core.messages import AIMessage, HumanMessage

# 기본 LLM 세팅 (옵션: temperature 낮게 조정 가능)
llm = ChatOpenAI(model="gpt-4", temperature=0.7)

# 입력은 dict: {"query": "..."}
def generate_only_fn(inputs: dict) -> dict:
    query = inputs.get("query", "")
    if not query.strip():
        return {"response": "❌ 빈 입력이에요. 다시 질문해 주세요."}

    response = llm.invoke([HumanMessage(content=query)])
    return {"response": response.content}

# LangGraph에서 사용할 노드
generate_only_node = RunnableLambda(generate_only_fn)

# 📌 사용 예시:
# from generate_only_node import generate_only_node
# output = generate_only_node.invoke({"query": "금강아, 너 오늘 기분 어때?"})
# print(output["response"])
