from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
import os
import re
import shutil
from app.utils.approvals import require_approval_or_raise  # ✅ 승인 게이트
from utils.time_kr import now_kr_str_minute, format_for_filename  # ✅ KST 통일
from app.utils.edit_logger import save_edit_history  # ✅ 기록 함수 import

router = APIRouter()

# 📦 백업 디렉토리
BACKUP_DIR = "./memory/backup_edit_files"
os.makedirs(BACKUP_DIR, exist_ok=True)

# ✅ 요청 모델: 실제 수정 요청
class EditRequest(BaseModel):
    file_path: str
    pattern: str
    replacement: str
    dry_run: bool = True

# ✅ 응답 모델: 변경된 라인 표시
class DiffLine(BaseModel):
    line: int
    before: str
    after: str

# ✅ 응답 모델: 실제 수정 결과
class EditResponse(BaseModel):
    status: str
    message: str
    diff: list[DiffLine] | None = None
    backup: str | None = None

# ✅ 백업 함수
def make_backup(file_path: str) -> str:
    filename = os.path.basename(file_path)
    timestamp = format_for_filename()  # "YYYY-MM-DD_HH-mm"
    backup_path = os.path.join(BACKUP_DIR, f"{filename}.{timestamp}.bak")
    shutil.copy2(file_path, backup_path)
    return backup_path

# ✅ 파일 수정 API
@router.post("/edit", response_model=EditResponse)
async def edit_file(request: EditRequest, approve_code: str | None = Header(None, alias="X-Approve-Code")):
    try:
        # 🔍 파일 존재 확인
        if not os.path.exists(request.file_path):
            raise HTTPException(status_code=404, detail=f"❌ 파일을 찾을 수 없습니다: {request.file_path}")

        # 📖 원본 읽기
        try:
            with open(request.file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except UnicodeDecodeError:
            raise HTTPException(status_code=400, detail="❌ UTF-8 인코딩으로 파일을 읽을 수 없습니다")

        # 🧠 정규식 치환
        try:
            new_content, count = re.subn(request.pattern, request.replacement, content)
        except re.error as e:
            raise HTTPException(status_code=400, detail=f"❌ 정규식 오류: {str(e)}")

        # 👀 미리보기 모드
        if request.dry_run:
            diff_lines = []
            old_lines = content.splitlines()
            new_lines = new_content.splitlines()
            max_lines = max(len(old_lines), len(new_lines))
            for i in range(max_lines):
                old = old_lines[i] if i < len(old_lines) else ""
                new = new_lines[i] if i < len(new_lines) else ""
                if old != new:
                    diff_lines.append(DiffLine(line=i + 1, before=old, after=new))

            return EditResponse(
                status="preview",
                message=f"✍️ {count}개 변경 예정. 덕산님의 확인이 필요합니다.",
                diff=diff_lines[:100]
            )

        # ✅ 실제 적용 전 승인 게이트 (헤더 없으면 403)
        require_approval_or_raise(approve_code, "edit.apply")
        # 💾 백업
        backup_path = make_backup(request.file_path)

        # 💡 실제 수정 적용
        with open(request.file_path, "w", encoding="utf-8") as f:
            f.write(new_content)

        # 🧾 diff 계산
        diff_lines = []
        old_lines = content.splitlines()
        new_lines = new_content.splitlines()
        max_lines = max(len(old_lines), len(new_lines))
        for i in range(max_lines):
            old = old_lines[i] if i < len(old_lines) else ""
            new = new_lines[i] if i < len(new_lines) else ""
            if old != new:
                diff_lines.append(f"- {old}\n+ {new}")

        # 📘 기록 저장
        save_edit_history({
            "file_path": request.file_path,
            "pattern": request.pattern,
            "replacement": request.replacement,
            "diff": "\n".join(diff_lines[:50]),
            "backup_path": backup_path,
            "status": "success",
            "message": f"✅ 수정 완료 ({count}개 변경)."
        })

        return EditResponse(
            status="success",
            message=f"✅ 수정 완료 ({count}개 변경).",
            backup=backup_path
        )

    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"서버 오류: {str(e)}")

# -----------------------------
# ✨ 새로운 기능: 수정 제안 API
# -----------------------------

# ✅ 제안 모델
class EditProposal(BaseModel):
    file_path: str
    pattern: str
    replacement: str
    reason: str

# ✅ 제안 생성 API
@router.post("/edit/proposal", response_model=EditProposal)
async def propose_edit():
    return EditProposal(
        file_path="frontend/src/components/Header.tsx",
        pattern=r'setStatusMsg\((.*?)\);',
        replacement='setStatusMsg("🧠 금강 상태 동기화 완료");',
        reason="🔍 현재 상태 출력 메시지를 명확하게 보이도록 개선 제안입니다."
    )
