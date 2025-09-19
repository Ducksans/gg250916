import React, { useEffect, useMemo, useRef, useState } from "react";
import FileTree from "@/components/editor/FileTree";
import EditorView from "@/components/editor/EditorView";
import ChatTimeline from "@/components/chat/ChatTimeline";

const LEFT_MIN = 200;
const RIGHT_MIN = 240;
const CENTER_MIN = 480;
const HANDLE_W = 12; // total (two handles of 6px)

export default function EditorWorkspace({ thread, composer = null }) {
  const [openSignal, setOpenSignal] = useState(null);
  const [leftW, setLeftW] = useState(() => {
    try { return Number(localStorage.getItem("GG_EDITOR_LEFT_W") || 280); } catch { return 280; }
  });
  const [rightW, setRightW] = useState(() => {
    try { return Number(localStorage.getItem("GG_EDITOR_RIGHT_W") || 360); } catch { return 360; }
  });
  const wrapRef = useRef(null);

  useEffect(() => {
    try { localStorage.setItem("GG_EDITOR_LEFT_W", String(leftW)); } catch {}
  }, [leftW]);
  useEffect(() => {
    try { localStorage.setItem("GG_EDITOR_RIGHT_W", String(rightW)); } catch {}
  }, [rightW]);

  const onOpenFromTree = (path) => {
    setOpenSignal({ path, ts: Date.now() });
  };

  const onDrag = (which, e) => {
    e.preventDefault();
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    // Improve UX while dragging
    const prevSel = document.body.style.userSelect;
    const prevCur = document.body.style.cursor;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
    const onMove = (ev) => {
      const x = ev.clientX;
      const width = rect.width;
      // compute legal maxima so center never goes below CENTER_MIN
      const leftMax = Math.max(
        LEFT_MIN,
        width - RIGHT_MIN - CENTER_MIN - HANDLE_W,
      );
      const rightMax = Math.max(
        RIGHT_MIN,
        width - LEFT_MIN - CENTER_MIN - HANDLE_W,
      );
      if (which === "left") {
        const raw = x - rect.left;
        const v = Math.min(Math.max(raw, LEFT_MIN), leftMax);
        setLeftW(v);
      } else {
        const raw = rect.right - x;
        const v = Math.min(Math.max(raw, RIGHT_MIN), rightMax);
        setRightW(v);
      }
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = prevSel;
      document.body.style.cursor = prevCur;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const H = "calc(var(--gg-vh, 100vh) - 140px)"; // editor/chat/filetree column content height

  return (
    <div
      role="region"
      aria-label="Coding Agent Workspace"
      ref={wrapRef}
      style={{
        display: "grid",
        gridTemplateColumns: `${Math.round(leftW)}px 6px 1fr 6px ${Math.round(rightW)}px`,
        gap: 0,
        width: "100%",
        alignItems: "stretch",
      }}
    >
      <div style={{ border: "1px solid var(--gg-border)", borderRadius: 10, background: "#0e1527", height: H, overflow: "auto" }}>
        <FileTree root="." depth={2} onOpen={onOpenFromTree} />
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={(e) => onDrag("left", e)}
        style={{ cursor: "col-resize", background: "#182034", height: H }}
        title="Drag to resize"
      />

      <div>
        <EditorView externalOpen={openSignal} height={H} />
      </div>

      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={(e) => onDrag("right", e)}
        style={{ cursor: "col-resize", background: "#182034", height: H }}
        title="Drag to resize"
      />

      <div style={{ border: "1px solid var(--gg-border)", borderRadius: 10, background: "#0e1527", overflow: "hidden", height: H, display: "grid", gridTemplateRows: composer ? `1fr auto` : `1fr` }}>
        <div style={{ padding: 8, borderBottom: "1px solid var(--gg-border)", fontSize: 12, opacity: 0.9 }}>Chat</div>
        <div style={{ height: composer ? `calc(${H} - 36px - 120px)` : `calc(${H} - 36px)`, overflow: "auto" }}>
          <ChatTimeline thread={thread} />
        </div>
        {composer && (
          <div style={{ borderTop: "1px solid var(--gg-border)", padding: 8, background: "#0b1222" }}>
            {composer}
          </div>
        )}
      </div>
    </div>
  );
}
