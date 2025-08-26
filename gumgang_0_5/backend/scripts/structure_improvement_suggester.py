# ✅ structure_improvement_suggester.py (개선 버전)

import os
import json

INPUT_PATH = "backend/data/structure_report.json"
OUTPUT_PATH = "backend/data/structure_proposals.json"

def load_structure_report(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"⚠️ 구조 리포트 파일이 존재하지 않습니다: {path}")
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def generate_proposals(report):
    proposals = []

    # ✅ 1. 중복 파일
    for group in report.get("duplicate_files", []):
        for filename, paths in group.items():
            proposals.append({
                "file": filename,
                "issue": "duplicate_file",
                "proposal": f"⚠️ `{filename}` 파일이 여러 경로에 중복 존재합니다:\n- " + "\n- ".join(paths) +
                            "\n\n필요 없는 중복 파일은 정리하거나 `.bak` 또는 `archive/` 폴더로 분리보관하는 것이 좋습니다."
            })

    # ✅ 2. 연결되지 않은 단일 파일 (예: 테스트 코드)
    for group in report.get("unlinked_files", []):
        for filename, paths in group.items():
            proposals.append({
                "file": filename,
                "issue": "unlinked_file",
                "proposal": f"🔍 `{filename}`은(는) 현재 코드 어디에서도 연결되지 않은 파일입니다:\n- " + "\n- ".join(paths) +
                            "\n\n테스트 전용이라면 괜찮지만, 사용 의도가 명확하지 않다면 주석을 추가하거나 문서화하는 것이 좋습니다."
            })

    # ✅ 3. 백엔드-프론트 미연결 (예: 상태 API만 존재)
    for msg in report.get("backend_frontend_mismatch", []):
        proposals.append({
            "file": "N/A",
            "issue": "backend_frontend_mismatch",
            "proposal": f"🌐 백엔드-프론트 간 연결 문제:\n{msg}\n\n예: `/status_report` API가 있지만 이를 호출하는 프론트 페이지가 없으면, 연결이 누락된 상태일 수 있습니다."
        })

    return proposals

def save_proposals(proposals, path):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(proposals, f, ensure_ascii=False, indent=2)
    print(f"✅ 구조 개선 제안 저장 완료 → {path} ({len(proposals)}건)")

def main():
    report = load_structure_report(INPUT_PATH)
    proposals = generate_proposals(report)
    save_proposals(proposals, OUTPUT_PATH)

if __name__ == "__main__":
    main()
