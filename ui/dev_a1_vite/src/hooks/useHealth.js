/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/hooks/useHealth.js
 * @분석일자: 2025-09-10T17:50Z (UTC) / 2025-09-11 02:50 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - FastAPI 백엔드와 Node.js 브릿지의 헬스 체크 엔드포인트를 호출하여 서버 상태를 확인하는 커스텀 훅입니다.
 *
 * @핵심역할
 *  - 1. (상태 관리) 백엔드와 브릿지 서버의 상태를 'checking', 'ok', 'bad'로 관리합니다.
 *  - 2. (API 호출) 마운트 시 각 헬스 체크 엔드포인트에 GET 요청을 보냅니다.
 *  - 3. (수동 새로고침) `refresh` 함수를 반환하여 수동으로 헬스 체크를 다시 실행할 수 있게 합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/A1Dev.jsx`
 *  - (API 호출) → `/api/health`, `/bridge/api/health`
 *
 * @참고사항
 *  - '서버 헬스 체크'라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import { useEffect, useMemo, useRef, useState } from "react";

/**
 * useHealth
 * - Pings backend and bridge health endpoints and reports status:
 *   "ok" | "bad" | "checking"
 *
 * Defaults
 * - backend:  /api/health        (FastAPI)
 * - bridge:   /bridge/api/health (Node Bridge via Vite proxy)
 *
 * Usage:
 *   const { backend, bridge, refresh } = useHealth();
 *   // or override endpoints:
 *   const { backend, bridge } = useHealth({ backendUrl: "/api/healthz" });
 */
export function useHealth(opts = {}) {
  const { backendUrl = "/api/health", bridgeUrl = "/bridge/api/health" } = opts;

  const [backend, setBackend] = useState("checking"); // "ok" | "bad" | "checking"
  const [bridge, setBridge] = useState("checking"); // "ok" | "bad" | "checking"

  // keep stable refs to abort on unmount
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const doPing = async (url, setter) => {
    try {
      const res = await fetch(url, { method: "GET" });
      if (!mountedRef.current) return;
      setter(res.ok ? "ok" : "bad");
    } catch {
      if (!mountedRef.current) return;
      setter("bad");
    }
  };

  const refresh = useMemo(() => {
    return () => {
      setBackend("checking");
      setBridge("checking");
      doPing(backendUrl, setBackend);
      doPing(bridgeUrl, setBridge);
    };
  }, [backendUrl, bridgeUrl]);

  useEffect(() => {
    refresh();
    // no deps: initial ping on mount; manual refresh via returned function
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { backend, bridge, refresh };
}

export default useHealth;
