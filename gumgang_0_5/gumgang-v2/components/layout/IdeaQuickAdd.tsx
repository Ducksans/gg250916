"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";

type CaptureResp = {
  ts_kst?: string;
  id?: string;
  path?: string;
  title?: string;
  tags?: string[];
  links?: string[];
  written?: boolean;
  indexed?: boolean;
  error?: string;
};

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export default function IdeaQuickAdd({
  buttonLabel = "아이디어+",
  className,
}: {
  buttonLabel?: string;
  className?: string;
}) {
  const backendBase = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
    [],
  );

  const [open, setOpen] = useState(false);

  // form
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [tags, setTags] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  // simple success message timer cleanup
  useEffect(() => {
    if (!okMsg) return;
    const t = setTimeout(() => setOkMsg(null), 2500);
    return () => clearTimeout(t);
  }, [okMsg]);

  const resetForm = useCallback(() => {
    setTitle("");
    setBody("");
    setTags("");
    setError(null);
    setOkMsg(null);
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setError(null);
    setOkMsg(null);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    setError(null);
    setOkMsg(null);
  }, []);

  const capture = useCallback(async () => {
    setSubmitting(true);
    setError(null);
    setOkMsg(null);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter((t) => !!t);
      const res = await fetch(`${backendBase}/api/ideas/capture`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body,
          tags: tagList,
          actor: "duksan",
        }),
      });
      const json = (await res.json()) as CaptureResp;
      if (!res.ok || json?.error) {
        setError(json?.error || `HTTP ${res.status}`);
        return;
      }
      setOkMsg(`기록 완료: ${json.id} (${json.ts_kst})`);
      // 기본 동작: 성공 후 폼 초기화(모달은 유지)
      resetForm();
    } catch (e: any) {
      setError(e?.message ?? "아이디어 기록 실패");
    } finally {
      setSubmitting(false);
    }
  }, [backendBase, title, body, tags, resetForm]);

  // ESC 닫기
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", onKey as any);
    return () => window.removeEventListener("keydown", onKey as any);
  }, [open, handleClose]);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={clsx(
          "px-3 py-1.5 rounded-lg text-xs bg-teal-600 hover:bg-teal-700 text-white transition-colors",
          className,
        )}
        title="아이디어 빠른 캡처"
      >
        {buttonLabel}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="아이디어 빠른 캡처"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          {/* Dialog */}
          <div className="relative w-full max-w-lg mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-lg overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div>
                <h2 className="text-sm font-semibold text-white">아이디어 빠른 캡처</h2>
                <p className="text-xs text-gray-400 mt-0.5">
                  제목/본문/태그만으로 간단히 기록됩니다.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`${backendBase}/api/ideas/list?limit=10`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-gray-300 hover:text-white underline"
                  title="최근 아이디어 10개 (새 탭)"
                >
                  최근 10개 보기
                </a>
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
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              <div>
                <label className="block text-xs text-gray-300 mb-1">제목</label>
                <input
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="아이디어 제목"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  본문 (마크다운, [[WikiLink]] 지원)
                </label>
                <textarea
                  className="w-full h-28 rounded-md bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-600 resize-y"
                  placeholder="핵심만 적어도 좋습니다. 나중에 확장할 수 있어요."
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs text-gray-300 mb-1">
                  태그(쉼표 구분)
                </label>
                <input
                  className="w-full rounded-md bg-gray-800 border border-gray-700 px-2 py-1.5 text-sm text-white outline-none focus:ring-2 focus:ring-teal-600"
                  placeholder="ai, obsidian, graph"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </div>

              <div className="text-xs min-h-[1.25rem]">
                {okMsg ? (
                  <span className="text-teal-300">{okMsg}</span>
                ) : error ? (
                  <span className="text-red-400">오류: {error}</span>
                ) : (
                  <span className="text-gray-500">
                    제목은 필수입니다. [[연결]]을 추가하면 링크가 자동 인덱싱됩니다.
                  </span>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-700">
              <button
                type="button"
                onClick={resetForm}
                className="px-3 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700 text-xs transition-colors"
                disabled={submitting}
                title="입력 초기화"
              >
                초기화
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={capture}
                  disabled={submitting || !title.trim()}
                  className={clsx(
                    "px-3 py-1.5 rounded-md text-xs transition-colors",
                    submitting || !title.trim()
                      ? "bg-teal-900 text-teal-300 cursor-not-allowed"
                      : "bg-teal-600 hover:bg-teal-700 text-white",
                  )}
                  title="아이디어 기록"
                >
                  {submitting ? "기록 중..." : "기록"}
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
