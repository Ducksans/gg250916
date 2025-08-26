#!/usr/bin/env bash
# 🚩 Gumgang 2.0 — WS 최소계약 v0.1 확정·봉인 (WRITE: 문서만)
# 목적: docs/ws_schema_v0.1.yaml 생성 → 해시 봉인 → watchlist 반영 → 간이 린트
# 규칙: .rules 불가침, 코드 미변경, KST 타임스탬프 사용
set -euo pipefail

ROOT="/home/duksan/바탕화면/gumgang_0_5"
DOCS="${ROOT}/docs"
META="${DOCS}/_canon.meta.json"
PCONF="${ROOT}/protocol_config_v3.json"
TS="$(TZ=Asia/Seoul date '+%Y-%m-%d %H:%M')"
WSYAML="${DOCS}/ws_schema_v0.1.yaml"
WSJSON="${DOCS}/websocket_schema_v0.1.json"  # 있으면 함께 봉인

echo "[ASK APPROVAL] WS 최소 이벤트/페이로드(v0.1)를 문서로 확정·봉인하고, watchlist에 등록합니다. 진행할까요? (yes/no)"
read -r APPROVE
if [[ "${APPROVE:-no}" != "yes" && "${APPROVE:-no}" != "y" ]]; then
  echo "중단합니다."; exit 0
fi

mkdir -p "${DOCS}"

# 1) WS 스키마 YAML 생성(문서 고정, 코드 미수정)
cat > "${WSYAML}" <<'YAML'
version: "0.1"
sealed_at_tz: "KST"
timestamp_format: "YYYY-MM-DD HH:mm"
required_headers:
  - "X-Rules-Id"
  - "X-Rules-Hash"
contracts:
  require_rules_headers: true
  event_name_immutable: true         # 이벤트 이름은 절대 변경 금지(추가만 허용)
  payload_changes: "additive_only"   # 필드 추가만 허용, 필드 삭제/축소는 메이저 변경
  perf_guards:
    fps_min: 60
    nodes_max: 2000
    first_paint_sec_max: 2
events:
  - name: "metrics"
    direction: "server->client"
    summary: "런타임 지표 스트림"
    payload:
      ts: "YYYY-MM-DD HH:mm"
      cpu_pct: number
      mem_mb: number
      gpu_util_pct?: number
      tokens?:
        in: number
        out: number

  - name: "memory-update"
    direction: "server->client"
    summary: "기억 계층 변경/집계 알림"
    payload:
      ts: "YYYY-MM-DD HH:mm"
      tier: ["ultra-short","short","mid","long","ultra-long"]
      op: ["insert","update","evict","summarize"]
      key: string
      meta?: object

  - name: "notification"
    direction: "server->client"
    summary: "알림/상태 변경"
    payload:
      ts: "YYYY-MM-DD HH:mm"
      level: ["info","warn","error","success"]
      code: string
      message: string
      ref?: string

  - name: "selection-3d"
    direction: "client->server"
    summary: "3D 뷰어 상행 선택 이벤트"
    payload:
      ts: "YYYY-MM-DD HH:mm"
      kind: ["node","edge"]
      id: string
      action: ["select","hover","focus"]
      viewport?:
        cam_pos: [number, number, number]
        cam_dir: [number, number, number]
YAML

# 2) 해시 계산 및 메타/워치리스트 반영
python3 - <<PY
import json, hashlib, pathlib, sys
root=pathlib.Path("${ROOT}")
docs=root/"docs"
meta_path=docs/"_canon.meta.json"
pconf_path=root/"protocol_config_v3.json"

def sha12(p: pathlib.Path):
    h = hashlib.sha256(p.read_bytes()).hexdigest()
    return h, h[:12]

# 대상 파일들(YAML은 필수, JSON은 있으면 추가 봉인)
targets=[]
yml=docs/"ws_schema_v0.1.yaml"
targets.append(yml)
jsn=docs/"websocket_schema_v0.1.json"
if jsn.exists():
    targets.append(jsn)

# 메타 갱신
meta={"sealed_at_kst":"${TS}","docs":[]}
if meta_path.exists():
    try: meta=json.loads(meta_path.read_text(encoding="utf-8"))
    except Exception: pass
by_path={d["path"]:d for d in meta.get("docs",[]) if isinstance(d,dict) and "path" in d}

for p in targets:
    h, h12 = sha12(p)
    by_path[str(p.relative_to(root))] = {
        "path": str(p.relative_to(root)),
        "title": p.name,
        "version": "0.1" if p.suffix in (".yaml",".yml",".json") else "",
        "hash_sha256": h,
        "hash12": h12
    }

meta["sealed_at_kst"]="${TS}"
meta["docs"]=list(by_path.values())
meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

# watchlist 갱신
pconf={"canon_docs":[]}
if pconf_path.exists():
    try: pconf=json.loads(pconf_path.read_text(encoding="utf-8"))
    except Exception: pass

def set_watch(path, hash12):
    # dict 형태로 정규화
    found=False
    for it in pconf.get("canon_docs", []):
        if isinstance(it, dict) and it.get("path")==path:
            it["hash12"]=hash12; found=True; break
    if not found:
        pconf.setdefault("canon_docs", []).append({"path":path, "hash12":hash12})

for p in targets:
    h, h12 = sha12(p)
    set_watch(str(p.relative_to(root)), h12)

pconf_path.write_text(json.dumps(pconf, ensure_ascii=False, indent=2), encoding="utf-8")

# 출력 요약
for p in targets:
    h, h12 = sha12(p)
    print(f"SEALED {p.relative_to(root)} {h12}")
PY

# 3) 간이 린트(외부 도구 없이 확인)
echo "→ 간이 린트 실행"
grep -q '^version:' "${WSYAML}" && \
grep -q '^events:'  "${WSYAML}" && \
grep -q 'require_rules_headers: true' "${WSYAML}" && \
grep -q 'name: "metrics"' "${WSYAML}" && \
grep -q 'name: "memory-update"' "${WSYAML}" && \
grep -q 'name: "notification"' "${WSYAML}" && \
grep -q 'name: "selection-3d"' "${WSYAML}" && \
echo "WS schema sanity OK" || { echo "WS schema sanity FAILED"; exit 2; }

echo
echo "=== WS 최소계약 확정 요약(KST ${TS}) ==="
echo "- 생성: ${WSYAML}"
[[ -f "${WSJSON}" ]] && echo "- 기존 JSON도 메타/워치리스트에 등록: ${WSJSON}"
echo "- 메타: ${META}"
echo "- Watchlist: ${PCONF} (canon_docs)"
echo
echo "[DONE] WS 최소계약 v0.1 문서 확정·봉인 완료. 다음 단계: policy_model.md 핵심 규칙 고정 → guard_validate_all.sh 스켈레톤."
