/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/hooks/useGuardrails.js
 * @분석일자: 2025-09-10T17:46Z (UTC) / 2025-09-11 02:46 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - .rules의 UI 가드레일(ST-1206) 규칙이 실제 렌더링 환경에서 잘 지켜지는지 실시간으로 검사하고 경고를 출력하는 커스텀 훅입니다.
 *
 * @핵심역할
 *  - 1. (규칙 검증) 렌더링 완료 후, 실제 DOM 요소의 CSS 속성을 읽어 가드레일 규칙 준수 여부를 확인합니다.
 *  - 2. (경고 출력) 규칙 위반 시, 개발자 콘솔에 상세한 경고 메시지를 출력합니다.
 *  - 3. (조건부 실행) 개발 환경의 '단순 모드'에서만 활성화되어 프로덕션 성능에 영향을 주지 않습니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/A1Dev.jsx`
 *  - (DOM 검사) → `#a1-wrap`, `#gg-threads`, `#chat-msgs`
 *  - (참조) → `.rules` 파일의 `3. UI 가드레일 (ST-1206)`
 *
 * @참고사항
 *  - 'UI 가드레일 규칙 실시간 검증'이라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useState } from "react";

/**
 * ST-1206 Guardrails — development-time assertions
 *
 * What this checks:
 * 1) #a1-wrap is a CSS grid
 * 2) #a1-wrap grid rows resemble: auto minmax(0,1fr) auto (or auto 1fr auto)
 * 3) Exactly two overflow:auto scrollers under #a1: #gg-threads and #chat-msgs
 *
 * Logging:
 * - Logs console.warn for any violations (dev-only by default; see shouldRunGuardrails()).
 *
 * Return shape:
 * - { ok: boolean, issues: string[], details: { scrollers: number, isGrid: boolean, rows: string|null } }
 */

/**
 * Low-level assertion runner. Can be called directly for ad-hoc checks.
 * Returns a result object and (optionally) prints console warnings.
 */
export function runGuardrailAsserts(opts = {}) {
  const {
    log = true,
    checkRows = true,
    checkScrollers = true,
    expectedScrollers = 2,
  } = opts;

  const wrap =
    typeof document !== "undefined" ? document.getElementById("a1-wrap") : null;
  const threads =
    typeof document !== "undefined"
      ? document.getElementById("gg-threads")
      : null;
  const msgs =
    typeof document !== "undefined"
      ? document.getElementById("chat-msgs")
      : null;

  let isGrid = false;
  let rows = null;
  let scrollers = 0;
  const issues = [];

  try {
    const styles = wrap ? getComputedStyle(wrap) : null;
    isGrid = !!(styles && styles.display === "grid");
    rows = styles ? styles.gridTemplateRows?.replace(/\s+/g, " ") : null;

    if (checkScrollers) {
      const count = [threads, msgs].filter(
        (n) => n && getComputedStyle(n).overflow.includes("auto"),
      ).length;
      scrollers = count;
    }

    if (!isGrid) {
      issues.push("#a1-wrap is not grid");
      if (log) console.warn("[A1][guard] #a1-wrap is not grid");
    }

    if (checkRows) {
      const rowsOk =
        rows &&
        rows.includes("auto") &&
        (rows.includes("minmax(0, 1fr)") || rows.includes("1fr"));
      if (!rowsOk) {
        issues.push('#a1-wrap rows not "auto minmax(0,1fr) auto"');
        if (log)
          console.warn(
            '[A1][guard] #a1-wrap rows not "auto minmax(0,1fr) auto"',
          );
      }
    }

    if (checkScrollers && scrollers !== expectedScrollers) {
      issues.push(
        `Expected exactly ${expectedScrollers} scrollers (#gg-threads, #chat-msgs), got ${scrollers}`,
      );
      if (log)
        console.warn(
          "[A1][guard] Expected exactly 2 scrollers (#gg-threads, #chat-msgs), got",
          scrollers,
        );
    }
  } catch (e) {
    issues.push(`Guard assert failed: ${e?.message || String(e)}`);
    if (log) console.warn("[A1][guard] assert failed:", e?.message || e);
  }

  return {
    ok: issues.length === 0,
    issues,
    details: { scrollers, isGrid, rows },
  };
}

/**
 * Decide whether to run guardrails automatically.
 * Default policy:
 * - Run only when body has class "simple" (Simple mode).
 * - Skip if localStorage.gg_env === "prod".
 */
function shouldRunGuardrails() {
  try {
    if (typeof document === "undefined") return false;
    const env = localStorage.getItem("gg_env");
    const isProd = env === "prod";
    const simple = document.body?.classList?.contains("simple");
    return !isProd && !!simple;
  } catch {
    // In doubt, allow in dev contexts
    return true;
  }
}

/**
 * useGuardrails
 * - Runs guardrail assertions once after mount (with a small delay to allow layout to settle).
 * - Returns the last result (for debugging/DevTools inspection).
 *
 * Options:
 * - delayMs: number (default 300)
 * - enabled: boolean (default: auto via shouldRunGuardrails())
 * - log: boolean (default true)
 */
export default function useGuardrails(options = {}) {
  const {
    delayMs = 300,
    enabled = shouldRunGuardrails(),
    log = true,
  } = options;
  const [result, setResult] = useState({ ok: true, issues: [], details: {} });

  useEffect(() => {
    if (!enabled) return;

    const t = setTimeout(
      () => {
        const r = runGuardrailAsserts({ log });
        setResult(r);
      },
      Math.max(0, delayMs),
    );

    return () => clearTimeout(t);
  }, [enabled, delayMs, log]);

  return result;
}
