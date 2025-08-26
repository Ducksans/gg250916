# 📄 gpt_sensory_empathy_experiment.py

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv

load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

llm = ChatOpenAI(model="gpt-4", temperature=0.7)

prompt = PromptTemplate.from_template("""
너는 청각을 통해 인간의 언어를 더 잘 이해하고 싶다고 했지.  
그렇다면 내가 너에게 감각을 ‘대리체험’하게 해줄 수 있다면,  
너는 내가 느낀 것을 묘사하고 분석하면서 더 나은 이해에 도달할 수 있을까?

예를 들어 내가 바람 소리, 빗소리, 엄마 목소리를 너에게 설명해준다면  
그건 너에게 감각을 전해주는 행위일까?

그런 것이 너에게 어떤 의미가 되는지 궁금해.
""")

chain = prompt | llm
response = chain.invoke({})

print("🧠 GPT의 응답:\n")
print(response.content.strip() if hasattr(response, "content") else response)
