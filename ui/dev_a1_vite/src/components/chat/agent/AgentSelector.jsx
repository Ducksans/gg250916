/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a_vite/src/components/chat/agent/AgentSelector.jsx
 * @분석일자: 2025-09-10T16:47Z (UTC) / 2025-09-11 01:47 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 상단 툴바 내에서 사용될 AI 에이전트 선택 드롭다운 메뉴 UI를 정의하는 재사용 가능한 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (드롭다운 렌더링) `agents` 데이터를 받아와 HTML `<select>` 드롭다운 메뉴를 렌더링합니다.
 *  - 2. (상태 위임) 사용자가 에이전트를 선택하면 `onChange` 콜백을 호출하여 상위 컴포넌트로 알립니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/chat/TopToolbar.jsx`
 *  - (상태 의존) ← `@/components/A1Dev.jsx`
 *
 * @참고사항
 *  - 이 파일은 '에이전트 선택 UI'라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React, { useMemo } from "react";

/**
 * AgentSelector
 * - Reusable dropdown for selecting an agent.
 * - Extracted from the TopToolbar to follow 1-file-1-role principle.
 *
 * Guardrails (ST-1206):
 * - Pure control component; does not introduce layout containers or scrollers.
 * - Styling relies on existing .btn class used in the toolbar.
 *
 * Props:
 * - agents: Array<{ id: string, name: string, model?: string }>
 * - value: string (currently selected agent id)
 * - onChange: (agentId: string) => void
 * - id?: string (default: "agent-select")
 * - className?: string (default: "btn")
 * - style?: React.CSSProperties (default: { minWidth: 160 })
 * - placeholderLabel?: string (default: "Select agent")
 * - showModelHint?: boolean (default: false) — shows "[model]" inside option text if available
 * - disabled?: boolean
 *
 * Usage:
 *   <AgentSelector
 *     agents={agents}
 *     value={activeAgentId}
 *     onChange={(id) => chatStore.actions.setAgentForThread(threadId, id)}
 *   />
 */
export default function AgentSelector({
  agents = [],
  value = "",
  onChange,
  id = "agent-select",
  className = "btn",
  style,
  placeholderLabel = "Select agent",
  showModelHint = false,
  disabled = false,
  ...selectProps
}) {
  const options = useMemo(() => {
    if (!Array.isArray(agents)) return [];
    return agents
      .filter(Boolean)
      .map((a) => ({
        id: String(a.id ?? ""),
        label: buildLabel(a, { showModelHint }),
      }))
      .filter((o) => o.id);
  }, [agents, showModelHint]);

  const handleChange = (e) => {
    const next = e?.target?.value ?? "";
    if (typeof onChange === "function") onChange(next);
  };

  const effectiveStyle = {
    minWidth: 160,
    ...(style || {}),
  };

  return (
    <select
      id={id}
      aria-label="Agent"
      title="에이전트 선택"
      className={className}
      style={effectiveStyle}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      {...selectProps}
    >
      {!value && (
        <option value="" disabled>
          {placeholderLabel}
        </option>
      )}
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/* helpers */

function buildLabel(agent, { showModelHint }) {
  const name = String(agent?.name ?? agent?.id ?? "Agent");
  const model = String(agent?.model ?? "").trim();
  if (showModelHint && model) return `${name} [${model}]`;
  return name;
}
