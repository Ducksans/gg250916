from fastapi import APIRouter
from app.nodes.status_report import status_report
from app.graph import run_graph  # 지연 import 방지 필요 시 함수 내 이동 가능

router = APIRouter()

@router.get("/status_report")
def get_status_report():
    return status_report({})

@router.get("/status/reflect")
def reflect_status():
    result = run_graph("reflect")
    return {"response": result}

@router.get("/status")
def basic_status():
    return {
        "status": "ok",
        "message": "금강 백엔드 상태 정상",
        "routes": ["/status", "/status_report", "/status/reflect"]
    }
