/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/layout/A1Grid.jsx
 * @분석일자: 2025-09-10T17:20Z (UTC) / 2025-09-11 02:20 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - .rules의 UI 가드레일(ST-1206)을 구현하는 앱의 최상위 레이아웃 뼈대입니다.
 *
 * @핵심역할
 *  - 1. (레이아웃 슬롯) `header`, `left`, `center`, `composer` prop으로 각 영역에 컴포넌트를 배치합니다.
 *  - 2. (가드레일 DOM) `#a1-wrap`, `#gg-threads`, `#chat-msgs` 등 ST-1206 규칙의 DOM 구조를 생성합니다.
 *  - 3. (동적 레이아웃) `leftCollapsed`, `mainMode` prop에 따라 CSS 클래스를 변경하여 레이아웃을 조정합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/A1Dev.jsx`
 *  - (CSS 클래스 제공) → `a1.css`
 *
 * @참고사항
 *  - '최상위 레이아웃 구조 정의'라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React, { useEffect, useRef } from "react";
import useViewportUnits from "@/hooks/useViewportUnits";

/**
 * A1Grid — owns the 3‑row grid shell and ST‑1206 invariants
 *
 * Responsibilities
 * - Provides the strict layout skeleton:
 *   - #a1-wrap (grid): rows = auto minmax(0,1fr) auto
 *   - Exactly two scrollers inside #a1: #gg-threads (left), #chat-msgs (right)
 *   - Footer composer sits in row 3 (the Composer component renders <footer.gg-composer>)
 * - Keeps center visually centered relative to the visible area by syncing
 *   the right drawer width to --gg-right-pad on #chat-msgs.
 *
 * Slots (props)
 * - header:     ReactNode (expected to render <header className="gg-strip">…)
 * - left:       ReactNode (rendered inside <aside id="gg-threads">)
 * - center:     ReactNode (rendered inside <div id="chat-msgs">)
 * - composer:   ReactNode (expected to render <footer className="gg-composer">…)
 *
 * State props
 * - mainMode:       string — 'chat' | other; non-chat removes composer row via .no-composer
 * - leftCollapsed:  boolean — toggles .left-collapsed to hide the left pane
 *
 * Behavior props
 * - observeRightDrawerPad: boolean (default: true) — measure .cc-drawer width → --gg-right-pad
 * - drawerSelector: string (default: ".cc-drawer")
 *
 * Guardrails (ST‑1206)
 * - Does NOT introduce new overflow containers; relies on CSS for:
 *   #gg-threads { overflow:auto } and #chat-msgs { overflow:auto }
 * - Keeps ids and DOM structure stable for tooling and tests.
 */

export default function A1Grid({
  header = null,
  left = null,
  center = null,
  composer = null,
  mainMode = "chat",
  leftCollapsed = false,
  observeRightDrawerPad = true,
  drawerSelector = ".cc-drawer",
  id = "a1-wrap",
  sectionId = "a1",
}) {
  const chatMsgsRef = useRef(null);

  // Publish stable --gg-vh for Tauri/WebKitGTK resize correctness
  useViewportUnits();

  useRightDrawerPad(chatMsgsRef, {
    enabled: observeRightDrawerPad,
    drawerSelector,
    varName: "--gg-right-pad",
  });

  const wrapCls = [
    leftCollapsed ? "left-collapsed" : "",
    mainMode !== "chat" ? "no-composer" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div id={id} className={wrapCls}>
      {header}

      <section id={sectionId} role="main" aria-label="Chat Area">
        <aside id="gg-threads" aria-label="Threads">
          {left}
        </aside>

        <div
          id="chat-msgs"
          aria-label={mainMode === "chat" ? "Messages" : "Main content"}
          data-mode={mainMode}
          ref={chatMsgsRef}
        >
          {center}
        </div>
      </section>

      {/* Composer node renders <footer.gg-composer>, which the grid CSS places in row 3 */}
      {mainMode === "chat" ? composer : null}
    </div>
  );
}

/**
 * useRightDrawerPad — observes right drawer width and writes it to a CSS var on the
 * provided element (ref). This keeps the center content visually centered relative
 * to the visible viewport when the drawer is open.
 */
function useRightDrawerPad(
  targetRef,
  {
    enabled = true,
    drawerSelector = ".cc-drawer",
    varName = "--gg-right-pad",
  } = {},
) {
  useEffect(() => {
    if (!enabled) return;

    let ro = null;
    let intId = 0;

    const setVar = (px) => {
      try {
        const el = targetRef.current;
        if (el && el.style)
          el.style.setProperty(varName, `${Math.max(0, Math.round(px))}px`);
      } catch {
        // ignore
      }
    };

    const compute = () => {
      try {
        const drawer = document.querySelector(drawerSelector);
        const visible =
          drawer &&
          getComputedStyle(drawer).display !== "none" &&
          getComputedStyle(drawer).visibility !== "hidden";
        const w = visible ? drawer.getBoundingClientRect().width || 0 : 0;
        setVar(w);
      } catch {
        setVar(0);
      }
    };

    // Initial apply
    compute();

    // Observe the drawer width if present
    const attachRO = () => {
      try {
        const drawer = document.querySelector(drawerSelector);
        if (!drawer) return false;
        ro = new ResizeObserver(() => compute());
        ro.observe(drawer);
        return true;
      } catch {
        return false;
      }
    };

    let attached = attachRO();

    // Window resize fallback
    const onRz = () => compute();
    window.addEventListener("resize", onRz);

    // Light polling guard for drawer mount/unmount transitions
    intId = window.setInterval(() => {
      const has = !!document.querySelector(drawerSelector);
      if (!attached && has) {
        attached = attachRO();
      }
      compute();
    }, 500);

    return () => {
      try {
        window.removeEventListener("resize", onRz);
        if (intId) clearInterval(intId);
        if (ro) ro.disconnect();
        setVar(0);
      } catch {
        // ignore
      }
    };
    // We intentionally keep deps minimal; this hook binds to DOM, not props beyond selectors.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, drawerSelector, varName]);
}
