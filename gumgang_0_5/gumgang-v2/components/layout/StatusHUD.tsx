"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type ServerWsState = "on" | "ready" | "off" | "unknown";

interface StatusResponse {
  status?: string;
  timestamp?: string;
  backend_port?: number;
  frontend_port?: number;
  websocket?: ServerWsState;
  ws_connections?: number;
  // Optional enriched fields (future-safe)
  cpu_percent?: number;
  memory_total?: number; // bytes
  memory_used?: number; // bytes
}

interface StatsResponse {
  status?: string;
  stats?: {
    cpu_percent?: number;
    memory_total?: number; // bytes
    memory_used?: number; // bytes
    [key: string]: any;
  };
  [key: string]: any;
}

function toFixed1(n: number | undefined | null): string {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return v.toFixed(1);
}

function bytesToGB(n: number | undefined | null): number {
  const v = typeof n === "number" && isFinite(n) ? n : 0;
  return v / 1024 / 1024 / 1024;
}

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function StatusHUD({ compact = false }: { compact?: boolean }) {
  const backendBase = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
    [],
  );
  const pollMs = useMemo(() => {
    const raw = Number(process.env.NEXT_PUBLIC_HUD_POLL_MS ?? 12000) || 12000;
    return Math.max(3000, raw);
  }, []);

  // Aggregated state
  const [cpuPercent, setCpuPercent] = useState<number>(0);
  const [memTotalGB, setMemTotalGB] = useState<number>(0);
  const [memUsedGB, setMemUsedGB] = useState<number>(0);
  const [wsState, setWsState] = useState<ServerWsState>("unknown");
  const [wsConnections, setWsConnections] = useState<number>(0);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ticking = useRef(false);

  const fetchStatus = useCallback(async (): Promise<StatusResponse | null> => {
    try {
      const res = await fetch(`${backendBase}/status`, { cache: "no-store" });
      if (!res.ok) throw new Error(`/status http ${res.status}`);
      const json = (await res.json()) as StatusResponse;
      return json;
    } catch (e: any) {
      setError(e?.message ?? "status fetch failed");
      return null;
    }
  }, [backendBase]);

  const fetchStats = useCallback(async (): Promise<StatsResponse | null> => {
    // Phase: Reduce backend polling — no longer call /api/dashboard/stats here.
    return null;
  }, []);

  const refresh = useCallback(async () => {
    if (ticking.current) return;
    ticking.current = true;
    try {
      // Fetch both in parallel
      const [stRes, statsRes] = await Promise.all([
        fetchStatus(),
        fetchStats(),
      ]);

      if (stRes) {
        const ws = (stRes.websocket as ServerWsState) ?? "unknown";
        const wsc = Number(stRes.ws_connections ?? 0);
        setWsState(ws);
        setWsConnections(isFinite(wsc) ? wsc : 0);

        // If backend enriches /status with metrics, prefer them
        if (typeof stRes.cpu_percent === "number") {
          setCpuPercent(stRes.cpu_percent);
        }
        if (
          typeof stRes.memory_total === "number" ||
          typeof stRes.memory_used === "number"
        ) {
          setMemTotalGB(bytesToGB(stRes.memory_total));
          setMemUsedGB(bytesToGB(stRes.memory_used));
        }

        setLastChecked(stRes.timestamp ?? null);
        setError(null);
      }

      if (statsRes) {
        // Prefer /api/dashboard/stats if /status didn't provide metrics
        const s = statsRes.stats ?? {};
        if (typeof s.cpu_percent === "number" && !isFinite(cpuPercent)) {
          setCpuPercent(s.cpu_percent);
        } else if (typeof s.cpu_percent === "number") {
          setCpuPercent(s.cpu_percent);
        }
        if (
          typeof s.memory_total === "number" ||
          typeof s.memory_used === "number"
        ) {
          setMemTotalGB(bytesToGB(s.memory_total));
          setMemUsedGB(bytesToGB(s.memory_used));
        }
        setError(null);
      }
    } finally {
      ticking.current = false;
    }
  }, [fetchStatus, fetchStats, cpuPercent]);

  useEffect(() => {
    // initial fetch
    refresh();
    // interval
    const id = setInterval(refresh, pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  // Derived display
  const cpuText = `${toFixed1(cpuPercent)}%`;
  const memText = `${toFixed1(memUsedGB)}/${toFixed1(memTotalGB)} GB`;
  const wsText =
    wsState === "on"
      ? `on(${wsConnections})`
      : wsState === "ready"
        ? "ready(0)"
        : wsState === "off"
          ? "off"
          : "checking...";

  const baseBadge = compact ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs";

  const Badge = ({
    color,
    children,
    title,
  }: {
    color: "green" | "yellow" | "red" | "slate";
    children: React.ReactNode;
    title?: string;
  }) => {
    const palette =
      color === "green"
        ? "bg-green-500/10 text-green-300 border-green-600/30"
        : color === "yellow"
          ? "bg-yellow-500/10 text-yellow-300 border-yellow-600/30"
          : color === "red"
            ? "bg-red-500/10 text-red-300 border-red-600/30"
            : "bg-slate-500/10 text-slate-300 border-slate-600/30";
    return (
      <span
        className={clsx(
          "inline-flex items-center gap-1 rounded-full border",
          baseBadge,
          palette,
        )}
        title={title}
      >
        {children}
      </span>
    );
  };

  const Dot = ({ color }: { color: string }) => (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  );

  // Color logic
  const cpuColor =
    cpuPercent < 60 ? "green" : cpuPercent < 85 ? "yellow" : "red";
  const memRatio =
    memTotalGB > 0 ? Math.min(100, (memUsedGB / memTotalGB) * 100) : 0;
  const memColor = memRatio < 60 ? "green" : memRatio < 85 ? "yellow" : "red";
  const wsColor =
    wsState === "on" ? "green" : wsState === "ready" ? "yellow" : "red";

  return (
    <div className="flex items-center gap-2">
      {/* CPU */}
      <Badge color={cpuColor as any} title="CPU 사용률">
        <Dot
          color={
            cpuColor === "green"
              ? "#22c55e"
              : cpuColor === "yellow"
                ? "#eab308"
                : "#ef4444"
          }
        />
        <span>CPU: {cpuText}</span>
      </Badge>

      {/* Memory */}
      <Badge color={memColor as any} title="메모리 (사용/총)">
        <Dot
          color={
            memColor === "green"
              ? "#22c55e"
              : memColor === "yellow"
                ? "#eab308"
                : "#ef4444"
          }
        />
        <span>메모리: {memText}</span>
      </Badge>

      {/* WS connections */}
      <Badge
        color={wsColor as any}
        title={
          lastChecked
            ? `서버 상태 확인: ${lastChecked}`
            : "서버 상태 확인 중..."
        }
      >
        <Dot
          color={
            wsColor === "green"
              ? "#22c55e"
              : wsColor === "yellow"
                ? "#eab308"
                : "#ef4444"
          }
        />
        <span>WS(서버): {wsText}</span>
      </Badge>

      {/* Error (optional, small) */}
      {error && (
        <span
          className={clsx(
            "ml-1 rounded px-2 py-0.5 border",
            compact ? "text-[11px]" : "text-xs",
            "bg-red-500/10 text-red-300 border-red-600/30",
          )}
          title={error}
        >
          오류 감지
        </span>
      )}
    </div>
  );
}
