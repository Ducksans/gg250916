"use client";

import React, { useRef, useState, useCallback } from "react";
import { FolderOpenIcon } from "lucide-react";

interface WebFileInfo {
  name: string;
  path: string;
  content: string;
  size: number;
  type: string;
  lastModified: Date;
}

interface WebFileHandlerProps {
  onFileOpen?: (file: WebFileInfo) => void;
  onError?: (error: string) => void;
  accept?: string;
  multiple?: boolean;
  className?: string;
}

export const WebFileHandler: React.FC<WebFileHandlerProps> = ({
  onFileOpen,
  onError,
  accept = "*",
  multiple = false,
  className = "",
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Read file content
  const readFile = (file: File): Promise<WebFileInfo> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target?.result as string;
        resolve({
          name: file.name,
          path: file.webkitRelativePath || file.name,
          content: content,
          size: file.size,
          type: file.type || "text/plain",
          lastModified: new Date(file.lastModified),
        });
      };

      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };

      // Read as text for code files
      reader.readAsText(file);
    });
  };

  // Handle file selection
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;

      setIsLoading(true);

      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          // Skip very large files (>10MB)
          if (file.size > 10 * 1024 * 1024) {
            onError?.(`File ${file.name} is too large (max 10MB)`);
            continue;
          }

          const fileInfo = await readFile(file);
          onFileOpen?.(fileInfo);

          // If not multiple, break after first file
          if (!multiple) break;
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to read file";
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [onFileOpen, onError, multiple],
  );

  // Click handler for file input
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // Input change handler
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
    // Reset input value to allow selecting the same file again
    e.target.value = "";
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    handleFileSelect(files);
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleInputChange}
        style={{ display: "none" }}
      />

      {/* Visible button/drop zone */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          cursor-pointer transition-all duration-200
          ${isDragging ? "bg-blue-500/20 border-blue-500" : ""}
          ${isLoading ? "opacity-50 cursor-wait" : ""}
          ${className}
        `}
      >
        {isLoading ? (
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-400">Reading file...</span>
          </div>
        ) : (
          <div className="flex items-center space-x-2">
            <FolderOpenIcon className="w-4 h-4" />
            <span>Open File</span>
          </div>
        )}
      </div>
    </>
  );
};

// Hook for using web file handler
export function useWebFileHandler() {
  const [files, setFiles] = useState<WebFileInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const openFile = useCallback((): Promise<WebFileInfo | null> => {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "*";

      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        const file = target.files?.[0];

        if (!file) {
          resolve(null);
          return;
        }

        try {
          const reader = new FileReader();

          reader.onload = (event) => {
            const content = event.target?.result as string;
            const fileInfo: WebFileInfo = {
              name: file.name,
              path: file.name,
              content: content,
              size: file.size,
              type: file.type,
              lastModified: new Date(file.lastModified),
            };

            setFiles((prev) => [...prev, fileInfo]);
            resolve(fileInfo);
          };

          reader.onerror = () => {
            setError("Failed to read file");
            resolve(null);
          };

          reader.readAsText(file);
        } catch (err) {
          setError("Failed to open file");
          resolve(null);
        }
      };

      input.click();
    });
  }, []);

  const saveFile = useCallback(
    (content: string, filename: string = "untitled.txt") => {
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    files,
    error,
    openFile,
    saveFile,
    clearError,
  };
}

export default WebFileHandler;
