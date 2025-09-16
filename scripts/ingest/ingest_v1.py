#!/usr/bin/env python3
"""
ingest_v1.py — 초기 인덱션 스캐너(청킹/요약 자리 표시자/계획 로그)
- 실행: python scripts/ingest/ingest_v1.py --root . --out status/evidence/pipelines/ingest_plan.jsonl
- 현재는 HTML/MD 텍스트 추출과 청킹, 메타 수집까지만 수행 (임베딩/DB적재는 후속 단계에서 연결)
"""
import argparse, os, re, json, time, hashlib
from pathlib import Path

INCLUDE_DIRS = [
    'migrated_chat_store.json',
    'LibreChat',
    'gumgang_0_5/memory',
    'ui/snapshots',
    'status',
]
EXCLUDE_PATTERNS = [r"/\.git/", r"/node_modules/", r"/dist/", r"/build/", r"/__pycache__/"]

def should_exclude(p: str) -> bool:
    for pat in EXCLUDE_PATTERNS:
        if re.search(pat, p):
            return True
    return False

def read_text(path: Path) -> str:
    try:
        data = path.read_text(encoding='utf-8', errors='ignore')
        return data
    except Exception:
        return ""

def html_to_text(s: str) -> str:
    # 매우 단순한 제거(후속: 정교한 파서 도입)
    s = re.sub(r"<script[\s\S]*?</script>", " ", s, flags=re.I)
    s = re.sub(r"<style[\s\S]*?</style>", " ", s, flags=re.I)
    s = re.sub(r"<[^>]+>", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s.strip()

def chunk_text(s: str, max_tokens: int = 600, overlap: int = 100) -> list:
    # 토큰 근사: 1토큰≈4문자 가정 (대략), 이후 tokenizer로 대체
    max_chars = max_tokens * 4
    step = max_chars - overlap * 4
    out = []
    i = 0
    while i < len(s):
        out.append(s[i:i+max_chars])
        i += max(step, 1)
    return out

def sha256(s: bytes) -> str:
    return hashlib.sha256(s).hexdigest()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default='.')
    ap.add_argument('--out', default='status/evidence/pipelines/ingest_plan.jsonl')
    args = ap.parse_args()

    root = Path(args.root).resolve()
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    ts = int(time.time()*1000)
    scanned = 0

    with out.open('w', encoding='utf-8') as fw:
        for inc in INCLUDE_DIRS:
            p = (root / inc)
            if not p.exists():
                continue
            paths = []
            if p.is_file():
                paths = [p]
            else:
                for sp in p.rglob('*'):
                    if sp.is_file():
                        paths.append(sp)

            for fp in paths:
                rel = str(fp.relative_to(root))
                if should_exclude('/'+rel):
                    continue
                if fp.stat().st_size > 50*1024*1024:
                    # 대용량: 원문은 아티팩트 경로만 기록
                    rec = {
                        'type': 'artifact_only', 'path': rel,
                        'size': fp.stat().st_size, 'ts': ts,
                    }
                    fw.write(json.dumps(rec, ensure_ascii=False)+"\n")
                    continue

                txt = read_text(fp)
                if not txt:
                    continue
                if fp.suffix.lower() in {'.html', '.htm'}:
                    txt = html_to_text(txt)

                chunks = chunk_text(txt)
                file_id = sha256(rel.encode())
                for idx, ch in enumerate(chunks):
                    rec = {
                        'type': 'chunk_plan',
                        'file': rel,
                        'file_id': file_id,
                        'chunk_index': idx,
                        'chunk_len': len(ch),
                        'hash': sha256(ch.encode()),
                        'suggest': {
                            'summary': True,
                            'keywords': True,
                            'embedding': {'model': 'bge-m3', 'dim': 1024},
                            'store': 'sqlite_or_postgres',
                        },
                        'ts': ts,
                    }
                    fw.write(json.dumps(rec, ensure_ascii=False)+"\n")
                    scanned += 1

    print(f"[OK] ingest plan written: {out} (chunks={scanned})")

if __name__ == '__main__':
    main()

