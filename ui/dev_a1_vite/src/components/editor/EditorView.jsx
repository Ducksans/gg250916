import React, { useCallback, useMemo, useRef, useState } from "react";
import Editor from "@monaco-editor/react";

function genId() {
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function EditorView({ externalOpen, height = "calc(var(--gg-vh, 100vh) - 140px)" }) {
  const [tabs, setTabs] = useState([
    { id: genId(), name: "untitled-1.txt", path: null, content: "", language: "plaintext", dirty: false },
  ]);
  const [activeId, setActiveId] = useState(tabs[0].id);
  const active = useMemo(() => tabs.find((t) => t.id === activeId) || tabs[0], [tabs, activeId]);
  const inputRef = useRef(null);

  const setActiveContent = useCallback((value) => {
    setTabs((arr) =>
      arr.map((t) => (t.id === activeId ? { ...t, content: value, dirty: true } : t)),
    );
  }, [activeId]);

  const addTab = useCallback(() => {
    const id = genId();
    const t = { id, name: `untitled-${tabs.length + 1}.txt`, content: "", language: "plaintext", dirty: false };
    setTabs((arr) => [...arr, t]);
    setActiveId(id);
  }, [tabs.length]);

  const closeTab = useCallback((id) => {
    setTabs((arr) => {
      const rest = arr.filter((t) => t.id !== id);
      if (activeId === id && rest[0]) setActiveId(rest[0].id);
      return rest;
    });
  }, [activeId]);

  const fetchAndOpen = useCallback(async (v) => {
    try {
      const u = new URL(`/api/files/read`, window.location.origin);
      u.searchParams.set("path", `/${v.replace(/^\/+/, "")}`);
      const r = await fetch(u.toString());
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json().catch(() => ({}));
      const text = typeof j?.data?.text === "string" ? j.data.text : "";
      const canonPath = String(v).replace(/^\/+/, "");
      const existed = tabs.find((t) => t.path === canonPath);
      if (existed) {
        setActiveId(existed.id);
        // Optional: refresh content when re-opened
        setTabs((arr) => arr.map((t) => (t.id === existed.id ? { ...t, content: text, dirty: false } : t)));
        return;
      }
      const id = genId();
      const name = canonPath.split("/").pop() || canonPath;
      const lang = guessLang(name);
      setTabs((arr) => [...arr, { id, name, path: canonPath, content: text, language: lang, dirty: false }]);
      setActiveId(id);
    } catch (e) {
      alert(`Open failed: ${e?.message || e}`);
    }
  }, [tabs]);

  const openPath = useCallback(async () => {
    const el = inputRef.current;
    const v = (el && el.value) ? String(el.value).trim() : "";
    if (!v) return;
    await fetchAndOpen(v);
    if (el) el.value = "";
  }, [fetchAndOpen]);

  React.useEffect(() => {
    if (externalOpen && externalOpen.path) {
      fetchAndOpen(String(externalOpen.path));
    }
  }, [externalOpen, fetchAndOpen]);

  return (
    <section style={{ border: "1px solid var(--gg-border)", borderRadius: 10, background: "#0e1527" }}>
      <header style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center", padding: "8px 10px", borderBottom: "1px solid var(--gg-border)" }}>
        <div style={{ display: "flex", gap: 6, overflow: "auto" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveId(t.id)}
              className="btn"
              style={{
                padding: "6px 10px",
                background: t.id === activeId ? "#142038" : "#0b1222",
                border: "1px solid var(--gg-border)",
              }}
              title={t.path || t.name}
              onMouseDown={(e) => {
                // Middle-click closes the tab like VS Code
                if (e.button === 1) {
                  e.preventDefault();
                  setTabs((arr) => arr.filter((x) => x.id !== t.id));
                  if (t.id === activeId) {
                    const rest = tabs.filter((x) => x.id !== t.id);
                    if (rest[0]) setActiveId(rest[0].id);
                  }
                }
              }}
            >
              {t.name}{t.dirty ? " *" : ""}
              <span style={{ marginLeft: 6 }} onClick={(e) => { e.stopPropagation(); closeTab(t.id); }}>×</span>
            </button>
          ))}
          <button className="btn" onClick={addTab} style={{ padding: "6px 10px" }}>+ New</button>
        </div>
        <div style={{ display: "inline-flex", gap: 6 }}>
          <input ref={inputRef} placeholder="path/to/file.ext (repo-relative)" style={{ width: 260, background: "#0b1222", color: "#eaeefb", border: "1px solid var(--gg-border)", borderRadius: 6, padding: "6px 8px" }} />
          <button className="btn" onClick={openPath} title="/api/files/view 로 읽기">Open</button>
        </div>
      </header>

      <div style={{ height }}>
        <Editor
          height="100%"
          language={active?.language || "plaintext"}
          theme="vs-dark"
          value={active?.content || ""}
          onChange={(v) => setActiveContent(v ?? "")}
          options={{ fontSize: 14, minimap: { enabled: false }, scrollBeyondLastLine: false }}
        />
      </div>
    </section>
  );
}

function guessLang(name) {
  const ext = String(name || "").split(".").pop()?.toLowerCase();
  const map = {
    js: "javascript", jsx: "javascript", ts: "typescript", tsx: "typescript",
    py: "python", rs: "rust", go: "go", java: "java", cpp: "cpp", c: "c",
    json: "json", md: "markdown", html: "html", css: "css", scss: "scss", yml: "yaml", yaml: "yaml",
  };
  return map[ext] || "plaintext";
}
