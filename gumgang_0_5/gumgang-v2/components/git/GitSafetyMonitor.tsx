"use client";

import React, { useState, useEffect } from "react";
import {
  GitBranch,
  GitCommit,
  Save,
  RotateCcw,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
  Archive,
  HardDrive,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Activity,
  Zap,
  Info,
} from "lucide-react";

interface GitStatus {
  branch: string;
  isDetached: boolean;
  uncommittedFiles: number;
  untrackedFiles: number;
  lastCommit: string;
  lastCommitMessage: string;
  lastCommitTime: string;
  totalCommits: number;
  isDirty: boolean;
  backupExists: boolean;
  remotes: string[];
}

interface Checkpoint {
  id: string;
  message: string;
  time: string;
  date: string;
  risk?: "S" | "C" | "D";
  filesChanged?: number;
}

interface GitStats {
  added: number;
  modified: number;
  deleted: number;
  untracked: number;
}

const GitSafetyMonitor: React.FC = () => {
  const [gitStatus, setGitStatus] = useState<GitStatus | null>(null);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveInterval] = useState(5);
  const [isCreatingCheckpoint, setIsCreatingCheckpoint] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<string | null>(
    null,
  );
  const [gitStats, setGitStats] = useState<GitStats>({
    added: 0,
    modified: 0,
    deleted: 0,
    untracked: 0,
  });
  const [expandedSections, setExpandedSections] = useState({
    status: true,
    controls: true,
    timeline: true,
    backup: false,
  });

  // Git 상태 폴링
  useEffect(() => {
    const fetchGitStatus = async () => {
      try {
        const response = await fetch("http://localhost:8001/api/git/status");
        if (response.ok) {
          const data = await response.json();
          setGitStatus(data);
        }
      } catch (error) {
        console.error("Failed to fetch git status:", error);
      }
    };

    fetchGitStatus();
    const interval = setInterval(fetchGitStatus, 5000); // 5초마다 갱신

    return () => clearInterval(interval);
  }, []);

  // 체크포인트 목록 가져오기
  useEffect(() => {
    const fetchCheckpoints = async () => {
      try {
        const response = await fetch(
          "http://localhost:8001/api/git/checkpoints?limit=10",
        );
        if (response.ok) {
          const data = await response.json();
          setCheckpoints(data);
        }
      } catch (error) {
        console.error("Failed to fetch checkpoints:", error);
      }
    };

    fetchCheckpoints();
    const interval = setInterval(fetchCheckpoints, 10000); // 10초마다 갱신

    return () => clearInterval(interval);
  }, []);

  // Git 통계 가져오기
  useEffect(() => {
    const fetchGitStats = async () => {
      try {
        const response = await fetch("http://localhost:8001/api/git/stats");
        if (response.ok) {
          const data = await response.json();
          setGitStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch git stats:", error);
      }
    };

    if (gitStatus?.isDirty) {
      fetchGitStats();
    }
  }, [gitStatus?.isDirty]);

  // 체크포인트 생성
  const createCheckpoint = async (message?: string) => {
    setIsCreatingCheckpoint(true);
    try {
      const response = await fetch("http://localhost:8001/api/git/checkpoint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message:
            message ||
            `Manual checkpoint at ${new Date().toLocaleTimeString()}`,
          risk: analyzeRisk(),
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Checkpoint created:", result);
        // 체크포인트 목록 새로고침
        const checkpointsResponse = await fetch(
          "http://localhost:8001/api/git/checkpoints?limit=10",
        );
        if (checkpointsResponse.ok) {
          setCheckpoints(await checkpointsResponse.json());
        }
      }
    } catch (error) {
      console.error("Failed to create checkpoint:", error);
    } finally {
      setIsCreatingCheckpoint(false);
    }
  };

  // 롤백 실행
  const rollback = async (target: string) => {
    if (
      !window.confirm(
        `정말로 ${target}로 롤백하시겠습니까? 현재 변경사항이 손실됩니다.`,
      )
    ) {
      return;
    }

    setIsRollingBack(true);
    try {
      const response = await fetch("http://localhost:8001/api/git/rollback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Rollback completed:", result);
        window.location.reload(); // 페이지 새로고침
      }
    } catch (error) {
      console.error("Failed to rollback:", error);
    } finally {
      setIsRollingBack(false);
    }
  };

  // 위험도 분석
  const analyzeRisk = (): "S" | "C" | "D" => {
    if (!gitStats) return "S";

    if (gitStats.deleted > 10) return "D";
    if (gitStats.deleted > 5) return "C";
    if (gitStats.modified + gitStats.added > 50) return "D";
    if (gitStats.modified + gitStats.added > 20) return "C";

    return "S";
  };

  // 자동 저장 토글
  const toggleAutoSave = async () => {
    const newState = !autoSaveEnabled;
    setAutoSaveEnabled(newState);

    try {
      await fetch("http://localhost:8001/api/git/autosave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: newState, interval: autoSaveInterval }),
      });
    } catch (error) {
      console.error("Failed to toggle autosave:", error);
    }
  };

  // 백업 저장소로 푸시
  const pushToBackup = async () => {
    try {
      const response = await fetch("http://localhost:8001/api/git/backup", {
        method: "POST",
      });

      if (response.ok) {
        console.log("Pushed to backup repository");
      }
    } catch (error) {
      console.error("Failed to push to backup:", error);
    }
  };

  // USB 아카이브
  const archiveToUSB = async () => {
    const usbPath = prompt("USB 드라이브 경로를 입력하세요:", "/media/usb");
    if (!usbPath) return;

    try {
      const response = await fetch("http://localhost:8001/api/git/archive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: usbPath }),
      });

      if (response.ok) {
        console.log("Archived to USB");
      }
    } catch (error) {
      console.error("Failed to archive to USB:", error);
    }
  };

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case "S":
        return "text-green-500";
      case "C":
        return "text-yellow-500";
      case "D":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };

  const getRiskEmoji = (risk?: string) => {
    switch (risk) {
      case "S":
        return "✅";
      case "C":
        return "⚠️";
      case "D":
        return "🚨";
      default:
        return "📌";
    }
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  if (!gitStatus) {
    return (
      <div className="bg-gray-900 text-white rounded-lg p-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 animate-spin" />
          <span className="text-sm">Git 상태 로딩 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 text-white rounded-lg shadow-xl">
      {/* Header */}
      <div className="bg-gray-800 p-3 rounded-t-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          <span className="font-bold">Git Safety Monitor</span>
        </div>
        <div className="flex items-center gap-2">
          {gitStatus.backupExists && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          <GitBranch className="w-4 h-4 text-gray-400" />
        </div>
      </div>

      {/* Git Status Section */}
      <div className="border-b border-gray-700">
        <button
          onClick={() => toggleSection("status")}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            <span className="font-medium">Git 상태</span>
          </div>
          {expandedSections.status ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {expandedSections.status && (
          <div className="px-4 pb-3 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">브랜치:</span>
              <span className="font-mono">{gitStatus.branch}</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">마지막 커밋:</span>
              <span className="font-mono text-xs">{gitStatus.lastCommit}</span>
            </div>

            {gitStatus.isDirty && (
              <div className="bg-yellow-900/20 border border-yellow-700 rounded p-2 mt-2">
                <div className="flex items-center gap-2 text-yellow-400 text-sm">
                  <AlertTriangle className="w-4 h-4" />
                  <span>커밋되지 않은 변경사항</span>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                  <div>수정: {gitStats.modified}개</div>
                  <div>추가: {gitStats.added}개</div>
                  <div>삭제: {gitStats.deleted}개</div>
                  <div>추적 안 됨: {gitStats.untracked}개</div>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mt-2">
              총 {gitStatus.totalCommits}개 커밋 | {gitStatus.lastCommitTime}
            </div>
          </div>
        )}
      </div>

      {/* Controls Section */}
      <div className="border-b border-gray-700">
        <button
          onClick={() => toggleSection("controls")}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4" />
            <span className="font-medium">제어판</span>
          </div>
          {expandedSections.controls ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {expandedSections.controls && (
          <div className="p-4 space-y-3">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => createCheckpoint()}
                disabled={isCreatingCheckpoint}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-700 px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {isCreatingCheckpoint ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                즉시 저장
              </button>

              <button
                onClick={() => rollback("HEAD~1")}
                disabled={isRollingBack}
                className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
              >
                {isRollingBack ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4" />
                )}
                이전으로
              </button>
            </div>

            {/* Auto Save Toggle */}
            <div className="bg-gray-800 rounded p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">자동 저장</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={toggleAutoSave}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
              {autoSaveEnabled && (
                <div className="mt-2 text-xs text-gray-400">
                  {autoSaveInterval}초마다 자동 체크포인트 생성
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Timeline Section */}
      <div className="border-b border-gray-700">
        <button
          onClick={() => toggleSection("timeline")}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <GitCommit className="w-4 h-4" />
            <span className="font-medium">체크포인트 타임라인</span>
          </div>
          {expandedSections.timeline ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {expandedSections.timeline && (
          <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
            {checkpoints.map((checkpoint, index) => (
              <div
                key={checkpoint.id}
                className={`relative flex items-start gap-3 p-2 rounded hover:bg-gray-800 cursor-pointer transition-colors ${
                  selectedCheckpoint === checkpoint.id ? "bg-gray-800" : ""
                }`}
                onClick={() => setSelectedCheckpoint(checkpoint.id)}
              >
                {/* Timeline Line */}
                {index < checkpoints.length - 1 && (
                  <div className="absolute left-5 top-8 bottom-0 w-0.5 bg-gray-700" />
                )}

                {/* Checkpoint Icon */}
                <div className={`mt-0.5 ${getRiskColor(checkpoint.risk)}`}>
                  {getRiskEmoji(checkpoint.risk)}
                </div>

                {/* Checkpoint Info */}
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono">{checkpoint.id}</span>
                    <span className="text-xs text-gray-500">
                      {checkpoint.time}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300 mt-1">
                    {checkpoint.message}
                  </div>
                  {checkpoint.filesChanged && (
                    <div className="text-xs text-gray-500 mt-1">
                      {checkpoint.filesChanged} 파일 변경
                    </div>
                  )}

                  {/* Rollback Button */}
                  {selectedCheckpoint === checkpoint.id && index > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        rollback(checkpoint.id);
                      }}
                      className="mt-2 bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      여기로 롤백
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Backup Section */}
      <div>
        <button
          onClick={() => toggleSection("backup")}
          className="w-full p-3 flex items-center justify-between hover:bg-gray-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Archive className="w-4 h-4" />
            <span className="font-medium">백업 & 아카이브</span>
          </div>
          {expandedSections.backup ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>

        {expandedSections.backup && (
          <div className="p-4 space-y-2">
            <button
              onClick={pushToBackup}
              className="w-full bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <HardDrive className="w-4 h-4" />
              로컬 백업 저장소로 푸시
            </button>

            <button
              onClick={archiveToUSB}
              className="w-full bg-gray-700 hover:bg-gray-600 px-3 py-2 rounded text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <Archive className="w-4 h-4" />
              USB로 아카이브
            </button>

            {gitStatus.backupExists && (
              <div className="text-xs text-gray-500 text-center mt-2">
                백업 저장소: ~/바탕화면/gumgang_backup.git
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-800 px-4 py-2 rounded-b-lg flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>Git Safety Guard v1.0</span>
        </div>
        <div className="flex items-center gap-2">
          {gitStatus.remotes.map((remote) => (
            <span key={remote} className="px-2 py-0.5 bg-gray-700 rounded">
              {remote}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GitSafetyMonitor;
