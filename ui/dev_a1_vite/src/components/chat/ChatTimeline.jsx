/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/chat/ChatTimeline.jsx
 * @분석일자: 2025-09-10T16:33Z (UTC) / 2025-09-11 01:33 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 실제 채팅 메시지 목록이 표시되는 타임라인 영역을 제어하는 컨테이너 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (스크롤 관리) `useAutoStick` 훅을 사용하여 정교한 자동 스크롤 동작을 관리합니다.
 *  - 2. (액션 핸들러) 메시지 복사, 삭제, 고정, 재실행 등의 사용자 액션을 처리하는 함수를 정의합니다.
 *  - 3. (렌더링 위임) 실제 메시지 렌더링은 `MessagesView` 컴포넌트에 위임합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/layout/CenterStage.jsx`
 *  - (임포트) → `./messages/MessagesView`
 *  - (임포트) → `@/hooks/useAutoStick`
 *
 * @참고사항
 *  - 이 파일은 '채팅 타임라인 동작 제어'라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React, { useMemo, useEffect } from "react";
import MessagesView from "./messages/MessagesView";
import { chatStore } from "@/state/chatStore";
import useAutoStick from "@/hooks/useAutoStick";
// BottomCue removed — indicator is now handled by BottomDock in Composer

/**
 * ChatTimeline
 * - Host container that preserves the ST-1206 scroller id (#chat-msgs)
 * - Delegates rendering to MessagesView
 *
 * Props:
 * - thread: { id: string, messages: Array }
 */
export default function ChatTimeline({ thread }) {
  if (!thread) return null;
  const messages = Array.isArray(thread.messages) ? thread.messages : [];
  // containerRef removed; use containerSelector in useAutoStick
  // bottomRef removed; internal bottomSentinelRef is used

  // 마지막 메시지와 상태 파생(스토어 메타 기반)
  const lastMsg = useMemo(
    () => (messages.length ? messages[messages.length - 1] : null),
    [messages.length],
  );
  const isAssistant = (lastMsg?.role || "").toLowerCase() === "assistant";
  const metaStreaming = !!lastMsg?.meta?.streaming;
  const metaPlaceholder = !!lastMsg?.meta?.placeholder;

  // Ensure #chat-msgs is a positioning context for BottomCue
  useEffect(() => {
    try {
      const el = document.querySelector("#chat-msgs");
      if (el && getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }
    } catch {
      /* noop */
    }
  }, []);

  // 콘텐츠 길이 변화는 보조 판정(메타에 의존, 없을 때만 사용)
  const lastMsgLen = useMemo(() => {
    if (!lastMsg) return 0;
    const c = lastMsg?.content;
    if (typeof c === "string") return c.length;
    try {
      return JSON.stringify(c ?? "").length;
    } catch {
      return 0;
    }
  }, [lastMsg]);

  // Recompute when message count changes
  const deps = useMemo(
    () => [messages.length, lastMsg?.id, lastMsgLen],
    [messages.length, lastMsg?.id, lastMsgLen],
  );

  // Auto stick with followMode='once': 발화 직후 1회만 따라가고 이후는 freeze
  const {
    stuck,
    showJump,
    frozen,
    resumeAutoFollow,
    scrollToBottom,
    setForceStick,
    bottomSentinelRef,
  } = useAutoStick({
    containerSelector: "#chat-msgs",
    threshold: 32,
    deps,
    forceOnDeps: false,
    enabled: true,
    scrollBehavior: "auto",
    followMode: "once",
  });

  // BottomCue removed — waiting/streaming indicator is handled in Composer dock

  const handleCopy = (m) => {
    try {
      const t =
        typeof m?.content === "string"
          ? m.content
          : JSON.stringify(m?.content ?? "", null, 2);
      navigator?.clipboard?.writeText?.(t);
    } catch {
      // ignore
    }
  };

  const handleDelete = (m) => {
    if (!m?.id) return;
    chatStore.actions.deleteMessage(thread.id, m.id);
  };

  // Expose a one-shot force stick for caller (user send path can import and call setForceStick via store-side event).
  // For now, keep local; upstream send() will call setForceStick(true) just before/after pushing messages.

  const handlePin = (m, nextPinned) => {
    if (!m?.id) return;
    try {
      const existing =
        (thread.messages || []).find((x) => x.id === m.id)?.meta || {};
      chatStore.actions.patchMessage(thread.id, m.id, {
        meta: { ...existing, pinned: !!nextPinned },
      });
    } catch {
      // ignore
    }
  };

  const handleRerun = (m) => {
    try {
      const textarea = document.querySelector("footer.gg-composer textarea");
      const text =
        typeof m?.content === "string"
          ? m.content
          : JSON.stringify(m?.content ?? "", null, 2);
      if (textarea) {
        const cur = textarea.value || "";
        textarea.value = cur ? cur + "\n\n" + text : text;
        textarea.focus();
      } else {
        // Fallback: copy to clipboard
        handleCopy(m);
      }
    } catch {
      // ignore
    }
  };

  return (
    <>
      <MessagesView
        messages={messages}
        showRoleLabel
        showMeta
        onCopyMessage={(m) => handleCopy(m)}
        onDeleteMessage={(m) => handleDelete(m)}
        onPinMessage={(m, nextPinned) => handlePin(m, nextPinned)}
        onRerunMessage={(m) => handleRerun(m)}
        bottomSentinelRef={bottomSentinelRef}
      />

      {/* Bottom cue removed — jump handled by BottomDock in Composer */}
    </>
  );
}
