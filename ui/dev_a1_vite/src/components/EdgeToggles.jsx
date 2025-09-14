/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/EdgeToggles.jsx
 * @분석일자: 2025-09-10T16:27Z (UTC) / 2025-09-11 01:27 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 화면 좌우 가장자리에 고정되어, 좌측 스레드 패널과 우측 커맨드 센터를 열고 닫는 토글 버튼을 렌더링하고 제어합니다.
 *
 * @핵심역할
 *  - 1. (UX) 사용자의 활동이 없으면 자동으로 반투명해지는 'auto-fade' 기능을 구현합니다.
 *  - 2. (동적 위치) 패널 크기가 변경될 때마다 버튼 위치를 동적으로 조정합니다.
 *  - 3. (상태 위임) 패널의 열림/닫힘 상태는 상위 컴포넌트(`A1Dev.jsx`)에 위임합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/A1Dev.jsx`
 *  - (DOM 관찰) → `#gg-threads`, `.cc-drawer`
 *
 * @참고사항
 *  - 이 파일은 '엣지 토글'이라는 단일 책임을 수행하므로 리팩토링은 현재 시급하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React, { useEffect, useRef, useState } from "react";

/**
 * EdgeToggles — minimal icon-only edge buttons with auto-fade, hover expand, touch double-tap
 *
 * Behavior
 * - Icon-only chevrons show the NEXT action (not the current state)
 *   - Left Threads: collapsed → › (open), expanded → ‹ (close)
 *   - Right Panels: closed → ‹ (open), open → › (close)
 * - Auto-fade: buttons fade when idle, wake on any user activity (mouse/touch/keys/wheel)
 * - Hover/focus: slightly expand and raise opacity
 * - Touch: first tap wakes (no action), second tap within 600ms triggers the action
 * - Position: fixed overlay (outside #a1 flow) — does not add scrollers (ST‑1206 safe)
 *
 * Hotkeys
 * - Alt+[  → toggle left threads
 * - Alt+]  → toggle right panels
 */

