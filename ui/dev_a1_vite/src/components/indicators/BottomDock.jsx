/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/indicators/BottomDock.jsx
 * @분석일자: 2025-09-10T17:16Z (UTC) / 2025-09-11 02:16 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - Composer 영역에 표시되는, 타임라인 스크롤 제어용 고정 '독(Dock)' UI를 정의합니다.
 *
 * @핵심역할
 *  - 1. (스크롤 제어) 타임라인의 맨 위/아래로 이동하는 버튼 UI를 제공합니다.
 *  - 2. (상태 감지) 스크롤 위치와 AI 응답 상태를 감지하여 UI를 동적으로 업데이트합니다.
 *  - 3. (이벤트 발행) `gg:resume-autofollow` 커스텀 이벤트를 발생시켜 스크롤 동작을 제어합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/chat/Composer.jsx`
 *  - (상태 구독) → `@/state/chatStore`
 *  - (DOM 제어) → `#chat-msgs`
 *
 * @참고사항
 *  - 이 파일은 '하단 스크롤 독'이라는 단일 책임을 가지므로 리팩토링은 현재 시급하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { chatStore } from "@/state/chatStore";

/**
 * BottomDock — Composer-area dock with fixed ▲/▼ jump buttons.
 *
 * Purpose
 * - Provide consistent, easy-to-hit jump controls regardless of where the timeline scroller is.
 * - ▲: Jump to the top (thread start)
 * - ▼: Jump to the bottom (latest), and resume auto-follow for streaming once mode.
 *
 * Wiring
 * - Direct scroll API: operates on the #chat-msgs scroller (ST-1206 allowed scroller #2).
 * - Window events:
 *   - Dispatches `gg:jump-top` / `gg:jump-bottom` CustomEvent when buttons are clicked.
 *   - Dispatches `gg:resume-autofollow` Event after jumping to bottom so useAutoStick resumes follow.
 *
 * Guardrails (ST-1206)
 * - Does NOT introduce any new overflow containers; renders inline in the composer area.
 * - Only interacts with the existing #chat-msgs scroller.
 *
 * Props
 * - behavior?: "smooth" | "auto"     — scroll behavior (default: "smooth")
 * - zIndex?: number                  — stacking context for the pill (default: 20)
 * - className?: string               — optional extra class
 * - style?: React.CSSProperties      — optional inline style
 * - compact?: boolean                — more compact layout (default: false)
 * - showLabels?: boolean             — show text labels under icons (default: false)
 * - align?: "center" | "right"       — alignment within its parent (default: "center")
 * - threshold?: number               — px distance from edges to disable buttons (default: 16)
 */
