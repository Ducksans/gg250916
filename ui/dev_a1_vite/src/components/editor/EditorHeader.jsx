import React from "react";

export default function EditorHeader({ onBack, onPanels }) {
  return (
    <header
      className="gg-strip"
      role="banner"
      style={{ display: "grid", gridTemplateColumns: "1fr auto", alignItems: "center" }}
    >
      <h1>Gumgang — Editor</h1>
      <div className="actions" aria-label="Editor Actions">
        <button className="btn" onClick={onPanels} title="Panels">Panels</button>
        <button className="btn" onClick={onBack} title="Back to Chat" style={{ marginLeft: 6 }}>
          Back
        </button>
      </div>
    </header>
  );
}

