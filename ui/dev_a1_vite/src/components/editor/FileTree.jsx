import React, { useCallback, useEffect, useMemo, useState } from "react";

function Node({ item, level = 0, onOpen }) {
  const [open, setOpen] = useState(level < 1);
  const isDir = item.type === "dir";
  const pad = 8 + level * 12;
  return (
    <div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 6,
          padding: "4px 6px",
          paddingLeft: pad,
          cursor: "pointer",
          background: open && isDir ? "#0b1222" : "transparent",
          borderRadius: 6,
        }}
        onClick={() => (isDir ? setOpen((v) => !v) : onOpen?.(item.path))}
        title={item.path}
      >
        <span style={{ opacity: 0.85 }}>{isDir ? (open ? "▾" : "▸") : "•"}</span>
        <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {item.name}
        </span>
        <span style={{ fontSize: 11, opacity: 0.6 }}>{isDir ? "" : prettySize(item.size)}</span>
      </div>
      {isDir && open && Array.isArray(item.children) && (
        <div>
          {item.children.map((ch) => (
            <Node key={ch.path} item={ch} level={level + 1} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileTree({ root = ".", depth = 2, onOpen }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const u = new URL(`/api/files/list`, window.location.origin);
      if (root) u.searchParams.set("path", root);
      u.searchParams.set("depth", String(depth || 1));
      const r = await fetch(u.toString());
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j?.ok) throw new Error(j?.detail || `HTTP ${r.status}`);
      setItems(Array.isArray(j.items) ? j.items : []);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }, [root, depth]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  return (
    <section style={{ padding: 8 }}>
      <header style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center", marginBottom: 6 }}>
        <div style={{ fontSize: 12, opacity: 0.9 }}>Workspace</div>
        <button className="btn" onClick={fetchList} style={{ padding: "4px 8px" }} title="Refresh tree">↻</button>
      </header>
      <div style={{ height: "100%", overflow: "auto", border: "1px solid var(--gg-border)", borderRadius: 8, background: "#0e1527" }}>
        {loading && <div style={{ padding: 8, fontSize: 12, opacity: 0.8 }}>Loading…</div>}
        {err && <div style={{ padding: 8, fontSize: 12, color: "#f87171" }}>{err}</div>}
        {!loading && !err && (
          <div style={{ padding: 4 }}>
            {items.map((it) => (
              <Node key={it.path} item={it} onOpen={onOpen} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function prettySize(n) {
  if (!n && n !== 0) return "";
  const units = ["B", "KB", "MB", "GB"]; let i = 0; let v = Number(n);
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${units[i]}`;
}
