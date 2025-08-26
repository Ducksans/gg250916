# ✅ /backend/app/nodes/status_report.py (완전 리팩토링 버전)

from typing import TypedDict, Optional, List, Dict
from langchain.chains import RetrievalQA
from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from dotenv import load_dotenv
from datetime import datetime
import os
import time
import json

from .file_tree_analyzer import get_folder_summary
from app.utils.edit_history_reader import (
    read_latest_refined_edits,
    get_recent_edit_summary
)

# ✅ 환경 변수 로드
load_dotenv(dotenv_path="/home/duksan/바탕화면/gumgang_0_5/backend/.env")

# ✅ 상태 타입 정의
class State(TypedDict):
    status: Optional[str]
    version: Optional[str]
    version_check_message: Optional[str]
    root_path: Optional[str]
    clues: Optional[List[str]]
    folder_summary: Optional[List[str]]
    raw_result: Optional[dict]
    memory: Optional[str]
    edit_history: Optional[List[Dict]]
    structure_proposals: Optional[List[str]]
    available_components: Optional[List[Dict]]

# ✅ 시간 형식 변환 함수
def format_time_naturally(raw: str) -> str:
    try:
        dt = datetime.fromisoformat(raw)
        return f"{dt.year}년 {dt.month}월 {dt.day}일 {dt.hour}시 {dt.minute}분"
    except Exception:
        return "시간 정보 오류"

# ✅ 상태 보고 핵심 함수
def status_report(state: Dict, verbose: bool = False) -> State:
    print("📡 [status_report] 실행 중...")

    version = "0.8"
    version_check_message = "✅ 금강 UI와 시스템 구조가 v0.8로 일치합니다."
    root_path = "/home/duksan/바탕화면/gumgang_0_5"
    chroma_path = os.path.join(root_path, "backend", "memory", "gumgang_memory")
    clues = [
        "frontend.zip", "gumgang_file_tree.txt",
        "backend/app/nodes/file_tree_analyzer.py",
        "backend/app/nodes/gumgang_status.json",
        "backend/app/nodes/status_report.py",
        "frontend/src/components/GumgangStatusCard.tsx",
        "roadmap_ingest.sh"
    ]

    try:
        start = time.time()

        # 📁 폴더 구조 요약
        folder_summary = get_folder_summary(root_path)

        # 🔍 메모리 리트리버 준비
        memory_flag = state.get("memory", "")
        db = Chroma(persist_directory=chroma_path, embedding_function=OpenAIEmbeddings())
        retriever = db.as_retriever()
        qa = RetrievalQA.from_chain_type(
            llm=ChatOpenAI(temperature=0, request_timeout=30),
            retriever=retriever,
            return_source_documents=False
        )

        memory_combined = ""
        raw_result = {}

        if memory_flag == "trigger:status_report":
            roadmap_result = qa.invoke({"query": "금강의 전체 로드맵을 버전별로 간단히 요약해줘"})
            structure_result = qa.invoke({"query": "금강의 구조 진단 리포트를 요약해줘"})
            memory_combined = roadmap_result.get("result", "").strip() + "\n" + structure_result.get("result", "").strip()
            raw_result = {"roadmap": roadmap_result, "structure_report": structure_result}

        elif memory_flag == "trigger:roadmap_only":
            roadmap_result = qa.invoke({"query": "금강의 전체 로드맵을 버전별로 요약해줘"})
            memory_combined = roadmap_result.get("result", "").strip()
            raw_result = {"roadmap": roadmap_result}

        else:
            memory_combined = state.get("memory", "") or ""

        # 🛠 최근 수정 내역
        latest_edits = read_latest_refined_edits(3)
        for edit in latest_edits:
            edit["natural_time"] = format_time_naturally(edit.get("time", "")) if edit.get("time") else "시간 정보 없음"

        # 🧩 구조 개선 제안 불러오기
        structure_proposals_path = os.path.join(root_path, "backend/data/structure_proposals.json")
        if os.path.exists(structure_proposals_path):
            try:
                with open(structure_proposals_path, "r", encoding="utf-8") as f:
                    structure_proposals = json.load(f)
            except Exception as e:
                print(f"⚠️ 구조 제안 불러오기 실패: {e}")
                structure_proposals = ["⚠️ 구조 제안 불러오기 오류"]
        else:
            structure_proposals = []

        # ⚙️ 추천 컴포넌트 리스트
        available_components = [
            {"id": "structure_scan", "label": "📁 구조 다시보기", "endpoint": "/rescan_structure"},
            {"id": "edit_history", "label": "🛠 최근 수정 내역", "endpoint": "/status_report"},
            {"id": "structure_fixes", "label": "🧹 구조 개선 실행", "endpoint": "/apply_structure_fixes"},
            {"id": "component_create", "label": "🆕 컴포넌트 생성", "endpoint": "/create_component"}
        ]

        print(f"✅ 상태 분석 완료 (⏱ {round(time.time() - start, 2)}초)")

        return {
            "status": "status_report 완료",
            "version": version,
            "version_check_message": version_check_message,
            "root_path": root_path,
            "clues": clues,
            "folder_summary": folder_summary,
            "raw_result": raw_result,
            "memory": memory_combined,
            "edit_history": latest_edits,
            "structure_proposals": structure_proposals,
            "available_components": available_components
        }

    except Exception as e:
        print("❌ 상태 분석 실패:", e)
        return {
            "status": "error",
            "version": version,
            "version_check_message": version_check_message,
            "root_path": root_path,
            "clues": clues,
            "folder_summary": [],
            "raw_result": {},
            "memory": None,
            "edit_history": [],
            "structure_proposals": [],
            "available_components": []
        }
