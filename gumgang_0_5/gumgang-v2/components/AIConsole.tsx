"use client";

import React, { useCallback, useState, useEffect, useRef } from "react";
import {
  Send,
  LoaderCircle,
  File,
  ChevronsRight,
  ServerCrash,
  MessageSquare, // Missing import added to fix the ReferenceError
} from "lucide-react";
import { clsx } from "clsx";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
const APPROVE = "GO-ZED-ESCAPE-01";

type AutoCodeResponse = {
  ok: boolean;
  code: number;
  stdout?: string;
  stderr?: string;
  touched?: string[];
  error?: string;
};

type HistoryEntry = {
  id: number;
  type: "prompt" | "response";
  prompt?: string;
  response?: AutoCodeResponse;
};

type Props = {
  selectedFile?: string;
};

// AI 응답을 렌더링하는 전용 서브-컴포넌트
const AIResponse = ({ response }: { response: AutoCodeResponse }) => {
  const output =
    response.stdout || response.stderr || response.error || "(No output)";
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs">
        <span
          className={clsx(
            "font-bold px-2 py-0.5 rounded",
            response.ok
              ? "bg-green-500/20 text-green-300"
              : "bg-red-500/20 text-red-300",
          )}
        >
          {response.ok
            ? `성공 (코드 ${response.code})`
            : `실패 (코드 ${response.code})`}
        </span>
      </div>
      <pre className="whitespace-pre-wrap font-mono text-xs text-[var(--text-secondary)] bg-black/30 p-3 rounded-md max-h-48 overflow-auto">
        {output}
      </pre>
      {response.touched && response.touched.length > 0 && (
        <div>
          <h4 className="text-xs font-bold text-[var(--text-primary)] mb-1">
            변경된 파일 ({response.touched.length})
          </h4>
          <ul className="space-y-1">
            {response.touched.map((file) => (
              <li
                key={file}
                className="flex items-center gap-2 text-xs text-[var(--text-secondary)]"
              >
                <File size={14} />
                <span>{file}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

// 우리의 '소통 패널'의 새로운 모습입니다.
export default function AIConsole({ selectedFile }: Props) {
  const [prompt, setPrompt] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history, loading]);

  const apiRun = useCallback(
    async (currentPrompt: string): Promise<AutoCodeResponse> => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/protocol/autocode/run`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Approve-Code": APPROVE,
          },
          body: JSON.stringify({ task: currentPrompt }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || `HTTP Error ${res.status}`);
        }
        return (await res.json()) as AutoCodeResponse;
      } catch (e: any) {
        return {
          ok: false,
          code: -1,
          error: `네트워크 오류 또는 서버 응답 없음: ${e.message}`,
        };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!prompt.trim() || loading) return;

      const currentPrompt = prompt;

      setHistory((prev) => [
        ...prev,
        { id: Date.now(), type: "prompt", prompt: currentPrompt },
      ]);
      setPrompt("");

      const response = await apiRun(currentPrompt);

      setHistory((prev) => [
        ...prev,
        { id: Date.now() + 1, type: "response", response },
      ]);
    },
    [prompt, loading, apiRun],
  );

  return (
    <div className="h-full flex flex-col bg-[var(--bg-panel)]">
      <div className="flex items-center px-3 text-sm border-b border-[var(--border-default)] h-[40px] flex-shrink-0">
        <div className="flex items-center gap-2 py-2 text-white">
          <MessageSquare size={16} />
          <span>AI 콘솔</span>
        </div>
      </div>
      <div className="flex-1 flex flex-col p-2 overflow-hidden">
        {/* 대화 기록 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 p-2">
          {history.map((entry) => (
            <div key={entry.id} className="flex flex-col text-sm">
              {entry.type === "prompt" && (
                <div className="self-end max-w-[80%]">
                  <div className="bg-blue-600/40 text-white p-3 rounded-lg rounded-br-none">
                    <p>{entry.prompt}</p>
                  </div>
                </div>
              )}
              {entry.type === "response" && entry.response && (
                <div className="self-start max-w-[95%]">
                  <div className="bg-[var(--bg-panel)] p-3 rounded-lg rounded-bl-none border border-[var(--border-default)]">
                    <AIResponse response={entry.response} />
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="self-start">
              <div className="bg-[var(--bg-panel)] p-3 rounded-lg rounded-bl-none border border-[var(--border-default)] flex items-center gap-2">
                <LoaderCircle
                  size={16}
                  className="animate-spin text-[var(--accent-diamond)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">
                  금강이 생각하는 중...
                </span>
              </div>
            </div>
          )}
          {history.length === 0 && !loading && (
            <div className="flex flex-col items-center justify-center h-full text-center text-[var(--text-secondary)]">
              <MessageSquare size={32} className="mb-2" />
              <p>AI 콘솔</p>
              <p className="text-xs">선택된 파일: {selectedFile || "없음"}</p>
            </div>
          )}
        </div>

        {/* 입력창 */}
        <div className="mt-1 p-2 border-t border-[var(--border-default)]">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 bg-[var(--bg-inset)] p-1 rounded-md border border-transparent focus-within:border-[var(--accent-diamond)] transition-colors"
          >
            <ChevronsRight
              size={20}
              className="text-[var(--accent-diamond)] flex-shrink-0 ml-1"
            />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                selectedFile
                  ? `${selectedFile.split("/").pop()}에 대해 지시...`
                  : "AI에게 작업을 지시하세요..."
              }
              className="w-full bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] outline-none text-sm"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="p-2 rounded-md bg-[var(--accent-diamond)]/20 hover:bg-[var(--accent-diamond)]/40 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={16} className="text-[var(--accent-diamond)]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
