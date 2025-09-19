import React, { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import useHealth from "@/hooks/useHealth";
import { matchKey } from "@/utils/keymap";

function Dot({ status = "checking" }) {
  const cls = status === "ok" ? "ok" : status === "bad" ? "bad" : "warn";
  const label = status === "ok" ? "OK" : status === "bad" ? "ERR" : "…";
  return (
    <span className="status-dot" title={label} style={{ marginLeft: 6 }}>
      <span className={`dot ${cls}`} />
      <span>{label}</span>
    </span>
  );
}

export default function AppHeader({ current = "chat", rightControls = null }) {
  const nav = useNavigate();
  const loc = useLocation();
  const { backend, bridge } = useHealth();

  const go = (p) => () => nav(p);
  const active = (key) => ({
    opacity: current === key || loc.pathname.endsWith(key) ? 1 : 0.85,
    fontWeight: current === key ? 700 : 600,
  });

  // Global navigation shortcuts via keymap
  useEffect(() => {
    const onKey = (e) => {
      if (matchKey(e, 'nav.chat')) { e.preventDefault(); nav('/'); }
      if (matchKey(e, 'nav.ide')) { e.preventDefault(); nav('/ide'); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [nav]);

  return (
    <header className="gg-strip" role="banner" style={{ position: "sticky", top: 0, zIndex: 20 }}>
      <h1 style={{ margin: 0, fontSize: 14 }}>Gumgang UI</h1>
      <div className="actions" aria-label="Global Navigation" style={{ display: "inline-flex", gap: 8 }}>
        <button className="btn" style={active("ide")} onClick={go("/ide")}>Home</button>
        <button className="btn" style={active("chat")} onClick={go("/")}>Chat</button>
        <button className="btn" style={active("ide")} onClick={go("/ide")}>IDE</button>
        <button className="btn" onClick={() => window.dispatchEvent(new CustomEvent("gg:open-panels", { detail: { tab: "planner" } }))}>Panels</button>
        <button className="btn" onClick={go("/settings/keys")}>Keys</button>
        <span style={{ width: 10 }} />
        <span>Backend</span>
        <Dot status={backend} />
        <span style={{ width: 6 }} />
        <span>Bridge</span>
        <Dot status={bridge} />
        {rightControls && <span style={{ marginLeft: 8 }}>{rightControls}</span>}
      </div>
    </header>
  );
}
