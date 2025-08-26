"use client";

import React, { useRef, useState } from "react";
import Editor, { OnMount, DiffEditor } from "@monaco-editor/react";
import { editor } from "monaco-editor";

interface MonacoEditorProps {
  value: string;
  onChange?: (value: string | undefined) => void;
  language?: string;
  height?: string;
  readOnly?: boolean;
  theme?: "vs-dark" | "light";
  options?: editor.IStandaloneEditorConstructionOptions;
  onMount?: OnMount;
  className?: string;
}

interface MonacoDiffEditorProps {
  original: string;
  modified: string;
  language?: string;
  height?: string;
  theme?: "vs-dark" | "light";
  options?: editor.IStandaloneDiffEditorConstructionOptions;
  className?: string;
}

export const MonacoEditor: React.FC<MonacoEditorProps> = ({
  value,
  onChange,
  language = "javascript",
  height = "400px",
  readOnly = false,
  theme = "vs-dark",
  options = {},
  onMount,
  className = "",
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    setIsLoading(false);

    // 커스텀 테마 설정
    monaco.editor.defineTheme("gumgang-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A9955" },
        { token: "keyword", foreground: "569CD6" },
        { token: "string", foreground: "CE9178" },
        { token: "number", foreground: "B5CEA8" },
      ],
      colors: {
        "editor.background": "#0F172A",
        "editor.foreground": "#E2E8F0",
        "editor.lineHighlightBackground": "#1E293B",
        "editor.selectionBackground": "#334155",
        "editorCursor.foreground": "#3B82F6",
        "editorWhitespace.foreground": "#334155",
      },
    });

    monaco.editor.setTheme("gumgang-dark");

    // 자동 완성 및 IntelliSense 설정
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"],
    });

    // 진화 관련 커스텀 스니펫 추가
    monaco.languages.registerCompletionItemProvider("javascript", {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions = [
          {
            label: "evolve.mutation",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              'evolve.mutation({\n\ttype: "${1:type}",\n\tpayload: {\n\t\t$0\n\t}\n})',
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "진화 변이 트리거",
            range: range,
          },
          {
            label: "memory.store",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText:
              "memory.store({\n\tlevel: ${1:1},\n\tdata: {\n\t\t$0\n\t}\n})",
            insertTextRules:
              monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            documentation: "메모리 저장",
            range: range,
          },
        ];
        return { suggestions };
      },
    });

    if (onMount) {
      onMount(editor, monaco);
    }
  };

  const defaultOptions: editor.IStandaloneEditorConstructionOptions = {
    selectOnLineNumbers: true,
    minimap: {
      enabled: true,
    },
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineNumbers: "on",
    renderLineHighlight: "all",
    automaticLayout: true,
    padding: {
      top: 10,
      bottom: 10,
    },
    suggestOnTriggerCharacters: true,
    quickSuggestions: true,
    folding: true,
    foldingStrategy: "indentation",
    showFoldingControls: "mouseover",
    bracketPairColorization: {
      enabled: true,
    },
    ...options,
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-slate-700 ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-0"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
          </div>
        </div>
      )}
      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          ...defaultOptions,
          readOnly,
        }}
      />
    </div>
  );
};

export const MonacoDiffEditor: React.FC<MonacoDiffEditorProps> = ({
  original,
  modified,
  language = "javascript",
  height = "400px",
  theme = "vs-dark",
  options = {},
  className = "",
}) => {
  const [isLoading, setIsLoading] = useState(true);

  const handleEditorDidMount = () => {
    setIsLoading(false);
  };

  const defaultOptions: editor.IStandaloneDiffEditorConstructionOptions = {
    renderSideBySide: true,
    enableSplitViewResizing: true,
    renderIndicators: true,
    originalEditable: false,
    automaticLayout: true,
    fontSize: 14,
    ...options,
  };

  return (
    <div
      className={`relative rounded-lg overflow-hidden border border-slate-700 ${className}`}
    >
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-10">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-0"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-75"></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-150"></div>
          </div>
        </div>
      )}
      <DiffEditor
        height={height}
        language={language}
        original={original}
        modified={modified}
        theme={theme}
        onMount={handleEditorDidMount}
        options={defaultOptions}
      />
    </div>
  );
};

// 사용 가능한 언어 목록
export const SUPPORTED_LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "rust",
  "go",
  "java",
  "cpp",
  "csharp",
  "html",
  "css",
  "json",
  "markdown",
  "yaml",
  "xml",
  "sql",
  "shell",
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// 파일 확장자에서 언어 추론
export const getLanguageFromExtension = (
  filename: string,
): SupportedLanguage => {
  const ext = filename.split(".").pop()?.toLowerCase();
  const extensionMap: Record<string, SupportedLanguage> = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    cpp: "cpp",
    cc: "cpp",
    cs: "csharp",
    html: "html",
    css: "css",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
  };
  return extensionMap[ext || ""] || "javascript";
};

export default MonacoEditor;
