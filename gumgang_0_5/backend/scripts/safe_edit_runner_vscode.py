#!/usr/bin/env python3
import argparse
import os
import re
import subprocess

def highlight_match(line, pattern):
    try:
        return re.sub(pattern, lambda m: f"\033[93m{m.group(0)}\033[0m", line)
    except re.error:
        return line

def preview_edit(file_path, pattern, replacement):
    if not os.path.exists(file_path):
        print(f"❌ 파일이 존재하지 않습니다: {file_path}")
        return None, None

    with open(file_path, "r") as f:
        lines = f.readlines()

    matching_lines = []
    for i, line in enumerate(lines):
        if re.search(pattern, line):
            matching_lines.append((i + 1, line.rstrip()))

    if not matching_lines:
        print("⚠️ 일치하는 패턴이 없습니다. 수정이 필요하지 않습니다.")
        return None, None

    print(f"📂 대상 파일: {file_path} (총 {len(lines)}줄)")
    print(f"🔍 패턴 매칭: {len(matching_lines)}개 라인에서 발견됨")
    print("📋 수정 전 코드:")
    for lineno, content in matching_lines:
        print(f"{lineno:>4} | {highlight_match(content, pattern)}")

    print("\n🔁 수정 제안 (첫 번째 항목 기준):")
    test_line = re.sub(pattern, replacement, matching_lines[0][1])
    print(f"{matching_lines[0][0]:>4} | {test_line}")

    return matching_lines, test_line

def confirm_and_execute(file_path, pattern, replacement):
    print("\n🧠 VSCode에서 파일을 미리 확인해보세요...")
    subprocess.run(["code", file_path])

    print("\n📝 이대로 수정할까요? [y/N]: ", end="")
    confirm = input().strip().lower()
    if confirm != "y":
        print("❌ 수정이 취소되었습니다.")
        return

    curl_command = f"""
curl -s -X POST http://localhost:8000/edit \\
  -H "Content-Type: application/json" \\
  -d '{{"file_path": "{file_path}", "pattern": "{pattern}", "replacement": "{replacement}", "dry_run": false}}'
"""
    print("\n🚀 수정 실행 중...\n")
    os.system(curl_command)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="🛠 금강 자기수정 + VSCode 확인 흐름")
    parser.add_argument("--file_path", required=True, help="수정할 대상 파일 경로")
    parser.add_argument("--pattern", required=True, help="수정 대상 정규표현식 패턴")
    parser.add_argument("--replacement", required=True, help="대체할 코드")

    args = parser.parse_args()

    matches, preview = preview_edit(args.file_path, args.pattern, args.replacement)
    if matches:
        confirm_and_execute(args.file_path, args.pattern, args.replacement)
