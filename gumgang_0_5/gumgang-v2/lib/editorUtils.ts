// This file contains shared utility functions related to the Monaco Editor,
// ensuring that knowledge is centralized and reusable across the application.

// A type derived from the list of supported languages.
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

// List of officially supported languages by our Monaco Editor instance.
// This list can be expanded as needed.
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
  "plaintext",
] as const;

/**
 * Infers the programming language from a file extension.
 * This function is crucial for syntax highlighting in the Monaco Editor.
 * @param filename The full name of the file (e.g., "myComponent.tsx"). Can be null or undefined.
 * @returns The corresponding language identifier for Monaco Editor. Defaults to 'plaintext'.
 */
export const getLanguageFromExtension = (
  filename: string | undefined | null,
): SupportedLanguage => {
  if (!filename) {
    return 'plaintext';
  }

  const ext = filename.split(".").pop()?.toLowerCase();

  // This map can be expanded as we support more languages.
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
    h: "cpp",
    hpp: "cpp",
    cc: "cpp",
    cs: "csharp",
    html: "html",
    htm: "html",
    css: "css",
    json: "json",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
    xml: "xml",
    sql: "sql",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    log: "plaintext",
    txt: "plaintext",
  };

  if (ext && extensionMap[ext]) {
      return extensionMap[ext];
  }

  // Fallback to plaintext if no specific language is found.
  return 'plaintext';
};
