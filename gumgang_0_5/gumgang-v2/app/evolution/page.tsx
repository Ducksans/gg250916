"use client";

import React, { useState, useEffect } from "react";
import {
  MonacoEditor,
  MonacoDiffEditor,
} from "@/components/editor/MonacoEditor";
import {
  GitBranch,
  GitCommit,
  GitMerge,
  Activity,
  Code2,
  FileCode2,
  Zap,
  Eye,
  Save,
  History,
  AlertCircle,
  CheckCircle,
  Clock,
  GitCompare,
  Play,
  Pause,
} from "lucide-react";

interface EvolutionEvent {
  id: string;
  timestamp: string;
  type: "mutation" | "optimization" | "adaptation" | "learning";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  changes?: {
    before: string;
    after: string;
    language: string;
    filename: string;
  };
  metrics?: {
    performance?: number;
    efficiency?: number;
    complexity?: number;
  };
  status: "pending" | "in-progress" | "completed" | "failed";
}

export default function EvolutionPage() {
  const [events, setEvents] = useState<EvolutionEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EvolutionEvent | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"editor" | "diff">("diff");
  const [editedCode, setEditedCode] = useState("");
  const [isAutoEvolving, setIsAutoEvolving] = useState(false);
  const [evolutionSpeed, setEvolutionSpeed] = useState(5); // seconds between evolutions

  // 샘플 진화 이벤트 생성
  useEffect(() => {
    const sampleEvents: EvolutionEvent[] = [
      {
        id: "1",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        type: "optimization",
        severity: "high",
        title: "메모리 접근 패턴 최적화",
        description: "반복적인 메모리 조회를 캐싱으로 개선",
        changes: {
          before: `// 이전 코드
async function getMemory(key: string) {
  const memory = await db.query(\`
    SELECT * FROM memories
    WHERE key = $1
  \`, [key]);
  return memory.rows[0];
}

// 매번 DB 조회
for (let i = 0; i < items.length; i++) {
  const data = await getMemory(items[i].key);
  process(data);
}`,
          after: `// 최적화된 코드
const memoryCache = new Map<string, any>();

async function getMemory(key: string) {
  // 캐시 확인
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  const memory = await db.query(\`
    SELECT * FROM memories
    WHERE key = $1
  \`, [key]);

  // 캐시에 저장
  memoryCache.set(key, memory.rows[0]);
  return memory.rows[0];
}

// 배치 조회로 최적화
const keys = items.map(item => item.key);
const memories = await getMemoriesBatch(keys);
memories.forEach(process);`,
          language: "typescript",
          filename: "memory-manager.ts",
        },
        metrics: {
          performance: 85,
          efficiency: 92,
          complexity: 45,
        },
        status: "completed",
      },
      {
        id: "2",
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        type: "mutation",
        severity: "critical",
        title: "자가 학습 알고리즘 개선",
        description: "패턴 인식 정확도를 높이기 위한 뉴럴 네트워크 구조 변경",
        changes: {
          before: `class NeuralNetwork:
    def __init__(self):
        self.layers = [
            Dense(128, activation='relu'),
            Dense(64, activation='relu'),
            Dense(10, activation='softmax')
        ]

    def forward(self, x):
        for layer in self.layers:
            x = layer(x)
        return x`,
          after: `class ImprovedNeuralNetwork:
    def __init__(self):
        self.layers = [
            Dense(256, activation='relu'),
            BatchNormalization(),
            Dropout(0.3),
            Dense(128, activation='relu'),
            BatchNormalization(),
            Dropout(0.2),
            Dense(64, activation='relu'),
            Dense(10, activation='softmax')
        ]
        self.attention = MultiHeadAttention(num_heads=8)

    def forward(self, x):
        # Attention 메커니즘 추가
        x_att = self.attention(x, x)
        x = x + x_att  # Residual connection

        for layer in self.layers:
            x = layer(x)
        return x`,
          language: "python",
          filename: "neural_network.py",
        },
        metrics: {
          performance: 78,
          efficiency: 65,
          complexity: 82,
        },
        status: "completed",
      },
      {
        id: "3",
        timestamp: new Date(Date.now() - 900000).toISOString(),
        type: "adaptation",
        severity: "medium",
        title: "환경 변화 대응",
        description: "새로운 API 엔드포인트 구조에 맞춰 클라이언트 코드 수정",
        changes: {
          before: `// API v1 클라이언트
const apiClient = {
  async getUser(id) {
    return fetch(\`/api/user/\${id}\`);
  },
  async updateUser(id, data) {
    return fetch(\`/api/user/\${id}\`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
};`,
          after: `// API v2 클라이언트 - 자동 적응
const apiClient = {
  baseURL: process.env.API_URL || '/api/v2',

  async getUser(id) {
    return this.request(\`/users/\${id}\`);
  },

  async updateUser(id, data) {
    return this.request(\`/users/\${id}\`, {
      method: 'PATCH',  // PUT에서 PATCH로 변경
      body: JSON.stringify(data),
      headers: {
        'Content-Type': 'application/json',
        'X-API-Version': '2.0'  // 버전 헤더 추가
      }
    });
  },

  async request(endpoint, options = {}) {
    const response = await fetch(
      \`\${this.baseURL}\${endpoint}\`,
      {
        ...options,
        headers: {
          'Authorization': \`Bearer \${this.getToken()}\`,
          ...options.headers
        }
      }
    );

    if (!response.ok) {
      throw new APIError(response);
    }

    return response.json();
  }
};`,
          language: "javascript",
          filename: "api-client.js",
        },
        metrics: {
          performance: 70,
          efficiency: 88,
          complexity: 55,
        },
        status: "in-progress",
      },
      {
        id: "4",
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: "learning",
        severity: "low",
        title: "사용자 패턴 학습",
        description: "자주 사용되는 명령 패턴을 학습하여 예측 정확도 향상",
        status: "pending",
      },
    ];

    setEvents(sampleEvents);
    setSelectedEvent(sampleEvents[0]);
    setEditedCode(sampleEvents[0].changes?.after || "");
  }, []);

  // 자동 진화 시뮬레이션
  useEffect(() => {
    if (!isAutoEvolving) return;

    const interval = setInterval(() => {
      const newEvent: EvolutionEvent = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        type: ["mutation", "optimization", "adaptation", "learning"][
          Math.floor(Math.random() * 4)
        ] as any,
        severity: ["low", "medium", "high", "critical"][
          Math.floor(Math.random() * 4)
        ] as any,
        title: `자동 진화 #${Date.now().toString().slice(-4)}`,
        description: "시스템이 자동으로 개선점을 발견하고 적용했습니다.",
        metrics: {
          performance: Math.floor(Math.random() * 100),
          efficiency: Math.floor(Math.random() * 100),
          complexity: Math.floor(Math.random() * 100),
        },
        status: "completed",
      };

      setEvents((prev) => [newEvent, ...prev]);
    }, evolutionSpeed * 1000);

    return () => clearInterval(interval);
  }, [isAutoEvolving, evolutionSpeed]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "mutation":
        return <GitBranch className="w-4 h-4" />;
      case "optimization":
        return <Zap className="w-4 h-4" />;
      case "adaptation":
        return <GitMerge className="w-4 h-4" />;
      case "learning":
        return <Activity className="w-4 h-4" />;
      default:
        return <GitCommit className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "mutation":
        return "text-purple-400 bg-purple-500/10";
      case "optimization":
        return "text-yellow-400 bg-yellow-500/10";
      case "adaptation":
        return "text-green-400 bg-green-500/10";
      case "learning":
        return "text-blue-400 bg-blue-500/10";
      default:
        return "text-gray-400 bg-gray-500/10";
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500";
      case "high":
        return "bg-orange-500";
      case "medium":
        return "bg-yellow-500";
      case "low":
        return "bg-green-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "in-progress":
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />;
      case "failed":
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const handleSaveChanges = () => {
    if (selectedEvent && selectedEvent.changes) {
      const updatedEvent = {
        ...selectedEvent,
        changes: {
          ...selectedEvent.changes,
          after: editedCode,
        },
      };
      setEvents((prev) =>
        prev.map((e) => (e.id === updatedEvent.id ? updatedEvent : e)),
      );
      setSelectedEvent(updatedEvent);
      alert("변경사항이 저장되었습니다!");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center">
            <GitBranch className="mr-3 text-purple-400" />
            자기진화 시스템
          </h1>
          <p className="text-slate-400">
            시스템이 스스로 학습하고 개선하는 과정을 모니터링합니다
          </p>
        </div>

        {/* 자동 진화 컨트롤 */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 mb-6 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsAutoEvolving(!isAutoEvolving)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                  isAutoEvolving
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-green-500 hover:bg-green-600 text-white"
                }`}
              >
                {isAutoEvolving ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>자동 진화 중지</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>자동 진화 시작</span>
                  </>
                )}
              </button>

              {isAutoEvolving && (
                <div className="flex items-center space-x-2">
                  <span className="text-slate-400">진화 속도:</span>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    value={evolutionSpeed}
                    onChange={(e) => setEvolutionSpeed(Number(e.target.value))}
                    className="w-32"
                  />
                  <span className="text-white">{evolutionSpeed}초</span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-slate-400">활성 진화: </span>
                <span className="text-white font-semibold">
                  {events.filter((e) => e.status === "in-progress").length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-slate-400">총 이벤트: </span>
                <span className="text-white font-semibold">
                  {events.length}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 이벤트 목록 */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 h-[800px] overflow-hidden">
              <div className="p-4 border-b border-slate-700">
                <h2 className="text-lg font-semibold text-white flex items-center">
                  <History className="mr-2 w-5 h-5 text-purple-400" />
                  진화 이벤트
                </h2>
              </div>

              <div className="overflow-y-auto h-[calc(100%-73px)]">
                {events.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => {
                      setSelectedEvent(event);
                      setEditedCode(event.changes?.after || "");
                    }}
                    className={`p-4 border-b border-slate-700 cursor-pointer transition-all hover:bg-slate-700/50 ${
                      selectedEvent?.id === event.id ? "bg-slate-700/70" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div
                        className={`flex items-center space-x-2 px-2 py-1 rounded-lg ${getTypeColor(event.type)}`}
                      >
                        {getTypeIcon(event.type)}
                        <span className="text-xs font-medium capitalize">
                          {event.type}
                        </span>
                      </div>
                      {getStatusIcon(event.status)}
                    </div>

                    <h3 className="text-white font-medium mb-1">
                      {event.title}
                    </h3>
                    <p className="text-slate-400 text-sm mb-2 line-clamp-2">
                      {event.description}
                    </p>

                    <div className="flex items-center justify-between">
                      <div
                        className={`w-2 h-2 rounded-full ${getSeverityColor(event.severity)}`}
                      ></div>
                      <span className="text-xs text-slate-500">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    {event.metrics && (
                      <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                        {event.metrics.performance !== undefined && (
                          <div>
                            <div className="text-slate-500">성능</div>
                            <div className="text-green-400 font-semibold">
                              {event.metrics.performance}%
                            </div>
                          </div>
                        )}
                        {event.metrics.efficiency !== undefined && (
                          <div>
                            <div className="text-slate-500">효율</div>
                            <div className="text-yellow-400 font-semibold">
                              {event.metrics.efficiency}%
                            </div>
                          </div>
                        )}
                        {event.metrics.complexity !== undefined && (
                          <div>
                            <div className="text-slate-500">복잡도</div>
                            <div className="text-purple-400 font-semibold">
                              {event.metrics.complexity}%
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 코드 에디터/Diff 뷰어 */}
          <div className="lg:col-span-2">
            {selectedEvent && selectedEvent.changes ? (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 h-[800px] overflow-hidden">
                <div className="p-4 border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <h2 className="text-lg font-semibold text-white flex items-center">
                        <FileCode2 className="mr-2 w-5 h-5 text-purple-400" />
                        {selectedEvent.changes.filename}
                      </h2>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewMode("diff")}
                          className={`px-3 py-1 rounded-lg text-sm transition-all ${
                            viewMode === "diff"
                              ? "bg-purple-500 text-white"
                              : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                          }`}
                        >
                          <GitCompare className="w-4 h-4 inline mr-1" />
                          비교
                        </button>
                        <button
                          onClick={() => setViewMode("editor")}
                          className={`px-3 py-1 rounded-lg text-sm transition-all ${
                            viewMode === "editor"
                              ? "bg-purple-500 text-white"
                              : "bg-slate-700 text-slate-400 hover:bg-slate-600"
                          }`}
                        >
                          <Code2 className="w-4 h-4 inline mr-1" />
                          편집
                        </button>
                      </div>
                    </div>

                    {viewMode === "editor" && (
                      <button
                        onClick={handleSaveChanges}
                        className="flex items-center space-x-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all"
                      >
                        <Save className="w-4 h-4" />
                        <span>저장</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="h-[calc(100%-73px)]">
                  {viewMode === "diff" ? (
                    <MonacoDiffEditor
                      original={selectedEvent.changes.before}
                      modified={selectedEvent.changes.after}
                      language={selectedEvent.changes.language}
                      height="100%"
                    />
                  ) : (
                    <MonacoEditor
                      value={editedCode}
                      onChange={(value) => setEditedCode(value || "")}
                      language={selectedEvent.changes.language}
                      height="100%"
                      readOnly={false}
                    />
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg border border-slate-700 h-[800px] flex items-center justify-center">
                <div className="text-center">
                  <Eye className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">
                    진화 이벤트를 선택하여 코드 변경사항을 확인하세요
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 통계 카드 */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">변이 횟수</p>
                <p className="text-2xl font-bold text-purple-400">
                  {events.filter((e) => e.type === "mutation").length}
                </p>
              </div>
              <GitBranch className="w-8 h-8 text-purple-400/30" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">최적화 횟수</p>
                <p className="text-2xl font-bold text-yellow-400">
                  {events.filter((e) => e.type === "optimization").length}
                </p>
              </div>
              <Zap className="w-8 h-8 text-yellow-400/30" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">적응 횟수</p>
                <p className="text-2xl font-bold text-green-400">
                  {events.filter((e) => e.type === "adaptation").length}
                </p>
              </div>
              <GitMerge className="w-8 h-8 text-green-400/30" />
            </div>
          </div>

          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">학습 횟수</p>
                <p className="text-2xl font-bold text-blue-400">
                  {events.filter((e) => e.type === "learning").length}
                </p>
              </div>
              <Activity className="w-8 h-8 text-blue-400/30" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
