/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/layout/CenterStage.jsx
 * @분석일자: 2025-09-10T17:23Z (UTC) / 2025-09-11 02:23 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - A1Grid의 중앙 컨텐츠 영역에 표시될 내용을 최종적으로 결정하고 렌더링하는 컨테이너 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (렌더링 위임) `MainModeRouter`에 렌더링 로직을 위임하여 중앙 컨텐츠를 표시합니다.
 *  - 2. (기본 UI 제공) `chat` 모드일 때 기본값으로 `ChatTimeline` 컴포넌트를 렌더링합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/layout/A1Grid.jsx`
 *  - (임포트) → `@/components/MainModeRouter`, `@/components/chat/ChatTimeline`
 *
 * @참고사항
 *  - 이 파일은 '중앙 컨텐츠 라우팅 위임'이라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React from "react";
import MainModeRouter from "@/components/MainModeRouter";
import ChatTimeline from "@/components/chat/ChatTimeline";

/**
 * CenterStage — central router/timeline stage for the A1 grid
 *
 * Goals
 * - Render the chat timeline (default) or panel placeholders via MainModeRouter.
 * - Preserve “proper width and padding” by:
 *   - Relying on the existing .chat-panel clamp/padding styles from a1.css.
 *   - Letting A1Grid manage the --gg-right-pad CSS variable for visible-center alignment.
 * - Do NOT add any new overflow containers (ST‑1206: only #gg-threads and #chat-msgs scroll).
 *
 * Props
 * - mode: 'chat' | 'planner' | 'insights' | 'executor' | 'agents' | 'prompts' | 'files' | 'bookmarks'
 * - thread: Chat thread object for ChatTimeline
 * - onBackToChat?: () => void
 * - slots?: Partial<Record<mode, React.ReactNode>> to override non-chat placeholders
 * - chatNode?: React.ReactNode — optional override for the chat view (defaults to <ChatTimeline thread={thread} />)
 *
 * Notes
 * - This component intentionally does not wrap with extra containers. The width/padding are driven by:
 *   - .chat-panel styles (inside ChatTimeline) for clamp and base padding
 *   - #chat-msgs inline CSS var --gg-right-pad (set by A1Grid) for drawer-aware right padding
 */
export default function CenterStage({
  mode = "chat",
  thread,
  onBackToChat,
  slots = {},
  chatNode,
}) {
  const chat = chatNode ?? <ChatTimeline thread={thread} />;

  return (
    <MainModeRouter
      mode={mode}
      chat={chat}
      onBackToChat={onBackToChat}
      slots={slots}
    />
  );
}
