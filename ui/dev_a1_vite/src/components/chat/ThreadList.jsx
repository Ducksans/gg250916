/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/chat/ThreadList.jsx
 * @분석일자: 2025-09-10T16:40Z (UTC) / 2025-09-11 01:40 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 화면 왼쪽에 표시되는 채팅 스레드 목록의 UI와 사용자 상호작용을 정의합니다.
 *
 * @핵심역할
 *  - 1. (목록 렌더링) `threads` 배열 데이터를 받아와 스레드 목록 UI를 렌더링합니다.
 *  - 2. (무한 스크롤) `IntersectionObserver`를 사용하여 목록 하단 도달 시 추가 데이터를 로드합니다.
 *  - 3. (키보드 네비게이션) 방향키, Enter, F2, Delete 키를 사용한 스레드 관리를 지원합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/layout/LeftThreadsPane.jsx`
 *  - (상태 의존) ← `@/components/A1Dev.jsx`
 *  - (콜백 호출) → `chatStore`
 *
 * @참고사항
 *  - 이 파일은 '스레드 목록 표시'라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * ThreadList
 * - Pure presentational + minimal keyboard UX
 * - Renders inside #gg-threads (allowed scroller per ST-1206)
 *
 * Props:
 * - threads: Array<{ id: string, title: string }>
 * - activeThreadId: string | null
 * - onSwitch: (id: string) => void
 * - onRename: (id: string, title: string) => void
 * - onDelete: (id: string) => void
 * - pageSize?: number (default: 20)
 */
export default function ThreadList({
  threads,
  activeThreadId,
  onSwitch,
  onRename,
  onDelete,
  pageSize = 20,
}) {
  const listRef = useRef(null);
  const sentinelRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(() => {
    try {
      const v = Math.max(1, Math.min(pageSize, (threads || []).length));
      return v;
    } catch {
      return pageSize;
    }
  });

  const activeIndex = useMemo(() => {
    const idx = (threads || []).findIndex((t) => t.id === activeThreadId);
    return idx < 0 ? 0 : idx;
  }, [threads, activeThreadId]);

  const focusContainer = useCallback(() => {
    try {
      listRef.current?.focus();
    } catch {
      // ignore
    }
  }, []);

  const handleKeyDown = useCallback(
    (e) => {
      if (!threads || threads.length === 0) return;
      if (e.key === "ArrowUp" || (e.key === "k" && (e.ctrlKey || e.metaKey))) {
        e.preventDefault();
        const prev = Math.max(0, activeIndex - 1);
        const id = threads[prev]?.id;
        if (id) onSwitch?.(id);
      } else if (
        e.key === "ArrowDown" ||
        (e.key === "j" && (e.ctrlKey || e.metaKey))
      ) {
        e.preventDefault();
        const next = Math.min(threads.length - 1, activeIndex + 1);
        const id = threads[next]?.id;
        if (id) onSwitch?.(id);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const id = threads[activeIndex]?.id;
        if (id) onSwitch?.(id);
      } else if (e.key === "F2") {
        e.preventDefault();
        const cur = threads[activeIndex];
        if (!cur) return;
        const name = window.prompt("스레드 제목을 입력하세요", cur.title || "");
        if (name && name.trim()) onRename?.(cur.id, name.trim());
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const cur = threads[activeIndex];
        if (!cur) return;
        const ok = window.confirm("이 스레드를 삭제할까요?");
        if (ok) onDelete?.(cur.id);
      }
    },
    [threads, activeIndex, onSwitch, onRename, onDelete],
  );

  // IntersectionObserver to load more when reaching bottom sentinel
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    // The actual scroll container is #gg-threads (layout owns overflow).
    // Using listRef as root prevents intersection when the parent scroller moves.
    const root =
      document.getElementById("gg-threads") ||
      (listRef.current && listRef.current.closest
        ? listRef.current.closest("#gg-threads")
        : null);
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisibleCount((n) => {
              const next = Math.min((threads || []).length, n + pageSize);
              return next;
            });
          }
        }
      },
      { root: root || null, rootMargin: "0px 0px 600px 0px", threshold: 0 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [threads, pageSize]);

  // Reset visible count when thread list size shrinks
  useEffect(() => {
    setVisibleCount((n) => Math.min(n, (threads || []).length || 0));
  }, [threads]);

  return (
    <div
      className="threads-list"
      role="listbox"
      aria-label="Threads"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      ref={listRef}
      onClick={focusContainer}
    >
      {(threads || []).slice(0, visibleCount).map((t) => {
        const isActive = t.id === activeThreadId;
        return (
          <div
            key={t.id}
            role="option"
            aria-selected={isActive}
            className={`thread-item ${isActive ? "active" : ""}`}
            onClick={() => onSwitch?.(t.id)}
            title={t.title || t.id}
          >
            <div className="thread-row">
              <span className="thread-title">{t.title || t.id}</span>
              <span className="thread-actions">
                <button
                  className="mini"
                  title="Rename thread"
                  onClick={(e) => {
                    e.stopPropagation();
                    const name = window.prompt(
                      "스레드 제목을 입력하세요",
                      t.title || "",
                    );
                    if (name && name.trim()) onRename?.(t.id, name.trim());
                  }}
                >
                  ✎
                </button>
                <button
                  className="mini"
                  title="Delete thread"
                  onClick={(e) => {
                    e.stopPropagation();
                    const ok = window.confirm("이 스레드를 삭제할까요?");
                    if (ok) onDelete?.(t.id);
                  }}
                >
                  🗑
                </button>
              </span>
            </div>
          </div>
        );
      })}
      {(!threads || threads.length === 0) && (
        <div className="thread-item" aria-disabled="true">
          스레드가 없습니다. New Thread로 시작하세요.
        </div>
      )}
      {/* bottom sentinel for infinite scroll */}
      {(threads || []).length > visibleCount && (
        <div
          ref={sentinelRef}
          style={{ height: 1, width: 1, opacity: 0 }}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
