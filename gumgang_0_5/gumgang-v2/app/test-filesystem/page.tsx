"use client";

import React, { useState } from "react";
import FileExplorer from "../../components/FileExplorer";
import { FileInfo } from "../../hooks/useTauriFileSystem";

export default function TestFileSystemPage() {
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLog((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const handleFileSelect = (file: FileInfo) => {
    setSelectedFile(file);
    addLog(`파일 선택: ${file.name} (${file.is_dir ? "디렉토리" : "파일"})`);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="px-6 py-4">
          <h1 className="text-2xl font-bold text-gray-800">
            Tauri 파일시스템 테스트
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Task: GG-20250108-006 - Tauri 파일시스템 API 통합 테스트
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-hidden">
        <div className="grid grid-cols-3 gap-6 h-full">
          {/* File Explorer */}
          <div className="col-span-2 h-full">
            <FileExplorer
              initialPath="/home/duksan/바탕화면/gumgang_0_5"
              onFileSelect={handleFileSelect}
            />
          </div>

          {/* Side Panel */}
          <div className="space-y-4">
            {/* Selected File Info */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                선택된 파일 정보
              </h3>
              {selectedFile ? (
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">이름: </span>
                    <span className="font-mono">{selectedFile.name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">타입: </span>
                    <span className="font-mono">
                      {selectedFile.is_dir ? "디렉토리" : "파일"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">크기: </span>
                    <span className="font-mono">{selectedFile.size} bytes</span>
                  </div>
                  <div className="break-all">
                    <span className="text-gray-600">경로: </span>
                    <span className="font-mono text-xs">
                      {selectedFile.path}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">파일을 선택하세요</p>
              )}
            </div>

            {/* Activity Log */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-3">활동 로그</h3>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {log.length > 0 ? (
                  log.map((entry, index) => (
                    <div
                      key={index}
                      className="text-xs font-mono text-gray-600 py-1 border-b border-gray-100"
                    >
                      {entry}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">아직 활동이 없습니다</p>
                )}
              </div>
            </div>

            {/* System Info */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-3">시스템 정보</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-600">백엔드: </span>
                  <span className="font-mono">FastAPI (포트 8001)</span>
                </div>
                <div>
                  <span className="text-gray-600">프론트엔드: </span>
                  <span className="font-mono">Tauri + Next.js</span>
                </div>
                <div>
                  <span className="text-gray-600">Task ID: </span>
                  <span className="font-mono">GG-20250108-006</span>
                </div>
                <div>
                  <span className="text-gray-600">Protocol: </span>
                  <span className="font-mono text-green-600">✓ Guard v2.0</span>
                </div>
              </div>
            </div>

            {/* Test Actions */}
            <div className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold text-gray-800 mb-3">테스트 액션</h3>
              <div className="space-y-2">
                <button
                  onClick={() => addLog("테스트 버튼 클릭")}
                  className="w-full px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                >
                  로그 테스트
                </button>
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    addLog("선택 초기화");
                  }}
                  className="w-full px-3 py-2 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                >
                  선택 초기화
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-3">
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>Protocol Guard v2.0 Active</span>
          <span>2025년 8월 8일 - Tauri Integration Test</span>
        </div>
      </footer>
    </div>
  );
}
