"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CheckpointModal from "@/components/layout/CheckpointModal";

/**
 * TurnCheckpointPrompt
 * - 화면 하단에 “기록할까요?” 배너를 조건부로 노출
 * - 백엔드 /api/protocol/git/dirty 응답이 dirty면 표시
 * - 같은 변경 스냅샷에 대해선 1회만 제안(로컬 저장 억제)
 * - “지금 기록” 버튼은 CheckpointModal(Phase 2 UI) 트리거
 *
 * 설치:
 *   헤더 레이아웃에 <TurnCheckpointPrompt /> 한 줄 추가
 */

type DirtyResp = {
  ts_kst?: string;
  has_changes?: boolean;
  counts?: {
    modified?: number;
    added?: number;
    deleted?: number;
    renamed?: number;
    untracked?: number;
  };
  modified?: string[];
  added?: string[];
  deleted?: string[];
  renamed?: { from: string; to: string }[];
  untracked?: string[];
  error?: string;
};

function clsx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

function hashSnapshot(d: DirtyResp): string {
  const mod = (d.modified || []).slice().sort();
  const add = (d.added || []).slice().sort();
  const del = (d.deleted || []).slice().sort();
  const ren = (d.renamed || []).slice().sort((a, b) => {
    const aa = `${a.from}->${a.to}`;
    const bb = `${b.from}->${b.to}`;
    return aa.localeCompare(bb);
  });
  const unt = (d.untracked || []).slice().sort();
  const basis = JSON.stringify({ mod, add, del, ren, unt });
  let h = 0;
  for (let i = 0; i < basis.length; i++) {
    // Simple string hash
    h = (h * 31 + basis.charCodeAt(i)) >>> 0;
  }
  return `${h}:${mod.length}/${add.length}/${del.length}/${ren.length}/${unt.length}`;
}

