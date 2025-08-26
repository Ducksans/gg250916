from fastapi import APIRouter
import subprocess
import os

router = APIRouter()

@router.post("/rescan_structure")
def rescan_structure():
    try:
        # 현재 작업 디렉토리를 프로젝트 루트로 이동
        project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../"))
        scripts_path = os.path.join(project_root, "backend/scripts")

        # 구조 스캔 스크립트 실행
        subprocess.run(["python3", "self_structure_scan.py"], cwd=scripts_path, check=True)

        # 인게스트 스크립트 실행
        subprocess.run(["python3", "ingest_structure_full.py"], cwd=scripts_path, check=True)

        return {"status": "ok", "message": "✅ 구조 다시 스캔하고 인게스트 완료!"}
    except subprocess.CalledProcessError as e:
        return {"status": "error", "message": f"❌ 실행 실패: {e}"}
