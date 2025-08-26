# backend/scripts/setup_memory_dirs.py
import os

folders = [
    "memory/sources/docs",
    "memory/sources/theory",
    "memory/sources/wiki",
    "memory/sources/roadmap",
    "memory/sources/chatgpt",
    "memory/sources/structure",
    "memory/logs",
    "memory/vectors",
    "memory/backup_edit_files"
]

for folder in folders:
    os.makedirs(folder, exist_ok=True)
    print(f"📁 생성됨: {folder}")
