/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/chat/Composer.jsx
 * @분석일자: 2025-09-10T16:37Z (UTC) / 2025-09-11 01:37 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 사용자가 메시지를 입력하고 전송하는 하단 입력창 영역(Composer)의 UI와 동작을 정의합니다.
 *
 * @핵심역할
 *  - 1. (UI 렌더링) `<textarea>`와 전송/도구 관련 버튼 UI를 렌더링합니다.
 *  - 2. (이벤트 처리) `Enter` 키 입력 등 사용자 이벤트를 감지하여 상위 컴포넌트로 전송합니다.
 *  - 3. (가드레일 준수) `data-gg="composer-actions"` 속성을 부여하여 ST-1206 규칙을 준수합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/layout/A1Grid.jsx`
 *  - (임포트) → `./composer/*`, `@/components/indicators/BottomDock`
 *  - (콜백 호출) → `@/components/A1Dev.jsx`의 `send` 함수
 *
 * @참고사항
 *  - 이 파일은 '메시지 입력 및 전송 이벤트 전달'이라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React, { useRef } from "react";
import InsertLastToolResultButton from "@/components/chat/composer/InsertLastToolResultButton";
import SendButton from "@/components/chat/composer/SendButton";
import BottomDock from "@/components/indicators/BottomDock";

/**
 * Composer
 * - Extracted from main.jsx footer composer section
 * - Preserves structure and attributes for ST-1206 guardrails:
 *   - <footer className="gg-composer"> is row 3, col 2
 *   - .composer-wrap layout unchanged
 *   - [data-gg="composer-actions"] marker on actions
 *
 * Props:
 * - onSend: (text: string) => void | Promise<void>
 * - placeholder?: string
 * - showInsertLastToolResult?: boolean (default: true)
 */
export default function Composer({
  onSend,
  placeholder = "메시지를 입력하세요…",
  showInsertLastToolResult = true,
}) {
  const inputRef = useRef(null);

  const send = async () => {
    const val = inputRef.current?.value?.trim();
    if (!val) return;
    // Clear input before async call, matching original behavior
    inputRef.current.value = "";
    try {
      await onSend?.(val);
    } catch {
      // parent handles error display in timeline; keep input cleared
    } finally {
      try {
        inputRef.current?.focus();
      } catch {
        // ignore
      }
    }
  };

  // InsertLastToolResult is handled by InsertLastToolResultButton component.

  return (
    <footer className="gg-composer" role="contentinfo">
      <div
        className="composer-wrap"
        style={{ gridTemplateColumns: "auto 1fr auto", alignItems: "end" }}
      >
        {/* Left — multimodal placeholders (no-op) */}
        <div
          className="composer-left"
          aria-label="Attachments and multimodal"
          style={{
            display: "grid",
            gridAutoFlow: "column",
            gap: 8,
            alignItems: "end",
          }}
        >
          <button
            type="button"
            title="파일 첨부"
            aria-label="파일 첨부"
            onClick={() => {}}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--gg-border)",
              background: "var(--gg-panel)",
              color: "var(--gg-fg)",
            }}
          >
            📎
          </button>
          <button
            type="button"
            title="이미지"
            aria-label="이미지"
            onClick={() => {}}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--gg-border)",
              background: "var(--gg-panel)",
              color: "var(--gg-fg)",
            }}
          >
            🖼️
          </button>
          <button
            type="button"
            title="마이크"
            aria-label="마이크"
            onClick={() => {}}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              border: "1px solid var(--gg-border)",
              background: "var(--gg-panel)",
              color: "var(--gg-fg)",
            }}
          >
            🎤
          </button>
        </div>

        {/* Middle — textarea */}
        <textarea
          ref={inputRef}
          placeholder={placeholder}
          aria-label="Message input"
          onKeyDown={(e) => {
            // Shift+Enter: 줄바꿈
            if (e.key === "Enter" && e.shiftKey) return;
            // Enter: 전송
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
              return;
            }
            // Ctrl/Cmd+Enter: 전송
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send();
            }
          }}
        />

        {/* Right — vertical dock + actions (ST-1206 marker retained) */}
        <div
          className="composer-right"
          data-gg="composer-actions"
          style={{
            display: "grid",
            gridTemplateRows: "auto auto",
            gap: 8,
            justifyItems: "end",
          }}
        >
          <BottomDock align="right" />
          <div style={{ display: "grid", gridAutoFlow: "column", gap: 8 }}>
            {showInsertLastToolResult && (
              <InsertLastToolResultButton
                onInsert={(val) => {
                  if (!val || !inputRef.current) return;
                  const cur = inputRef.current.value || "";
                  inputRef.current.value = cur ? cur + "\n\n" + val : val;
                  try {
                    inputRef.current.focus();
                  } catch {
                    // ignore
                  }
                }}
              />
            )}
            <SendButton onSend={send}>Send</SendButton>
          </div>
        </div>
      </div>
    </footer>
  );
}
