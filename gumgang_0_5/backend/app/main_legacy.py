import os
import json
import subprocess
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi_utils.tasks import repeat_every
from pydantic import BaseModel

# ✅ FastAPI 앱 초기화
app = FastAPI(title="금강 0.8 관제탑")

# ✅ CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ 환경 변수 로드
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ✅ 라우터 모듈 등록
from app.routes import status, memory, edit
from app.routes.ask import router as ask_router
from app.routes import structure  # 🔹 구조 경로 추가

app.include_router(status.router)
app.include_router(memory.router)
app.include_router(edit.router)
app.include_router(ask_router)
app.include_router(structure.router)  # 🔹 구조 리포트 API 추가

# ✅ ingest 유틸 함수
from app.routes.ingest import ingest_document, ingest_directory

# ✅ LangGraph용 /ask 라우트
class Query(BaseModel):
    query: str

@app.post("/ask")
async def ask(query: Query):
    from app.graph import run_graph
    response = run_graph(query.query)
    return {"response": response}

# ✅ 덕산의 기억을 저장하는 /harvest 엔드포인트
@app.post("/harvest")
async def harvest(request: Request):
    try:
        chat = await request.json()
        timestamp = chat.get("timestamp", "unknown")
        title = chat.get("title", "untitled").replace(" ", "_").replace("/", "_")

        save_dir = "./memory/sources/chatgpt/"
        os.makedirs(save_dir, exist_ok=True)

        filename = f"chatgpt_{timestamp}_{title}.json"
        filepath = os.path.join(save_dir, filename)

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(chat, f, ensure_ascii=False, indent=2)

        print(f"✅ JSON 기억 수확 완료: {filepath}")
        return {"status": "success", "file": filepath}

    except Exception as e:
        print(f"❌ 저장 실패: {e}")
        return {"status": "error", "message": str(e)}

# ✅ 2-1단계: 구조 리포트 자동 점검 루프
@app.on_event("startup")
@repeat_every(seconds=3600)  # ⏱ 1시간마다 자동 실행
def update_structure_report():
    print("🔄 금강 구조 리포트 자동 점검 시작...")

    # ✅ 현재 파일이 backend/app/main.py에 있을 때 정확한 경로 계산
    script_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../scripts/analyze_structure.py")
    )

    try:
        subprocess.run(["python3", script_path], check=True)
        print("✅ 구조 리포트 업데이트 완료")
    except subprocess.CalledProcessError as e:
        print(f"❌ 구조 분석 실패: {e}")
