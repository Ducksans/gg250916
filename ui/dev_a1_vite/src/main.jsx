import React, { StrictMode, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  chatStore,
  getActiveThread,
  listThreads,
  listAgents,
} from "@/state/chatStore";

/**
 * Gumgang UI — A1 Dev (Vite + React)
 * - Dev URL: http://localhost:5173/ui-dev/
 * - Proxies (vite.config.ts):
 *    /api     -> http://127.0.0.1:8000   (FastAPI)
 *    /bridge  -> http://127.0.0.1:3037   (Bridge: static UI & file ops)
 *
 * ST-1206 Guardrails respected:
 *  - body.simple → html, body { overflow: hidden } (simple mode only)
 *  - #a1-wrap is grid; rows = auto minmax(0,1fr) auto
 *  - Exactly 2 scrollers in #a1: #gg-threads, #chat-msgs
 *  - #a1-wrap height = calc(100dvh - var(--gg-strip-h))
 *  - Composer actions marked: [data-gg="composer-actions"], grid col 2 (row 3)
 */

function useSimpleMode() {
  useEffect(() => {
    document.body.classList.add("simple");
    return () => document.body.classList.remove("simple");
  }, []);
}

/** Backend toggle helpers (C): localStorage-based */
function getChatBackendPref() {
  try {
    return localStorage.getItem("GG_CHAT_BACKEND") || "fastapi"; // 'fastapi' | 'bridge'
  } catch {
    return "fastapi";
  }
}
function setChatBackendPref(v) {
  try {
    localStorage.setItem("GG_CHAT_BACKEND", v);
  } catch {
    // ignore
  }
}
/** Returns '/api' (FastAPI) or '/bridge/api' (Bridge) */
function chatApiBase() {
  const b = getChatBackendPref();
  return b === "bridge" ? "/bridge/api" : "/api";
}

const css = `
  :root {
    --gg-bg: #0b0c10;
    --gg-fg: #e5e7eb;
    --gg-muted: #9aa4b2;
    --gg-accent: #22c55e;
    --gg-border: #1f2937;
    --gg-panel: #0f172a;
    --gg-strip-h: 54px;
    --gg-chat-width: clamp(720px, 84vw, 902px);
  }
  html, body, #root {
    height: 100%;
    background: var(--gg-bg);
    color: var(--gg-fg);
  }
  /* Simple-only global scroll hidden */
  body.simple {
    overflow: hidden;
  }

  /* A1 WRAP: 3-row grid (header, main, composer) */
  #a1-wrap {
    display: grid;
    grid-template-rows: auto minmax(0,1fr) auto;
    grid-template-columns: minmax(240px, 28vw) 1fr;
    gap: 0;
    height: calc(100dvh - var(--gg-strip-h));
    width: 100%;
    max-width: 100vw;
    margin: 0 auto;
  }
  header.gg-strip {
    grid-column: 1 / -1;
    height: var(--gg-strip-h);
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--gg-border);
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 10;
  }
  header.gg-strip h1 {
    font-size: 14px;
    margin: 0;
    letter-spacing: 0.2px;
    font-weight: 600;
  }
  header.gg-strip .actions {
    display: inline-flex;
    gap: 6px;
  }
  header.gg-strip .btn {
    appearance: none;
    border: 1px solid var(--gg-border);
    background: var(--gg-panel);
    color: var(--gg-fg);
    border-radius: 8px;
    padding: 6px 10px;
    font-size: 12px;
    cursor: pointer;
  }
  header.gg-strip .status-dot {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
  }
  .dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    display: inline-block;
  }
  .ok { background: #22c55e; }
  .bad { background: #ef4444; }
  .warn { background: #f59e0b; }

  /* MAIN (#a1): 2 scrollers only — threads + chat */
  #a1 {
    grid-row: 2;
    grid-column: 1 / -1;
    display: contents; /* place children directly on #a1-wrap grid */
  }
  #gg-threads {
    grid-row: 2;
    grid-column: 1 / 2;
    overflow: auto; /* allowed scroller #1 */
    border-right: 1px solid var(--gg-border);
    background: #0c1424;
    min-height: 0;
  }
  #chat-msgs {
    grid-row: 2;
    grid-column: 2 / 3;
    overflow: auto; /* allowed scroller #2 */
    min-height: 0;
  }
  .threads-list {
    padding: 8px;
    display: grid;
    gap: 6px;
  }
  .thread-item {
    padding: 8px;
    border: 1px solid var(--gg-border);
    border-radius: 8px;
    background: var(--gg-panel);
    cursor: pointer;
    font-size: 13px;
  }
  .thread-item.active {
    outline: 1px solid rgba(34, 197, 94, 0.35);
  }
  .thread-row {
    display: grid;
    grid-template-columns: 1fr auto;
    align-items: center;
    gap: 6px;
  }
  .thread-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .thread-actions {
    display: inline-flex;
    gap: 6px;
  }
  .thread-actions .mini {
    appearance: none;
    border: 1px solid var(--gg-border);
    background: transparent;
    color: var(--gg-muted);
    border-radius: 6px;
    padding: 2px 6px;
    font-size: 11px;
    cursor: pointer;
  }
  .thread-actions .mini:hover {
    color: var(--gg-fg);
    border-color: var(--gg-accent);
  }

  .chat-panel {
    max-width: var(--gg-chat-width);
    margin: 0 auto;
    padding: 14px 14px 18px;
    display: grid;
    gap: 10px;
  }
  .msg {
    padding: 10px 12px;
    border: 1px solid var(--gg-border);
    border-radius: 10px;
    background: #0e1527;
    font-size: 14px;
    line-height: 1.5;
    white-space: pre-wrap;
  }
  .msg.user { background: #111827; }
  .msg.assistant { background: #0f172a; }

  /* COMPOSER: row 3, column 2; actions marked data-gg="composer-actions" */
  footer.gg-composer {
    grid-row: 3;
    grid-column: 2;
    border-top: 1px solid var(--gg-border);
    background: rgba(15, 23, 42, 0.65);
    backdrop-filter: blur(8px);
  }
  .composer-wrap {
    max-width: var(--gg-chat-width);
    margin: 0 auto;
    padding: 10px 14px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 10px;
    align-items: end;
  }
  .composer-wrap textarea {
    width: 100%;
    min-height: 42px;
    max-height: 240px;
    resize: vertical;
    background: #0e1527;
    color: var(--gg-fg);
    border: 1px solid var(--gg-border);
    border-radius: 10px;
    padding: 10px 12px;
    font-size: 14px;
    line-height: 1.4;
    outline: none;
  }
  .composer-actions {
    display: grid;
    grid-auto-flow: column;
    gap: 8px;
  }
  .composer-actions .btn {
    appearance: none;
    border: 1px solid var(--gg-border);
    background: var(--gg-panel);
    color: var(--gg-fg);
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 13px;
    cursor: pointer;
  }
`;

