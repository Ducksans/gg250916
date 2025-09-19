import React, { useCallback, useRef, useState } from "react";
import EditorView from "@/components/editor/EditorView";

export default function IdeEditor({ height, openSig }) {
  const [sig, setSig] = useState(openSig || null);
  const inputRef = useRef(null);

  const quickOpen = useCallback(async () => {
    const v = prompt("Open path (repo-relative):", inputRef.current?.value || "");
    if (v) setOpenSig({ path: v, ts: Date.now() });
  }, []);

  return (
    <div className="col" style={{ height }}>
      <div className="section-title" style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center" }}>
        <div>Editor</div>
        <div>
          <input ref={inputRef} placeholder="path/to/file" style={{ width: 220, background: "#0b1222", color: "#eaeefb", border: "1px solid var(--gg-border)", borderRadius: 6, padding: "4px 8px" }} />
          <button className="btn" style={{ marginLeft: 6 }} onClick={() => setOpenSig({ path: inputRef.current?.value || "", ts: Date.now() })}>Open</button>
        </div>
      </div>
      <EditorView externalOpen={sig} height={`calc(${height} - 36px)`} />
    </div>
  );
}
