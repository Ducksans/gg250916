"use client";

import { useEffect, useState } from "react";
import { gumgangAPI, MemoryStatus as MemoryStatusType } from "@/lib/api/client";
import { useWebSocket } from "@/contexts/WebSocketContext";

export default function MemoryStatus() {
  const [status, setStatus] = useState<MemoryStatusType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { memoryUpdates, isConnected, isConnecting, connectionError } =
    useWebSocket();
  const ENABLE_POLLING =
    process.env.NEXT_PUBLIC_ENABLE_MEMORY_POLLING === "true";

  // Fetch memory status
  const fetchStatus = async () => {
    try {
      const data = await gumgangAPI.getMemoryStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      console.error("Failed to fetch memory status:", err);
      setError("연결 실패 (REST 폴백 사용 가능)");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!ENABLE_POLLING) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 30000);
    return () => clearInterval(interval);
  }, [ENABLE_POLLING]);

  // WebSocket memory-update stream → standard schema(tiers + ts_kst) → legacy shape for UI
  useEffect(() => {
    if (!memoryUpdates || memoryUpdates.length === 0) return;
    const latest = memoryUpdates[memoryUpdates.length - 1];
    const tiers = latest?.tiers;
    if (!tiers) return;
    const total =
      (tiers.ultra_short ?? 0) +
      (tiers.short_term ?? 0) +
      (tiers.medium_term ?? 0) +
      (tiers.long_term ?? 0) +
      (tiers.meta ?? 0);
    setStatus({
      total_memories: total,
      system_type: "5-tier (WS)",
      status: "active",
      memories_by_level: {
        level1: tiers.ultra_short ?? 0,
        level2: tiers.short_term ?? 0,
        level3: tiers.medium_term ?? 0,
        level4: tiers.long_term ?? 0,
        level5: tiers.meta ?? 0,
      },
    } as any);
    setError(null);
    setLoading(false);
  }, [memoryUpdates]);

  // Format number with commas
  const formatNumber = (num: number) => {
    return num.toLocaleString("ko-KR");
  };

  // Get level color
  const getLevelColor = (level: number) => {
    const colors = {
      1: "text-blue-400",
      2: "text-green-400",
      3: "text-yellow-400",
      4: "text-orange-400",
      5: "text-purple-400",
    };
    return colors[level as keyof typeof colors] || "text-gray-400";
  };

  // Get level name
  const getLevelName = (level: number) => {
    const names = {
      1: "임시 기억",
      2: "에피소드",
      3: "의미 기억",
      4: "절차 기억",
      5: "메타인지",
    };
    return names[level as keyof typeof names] || `Level ${level}`;
  };

  if (loading) {
    return (
      <div className="p-4 border-t border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">
          메모리 상태
        </h3>
        <div className="space-y-2">
          <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse w-3/4"></div>
          <div className="h-4 bg-gray-700 rounded animate-pulse w-1/2"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border-t border-gray-700">
        <h3 className="text-sm font-semibold text-gray-400 mb-2">
          메모리 상태
        </h3>
        <div className="text-xs text-red-400 flex items-center gap-2">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>
            {error}
            {connectionError ? ` — ${connectionError}` : ""}
          </span>
        </div>
        <button
          onClick={fetchStatus}
          className="mt-2 text-xs text-gray-400 hover:text-white transition-colors"
        >
          수동 새로고침(REST)
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 border-t border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-400">메모리 상태</h3>
        <div className="flex items-center gap-2">
          {isConnecting ? (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">
              <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
              연결 중...
            </span>
          ) : isConnected ? (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-500/20 text-green-400">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              연결됨
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-red-500/20 text-red-400">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              미연결
            </span>
          )}
          <button
            onClick={fetchStatus}
            className="p-1 hover:bg-gray-700 rounded transition-colors"
            title="수동 새로고침(REST)"
          >
            <svg
              className="w-3 h-3 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      {status && (
        <div className="space-y-2">
          {/* Total Memories */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">총 메모리:</span>
            <span className="text-xs text-gray-300 font-mono">
              {formatNumber(status.total_memories || 0)}
            </span>
          </div>

          {/* System Type */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">시스템:</span>
            <span className="text-xs text-green-400">
              {status.system_type || "5단계"}
            </span>
          </div>

          {/* Status */}
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">상태:</span>
            <div className="flex items-center gap-1">
              {status.status === "active" || status.status === "ready" ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">활성</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs text-yellow-400">
                    {status.status}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Memory Levels */}
          {status.memories_by_level && (
            <div className="mt-3 pt-2 border-t border-gray-700">
              <div className="text-xs text-gray-500 mb-2">레벨별 분포:</div>
              <div className="space-y-1">
                {[1, 2, 3, 4, 5].map((level) => {
                  const key =
                    `level${level}` as keyof typeof status.memories_by_level;
                  const count = status.memories_by_level?.[key] || 0;
                  const percentage =
                    status.total_memories > 0
                      ? Math.round((count / status.total_memories) * 100)
                      : 0;

                  return (
                    <div key={level} className="flex items-center gap-2">
                      <span className={`text-xs ${getLevelColor(level)} w-16`}>
                        L{level}
                      </span>
                      <div className="flex-1 h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${
                            level === 1
                              ? "from-blue-600 to-blue-500"
                              : level === 2
                                ? "from-green-600 to-green-500"
                                : level === 3
                                  ? "from-yellow-600 to-yellow-500"
                                  : level === 4
                                    ? "from-orange-600 to-orange-500"
                                    : "from-purple-600 to-purple-500"
                          } transition-all duration-500`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400 w-12 text-right font-mono">
                        {count > 0 ? formatNumber(count) : "0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Memory Level Legend */}
          <div className="mt-3 pt-2 border-t border-gray-700">
            <details className="text-xs">
              <summary className="text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
                레벨 정보
              </summary>
              <div className="mt-2 space-y-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div key={level} className="flex items-center gap-2">
                    <span className={`${getLevelColor(level)}`}>L{level}:</span>
                    <span className="text-gray-400">{getLevelName(level)}</span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
