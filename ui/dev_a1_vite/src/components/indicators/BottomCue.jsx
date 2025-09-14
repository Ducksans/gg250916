/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/indicators/BottomCue.jsx
 * @분석일자: 2025-09-10T17:13Z (UTC) / 2025-09-11 02:13 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 채팅 타임라인 하단에 '최신으로 이동' 버튼이나 '응답 생성 중' 인디케이터를 표시하는 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (상태 표시) `showArrow`, `showBeat` prop에 따라 상태 표시기 UI를 렌더링합니다.
 *  - 2. (애니메이션 정의) JS를 통해 타이핑 애니메이션 CSS(@keyframes)를 동적으로 주입합니다.
 *
 * @주요관계
 *  - 현재 어디에서도 사용되지 않음.
 *
 * @참고사항
 *  - [리팩토링 후보 (삭제 대상)] 이 컴포넌트는 현재 사용되지 않는 '죽은 코드(Dead Code)'로 보입니다.
 *  - `BottomDock.jsx`가 이 컴포넌트의 기능을 모두 대체했으므로, 안전하게 삭제하는 것을 권장합니다.
 * ---------------------------------------------------------------------------
 */
import React, { useEffect, useMemo } from "react";

/**
 * BottomCue — shows a center-top cue above the composer:
 * - Arrow button (▼) to jump to the latest message
 * - Typing dots heartbeat (• • •) to indicate assistant is generating
 *
 * Guardrails (ST-1206):
 * - Renders inside #chat-msgs (no extra scrollers).
 * - For stable visual anchoring above the composer, a sticky mode is provided.
 *
 * Props
 * - showArrow?: boolean                    — show the ▼ jump button
 * - showBeat?: boolean                     — show the typing dots heartbeat
 * - onGoBottom?: () => void                — handler when user clicks the jump button
 * - bottomOffset?: number                  — px offset above the composer (default: 16)
 * - zIndex?: number                        — stacking context (default: 5)
 * - position?: "center"|"right"            — align cue over composer (default: "center")
 * - mode?: "absolute"|"sticky"             — layout mode (default: "sticky")
 * - className?: string
 * - style?: React.CSSProperties
 */
export default function BottomCue({
  showArrow = false,
  showBeat = false,
  onGoBottom,
  bottomOffset = 16,
  zIndex = 5,
  position = "center",
  mode = "sticky",
  className = "",
  style,
}) {
  useTypingDotsKeyframes();

  // Bubble visual style (reused for both modes)
  const bubbleStyle = useMemo(
    () => ({
      display: "inline-flex",
      gap: 10,
      alignItems: "center",
      padding: "6px 10px",
      borderRadius: 999,
      border: "1px solid var(--gg-border)",
      background: "rgba(15, 23, 42, 0.55)", // toned panel
      color: "var(--gg-fg)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
      pointerEvents: "auto",
    }),
    [],
  );

  // Absolute mode: legacy positioning relative to #chat-msgs box
  const absAlignedStyle = useMemo(() => {
    const base = {
      position: "absolute",
      bottom: `calc(${Math.max(0, bottomOffset)}px + var(--gg-composer-h, 0px))`,
      zIndex,
    };
    if (position === "right") {
      return { ...base, right: 16, transform: "translateX(0)" };
    }
    // center (default)
    return { ...base, left: "50%", transform: "translateX(-50%)" };
  }, [bottomOffset, zIndex, position]);

  if (!showArrow && !showBeat) return null;

  // Sticky mode: visually anchored above the composer inside the scroller viewport
  if (mode === "sticky") {
    return (
      <div
        className={["gg-bottom-cue-wrap", className].filter(Boolean).join(" ")}
        style={{
          position: "sticky",
          bottom: `calc(${Math.max(0, bottomOffset)}px + var(--gg-composer-h, 0px))`,
          zIndex,
          width: "100%",
          display: "grid",
          justifyContent: position === "right" ? "end" : "center",
          pointerEvents: "none", // let inner bubble receive events
          ...style,
        }}
      >
        <div className="gg-bottom-cue" style={bubbleStyle}>
          {showBeat && <TypingDots ariaLabel="응답 생성 중" />}
          {showArrow && (
            <ArrowButton
              onClick={onGoBottom}
              title="최신으로 이동"
              ariaLabel="최신으로 이동"
            />
          )}
        </div>
      </div>
    );
  }

  // Absolute fallback (legacy)
  return (
    <div
      className={["gg-bottom-cue", className].filter(Boolean).join(" ")}
      style={{ ...absAlignedStyle, ...bubbleStyle, ...style }}
    >
      {showBeat && <TypingDots ariaLabel="응답 생성 중" />}
      {showArrow && (
        <ArrowButton
          onClick={onGoBottom}
          title="최신으로 이동"
          ariaLabel="최신으로 이동"
        />
      )}
    </div>
  );
}

/* ========== Parts ========== */

function ArrowButton({ onClick, title, ariaLabel }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel || title}
      style={{
        width: 40,
        height: 40,
        display: "inline-grid",
        placeItems: "center",
        borderRadius: 10,
        appearance: "none",
        border: "1px solid rgba(148,163,184,0.30)",
        background: "rgba(2, 6, 23, 0.55)",
        color: "var(--gg-fg)",
        fontSize: 20,
        lineHeight: 1,
        cursor: "pointer",
        transition:
          "transform 120ms ease, box-shadow 120ms ease, background 120ms ease",
        boxShadow: "0 4px 16px rgba(0,0,0,0.30)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px) scale(1.05)";
        e.currentTarget.style.boxShadow = "0 8px 22px rgba(0,0,0,0.36)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1.00)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.30)";
      }}
      onFocus={(e) => {
        e.currentTarget.style.transform = "translateY(-1px) scale(1.05)";
        e.currentTarget.style.boxShadow =
          "0 0 0 2px rgba(148,163,184,0.35), 0 8px 22px rgba(0,0,0,0.36)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.transform = "translateY(0) scale(1.00)";
        e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.30)";
      }}
    >
      <span aria-hidden>▼</span>
    </button>
  );
}

function TypingDots({ ariaLabel = "생성 중" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      style={{
        display: "inline-grid",
        gridAutoFlow: "column",
        gap: 6,
        alignItems: "center",
      }}
    >
      <Dot i={0} />
      <Dot i={1} />
      <Dot i={2} />
      {/* Visually hidden text for screen readers */}
      <span style={visuallyHidden}>…</span>
    </div>
  );
}

function Dot({ i = 0 }) {
  const delay = `${i * 0.2}s`; // 0, 0.2s, 0.4s → total ~1.2s loop
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 999,
        background: "rgba(148,163,184,0.85)",
        display: "inline-block",
        transform: "translateY(0)",
        animationName: "gg-typing-dot-bounce",
        animationDuration: "1.2s",
        animationDelay: delay,
        animationTimingFunction: "ease-in-out",
        animationIterationCount: "infinite",
      }}
    />
  );
}

/* ========== Styles/Helpers ========== */

const visuallyHidden = {
  position: "absolute",
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
};

let keyframesInjected = false;
function useTypingDotsKeyframes() {
  useEffect(() => {
    if (keyframesInjected) return;
    try {
      const id = "gg-bottom-cue-keyframes";
      if (document.getElementById(id)) {
        keyframesInjected = true;
        return;
      }
      const css = `
@keyframes gg-typing-dot-bounce {
  0%   { transform: translateY(0);    opacity: 0.85; }
  20%  { transform: translateY(-5px); opacity: 1;    }
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
      // ignore
    }
  }, []);
}
