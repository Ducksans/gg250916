"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";

/**
 * CheckpointModal
 * - Header 버튼 + 모달
 * - Phase 2 API (/api/protocol/checkpoint, /api/protocol/audit/tail) 연동
 * - 필수: task_id, notes
 * - 선택: operation, paths, risk, actor
 *
 * 사용법:
 * <CheckpointModal />
 */
type Operation = "edit" | "create" | "mkdir" | "mv" | "checkpoint";
type Risk = "SAFE" | "CAUTION" | "DANGEROUS";

interface TailResponse {
  ts_kst: string;
  lines: string[];
  count: number;
  error?: string;
}

interface CheckpointResponse {
  ts_kst?: string;
  task_id?: string;
  operation?: string;
  paths?: string[];
  audit_appended?: number;
  manifest_modified?: boolean;
  error?: string;
}

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function parsePaths(input: string): string[] {
  return input
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter((s) => !!s);
}

export default function CheckpointModal({
  buttonLabel = "기록",
  className,
  defaultOperation = "checkpoint",
  defaultRisk = "SAFE",
}: {
  buttonLabel?: string;
  className?: string;
  defaultOperation?: Operation;
  defaultRisk?: Risk;
}) {
  const [open, setOpen] = useState(false);

  // Form state
  const [taskId, setTaskId] = useState("");
  const [operation, setOperation] = useState<Operation>(defaultOperation);
  const [notes, setNotes] = useState("");
  const [pathsInput, setPathsInput] = useState("");
  const [risk, setRisk] = useState<Risk>(defaultRisk);
  const [actor, setActor] = useState("gpt-5");

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<CheckpointResponse | null>(null);

  // Tail
  const [tail, setTail] = useState<TailResponse | null>(null);
  const [tailLoading, setTailLoading] = useState(false);
  const [tailError, setTailError] = useState<string | null>(null);

  const backendBase = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
    [],
  );

  const resetForm = useCallback(() => {
    setTaskId("");
    setOperation(defaultOperation);
    setNotes("");
    setPathsInput("");
    setRisk(defaultRisk);
    setActor("gpt-5");
    setSubmitError(null);
    setResult(null);
  }, [defaultOperation, defaultRisk]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    // Lazy-load recent tail when opening
    void fetchTail(20);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setSubmitError(null);
  }, []);

  const fetchTail = useCallback(
    async (lines = 20) => {
      setTailLoading(true);
      setTailError(null);
      try {
        const res = await fetch(
          `${backendBase}/api/protocol/audit/tail?lines=${Math.max(
            1,
            Math.min(1000, lines),
          )}`,
          { cache: "no-store" },
        );
        const json = (await res.json()) as TailResponse;
        if (!res.ok || (json as any)?.error) {
          setTailError((json as any)?.error || `HTTP ${res.status}`);
        } else {
          setTail(json);
        }
      } catch (e: any) {
        setTailError(e?.message ?? "audit tail failed");
      } finally {
        setTailLoading(false);
      }
    },
    [backendBase],
  );

  const handleSubmit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    setResult(null);
    try {
      const task_id = taskId.trim();
      const notesClean = notes.trim();
      if (!task_id) {
        setSubmitError("Task ID를 입력하세요.");
        return;
      }
      if (!notesClean) {
        setSubmitError("Notes를 입력하세요.");
        return;
      }
      const body = {
        task_id,
        operation,
        paths: parsePaths(pathsInput),
        notes: notesClean,
        risk,
        actor: actor.trim() || "gpt-5",
      };
      const res = await fetch(`${backendBase}/api/protocol/checkpoint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as CheckpointResponse;
      if (!res.ok || json?.error) {
        setSubmitError(json?.error || `HTTP ${res.status}`);
      } else {
        setResult(json);
        // refresh tail view
        void fetchTail(20);
      }
    } catch (e: any) {
      setSubmitError(e?.message ?? "checkpoint failed");
    } finally {
      setSubmitting(false);
    }
  }, [
    taskId,
    operation,
    pathsInput,
    notes,
    risk,
    actor,
    backendBase,
    fetchTail,
  ]);

  // keyboard close (ESC)
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    window.addEventListener("keydown", onKey as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, [open, handleClose]);

  return (
    <>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={handleOpen}
        className={clsx(
          "px-3 py-1.5 rounded-lg text-xs bg-indigo-600 hover:bg-indigo-700 text-white transition-colors",
          className,
        )}
        title="승인/기록(Checkpoint)"
      >
        {buttonLabel}
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          aria-modal="true"
          role="dialog"
          aria-labelledby="checkpoint-title"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          {/* Dialog */}
          <div className="relative w-full max-w-2xl mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-lg max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h2
                  id="checkpoint-title"
                  className="text-sm font-semibold text-white"
                >
                  승인/기록(Checkpoint)
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  Task 기록을 생성하고 최근 감사 로그를 미리보기합니다.
                </p>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-white transition-colors"
                onClick={handleClose}
                aria-label="닫기"
                title="닫기"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4 flex-1 overflow-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left: Form */}
                <div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Task ID
                      </label>
                      <input
                        className="w-full rounded-md bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-600"
                        placeholder="예: G2-UI-STATUS-HUD"
                        value={taskId}
                        onChange={(e) => setTaskId(e.target.value)}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">
                          Operation
                        </label>
                        <select
                          className="w-full rounded-md bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-600"
                          value={operation}
                          onChange={(e) =>
                            setOperation(e.target.value as Operation)
                          }
                        >
                          <option value="checkpoint">checkpoint</option>
                          <option value="edit">edit</option>
                          <option value="create">create</option>
                          <option value="mkdir">mkdir</option>
                          <option value="mv">mv</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-300 mb-1">
                          Risk
                        </label>
                        <select
                          className="w-full rounded-md bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-600"
                          value={risk}
                          onChange={(e) => setRisk(e.target.value as Risk)}
                        >
                          <option value="SAFE">SAFE</option>
                          <option value="CAUTION">CAUTION</option>
                          <option value="DANGEROUS">DANGEROUS</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Notes
                      </label>
                      <textarea
                        className="w-full h-20 rounded-md bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-600 resize-y"
                        placeholder="변경 목적/요약을 입력하세요(필수)"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-gray-300 mb-1">
                        Paths (쉼표/줄바꿈 구분)
                      </label>
                      <textarea
                        className="w-full h-20 rounded-md bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-600 resize-y"
                        placeholder="예: gumgang-v2/app/layout.tsx&#10;backend/simple_main.py"
                        value={pathsInput}
                        onChange={(e) => setPathsInput(e.target.value)}
                      />
                    </div>

                    <details className="text-xs text-gray-400">
                      <summary className="cursor-pointer select-none">
                        고급 설정(Actor)
                      </summary>
                      <div className="mt-2">
                        <input
                          className="w-full rounded-md bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-600"
                          value={actor}
                          onChange={(e) => setActor(e.target.value)}
                        />
                      </div>
                    </details>
                  </div>
                </div>

                {/* Right: Tail Preview */}
                <div className="flex flex-col h-full">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xs text-gray-300">
                        최근 감사 로그 미리보기
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {tail?.ts_kst
                          ? `서버 시간: ${tail.ts_kst}`
                          : tailLoading
                            ? "로딩 중..."
                            : "—"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fetchTail(20)}
                        className="px-2 py-1 text-xs rounded-md bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 transition-colors"
                        title="새로고침"
                      >
                        새로고침
                      </button>
                      <select
                        className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-md px-2 py-1 outline-none"
                        onChange={(e) => fetchTail(Number(e.target.value))}
                        defaultValue={20}
                        title="표시 행 수"
                      >
                        <option value={10}>10행</option>
                        <option value={20}>20행</option>
                        <option value={50}>50행</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex-1 rounded-md bg-black/50 border border-gray-800 p-2 overflow-auto">
                    {tailError ? (
                      <div className="text-xs text-red-400">{tailError}</div>
                    ) : tailLoading ? (
                      <div className="text-xs text-gray-400">로딩 중...</div>
                    ) : tail && tail.lines && tail.lines.length > 0 ? (
                      <pre className="text-[11px] leading-4 text-gray-300 whitespace-pre-wrap break-words">
                        {tail.lines.join("\n")}
                      </pre>
                    ) : (
                      <div className="text-xs text-gray-500">
                        표시할 로그가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-700">
              <div className="text-xs">
                {result?.ts_kst && !submitError ? (
                  <span className="text-green-400">
                    기록 완료({result.ts_kst}) — appended=
                    {result.audit_appended} / manifest=
                    {result.manifest_modified ? "updated" : "no-op"}
                  </span>
                ) : submitError ? (
                  <span className="text-red-400">오류: {submitError}</span>
                ) : (
                  <span className="text-gray-500">
                    Task ID와 Notes는 필수입니다.
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-3 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-xs transition-colors"
                  disabled={submitting}
                  title="입력 초기화"
                >
                  초기화
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs transition-colors",
                    submitting
                      ? "bg-indigo-900 text-indigo-300"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white",
                  )}
                  title="기록 실행"
                >
                  {submitting ? "기록 중..." : "기록 실행"}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-3 py-1.5 rounded-md bg-gray-700 hover:bg-gray-600 text-xs text-white transition-colors"
                  title="닫기"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
