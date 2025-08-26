"use client";

import { useState, useEffect } from "react";
import {
  gumgangAPI,
  MemoryItem,
  MemoryStatusStandardized,
  getMemoryStatusStandardized,
} from "@/lib/api/client";

interface MemoryLevel {
  level: number;
  name: string;
  description: string;
  color: string;
  bgColor: string;
  count: number;
}

export default function MemoryPage() {
  const [memoryStatus, setMemoryStatus] =
    useState<MemoryStatusStandardized | null>(null);
  const [memories, setMemories] = useState<MemoryItem[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  const memoryLevels: MemoryLevel[] = [
    {
      level: 1,
      name: "임시 기억",
      description: "단기 작업 메모리, 현재 대화 컨텍스트",
      color: "text-blue-400",
      bgColor: "bg-blue-600",
      count: 0,
    },
    {
      level: 2,
      name: "에피소드 기억",
      description: "최근 상호작용과 대화 내역",
      color: "text-green-400",
      bgColor: "bg-green-600",
      count: 0,
    },
    {
      level: 3,
      name: "의미 기억",
      description: "개념, 사실, 일반 지식",
      color: "text-yellow-400",
      bgColor: "bg-yellow-600",
      count: 0,
    },
    {
      level: 4,
      name: "절차 기억",
      description: "작업 방법과 프로세스",
      color: "text-orange-400",
      bgColor: "bg-orange-600",
      count: 0,
    },
    {
      level: 5,
      name: "메타인지",
      description: "자기 인식과 학습 전략",
      color: "text-purple-400",
      bgColor: "bg-purple-600",
      count: 0,
    },
  ];

  // Fetch memory status
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const status = await getMemoryStatusStandardized();
        setMemoryStatus(status);

        // Update counts in memory levels (standardized tiers)
        if (status.tiers) {
          memoryLevels.forEach((level) => {
            const cnt =
              level.level === 1
                ? status.tiers.ultra_short
                : level.level === 2
                  ? status.tiers.short_term
                  : level.level === 3
                    ? status.tiers.medium_term
                    : level.level === 4
                      ? status.tiers.long_term
                      : status.tiers.meta;
            level.count = cnt || 0;
          });
        }
      } catch (error) {
        console.error("Failed to fetch memory status:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
  }, []);

  // Search memories
  const searchMemories = async () => {
    if (!searchQuery.trim() && selectedLevel === null) return;

    setSearchLoading(true);
    try {
      const results = await gumgangAPI.searchMemories(
        searchQuery,
        selectedLevel || undefined,
      );
      setMemories(results);
    } catch (error) {
      console.error("Memory search failed:", error);
      setMemories([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // Handle search on Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      searchMemories();
    }
  };

  // Format number with commas
  const formatNumber = (num: number) => num.toLocaleString("ko-KR");

  // Calculate percentage for progress bar
  const getPercentage = (count: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">메모리 시스템</h2>
            <p className="text-sm text-gray-400 mt-1">
              5단계 계층적 메모리 구조로 지식을 저장하고 관리합니다
            </p>
          </div>
          {memoryStatus && (
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">총 메모리:</span>
                <span className="text-white font-mono font-semibold">
                  {formatNumber(
                    Object.values(memoryStatus.tiers).reduce(
                      (a, b) => a + b,
                      0,
                    ),
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-xs">KST</span>
                <span className="text-xs font-mono">{memoryStatus.ts_kst}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Memory Levels */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
          <h3 className="text-sm font-semibold text-gray-400 mb-4">
            메모리 레벨
          </h3>

          <div className="space-y-3">
            {memoryLevels.map((level) => {
              const count =
                level.level === 1
                  ? (memoryStatus?.tiers.ultra_short ?? 0)
                  : level.level === 2
                    ? (memoryStatus?.tiers.short_term ?? 0)
                    : level.level === 3
                      ? (memoryStatus?.tiers.medium_term ?? 0)
                      : level.level === 4
                        ? (memoryStatus?.tiers.long_term ?? 0)
                        : (memoryStatus?.tiers.meta ?? 0);
              const percentage = getPercentage(
                count,
                memoryStatus
                  ? Object.values(memoryStatus.tiers).reduce((a, b) => a + b, 0)
                  : 0,
              );

              return (
                <button
                  key={level.level}
                  onClick={() =>
                    setSelectedLevel(
                      level.level === selectedLevel ? null : level.level,
                    )
                  }
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    selectedLevel === level.level
                      ? "bg-gray-700 border-gray-600"
                      : "bg-gray-900 border-gray-700 hover:bg-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 ${level.bgColor} rounded-lg flex items-center justify-center text-white font-bold`}
                      >
                        {level.level}
                      </div>
                      <div>
                        <div className={`font-medium ${level.color}`}>
                          {level.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          Level {level.level}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-400 font-mono">
                      {formatNumber(count)}
                    </span>
                  </div>

                  <p className="text-xs text-gray-500 mb-2">
                    {level.description}
                  </p>

                  {/* Progress Bar */}
                  <div className="h-1 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${level.bgColor} transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>

          {/* Memory Stats */}
          <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <h4 className="text-sm font-semibold text-gray-400 mb-3">통계</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-500">평균 접근 빈도:</span>
                <span className="text-gray-300">12.3/일</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">메모리 효율성:</span>
                <span className="text-green-400">87%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">클러스터링 완료:</span>
                <span className="text-gray-300">342개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">마지막 정리:</span>
                <span className="text-gray-300">2시간 전</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Memory Search & Display */}
        <div className="flex-1 flex flex-col">
          {/* Search Bar */}
          <div className="bg-gray-800 border-b border-gray-700 p-4">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="메모리 검색... (키워드 또는 컨텍스트)"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 pl-10
                    focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
                />
                <svg
                  className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <button
                onClick={searchMemories}
                disabled={searchLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700
                  disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
              >
                {searchLoading ? "검색 중..." : "검색"}
              </button>
              {selectedLevel && (
                <button
                  onClick={() => setSelectedLevel(null)}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  레벨 필터 해제
                </button>
              )}
            </div>

            {/* Quick Filters */}
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-gray-400">빠른 필터:</span>
              <button className="text-xs px-3 py-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
                최근 7일
              </button>
              <button className="text-xs px-3 py-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
                자주 사용됨
              </button>
              <button className="text-xs px-3 py-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
                중요 표시
              </button>
              <button className="text-xs px-3 py-1 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors">
                수정 필요
              </button>
            </div>
          </div>

          {/* Memory Grid/List */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
                  <p className="text-gray-400">메모리 로딩 중...</p>
                </div>
              </div>
            ) : memories.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {memories.map((memory) => (
                  <div
                    key={memory.id}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold
                          ${
                            memory.level === 1
                              ? "bg-blue-600"
                              : memory.level === 2
                                ? "bg-green-600"
                                : memory.level === 3
                                  ? "bg-yellow-600"
                                  : memory.level === 4
                                    ? "bg-orange-600"
                                    : "bg-purple-600"
                          }`}
                        >
                          {memory.level}
                        </div>
                        <span className="text-sm text-gray-400">
                          {`Level ${memory.level}`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {new Date(memory.timestamp).toLocaleDateString("ko-KR")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 line-clamp-3">
                      {memory.content}
                    </p>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>접근: {(memory as any).accessCount || 0}회</span>
                        <span>
                          중요도:{" "}
                          {Math.round(
                            ((memory as any).importance || 0.5) * 100,
                          )}
                          %
                        </span>
                      </div>
                      <button className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
                        자세히 보기 →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="mb-4">
                    <span className="text-6xl">🧠</span>
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-gray-300">
                    {selectedLevel
                      ? `레벨 ${selectedLevel} 메모리`
                      : "메모리를 검색하세요"}
                  </h3>
                  <p className="text-sm text-gray-500">
                    검색어를 입력하거나 왼쪽에서 메모리 레벨을 선택하세요
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
