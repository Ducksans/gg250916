import React, { useEffect, useState } from "react";
import { DEFAULT_ACTIONS, getKeymap, setKeymap } from "@/utils/keymap";

function KeyRow({ action, value, onRebind }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", padding: "8px 10px", borderBottom: "1px solid var(--gg-border)" }}>
      <div>
        <div style={{ fontWeight: 600 }}>{action.label}</div>
        <div style={{ fontSize: 12, opacity: 0.8 }}>{action.id}</div>
      </div>
      <div>
        <code style={{ padding: "6px 8px", border: "1px solid var(--gg-border)", borderRadius: 6, marginRight: 8 }}>{value || "(none)"}</code>
        <button className="btn" onClick={() => onRebind(action.id)}>Rebind</button>
      </div>
    </div>
  );
}

export default function KeymapPage() {
  const [map, setMap] = useState(getKeymap());
  const [capturing, setCapturing] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const onKey = (e) => {
      if (!capturing) return;
      e.preventDefault();
      const parts = [];
      if (e.ctrlKey || e.metaKey) parts.push('mod');
      if (e.shiftKey) parts.push('shift');
      parts.push((e.key || '').toLowerCase());
      const seq = parts.join('+');
      const next = { ...map, [capturing]: seq };
      setMap(next);
      setKeymap(next);
      setCapturing(null);
      setMsg(`Bound ${capturing} to ${seq}`);
    };
    window.addEventListener('keydown', onKey, { capture: true });
    return () => window.removeEventListener('keydown', onKey, { capture: true });
  }, [capturing, map]);

  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ marginTop: 0 }}>Keymap Settings</h2>
      {msg && <div style={{ marginBottom: 8, fontSize: 12, opacity: 0.85 }}>{msg}</div>}
      <div style={{ border: "1px solid var(--gg-border)", borderRadius: 8 }}>
        {DEFAULT_ACTIONS.map((a) => (
          <KeyRow key={a.id} action={a} value={map[a.id]} onRebind={setCapturing} />
        ))}
      </div>
      <div style={{ marginTop: 12, display: "inline-flex", gap: 8 }}>
        <button className="btn" onClick={() => { setMap(getKeymap()); setMsg("Reloaded from storage"); }}>Reload</button>
        <button className="btn" onClick={() => { localStorage.removeItem('GG_KEYMAP'); setMap(getKeymap()); setMsg("Reset to defaults"); }}>Reset to defaults</button>
      </div>
    </div>
  );
}

