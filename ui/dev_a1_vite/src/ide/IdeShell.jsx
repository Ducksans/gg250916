import React, { useCallback, useEffect, useRef, useState } from "react";
import useViewportUnits from "@/hooks/useViewportUnits";
import IdeExplorer from "@/ide/IdeExplorer";
import IdeEditor from "@/ide/IdeEditor";
import IdeChat from "@/ide/IdeChat";
import "@/styles/a1.css"; // reuse strip styles
import "@/ide/ide.css";
import AppHeader from "@/components/common/AppHeader";
import IconButton from "@/components/common/IconButton";
import { matchKey } from "@/utils/keymap";

export default function IdeShell() {
  useViewportUnits({});
  const gridRef = useRef(null);
  const [left, setLeft] = useState(() => Number(localStorage.getItem("GG_IDE_LEFT_W") || 280));
  const [right, setRight] = useState(() => Number(localStorage.getItem("GG_IDE_RIGHT_W") || 480));
  const [chatCollapsed, setChatCollapsed] = useState(() => localStorage.getItem("GG_IDE_CHAT_COLLAPSED") === "1");
  const [leftCollapsed, setLeftCollapsed] = useState(() => localStorage.getItem("GG_IDE_LEFT_COLLAPSED") === "1");

  // Persist widths
  useEffect(() => { try { localStorage.setItem("GG_IDE_LEFT_W", String(left)); } catch {} }, [left]);
  useEffect(() => { try { localStorage.setItem("GG_IDE_RIGHT_W", String(right)); } catch {} }, [right]);
  useEffect(() => { try { localStorage.setItem("GG_IDE_CHAT_COLLAPSED", chatCollapsed ? "1" : "0"); } catch {} }, [chatCollapsed]);
  useEffect(() => { try { localStorage.setItem("GG_IDE_LEFT_COLLAPSED", leftCollapsed ? "1" : "0"); } catch {} }, [leftCollapsed]);

  // Keybindings
  useEffect(() => {
    const onKey = (e) => {
      if (matchKey(e, 'panel.chat.toggle')) { e.preventDefault(); setChatCollapsed((v) => !v); }
      if (matchKey(e, 'panel.explorer.toggle')) { e.preventDefault(); setLeftCollapsed((v) => !v); }
      if (matchKey(e, 'editor.quickOpen')) { e.preventDefault(); const v = prompt("Open path (repo-relative):", ""); if (v) window.dispatchEvent(new CustomEvent("gg:ide-quick-open", { detail: { path: v } })); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Resizers
  const startDrag = (which, ev) => {
    ev.preventDefault();
    const grid = gridRef.current; if (!grid) return;
    const rect = grid.getBoundingClientRect();
    const prevSel = document.body.style.userSelect; document.body.style.userSelect = "none";
    const prevCur = document.body.style.cursor; document.body.style.cursor = "col-resize";
    const onMove = (e) => {
      const x = e.clientX; const width = rect.width; const handle = 16; // two handles
      const LEFT_MIN = 240, CENTER_MIN = 560, RIGHT_MIN = 320;
      const leftMax = Math.max(LEFT_MIN, width - RIGHT_MIN - CENTER_MIN - handle);
      const rightMax = Math.max(RIGHT_MIN, width - LEFT_MIN - CENTER_MIN - handle);
      if (which === "left") {
        const raw = x - rect.left; const v = Math.min(Math.max(raw, LEFT_MIN), leftMax); setLeft(v);
      } else {
        const raw = rect.right - x; const v = Math.min(Math.max(raw, RIGHT_MIN), rightMax); setRight(v);
      }
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.userSelect = prevSel; document.body.style.cursor = prevCur;
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
  };

  const onHandleDbl = (which) => {
    if (which === "right") {
      // cycle: collapsed → 280 → 480 → collapsed
      if (chatCollapsed) { setChatCollapsed(false); setRight(280); }
      else if (right < 320) { setRight(480); }
      else { setChatCollapsed(true); }
    }
  };

  useEffect(() => {
    const root = document.querySelector(".gg-ide");
    if (!root) return;
    root.style.setProperty("--ide-left", leftCollapsed ? `0px` : `${Math.round(left)}px`);
    root.style.setProperty("--ide-right", chatCollapsed ? `0px` : `${Math.round(right)}px`);
  }, [left, right, chatCollapsed, leftCollapsed]);

  const applyPreset = (name) => {
    const grid = gridRef.current; if (!grid) return;
    const rect = grid.getBoundingClientRect(); const width = rect.width; const handle = 16;
    const LEFT_MIN = 240, CENTER_MIN = 560, RIGHT_MIN = 320;
    if (name === "chat") {
      setLeftCollapsed(true); setChatCollapsed(false);
      const maxRight = Math.max(RIGHT_MIN, width - LEFT_MIN - CENTER_MIN - handle);
      setRight(Math.min(Math.max(480, RIGHT_MIN), maxRight));
    } else if (name === "editor") {
      setLeftCollapsed(false); setChatCollapsed(true); setLeft(280);
    } else {
      // balanced
      setLeftCollapsed(false); setChatCollapsed(false); setLeft(280); setRight(480);
    }
  };

  const H = `calc(var(--vh) - var(--ide-head-h))`;

  // Bridge quick-open event to editor
  const [openEvent, setOpenEvent] = useState(null);
  useEffect(() => {
    const h = (e) => setOpenEvent({ path: e.detail?.path, ts: Date.now() });
    window.addEventListener("gg:ide-quick-open", h);
    return () => window.removeEventListener("gg:ide-quick-open", h);
  }, []);

  return (
    <div className="gg-ide">
      <AppHeader current="ide" rightControls={
        <div className="iconbar" style={{ display: 'inline-flex', gap: 6 }}>
          <IconButton title={`Explorer ${leftCollapsed ? 'Show' : 'Hide'} (Ctrl/Cmd+B)`} icon="explorer" active={!leftCollapsed} onClick={() => setLeftCollapsed(v=>!v)} />
          <IconButton title={`Chat ${chatCollapsed ? 'Show' : 'Hide'} (Ctrl/Cmd+J)`} icon="chat" active={!chatCollapsed} onClick={() => setChatCollapsed(v=>!v)} />
          <span style={{ width: 8 }} />
          <IconButton title="Preset: Chat" icon="presetChat" onClick={() => applyPreset('chat')} />
          <IconButton title="Preset: Editor" icon="presetEditor" onClick={() => applyPreset('editor')} />
          <IconButton title="Preset: Balanced" icon="balanced" onClick={() => applyPreset('balanced')} />
        </div>
      } />
      <div className="gg-ide-grid" ref={gridRef}>
        <IdeExplorer onOpen={(p) => setOpenEvent({ path: p, ts: Date.now() })} height={H} />
        <div className="handle" onMouseDown={(e) => startDrag("left", e)} title="Drag to resize" />
        <IdeEditor height={H} key={openEvent?.ts || 0} openSig={openEvent} />
        <div className="handle" onMouseDown={(e) => startDrag("right", e)} onDoubleClick={() => onHandleDbl("right")} title="Drag to resize" />
        <IdeChat height={H} onSend={(t) => window.dispatchEvent(new CustomEvent("gg:ide-chat-send", { detail: { text: t } }))} />
      </div>
    </div>
  );
}
