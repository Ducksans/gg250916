/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/chat/composer/SendButton.jsx
 * @분석일자: 2025-09-10T16:56Z (UTC) / 2025-09-11 01:56 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - Composer 내에서 사용되는 '메시지 전송' 버튼 UI와 클릭 이벤트를 정의합니다.
 *
 * @핵심역할
 *  - 1. (UI 렌더링) 'Send' 텍스트를 가진 버튼 UI를 렌더링합니다.
 *  - 2. (이벤트 전달) 클릭 시 `onSend` 콜백을 호출하여 상위 컴포넌트로 이벤트를 전달합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/chat/Composer.jsx`
 *  - (콜백 호출) → `@/components/chat/Composer.jsx`의 `send` 함수
 *
 * @참고사항
 *  - 이 파일은 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React from "react";

/**
 * SendButton
 * - Extracted from Composer: triggers onSend() when clicked.
 *
 * Props:
 * - onSend: () => void | Promise<void>
 * - className?: string (default: "btn")
 * - title?: string (default: "메시지 전송")
 * - disabled?: boolean (default: false)
 * - children?: ReactNode (button label; default: "Send")
 */
export default function SendButton({
  onSend,
  className = "btn",
  title = "메시지 전송",
  disabled = false,
  children,
}) {
  const handleClick = () => {
    try {
      onSend?.();
    } catch {
      // parent handles error/reporting
    }
  };

  return (
    <button
      type="button"
      className={className}
      title={title}
      aria-label={title}
      onClick={handleClick}
      disabled={disabled}
      data-testid="composer-send"
    >
      {children ?? "Send"}
    </button>
  );
}
