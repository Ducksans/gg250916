"use client";

import { useState } from "react";

interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  description: string;
}

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("general");
  const [theme, setTheme] = useState("dark");
  const [language, setLanguage] = useState("ko");
  const [autoSave, setAutoSave] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [memoryLevel, setMemoryLevel] = useState(3);
  const [autoApprove, setAutoApprove] = useState(false);

  const sections: SettingsSection[] = [
    {
      id: "general",
      title: "일반",
      icon: "⚙️",
      description: "기본 설정 및 환경설정",
    },
    {
      id: "memory",
      title: "메모리",
      icon: "🧠",
      description: "메모리 시스템 설정",
    },
    {
      id: "evolution",
      title: "진화",
      icon: "🔧",
      description: "자기진화 설정",
    },
    {
      id: "api",
      title: "API",
      icon: "🔌",
      description: "API 키 및 연결 설정",
    },
    {
      id: "advanced",
      title: "고급",
      icon: "🛠️",
      description: "고급 시스템 설정",
    },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <h2 className="text-xl font-semibold">설정</h2>
        <p className="text-sm text-gray-400 mt-1">
          금강 2.0 시스템 환경설정을 관리합니다
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Settings Navigation */}
        <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
          <nav className="space-y-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  activeSection === section.id
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:text-white hover:bg-gray-700"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{section.icon}</span>
                  <div>
                    <div className="font-medium">{section.title}</div>
                    <div className="text-xs opacity-75">
                      {section.description}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Right Panel - Settings Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeSection === "general" && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-6">일반 설정</h3>

              {/* Theme Setting */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  테마
                </label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="dark">다크 모드</option>
                  <option value="light">라이트 모드</option>
                  <option value="auto">시스템 설정 따름</option>
                </select>
              </div>

              {/* Language Setting */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  언어
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ko">한국어</option>
                  <option value="en">English</option>
                </select>
              </div>

              {/* Auto Save */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      자동 저장
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      대화 내용과 설정을 자동으로 저장합니다
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoSave(!autoSave)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoSave ? "bg-blue-600" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoSave ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Notifications */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      알림
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      시스템 알림을 받습니다
                    </p>
                  </div>
                  <button
                    onClick={() => setNotifications(!notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      notifications ? "bg-blue-600" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        notifications ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "memory" && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-6">메모리 설정</h3>

              {/* Default Memory Level */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  기본 메모리 레벨
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="1"
                    max="5"
                    value={memoryLevel}
                    onChange={(e) => setMemoryLevel(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-white font-mono w-8">
                    {memoryLevel}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  새로운 메모리가 저장될 기본 레벨을 설정합니다
                </p>
              </div>

              {/* Memory Retention */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  메모리 보존 기간
                </label>
                <select className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="7">7일</option>
                  <option value="30">30일</option>
                  <option value="90">90일</option>
                  <option value="365">1년</option>
                  <option value="0">무제한</option>
                </select>
              </div>

              {/* Auto Clustering */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      자동 클러스터링
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      유사한 메모리를 자동으로 그룹화합니다
                    </p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-6" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "evolution" && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-6">진화 설정</h3>

              {/* Auto Approve */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      자동 승인
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      낮은 위험도의 변경사항을 자동으로 승인합니다
                    </p>
                  </div>
                  <button
                    onClick={() => setAutoApprove(!autoApprove)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoApprove ? "bg-blue-600" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoApprove ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Risk Level */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  최대 허용 위험도
                </label>
                <select className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="low">낮음</option>
                  <option value="medium">중간</option>
                  <option value="high">높음</option>
                  <option value="critical">치명적</option>
                </select>
              </div>

              {/* Test Coverage Requirement */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  최소 테스트 커버리지
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue="80"
                    className="w-24 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">%</span>
                </div>
              </div>
            </div>
          )}

          {activeSection === "api" && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-6">API 설정</h3>

              {/* OpenAI API Key */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  OpenAI API 키
                </label>
                <input
                  type="password"
                  placeholder="sk-..."
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-2">
                  GPT 모델 사용을 위한 API 키
                </p>
              </div>

              {/* Backend URL */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  백엔드 서버 URL
                </label>
                <input
                  type="url"
                  defaultValue="http://localhost:8001"
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Connection Test */}
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                연결 테스트
              </button>
            </div>
          )}

          {activeSection === "advanced" && (
            <div className="max-w-2xl">
              <h3 className="text-lg font-semibold mb-6">고급 설정</h3>

              <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6">
                <div className="flex items-start gap-3">
                  <span className="text-yellow-400 text-xl">⚠️</span>
                  <div>
                    <p className="text-yellow-400 font-medium">주의</p>
                    <p className="text-yellow-300 text-sm mt-1">
                      고급 설정을 변경하면 시스템이 불안정해질 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>

              {/* Debug Mode */}
              <div className="mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium text-gray-300">
                      디버그 모드
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      상세한 로그와 디버깅 정보를 표시합니다
                    </p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-600">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white translate-x-1" />
                  </button>
                </div>
              </div>

              {/* Cache Size */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  캐시 크기
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    defaultValue="512"
                    className="w-24 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-gray-400">MB</span>
                </div>
              </div>

              {/* Clear Cache Button */}
              <button className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                캐시 지우기
              </button>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-8 pt-6 border-t border-gray-700">
            <div className="flex gap-3">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                변경사항 저장
              </button>
              <button className="px-6 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors">
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
