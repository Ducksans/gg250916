# ST-0102 — Web-mode Monaco rendering patch (MultiTabEditor) + Quick Access limitation

Context
- Mode: web-only (npm run dev:fixed on Next.js), Tauri dev blocked (Cargo not installed yet).
- Symptom: File selection works but content does not render in the editor. Quick Access buttons appear non-functional.

Root Cause
- MultiTabEditor renders FileEditor for active tabs. FileEditor short-circuits to a “Tauri filesystem not available / Running in web mode” panel when Tauri is absent, so Monaco never mounts.
  - Evidence:
    - gumgang_meeting/gumgang_0_5/gumgang-v2/components/editor/FileEditor.tsx (section returning the “web mode” panel)
- Quick Access in editor/page.tsx only toggles selectedPath state; it doesn’t open a tab or read a file.
  - Evidence:
    - gumgang_meeting/gumgang_0_5/gumgang-v2/app/editor/page.tsx (Quick Access handler sets selectedPath only)

Patch (web-mode fallback)
1) Import MonacoEditor in MultiTabEditor:
   - from "./MonacoEditor"
2) In the Editor Area, when activeTab exists AND Tauri is unavailable, render MonacoEditor directly instead of FileEditor:
   - value = activeTab.content
   - language = derived from filename
   - height = "100%"
   - onChange = setTabs(prev => prev.map(t => t.id===activeTabId ? { ...t, content: v, isDirty: v!==t.originalContent } : t))

Result
- Web mode: Opening a file (via WebFileHandler) immediately renders file contents in Monaco.
- Tauri mode (later): FileEditor path remains unchanged and continues to use Tauri FS for read/write.

Quick Access limitation (by design)
- Current buttons update UI selection but do not wire into tab creation or file I/O. To enable:
  - Either implement a resolver that reads the absolute path (when Tauri available) then adds a new tab, or
  - In web mode, fetch static assets or use a client-side file picker only.

Test Plan
- npm run dev:fixed → /editor
- Use “Open File” (WebFileHandler) to select a small text/ts file → Monaco renders content and edits toggle the “unsaved” state.
- Toggle Tauri later (rustup + npx tauri dev) to validate FileEditor path remains intact.

Notes
- Keep both code paths: FileEditor (Tauri) and MonacoEditor (web fallback).
- Do not block on Quick Access; treat it as a separate enhancement task.