/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/tools/ToolsPanel.jsx
 * @분석일자: 2025-09-10T17:36Z (UTC) / 2025-09-11 02:36 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - `ToolsManager`로부터 받은 데이터를 사용하여 'MCP 도구' UI를 화면에 그리는 순수 프레젠테이셔널 컴포넌트입니다.
 *
 * @핵심역할
 *  - 1. (UI 렌더링) 도구 목록, 파라미터 입력 필드, 실행 버튼 등 전체 UI를 렌더링합니다.
 *  - 2. (상태 반영) 상위 컴포넌트의 상태(선택, 입력값, 실행 중 여부)를 UI에 동적으로 반영합니다.
 *  - 3. (이벤트 전달) UI에서 발생한 모든 사용자 이벤트를 콜백을 통해 상위 컴포넌트로 전달합니다.
 *
 * @주요관계
 *  - (임포트) ← `@/components/tools/ToolsManager.jsx`
 *  - (콜백 호출) → `@/components/tools/ToolsManager.jsx`
 *
 * @참고사항
 *  - '도구 패널 UI'라는 명확한 단일 책임을 가지므로 리팩토링이 필요하지 않습니다.
 * ---------------------------------------------------------------------------
 */
import React from "react";

/**
 * ToolsPanel
 * - Extracted from inline tools panel block in main.jsx
 * - Provides tool selection via checkboxes and manual invocation with param inputs
 *
 * Guardrails (ST-1206):
 * - Positioned by parent; component itself does not add new scrollers under #a1
 * - Uses existing classes: "tools-panel", "tools-list", "tools-row", "btn"
 *
 * Props:
 * - tools: Array<{ id?: string, name: string, description?: string, params?: { properties?: Record<string, any> } }>
 * - selectedToolIds: string[]
 * - onChangeSelectedToolIds: (nextIds: string[]) => void
 * - paramInputs: Record<string, Record<string, any>>  // { [toolId]: { [paramKey]: value } }
 * - onChangeParam: (toolId: string, key: string, value: string) => void
 * - busyMap?: Record<string, boolean> // { [toolId]: boolean }
 * - onInvoke: (toolDef: any) => void
 * - onClose: () => void
 * - title?: string (default: "MCP Tools")
 */
export default function ToolsPanel({
  tools = [],
  selectedToolIds = [],
  onChangeSelectedToolIds,
  paramInputs = {},
  onChangeParam,
  busyMap = {},
  onInvoke,
  onClose,
  title = "MCP Tools",
}) {
  const getId = (tool) => tool?.id || tool?.name || "";

  const toggleTool = (toolId, checked) => {
    const safeId = String(toolId || "");
    const cur = Array.isArray(selectedToolIds) ? selectedToolIds : [];
    const next = checked
      ? Array.from(new Set([...cur, safeId]))
      : cur.filter((x) => x !== safeId);
    onChangeSelectedToolIds?.(next);
  };

  return (
    <div className="tools-panel" role="dialog" aria-label="Tools Manager">
      <h4>{title}</h4>
      <div className="tools-list">
        {(!tools || tools.length === 0) && (
          <div style={{ opacity: 0.7 }}>툴 목록을 불러오는 중…</div>
        )}
        {(tools || []).map((tool) => {
          const id = getId(tool);
          const checked = selectedToolIds.includes(id);
          const schema = tool?.params || {};
          const props = schema?.properties || {};
          const vals = paramInputs[id] || {};
          const busy = !!busyMap[id];

          return (
            <div
              key={id}
              className="tools-row"
              style={{
                gridTemplateColumns: "1fr auto auto",
                alignItems: "start",
              }}
            >
              <span title={tool?.description || id}>
                {tool?.name || id}
                {Object.keys(props).length > 0 && (
                  <div style={{ marginTop: 6, display: "grid", gap: 4 }}>
                    {Object.entries(props).map(([k, spec]) => (
                      <label
                        key={k}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "90px 1fr",
                          gap: 6,
                          alignItems: "center",
                        }}
                      >
                        <span style={{ opacity: 0.8 }}>{k}</span>
                        <input
                          value={vals[k] ?? ""}
                          placeholder={spec?.type || "string"}
                          onChange={(e) =>
                            onChangeParam?.(id, k, e.target.value)
                          }
                          style={{
                            padding: 6,
                            borderRadius: 6,
                            border: "1px solid var(--gg-border)",
                            background: "#0e1527",
                            color: "var(--gg-fg)",
                          }}
                        />
                      </label>
                    ))}
                  </div>
                )}
              </span>
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggleTool(id, e.target.checked)}
                title="Enable for Tool Mode calls"
              />
              <button
                className="btn"
                disabled={busy}
                onClick={() => onInvoke?.(tool)}
                title="수동 호출"
              >
                {busy ? "Running…" : "Run"}
              </button>
            </div>
          );
        })}
      </div>
      <div
        style={{
          display: "grid",
          gridAutoFlow: "column",
          gap: 8,
          marginTop: 10,
          justifyContent: "end",
        }}
      >
        <button className="btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
