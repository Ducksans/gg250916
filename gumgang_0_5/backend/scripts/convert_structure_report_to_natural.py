# backend/scripts/convert_structure_report_to_natural.py

import os
import json

INPUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/structure_report.json"))
OUTPUT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../data/structure_report_natural.json"))

with open(INPUT, "r", encoding="utf-8") as f:
    report = json.load(f)

lines = []
lines.append("📊 [구조 진단 보고서 요약]")

if "summary" in report:
    lines.append(f"🧠 요약: {report['summary']}")

if report.get("missing_files"):
    lines.append("\n❌ 누락된 주요 파일:")
    for f in report["missing_files"]:
        lines.append(f" - {f}")

if report.get("duplicate_files"):
    lines.append("\n🔁 중복된 파일:")
    for item in report["duplicate_files"]:
        for k, v in item.items():
            lines.append(f" - {k} ({len(v)}곳): {v}")

if report.get("unused_files"):
    lines.append("\n🗑️ 미사용 또는 테스트 파일:")
    for item in report["unused_files"]:
        for k, v in item.items():
            lines.append(f" - {k}: {v}")

if report.get("unlinked_files"):
    lines.append("\n🔗 연결되지 않은 파일들:")
    for item in report["unlinked_files"]:
        for k, v in item.items():
            lines.append(f" - {k}: {v}")

if report.get("backend_frontend_mismatch"):
    lines.append("\n⚠️ 백엔드/프론트 간 불일치:")
    for mismatch in report["backend_frontend_mismatch"]:
        lines.append(f" - {mismatch}")

natural_text = "\n".join(lines)

with open(OUTPUT, "w", encoding="utf-8") as f:
    json.dump({"title": "구조 진단 보고서 요약", "content": natural_text}, f, ensure_ascii=False, indent=2)

print(f"✅ 자연어 구조 보고서 저장 완료 → {OUTPUT}")
