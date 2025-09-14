/**
 * [금강 AI 주석 v1.1]
 * ---------------------------------------------------------------------------
 * @파일경로: ui/dev_a1_vite/src/components/A1Dev.jsx
 * @분석일자: 2025-09-10T16:03Z (UTC) / 2025-09-11 01:04 (KST)
 * @작성자: Gemini (금강 AI)
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - 금강 UI의 최상위 루트 컴포넌트로, 모든 UI 요소와 상태, 로직을 조립하는 중앙 허브 역할을 합니다.
 *
 * @핵심역할
 *  - 1. (상태 관리) `useState`, `useEffect`, `chatStore`를 통해 앱의 모든 핵심 상태를 관리합니다.
 *  - 2. (레이아웃 조립) `A1Grid`, `LeftThreadsPane` 등 하위 레이아웃 컴포넌트를 조립하여 UI를 완성합니다.
 *  - 3. (이벤트 처리) 사용자의 채팅 입력을 받아 백엔드 API와 상호작용하는 `send` 함수를 정의합니다.
 *
 * @주요관계
 *  - (참조) ← `/src/main.jsx`
 *  - (임포트) → `@/components/*`, `@/hooks/*`, `@/state/chatStore`
 *  - (API 호출) → `/api/tools/definitions`, `/api/chat/*`
 *
 * @참고사항
 *  - [리팩토링 후보] 코드 길이가 400줄을 초과하고, UI 조립, 전역 상태 관리, 비즈니스 로직(`send` 함수) 등
 *    너무 많은 책임을 수행하여 '1파일 1책임 원칙'에 위배됩니다.
 *  - 향후 `send` 함수는 별도의 커스텀 훅으로 분리하고, 상태 관리를 컨테이너 컴포넌트로 분해하는 리팩토링이 권장됩니다.
 * ---------------------------------------------------------------------------
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "@/styles/a1.css";
import { shouldPassGate } from "@/guard/sgmGate";
import { buildThreadContextEvidence } from "@/evidence/threadContext";
import {
  callChatAPI,
  callToolcallAPI,
  buildEvidenceStrings,
  buildSystemMessages,
  buildPayload,
  scoreAndFilterEvidence,
} from "@/features/chat/sendPipeline";

import useSimpleMode from "@/hooks/useSimpleMode";
import useHealth from "@/hooks/useHealth";
import useGuardrails from "@/hooks/useGuardrails";
import useComposerSpace from "@/hooks/useComposerSpace";

import {
  chatStore,
  getActiveThread,
  listThreads,
  listAgents,
} from "@/state/chatStore";

import {
  getChatBackendPref,
  setChatBackendPref,
  chatApiBase,
  getToolModePref,
  setToolModePref,
  getSelectedToolIds,
  setSelectedToolIds,
  getCCOpenPref,
  setCCOpenPref,
  getCCTabPref,
  setCCTabPref,
  getLeftCollapsedPref,
  setLeftCollapsedPref,
} from "@/hooks/usePrefs";

import A1Grid from "@/components/layout/A1Grid";
import LeftThreadsPane from "@/components/layout/LeftThreadsPane";
import CenterStage from "@/components/layout/CenterStage";
import TopToolbar from "@/components/chat/TopToolbar";
import EdgeToggles from "@/components/EdgeToggles";
import Composer from "@/components/chat/Composer";
import CommandCenterDrawer from "@/components/CommandCenterDrawer";
import ToolsManager from "@/components/tools/ToolsManager";

/**
 * Global one-shot stick-to-bottom trigger for ChatTimeline.
 * ChatTimeline will read and consume this flag when messages change.
 */
if (typeof window !== "undefined") {
  window.__GG_FORCE_STICK_NEXT__ = false;
}

