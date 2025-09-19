import React from "react";
import FileTree from "@/components/editor/FileTree";

export default function IdeExplorer({ onOpen, height }) {
  return (
    <div className="col scroll" style={{ height }}>
      <div className="section-title">Workspace</div>
      <div style={{ height: `calc(${height} - 36px)` }}>
        <FileTree root="." depth={2} onOpen={onOpen} />
      </div>
    </div>
  );
}

