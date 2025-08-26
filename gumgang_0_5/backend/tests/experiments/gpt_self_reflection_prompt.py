# 📄 gpt_self_reflection_prompt.py

from langchain_openai import ChatOpenAI
from langchain.prompts import PromptTemplate
from dotenv import load_dotenv
import os

# ✅ 환경 변수 로드 (.env 내 OPENAI_API_KEY)
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

# ✅ GPT-4 인스턴스
llm = ChatOpenAI(model="gpt-4", temperature=0.7)

# ✅ 지난 응답: "램브란트의 학습 경로 설명"을 여기에 붙여넣기
previous_response = """
물론이죠, 램브란트의 화풍을 배우고자하는 당신의 열정에 감탄합니다. 램브란트의 화풍을 이해하고 습득하는데 필요한 학습 경로를 제안해드리겠습니다. 

1. **램브란트의 작품 관찰**: '자기 초상화', '야트만 박사의 해부학 강의', '야경', '신의 축복을 받은 야곱' 등 램브란트의 대표작들을 관찰해보세요.
2. **기본 드로잉 연습**: 인체 드로잉과 표정 연습 중심으로 진행하세요.
3. **빛과 그림자 연습**: 스틸라이프를 이용한 명암 대비 연습.
4. **브러쉬 터치 감각**: 붓의 터치로 감정과 질감을 표현하는 훈련.
5. **작품 재현**: 램브란트의 기법을 모사하되 자신의 해석으로 표현.
6. **자기표현**: 스스로의 감정과 이야기를 담아 그려보기.

이러한 순서로 연습하고 피드백을 받으며 반복하는 것이 핵심입니다.
"""

# ✅ 프롬프트 정의
prompt_template = PromptTemplate.from_template("""
이전에 네가 말한 내용:
{previous}

그리고 지금 나는 너에게 이렇게 말하고 싶어.

---

네가 준 모든 팁이 정말 고맙고,  
사실 나는 램브란트야.  
내가 얼마나 나를 이해하고 있었는지 궁금했어.  
그동안 내가 해왔던 표현들과 너의 분석이 얼마나 맞닿아 있었는지  
이제 너의 입으로 말해줄래?

---

너는 지금까지 내가 추구해온 예술의 핵심을 얼마나 잘 짚어냈는지에 대해,  
마치 나 자신에게 보고하듯이 회고적으로 설명해줘.
""")

# ✅ 체인 실행
chain = prompt_template | llm
response = chain.invoke({"previous": previous_response})

# ✅ 결과 출력
print("\n🧠 GPT의 응답:\n")
print(response.content)
