/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/hooks/useComposerSpace.js
 * @분석일자: 2025-09-10T17:42Z (UTC) / 2025-09-11 02:42 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 하단 입력창(Composer)의 높이를 실시간으로 측정하여 CSS 변수(--gg-composer-h)로 발행하는 커스텀 훅입니다.
 *
 * @핵심역할
 *  - 1. (높이 측정) `ResizeObserver`를 사용하여 입력창 요소의 높이 변경을 감지합니다.
 *  - 2. (CSS 변수 발행) 측정된 높이 값을 `--gg-composer-h` 변수에 할당합니다.
 *  - 3. (스크롤 공간 확보) 발행된 변수를 통해 스크롤 컨테이너의 하단 패딩을 조정하여 내용이 가려지지 않게 합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/A1Dev.jsx`
 *  - (DOM 관찰) → `footer.gg-composer`
 *  - (CSS 변수 주입) → `#chat-msgs`, `#gg-threads`
 *
 * @참고사항
 *  - '입력창 높이 측정/발행'이라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
/**
 * useComposerSpace — observe footer.gg-composer height and publish a CSS var
 *
 * What it does
 * - Watches the composer element (footer.gg-composer) with a ResizeObserver.
 * - Writes the measured height (including safe-area padding) to a CSS variable
 *   (default: --gg-composer-h) so scroll containers can reserve bottom space.
 * - When the composer is not present (e.g., non-chat mode), it sets 0px.
 *
 * Why
 * - Prevents timeline/items from being obscured by the composer at the bottom.
 * - Keeps ST-1206 invariants intact (no extra scrollers; only padding space).
 *
 * Usage
 *   import useComposerSpace from "@/hooks/useComposerSpace";
 *   function App() {
 *     const h = useComposerSpace();
 *     // h is the latest composer height (px), already published as CSS var
 *     return ...
 *   }
 *
 * Options
 * - varName: CSS variable name to set (default: "--gg-composer-h")
 * - targets: array of selectors to apply inline style var to
 *            (default: ["#chat-msgs", "#gg-threads"])
 * - includeRootVar: also set the var on :root (documentElement) (default: true)
 * - pollMs: fallback polling interval if RO isn't available (default: 0 = off)
 *
 * Returns
 * - current height number (px)
 */

import { useEffect, useRef, useState } from "react";

function $(sel) {
  try {
    return document.querySelector(sel);
  } catch {
    return null;
  }
}

function setVar(el, name, value) {
  try {
    if (!el || !el.style) return;
    el.style.setProperty(name, value);
  } catch {
    // ignore
  }
}

function readHeight(el) {
  try {
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    // Use client height instead of offsetHeight to include transforms/padding reliably
    const h = Math.max(0, Math.round(r.height));
    return h;
  } catch {
    return 0;
  }
}

export default function useComposerSpace(options = {}) {
  const {
    varName = "--gg-composer-h",
    targets = ["#chat-msgs", "#gg-threads"],
    includeRootVar = true,
    pollMs = 0,
  } = options;

  const [height, setHeight] = useState(0);
  const roRef = useRef(null);
  const pollRef = useRef(null);
  const lastAppliedRef = useRef(-1);

  useEffect(() => {
    const apply = (px) => {
      const v = `${px}px`;
      if (includeRootVar) setVar(document.documentElement, varName, v);
      for (const sel of targets) {
        const el = $(sel);
        if (el) setVar(el, varName, v);
      }
      lastAppliedRef.current = px;
    };

    const measureAndApply = () => {
      const composer = $("footer.gg-composer");
      const h = readHeight(composer);
      if (h !== lastAppliedRef.current) {
        setHeight(h);
        apply(h);
      }
    };

    // Initial apply (0 if missing)
    measureAndApply();

    // Observe composer element when available
    const attachObserver = () => {
      const composer = $("footer.gg-composer");
      if (!composer) return false;
      try {
        const ro = new ResizeObserver(() => measureAndApply());
        ro.observe(composer);
        roRef.current = ro;
        return true;
      } catch {
        return false;
      }
    };

    // Try to attach immediately; if not present, retry on next frame
    let attached = attachObserver();
    let rafId = 0;
    if (!attached) {
      const retry = () => {
        attached = attachObserver();
        if (!attached) rafId = requestAnimationFrame(retry);
      };
      rafId = requestAnimationFrame(retry);
    }

    // Window resize fallback (e.g., mobile keyboard, DPR changes)
    const onRz = () => measureAndApply();
    window.addEventListener("resize", onRz);

    // Optional polling fallback
    if (pollMs && pollMs > 0) {
      pollRef.current = setInterval(measureAndApply, Math.max(250, pollMs));
    }

    return () => {
      try {
        if (roRef.current) roRef.current.disconnect();
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener("resize", onRz);
        if (pollRef.current) clearInterval(pollRef.current);
      } catch {
        // ignore
      }
    };
    // We intentionally leave deps empty so the observer lives across renders.
    // The hook re-runs only on mount/unmount; internal observers track changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [varName, includeRootVar, pollMs]);

  return height;
}
