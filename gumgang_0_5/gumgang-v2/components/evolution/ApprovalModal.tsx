"use client";

import React, { useState, useEffect } from "react";
import { MonacoDiffEditor } from "@/components/editor/MonacoEditor";
import {
  X,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Brain,
  Shield,
  GitCompare,
  MessageSquare,
  Clock,
  BarChart3,
  FileCode2,
  Sparkles,
} from "lucide-react";

interface EvolutionChange {
  id: string;
  title: string;
  description: string;
  type: "optimization" | "feature" | "bugfix" | "refactor" | "security";
  severity: "low" | "medium" | "high" | "critical";
  timestamp: string;
  author: "ai" | "human";
  code: {
    before: string;
    after: string;
    language: string;
    filename: string;
  };
  metrics: {
    performance?: number;
    efficiency?: number;
    complexity?: number;
    security?: number;
    maintainability?: number;
  };
  impact: {
    affected_files: string[];
    affected_functions: string[];
    estimated_risk: "low" | "medium" | "high";
    rollback_available: boolean;
  };
  tests: {
    passed: number;
    failed: number;
    total: number;
    coverage: number;
  };
}

interface ApprovalModalProps {
  isOpen: boolean;
  onClose: () => void;
  change: EvolutionChange | null;
  onApprove: (change: EvolutionChange, comment: string) => void;
  onReject: (change: EvolutionChange, reason: string) => void;
  onRequestChanges: (change: EvolutionChange, feedback: string) => void;
}

