"use client";

import React from "react";
import { MonacoEditor } from "./editor/MonacoEditor";
import { getLanguageFromExtension } from "@/lib/editorUtils";
import { X, Code, PanelRight } from "lucide-react";
import { clsx } from "clsx";

export type EditorTab = {
  path: string;
  content: string;
};

type Props = {
  tabs: EditorTab[];
  activeTabPath?: string;
  onTabSelect: (path: string) => void;
  onTabClose: (path: string) => void;
  onSplit: () => void;
  onContentChange: (path: string, content: string) => void;
};

export default function AIEnhancedEditor({
  tabs,
  activeTabPath,
  onTabSelect,
  onTabClose,
  onSplit,
  onContentChange,
}: Props) {
  const activeTab = tabs.find((tab) => tab.path === activeTabPath);

  if (tabs.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-[var(--bg-panel)] text-[var(--text-secondary)] select-none">
        <Code size={48} className="mb-4" />
        <h3 className="text-lg">열린 파일이 없습니다</h3>
        <p className="text-sm">탐색기에서 파일을 선택하여 여정을 시작하세요.</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-[var(--bg-panel)]">
      <div className="flex-shrink-0 flex items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-deep-water)]">
        <div className="flex items-center overflow-x-auto">
          {tabs.map((tab) => (
            <div
              key={tab.path}
              onClick={() => onTabSelect(tab.path)}
              title={tab.path}
              className={clsx(
                "flex items-center gap-2 pl-3 pr-2 py-2 text-sm cursor-pointer border-r border-[var(--border-default)] whitespace-nowrap",
                {
                  "bg-[var(--bg-panel)] text-[var(--text-primary)]":
                    tab.path === activeTabPath,
                  "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-water-focus)]":
                    tab.path !== activeTabPath,
                },
              )}
            >
              <span>{tab.path.split("/").pop()}</span>
              <X
                size={16}
                className="p-0.5 rounded-sm hover:text-white hover:bg-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.path);
                }}
              />
            </div>
          ))}
        </div>
        <div className="p-2">
          {activeTab && (
            <button
              onClick={onSplit}
              className="p-1 rounded-sm hover:bg-white/10"
              title="오른쪽으로 패널 분할"
            >
              <PanelRight size={16} className="text-[var(--text-secondary)]" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 relative">
        <MonacoEditor
          key={activeTabPath}
          height="100%"
          language={
            activeTab ? getLanguageFromExtension(activeTab.path) : "plaintext"
          }
          value={activeTab?.content ?? ""}
          theme="vs-dark"
          onChange={(content) => {
            if (activeTabPath && typeof content === "string") {
              onContentChange(activeTabPath, content);
            }
          }}
          options={{
            padding: { top: 20, bottom: 20 },
            fontSize: 14,
            wordWrap: "on",
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
    </div>
  );
}
