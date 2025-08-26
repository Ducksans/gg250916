import os
import json
from dotenv import load_dotenv  # ✅ 추가
from langchain_chroma import Chroma
from langchain_openai import OpenAIEmbeddings
from tqdm import tqdm

# ✅ 환경변수 로드 (.env에서 OPENAI_API_KEY를 불러옴)
load_dotenv()

# ✅ 탐색 루트 디렉터리 (전체 memory 아래)
ROOT = "backend/memory"

# ✅ Chroma 저장소 탐지 기준 파일들
CHROMA_MARKERS = ["chroma.sqlite3", "chroma-collections.parquet"]

# ✅ 결과 저장 경로
REPORT_JSON = "backend/data/vector_store_scan_report.json"
os.makedirs(os.path.dirname(REPORT_JSON), exist_ok=True)

# ✅ 해시 생성 함수
def hash_text(text):
    import hashlib
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

# ✅ Chroma 저장소 디렉토리 자동 탐색
def find_chroma_dirs(root):
    found = []
    for dirpath, dirnames, filenames in os.walk(root):
        if any(marker in filenames for marker in CHROMA_MARKERS):
            found.append(os.path.abspath(dirpath))
    return found

# ✅ 각 저장소 요약 정리
def summarize_chroma(path):
    try:
        db = Chroma(persist_directory=path, embedding_function=OpenAIEmbeddings())
        raw = db.get()
        docs = raw.get("documents", [])
        metadatas = raw.get("metadatas", [])

        return {
            "path": path,
            "num_documents": len(docs),
            "metadata_keys": list(metadatas[0].keys()) if metadatas else [],
            "examples": [docs[i][:120] for i in range(min(3, len(docs)))],
            "doc_hashes": [hash_text(docs[i]) for i in range(min(10, len(docs)))]
        }

    except Exception as e:
        return {
            "path": path,
            "error": str(e)
        }

# ✅ 전체 실행
def main():
    print("🔍 Chroma 저장소 자동 탐색 중...")
    chroma_dirs = find_chroma_dirs(ROOT)
    print(f"✅ 발견된 저장소 수: {len(chroma_dirs)}개")

    results = []
    for path in tqdm(chroma_dirs):
        results.append(summarize_chroma(path))

    with open(REPORT_JSON, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)

    print(f"\n📦 저장소 점검 보고서 저장 완료 → {REPORT_JSON}")

if __name__ == "__main__":
    main()
