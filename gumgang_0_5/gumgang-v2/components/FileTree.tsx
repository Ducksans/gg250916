"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Folder,
  FolderOpen,
  File,
  FileText,
  FileJson,
  FileCode,
  FileCog,
  FileImage,
  FileLock,
} from "lucide-react";

type FileNode = {
  path: string;
  name: string;
  type: "dir" | "file";
  size?: number;
  children?: FileNode[];
};

type Props = {
  onSelect: (path: string) => void;
  activeFile?: string; // To highlight the currently active file
  className?: string;
  initialDepth?: number;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

const getFileIcon = (fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase();
  switch (extension) {
    case "js":
    case "ts":
    case "tsx":
    case "jsx":
      return <FileCode className="w-4 h-4 text-blue-400" />;
    case "json":
      return <FileJson className="w-4 h-4 text-yellow-400" />;
    case "md":
      return <FileText className="w-4 h-4 text-gray-400" />;
    case "py":
      return <FileCode className="w-4 h-4 text-green-400" />;
    case "sh":
    case "config":
    case "yml":
    case "yaml":
      return <FileCog className="w-4 h-4 text-purple-400" />;
    case "lock":
      return <FileLock className="w-4 h-4 text-red-400" />;
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      return <FileImage className="w-4 h-4 text-teal-400" />;
    default:
      return <File className="w-4 h-4 text-gray-500" />;
  }
};

export default function FileTree({
  onSelect,
  activeFile,
  className,
  initialDepth = 2,
}: Props) {
  const [root, setRoot] = useState<FileNode | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    "": true,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const api = useMemo(
    () => ({
      async fetchTree(path: string | null, depth: number): Promise<FileNode> {
        const qs = new URLSearchParams();
        if (path && path.length > 0) qs.set("path", path);
        qs.set("depth", String(depth));
        const url = `${API_BASE}/api/files/tree?${qs.toString()}`;
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) {
          let msg = `HTTP ${res.status}`;
          try {
            const t = await res.json();
            msg = t?.detail || msg;
          } catch {}
          throw new Error(msg);
        }
        return (await res.json()) as FileNode;
      },
    }),
    [],
  );

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api
      .fetchTree(null, initialDepth)
      .then((node) => {
        if (!alive) return;
        if (node.path === "") node.name = node.name || "root";
        setRoot(node);
      })
      .catch((e: any) => {
        if (!alive) return;
        setError(`트리 로드 실패: ${e?.message || e}`);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [api, initialDepth]);

  const setNodeChildren = useCallback(
    (targetPath: string, children: FileNode[]) => {
      setRoot((prev) => {
        if (!prev) return prev;
        const clone = structuredClone(prev) as FileNode;
        const walk = (n: FileNode): boolean => {
          if (n.path === targetPath) {
            n.children = children;
            return true;
          }
          if (n.children) {
            for (const c of n.children) {
              if (c.type === "dir" && walk(c)) return true;
            }
          }
          return false;
        };
        if (targetPath === "" || targetPath === prev.path) {
          clone.children = children;
          return clone;
        }
        walk(clone);
        return clone;
      });
    },
    [],
  );

  const toggleExpand = useCallback(
    async (dirPath: string) => {
      const newExpandedState = { ...expanded, [dirPath]: !expanded[dirPath] };
      setExpanded(newExpandedState);

      const willOpen = newExpandedState[dirPath];
      if (willOpen) {
        // Lazy load children
        const hasChildren = (() => {
          // A simple check to see if children array exists and is not empty
          let found = false;
          const search = (node: FileNode | null) => {
            if (!node || found) return;
            if (node.path === dirPath) {
              if (node.children && node.children.length > 0) found = true;
              return;
            }
            if (node.children) node.children.forEach(search);
          };
          search(root);
          return found;
        })();

        if (!hasChildren) {
          try {
            const node = await api.fetchTree(dirPath || null, 1); // Load one level deep
            setNodeChildren(dirPath, node.children || []);
          } catch (e: any) {
            setError(`하위 폴더 로드 실패: ${e?.message || e}`);
          }
        }
      }
    },
    [expanded, root, api, setNodeChildren],
  );

  const renderNode = useCallback(
    (n: FileNode, level: number): React.ReactNode => {
      const paddingLeft = `${level * 16}px`;
      const isActive = n.type === "file" && n.path === activeFile;

      const baseClasses =
        "w-full flex items-center gap-2 px-2 py-1.5 cursor-pointer rounded-md transition-colors duration-100";
      const hoverClasses = "hover:bg-gray-700/50";
      const activeClasses = isActive ? "bg-blue-600/30 text-white" : "";
      const finalClasses = `${baseClasses} ${isActive ? activeClasses : hoverClasses}`;

      if (n.type === "dir") {
        const isOpen = expanded[n.path] ?? false;
        return (
          <div key={n.path}>
            <div
              className={finalClasses}
              style={{ paddingLeft }}
              onClick={() => toggleExpand(n.path)}
              title={n.path || "/"}
            >
              {isOpen ? (
                <FolderOpen className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              ) : (
                <Folder className="w-4 h-4 text-yellow-500 flex-shrink-0" />
              )}
              <span className="text-sm truncate">{n.name}</span>
            </div>
            {isOpen && n.children?.map((c) => renderNode(c, level + 1))}
          </div>
        );
      }

      // File node
      return (
        <div
          key={n.path}
          className={finalClasses}
          style={{ paddingLeft }}
          onClick={() => onSelect(n.path)}
          title={n.path}
        >
          {getFileIcon(n.name)}
          <span className="text-sm truncate">{n.name}</span>
        </div>
      );
    },
    [expanded, activeFile, onSelect, toggleExpand],
  );

  const content = useMemo(() => {
    if (loading)
      return <div className="p-4 text-sm text-gray-400">로딩 중…</div>;
    if (error)
      return <div className="p-4 text-sm text-red-400">에러: {error}</div>;
    if (!root)
      return (
        <div className="p-4 text-sm text-gray-500">
          프로젝트를 찾을 수 없습니다.
        </div>
      );
    return <div className="p-2 space-y-0.5">{renderNode(root, 0)}</div>;
  }, [loading, error, root, renderNode]);

  return (
    <div
      className={["h-full overflow-auto", className].filter(Boolean).join(" ")}
    >
      {content}
    </div>
  );
}
