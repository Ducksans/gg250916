/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/chat/messages/MessagesView.jsx
 * @분석일자: 2025-09-10T17:03Z (UTC) / 2025-09-11 02:03 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - `Message` 컴포넌트를 사용하여 채팅 메시지 전체 목록을 렌더링하는 순수 프레젠테이셔널 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (목록 렌더링) `messages` 배열을 순회하며 `Message` 컴포넌트 목록을 렌더링합니다.
 *  - 2. (이벤트 전달) 개별 메시지의 사용자 액션을 상위 컴포넌트로 전달하는 파이프 역할을 합니다.
 *  - 3. (스크롤 센티넬 배치) 자동 스크롤 감지를 위한 `bottomSentinelRef`를 목록의 끝에 배치합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/chat/ChatTimeline.jsx`
 *  - (임포트) → `./Message.jsx`
 *
 * @참고사항
 *  - 이 파일은 '메시지 목록 렌더링'이라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React from "react";
import Message from "./Message";

/**
 * MessagesView
 * - Renders a list of messages using the Message component.
 * - Pure presentational; does not introduce new scrollers (keep guardrails).
 *
 * Props:
 * - messages: Array<{
 *     id: string
 *     role: 'user'|'assistant'|'system'
 *     content: string
 *     ts?: number
 *     meta?: any
 *   }>
 * - showRoleLabel?: boolean (default: true)
 * - showMeta?: boolean (default: true)
 * - emptyPlaceholder?: string (default: "대화를 시작하세요…")
 * - className?: string
 * - style?: React.CSSProperties
 * - onCopyMessage?: (message: any, index: number) => void
 * - onDeleteMessage?: (message: any, index: number) => void
 * - onPinMessage?: (message: any, nextPinned: boolean, index: number) => void
 * - onRerunMessage?: (message: any, index: number) => void
 * - bottomSentinelRef?: React.RefObject<HTMLDivElement> — stick-to-bottom target
 */
export default function MessagesView({
  messages,
  showRoleLabel = true,
  showMeta = true,
  emptyPlaceholder = "대화를 시작하세요…",
  className = "",
  style,
  onCopyMessage,
  onDeleteMessage,
  onPinMessage,
  onRerunMessage,
  bottomSentinelRef = null,
}) {
  const list = Array.isArray(messages) ? messages : [];

  if (list.length === 0) {
    return (
      <div
        className={["chat-panel", className].filter(Boolean).join(" ")}
        style={style}
      >
        <div
          className="msg assistant"
          role="article"
          aria-label="Empty conversation"
          style={{ opacity: 0.8 }}
        >
          <div>{emptyPlaceholder}</div>
        </div>
        {/* tiny spacer so empty-state doesn't glue to composer */}
        <div aria-hidden="true" style={{ height: 8 }} />
        {/* bottom sentinel for stick-to-bottom alignment */}
        <div ref={bottomSentinelRef} aria-hidden="true" />
      </div>
    );
  }

  return (
    <div
      className={["chat-panel", className].filter(Boolean).join(" ")}
      style={style}
      aria-label="Messages list"
    >
      {list.map((m, idx) => (
        <Message
          key={m?.id || `${m?.role || "msg"}-${m?.ts || idx}`}
          message={m}
          showRoleLabel={showRoleLabel}
          showMeta={showMeta}
          onCopy={() => onCopyMessage?.(m, idx)}
          onDelete={() => onDeleteMessage?.(m, idx)}
          onPin={(msg, nextPinned) => onPinMessage?.(msg ?? m, nextPinned, idx)}
          onRerun={() => onRerunMessage?.(m, idx)}
        />
      ))}
      {/* tiny spacer to keep last line from touching composer visually */}
      <div aria-hidden="true" style={{ height: 10 }} />
      {/* bottom sentinel lives inside the chat-panel so scrollIntoView aligns precisely above the composer */}
      <div ref={bottomSentinelRef} aria-hidden="true" />
    </div>
  );
}
