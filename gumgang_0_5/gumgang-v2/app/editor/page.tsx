"use client";

import React, { useState } from "react";
import { MultiTabEditor } from "../../components/editor/MultiTabEditor";
import { AICodingAssistant } from "../../components/ai/AICodingAssistant";
import {
  FileCodeIcon,
  FolderIcon,
  TerminalIcon,
  GitBranchIcon,
  SettingsIcon,
  ChevronRightIcon,
  PlayIcon,
  BugIcon,
  PackageIcon,
  DatabaseIcon,
  SparklesIcon,
} from "lucide-react";

export default function EditorPage() {
  const [showEditor] = useState(true);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [selectedCode] = useState("");
  const [currentFile, setCurrentFile] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("");
  const [lastSavedFile] = useState<{
    path: string;
    time: string;
  } | null>(null);

  // Handlers commented out - to be re-enabled when needed
  // const handleSave = (path: string, content: string) => {
  //   setLastSavedFile({
  //     path,
  //     time: new Date().toLocaleTimeString(),
  //   });
  //   console.log("File saved:", path, "Size:", content.length);
  // };

  // const handleClose = () => {
  //   setShowEditor(false);
  //   setTimeout(() => setShowEditor(true), 100);
  // };

  const quickPaths = [
    {
      path: "/home/duksan/바탕화면/gumgang_0_5/README.md",
      icon: <FileCodeIcon className="w-4 h-4" />,
      label: "README.md",
      color: "text-blue-400",
    },
    {
      path: "/home/duksan/바탕화면/gumgang_0_5/backend/app/main.py",
      icon: <TerminalIcon className="w-4 h-4" />,
      label: "main.py",
      color: "text-yellow-400",
    },
    {
      path: "/home/duksan/바탕화면/gumgang_0_5/gumgang-v2/package.json",
      icon: <PackageIcon className="w-4 h-4" />,
      label: "package.json",
      color: "text-green-400",
    },
    {
      path: "/home/duksan/바탕화면/gumgang_0_5/context/AI_SESSION_PROMPT.md",
      icon: <DatabaseIcon className="w-4 h-4" />,
      label: "AI_SESSION_PROMPT.md",
      color: "text-purple-400",
    },
  ];

  const [selectedPath, setSelectedPath] = useState(quickPaths[0].path);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-blue-600 rounded-lg">
                  <FileCodeIcon className="w-6 h-6 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-white">금강 Editor</h1>
                <span className="px-2 py-1 text-xs bg-green-600 rounded-full text-white">
                  Tauri Integrated
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                className={`p-2 rounded-lg transition-colors ${
                  showAIAssistant
                    ? "bg-blue-600 text-white"
                    : "hover:bg-slate-800 text-slate-400"
                }`}
                title="AI Coding Assistant"
              >
                <SparklesIcon className="w-5 h-5" />
              </button>
              <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <GitBranchIcon className="w-5 h-5 text-slate-400" />
              </button>
              <button className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
                <SettingsIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="col-span-3">
            {/* Quick Access */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">
                Quick Access
              </h3>
              <div className="space-y-1">
                {quickPaths.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => setSelectedPath(item.path)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                      selectedPath === item.path
                        ? "bg-slate-800 text-white"
                        : "hover:bg-slate-800/50 text-slate-400"
                    }`}
                  >
                    <span className={item.color}>{item.icon}</span>
                    <span className="text-sm truncate">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Project Structure */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">
                Project Structure
              </h3>
              <div className="space-y-1 text-sm">
                <div className="flex items-center space-x-2 text-slate-400 hover:text-white cursor-pointer py-1">
                  <FolderIcon className="w-4 h-4 text-yellow-500" />
                  <span>gumgang_0_5</span>
                </div>
                <div className="ml-4 space-y-1">
                  <div className="flex items-center space-x-2 text-slate-400 hover:text-white cursor-pointer py-1">
                    <ChevronRightIcon className="w-3 h-3" />
                    <FolderIcon className="w-4 h-4 text-blue-500" />
                    <span>backend</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-400 hover:text-white cursor-pointer py-1">
                    <ChevronRightIcon className="w-3 h-3" />
                    <FolderIcon className="w-4 h-4 text-green-500" />
                    <span>gumgang-v2</span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-400 hover:text-white cursor-pointer py-1">
                    <ChevronRightIcon className="w-3 h-3" />
                    <FolderIcon className="w-4 h-4 text-purple-500" />
                    <span>context</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">
                Status
              </h3>
              {lastSavedFile ? (
                <div className="text-xs space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-400">Last saved</span>
                  </div>
                  <div className="text-slate-500 break-all">
                    {lastSavedFile.path.split("/").pop()}
                  </div>
                  <div className="text-slate-600">{lastSavedFile.time}</div>
                </div>
              ) : (
                <div className="text-xs text-slate-500">No recent activity</div>
              )}
            </div>
          </div>

          {/* Main Editor Area */}
          <div className="col-span-9">
            {/* Editor Controls */}
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <h2 className="text-lg font-semibold text-white">
                    Code Editor
                  </h2>
                  <div className="flex items-center space-x-2">
                    <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm text-white transition-colors flex items-center space-x-1">
                      <PlayIcon className="w-3 h-3" />
                      <span>Run</span>
                    </button>
                    <button className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-sm text-white transition-colors flex items-center space-x-1">
                      <BugIcon className="w-3 h-3" />
                      <span>Debug</span>
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const ts = new Date().toISOString();
                          const stamp = ts
                            .replace(/[-:]/g, "")
                            .replace("T", "_")
                            .slice(0, 15);
                          const name = `save_probe_${stamp}.json`;
                          const payload = {
                            root: "status",
                            path: `logs/${name}`,
                            content: JSON.stringify({
                              ts,
                              file: currentFile || null,
                              language: currentLanguage || null,
                              source: "app/editor/page.tsx",
                            }),
                          };
                          const resp = await fetch(
                            "http://127.0.0.1:3037/api/save",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify(payload),
                            },
                          );
                          const data = await resp.json().catch(() => ({}));
                          if (!resp.ok || !data.ok) {
                            throw new Error(
                              (data && data.error && data.error.message) ||
                                "Save failed",
                            );
                          }
                          console.log("Saved to:", data.data?.path || "");
                          alert("Saved to status/logs successfully.");
                        } catch (e) {
                          console.error(e);
                          alert("Save failed. See console for details.");
                        }
                      }}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 rounded text-sm text-white transition-colors flex items-center space-x-1"
                      title="Save probe to status/logs via bridge"
                    >
                      <span>Save→status/logs</span>
                    </button>
                    <button
                      onClick={() => setShowAIAssistant(true)}
                      className="px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm text-white transition-colors flex items-center space-x-1"
                    >
                      <SparklesIcon className="w-3 h-3" />
                      <span>AI Assistant</span>
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  Powered by Monaco Editor + Tauri
                </div>
              </div>
            </div>

            {/* Editor Component */}
            {showEditor && (
              <MultiTabEditor
                height="600px"
                maxTabs={10}
                onTabChange={(tab) => {
                  console.log("Active tab changed:", tab.name);
                  setCurrentFile(tab.path);
                  setCurrentLanguage(tab.language);
                }}
                onAllTabsClosed={() => {
                  console.log("All tabs closed");
                  setCurrentFile("");
                  setCurrentLanguage("");
                }}
                className="shadow-2xl"
              />
            )}

            {/* Info Panel */}
            <div className="mt-4 grid grid-cols-3 gap-4">
              <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-blue-600/20 rounded-lg flex items-center justify-center">
                    <FileCodeIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-400">
                    Files
                  </span>
                </div>
                <div className="text-2xl font-bold text-white">12</div>
                <div className="text-xs text-slate-500">Active tabs</div>
              </div>

              <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-green-600/20 rounded-lg flex items-center justify-center">
                    <GitBranchIcon className="w-4 h-4 text-green-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-400">
                    Changes
                  </span>
                </div>
                <div className="text-2xl font-bold text-white">3</div>
                <div className="text-xs text-slate-500">Unsaved files</div>
              </div>

              <div className="bg-slate-900 rounded-lg border border-slate-800 p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                    <DatabaseIcon className="w-4 h-4 text-purple-400" />
                  </div>
                  <span className="text-sm font-semibold text-slate-400">
                    Memory
                  </span>
                </div>
                <div className="text-2xl font-bold text-white">42MB</div>
                <div className="text-xs text-slate-500">Editor usage</div>
              </div>
            </div>

            {/* Keyboard Shortcuts */}
            <div className="mt-4 bg-slate-900/50 rounded-lg border border-slate-800 p-4">
              <h3 className="text-sm font-semibold text-slate-400 mb-3">
                Keyboard Shortcuts
              </h3>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Open File</span>
                  <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">
                    Ctrl+O
                  </kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Save</span>
                  <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">
                    Ctrl+S
                  </kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Save As</span>
                  <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">
                    Ctrl+Shift+S
                  </kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Close Tab</span>
                  <kbd className="px-2 py-1 bg-slate-800 rounded text-slate-300">
                    Ctrl+W
                  </kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Coding Assistant */}
      {showAIAssistant && (
        <AICodingAssistant
          selectedCode={selectedCode}
          currentFile={currentFile}
          language={currentLanguage}
          onCodeApply={(code) => {
            console.log("Applying AI suggested code:", code);
            // TODO: Apply code to the active editor tab
          }}
          onClose={() => setShowAIAssistant(false)}
          position="right"
          defaultMinimized={false}
        />
      )}
    </div>
  );
}
