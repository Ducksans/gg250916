import { useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { homeDir, desktopDir, documentDir } from "@tauri-apps/api/path";

// Types
interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  modified?: number;
}

interface DirectoryContent {
  path: string;
  files: FileInfo[];
  directories: FileInfo[];
}

interface SearchResult {
  path: string;
  matches: Array<[number, string]>;
}

interface TauriFileSystemError {
  message: string;
  path?: string;
}

export function useTauriFileSystem() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<TauriFileSystemError | null>(null);

  // Check if Tauri is available
  useEffect(() => {
    const checkTauri = async () => {
      try {
        if (window && "__TAURI__" in window) {
          setIsAvailable(true);
          // Set initial path to home directory
          const home = await homeDir();
          setCurrentPath(home);
        }
      } catch (err) {
        console.warn("Tauri not available:", err);
        setIsAvailable(false);
      }
    };
    checkTauri();
  }, []);

  // Error handler
  const handleError = useCallback((err: any, path?: string) => {
    const errorMessage = err instanceof Error ? err.message : String(err);
    setError({ message: errorMessage, path });
    console.error("Tauri filesystem error:", errorMessage);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Read file content
  const readFile = useCallback(
    async (path: string): Promise<string | null> => {
      if (!isAvailable) return null;

      setIsLoading(true);
      clearError();

      try {
        const content = await invoke<string>("read_file", { path });
        return content;
      } catch (err) {
        handleError(err, path);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable, clearError, handleError],
  );

  // Write file content
  const writeFile = useCallback(
    async (path: string, content: string): Promise<boolean> => {
      if (!isAvailable) return false;

      setIsLoading(true);
      clearError();

      try {
        await invoke("write_file", { path, content });
        return true;
      } catch (err) {
        handleError(err, path);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable, clearError, handleError],
  );

  // Read directory contents
  const readDirectory = useCallback(
    async (path: string): Promise<DirectoryContent | null> => {
      if (!isAvailable) return null;

      setIsLoading(true);
      clearError();

      try {
        const content = await invoke<DirectoryContent>("read_directory", {
          path,
        });
        setCurrentPath(path);
        return content;
      } catch (err) {
        handleError(err, path);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable, clearError, handleError],
  );

  // Create directory
  const createDirectory = useCallback(
    async (path: string): Promise<boolean> => {
      if (!isAvailable) return false;

      setIsLoading(true);
      clearError();

      try {
        await invoke("create_directory", { path });
        return true;
      } catch (err) {
        handleError(err, path);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable, clearError, handleError],
  );

  // Remove file or directory
  const removePath = useCallback(
    async (path: string): Promise<boolean> => {
      if (!isAvailable) return false;

      setIsLoading(true);
      clearError();

      try {
        await invoke("remove_path", { path });
        return true;
      } catch (err) {
        handleError(err, path);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable, clearError, handleError],
  );

  // Rename file or directory
  const renamePath = useCallback(
    async (oldPath: string, newPath: string): Promise<boolean> => {
      if (!isAvailable) return false;

      setIsLoading(true);
      clearError();

      try {
        await invoke("rename_path", { oldPath, newPath });
        return true;
      } catch (err) {
        handleError(err, oldPath);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable, clearError, handleError],
  );

  // Check if path exists
  const pathExists = useCallback(
    async (path: string): Promise<boolean> => {
      if (!isAvailable) return false;

      try {
        const exists = await invoke<boolean>("path_exists", { path });
        return exists;
      } catch (err) {
        handleError(err, path);
        return false;
      }
    },
    [isAvailable, handleError],
  );

  // Get file info
  const getFileInfo = useCallback(
    async (path: string): Promise<FileInfo | null> => {
      if (!isAvailable) return null;

      setIsLoading(true);
      clearError();

      try {
        const info = await invoke<FileInfo>("get_file_info", { path });
        return info;
      } catch (err) {
        handleError(err, path);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable, clearError, handleError],
  );

  // Get special directories
  const getSpecialDirectories = useCallback(async () => {
    if (!isAvailable) return null;

    try {
      const [home, desktop, documents, projectRoot] = await Promise.all([
        homeDir(),
        desktopDir(),
        documentDir(),
        invoke<string>("get_project_root"),
      ]);

      return {
        home,
        desktop,
        documents,
        projectRoot,
      };
    } catch (err) {
      handleError(err);
      return null;
    }
  }, [isAvailable, handleError]);

  // Search files by pattern
  const searchFiles = useCallback(
    async (
      directory: string,
      pattern: string,
      maxDepth?: number,
    ): Promise<string[] | null> => {
      if (!isAvailable) return null;

      setIsLoading(true);
      clearError();

      try {
        const results = await invoke<string[]>("search_files", {
          directory,
          pattern,
          maxDepth,
        });
        return results;
      } catch (err) {
        handleError(err, directory);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable, clearError, handleError],
  );

  // Grep in files
  const grepInFiles = useCallback(
    async (
      directory: string,
      pattern: string,
      fileExtension?: string,
    ): Promise<SearchResult[] | null> => {
      if (!isAvailable) return null;

      setIsLoading(true);
      clearError();

      try {
        const results = await invoke<Array<[string, Array<[number, string]>]>>(
          "grep_in_files",
          {
            directory,
            pattern,
            fileExtension,
          },
        );

        // Transform results to more usable format
        return results.map(([path, matches]) => ({
          path,
          matches,
        }));
      } catch (err) {
        handleError(err, directory);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isAvailable, clearError, handleError],
  );

  // Open file dialog
  const openFileDialog = useCallback(
    async (options?: {
      multiple?: boolean;
      directory?: boolean;
      filters?: Array<{ name: string; extensions: string[] }>;
    }): Promise<string | string[] | null> => {
      if (!isAvailable) return null;

      try {
        const result = await open({
          multiple: options?.multiple || false,
          directory: options?.directory || false,
          filters: options?.filters,
        });
        return result;
      } catch (err) {
        handleError(err);
        return null;
      }
    },
    [isAvailable, handleError],
  );

  // Save file dialog
  const saveFileDialog = useCallback(
    async (options?: {
      defaultPath?: string;
      filters?: Array<{ name: string; extensions: string[] }>;
    }): Promise<string | null> => {
      if (!isAvailable) return null;

      try {
        const result = await save({
          defaultPath: options?.defaultPath,
          filters: options?.filters,
        });
        return result;
      } catch (err) {
        handleError(err);
        return null;
      }
    },
    [isAvailable, handleError],
  );

  // Navigate to parent directory
  const navigateToParent =
    useCallback(async (): Promise<DirectoryContent | null> => {
      if (!currentPath || currentPath === "/") return null;

      const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
      return readDirectory(parentPath);
    }, [currentPath, readDirectory]);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes === 0) return "0 Bytes";

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }, []);

  // Format date
  const formatDate = useCallback((timestamp?: number): string => {
    if (!timestamp) return "Unknown";

    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  }, []);

  return {
    // State
    isAvailable,
    currentPath,
    isLoading,
    error,

    // Methods
    readFile,
    writeFile,
    readDirectory,
    createDirectory,
    removePath,
    renamePath,
    pathExists,
    getFileInfo,
    getSpecialDirectories,
    searchFiles,
    grepInFiles,
    openFileDialog,
    saveFileDialog,
    navigateToParent,

    // Utilities
    formatFileSize,
    formatDate,
    clearError,
  };
}

// Export types for external use
export type { FileInfo, DirectoryContent, SearchResult, TauriFileSystemError };