export default function TurnCheckpointPrompt({
  pollMs: pollMsProp,
  sessionKey = "turn_prompt.session.suppress",
  lastKeyStore = "turn_prompt.last_snapshot_key",
}: {
  pollMs?: number;
  sessionKey?: string;
  lastKeyStore?: string;
}) {
  const backendBase = useMemo(
    () => process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000",
    [],
  );

  // 기본 폴링 주기 15초(최소 5초 보호)
  const pollMs = useMemo(() => {
    const v = Number(process.env.NEXT_PUBLIC_TURN_PROMPT_POLL_MS ?? pollMsProp ?? 15000);
    return Math.max(5000, isFinite(v) && v > 0 ? v : 15000);
  }, [pollMsProp]);

  const [dirty, setDirty] = useState<DirtyResp | null>(null);
  const [showBanner, setShowBanner] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const ticking = useRef(false);

  // 세션 억제 플래그(“이번 세션 동안 묻지 않기”)
  const sessionSuppressed = useMemo<boolean>(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(sessionKey) === "1";
  }, [sessionKey]);

  const suppressForSession = useCallback(() => {
    if (typeof window === "undefined") return;
    sessionStorage.setItem(sessionKey, "1");
    setShowBanner(false);
  }, [sessionKey]);

  // 스냅샷 키(같은 변경셋에 대해 1회만 제안)
  const isSnapshotHandled = useCallback(
    (key: string) => {
      if (typeof window === "undefined") return false;
      return localStorage.getItem(lastKeyStore) === key;
    },
    [lastKeyStore],
  );

  const markSnapshotHandled = useCallback(
    (key: string) => {
      if (typeof window === "undefined") return;
      localStorage.setItem(lastKeyStore, key);
    },
    [lastKeyStore],
  );

  const fetchDirty = useCallback(async () => {
    if (ticking.current) return;
    ticking.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${backendBase}/api/protocol/git/dirty`, {
        cache: "no-store",
      });
      const json = (await res.json()) as DirtyResp;
      if (!res.ok || json?.error) {
        setError(json?.error || `HTTP ${res.status}`);
        setDirty(null);
        setShowBanner(false);
      } else {
        setDirty(json);
        if (json.has_changes && !sessionSuppressed) {
          const snapKey = hashSnapshot(json);
          if (!isSnapshotHandled(snapKey)) {
            // 새로운 변경셋 감지 → 배너 노출
            setShowBanner(true);
          } else {
            setShowBanner(false);
          }
        } else {
          setShowBanner(false);
        }
      }
    } catch (e: any) {
      setError(e?.message ?? "git dirty check failed");
      setDirty(null);
      setShowBanner(false);
    } finally {
      setLoading(false);
      ticking.current = false;
    }
  }, [backendBase, isSnapshotHandled, sessionSuppressed]);

  // 초기+주기 폴링
  useEffect(() => {
    let alive = true;
    const boot = async () => {
      if (!alive) return;
      await fetchDirty();
    };
    boot();

    const id = setInterval(() => {
      if (!alive) return;
      void fetchDirty();
    }, pollMs);

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [fetchDirty, pollMs]);

  // UI: 하단 배너
  if (!showBanner || !dirty?.has_changes) return null;

  const c = dirty.counts || {};
  const total =
    (c.modified || 0) +
    (c.added || 0) +
    (c.deleted || 0) +
    (c.renamed || 0) +
    (c.untracked || 0);

  // 세부 목록은 너무 길면 5개까지만 미리보기
  const preview = [
    ...(dirty.modified || []).map((p) => ({ kind: "M", path: p })),
    ...(dirty.added || []).map((p) => ({ kind: "A", path: p })),
    ...(dirty.deleted || []).map((p) => ({ kind: "D", path: p })),
    ...(dirty.untracked || []).map((p) => ({ kind: "?", path: p })),
  ].slice(0, 5);

  const handleLater = () => {
    // 같은 스냅샷에 대해 다시 묻지 않음
    const key = hashSnapshot(dirty);
    markSnapshotHandled(key);
    setShowBanner(false);
  };

  return (
    <div
      className={clsx(
        "fixed z-50 left-1/2 -translate-x-1/2 bottom-4",
        "max-w-3xl w-[92vw] rounded-xl border border-amber-500/40",
        "bg-gray-900/95 backdrop-blur shadow-lg",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-sm text-amber-300 font-semibold">
                기록할까요?
              </span>
              {loading && (
                <span className="text-xs text-gray-400">(감지 중…)</span>
              )}
            </div>
            <div className="mt-1 text-xs text-gray-300">
              방금 변경된 항목이 {total}개 감지되었습니다. 이번 턴을
              Checkpoint로 기록하면 감사/롤백/추적이 쉬워집니다.
            </div>

            {error ? (
              <div className="mt-2 text-xs text-red-400">
                변경 감지 오류: {error}
              </div>
            ) : (
              <div className="mt-2 text-[11px] text-gray-400">
                {(c.modified || 0) > 0 && (
                  <span className="mr-3">M:{c.modified}</span>
                )}
                {(c.added || 0) > 0 && <span className="mr-3">A:{c.added}</span>}
                {(c.deleted || 0) > 0 && (
                  <span className="mr-3">D:{c.deleted}</span>
                )}
                {(c.renamed || 0) > 0 && (
                  <span className="mr-3">R:{c.renamed}</span>
                )}
                {(c.untracked || 0) > 0 && (
                  <span className="mr-3">?:{c.untracked}</span>
                )}
                {preview.length > 0 && (
                  <div className="mt-1">
                    {preview.map((it, idx) => (
                      <div key={`${it.kind}-${it.path}-${idx}`}>
                        <span className="text-amber-300 mr-1">{it.kind}</span>
                        <span className="text-gray-300">{it.path}</span>
                      </div>
                    ))}
                    {total > preview.length && (
                      <div className="text-gray-500">… 외 {total - preview.length}개</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="shrink-0 flex flex-col gap-2">
            {/* CheckpointModal의 트리거 버튼을 그대로 사용해 통합 */}
            <CheckpointModal buttonLabel="지금 기록" className="w-full" />
            <button
              type="button"
              onClick={handleLater}
              className="px-3 py-1.5 rounded-md bg-gray-800 border border-gray-700 text-xs text-gray-300 hover:bg-gray-700 transition-colors"
              title="이번 변경셋에 대해서는 나중에 묻기"
            >
              나중에
            </button>
            <button
              type="button"
              onClick={suppressForSession}
              className="px-3 py-1.5 rounded-md bg-gray-700 text-xs text-white hover:bg-gray-600 transition-colors"
              title="이번 세션 동안 묻지 않기"
            >
              이번 세션 묻지 않기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
