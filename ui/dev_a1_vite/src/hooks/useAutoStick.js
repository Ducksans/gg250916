/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/hooks/useAutoStick.js
 * @분석일자: 2025-09-10T17:40Z (UTC) / 2025-09-11 02:40 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 채팅 타임라인 등에서 스크롤 위치를 자동으로 맨 아래에 유지시켜주는 복잡한 로직을 처리하는 커스텀 훅입니다.
 *
 * @핵심역할
 *  - 1. (자동 스크롤) 사용자가 스크롤 하단에 있을 때, 내용이 추가되면 자동으로 스크롤을 내립니다.
 *  - 2. (자동 스크롤 중지) 사용자가 스크롤을 위로 올리면 자동 스크롤을 멈춥니다.
 *  - 3. ('once' 모드) 메시지 전송 직후 한 번만 강제 스크롤하고, 이후 스트리밍 중에는 스크롤을 고정합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/chat/ChatTimeline.jsx`
 *  - (이벤트 수신) ← `@/components/indicators/BottomDock.jsx`
 *
 * @참고사항
 *  - '정교한 자동 스크롤 로직'이라는 단일 책임을 가지므로 리팩토링은 현재 시급하지 않습니다.
 * ---------------------------------------------------------------------------
 */
/**
 * useAutoStick — keep a scroll container "stuck to bottom" with a tolerance threshold,
 * and expose a scroll-to-bottom action + bottom sentinel ref for precise alignment.
 *
 * Why
 * - In chat timelines, when a new message arrives (or streaming updates happen),
 *   we want the view to stay pinned to the bottom if the user is already near the bottom.
 * - If the user scrolled up to read, we should not force-scroll. Instead, show a "jump to bottom"
 *   UI (caller side) using the returned `showJump` boolean and `scrollToBottom()` callback.
 *
 * Behavior
 * - If the container is within `threshold` px of the bottom, we consider it "stuck".
 * - On `deps` change (e.g., messages.length), if "stuck" or `forceOnDeps` or `forceNext` is true,
 *   auto scrolls to bottom.
 * - Caller may call `setForceStick(true)` just before/after sending a message to guarantee
 *   that the next `deps` change (assistant heartbeat/stream) sticks to the bottom.
 * - followMode:
 *   - "near-bottom" (default): classic auto-follow when user is close to bottom.
 *   - "once": force-follow only once (e.g., right after user sends), then freeze until
 *     user explicitly resumes (by clicking a "jump to bottom" button).
 *
 * Guardrails
 * - Does not introduce new overflow containers; only manages scroll on an existing container
 *   (e.g., #chat-msgs owned by ST-1206).
 *
 * Usage
 *   const bottomRef = useRef(null);
 *   const { stuck, showJump, frozen, resumeAutoFollow, scrollToBottom, setForceStick, bottomSentinelRef } = useAutoStick({
 *     containerRef,                  // ref to #chat-msgs (preferred)
 *     // or containerSelector: "#chat-msgs",
 *     threshold: 32,                 // px tolerance to consider "at bottom"
 *     deps: [messages.length],       // re-evaluate on new message
 *     forceOnDeps: false,            // keep false; drive via setForceStick(true) on user send
 *     enabled: true,
 *     scrollBehavior: "auto",        // or "smooth"
 *     followMode: "once",            // or "near-bottom"
 *   });
 *
 *   // In JSX (inside the scroller):
 *   <div className="chat-panel"> ...messages... </div>
 *   <div ref={bottomSentinelRef} aria-hidden="true" />
 *
 *   // On user send (before/after store update):
 *   setForceStick(true);
 *   // On user clicks "jump to bottom":
 *   resumeAutoFollow();
 *
 * Returned API
 * - stuck: boolean                 — currently near bottom
 * - showJump: boolean              — convenience (true when not stuck OR when frozen)
 * - frozen: boolean                — auto-follow is frozen after the first forced stick in "once" mode
 * - resumeAutoFollow(): void       — re-enable auto-follow (e.g., after clicking "jump to bottom")
 * - scrollToBottom(): void         — programmatically scroll to the bottom sentinel
 * - setForceStick(on:bool): void   — mark next deps-change as force-sticky (one-shot)
 * - bottomSentinelRef: Ref<HTMLElement|null> — attach to the last element in the scroller
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

function getElFromSelector(sel) {
  try {
    return typeof document !== "undefined" ? document.querySelector(sel) : null;
  } catch {
    return null;
  }
}

function isNearBottom(el, threshold = 32) {
  try {
    if (!el) return true;
    // NOTE: #chat-msgs already reserves composer space via CSS padding-bottom.
    // Do NOT add --gg-composer-h again here — it double counts and mis-detects "near bottom".
    const dist = el.scrollHeight - (el.scrollTop + el.clientHeight);
    return dist <= Math.max(0, threshold);
  } catch {
    return true;
  }
}

export default function useAutoStick({
  containerRef = null,
  containerSelector = null,
  bottomRef = null, // optional external bottom ref (if provided, we use it instead of bottomSentinelRef)
  threshold = 32,
  deps = [],
  forceOnDeps = false,
  enabled = true,
  scrollBehavior = "auto", // "auto" | "smooth"
  followMode = "near-bottom", // "near-bottom" | "once"
} = {}) {
  const bottomSentinelRef = useRef(null);
  const forceNextRef = useRef(false);
  const stuckRef = useRef(true);
  const [stuck, setStuck] = useState(true);
  // auto-follow freeze state for followMode="once"
  const frozenRef = useRef(false);
  const [frozen, setFrozen] = useState(false);

  // Resolve container element (ref preferred)
  const getContainer = useCallback(() => {
    const r =
      containerRef && "current" in containerRef ? containerRef.current : null;
    if (r) return r;
    if (containerSelector) return getElFromSelector(containerSelector);
    // Attempt best-effort fallback: #chat-msgs
    return getElFromSelector("#chat-msgs");
  }, [containerRef, containerSelector]);

  // Resolve bottom element to scroll into view
  const getBottomEl = useCallback(() => {
    const ext = bottomRef && "current" in bottomRef ? bottomRef.current : null;
    if (ext) return ext;
    return bottomSentinelRef.current;
  }, [bottomRef]);

  // Public API: scroll to bottom sentinel (with fallback)
  const scrollToBottom = useCallback(() => {
    try {
      const container = getContainer();
      const sentinel = getBottomEl();
      if (sentinel && typeof sentinel.scrollIntoView === "function") {
        sentinel.scrollIntoView({
          block: "end",
          inline: "nearest",
          behavior: scrollBehavior,
        });
        return;
      }
      if (container) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: scrollBehavior,
        });
      }
    } catch {
      // ignore
    }
  }, [getContainer, getBottomEl, scrollBehavior]);

  // Public API: one-shot force stick (e.g., upon user send)
  const setForceStick = useCallback((on) => {
    forceNextRef.current = !!on;
    // Also honor a global one-shot flag for cross-component triggers (e.g., sender outside timeline)
    try {
      if (on && typeof window !== "undefined") {
        window.__GG_FORCE_STICK_NEXT__ = true;
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Update stuck state on scroll
  useEffect(() => {
    if (!enabled) return;
    const el = getContainer();
    if (!el) return;

    const onScroll = () => {
      // Apply small hysteresis to reduce flicker: once stuck, require a slightly larger gap to flip.
      const HYST = 4; // px
      const effectiveThreshold = stuckRef.current
        ? threshold + HYST
        : threshold;
      const near = isNearBottom(el, effectiveThreshold);
      stuckRef.current = near;
      setStuck(near);
    };

    // Initialize once on mount
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });

    // Also observe resize (e.g., keyboard/safe area/composer height changes)
    const onResize = () => onScroll();
    window.addEventListener("resize", onResize);

    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [enabled, getContainer, threshold]);

  // On deps change (e.g., messages.length), stick if near bottom or forced
  useEffect(() => {
    if (!enabled) return;

    // Check local one-shot, prop-level, and global one-shot flag
    let globalForce = false;
    try {
      if (typeof window !== "undefined") {
        globalForce = !!window.__GG_FORCE_STICK_NEXT__;
      }
    } catch {
      globalForce = false;
    }
    const shouldForce = forceOnDeps || forceNextRef.current || globalForce;
    // follow guard — if followMode is "once" and we've already forced once, remain frozen
    const alreadyFrozen = followMode === "once" && frozenRef.current === true;
    const shouldStick =
      (shouldForce && !alreadyFrozen) ||
      (!alreadyFrozen && stuckRef.current && followMode !== "once");

    if (shouldStick) {
      // Next frames to allow DOM update before scrolling
      const id1 = requestAnimationFrame(() => {
        const id2 = requestAnimationFrame(() => scrollToBottom());
        // freeze auto-follow after the first successful stick in "once" mode
        if (followMode === "once") {
          frozenRef.current = true;
          setFrozen(true);
        }
        // cleanup for the second frame
        return () => cancelAnimationFrame(id2);
      });
      // consume the one-shot flags
      forceNextRef.current = false;
      try {
        if (typeof window !== "undefined")
          window.__GG_FORCE_STICK_NEXT__ = false;
      } catch {
        /* ignore */
      }
      return () => cancelAnimationFrame(id1);
    }
    // consume the one-shot even when not sticking, to avoid stale behavior
    forceNextRef.current = false;
    try {
      if (typeof window !== "undefined") window.__GG_FORCE_STICK_NEXT__ = false;
    } catch {
      /* ignore */
    }
    // no-op cleanup
    return () => {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, forceOnDeps, scrollToBottom, followMode, ...deps]);

  // public API: resume auto-follow (e.g., when user clicks jump button)
  const resumeAutoFollow = useCallback(() => {
    frozenRef.current = false;
    setFrozen(false);
  }, []);

  // Global resume handler — allow external triggers from anywhere (e.g., composer dock button)
  // Usage: window.dispatchEvent(new Event("gg:resume-autofollow"))
  useEffect(() => {
    const handler = () => {
      try {
        resumeAutoFollow();
      } catch {
        /* ignore */
      }
    };
    try {
      window.addEventListener("gg:resume-autofollow", handler);
    } catch {
      /* ignore */
    }
    return () => {
      try {
        window.removeEventListener("gg:resume-autofollow", handler);
      } catch {
        /* ignore */
      }
    };
  }, [resumeAutoFollow]);

  const api = useMemo(
    () => ({
      stuck,
      showJump: !stuck || frozen,
      frozen,
      resumeAutoFollow,
      scrollToBottom,
      setForceStick,
      bottomSentinelRef,
    }),
    [stuck, frozen, resumeAutoFollow, scrollToBottom, setForceStick],
  );

  return api;
}
