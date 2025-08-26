import os
import json
from collections import defaultdict

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
FRONTEND_DIR = os.path.join(ROOT_DIR, "frontend/src")
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
OUTPUT_PATH = os.path.join(ROOT_DIR, "backend/data/structure_report.json")

# 누적용 딕셔너리
report = {
    "summary": "",
    "missing_files": [],
    "duplicate_files": [],
    "unused_files": [],
    "unlinked_files": [],
    "backend_frontend_mismatch": []
}

# 🔍 1. 전체 파일 순회 및 중복 탐지
def scan_files(base_dir):
    all_files = defaultdict(list)
    for root, _, files in os.walk(base_dir):
        for f in files:
            full_path = os.path.join(root, f)
            all_files[f].append(full_path)
    return all_files

frontend_files = scan_files(FRONTEND_DIR)
backend_files = scan_files(BACKEND_DIR)

# 🔁 2. 중복 파일 탐지
for name, paths in {**frontend_files, **backend_files}.items():
    if len(paths) > 1:
        report["duplicate_files"].append({name: paths})

# ❓ 3. 대표적인 누락 가능성 점검
required_frontend = ["App.jsx", "main.jsx", "Header.tsx"]
for req in required_frontend:
    if req not in frontend_files:
        report["missing_files"].append(req)

# 📂 4. 미사용 파일 및 연결되지 않은 파일 (간단한 예시)
for name, paths in frontend_files.items():
    if name.endswith(".test.tsx") or name.startswith("temp_"):
        report["unused_files"].append({name: paths})

# 🔗 5. 연결되지 않은 백엔드 파일 (라우터 구조 기반으로 개선 예정)
for name, paths in backend_files.items():
    if "test_" in name or name.endswith("_old.py"):
        report["unlinked_files"].append({name: paths})

# 🧭 6. 백엔드-프론트 연결 상태 점검 (예시 수준)
if "status_report.tsx" not in frontend_files and "status.py" in backend_files:
    report["backend_frontend_mismatch"].append(
        "backend에서 상태 API가 존재하지만 연결된 프론트 페이지가 없습니다."
    )

# 📄 최종 요약
report["summary"] = f"🔍 총 프론트 파일 수: {len(frontend_files)}, 백엔드 파일 수: {len(backend_files)}. 중복 {len(report['duplicate_files'])}건, 누락 {len(report['missing_files'])}건 등 문제 발생."

# 저장
os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
    json.dump(report, f, indent=2, ensure_ascii=False)

print(f"✅ 구조 분석 완료 → 결과 저장: {OUTPUT_PATH}")
