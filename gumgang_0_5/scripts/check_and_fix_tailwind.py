import os
import re
from datetime import datetime
import shutil

ROOT_DIR = os.path.expanduser("~/바탕화면/gumgang_0_5/frontend")

def find_tailwind_config(root_dir):
    for dirpath, _, filenames in os.walk(root_dir):
        if "tailwind.config.js" in filenames:
            return os.path.join(dirpath, "tailwind.config.js")
    return None

def make_backup(file_path):
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_dir = os.path.expanduser("~/바탕화면/gumgang_0_5/backend/memory/backup_edit_files")
    os.makedirs(backup_dir, exist_ok=True)
    filename = os.path.basename(file_path)
    backup_path = os.path.join(backup_dir, f"{filename}.{timestamp}.bak")
    shutil.copy2(file_path, backup_path)
    return backup_path

def inspect_and_propose(config_path):
    with open(config_path, "r", encoding="utf-8") as f:
        content = f.read()

    has_animation = re.search(r"animation\s*:\s*{[^}]*pulse", content, re.DOTALL)
    has_extend = "extend" in content

    print("\n📄 분석 대상:", config_path)
    print("📦 extend 블록:", "✅ 있음" if has_extend else "❌ 없음")
    print("✨ animate-pulse:", "✅ 존재함" if has_animation else "❌ 누락됨")

    if has_animation:
        print("✅ 수정이 필요하지 않습니다.")
        return None, None

    if has_extend:
        pattern = r"(extend\s*:\s*{)"
        replacement = r"""\1
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },"""
    else:
        pattern = r"(theme\s*:\s*{)"
        replacement = r"""\1
    extend: {
      animation: {
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },"""

    return pattern, replacement

def apply_modification(file_path, pattern, replacement):
    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    new_content, count = re.subn(pattern, replacement, content, flags=re.DOTALL)

    if count == 0:
        print("❌ 적용 대상이 없습니다.")
        return

    backup_path = make_backup(file_path)

    with open(file_path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print("\n✅ 수정 적용 완료")
    print(f"📦 백업 파일: {backup_path}")
    print(f"✍️ 수정된 라인 수: {count}")
    print("📌 삽입된 설정:\n", replacement)

def main():
    config_path = find_tailwind_config(ROOT_DIR)
    if not config_path:
        print("❌ tailwind.config.js 파일을 찾을 수 없습니다.")
        return

    pattern, replacement = inspect_and_propose(config_path)

    if not pattern:
        return

    print("\n💬 덕산님, 위 수정 제안을 적용할까요? [y/n]: ", end="")
    decision = input().strip().lower()

    if decision == 'y':
        apply_modification(config_path, pattern, replacement)
    else:
        print("❎ 수정이 취소되었습니다.")

if __name__ == "__main__":
    main()
