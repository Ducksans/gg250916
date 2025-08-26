import os
from datetime import datetime

# 📌 금강 2.0 프론트 경로
BASE_DIR = os.path.expanduser("~/바탕화면/gumgang_2_0/renderer")

# 📄 생성할 3개 파일 내용
FILES = {
    "index.html": """<!DOCTYPE html>
<html lang="ko">
  <head><meta charset="UTF-8" /><title>금강 2.0</title></head>
  <body><div id="root"></div><script type="module" src="/renderer.tsx"></script></body>
</html>
""",
    "renderer.tsx": """import React from "react"
import { createRoot } from "react-dom/client"
import App from "./App"

const container = document.getElementById("root")!
const root = createRoot(container)
root.render(<App />)
""",
    "App.tsx": """import React from "react"

export default function App() {
  return (
    <div style={{ padding: "2rem", fontSize: "1.5rem" }}>
      🧠 안녕하세요. 저는 금강 2.0입니다.
    </div>
  )
}
"""
}

def create_frontend_files() -> dict:
    os.makedirs(BASE_DIR, exist_ok=True)
    created = []
    for filename, content in FILES.items():
        path = os.path.join(BASE_DIR, filename)
        with open(path, "w", encoding="utf-8") as f:
            f.write(content)
        created.append(path)

    return {
        "status": "success",
        "message": f"{len(created)}개 파일 생성 완료",
        "files": created,
    }
