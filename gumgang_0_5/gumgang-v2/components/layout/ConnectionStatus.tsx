"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { useWebSocket } from "@/contexts/WebSocketContext";

type Severity = "success" | "warning" | "error" | "idle";

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean; // 상세 문구 노출 여부
  compact?: boolean; // 더 작은 배지 스타일
}

export default function ConnectionStatus({
  className = "",
  showDetails = true,
  compact = false,
}: ConnectionStatusProps) {
  const {
    isConnected,
    isConnecting,
    connectionError,
    socketId,
    connect,
    disconnect,
  } = useWebSocket();

  // 서버 관점 상태 폴링(Option A) — /status에서 websocket(on/ready/off) + ws_connections 조회
  const backendBase = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
    [],
  );
  const statusPollMs = useMemo(() => {
    const v = Number(process.env.NEXT_PUBLIC_STATUS_POLL_MS ?? 8000);
    return Number.isFinite(v) && v > 0 ? v : 8000;
  }, []);
  const [serverWs, setServerWs] = useState<"on" | "ready" | "off" | "unknown">(
    "unknown",
  );
  const [serverConn, setServerConn] = useState<number>(0);
  const [lastStatusAt, setLastStatusAt] = useState<string | null>(null);

  const fetchServerStatus = useCallback(async () => {
    try {
      const res = await fetch(`${backendBase}/status`);
      if (!res.ok) throw new Error(`http ${res.status}`);
      const json = await res.json();
      setServerWs((json?.websocket as any) ?? "unknown");
      setServerConn(Number(json?.ws_connections ?? 0));
      setLastStatusAt((json?.timestamp as string) ?? null);
    } catch {
      setServerWs("off");
      setServerConn(0);
    }
  }, [backendBase]);

  useEffect(() => {
    fetchServerStatus();
    const id = setInterval(fetchServerStatus, Math.max(3000, statusPollMs));
    return () => clearInterval(id);
  }, [fetchServerStatus, statusPollMs]);

  const { severity, label, message } = useMemo(() => {
    if (isConnecting) {
      return {
        severity: "warning" as Severity,
        label: "연결 확인 중",
        message:
          "백엔드에 연결 중입니다. 네트워크 상태에 따라 약 1–3초가 걸릴 수 있어요.",
      };
    }
    if (isConnected) {
      return {
        severity: "success" as Severity,
        label: "연결됨",
        message:
          socketId && socketId.length > 6
            ? `실시간 연결이 활성화되었습니다 (ID: ${socketId.slice(0, 6)}···)`
            : "실시간 연결이 활성화되었습니다.",
      };
    }
    if (connectionError) {
      return {
        severity: "error" as Severity,
        label: "오류",
        message: `연결 실패: ${connectionError}. 네트워크/서버 상태를 확인한 뒤 다시 시도해 주세요.`,
      };
    }
    return {
      severity: "idle" as Severity,
      label: "미연결",
      message:
        "실시간 연결이 비활성화되어 있습니다. 다시 연결을 시도해 주세요.",
    };
  }, [isConnected, isConnecting, connectionError, socketId]);

  // 서버 배지 표기(서버 관점)
  const serverSeverity: Severity =
    serverWs === "on"
      ? "success"
      : serverWs === "ready"
        ? "warning"
        : serverWs === "off"
          ? "error"
          : "idle";
  const serverLabel =
    serverWs === "on"
      ? `서버 on(${serverConn})`
      : serverWs === "ready"
        ? "서버 ready(0)"
        : serverWs === "off"
          ? "서버 off"
          : "서버 상태 확인 중";
  const serverDetail = lastStatusAt
    ? `서버 상태 확인: ${lastStatusAt}`
    : undefined;

  // 불일치 하이라이트: 클라는 연결됨인데 서버는 on이 아니거나, 반대의 경우
  const mismatch = useMemo(() => {
    if (isConnecting) return false;
    if (isConnected && serverWs !== "on") return true;
    if (!isConnected && serverWs === "on") return true;
    return false;
  }, [isConnected, isConnecting, serverWs]);

  const styles = useMemo(() => {
    const base = {
      container: "inline-flex items-center gap-2 rounded-full border px-3 py-1",
      dot: "w-2 h-2 rounded-full",
      text: "text-xs font-medium",
      detail: "text-[11px] text-gray-400",
      button:
        "pointer-events-auto ml-2 inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] border transition-colors",
    };

    const bySeverity: Record<
      Severity,
      { bg: string; border: string; text: string; dot: string; btn: string }
    > = {
      success: {
        bg: "bg-green-500/10",
        border: "border-green-600/30",
        text: "text-green-300",
        dot: "bg-green-500",
        btn: "border-green-700 text-green-300 hover:bg-green-600/20",
      },
      warning: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-600/30",
        text: "text-yellow-300",
        dot: "bg-yellow-500",
        btn: "border-yellow-700 text-yellow-300 hover:bg-yellow-600/20",
      },
      error: {
        bg: "bg-red-500/10",
        border: "border-red-600/30",
        text: "text-red-300",
        dot: "bg-red-500",
        btn: "border-red-700 text-red-300 hover:bg-red-600/20",
      },
      idle: {
        bg: "bg-gray-600/10",
        border: "border-gray-600/40",
        text: "text-gray-300",
        dot: "bg-gray-400",
        btn: "border-gray-600 text-gray-300 hover:bg-gray-600/20",
      },
    };

    const size = compact
      ? {
          containerPad: "px-2 py-0.5",
          text: "text-[11px]",
          detail: "text-[10px]",
          button: "text-[10px] px-2 py-0.5",
        }
      : {
          containerPad: "px-3 py-1",
          text: "text-xs",
          detail: "text-[11px]",
          button: "text-[11px] px-2 py-1",
        };

    const sv = bySeverity[severity];

    return {
      container: `${base.container} ${size.containerPad} ${sv.bg} ${sv.border}`,
      dot: `${base.dot} ${sv.dot} ${isConnecting ? "animate-pulse" : ""}`,
      text: `${size.text} ${sv.text}`,
      detail: `${size.detail}`,
      button: `${base.button} ${size.button} ${sv.btn}`,
    };
  }, [severity, isConnecting, compact]);

  // 서버 배지용 스타일(서버 severity 기준)
  const serverStyles = useMemo(() => {
    const base = "inline-flex items-center gap-2 rounded-full border px-3 py-1";
    const dot = "w-2 h-2 rounded-full";
    const text = compact ? "text-[11px]" : "text-xs";
    const map: Record<
      Severity,
      { bg: string; border: string; text: string; dot: string }
    > = {
      success: {
        bg: "bg-green-500/10",
        border: "border-green-600/30",
        text: "text-green-300",
        dot: "bg-green-500",
      },
      warning: {
        bg: "bg-yellow-500/10",
        border: "border-yellow-600/30",
        text: "text-yellow-300",
        dot: "bg-yellow-500",
      },
      error: {
        bg: "bg-red-500/10",
        border: "border-red-600/30",
        text: "text-red-300",
        dot: "bg-red-500",
      },
      idle: {
        bg: "bg-gray-600/10",
        border: "border-gray-600/40",
        text: "text-gray-300",
        dot: "bg-gray-400",
      },
    };
    const sv = map[serverSeverity];
    return {
      container: `${base} ${sv.bg} ${sv.border} ${compact ? "px-2 py-0.5" : ""}`,
      dot: `${dot} ${sv.dot}`,
      text: `${text} ${sv.text}`,
    };
  }, [serverSeverity, compact]);

  const handleReconnect = async () => {
    try {
      // 즉시 재연결 시도
      disconnect();
      await connect();
    } catch (_) {
      // UI에서 안내 문구는 connectionError를 통해 표기
    }
  };

  return (
    <div
      className={`pointer-events-none ${className}`}
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-2">
        {/* 배지(클라이언트) */}
        <div className={`${styles.container} pointer-events-auto`}>
          <span className={styles.dot} />
          <span className={styles.text}>
            {isConnecting ? "WS: 연결 확인 중" : `WS(클라): ${label}`}
          </span>
        </div>

        {/* 배지(서버) */}
        <div
          className={`${serverStyles.container} pointer-events-auto ${
            mismatch ? "ring-1 ring-yellow-400" : ""
          }`}
          title={serverDetail || undefined}
        >
          <span className={serverStyles.dot} />
          <span className={serverStyles.text}>WS(서버): {serverLabel}</span>
        </div>

        {/* 상세 문구 + 액션 */}
        {showDetails && (
          <div className="flex items-center gap-2">
            <span className={styles.detail}>{message}</span>
            {serverDetail && (
              <span className={styles.detail}>{serverDetail}</span>
            )}
            {mismatch && (
              <span className={`${styles.detail} text-yellow-300`}>
                클라이언트/서버 상태 불일치 — 네트워크/포트/프록시 확인
              </span>
            )}

            {/* 재연결 버튼: 미연결/오류/연결확인중 상태에서 표기 */}
            {(!isConnected || isConnecting || connectionError) && (
              <button
                type="button"
                onClick={handleReconnect}
                disabled={isConnecting}
                className={styles.button}
                aria-label="웹소켓 다시 연결"
              >
                {isConnecting ? (
                  <>
                    <span className="inline-block w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                    연결 재시도 중…
                  </>
                ) : (
                  <>
                    <svg
                      className="w-3 h-3"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                      <path d="M21 3v6h-6" />
                    </svg>
                    다시 연결
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