/** Runtime guardrail sanity checks (console only) */
function runGuardrailAsserts() {
  try {
    const wrap = document.getElementById("a1-wrap");
    const threads = document.getElementById("gg-threads");
    const msgs = document.getElementById("chat-msgs");

    const styles = wrap ? getComputedStyle(wrap) : null;
    const isGrid = styles && styles.display === "grid";
    const rows = styles && styles.gridTemplateRows.replace(/\s+/g, " ");
    const rowsOk =
      rows?.includes("auto") &&
      (rows?.includes("1fr") || rows?.includes("minmax(0, 1fr)"));

    const scrollers = [threads, msgs].filter(
      (n) => n && getComputedStyle(n).overflow.includes("auto"),
    ).length;

    if (!isGrid) console.warn("[A1][guard] #a1-wrap is not grid");
    if (!rowsOk)
      console.warn('[A1][guard] #a1-wrap rows not "auto minmax(0,1fr) auto"');
    if (scrollers !== 2)
      console.warn(
        "[A1][guard] Expected exactly 2 scrollers (#gg-threads, #chat-msgs), got",
        scrollers,
      );
  } catch (e) {
    console.warn("[A1][guard] assert failed:", e?.message || e);
  }
}

function useHealth() {
  const [backend, setBackend] = useState("checking"); // ok | bad | checking
  const [bridge, setBridge] = useState("checking");

  useEffect(() => {
    let alive = true;
    const ping = async (url, setter) => {
      try {
        const r = await fetch(url, { method: "GET" });
        if (!alive) return;
        setter(r.ok ? "ok" : "bad");
      } catch {
        if (!alive) return;
        setter("bad");
      }
    };
    // Note: backend exposes /api/health under FastAPI (as per repo README)
    ping("/api/health", setBackend);
    // Bridge (Node) exposes /api/health on 3037; via proxy: /bridge/api/health
    ping("/bridge/api/health", setBridge);

    const t = setTimeout(runGuardrailAsserts, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, []);

  return { backend, bridge };
}

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

function A1Dev() {
  useSimpleMode();
  const { backend, bridge } = useHealth();

  // chatStore 연결 — 멀티스레드/멀티턴, 에이전트 선택, MCP 자리
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const unsub = chatStore.subscribe(() => setTick((t) => t + 1));
    return () => unsub();
  }, []);
  const agents = listAgents();
  const threads = listThreads();
  const activeThread = getActiveThread();

  const inputRef = useRef(null);

  const send = async () => {
    const val = inputRef.current?.value?.trim();
    if (!val) return;

    // 1) 유저 메시지 추가
    // Auto title: if this is the first user message in the thread, set title from it
    const t0 = getActiveThread();
    const wasFirst = !t0.messages.some((m) => m.role === "user");
    chatStore.actions.sendUserMessage(val);
    if (wasFirst) {
      const snippet = val.length > 30 ? val.slice(0, 30) + "…" : val;
      chatStore.actions.renameThread(t0.id, snippet || "Untitled");
    }
    inputRef.current.value = "";

    try {
      // 2) 활성 스레드/에이전트/메시지 페이로드 구성
      const t = getActiveThread();
      const agent =
        listAgents().find((a) => a.id === t.agentId) || listAgents()[0];

      const systemMsgs = agent?.systemPrompt
        ? [{ role: "system", content: agent.systemPrompt }]
        : [];

      const history = t.messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const payload = {
        model: agent?.model, // bridge가 기본 모델을 가질 경우 undefined 허용
        messages: [...systemMsgs, ...history],
        temperature: 0.7,
      };

      // 3) 자리표시자 어시스턴트 메시지
      const placeholderId = chatStore.actions.addAssistantMessage("…");

      // 4) FastAPI /api/chat 호출
      //    - 스트리밍 옵션(주석): /api/chat/stream SSE를 ReadableStream으로 수신 가능
      //    - 아래 단건 응답(fetch)로 기본 동작, 필요 시 stream 버전으로 교체
      //
      //    스트리밍 예시(참고):
      //    const controller = new AbortController();
      //    const res = await fetch("/api/chat/stream", {
      //      method: "POST",
      //      headers: { "Content-Type": "application/json" },
      //      body: JSON.stringify(payload),
      //      signal: controller.signal,
      //    });
      //    if (res.ok && res.body) {
      //      const reader = res.body.getReader();
      //      const dec = new TextDecoder();
      //      let acc = "";
      //      while (true) {
      //        const { value, done } = await reader.read();
      //        if (done) break;
      //        acc += dec.decode(value, { stream: true });
      //        // SSE 형식: "data: <chunk>\n\n" — 간단 파싱
      //        for (const line of acc.split("\n\n")) {
      //          if (line.startsWith("data: ")) {
      //            const chunk = line.slice(6);
      //            // chatStore.actions.patchMessage(t.id, placeholderId, { content: (prev + chunk) });
      //          }
      //        }
      //      }
      //    }
      // 스트리밍 우선: /api/chat/stream (SSE)
      let reply = "";
      const controller = new AbortController();
      const base = chatApiBase();
      const backendPref = getChatBackendPref();
      const res =
        backendPref === "bridge"
          ? null
          : await fetch(`${base}/chat/stream`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
              signal: controller.signal,
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

          // SSE: "data: <chunk>\n\n" 단위로 파싱
          let sep;
          while ((sep = buf.indexOf("\n\n")) !== -1) {
            const part = buf.slice(0, sep);
            buf = buf.slice(sep + 2);
            if (part.startsWith("data: ")) {
              const chunk = part.slice(6);
              if (chunk) {
                assembled += chunk;
                // 부분 업데이트(스트리밍 표시)
                chatStore.actions.patchMessage(t.id, placeholderId, {
                  content: assembled,
                });
              }
            }
          }
        }
        if (!assembled) {
          // If SSE yielded no chunks (e.g., non-SSE 200 from Bridge), fallback to JSON call
          const res2 = await fetch(`${base}/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (res2.ok) {
            const json = await res2.json().catch(() => ({}));
            reply =
              json?.data?.message?.content ??
              json?.message?.content ??
              json?.choices?.[0]?.message?.content ??
              json?.content ??
              "(응답 수신)";
          } else {
            reply = `⚠️ API 응답 오류: ${res2.status} ${res2.statusText}`;
          }
        } else {
          reply = assembled;
        }
      } else {
        // 폴백: 단건 호출
        const res2 = await fetch(`${base}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        if (res2.ok) {
          const json = await res2.json().catch(() => ({}));
          reply =
            json?.data?.message?.content ??
            json?.message?.content ??
            json?.choices?.[0]?.message?.content ??
            json?.content ??
            "(응답 수신)";
        } else {
          reply = `⚠️ API 응답 오류: ${res2.status} ${res2.statusText}`;
        }
      }

      // 5) 자리표시자 패치
      chatStore.actions.patchMessage(t.id, placeholderId, { content: reply });
    } catch (e) {
      const t = getActiveThread();
      chatStore.actions.addAssistantMessage(
        `⚠️ 호출 실패: ${e?.message || String(e)}`,
      );
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <header className="gg-strip" role="banner">
        <h1>Gumgang UI — A1 Dev (Vite)</h1>
        <div className="actions" aria-label="Status and Actions">
          <span>Backend</span> <Dot status={backend} />
          <span style={{ width: 6 }} />
          <span>Bridge</span> <Dot status={bridge} />
          <span style={{ width: 10 }} />
          <select
            aria-label="Agent"
            value={activeThread?.agentId || ""}
            onChange={(e) =>
              chatStore.actions.setAgentForThread(
                activeThread.id,
                e.target.value,
              )
            }
            className="btn"
            style={{ minWidth: 160 }}
          >
            {agents.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            className="btn"
            onClick={() =>
              chatStore.actions.createThread(
                `Thread ${threads.length + 1}`,
                activeThread?.agentId || agents[0]?.id || "",
              )
            }
            style={{ marginLeft: 6 }}
            title="새 스레드 생성"
          >
            New Thread
          </button>
          <button
            className="btn"
            onClick={() => {
              const cur = getChatBackendPref();
              const next = cur === "fastapi" ? "bridge" : "fastapi";
              setChatBackendPref(next);
              // 간단하게 새 설정 반영을 위해 리로드
              window.location.reload();
            }}
            style={{ marginLeft: 6 }}
            title="채팅 백엔드 전환(FastAPI ↔ Bridge)"
          >
            API: {getChatBackendPref() === "bridge" ? "Bridge" : "FastAPI"}
          </button>
          <button
            className="btn"
            onClick={() =>
              window.open(
                "http://localhost:3037/ui/snapshots/unified_A1-A4_v0/index.html",
                "_blank",
              )
            }
            style={{ marginLeft: 6 }}
            title="스냅샷 열기(3037)"
          >
            Snapshot
          </button>
          <button className="btn" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </header>

      <div id="a1-wrap">
        <section id="a1" role="main" aria-label="Chat Area">
          <aside id="gg-threads" aria-label="Threads">
            <div className="threads-list">
              {threads.map((t) => (
                <div
                  key={t.id}
                  className={`thread-item ${t.id === activeThread?.id ? "active" : ""}`}
                  onClick={() => chatStore.actions.switchThread(t.id)}
                >
                  <div className="thread-row">
                    <span className="thread-title">{t.title}</span>
                    <span className="thread-actions">
                      <button
                        className="mini"
                        title="Rename thread"
                        onClick={(e) => {
                          e.stopPropagation();
                          const name = window.prompt(
                            "스레드 제목을 입력하세요",
                            t.title || "",
                          );
                          if (name && name.trim()) {
                            chatStore.actions.renameThread(t.id, name.trim());
                          }
                        }}
                      >
                        Rename
                      </button>
                      <button
                        className="mini"
                        title="Delete thread"
                        onClick={(e) => {
                          e.stopPropagation();
                          const ok = window.confirm("이 스레드를 삭제할까요?");
                          if (ok) chatStore.actions.deleteThread(t.id);
                        }}
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </aside>

          <div id="chat-msgs" aria-label="Messages">
            <div className="chat-panel">
              {activeThread.messages.map((m) => (
                <div key={m.id} className={`msg ${m.role}`}>
                  <strong>{m.role === "user" ? "You" : "Gumgang"}</strong>
                  <div>{m.content}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="gg-composer" role="contentinfo">
          <div className="composer-wrap">
            <textarea
              ref={inputRef}
              placeholder="메시지를 입력하세요…"
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
            <div className="composer-actions" data-gg="composer-actions">
              <button className="btn" onClick={send}>
                Send
              </button>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}

function App() {
  return <A1Dev />;
}

const rootEl = document.getElementById("root");
createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
