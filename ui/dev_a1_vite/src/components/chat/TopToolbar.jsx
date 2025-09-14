/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/chat/TopToolbar.jsx
 * @분석일자: 2025-09-10T16:43Z (UTC) / 2025-09-11 01:43 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 화면 최상단에 고정된 '상단 툴바'의 UI와 동작을 정의하는 프레젠테이셔널 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (상태 표시) 백엔드, 브릿지 서버의 헬스 체크 상태를 시각화하여 표시합니다.
 *  - 2. (핵심 액션) '새 스레드', '패널 열기' 등 앱의 핵심 기능을 실행하는 버튼들을 제공합니다.
 *  - 3. (에이전트 선택) `AgentSelector`를 통해 현재 대화의 AI 에이전트를 선택하는 UI를 제공합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/layout/A1Grid.jsx`
 *  - (임포트) → `./agent/AgentSelector`
 *  - (상태 의존) ← `@/components/A1Dev.jsx`
 *
 * @참고사항
 *  - 이 파일은 '상단 툴바 UI 및 이벤트 전달'이라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React from "react";
import AgentSelector from "@/components/chat/agent/AgentSelector";

/**
 * TopToolbar
 * - Extracted from the header strip in main.jsx
 * - Presentational component with status dots and action buttons
 *
 * Guardrails (ST-1206):
 * - Uses header.gg-strip with the same DOM structure and classes
 * - Does not introduce extra scrollers
 *
 * Props:
 * - title?: string
 * - backendStatus: 'ok' | 'bad' | 'checking'
 * - bridgeStatus: 'ok' | 'bad' | 'checking'
 * - agents: Array<{ id: string, name: string }>
 * - activeAgentId: string
 * - onChangeAgent: (agentId: string) => void
 * - onCreateThread: () => void
 * - backendPrefLabel: string ("FastAPI" | "Bridge")
 * - onToggleBackend: () => void
 * - toolModeOn: boolean
 * - toolBlocked: boolean
 * - onToggleToolMode: () => void
 * - onToggleToolsPanel: () => void
 * - onOpenPanels: () => void
 * - onOpenSnapshot: () => void
 * - onReload: () => void
 * - leftCollapsed: boolean
 * - onToggleLeftCollapsed: () => void
 * - onImportThreads: () => void
 * - onExportThreads: () => void
 */

function Dot({ status }) {
  const cls = status === "ok" ? "ok" : status === "bad" ? "bad" : "warn";
  const label = status === "ok" ? "OK" : status === "bad" ? "ERR" : "...";
  return (
    <span className="status-dot" title={label}>
      <span className={`dot ${cls}`} />
      <span>{label}</span>
    </span>
  );
}

export default function TopToolbar({
  title = "Gumgang UI — A1 Dev (Vite)",
  backendStatus,
  bridgeStatus,
  agents = [],
  activeAgentId = "",
  onChangeAgent,
  onCreateThread,
  backendPrefLabel = "FastAPI",
  onToggleBackend,
  toolModeOn = false,
  toolBlocked = false,
  onToggleToolMode,
  onToggleToolsPanel,
  onOpenPanels,
  onOpenSnapshot,
  onReload,
  leftCollapsed = false,
  onToggleLeftCollapsed,
  onImportThreads,
  onExportThreads,
}) {
  return (
    <header className="gg-strip" role="banner">
      <h1>{title}</h1>
      <div className="actions" aria-label="Status and Actions">
        <span>Backend</span> <Dot status={backendStatus} />
        <span style={{ width: 6 }} />
        <span>Bridge</span> <Dot status={bridgeStatus} />
        <span style={{ width: 10 }} />
        <AgentSelector
          agents={agents}
          value={activeAgentId}
          onChange={onChangeAgent}
          className="btn"
          style={{ minWidth: 160 }}
        />
        <button
          className="btn"
          onClick={onCreateThread}
          style={{ marginLeft: 6 }}
          title="새 스레드 생성"
        >
          New Thread
        </button>
        <button
          className="btn"
          onClick={onToggleBackend}
          style={{ marginLeft: 6 }}
          title="채팅 백엔드 전환(FastAPI ↔ Bridge)"
        >
          API: {backendPrefLabel}
        </button>
        <button
          className="btn"
          onClick={onToggleLeftCollapsed}
          style={{ marginLeft: 6 }}
          title="좌측 스레드 패널 접기/펼치기"
        >
          {leftCollapsed ? "Show Threads" : "Hide Threads"}
        </button>
        <button
          className="btn"
          onClick={onToggleToolMode}
          style={{ marginLeft: 6 }}
          title="툴 사용 모드(툴콜 루프) 토글"
        >
          Tool Mode: {toolModeOn ? "ON" : "OFF"}
        </button>
        {toolBlocked && (
          <span
            className="status-dot"
            title="현재 에이전트(Claude/Gemini)에서는 Tool Mode가 비활성화됩니다"
            style={{ marginLeft: 6 }}
          >
            <span className="dot warn" />
            <span>Tool disabled for this agent</span>
          </span>
        )}
        <button
          className="btn"
          onClick={onToggleToolsPanel}
          style={{ marginLeft: 6 }}
          title="툴 선택/관리"
        >
          Tools
        </button>
        <button
          className="btn"
          onClick={onOpenPanels}
          style={{ marginLeft: 6 }}
          title="우측 패널(커맨드 센터) 열기"
        >
          Panels
        </button>
        <button
          className="btn"
          onClick={onOpenSnapshot}
          style={{ marginLeft: 6 }}
          title="스냅샷 열기(3037)"
        >
          Snapshot
        </button>
        <button className="btn" onClick={onReload}>
          Reload
        </button>
        <button
          className="btn"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("gg:import-threads"))
          }
          style={{ marginLeft: 6 }}
          title="서버 스레드를 로컬로 가져오기(/api/threads/recent→read)"
        >
          Import Threads
        </button>
        <button
          className="btn"
          onClick={() =>
            window.dispatchEvent(new CustomEvent("gg:export-threads"))
          }
          style={{ marginLeft: 6 }}
          title="현재 스레드들을 JSON 파일로 내보내기"
        >
          Export Threads
        </button>
      </div>
    </header>
  );
}
