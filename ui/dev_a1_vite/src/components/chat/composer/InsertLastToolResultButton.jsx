/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/chat/composer/InsertLastToolResultButton.jsx
 * @분석일자: 2025-09-10T16:53Z (UTC) / 2025-09-11 01:53 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - Composer 내에서 '마지막 도구 실행 결과를 입력창에 삽입'하는 버튼 컴포넌트를 정의합니다.
 *
 * @핵심역할
 *  - 1. (데이터 조회) 클릭 시 `chatStore`에서 마지막 도구 실행 결과를 조회합니다.
 *  - 2. (이벤트 전달) 조회된 결과를 `onInsert` 콜백을 통해 상위 컴포넌트로 전달합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/chat/Composer.jsx`
 *  - (상태 조회) → `@/state/chatStore`
 *
 * @참고사항
 *  - 이 파일은 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React from "react";
import { chatStore, getActiveThread } from "@/state/chatStore";

/**
 * InsertLastToolResultButton
 * - Extracted from Composer: inserts the latest tool invocation result into the input.
 *
 * Props:
 * - onInsert: (text: string) => void
 * - className?: string (default: "btn")
 * - title?: string
 * - threadId?: string (optional; defaults to active thread)
 *
 * Usage:
 *   <InsertLastToolResultButton onInsert={(text) => appendToTextarea(text)} />
 */
export default function InsertLastToolResultButton({
  onInsert,
  className = "btn",
  title = "마지막 툴 결과를 입력창에 삽입",
  threadId,
}) {
  const handleClick = () => {
    try {
      const state = chatStore.getState();
      const t = threadId ? { id: threadId } : getActiveThread();
      const invs = (state?.mcp?.invocations || []).filter(
        (x) => x.threadId === t.id,
      );
      const last = invs[invs.length - 1];
      const val = last?.result?.ok
        ? safeJSONString(last.result.data)
        : last?.result?.error || "";

      if (val && typeof onInsert === "function") {
        onInsert(val);
      }
    } catch {
      // no-op
    }
  };

  return (
    <button className={className} onClick={handleClick} title={title}>
      Insert Last Tool Result
    </button>
  );
}

/* helpers */
function safeJSONString(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
