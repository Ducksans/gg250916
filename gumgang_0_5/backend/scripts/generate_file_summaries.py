import os
import json
import ast

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))

def scan_folder_structure(root_dir):
    structure = {}
    for dirpath, _, filenames in os.walk(root_dir):
        rel_path = os.path.relpath(dirpath, root_dir)
        structure[rel_path] = filenames
    return structure

def summarize_python_file(filepath):
    summary = {"classes": [], "functions": [], "comments": []}
    try:
        with open(filepath, "r", encoding="utf-8") as f:
            source = f.read()

        # AST 분석
        tree = ast.parse(source)
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                summary["functions"].append(node.name)
            elif isinstance(node, ast.ClassDef):
                summary["classes"].append(node.name)

        # 주석 추출
        lines = source.splitlines()
        comments = [line.strip() for line in lines if line.strip().startswith("#")]
        summary["comments"] = comments[:5]
    except Exception as e:
        summary["error"] = str(e)
    return summary

if __name__ == "__main__":
    print(f"📁 금강 자기 구조 인식 시작 → {PROJECT_ROOT}")

    folder_structure = scan_folder_structure(PROJECT_ROOT)
    folder_json_path = os.path.join(PROJECT_ROOT, "backend/data/folder_structure.json")
    os.makedirs(os.path.dirname(folder_json_path), exist_ok=True)
    with open(folder_json_path, "w", encoding="utf-8") as f:
        json.dump(folder_structure, f, indent=2, ensure_ascii=False)
    print(f"✅ 폴더 구조 저장 완료 → {folder_json_path}")

    summaries = {}
    for folder, files in folder_structure.items():
        for file in files:
            if file.endswith(".py"):
                abs_path = os.path.join(PROJECT_ROOT, folder, file)
                summaries[os.path.join(folder, file)] = summarize_python_file(abs_path)

    summary_json_path = os.path.join(PROJECT_ROOT, "backend/data/file_summaries.json")
    with open(summary_json_path, "w", encoding="utf-8") as f:
        json.dump(summaries, f, indent=2, ensure_ascii=False)
    print(f"✅ .py 요약 정보 저장 완료 → {summary_json_path}")