export const ApprovalModal: React.FC<ApprovalModalProps> = ({
  isOpen,
  onClose,
  change,
  onApprove,
  onReject,
  onRequestChanges,
}) => {
  const [comment, setComment] = useState("");
  const [selectedAction, setSelectedAction] = useState<
    "approve" | "reject" | "changes" | null
  >(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<string>("");

  useEffect(() => {
    if (change && isOpen) {
      analyzeChange();
    }
  }, [change, isOpen]);

  const analyzeChange = async () => {
    setIsAnalyzing(true);
    // AI 분석 시뮬레이션
    setTimeout(() => {
      const risk = change?.impact.estimated_risk;
      if (risk === "high") {
        setAiRecommendation("⚠️ 높은 위험도 감지. 신중한 검토가 필요합니다.");
      } else if (risk === "medium") {
        setAiRecommendation("📊 중간 위험도. 테스트 결과를 확인하세요.");
      } else {
        setAiRecommendation("✅ 안전한 변경으로 보입니다. 승인 가능합니다.");
      }
      setIsAnalyzing(false);
    }, 1500);
  };

  if (!isOpen || !change) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case "high":
        return "text-red-400 bg-red-500/20";
      case "medium":
        return "text-yellow-400 bg-yellow-500/20";
      case "low":
        return "text-green-400 bg-green-500/20";
      default:
        return "text-gray-400 bg-gray-500/20";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "optimization":
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case "feature":
        return <Sparkles className="w-5 h-5 text-blue-400" />;
      case "bugfix":
        return <Shield className="w-5 h-5 text-green-400" />;
      case "refactor":
        return <GitCompare className="w-5 h-5 text-purple-400" />;
      case "security":
        return <AlertTriangle className="w-5 h-5 text-red-400" />;
      default:
        return <FileCode2 className="w-5 h-5 text-gray-400" />;
    }
  };

  const handleSubmit = () => {
    if (!selectedAction || !change) return;

    switch (selectedAction) {
      case "approve":
        onApprove(change, comment);
        break;
      case "reject":
        onReject(change, comment);
        break;
      case "changes":
        onRequestChanges(change, comment);
        break;
    }

    setComment("");
    setSelectedAction(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-7xl h-[90vh] mx-4 bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600/20 to-pink-600/20 border-b border-slate-700 px-6 py-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {getTypeIcon(change.type)}
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {change.title}
                </h2>
                <p className="text-slate-400 mt-1">{change.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(change.impact.estimated_risk)}`}
                  >
                    위험도: {change.impact.estimated_risk.toUpperCase()}
                  </span>
                  <span className="text-xs text-slate-500">
                    <Clock className="w-3 h-3 inline mr-1" />
                    {new Date(change.timestamp).toLocaleString()}
                  </span>
                  <span className="text-xs text-slate-500">
                    파일: {change.code.filename}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-700 transition-all"
            >
              <X className="w-5 h-5 text-slate-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Code Diff */}
          <div className="flex-1 flex flex-col">
            <div className="px-6 py-3 bg-slate-800/50 border-b border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                <GitCompare className="w-4 h-4" />
                코드 변경사항
              </h3>
            </div>
            <div className="flex-1 overflow-hidden">
              <MonacoDiffEditor
                original={change.code.before}
                modified={change.code.after}
                language={change.code.language}
                height="100%"
                options={{
                  fontSize: 13,
                  minimap: { enabled: false },
                }}
              />
            </div>
          </div>

          {/* Right Panel - Analysis */}
          <div className="w-96 border-l border-slate-700 flex flex-col">
            {/* Metrics */}
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                성능 메트릭스
              </h3>
              <div className="space-y-3">
                {change.metrics.performance !== undefined && (
                  <MetricBar
                    label="성능"
                    value={change.metrics.performance}
                    icon={<Zap className="w-4 h-4" />}
                    color="yellow"
                  />
                )}
                {change.metrics.efficiency !== undefined && (
                  <MetricBar
                    label="효율성"
                    value={change.metrics.efficiency}
                    icon={<Activity className="w-4 h-4" />}
                    color="green"
                  />
                )}
                {change.metrics.complexity !== undefined && (
                  <MetricBar
                    label="복잡도"
                    value={change.metrics.complexity}
                    icon={<Brain className="w-4 h-4" />}
                    color="purple"
                    inverse
                  />
                )}
                {change.metrics.security !== undefined && (
                  <MetricBar
                    label="보안"
                    value={change.metrics.security}
                    icon={<Shield className="w-4 h-4" />}
                    color="blue"
                  />
                )}
              </div>
            </div>

            {/* Test Results */}
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                테스트 결과
              </h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
                  <div className="text-2xl font-bold text-green-400">
                    {change.tests.passed}
                  </div>
                  <div className="text-xs text-slate-400">통과</div>
                </div>
                <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/20">
                  <div className="text-2xl font-bold text-red-400">
                    {change.tests.failed}
                  </div>
                  <div className="text-xs text-slate-400">실패</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>커버리지</span>
                  <span>{change.tests.coverage}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                    style={{ width: `${change.tests.coverage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="px-6 py-4 border-b border-slate-700">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                AI 추천
              </h3>
              {isAnalyzing ? (
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="animate-spin">⚙️</div>
                  <span className="text-sm">분석 중...</span>
                </div>
              ) : (
                <p className="text-sm text-slate-300">{aiRecommendation}</p>
              )}
            </div>

            {/* Impact Analysis */}
            <div className="px-6 py-4 flex-1 overflow-y-auto">
              <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                영향 분석
              </h3>
              <div className="space-y-2">
                <div className="text-xs text-slate-400">
                  <span className="font-medium">영향받는 파일:</span>
                  <ul className="mt-1 space-y-1">
                    {change.impact.affected_files.map((file, idx) => (
                      <li key={idx} className="text-slate-500 ml-2">
                        • {file}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="text-xs text-slate-400">
                  <span className="font-medium">영향받는 함수:</span>
                  <ul className="mt-1 space-y-1">
                    {change.impact.affected_functions.map((func, idx) => (
                      <li key={idx} className="text-slate-500 ml-2">
                        • {func}
                      </li>
                    ))}
                  </ul>
                </div>
                {change.impact.rollback_available && (
                  <div className="text-xs text-green-400 mt-2">✓ 롤백 가능</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="border-t border-slate-700 px-6 py-4 bg-slate-800/50">
          <div className="flex items-start gap-4">
            {/* Comment Input */}
            <div className="flex-1">
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="코멘트를 입력하세요... (선택사항)"
                className="w-full px-4 py-2 bg-slate-900 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 resize-none"
                rows={2}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedAction("changes");
                  handleSubmit();
                }}
                className="px-6 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-all flex items-center gap-2"
              >
                <MessageSquare className="w-4 h-4" />
                수정 요청
              </button>
              <button
                onClick={() => {
                  setSelectedAction("reject");
                  handleSubmit();
                }}
                className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                거절
              </button>
              <button
                onClick={() => {
                  setSelectedAction("approve");
                  handleSubmit();
                }}
                className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-all flex items-center gap-2 shadow-lg"
              >
                <CheckCircle className="w-4 h-4" />
                승인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Metric Bar Component
const MetricBar: React.FC<{
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  inverse?: boolean;
}> = ({ label, value, icon, color, inverse = false }) => {
  const getColorClass = () => {
    const colors = {
      yellow: "from-yellow-500 to-orange-500",
      green: "from-green-500 to-emerald-500",
      purple: "from-purple-500 to-pink-500",
      blue: "from-blue-500 to-cyan-500",
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  const displayValue = inverse ? 100 - value : value;
  const isImproved = inverse ? value < 50 : value > 50;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 flex items-center gap-1">
          {icon}
          {label}
        </span>
        <span
          className={`text-xs font-medium ${isImproved ? "text-green-400" : "text-red-400"} flex items-center gap-1`}
        >
          {isImproved ? (
            <TrendingUp className="w-3 h-3" />
          ) : (
            <TrendingDown className="w-3 h-3" />
          )}
          {value}%
        </span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${getColorClass()} transition-all duration-500`}
          style={{ width: `${displayValue}%` }}
        />
      </div>
    </div>
  );
};

export default ApprovalModal;
