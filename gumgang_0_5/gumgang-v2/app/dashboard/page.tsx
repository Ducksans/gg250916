"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";

import { useWebSocket } from "@/contexts/WebSocketContext";
// Chart imports removed - to be implemented later
// Chart imports removed - to be implemented later

export default function DashboardPage() {
  // State
  // Chat state removed - using unified backend

  // 백엔드 기본 URL 및 WS 연결 상태 훅
  const backendBase = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
    [],
  );
  const { isConnected } = useWebSocket();

  // 로컬 상태 및 REST fetch 유틸
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debouncedError, setDebouncedError] = useState<string | null>(null);
  // Debounce error to avoid flicker (500ms)
  useEffect(() => {
    const id = setTimeout(() => setDebouncedError(error), 500);
    return () => clearTimeout(id);
  }, [error]);
  const [systemStats, setSystemStats] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [memoryStatus, setMemoryStatus] = useState<any>(null);
  const [cpuPercent, setCpuPercent] = useState<number>(0);
  const [memTotalBytes, setMemTotalBytes] = useState<number>(0);
  const [memUsedBytes, setMemUsedBytes] = useState<number>(0);

  const checkHealth = async () => {
    setIsLoading(true);
    try {
      const endpoints = ["/health", "/api/v1/health", "/status"];
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${backendBase}${ep}`);
          if (res.ok) {
            setError(null);
            return true;
          }
        } catch {
          // try next endpoint
        }
      }
      setError(`health check failed (tried: ${endpoints.join(", ")})`);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    try {
      const res = await fetch(`${backendBase}/api/dashboard/stats`);
      if (!res.ok) {
        setError(`stats http ${res.status}`);
        return;
      }
      const json = await res.json();
      setSystemStats(json?.stats ?? json);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "stats fetch failed");
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`${backendBase}/api/tasks`);
      if (!res.ok) {
        setError(`tasks http ${res.status}`);
        return;
      }
      const json = await res.json();
      setTasks(json?.tasks ?? []);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "tasks fetch failed");
    }
  };

  const fetchMemoryStatus = async () => {
    try {
      const res = await fetch(`${backendBase}/memory/status`);
      if (!res.ok) {
        setError(`memory status http ${res.status}`);
        return;
      }
      const json = await res.json();
      setMemoryStatus(json);
      setError(null);
    } catch (e: any) {
      setError(e?.message ?? "memory status fetch failed");
    }
  };

  // Stable wrappers to avoid re-creating callbacks (prevents effect thrash)

  const fetchSystemStatsStable = useCallback(
    () => fetchSystemStats(),
    [backendBase],
  );
  const fetchTasksStable = useCallback(() => fetchTasks(), [backendBase]);
  const fetchMemoryStatusStable = useCallback(
    () => fetchMemoryStatus(),
    [backendBase],
  );

  const fetchStatusStable = useCallback(async () => {
    try {
      const res = await fetch(`${backendBase}/status`);
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json?.cpu_percent === "number")
        setCpuPercent(json.cpu_percent);
      if (typeof json?.memory_total === "number")
        setMemTotalBytes(json.memory_total);
      if (typeof json?.memory_used === "number")
        setMemUsedBytes(json.memory_used);
    } catch {
      // ignore transient errors
    }
  }, [backendBase]);
  const memoryUsagePercentage =
    memTotalBytes > 0 ? (memUsedBytes / memTotalBytes) * 100 : 0;
  const [memDisplayPct, setMemDisplayPct] = useState<number>(0);
  useEffect(() => {
    const latest = memoryUsagePercentage;
    setMemDisplayPct((prev) => {
      const next = 0.85 * prev + 0.15 * latest;
      return Math.abs(next - prev) < 0.7 ? prev : next;
    });
  }, [memoryUsagePercentage]);

  // Centralized refresh to avoid overlapping fetches and UI flicker
  const refreshAll = useCallback(async () => {
    try {
      const jobs = [
        fetchSystemStatsStable(),
        fetchStatusStable(),
        fetchTasksStable(),
      ];
      if (!isConnected) {
        jobs.push(fetchMemoryStatusStable());
      }
      await Promise.all(jobs);
    } catch {
      // ignore, individual fetchers set error
    }
  }, [
    fetchSystemStatsStable,
    fetchStatusStable,
    fetchTasksStable,
    fetchMemoryStatusStable,
    isConnected,
  ]);
  const taskCompletionPercentage =
    tasks.length > 0
      ? (tasks.filter((t: any) => t.status === "completed").length /
          tasks.length) *
        100
      : 0;

  // 초기 데이터 로드
  useEffect(() => {
    if (isConnected) {
      refreshAll();
    }
  }, [isConnected, refreshAll]);

  // 주기적 업데이트 (메모리 상태는 WS 기반, REST 폴링 제거)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        refreshAll();
      }
    }, 12000);

    return () => clearInterval(interval);
  }, [isConnected, refreshAll]);

  // 연결 상태 뱃지
  const ConnectionBadge = () => {
    if (!isConnected && !error) {
      return (
        <span className="flex items-center gap-2 px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full text-sm">
          <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
          연결 중...
        </span>
      );
    }
    if (isConnected) {
      return (
        <span className="flex items-center gap-2 px-3 py-1 bg-green-500/20 text-green-500 rounded-full text-sm">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
          연결됨
        </span>
      );
    }
    return (
      <span className="flex items-center gap-2 px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-sm">
        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
        연결 끊김
      </span>
    );
  };

  // 차트 데이터 준비 (WS/unified backend 기준)
  const memoryData = (memoryStatus as any)?.tiers
    ? [
        { name: "임시", value: (memoryStatus as any).tiers.ultra_short },
        { name: "에피소드", value: (memoryStatus as any).tiers.short_term },
        { name: "의미", value: (memoryStatus as any).tiers.medium_term },
        { name: "절차", value: (memoryStatus as any).tiers.long_term },
        { name: "메타", value: (memoryStatus as any).tiers.meta },
      ]
    : (memoryStatus as any)?.memories_by_level
      ? [
          {
            name: "임시",
            value: (memoryStatus as any).memories_by_level.level1 || 0,
          },
          {
            name: "에피소드",
            value: (memoryStatus as any).memories_by_level.level2 || 0,
          },
          {
            name: "의미",
            value: (memoryStatus as any).memories_by_level.level3 || 0,
          },
          {
            name: "절차",
            value: (memoryStatus as any).memories_by_level.level4 || 0,
          },
          {
            name: "메타",
            value: (memoryStatus as any).memories_by_level.level5 || 0,
          },
        ]
      : [];

  const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">금강 2.0 대시보드</h1>
              <p className="text-gray-400">시스템 상태 모니터링</p>
            </div>
            <div className="flex items-center gap-4">
              <ConnectionBadge />
              <button
                onClick={checkHealth}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
                disabled={isLoading}
              >
                {isLoading ? "확인 중..." : "상태 확인"}
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {debouncedError && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-500">오류: {debouncedError}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">CPU 사용률</h3>
            <p className="text-2xl font-bold">
              {Number.isFinite(cpuPercent)
                ? cpuPercent.toFixed(1)
                : (systemStats as any)?.cpu_percent?.toFixed?.(1) || 0}
              %
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3
              className="text-gray-400 text-sm mb-2"
              title="시스템 RAM 사용률(/status 기반)"
            >
              시스템 메모리 사용률
            </h3>
            <p className="text-2xl font-bold">
              {Number.isFinite(memDisplayPct) ? memDisplayPct.toFixed(1) : 0}%
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-gray-400 text-sm mb-2">작업 완료율</h3>
            <p className="text-2xl font-bold">
              {taskCompletionPercentage?.toFixed(1) || 0}%
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg p-6">
            <h3
              className="text-gray-400 text-sm mb-2"
              title="금강 2.0의 기억(메모리) 수량 합계"
            >
              총 기억 항목
            </h3>
            <p className="text-2xl font-bold">
              {(() => {
                const ms: any = memoryStatus as any;
                if (ms?.tiers) {
                  const t = ms.tiers;
                  const arr = [
                    Number(t.ultra_short || 0),
                    Number(t.short_term || 0),
                    Number(t.medium_term || 0),
                    Number(t.long_term || 0),
                    Number(t.meta || 0),
                  ];
                  return arr.reduce((sum, v) => sum + v, 0);
                }
                if (ms?.memories_by_level) {
                  const m = ms.memories_by_level;
                  const arr = [
                    Number(m.level1 || 0),
                    Number(m.level2 || 0),
                    Number(m.level3 || 0),
                    Number(m.level4 || 0),
                    Number(m.level5 || 0),
                  ];
                  return arr.reduce((sum, v) => sum + v, 0);
                }
                return 0;
              })()}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Memory Distribution */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-2">메모리 분포</h2>
            <div className="text-xs text-gray-500 mb-2">AI 기억(5계층)</div>
            <div className="h-[300px] flex flex-col justify-center">
              {memoryData.length > 0 ? (
                <div className="space-y-2">
                  {memoryData.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center gap-2"
                    >
                      <div
                        className="w-4 h-4 rounded"
                        style={{
                          backgroundColor: COLORS[index % COLORS.length],
                        }}
                      />
                      <span className="text-sm text-gray-400">
                        {item.name}:
                      </span>
                      <span className="text-sm font-bold">{item.value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center text-gray-500">
                  데이터 없음
                </div>
              )}
            </div>
          </div>

          {/* Tasks Status */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">작업 상태</h2>
            <div className="space-y-2">
              {tasks && tasks.length > 0 ? (
                tasks.slice(0, 5).map((task: any, index: number) => (
                  <div
                    key={task.task_id ?? task.id ?? index}
                    className="flex justify-between items-center p-2 bg-gray-700 rounded"
                  >
                    <span className="text-sm">
                      {task.task_name ?? task.name ?? "작업"}
                    </span>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        task.status === "completed"
                          ? "bg-green-500/20 text-green-500"
                          : task.status === "in_progress"
                            ? "bg-yellow-500/20 text-yellow-500"
                            : "bg-gray-500/20 text-gray-500"
                      }`}
                    >
                      {task.status}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-gray-500 text-center py-4">작업 없음</div>
              )}
            </div>
          </div>
        </div>

        {/* System Info */}
        {systemStats && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">시스템 정보</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">CPU 코어</p>
                <p className="font-semibold">
                  {(systemStats as any)?.cpu_cores || 0}
                </p>
              </div>
              <div>
                <p
                  className="text-gray-400 text-sm"
                  title="시스템 RAM(/status 기반)"
                >
                  시스템 총 메모리
                </p>
                <p className="font-semibold">
                  {(memTotalBytes > 0
                    ? memTotalBytes / 1024 / 1024 / 1024
                    : ((systemStats as any)?.memory_total || 0) /
                      1024 /
                      1024 /
                      1024
                  ).toFixed(1)}{" "}
                  GB
                </p>
              </div>
              <div>
                <p
                  className="text-gray-400 text-sm"
                  title="시스템 RAM(/status 기반)"
                >
                  시스템 사용 메모리
                </p>
                <p className="font-semibold">
                  {(memUsedBytes > 0
                    ? memUsedBytes / 1024 / 1024 / 1024
                    : ((systemStats as any)?.memory_used || 0) /
                      1024 /
                      1024 /
                      1024
                  ).toFixed(1)}{" "}
                  GB
                </p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">프로세스</p>
                <p className="font-semibold">
                  {(systemStats as any)?.process_count || 0}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
