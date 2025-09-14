/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/layout/LeftThreadsPane.jsx
 * @분석일자: 2025-09-10T17:25Z (UTC) / 2025-09-11 02:26 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - A1Grid의 왼쪽 열 전체를 책임지는 컨테이너 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (렌더링 위임) 실제 스레드 목록 렌더링을 `ThreadList` 컴포넌트에 위임합니다.
 *  - 2. (확장성) `header`/`footer` prop을 통해 상/하단에 다른 UI 요소를 추가할 수 있는 슬롯을 제공합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/layout/A1Grid.jsx`
 *  - (임포트) → `@/components/chat/ThreadList`
 *
 * @참고사항
 *  - '왼쪽 패널 레이아웃 제공'이라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React, { memo } from "react";
import ThreadList from "@/components/chat/ThreadList";

/**
 * LeftThreadsPane — encapsulates ThreadList for the left column
 *
 * Responsibilities
 * - Presentational wrapper that renders the thread list inside the left pane.
 * - Keeps ST-1206 guardrails: does NOT introduce any new overflow containers.
 *   The only scroller remains #gg-threads, which is owned by the layout grid.
 *
 * Props
 * - threads: Array<Thread>
 * - activeThreadId: string
 * - onSwitch: (id: string) => void
 * - onRename: (id: string, name: string) => void
 * - onDelete: (id: string) => void
 * - header?: ReactNode — optional area above the list (e.g., filters/search)
 * - footer?: ReactNode — optional area below the list (e.g., pagination)
 * - className?: string
 * - style?: React.CSSProperties
 *
 * Usage
 *   <aside id="gg-threads">
 *     <LeftThreadsPane
 *       threads={threads}
 *       activeThreadId={activeId}
 *       onSwitch={...}
 *       onRename={...}
 *       onDelete={...}
 *     />
 *   </aside>
 */
function LeftThreadsPane({
  threads = [],
  activeThreadId = "",
  onSwitch,
  onRename,
  onDelete,
  header = null,
  footer = null,
  className = "",
  style,
}) {
  return (
    <div
      className={className}
      style={style}
      role="region"
      aria-label="Threads Pane"
    >
      {header}
      <ThreadList
        threads={threads}
        activeThreadId={activeThreadId}
        onSwitch={onSwitch}
        onRename={onRename}
        onDelete={onDelete}
      />
      {footer}
    </div>
  );
}

export default memo(LeftThreadsPane);
