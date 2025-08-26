import os
import json
import re
from datetime import datetime

ROOT_BACKEND = os.path.abspath(os.path.join(os.path.dirname(__file__), "../"))
ROOT_FRONTEND = os.path.abspath(os.path.join(ROOT_BACKEND, "../frontend"))

def list_files(root_dir):
    file_info = []
    for root, _, files in os.walk(root_dir):
        for f in files:
            full_path = os.path.join(root, f)
            rel_path = os.path.relpath(full_path, ROOT_BACKEND)
            ext = os.path.splitext(f)[1]
            file_info.append({
                "filename": f,
                "path": rel_path.replace("\\", "/"),
                "ext": ext,
                "size": os.path.getsize(full_path),
                "modified": datetime.fromtimestamp(os.path.getmtime(full_path)).isoformat()
            })
    return file_info

def extract_api_calls(frontend_dir):
    api_calls = set()
    pattern = re.compile(r'axios\.(get|post|put|delete)\(["\'](\/[a-zA-Z0-9_\/-]+)["\']')
    for root, _, files in os.walk(frontend_dir):
        for f in files:
            if f.endswith((".js", ".jsx", ".ts", ".tsx")):
                with open(os.path.join(root, f), "r", encoding="utf-8", errors="ignore") as file:
                    try:
                        content = file.read()
                        api_calls.update(pattern.findall(content))
                    except:
                        pass
    return list(set([match[1] for match in api_calls]))

def find_routes(backend_dir):
    routes = []
    pattern = re.compile(r'@router\.(get|post|put|delete)\(["\'](\/[a-zA-Z0-9_\/-]+)["\']')
    for root, _, files in os.walk(backend_dir):
        for f in files:
            if f.endswith(".py"):
                with open(os.path.join(root, f), "r", encoding="utf-8", errors="ignore") as file:
                    try:
                        content = file.read()
                        for match in pattern.findall(content):
                            routes.append(match[1])
                    except:
                        pass
    return list(set(routes))

def analyze_connections(frontend_calls, backend_routes):
    result = []
    for call in frontend_calls:
        result.append({
            "endpoint": call,
            "connected": call in backend_routes
        })
    return result

def main():
    backend_files = list_files(ROOT_BACKEND + "/app")
    frontend_files = list_files(ROOT_FRONTEND + "/src")

    frontend_api_calls = extract_api_calls(ROOT_FRONTEND + "/src")
    backend_routes = find_routes(ROOT_BACKEND + "/app/routes")

    connections = analyze_connections(frontend_api_calls, backend_routes)

    result = {
        "scanned_at": datetime.now().isoformat(),
        "backend_file_count": len(backend_files),
        "frontend_file_count": len(frontend_files),
        "frontend_api_calls": frontend_api_calls,
        "backend_routes": backend_routes,
        "connection_report": connections,
        "backend_files": backend_files,
        "frontend_files": frontend_files
    }

    save_path = os.path.join(ROOT_BACKEND, "data", "structure_full.json")
    os.makedirs(os.path.dirname(save_path), exist_ok=True)

    with open(save_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"✅ 전체 구조 분석 완료 → {save_path}")

if __name__ == "__main__":
    main()
