# ✅ backend/app/utils/structure_fix_applier.py

import os
import json
import shutil
from pathlib import Path
from utils.time_kr import format_for_filename

# ✅ 프로젝트 루트 경로 기준 (스크립트 위치와 무관하게 항상 정확)
BASE_DIR = Path(__file__).resolve().parents[3]  # gumgang_0_5 기준
REPORT_PATH = BASE_DIR / "backend" / "data" / "structure_report.json"
BACKUP_ROOT = BASE_DIR / "memory" / "structure_fixes_backup"
UNLINKED_DIR = BASE_DIR / "memory" / "unlinked"
DRY_RUN = False  # True → 미리보기, False → 실제 실행

# ✅ 구조 리포트 로드
def load_structure_report(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"❌ 리포트 파일 없음: {path}")
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

# ✅ 백업 대상 경로 계산
def backup_path_for(file_path: str) -> Path:
    timestamp = format_for_filename()  # "YYYY-MM-DD_HH-mm"
    rel_path = Path(file_path).relative_to(BASE_DIR)
    return BACKUP_ROOT / timestamp / rel_path

# ✅ 백업 및 이동
def move_to_backup(file_path: str) -> Path:
    dest = backup_path_for(file_path)
    os.makedirs(dest.parent, exist_ok=True)
    shutil.move(file_path, dest)
    return dest

# ✅ 중복 파일 정리
def apply_duplicate_file_fixes(duplicates: list, dry_run: bool) -> list:
    results = []
    print("\n📁 중복 파일 정리 시작...")
    for file_entry in duplicates:
        for filename, paths in file_entry.items():
            keep = paths[0]
            item_result = {
                "filename": filename,
                "kept": keep,
                "removed": [],
                "skipped": []
            }
            for dup in paths[1:]:
                if not os.path.exists(dup):
                    print(f"  ⚠️ 경로 없음 (스킵): {dup}")
                    item_result["skipped"].append(dup)
                    continue
                if dry_run:
                    print(f"  [DRY-RUN] 백업 예정: {dup}")
                else:
                    backup = move_to_backup(dup)
                    print(f"  ✅ 이동 완료 → {backup}")
                item_result["removed"].append(dup)
            results.append(item_result)
    return results

# ✅ 연결 안 된 파일 정리
def apply_unlinked_file_fixes(unlinked: list, dry_run: bool) -> list:
    results = []
    print("\n📁 연결되지 않은 파일 정리 시작...")
    for file_entry in unlinked:
        for filename, paths in file_entry.items():
            for path in paths:
                if not os.path.exists(path):
                    print(f"  ⚠️ 경로 없음 (스킵): {path}")
                    continue
                dest = UNLINKED_DIR / filename
                if dry_run:
                    print(f"  [DRY-RUN] 이동 예정: {path} → {dest}")
                else:
                    os.makedirs(dest.parent, exist_ok=True)
                    shutil.move(path, dest)
                    print(f"  ✅ 이동 완료: {path} → {dest}")
                results.append({"source": path, "dest": str(dest)})
    return results

# ✅ 경고만 표시
def warn_only_backend_frontend_mismatch(warnings: list):
    print("\n⚠️ 백엔드-프론트 미연결 항목:")
    for msg in warnings:
        print("  -", msg)
    return warnings

# ✅ FastAPI 또는 CLI에서 호출 가능
def apply_structure_fixes(dry_run: bool = False) -> dict:
    report = load_structure_report(REPORT_PATH)
    print(f"📊 금강 구조 리포트 자동 개선 시작 (dry_run = {dry_run})")

    dup_result = apply_duplicate_file_fixes(report.get("duplicate_files", []), dry_run)
    unlinked_result = apply_unlinked_file_fixes(report.get("unlinked_files", []), dry_run)
    warnings = warn_only_backend_frontend_mismatch(report.get("backend_frontend_mismatch", []))

    print("\n🏁 구조 자동 정리 완료.")

    return {
        "status": "success",
        "message": "구조 자동 정리 완료",
        "dry_run": dry_run,
        "duplicate_fix_result": dup_result,
        "unlinked_fix_result": unlinked_result,
        "warnings": warnings
    }

# ✅ CLI 실행용 진입점
def main():
    apply_structure_fixes(dry_run=DRY_RUN)

if __name__ == "__main__":
    main()
