from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()
client = OpenAI()

# 단순 임베딩 요청 (키 검증용)
response = client.embeddings.create(
    model="text-embedding-3-small",
    input=["금강은 누구인가?"]
)
print(response.data[0].embedding[:10])  # 일부만 출력
