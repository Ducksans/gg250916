import { Threads } from "./Threads";
import { Composer } from "./Composer";
import { useEffect, useRef } from "react";
import { attachStickyBottom } from "./Sentinel";
import { attachViewportGuards } from "./Viewport";
export const Layout = () => {
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const detach1 = attachStickyBottom(msgsRef.current, () => inputRef.current);
    const detach2 = attachViewportGuards(
      () => inputRef.current,
      () => msgsRef.current,
    );
    return () => {
      detach1?.();
      detach2?.();
    };
  }, []);
  return (
    <div id="app">
      <header id="strip">
        <div
          className="hdr"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div className="title">LC App — A1</div>
          <div
            className="meta"
            style={{ color: "var(--lc-muted)", fontSize: 12 }}
          >
            ST‑1206: grid rows auto/minmax/auto • two scrollers • composer
            bottom
          </div>
        </div>
      </header>
      <main>
        <section id="a1" aria-label="A1 Chat (Simple)">
          <aside id="gg-threads" aria-label="Threads">
            <Threads />
          </aside>
          <div id="a1-wrap">
            <div id="a1-toolbar">
              <label style={{ minWidth: 60 }}>Bridge</label>
              <input defaultValue="http://localhost:3037" />
              <span
                style={{
                  padding: "2px 6px",
                  border: "1px solid var(--lc-border)",
                  borderRadius: 6,
                }}
              >
                engine: —
              </span>
              <span
                style={{
                  padding: "2px 6px",
                  border: "1px solid var(--lc-border)",
                  borderRadius: 6,
                }}
              >
                backend: OK
              </span>
            </div>
            <div id="chat-msgs" role="feed" aria-live="polite" ref={msgsRef} />
            <Composer
              inputRef={inputRef}
              onSend={(t) => {
                const host = msgsRef.current!;
                const row = document.createElement("div");
                row.className = "msg user";
                const bubble = document.createElement("div");
                bubble.className = "bubble";
                bubble.textContent = t;
                row.appendChild(bubble);
                host.appendChild(row);
                setTimeout(() => {
                  const r2 = document.createElement("div");
                  r2.className = "msg assistant";
                  const b2 = document.createElement("div");
                  b2.className = "bubble";
                  b2.textContent = "메시지 수신: " + t;
                  r2.appendChild(b2);
                  host.appendChild(r2);
                }, 200);
              }}
            />
          </div>
        </section>
      </main>
    </div>
  );
};
