# backend/app/nodes/file_tree_analyzer.py

import os
import json

# ✅ 경로 설정
CURRENT_PATH = os.path.dirname(os.path.abspath(__file__))
ROOT_PATH = os.path.abspath(os.path.join(CURRENT_PATH, "../../..", ".."))  # gumgang_0_5 루트
STATUS_PATH = os.path.join(CURRENT_PATH, "gumgang_status.json")
REPORT_PATH = os.path.join(ROOT_PATH, "backend/memory/reports/structure_report.json")

# ✅ 버전 단서
VERSION_HINTS = {
    "0.5": ["gumgang0.5_chatlog", "start_gumgang_gui.sh"],
    "0.6": ["roadmap_gold.json", "status_report.py", "version_check.py"],
    "0.7": ["file_tree_analyzer.py", "gumgang_status.json"]
}

# ✅ 버전 단서 탐색
def find_version_clues():
    clues = []
    detected_version = "unknown"

    for dirpath, _, filenames in os.walk(ROOT_PATH):
        for file in filenames:
            full_path = os.path.join(dirpath, file)
            for version, keywords in VERSION_HINTS.items():
                if any(keyword in file or keyword in full_path for keyword in keywords):
                    rel_path = os.path.relpath(full_path, ROOT_PATH)
                    clues.append(f"📁 {rel_path} → {version} 단서")

    for version in sorted(VERSION_HINTS.keys(), reverse=True):
        if any(f"→ {version} 단서" in clue for clue in clues):
            detected_version = version
            break

    return {
        "version": detected_version,
        "version_check_message": f"🧠 파일 구조 기반 판단 결과: 금강 현재 버전은 {detected_version}입니다.",
        "clues": clues,
        "root_path": ROOT_PATH
    }

# ✅ 폴더 구조 요약
def get_folder_summary(root_path: str, max_depth: int = 2) -> list:
    summary = []
    for dirpath, _, _ in os.walk(root_path):
        depth = dirpath[len(root_path):].count(os.sep)
        if depth <= max_depth:
            relative = os.path.relpath(dirpath, root_path)
            summary.append(relative + "/")
    return summary

# ✅ CLI 실행 시 구조 진단 리포트 저장
def main():
    print("🔄 금강 구조 리포트 자동 점검 시작...")
    result = find_version_clues()
    folder_summary = get_folder_summary(ROOT_PATH)
    output = {
        **result,
        "folder_summary": folder_summary,
        "missing_files": [],
        "duplicate_files": [],
        "unlinked_files": [],
        "backend_frontend_mismatch": []
    }

    try:
        with open(REPORT_PATH, "w", encoding="utf-8") as f:
            json.dump(output, f, indent=2, ensure_ascii=False)
        print(f"✅ 구조 리포트 저장 완료: {REPORT_PATH}")
    except Exception as e:
        print(f"❌ 구조 리포트 저장 실패: {e}")

if __name__ == "__main__":
    main()