export default function EdgeToggles({
  showLeft = true,
  showRight = true,
  leftCollapsed,
  rightOpen,
  onToggleLeft,
  onToggleRight,
  y = "50%",
  offset = 6,
  hotkeys = true,
  size = 28,
  fadeAfterMs = 2000,
}) {
  const [faded, setFaded] = useState(true);
  const fadeTimerRef = useRef(null);
  const tapsRef = useRef({ left: 0, right: 0 });

  // Track boundaries for left threads and right drawer to stick toggles to edges
  const [bounds, setBounds] = useState({
    leftX: null, // #gg-threads right edge (px)
    rightX: null, // .cc-drawer left edge (px) when open
  });

  // Wake -> visible for fadeAfterMs
  const wake = () => {
    try {
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    } catch {}
    setFaded(false);
    fadeTimerRef.current = setTimeout(
      () => setFaded(true),
      Math.max(800, fadeAfterMs),
    );
  };

  useEffect(() => {
    // auto-fade on idle; wake on activity
    const onActivity = () => wake();
    const evs = ["mousemove", "keydown", "wheel", "touchstart"];
    evs.forEach((e) =>
      window.addEventListener(e, onActivity, { passive: true }),
    );
    wake(); // initial wake
    return () => {
      evs.forEach((e) => window.removeEventListener(e, onActivity));
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    };
  }, [fadeAfterMs]);

  // Hotkeys Alt+[ and Alt+]
  useEffect(() => {
    if (!hotkeys) return;
    const onKey = (e) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && !e.shiftKey) {
        if (e.key === "[") {
          e.preventDefault();
          onToggleLeft?.();
          wake();
        } else if (e.key === "]") {
          e.preventDefault();
          onToggleRight?.();
          wake();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hotkeys, onToggleLeft, onToggleRight]);

  const handleTouch = (side) => {
    const now = Date.now();
    const last = tapsRef.current[side] || 0;
    if (now - last < 600) {
      tapsRef.current[side] = 0;
      if (side === "left") onToggleLeft?.();
      else onToggleRight?.();
      wake();
    } else {
      tapsRef.current[side] = now;
      wake(); // first tap only wakes/arms
    }
  };

  const leftIcon = leftCollapsed ? "›" : "‹"; // next action
  const rightIcon = rightOpen ? "›" : "‹"; // next action
  const leftTitle = leftCollapsed
    ? "Show Threads (Alt+[)"
    : "Hide Threads (Alt+[)";
  const rightTitle = rightOpen ? "Close Panels (Alt+])" : "Open Panels (Alt+])";

  // Observe layout to anchor buttons at panel boundaries
  useEffect(() => {
    const update = () => {
      try {
        const threads = document.getElementById("gg-threads");
        const drawer = document.querySelector(".cc-drawer");
        const leftRect = threads ? threads.getBoundingClientRect() : null;
        const rightRect = drawer ? drawer.getBoundingClientRect() : null;
        setBounds({
          leftX: leftRect ? Math.floor(leftRect.right) : null,
          rightX: rightRect ? Math.floor(rightRect.left) : null,
        });
      } catch {
        // ignore
      }
    };
    update();

    let ro = null;
    try {
      const root = document.getElementById("a1-wrap") || document.body;
      ro = new ResizeObserver(() => update());
      ro.observe(root);
      if (document.getElementById("gg-threads")) {
        ro.observe(document.getElementById("gg-threads"));
      }
    } catch {
      // ignore
    }

    window.addEventListener("resize", update);
    const id = setInterval(update, 500); // lightweight guard for dynamic drawers
    return () => {
      window.removeEventListener("resize", update);
      clearInterval(id);
      try {
        ro && ro.disconnect();
      } catch {}
    };
  }, [leftCollapsed, rightOpen]);

  return (
    <>
      {showLeft && (
        <EdgeButton
          side="left"
          y={y}
          offset={offset}
          size={28}
          faded={faded}
          title={leftTitle}
          icon={leftIcon}
          onWake={wake}
          onClick={() => {
            onToggleLeft?.();
            wake();
          }}
          onTouch={() => handleTouch("left")}
          pressed={!!leftCollapsed}
          // anchor: if expanded, stick to threads right edge; else to viewport left
          anchorX={
            leftCollapsed || bounds.leftX == null
              ? { type: "viewport-left" }
              : { type: "absolute-left", x: bounds.leftX + 2 }
          }
        />
      )}
      {showRight && (
        <EdgeButton
          side="right"
          y={y}
          offset={offset}
          size={28}
          faded={faded}
          title={rightTitle}
          icon={rightIcon}
          onWake={wake}
          onClick={() => {
            onToggleRight?.();
            wake();
          }}
          onTouch={() => handleTouch("right")}
          pressed={!!rightOpen}
          // anchor: if open, stick to drawer left edge; else to viewport right
          anchorX={
            rightOpen && bounds.rightX != null
              ? { type: "absolute-left", x: bounds.rightX - 12 }
              : { type: "viewport-right" }
          }
        />
      )}
    </>
  );
}

/* Internal: single mini icon button */
function EdgeButton({
  side,
  y,
  offset,
  size = 28,
  faded = false,
  title,
  icon,
  onClick,
  onTouch,
  onWake,
  pressed,
  anchorX = { type: "viewport-right" }, // positioning mode
}) {
  const isLeft = side === "left";
  const baseOpacity = faded ? 0.35 : 0.75;

  const common = {
    position: "fixed",
    top: typeof y === "number" ? `${y}px` : y,
    transform: "translateY(-50%)",
    zIndex: 60,
    appearance: "none",
    border: `1px solid var(--gg-border, #1f2937)`,
    background: "var(--gg-panel, #0f172a)",
    color: "var(--gg-fg, #e5e7eb)",
    width: 21 /* ~30% larger */,
    height: 36 /* ~30% larger */,
    borderRadius: 8,
    padding: 0,
    lineHeight: 1,
    cursor: "pointer",
    boxShadow: pressed
      ? "0 0 0 2px rgba(34,197,94,0.08) inset, 0 8px 18px rgba(0,0,0,0.24)"
      : "0 6px 16px rgba(0,0,0,0.22)",
    display: "inline-grid",
    placeItems: "center",
    fontWeight: 800,
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI",
    fontSize: 18 /* larger chevron */,
    opacity: baseOpacity,
    transition:
      "opacity 120ms ease, transform 120ms ease, box-shadow 120ms ease",
  };

  return (
    <button
      type="button"
      aria-label={title}
      title={title}
      onClick={onClick}
      onMouseEnter={onWake}
      onFocus={onWake}
      onTouchStart={(e) => {
        onWake?.();
        onTouch?.(e);
      }}
      style={{
        ...common,
        ...(anchorX.type === "absolute-left"
          ? { left: `${Math.max(0, anchorX.x)}px` }
          : anchorX.type === "viewport-left"
            ? { left: `${Math.max(0, Number(offset) || 0)}px` }
            : anchorX.type === "viewport-right"
              ? { right: `${Math.max(0, Number(offset) || 0)}px` }
              : {}),
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.opacity = "0.95";
        e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.opacity = String(baseOpacity);
        e.currentTarget.style.transform = "translateY(-50%) scale(1.0)";
      }}
      onFocusCapture={(e) => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.transform = "translateY(-50%) scale(1.1)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.opacity = String(baseOpacity);
        e.currentTarget.style.transform = "translateY(-50%) scale(1.0)";
      }}
    >
      <span aria-hidden>{icon}</span>
    </button>
  );
}
