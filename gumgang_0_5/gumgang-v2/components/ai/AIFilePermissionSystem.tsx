"use client";

import React, { useState } from "react";
import {
  ShieldCheckIcon,
  TrashIcon,
  PencilIcon,
  FolderPlusIcon,
  CheckCircleIcon,
  XCircleIcon,
  FileTextIcon,
} from "lucide-react";

export interface AIFileOperation {
  id: string;
  type: "create" | "modify" | "delete" | "rename" | "move";
  path: string;
  content?: string;
  newPath?: string;
  timestamp: Date;
  status: "pending" | "approved" | "rejected" | "executed";
  aiContext: string;
  riskLevel: "low" | "medium" | "high";
  preview?: string;
}

interface AIFilePermissionSystemProps {
  operations: AIFileOperation[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onApproveAll: () => void;
  onRejectAll: () => void;
  autoApproveLevel?: "none" | "low" | "medium";
}

export const AIFilePermissionSystem: React.FC<AIFilePermissionSystemProps> = ({
  operations,
  onApprove,
  onReject,
  onApproveAll,
  onRejectAll,
}) => {
  const [expandedOp, setExpandedOp] = useState<string | null>(null);
  const pendingOps = operations.filter((op) => op.status === "pending");

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-red-500 bg-red-50 border-red-200";
      case "medium":
        return "text-yellow-500 bg-yellow-50 border-yellow-200";
      default:
        return "text-green-500 bg-green-50 border-green-200";
    }
  };

  const getOperationIcon = (type: string) => {
    switch (type) {
      case "create":
        return <FolderPlusIcon className="w-5 h-5" />;
      case "modify":
        return <PencilIcon className="w-5 h-5" />;
      case "delete":
        return <TrashIcon className="w-5 h-5" />;
      default:
        return <FileTextIcon className="w-5 h-5" />;
    }
  };

  return (
    <div className="bg-slate-900 rounded-lg border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheckIcon className="w-6 h-6 text-blue-500" />
          <h2 className="text-lg font-semibold text-white">
            AI 파일 작업 승인
          </h2>
          <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
            {pendingOps.length} 대기 중
          </span>
        </div>

        {pendingOps.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={onApproveAll}
              className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg transition-colors"
            >
              모두 승인
            </button>
            <button
              onClick={onRejectAll}
              className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
            >
              모두 거부
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {pendingOps.map((op) => (
          <div
            key={op.id}
            className={`border rounded-lg p-3 ${getRiskColor(op.riskLevel)}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                {getOperationIcon(op.type)}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {op.type.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        op.riskLevel === "high"
                          ? "bg-red-200 text-red-700"
                          : op.riskLevel === "medium"
                            ? "bg-yellow-200 text-yellow-700"
                            : "bg-green-200 text-green-700"
                      }`}
                    >
                      위험도: {op.riskLevel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 font-mono">{op.path}</p>
                  {op.aiContext && (
                    <p className="text-xs text-slate-500 mt-1">
                      AI: {op.aiContext}
                    </p>
                  )}

                  {expandedOp === op.id && op.preview && (
                    <div className="mt-2 p-2 bg-slate-100 rounded text-xs font-mono overflow-x-auto">
                      <pre>{op.preview}</pre>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {op.preview && (
                  <button
                    onClick={() =>
                      setExpandedOp(expandedOp === op.id ? null : op.id)
                    }
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    {expandedOp === op.id ? "숨기기" : "미리보기"}
                  </button>
                )}
                <button
                  onClick={() => onApprove(op.id)}
                  className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onReject(op.id)}
                  className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                >
                  <XCircleIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pendingOps.length === 0 && (
        <div className="text-center py-8 text-slate-500">
          <ShieldCheckIcon className="w-12 h-12 mx-auto mb-3 text-slate-400" />
          <p>대기 중인 파일 작업이 없습니다</p>
        </div>
      )}
    </div>
  );
};

export default AIFilePermissionSystem;