export default function BottomDock({
  behavior = "smooth",
  zIndex = 20,
  className = "",
  style,
  compact = false,
  showLabels = false,
  align = "center",
  threshold = 16,
}) {
  const [canGoTop, setCanGoTop] = useState(false);
  const [canGoBottom, setCanGoBottom] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollerRef = useRef(null);

  // Subscribe streaming state from chatStore (last assistant message)
  useEffect(() => {
    const update = () => {
      try {
        const s = chatStore.getState();
        const t =
          s.threads.find((tt) => tt.id === s.activeThreadId) || s.threads[0];
        const msgs = t?.messages || [];
        const last = msgs[msgs.length - 1];
        const streaming =
          last &&
          last.role === "assistant" &&
          !!(last?.meta?.streaming || last?.meta?.placeholder);
        setIsStreaming(!!streaming);
      } catch {
        setIsStreaming(false);
      }
    };
    update();
    const unsub = chatStore.subscribe(update);
    return () => {
      try {
        unsub && unsub();
      } catch {
        /* ignore */
      }
    };
  }, []);

  // Resolve the chat scroller element
  const getScroller = () => {
    try {
      const el =
        scrollerRef.current ||
        (typeof document !== "undefined"
          ? document.querySelector("#chat-msgs")
          : null);
      scrollerRef.current = el;
      return el;
    } catch {
      return null;
    }
  };

  const updateEdgeState = () => {
    const el = getScroller();
    if (!el) {
      setCanGoTop(false);
      setCanGoBottom(false);
      return;
    }
    const maxScrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
    const top = el.scrollTop;
    setCanGoTop(top > threshold);
    setCanGoBottom(maxScrollTop - top > threshold);
  };

  // Observe scroll/resize to keep edge state fresh
  useEffect(() => {
    const el = getScroller();
    updateEdgeState();
    if (!el) return;
    const onScroll = () => updateEdgeState();
    const onResize = () => updateEdgeState();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    // Periodic guard (DOM changes like font load)
    const id = window.setInterval(updateEdgeState, 600);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Alt+Up / Alt+Down shortcuts for jump top/bottom
  useEffect(() => {
    const onKey = (e) => {
      try {
        if (!e.altKey) return;
        if (e.key === "ArrowUp") {
          e.preventDefault();
          goTop();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          goBottom();
        }
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goTop = () => {
    const el = getScroller();
    if (!el) return;
    try {
      // Fire an intent event for any listeners (analytics/telemetry)
      window.dispatchEvent(new CustomEvent("gg:jump-top"));
    } catch {
      /* ignore */
    }
    el.scrollTo({ top: 0, behavior });
    // Auto-follow resume is not necessary for top jump
    updateEdgeState();
  };

  const goBottom = () => {
    const el = getScroller();
    if (!el) return;
    try {
      window.dispatchEvent(new CustomEvent("gg:jump-bottom"));
    } catch {
      /* ignore */
    }
    el.scrollTo({ top: el.scrollHeight, behavior });
    // Ask timeline to resume auto-follow (useAutoStick listens to this)
    try {
      window.dispatchEvent(new Event("gg:resume-autofollow"));
    } catch {
      /* ignore */
    }
    updateEdgeState();
  };

  // Visual tokens
  const wrapStyle = useMemo(
    () => ({
      display: "grid",
      justifyContent: align === "right" ? "end" : "center",
    }),
    [align],
  );

  const pillStyle = useMemo(
    () => ({
      zIndex,
      display: "inline-grid",
      gridAutoFlow: "column",
      gap: compact ? 6 : 10,
      alignItems: "center",
      padding: compact ? "4px 8px" : "6px 10px",
      borderRadius: 999,
      border: "1px solid var(--gg-border)",
      background: "rgba(15, 23, 42, 0.55)",
      color: "var(--gg-fg)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      pointerEvents: "auto",
    }),
    [zIndex, compact],
  );

  return (
    <div
      className={["gg-bottom-dock-wrap", className].filter(Boolean).join(" ")}
      style={{ ...wrapStyle, ...style }}
      role="group"
      aria-label="타임라인 점프 도구"
    >
      <div className="gg-bottom-dock" style={pillStyle}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto auto",
            alignItems: "center",
            gap: compact ? 6 : 10,
          }}
        >
          <MiniDots show={isStreaming} />
          <div
            style={{
              display: "grid",
              gridAutoFlow: "row",
              gap: compact ? 6 : 8,
            }}
          >
            <DockBtn
              dir="up"
              label={showLabels ? "맨 위" : undefined}
              disabled={!canGoTop}
              onClick={goTop}
            />
            <DockBtn
              dir="down"
              label={showLabels ? "맨 아래" : undefined}
              disabled={!canGoBottom}
              onClick={goBottom}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========== Parts ========== */

function DockBtn({ dir = "down", label, disabled = false, onClick }) {
  const isUp = dir === "up";
  const icon = isUp ? "▲" : "▼";
  const title = isUp ? "스레드 최상단으로 이동" : "스레드 최하단으로 이동";
  const aria = label || title;

  return (
    <button
      type="button"
      title={title}
      aria-label={aria}
      disabled={disabled}
      onClick={onClick}
      style={{
        width: 40,
        height: 40,
        display: "inline-grid",
        placeItems: "center",
        borderRadius: 10,
        appearance: "none",
        border: "1px solid rgba(148,163,184,0.30)",
        background: disabled ? "rgba(2, 6, 23, 0.35)" : "rgba(2, 6, 23, 0.55)",
        color: disabled ? "rgba(148,163,184,0.5)" : "var(--gg-fg)",
        fontSize: 18,
        lineHeight: 1,
        cursor: disabled ? "default" : "pointer",
        transition:
          "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
        boxShadow: disabled
          ? "0 2px 10px rgba(0,0,0,0.14)"
          : "0 4px 16px rgba(0,0,0,0.30)",
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px) scale(1.05)";
        e.currentTarget.style.boxShadow = "0 8px 22px rgba(0,0,0,0.36)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0) scale(1.00)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.30)";
      }}
      onFocus={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(-1px) scale(1.05)";
        e.currentTarget.style.boxShadow =
          "0 0 0 2px rgba(148,163,184,0.35), 0 8px 22px rgba(0,0,0,0.36)";
      }}
      onBlur={(e) => {
        if (disabled) return;
        e.currentTarget.style.transform = "translateY(0) scale(1.00)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.30)";
      }}
    >
      <span aria-hidden>{icon}</span>
      {label ? (
        <span
          style={{
            fontSize: 10,
            marginTop: 2,
            opacity: 0.9,
            display: "none", // keep for potential future stacked layout
          }}
        >
          {label}
        </span>
      ) : null}
    </button>
  );
}

function MiniDots({ show }) {
  useTypingDotsKeyframes();
  if (!show) return null;
  return (
    <div
      aria-hidden="true"
      style={{
        display: "inline-grid",
        gridAutoFlow: "column",
        gap: 4,
        alignItems: "center",
      }}
    >
      <Dot i={0} />
      <Dot i={1} />
      <Dot i={2} />
    </div>
  );
}

function Dot({ i = 0 }) {
  const delay = `${i * 0.2}s`;
  return (
    <span
      aria-hidden
      style={{
        width: 6,
        height: 6,
        borderRadius: 999,
        background: "rgba(148,163,184,0.85)",
        display: "inline-block",
        transform: "translateY(0)",
        animationName: "gg-mini-typing-dot-bounce",
        animationDuration: "1.2s",
        animationDelay: delay,
        animationTimingFunction: "ease-in-out",
        animationIterationCount: "infinite",
      }}
    />
  );
}

let keyframesInjected = false;
function useTypingDotsKeyframes() {
  useEffect(() => {
    if (keyframesInjected) return;
    try {
      const id = "gg-mini-dots-keyframes";
      if (document.getElementById(id)) {
        keyframesInjected = true;
        return;
      }
      const css = `
@keyframes gg-mini-typing-dot-bounce {
  0%   { transform: translateY(0);    opacity: 0.85; }
  20%  { transform: translateY(-3px); opacity: 1;    }
  40%  { transform: translateY(0);    opacity: 0.85; }
  100% { transform: translateY(0);    opacity: 0.85; }
}
`;
      const el = document.createElement("style");
      el.id = id;
      el.type = "text/css";
      el.appendChild(document.createTextNode(css));
      document.head.appendChild(el);
      keyframesInjected = true;
    } catch {
      /* ignore */
    }
  }, []);
}
