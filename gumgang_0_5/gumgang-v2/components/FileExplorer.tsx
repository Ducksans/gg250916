import React, { useState, useEffect } from "react";
import {
  useTauriFileSystem,
  FileInfo,
  DirectoryContent,
} from "../hooks/useTauriFileSystem";
import {
  FolderIcon,
  DocumentIcon,
  ChevronLeftIcon,
  HomeIcon,
  ArrowPathIcon,
  FolderPlusIcon,
  TrashIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface FileExplorerProps {
  initialPath?: string;
  onFileSelect?: (file: FileInfo) => void;
}

export function FileExplorer({ initialPath, onFileSelect }: FileExplorerProps) {
  const {
    isAvailable,
    currentPath,
    isLoading,
    error,
    readFile,
    readDirectory,
    createDirectory,
    removePath,
    getSpecialDirectories,
    navigateToParent,
    formatFileSize,
    formatDate,
    clearError,
  } = useTauriFileSystem();

  const [directoryContent, setDirectoryContent] =
    useState<DirectoryContent | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [showFileContent, setShowFileContent] = useState(false);
  const [searchPattern, setSearchPattern] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);

  // Load initial directory
  useEffect(() => {
    const loadInitialDirectory = async () => {
      if (!isAvailable) return;

      const path =
        initialPath || (await getSpecialDirectories())?.projectRoot || "/";
      const content = await readDirectory(path);
      if (content) {
        setDirectoryContent(content);
      }
    };

    loadInitialDirectory();
  }, [isAvailable, initialPath]);

  // Handle directory navigation
  const handleNavigate = async (path: string) => {
    const content = await readDirectory(path);
    if (content) {
      setDirectoryContent(content);
      setSelectedFile(null);
      setShowFileContent(false);
    }
  };

  // Handle file selection
  const handleFileClick = async (file: FileInfo) => {
    if (file.is_dir) {
      await handleNavigate(file.path);
    } else {
      setSelectedFile(file);
      onFileSelect?.(file);

      // Try to read file content if it's a text file
      const textExtensions = [
        ".txt",
        ".md",
        ".json",
        ".js",
        ".ts",
        ".tsx",
        ".py",
        ".rs",
        ".toml",
        ".yaml",
        ".yml",
      ];
      const isTextFile = textExtensions.some((ext) =>
        file.name.toLowerCase().endsWith(ext),
      );

      if (isTextFile) {
        const content = await readFile(file.path);
        if (content !== null) {
          setFileContent(content);
          setShowFileContent(true);
        }
      } else {
        setFileContent("");
        setShowFileContent(false);
      }
    }
  };

  // Handle go to parent
  const handleGoToParent = async () => {
    const content = await navigateToParent();
    if (content) {
      setDirectoryContent(content);
      setSelectedFile(null);
      setShowFileContent(false);
    }
  };

  // Handle go to home
  const handleGoToHome = async () => {
    const dirs = await getSpecialDirectories();
    if (dirs?.projectRoot) {
      await handleNavigate(dirs.projectRoot);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (currentPath) {
      await handleNavigate(currentPath);
    }
  };

  // Handle create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !currentPath) return;

    const newPath = `${currentPath}/${newFolderName}`;
    const success = await createDirectory(newPath);

    if (success) {
      setNewFolderName("");
      setShowNewFolderInput(false);
      await handleRefresh();
    }
  };

  // Handle delete
  const handleDelete = async (file: FileInfo) => {
    if (!window.confirm(`정말로 "${file.name}"을(를) 삭제하시겠습니까?`))
      return;

    const success = await removePath(file.path);
    if (success) {
      await handleRefresh();
      if (selectedFile?.path === file.path) {
        setSelectedFile(null);
        setShowFileContent(false);
      }
    }
  };

  // Filter items based on search
  const filterItems = (items: FileInfo[]) => {
    if (!searchPattern) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(searchPattern.toLowerCase()),
    );
  };

  if (!isAvailable) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">
          Tauri 파일시스템을 사용할 수 없습니다.
        </p>
        <p className="text-sm text-yellow-600 mt-1">
          Tauri 앱에서 실행 중인지 확인하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-800">파일 탐색기</h2>
          <div className="flex gap-2">
            <button
              onClick={handleGoToParent}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="상위 폴더"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleGoToHome}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="프로젝트 홈"
            >
              <HomeIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="새로고침"
            >
              <ArrowPathIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowNewFolderInput(!showNewFolderInput)}
              className="p-2 hover:bg-gray-100 rounded-md transition-colors"
              title="새 폴더"
            >
              <FolderPlusIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Current Path */}
        <div className="text-sm text-gray-600 mb-3 font-mono bg-gray-50 p-2 rounded">
          {currentPath || "/"}
        </div>

        {/* Search */}
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="파일 검색..."
            value={searchPattern}
            onChange={(e) => setSearchPattern(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* New Folder Input */}
        {showNewFolderInput && (
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              placeholder="새 폴더 이름"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <button
              onClick={handleCreateFolder}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
            >
              생성
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex justify-between items-start">
            <p className="text-sm text-red-800">{error.message}</p>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* File List */}
        <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-gray-500">
              <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
              로딩 중...
            </div>
          ) : directoryContent ? (
            <div className="p-2">
              {/* Directories */}
              {filterItems(directoryContent.directories).map((dir) => (
                <div
                  key={dir.path}
                  className={`flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer group ${
                    selectedFile?.path === dir.path ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleFileClick(dir)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <FolderIcon className="w-5 h-5 text-blue-500 mr-2 flex-shrink-0" />
                    <span className="truncate text-sm">{dir.name}</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(dir);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                  >
                    <TrashIcon className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}

              {/* Files */}
              {filterItems(directoryContent.files).map((file) => (
                <div
                  key={file.path}
                  className={`flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer group ${
                    selectedFile?.path === file.path ? "bg-blue-50" : ""
                  }`}
                  onClick={() => handleFileClick(file)}
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <DocumentIcon className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} •{" "}
                        {formatDate(file.modified)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-opacity"
                  >
                    <TrashIcon className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              ))}

              {/* Empty State */}
              {directoryContent.directories.length === 0 &&
                directoryContent.files.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    폴더가 비어 있습니다
                  </div>
                )}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              디렉토리를 선택하세요
            </div>
          )}
        </div>

        {/* File Preview */}
        <div className="w-1/2 overflow-y-auto">
          {selectedFile && !selectedFile.is_dir ? (
            <div className="p-4">
              <h3 className="font-semibold text-gray-800 mb-3">
                {selectedFile.name}
              </h3>

              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">크기:</span>
                  <span className="font-mono">
                    {formatFileSize(selectedFile.size)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">수정일:</span>
                  <span className="font-mono">
                    {formatDate(selectedFile.modified)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">경로:</span>
                  <span
                    className="font-mono text-xs truncate ml-2"
                    title={selectedFile.path}
                  >
                    {selectedFile.path}
                  </span>
                </div>
              </div>

              {showFileContent && (
                <div className="border border-gray-200 rounded-lg">
                  <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
                    <span className="text-sm font-medium text-gray-700">
                      파일 내용
                    </span>
                  </div>
                  <pre className="p-3 text-xs font-mono overflow-x-auto max-h-96 bg-gray-50">
                    {fileContent || "(빈 파일)"}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500">
              파일을 선택하면 미리보기가 표시됩니다
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default FileExplorer;
