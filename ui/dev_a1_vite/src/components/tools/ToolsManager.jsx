/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/tools/ToolsManager.jsx
 * @분석일자: 2025-09-10T17:33Z (UTC) / 2025-09-11 02:33 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 'MCP 도구' UI를 위한 컨테이너/컨트롤러 컴포넌트로, 도구의 생명주기를 관리합니다.
 *
 * @핵심역할
 *  - 1. (데이터 로딩) `/api/tools/definitions`를 호출하여 도구 목록을 가져옵니다.
 *  - 2. (상태 관리) 도구 정의, 사용자 선택, 입력 파라미터 등 모든 관련 상태를 관리합니다.
 *  - 3. (실행 로직) `/api/tools/invoke`를 호출하고 그 결과를 `chatStore`에 기록하는 로직을 수행합니다.
 *
 * @주요관계
 *  - (임포트) ← `A1Dev.jsx`
 *  - (임포트) → `./ToolsPanel.jsx`
 *  - (상태 관리) → `chatStore`
 *  - (API 호출) → `/api/tools/definitions`, `/api/tools/invoke`
 *
 * @참고사항
 *  - [리팩토링 후보] 현재는 책임 분리가 잘 되어 있지만, 향후 도구 로직이 복잡해지면 `invokeTool` 함수를
 *    별도의 커스텀 훅(예: `useToolInvoker.js`)으로 분리하는 리팩토링을 고려할 수 있습니다.
 * ---------------------------------------------------------------------------
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import ToolsPanel from "@/components/tools/ToolsPanel";
import { chatStore, getActiveThread } from "@/state/chatStore";
import {
  getSelectedToolIds as lsGetSelectedToolIds,
  setSelectedToolIds as lsSetSelectedToolIds,
} from "@/hooks/usePrefs";

/**
 * ToolsManager
 * - Container/controller for MCP-lite tools UX.
 * - Owns: tool definitions, selections, parameter inputs, invoke lifecycle.
 * - Renders: ToolsPanel (presentational).
 *
 * Props:
 * - show: boolean — whether to show the floating panel
 * - onClose?: () => void
 * - title?: string — panel title (default: "MCP Tools")
 * - definitionsUrl?: string (default: "/api/tools/definitions")
 * - invokeUrl?: string (default: "/api/tools/invoke")
 *
 * Notes:
 * - Respects ST-1206 by using existing ToolsPanel (absolute overlay; no extra scrollers under #a1).
 * - Persists selected tool ids via localStorage (usePrefs helpers).
 */
export default function ToolsManager({
  show,
  onClose,
  title = "MCP Tools",
  definitionsUrl = "/api/tools/definitions",
  invokeUrl = "/api/tools/invoke",
}) {
  const [tools, setTools] = useState([]); // [{ id, name, description, params }]
  const [selectedToolIds, setSelectedToolIds] = useState(
    lsGetSelectedToolIds() || [],
  );
  const [paramInputs, setParamInputs] = useState({}); // { [toolId]: { [param]: value } }
  const [busyMap, setBusyMap] = useState({}); // { [toolId]: boolean }
  const [error, setError] = useState(null);

  // Load tool definitions; prune persisted selections to valid tool ids
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(definitionsUrl, { method: "GET" });
        if (!alive) return;
        if (!res.ok) {
          setError(`Failed to load tools: ${res.status} ${res.statusText}`);
          setTools([]);
          return;
        }
        const json = (await res.json().catch(() => ({}))) || {};
        const defs = Array.isArray(json?.tools) ? json.tools : [];
        setTools(defs);

        // Prune selected ids to defs
        const persisted = lsGetSelectedToolIds() || [];
        const valid = persisted.filter((id) =>
          defs.some((d) => d.id === id || d.name === id),
        );
        setSelectedToolIds(valid);
        lsSetSelectedToolIds(valid);
      } catch (e) {
        if (!alive) return;
        setError(e?.message || String(e));
        setTools([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, [definitionsUrl]);

  // Simple param setter
  const setParam = useCallback((toolId, key, value) => {
    setParamInputs((prev) => {
      const next = { ...prev };
      const cur = { ...(next[toolId] || {}) };
      cur[key] = value;
      next[toolId] = cur;
      return next;
    });
  }, []);

  // Selection change: update state + persist
  const onChangeSelectedToolIds = useCallback((nextIds) => {
    const safe = Array.isArray(nextIds) ? nextIds : [];
    setSelectedToolIds(safe);
    lsSetSelectedToolIds(safe);
  }, []);

  // Tool invocation (manual)
  const invokeTool = useCallback(
    async (tool) => {
      const id = tool?.id || tool?.name;
      const name = tool?.name || tool?.id;
      if (!id || !name) return;

      const args = paramInputs[id] || {};
      try {
        setBusyMap((m) => ({ ...m, [id]: true }));
        setError(null);

        // Log to store + echo in timeline
        const t = getActiveThread();
        const invId = chatStore.actions.logToolCall(t.id, name, args);
        chatStore.actions.addAssistantMessage(
          `🔧 ${name} ${safeJSONString(args)}`,
          { toolCall: { tool: name, args } },
        );

        const res = await fetch(invokeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tool: name, args }),
        });

        const json = (await res.json().catch(() => ({}))) || {};
        const ok = !!json.ok;
        const data = json.data;
        const err = json.error;

        chatStore.actions.logToolResult(invId, { ok, data, error: err });

        const pretty = ok
          ? safeJSONString(data)
          : `⚠️ ${err || "Invoke failed"}`;
        chatStore.actions.addAssistantMessage(pretty, {
          toolResult: { ok, data, error: err },
        });
      } catch (e) {
        const msg = e?.message || String(e);
        setError(msg);
        chatStore.actions.addAssistantMessage(`⚠️ Tool error: ${msg}`);
      } finally {
        setBusyMap((m) => ({ ...m, [id]: false }));
      }
    },
    [paramInputs, invokeUrl],
  );

  // Derive visible selection from defs+ids
  const visibleTools = useMemo(() => tools, [tools]);

  if (!show) return null;

  return (
    <ToolsPanel
      title={title}
      tools={visibleTools}
      selectedToolIds={selectedToolIds}
      onChangeSelectedToolIds={onChangeSelectedToolIds}
      paramInputs={paramInputs}
      onChangeParam={setParam}
      busyMap={busyMap}
      onInvoke={invokeTool}
      onClose={onClose}
    />
  );
}

/* utils */
function safeJSONString(v) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}
