# 📄 /backend/app/routes/create_component.py

from fastapi import APIRouter
from pydantic import BaseModel
from scripts.component_creator import create_component
from app.utils.component_logger import append_component_log  # ✅ 로그 유틸 import
import os

router = APIRouter()

class ComponentRequest(BaseModel):
    file_path: str
    content: str
    dry_run: bool = False  # ✅ 기본값은 False

@router.post("/create_component")
def create_component_endpoint(payload: ComponentRequest):
    if payload.dry_run:
        # ✅ dry_run 로그 기록
        append_component_log(
            action="create_component",
            dry_run=True,
            file_path=payload.file_path,
            component_name=os.path.splitext(os.path.basename(payload.file_path))[0],
            description="프론트 컴포넌트 생성 미리보기",
            source_trigger="금강 프론트 dry_run 요청",
            result_status="preview",
            result_message="🧪 컴포넌트 생성 미리보기 완료"
        )

        return {
            "status": "dry_run",
            "message": "✍️ 컴포넌트를 생성할까요?",
            "file_path": payload.file_path,
            "preview": payload.content
        }

    # ✅ 실제 컴포넌트 생성
    result = create_component(payload.file_path, payload.content)

    # ✅ 생성 성공 후 로그 기록
    append_component_log(
        action="create_component",
        dry_run=False,
        file_path=payload.file_path,
        component_name=os.path.splitext(os.path.basename(payload.file_path))[0],
        description="프론트 컴포넌트 생성 실행",
        source_trigger="금강 프론트 적용 요청",
        result_status="success" if result.get("status") == "success" else "error",
        result_message=result.get("message", "실행 결과 없음")
    )

    # ✅ VSCode 자동 실행 (선택적)
    vscode_target_dir = os.path.dirname(payload.file_path)
    os.system(f'code "{vscode_target_dir}"')

    return result
