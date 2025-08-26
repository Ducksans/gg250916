#!/usr/bin/env bash
# check_llm_health.sh — Stable (v1) health check for OpenAI / Anthropic / Google Gemini
# Requirements: bash, curl, jq
# Env: OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY

set -euo pipefail

say() { printf "%s\n" "$*"; }
hr()  { printf "%0.s-" {1..60}; printf "\n"; }

need() {
  command -v "$1" >/dev/null 2>&1 || { echo "❌ '$1' not found. Please install."; exit 1; }
}

check_openai() {
  hr; say "[OpenAI] Responses API (v1) + models list"
  if [[ -z "${OPENAI_API_KEY:-}" ]]; then say "  ❌ OPENAI_API_KEY 미설정"; return 1; fi

  # 1) 모델 목록 조회
  MODELS_JSON="$(curl -sS https://api.openai.com/v1/models \
    -H "Authorization: Bearer $OPENAI_API_KEY")" || { say "  ❌ 모델 목록 실패"; return 1; }

  # 2) gpt-5 계열 우선 선택
  local candidates=("gpt-5" "gpt-5-large" "gpt-5-mini" "gpt-5-nano" "gpt-5-chat-latest")
  local OPENAI_MODEL=""
  for m in "${candidates[@]}"; do
    if echo "$MODELS_JSON" | jq -e --arg m "$m" '.data[].id | select(. == $m)' >/dev/null 2>&1; then
      OPENAI_MODEL="$m"; break
    fi
  done
  [[ -z "$OPENAI_MODEL" ]] && OPENAI_MODEL="$(echo "$MODELS_JSON" | jq -r '.data[0].id')"

  say "  → 선택 모델: ${OPENAI_MODEL:-미검출}"
  [[ -z "${OPENAI_MODEL:-}" ]] && { say "  ❌ 사용 가능한 모델 없음"; return 1; }

  # 3) ping (Responses API)
  RES="$(curl -sS https://api.openai.com/v1/responses \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(cat <<JSON
{
  "model": "$OPENAI_MODEL",
  "input": "Health check: reply with 'OK'.",
  "max_output_tokens": 16,
  "temperature": 0,
  "reasoning": { "effort": "low" }
}
JSON
)")" || { say "  ❌ 응답 실패"; return 1; }

  # 4) 간단 판독 (output_text 우선, 없으면 choices/output 경로 보조)
  local OUT=""
  OUT="$(echo "$RES" | jq -r 'try .output_text // empty')" || true
  if [[ -z "$OUT" || "$OUT" == "null" ]]; then
    OUT="$(echo "$RES" | jq -r 'try .output[0].content[0].text // empty')" || true
  fi

  if [[ -n "$OUT" && "$OUT" != "null" ]]; then
    say "  ✅ OK | sample: $(echo "$OUT" | head -c 120)"
  else
    say "  ⚠️ 응답 구조 확인 필요"; echo "$RES" | head -c 400; echo
  fi
}

check_anthropic() {
  hr; say "[Anthropic] Messages API (v1) + models list"
  if [[ -z "${ANTHROPIC_API_KEY:-}" ]]; then say "  ❌ ANTHROPIC_API_KEY 미설정"; return 1; fi

  # 1) 모델 목록
  MODELS_JSON="$(curl -sS https://api.anthropic.com/v1/models \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01")" || { say "  ❌ 모델 목록 실패"; return 1; }

  # 2) sonnet 우선
  ANTHROPIC_MODEL="$(echo "$MODELS_JSON" \
    | jq -r '[.data[].id] | (map(select(test("sonnet";"i"))) + .)[0] // empty')"
  [[ -z "$ANTHROPIC_MODEL" ]] && ANTHROPIC_MODEL="$(echo "$MODELS_JSON" | jq -r '.data[0].id')"

  say "  → 선택 모델: ${ANTHROPIC_MODEL:-미검출}"
  [[ -z "${ANTHROPIC_MODEL:-}" ]] && { say "  ❌ 사용 가능한 모델 없음"; return 1; }

  # 3) ping
  RES="$(curl -sS https://api.anthropic.com/v1/messages \
    -H "x-api-key: $ANTHROPIC_API_KEY" \
    -H "anthropic-version: 2023-06-01" \
    -H "Content-Type: application/json" \
    -d "$(cat <<JSON
{
  "model": "$ANTHROPIC_MODEL",
  "max_tokens": 60,
  "temperature": 0,
  "messages": [
    {"role":"user","content":"Health check: reply with 'OK'."}
  ]
}
JSON
)")" || { say "  ❌ 응답 실패"; return 1; }

  local OUT=""
  OUT="$(echo "$RES" | jq -r 'try .content[0].text // empty')" || true
  if [[ -n "$OUT" && "$OUT" != "null" ]]; then
    say "  ✅ OK | sample: $(echo "$OUT" | head -c 120)"
  else
    say "  ⚠️ 응답 구조 확인 필요"; echo "$RES" | head -c 400; echo
  fi
}

check_gemini() {
  hr; say "[Google Gemini] Direct Gemini API (v1) + models.list"
  if [[ -z "${GEMINI_API_KEY:-}" ]]; then say "  ❌ GEMINI_API_KEY 미설정"; return 1; fi

  # 1) 모델 목록 (안정 v1)
  MODELS_JSON="$(curl -sS "https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}")" \
    || { say "  ❌ 모델 목록 실패"; return 1; }

  # 2) 선호: 2.5-pro > 2.0-pro > 2.0-flash > 기타
  GEMINI_MODEL="$(echo "$MODELS_JSON" | jq -r '
    .models[].name
    | select(test("gemini-2\\.5-pro|gemini-2\\.0-pro|gemini-2\\.0-flash"))
    ' | head -n1)"
  [[ -z "$GEMINI_MODEL" ]] && GEMINI_MODEL="$(echo "$MODELS_JSON" | jq -r '.models[0].name')"

  say "  → 선택 모델: ${GEMINI_MODEL:-미검출}"
  [[ -z "${GEMINI_MODEL:-}" ]] && { say "  ❌ 사용 가능한 모델 없음"; return 1; }

  # 3) ping (v1)
  RES="$(curl -sS -X POST \
    "https://generativelanguage.googleapis.com/v1/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}" \
    -H "Content-Type: application/json" \
    -d @- <<'JSON'
{
  "contents": [
    { "role": "user", "parts": [ { "text": "Health check: reply with 'OK'." } ] }
  ],
  "generationConfig": { "maxOutputTokens": 64, "temperature": 0 }
}
JSON
)" || { say "  ❌ 응답 실패"; return 1; }

  local OUT=""
  OUT="$(echo "$RES" | jq -r 'try .candidates[0].content.parts[0].text // empty')" || true
  if [[ -n "$OUT" && "$OUT" != "null" ]]; then
    say "  ✅ OK | sample: $(echo "$OUT" | head -c 120)"
  else
    say "  ⚠️ 응답 구조 확인 필요"; echo "$RES" | head -c 400; echo
  fi
}

main() {
  need curl; need jq
  say "=== LLM Health Check (OpenAI / Anthropic / Gemini — Stable v1) ==="
  check_openai || true
  check_anthropic || true
  check_gemini || true
  hr; say "완료"
}
main
