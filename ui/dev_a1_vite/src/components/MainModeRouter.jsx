/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/MainModeRouter.jsx
 * @분석일자: 2025-09-10T16:29Z (UTC) / 2025-09-11 01:29 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 중앙 컨텐츠 영역에 표시될 내용을 `mode` prop에 따라 결정하는 '교통정리' 라우터 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (조건부 렌더링) `mode` 값에 따라 실제 채팅 UI 또는 다른 패널의 플레이스홀더 UI를 렌더링합니다.
 *  - 2. (가드레일 준수) 새로운 스크롤 영역을 만들지 않고 기존 스크롤러를 재사용하여 ST-1206 규칙을 준수합니다.
 *  - 3. (확장성) `slots` prop을 통해 향후 플레이스홀더를 실제 컴포넌트로 쉽게 교체할 수 있도록 지원합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/layout/CenterStage.jsx`
 *  - (상태 의존) ← `@/components/A1Dev.jsx`
 *
 * @참고사항
 *  - 이 파일은 라우팅이라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React from "react";

/**
 * MainModeRouter — center area router (placeholders) without breaking ST-1206
 *
 * Purpose
 * - Provides a single switch to render either the chat timeline (default) or
 *   a large placeholder screen for Planner/Insights/Executor/Agents/Prompts/Files/Bookmarks.
 * - Keeps the ST‑1206 invariants intact by:
 *   - NOT introducing any new overflow:auto containers inside #a1 (only #gg-threads and #chat-msgs exist).
 *   - Re-using the same width token via the existing "chat-panel" wrapper.
 *
 * Usage
 *   <div id="chat-msgs">
 *     <MainModeRouter mode={mode} chat={<MessagesView ... />} onBackToChat={()=>setMode('chat')} />
 *   </div>
 *
 * Props
 * - mode: one of 'chat'|'planner'|'insights'|'executor'|'agents'|'prompts'|'files'|'bookmarks'
 * - chat: ReactNode — actual chat timeline node to render when mode === 'chat'
 * - onBackToChat: () => void — handler for "Back to Chat" button on placeholders
 * - slots?: Partial per-mode overrides to replace placeholders
 *
 * Notes
 * - This file intentionally does not add CSS; it relies on existing tokens/classes (a1.css).
 * - Placeholders are intentionally minimal; feature work will replace them mode-by-mode.
 */

export const CENTER_MODES = [
  "chat",
  "editor",
  "planner",
  "insights",
  "executor",
  "agents",
  "prompts",
  "files",
  "bookmarks",
];

export default function MainModeRouter({
  mode = "chat",
  chat = null,
  onBackToChat,
  slots = {},
}) {
  const m = normalizeMode(mode);

  if (m === "chat") {
    // Render the actual chat timeline as-is
    return <>{chat}</>;
  }

  // If a custom slot is provided for this mode, render it; otherwise show a standard placeholder.
  const custom = slots[m];
  if (custom) {
    return <CenterWrap>{custom}</CenterWrap>;
  }

  return (
    <CenterWrap>
      <ModePlaceholder
        mode={m}
        title={modeTitle(m)}
        description={modeDescription(m)}
        onBackToChat={onBackToChat}
      />
    </CenterWrap>
  );
}

/* ========== Presentational: Center wrap ========== */
/**
 * CenterWrap
 * - Full-width container for non-chat modes (no width clamp).
 * - No overflow:auto here; #chat-msgs owns scrolling. ST‑1206 applies to chat only.
 */
function CenterWrap({ children }) {
  return (
    <div
      role="region"
      aria-label="Main content"
      style={{
        padding: "14px 14px 18px",
        width: "100%",
        display: "grid",
        gap: 14,
      }}
    >
      {children}
    </div>
  );
}

/* ========== Presentational: Placeholder ========== */

function ModePlaceholder({ mode, title, description, onBackToChat }) {
  return (
    <section
      aria-labelledby={`mode-${mode}-title`}
      style={{
        border: "1px solid var(--gg-border)",
        borderRadius: 12,
        background: "#0e1527",
        padding: 16,
        boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
      }}
    >
      <header style={{ display: "grid", gap: 6, marginBottom: 10 }}>
        <h2
          id={`mode-${mode}-title`}
          style={{ margin: 0, fontSize: 18, fontWeight: 800 }}
        >
          {title}
        </h2>
        <p style={{ margin: 0, fontSize: 13, opacity: 0.85 }}>{description}</p>
      </header>

      <div
        style={{
          border: "1px dashed var(--gg-border)",
          borderRadius: 10,
          padding: 16,
          background: "#0b1222",
        }}
      >
        <div style={{ fontSize: 13, opacity: 0.9, lineHeight: 1.6 }}>
          이 화면은 “메인 영역을 최대한 넓게 사용하는” {title}의
          Placeholder입니다. 우측 Panels에서 진입 포인트를 제공하며, 상세 기능은
          별도 설계 후 점진 적용됩니다.
        </div>

        <ul
          style={{
            margin: "10px 0 0",
            paddingLeft: 18,
            fontSize: 13,
            opacity: 0.9,
          }}
        >
          <li>중앙 영역은 단일 스크롤을 유지합니다(#chat-msgs).</li>
          <li>상단 토큰(--gg-chat-width)만 조정해 폭을 통일합니다.</li>
          <li>기능 확장 시 테이블/카드/차트는 이 영역에 직접 렌더링합니다.</li>
        </ul>
      </div>

      <footer
        style={{
          display: "grid",
          gridAutoFlow: "column",
          justifyContent: "end",
          gap: 8,
          marginTop: 12,
        }}
      >
        <button
          className="btn"
          onClick={onBackToChat}
          title="채팅으로 되돌아가기"
          style={{ padding: "8px 12px", fontSize: 13 }}
        >
          Back to Chat
        </button>
      </footer>
    </section>
  );
}

/* ========== Helpers ========== */

function normalizeMode(v) {
  const s = String(v || "chat").toLowerCase();
  return CENTER_MODES.includes(s) ? s : "chat";
}

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function modeTitle(m) {
  if (m === "chat") return "Chat";
  if (m === "agents") return "Agents";
  return cap(m);
}

function modeDescription(m) {
  switch (m) {
    case "editor":
      return "Monaco 기반 멀티탭 에디터 자리입니다. gumgang_0_5의 컴포넌트를 포팅하여 연결합니다.";
    case "planner":
      return "카테고리/채널/상태/우선순위/제목/슬러그를 관리하는 포털 화면의 골격입니다.";
    case "insights":
      return "기간/채널별 KPI 카드와 표 요약을 보여주는 성과 인사이트 화면의 골격입니다.";
    case "executor":
      return "작업 상태/진행률/ETA를 모니터링하고 액션을 제공하는 실행기 화면의 골격입니다.";
    case "agents":
      return "에이전트 목록/모델/툴셋/태그를 관리하는 화면의 골격입니다.";
    case "prompts":
      return "프롬프트 템플릿/버전/태그를 다루는 화면의 골격입니다.";
    case "files":
      return "브릿지 파일 시스템 연동(목록/열기/저장)을 위한 화면의 골격입니다.";
    case "bookmarks":
      return "중요 링크/문서/스레드에 빠르게 접근하는 북마크 화면의 골격입니다.";
    default:
      return "메인 영역 Placeholder입니다. 기능 상세는 후속 스프린트에서 연결됩니다.";
  }
}
