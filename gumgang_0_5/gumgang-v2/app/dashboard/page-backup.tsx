"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  gumgangAPI,
  SystemStatus,
  MemoryStatus,
  UserProfile,
} from "@/lib/api/client";

// Dynamic import for 3D components to avoid SSR issues
const Memory3D = dynamic(() => import("@/components/visualization/Memory3D"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-400">3D 시각화 로딩 중...</p>
      </div>
    </div>
  ),
});

const SystemGrid3D = dynamic(
  () => import("@/components/visualization/SystemGrid3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500 mb-4"></div>
          <p className="text-gray-400">시스템 그리드 로딩 중...</p>
        </div>
      </div>
    ),
  },
);

interface SystemMetric {
  label: string;
  value: string | number;
  change?: number;
  unit?: string;
  status?: "good" | "warning" | "error";
  icon?: string;
}

interface ActivityItem {
  id: string;
  type: "chat" | "memory" | "evolution" | "system";
  description: string;
  timestamp: string;
  icon: string;
}

type TabType = "overview" | "memory3d" | "system3d" | "analytics";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [memoryStatus, setMemoryStatus] = useState<MemoryStatus | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Mock activity data
  const recentActivity: ActivityItem[] = [
    {
      id: "1",
      type: "chat",
      description: "사용자와 대화 세션 시작",
      timestamp: new Date(Date.now() - 300000).toISOString(),
      icon: "💬",
    },
    {
      id: "2",
      type: "memory",
      description: "42개의 새로운 메모리 저장",
      timestamp: new Date(Date.now() - 600000).toISOString(),
      icon: "🧠",
    },
    {
      id: "3",
      type: "evolution",
      description: "API 클라이언트 코드 개선 제안",
      timestamp: new Date(Date.now() - 900000).toISOString(),
      icon: "🔧",
    },
    {
      id: "4",
      type: "system",
      description: "메모리 클러스터링 완료",
      timestamp: new Date(Date.now() - 1200000).toISOString(),
      icon: "⚙️",
    },
    {
      id: "5",
      type: "chat",
      description: "덕산님과 기술 토론",
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      icon: "💬",
    },
  ];

  // Fetch all data
  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [sysStatus, memStatus, profile] = await Promise.all([
        gumgangAPI.getSystemStatus(),
        gumgangAPI.getMemoryStatus(),
        gumgangAPI.getUserProfile("default_user"),
      ]);

      setSystemStatus(sysStatus);
      setMemoryStatus(memStatus);
      setUserProfile(profile);
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh every minute
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Format relative time
  const formatRelativeTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));

    if (minutes < 1) return "방금 전";
    if (minutes < 60) return `${minutes}분 전`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    return `${days}일 전`;
  };

  // System metrics with icons
  const systemMetrics: SystemMetric[] = [
    {
      label: "시스템 상태",
      value: systemStatus?.status === "active" ? "정상" : "점검중",
      status: systemStatus?.status === "active" ? "good" : "warning",
      icon: "🟢",
    },
    {
      label: "총 메모리",
      value: memoryStatus?.total_memories || 0,
      unit: "개",
      change: 5.2,
      icon: "🧠",
    },
    {
      label: "응답 시간",
      value: "124",
      unit: "ms",
      status: "good",
      icon: "⚡",
    },
    {
      label: "학습률",
      value: "92",
      unit: "%",
      change: 3.1,
      icon: "📈",
    },
  ];

  // Tab configuration
  const tabs = [
    { id: "overview" as TabType, label: "개요", icon: "📊" },
    { id: "memory3d" as TabType, label: "메모리 3D", icon: "🧠" },
    { id: "system3d" as TabType, label: "시스템 3D", icon: "🌐" },
    { id: "analytics" as TabType, label: "분석", icon: "📈" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-4"></div>
          <p className="text-gray-400">대시보드 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">시스템 대시보드</h1>
            <p className="text-gray-400 mt-1">금강 2.0 시스템 전체 현황</p>
          </div>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700
              disabled:bg-gray-800 disabled:text-gray-500 transition-colors flex items-center gap-2"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
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
            {refreshing ? "새로고침 중..." : "새로고침"}
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-gray-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 flex items-center gap-2 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-500 text-white"
                  : "border-transparent text-gray-400 hover:text-white"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "overview" && (
          <div className="p-6 overflow-y-auto h-full">
            {/* System Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {systemMetrics.map((metric, index) => (
                <div
                  key={index}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{metric.icon}</span>
                      <span className="text-sm text-gray-400">
                        {metric.label}
                      </span>
                    </div>
                    {metric.status && (
                      <div
                        className={`w-2 h-2 rounded-full ${
                          metric.status === "good"
                            ? "bg-green-500"
                            : metric.status === "warning"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                        } animate-pulse`}
                      />
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-white">
                      {typeof metric.value === "number"
                        ? metric.value.toLocaleString("ko-KR")
                        : metric.value}
                    </span>
                    {metric.unit && (
                      <span className="text-sm text-gray-400">
                        {metric.unit}
                      </span>
                    )}
                  </div>
                  {metric.change !== undefined && (
                    <div
                      className={`flex items-center gap-1 mt-2 text-xs ${
                        metric.change > 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        {metric.change > 0 ? (
                          <path
                            fillRule="evenodd"
                            d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        ) : (
                          <path
                            fillRule="evenodd"
                            d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        )}
                      </svg>
                      <span>{Math.abs(metric.change)}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Memory Distribution */}
              <div className="lg:col-span-2 bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">메모리 분포</h2>
                {memoryStatus?.memories_by_level && (
                  <div className="space-y-4">
                    {[1, 2, 3, 4, 5].map((level) => {
                      const key =
                        `level${level}` as keyof typeof memoryStatus.memories_by_level;
                      const count = memoryStatus.memories_by_level?.[key] || 0;
                      const percentage =
                        memoryStatus.total_memories > 0
                          ? Math.round(
                              (count / memoryStatus.total_memories) * 100,
                            )
                          : 0;
                      const levelNames = {
                        1: "감각 메모리",
                        2: "작업 메모리",
                        3: "단기 메모리",
                        4: "장기 메모리",
                        5: "핵심 메모리",
                      };
                      const levelColors = {
                        1: "from-emerald-600 to-emerald-500",
                        2: "from-blue-600 to-blue-500",
                        3: "from-purple-600 to-purple-500",
                        4: "from-orange-600 to-orange-500",
                        5: "from-red-600 to-red-500",
                      };

                      return (
                        <div key={level}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-400">
                              Level {level} -{" "}
                              {levelNames[level as keyof typeof levelNames]}
                            </span>
                            <span className="text-white font-mono">
                              {count.toLocaleString("ko-KR")} ({percentage}%)
                            </span>
                          </div>
                          <div className="h-6 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full bg-gradient-to-r ${levelColors[level as keyof typeof levelColors]} transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* System Info */}
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                <h2 className="text-lg font-semibold mb-4">시스템 정보</h2>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">백엔드 버전</span>
                    <span className="text-white font-mono">
                      {systemStatus?.backend_version || "v2.0.0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">메모리 시스템</span>
                    <span className="text-white">
                      {systemStatus?.memory_system || "5단계"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ChromaDB</span>
                    <span
                      className={`${systemStatus?.chromadb_status === "connected" ? "text-green-400" : "text-red-400"}`}
                    >
                      {systemStatus?.chromadb_status === "connected"
                        ? "연결됨"
                        : "연결 안됨"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">OpenAI API</span>
                    <span
                      className={`${systemStatus?.openai_status === "connected" ? "text-green-400" : "text-red-400"}`}
                    >
                      {systemStatus?.openai_status === "connected"
                        ? "연결됨"
                        : "연결 안됨"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">가동 시간</span>
                    <span className="text-white">12시간 34분</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-6 bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">최근 활동</h2>
                <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  전체 보기 →
                </button>
              </div>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <span className="text-2xl">{activity.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm text-white">
                        {activity.description}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        activity.type === "chat"
                          ? "bg-blue-900 text-blue-400"
                          : activity.type === "memory"
                            ? "bg-green-900 text-green-400"
                            : activity.type === "evolution"
                              ? "bg-purple-900 text-purple-400"
                              : "bg-gray-700 text-gray-400"
                      }`}
                    >
                      {activity.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "memory3d" && (
          <div className="h-full bg-gray-900">
            <Memory3D />
          </div>
        )}

        {activeTab === "system3d" && (
          <div className="h-full bg-gray-900">
            <SystemGrid3D />
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="p-6 overflow-y-auto h-full">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-lg font-semibold mb-4">📊 고급 분석</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Performance Metrics */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-300">
                    성능 지표
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">처리 속도</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400"
                            style={{ width: "87%" }}
                          ></div>
                        </div>
                        <span className="text-xs text-white">87%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">
                        메모리 효율성
                      </span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-600 to-green-400"
                            style={{ width: "92%" }}
                          ></div>
                        </div>
                        <span className="text-xs text-white">92%</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-400">학습 정확도</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                            style={{ width: "95%" }}
                          ></div>
                        </div>
                        <span className="text-xs text-white">95%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Evolution Stats */}
                <div className="space-y-4">
                  <h3 className="text-md font-medium text-gray-300">
                    진화 통계
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">총 진화 횟수</p>
                      <p className="text-xl font-bold text-white">1,247</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">성공률</p>
                      <p className="text-xl font-bold text-green-400">89.3%</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">코드 개선</p>
                      <p className="text-xl font-bold text-blue-400">423</p>
                    </div>
                    <div className="bg-gray-700 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">자가 학습</p>
                      <p className="text-xl font-bold text-purple-400">824</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* User Profile Card */}
              {userProfile && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h3 className="text-md font-medium text-gray-300 mb-4">
                    사용자 프로필
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400 block mb-1">
                        사용자 ID
                      </span>
                      <span className="text-white font-mono">
                        {userProfile.user_id}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-1">상호작용</span>
                      <span className="text-white">
                        {userProfile.interaction_count}회
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-1">
                        저장된 메모리
                      </span>
                      <span className="text-white">
                        {userProfile.memory_count}개
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block mb-1">
                        마지막 활동
                      </span>
                      <span className="text-white">
                        {userProfile.last_interaction
                          ? formatRelativeTime(userProfile.last_interaction)
                          : "없음"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