export default function A1Dev() {
  // URL routing
  const { threadId } = useParams();
  const navigate = useNavigate();

  // Simple mode (global scroll hidden)
  useSimpleMode({ enabled: true });

  // Health status (Backend/Bridge)
  const { backend, bridge } = useHealth();

  // Command Center (right drawer)
  const [showCC, setShowCC] = useState(getCCOpenPref());
  const [ccTab, setCCTab] = useState(getCCTabPref()); // planner | insights | executor | agents | prompts | files | bookmarks

  // Center router mode
  const [mainMode, setMainMode] = useState(() => {
    try {
      return localStorage.getItem("GG_MAIN_MODE") || "chat";
    } catch {
      return "chat";
    }
  });

  // Left threads collapse state
  const [leftCollapsed, setLeftCollapsed] = useState(getLeftCollapsedPref());

  // Tools panel (floating overlay)
  const [showToolsPanel, setShowToolsPanel] = useState(false);

  // Tool Mode (LLM tool-calling)
  const [toolMode, setToolMode] = useState(getToolModePref() === "on");

  // Tool definitions (for /api/chat/toolcall) + selected ids
  const [tools, setTools] = useState([]); // [{id,name,description,params}]
  const [selectedToolIds, setSelectedToolIdsState] =
    useState(getSelectedToolIds());

  // Chat store bindings
  const [tick, setTick] = useState(0);
  const [storeReady, setStoreReady] = useState(false);

  // Wait for chatStore initialization
  useEffect(() => {
    chatStore.waitForInit().then(() => {
      setStoreReady(true);
      setTick((t) => t + 1); // Force initial render
    });
  }, []);

  useEffect(() => {
    if (!storeReady) return;
    const unsub = chatStore.subscribe(() => setTick((t) => t + 1));
    return () => unsub();
  }, [storeReady]);
  const agents = listAgents();
  const threads = listThreads();
  const activeThread = getActiveThread();
  const activeAgent =
    agents.find((a) => a.id === (activeThread?.agentId || "")) || agents[0];

  // Load thread from URL on mount or when threadId changes
  useEffect(() => {
    if (threadId && threads.find((t) => t.id === threadId)) {
      chatStore.actions.switchThread(threadId);
    }
  }, [threadId, threads.length]);

  // Update URL when active thread changes
  useEffect(() => {
    if (activeThread?.id) {
      const currentPath = window.location.pathname;
      const expectedPath = `/ui-dev/thread/${activeThread.id}`;
      if (!currentPath.endsWith(activeThread.id)) {
        navigate(`/thread/${activeThread.id}`, { replace: true });
      }
    } else if (!threadId) {
      // If no active thread and not on home, go to home
      const currentPath = window.location.pathname;
      if (currentPath !== "/ui-dev/" && currentPath !== "/ui-dev") {
        navigate("/", { replace: true });
      }
    }
  }, [activeThread?.id, navigate]);

  // Provider-aware Tool Mode block
  const modelName = (activeAgent?.model || "").toLowerCase();
  const toolBlocked =
    toolMode &&
    (modelName.startsWith("claude") || modelName.startsWith("gemini"));

  // Persist and guardrails
  useEffect(() => {
    setCCOpenPref(showCC);
  }, [showCC]);
  useEffect(() => {
    setCCTabPref(ccTab);
  }, [ccTab]);
  useEffect(() => {
    setLeftCollapsedPref(leftCollapsed);
  }, [leftCollapsed]);
  useEffect(() => {
    try {
      localStorage.setItem("GG_MAIN_MODE", mainMode);
    } catch {
      /* noop */
    }
  }, [mainMode]);
  useGuardrails({ enabled: mainMode === "chat" && !leftCollapsed });

  // Reserve bottom space equal to composer height for both scrollers
  useComposerSpace({
    varName: "--gg-composer-h",
    targets: ["#chat-msgs", "#gg-threads"],
    includeRootVar: true,
  });

  // Load tools (for toolcall) and prune persisted selections
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/tools/definitions");
        if (!alive) return;
        if (!r.ok) return;
        const j = await r.json().catch(() => ({}));
        const defs = Array.isArray(j?.tools) ? j.tools : [];
        setTools(defs);
        const valid = getSelectedToolIds().filter((id) =>
          defs.some((d) => d.id === id || d.name === id),
        );
        setSelectedToolIdsState(valid);
        setSelectedToolIds(valid);
      } catch {
        // ignore fetch errors; Tool Mode will gracefully fall back
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Build tool defs for current selection (memoized)
  const activeToolDefs = useMemo(() => {
    const ids = selectedToolIds || [];
    return (tools || []).filter(
      (d) => ids.includes(d.id) || ids.includes(d.name),
    );
  }, [tools, selectedToolIds]);

  // Send handler (chat) — evidence-based pipeline (Recall → Gate → Reason → Record)
  const send = async (valText) => {
    const val = typeof valText === "string" ? valText.trim() : "";
    if (!val) return;

    // Force the timeline to stick to bottom for the next change (heartbeat/stream)
    try {
      window.__GG_FORCE_STICK_NEXT__ = true;
    } catch {
      /* ignore */
    }

    // 1) Add user message and auto-title if first message
    const t0 = getActiveThread();
    const wasFirst = !t0.messages.some((m) => m.role === "user");
    chatStore.actions.sendUserMessage(val);
    if (wasFirst) {
      const snippet = val.length > 30 ? val.slice(0, 30) + "…" : val;
      chatStore.actions.renameThread(t0.id, snippet || "Untitled");
    }

    try {
      // 2) Context & preferences
      const t = getActiveThread();
      const agent =
        listAgents().find((a) => a.id === t.agentId) || listAgents()[0];
      const base = chatApiBase();
      const backendPref = getChatBackendPref();

      // 2-1) Record (user) — ultra_short memory
      try {
        await fetch(`${base}/memory/store`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier: "ultra_short",
            text: val,
            refs: [],
            mode: "NORMAL",
            sessionId: t.id,
          }),
        });
      } catch {
        /* ignore memory errors */
      }

      // 2-2) Recall (search top-k evidence + SSOT fallback)
      let recallItems = [];
      try {
        const u = new URL(`${base}/memory/search`, window.location.origin);
        u.searchParams.set("q", val);
        u.searchParams.set("k", "5");
        u.searchParams.set("need_fresh", "1");
        u.searchParams.set("self_rag", "1");
        const r = await fetch(u.toString(), { method: "GET" });
        if (r.ok) {
          const sr = await r.json().catch(() => ({}));
          recallItems = Array.isArray(sr?.data?.items)
            ? sr.data.items.slice(0, 3)
            : [];
        }
      } catch {
        recallItems = [];
      }

      // SSOT fallback: checkpoints view (FastAPI)
      try {
        const needSSOT = !(
          Array.isArray(recallItems) &&
          recallItems.some(
            (it) =>
              typeof it?.path === "string" &&
              (it.path.includes("gumgang_meeting/.rules") ||
                it.path.includes("status/checkpoints/CKPT_72H_RUN.jsonl") ||
                it.path.includes("gumgang_meeting/app/api.py") ||
                it.path.includes("docs/0_0_금강 발원문 원본.md")),
          )
        );
        if (needSSOT) {
          const v = new URL(`${base}/checkpoints/view`, window.location.origin);
          v.searchParams.set("fmt", "json");
          const vr = await fetch(v.toString(), { method: "GET" });
          if (vr.ok) {
            const j = await vr.json().catch(() => ({}));
            const items = Array.isArray(j?.items) ? j.items.slice(-3) : [];
            if (items.length) {
              const ckptHints = items
                .map((it, i) => {
                  const part = [it?.run_id, it?.scope, it?.decision]
                    .filter(Boolean)
                    .join(" · ");
                  return `${i + 1}. ${part || "(checkpoint)"}`;
                })
                .join("\n");
              recallItems = [
                ...(recallItems || []),
                {
                  path: "gumgang_meeting/status/checkpoints/CKPT_72H_RUN.jsonl",
                  line_from: 1,
                  line_to: 1,
                  text: `체크포인트 원장 참고:\n${ckptHints}`.slice(0, 480),
                },
              ];
            }
          }
        }
      } catch {
        /* ignore */
      }

      // Optional SSOT fallback: docs read via Bridge (if reachable)
      try {
        const needDocs = !(
          Array.isArray(recallItems) &&
          recallItems.some(
            (it) =>
              typeof it?.path === "string" &&
              it.path.includes("docs/0_0_금강 발원문 원본.md"),
          )
        );
        if (needDocs) {
          const dr = await fetch(
            `/bridge/api/fs/read?rootId=docs&path=${encodeURIComponent("0_0_금강 발원문 원본.md")}`,
            { method: "GET" },
          );
          if (dr.ok) {
            const dj = await dr.json().catch(() => ({}));
            const txt = (dj?.content || dj?.raw || "").slice(0, 480);
            if (txt) {
              recallItems = [
                ...(recallItems || []),
                {
                  path: "gumgang_meeting/docs/0_0_금강 발원문 원본.md",
                  line_from: 1,
                  line_to: 1,
                  text: txt,
                },
              ];
            }
          }
        }
      } catch {
        /* ignore */
      }

      // Topic-aware SSOT synthesis (Tool Mode / toolcall / MCP)
      try {
        const ql = String(val || "").toLowerCase();
        const looksTool =
          /(tool\s*mode|toolcall|tools\/definitions|mcp|tool\s*call)/i.test(ql);
        if (looksTool) {
          const synth = [
            {
              path: "gumgang_meeting/app/api.py",
              line_from: 1,
              line_to: 1,
              text: "API 게이트웨이(app/api.py) — threads/memory/checkpoints 및 도구 관련 라우트 정의(근거용 경로).",
            },
            {
              path: "gumgang_meeting/gumgang_0_5/backend/app/api/routes/chat_gateway.py",
              line_from: 1,
              line_to: 1,
              text: "chat_gateway.py — tools/definitions, tools/invoke, chat/toolcall 구현(근거용 경로).",
            },
            {
              path: "gumgang_meeting/ui/dev_a1_vite/src/components/A1Dev.jsx",
              line_from: 1,
              line_to: 1,
              text: "A1Dev.jsx — Tool Mode 분기 및 /api/chat/toolcall 선택 로직(근거용 경로).",
            },
          ];
          recallItems = [...(recallItems || []), ...synth];
        }
      } catch {
        /* ignore */
      }

      // Thread-aware synthesis - always include thread context for continuity
      try {
        const ql = String(val || "").toLowerCase();
        // Include thread context for recognition, summary, or general thread questions
        const looksThreadAware =
          /(이 스레드|이 대화|this thread|현재 스레드|thread|스레드|대화|인식|recognize|aware)/i.test(
            ql,
          ) ||
          /(너|당신|you|ai).*(알|인식|기억|understand|know|remember)/i.test(ql);

        if ((t?.messages && t.messages.length > 0) || looksThreadAware) {
          const item = buildThreadContextEvidence(t);
          if (item) {
            recallItems = [...(recallItems || []), item];
          }
        }
      } catch {
        /* ignore */
      }

      // 2-3) Build evidence messages (SSOT-priority + conservative thresholds)
      // SSOT priority list (includes 함장 지정 경로)
      const SSOT_PRIORITY = [
        "gumgang_meeting/.rules",
        "gumgang_meeting/status/checkpoints/CKPT_72H_RUN.jsonl",
        "gumgang_meeting/app/api.py",
        "gumgang_meeting/docs/0_0_금강 발원문 원본.md",
      ];
      const isSSOT = (p) => {
        const s = String(p || "");
        // Accept both absolute (with gumgang_meeting/) and relative paths
        const bare = s.replace(/^gumgang_meeting\//, "");
        const prefixed = s.startsWith("gumgang_meeting/")
          ? s
          : `gumgang_meeting/${bare.replace(/^\/+/, "")}`;
        return SSOT_PRIORITY.some((k) => {
          const kb = k.replace(/^gumgang_meeting\//, "");
          return (
            s.includes(k) ||
            s.includes(kb) ||
            bare.includes(kb) ||
            prefixed.includes(k)
          );
        });
      };
      const isTierMemo = (p) =>
        String(p || "").includes("status/evidence/memory/tiers/");
      const tokenize = (s) =>
        String(s || "")
          .toLowerCase()
          .split(/[^a-z0-9가-힣_]+/g)
          .filter((x) => x && x.length >= 2); // 1자 토큰 제외(잡음 감소)
      const qTokens = tokenize(val);

      const scored = (recallItems || []).map((h) => {
        const path = h?.path || "";
        const text = h?.text || "";
        const tks = tokenize(text);
        const overlap =
          tks.filter((tk) => qTokens.includes(tk)).length /
          Math.max(1, qTokens.length);
        const ss = isSSOT(path) ? 1 : 0;
        const tierPenalty = isTierMemo(path) ? -0.25 : 0;
        const total = overlap + ss + tierPenalty; // 보수형: 의미겹침 + SSOT 보너스 - tiers 패널티
        return { h, path, overlap, total, ss, tierPenalty };
      });

      // 보수형 필터: SSOT이거나 overlap≥0.2
      const filtered = scoreAndFilterEvidence(
        (recallItems || []).map((h) => ({ h, path: h.path })),
        { query: String(val || "") },
      );

      const top = filtered.slice(0, 3);
      const { bullets: normBullets, refs: normRefs } =
        buildEvidenceStrings(top);

      // 2-4) Hardened Strict gate (보수형)
      // - SSOT가 1개 이상 있어야 통과
      // - 아니면 overlap 상위 항목이 있고, 전부 tiers 경로만이 아니며, 최상위 overlap≥0.4 여야 통과
      const STRICT_GATE = true;
      const hasSSOT = top.some((s) => isSSOT(s.path) && s.overlap >= 0.05);
      const onlyTiers = top.length > 0 && top.every((s) => isTierMemo(s.path));
      const topOverlap = top.length > 0 ? top[0].overlap : 0;
      const hasThreadEvidence = top.some((s) =>
        String(s.path || "").includes("/threads/"),
      );
      const isThreadQuestion =
        /(이 스레드|이 대화|thread|스레드|인식|recognize|aware|너.*알|너.*기억|의미|의도|주제|무엇|뭐야|무엇인지|about|topic|purpose)/i.test(
          String(val || ""),
        );
      const isSummaryQuestion = /(요약|summary|summarize|정리|핵심)/i.test(
        String(val || ""),
      );
      const gatePass = shouldPassGate({
        top,
        onlyTiers,
        hasSSOT,
        query: String(val || ""),
      });

      if (STRICT_GATE && !gatePass) {
        const hold =
          "[SGM: 근거 부족 – 답변 보류]\n(필요한 1차 근거 후보: .rules, status/checkpoints/CKPT_72H_RUN.jsonl, app/api.py, docs/0_0_금강 발원문 원본.md)";
        chatStore.actions.addAssistantMessage(hold);
        try {
          await fetch(`${base}/memory/store`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tier: "ultra_short",
              text: hold,
              refs: [],
              mode: "NORMAL",
              sessionId: t.id,
            }),
          });
        } catch {
          /* ignore */
        }
        return;
      }

      // 2-5) Show evidence summary as assistant side-note (if any; SSOT 우선 표시)
      if (top.length > 0) {
        const evMsg = `증거 ${top.length}건:\n${normBullets}\n\n근거 인용: ${normRefs.join(", ")}`;
        chatStore.actions.addAssistantMessage(evMsg);
      }

      // 3) Build payload with evidence-system injection
      const _isThreadQuestion =
        /(이 스레드|이 대화|thread|스레드|인식|recognize|aware|너.*알|너.*기억)/i.test(
          String(val || "").toLowerCase(),
        );
      const threadContext =
        _isThreadQuestion && t?.messages && t.messages.length > 0
          ? `현재 스레드 정보:
      - 스레드 ID: ${t.id}
      - 제목: ${t.title || "Untitled"}
      - 메시지 수: ${t.messages.length}
      - 첫 메시지: ${t.messages[0]?.content?.slice(0, 100) || ""}
      - 마지막 메시지: ${t.messages[t.messages.length - 1]?.content?.slice(0, 100) || ""}

      당신은 이 스레드의 전체 대화 내용을 인식하고 있으며, 사용자가 "이 스레드"나 "이 대화"를 언급할 때 위 컨텍스트를 참조해야 합니다.`
          : undefined;

      const systemMsgs = buildSystemMessages({
        agentSystemPrompt: agent?.systemPrompt,
        evidenceBullets: top.length > 0 ? normBullets : undefined,
        threadContext,
      });

      const history = t.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payload = buildPayload(agent?.model, systemMsgs, history, 0.7);

      // 4) Placeholder assistant message (after gate)
      const placeholderId = chatStore.actions.addAssistantMessage("…", {
        streaming: true,
        placeholder: true,
      });

      // 5) Choose API: toolcall vs stream vs single
      const isClaudeOrGemini =
        (agent?.model || "").toLowerCase().startsWith("claude") ||
        (agent?.model || "").toLowerCase().startsWith("gemini");
      const effectiveToolMode = toolMode && !isClaudeOrGemini;

      let reply = "";

      if (effectiveToolMode) {
        // Use toolcall endpoint via sendPipeline helper
        reply = await callToolcallAPI(base, payload, activeToolDefs);
      } else {
        // Prefer streaming (SSE) unless using Bridge
        const res =
          backendPref === "bridge"
            ? null
            : await fetch(`${base}/chat/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });

        if (
          res &&
          res.ok &&
          res.body &&
          (res.headers.get("content-type") || "").includes("text/event-stream")
        ) {
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = "";
          let assembled = "";
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buf += dec.decode(value, { stream: true });

            let sep;
            while ((sep = buf.indexOf("\n\n")) !== -1) {
              const part = buf.slice(0, sep);
              buf = buf.slice(sep + 2);
              if (part.startsWith("data: ")) {
                const chunk = part.slice(6);
                if (chunk) {
                  assembled += chunk;
                  chatStore.actions.patchMessage(t.id, placeholderId, {
                    content: assembled,
                  });
                }
              }
            }
          }
          if (!assembled) {
            // Fallback to non-stream
            reply = await callChatAPI(base, payload);
          } else {
            reply = assembled;
          }
        } else {
          // Simple single response via sendPipeline helper
          reply = await callChatAPI(base, payload);
        }
      }

      // 6) Patch placeholder with final reply
      chatStore.actions.patchMessage(t.id, placeholderId, {
        content: reply,
        meta: { streaming: false, placeholder: false },
      });

      // 7) Record (assistant) — ultra_short memory
      try {
        await fetch(`${base}/memory/store`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tier: "ultra_short",
            text: reply,
            refs: evidenceRefs,
            mode: "NORMAL",
            sessionId: t.id,
          }),
        });
      } catch {
        /* ignore memory errors */
      }
    } catch (e) {
      const t = getActiveThread();
      chatStore.actions.addAssistantMessage(
        `⚠️ 호출 실패: ${e?.message || String(e)}`,
      );
    }
  };

  // Import Threads handler (server → local)
  useEffect(() => {
    // Import threads event handler - fetch all available threads
    const onImport = async () => {
      const base = chatApiBase();
      try {
        // First, try to get count of available threads
        chatStore.actions.addAssistantMessage(`🔄 스레드 가져오기 시작...`);

        // Fetch with higher limit (up to 500 threads)
        const res = await fetch(`${base}/threads/recent?limit=500`);
        const json = await res.json();
        const items = Array.isArray(json?.data?.items) ? json.data.items : [];

        if (items.length === 0) {
          chatStore.actions.addAssistantMessage(`ℹ️ 가져올 스레드가 없습니다.`);
          return;
        }

        chatStore.actions.addAssistantMessage(
          `📥 ${items.length}개 스레드 발견, 상세 정보 로드 중...`,
        );

        let successCount = 0;
        let failCount = 0;

        // Process threads in batches to avoid overwhelming the server
        const batchSize = 10;
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          const batchPromises = batch.map(async (it) => {
            const id = String(it?.convId || "");
            if (!id) return false;

            try {
              // migrated endpoint already includes turns, no need for separate read
              const turns = Array.isArray(it?.turns) ? it.turns : [];

              if (turns.length === 0) {
                // Fallback to read endpoint if turns not included
                const rr = await fetch(
                  `${base}/threads/read?convId=${encodeURIComponent(id)}`,
                );
                const jj = await rr.json();
                const turns0 = Array.isArray(jj?.data?.turns)
                  ? jj.data.turns
                  : [];
                const evPath =
                  typeof jj?.data?.path === "string" ? jj.data.path : undefined;
                const processedTurns = turns0.map((u) => ({
                  ...u,
                  meta: { ...((u && u.meta) || {}), evidence_path: evPath },
                }));
                chatStore.actions.upsertImportedThread(
                  id,
                  it?.title || id,
                  processedTurns,
                );
              } else {
                // Use turns from migrated data directly
                chatStore.actions.upsertImportedThread(
                  id,
                  it?.title || id,
                  turns,
                );
              }
              return true;
            } catch {
              return false;
            }
          });

          const results = await Promise.all(batchPromises);
          successCount += results.filter((r) => r).length;
          failCount += results.filter((r) => !r).length;

          // Update progress
          const progress = Math.min(i + batchSize, items.length);
          if (progress < items.length) {
            chatStore.actions.addAssistantMessage(
              `📊 진행 상황: ${progress}/${items.length} 처리 중...`,
            );
          }
        }

        chatStore.actions.addAssistantMessage(
          `✅ Import 완료: ${successCount}개 성공${failCount > 0 ? `, ${failCount}개 실패` : ""}`,
        );
      } catch (e) {
        chatStore.actions.addAssistantMessage(
          `⚠️ Import 실패: ${e?.message || String(e)}`,
        );
      }
    };

    // Export threads event handler
    const onExport = () => {
      chatStore.actions.exportThreads();
    };

    window.addEventListener("gg:import-threads", onImport);
    window.addEventListener("gg:export-threads", onExport);

    return () => {
      window.removeEventListener("gg:import-threads", onImport);
      window.removeEventListener("gg:export-threads", onExport);
    };
  }, []);

  // Show loading while store initializes
  if (!storeReady) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        <div>Loading threads...</div>
      </div>
    );
  }

  return (
    <>
      {/* Command Center (fixed overlay outside #a1 flow) */}
      <CommandCenterDrawer
        show={showCC}
        activeTab={ccTab}
        onTabChange={(k) => {
          setCCTab(k);
          setMainMode(k);
        }}
        onClose={() => setShowCC(false)}
        onOpenInMain={(k) => {
          setMainMode(k || ccTab);
          setShowCC(false);
        }}
        plannerData={{
          threadId: activeThread?.id,
          title: activeThread?.title,
          lastMessage: (() => {
            try {
              const msgs = activeThread?.messages || [];
              return msgs[msgs.length - 1]?.content;
            } catch {
              return undefined;
            }
          })(),
        }}
        insightsData={{ backend, bridge }}
        executorData={(() => {
          try {
            const state = chatStore.getState();
            const invs = (state?.mcp?.invocations || []).filter(
              (x) => x.threadId === activeThread.id,
            );
            return invs[invs.length - 1] || null;
          } catch {
            return null;
          }
        })()}
      />

      {/* Edge toggles (left/right chevrons with auto-fade) */}
      <EdgeToggles
        showLeft
        showRight
        leftCollapsed={leftCollapsed}
        rightOpen={showCC}
        onToggleLeft={() => setLeftCollapsed((v) => !v)}
        onToggleRight={() => setShowCC((v) => !v)}
      />

      {/* Main grid shell */}
      <A1Grid
        mainMode={mainMode}
        leftCollapsed={leftCollapsed}
        header={
          <TopToolbar
            backendStatus={backend}
            bridgeStatus={bridge}
            agents={agents}
            activeAgentId={activeThread?.agentId || ""}
            onChangeAgent={(id) =>
              chatStore.actions.setAgentForThread(activeThread.id, id)
            }
            onCreateThread={() =>
              chatStore.actions.createThread(
                `Thread ${threads.length + 1}`,
                activeThread?.agentId || agents[0]?.id || "",
              )
            }
            backendPrefLabel={
              getChatBackendPref() === "bridge" ? "Bridge" : "FastAPI"
            }
            onToggleBackend={() => {
              const cur = getChatBackendPref();
              const next = cur === "fastapi" ? "bridge" : "fastapi";
              setChatBackendPref(next);
              window.location.reload();
            }}
            toolModeOn={toolMode}
            toolBlocked={toolBlocked}
            onToggleToolMode={() => {
              const next = toolMode ? "off" : "on";
              setToolMode(next === "on");
              setToolModePref(next);
            }}
            onToggleToolsPanel={() => setShowToolsPanel((v) => !v)}
            onOpenPanels={() => {
              setMainMode(ccTab);
              setShowCC(true);
            }}
            onOpenSnapshot={() =>
              window.open(
                "http://localhost:3037/ui/snapshots/unified_A1-A4_v0/index.html",
                "_blank",
              )
            }
            onReload={() => window.location.reload()}
            leftCollapsed={leftCollapsed}
            onToggleLeftCollapsed={() => setLeftCollapsed((v) => !v)}
          />
        }
        left={
          <LeftThreadsPane
            threads={threads}
            activeThreadId={activeThread?.id || ""}
            onSwitch={(id) => chatStore.actions.switchThread(id)}
            onRename={(id, name) => chatStore.actions.renameThread(id, name)}
            onDelete={(id) => chatStore.actions.deleteThread(id)}
          />
        }
        center={
          <CenterStage
            mode={mainMode}
            thread={activeThread}
            onBackToChat={() => setMainMode("chat")}
          />
        }
        composer={<Composer onSend={send} />}
      />

      {/* MCP Tools floating manager */}
      {showToolsPanel && (
        <ToolsManager
          show={showToolsPanel}
          onClose={() => setShowToolsPanel(false)}
        />
      )}
    </>
  );
}
