import { editor } from "monaco-editor";

// 금강 2.0 Dark Theme
export const gumgangDarkTheme: editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    // Comments
    { token: "comment", foreground: "6B7280", fontStyle: "italic" },
    { token: "comment.doc", foreground: "6B7280", fontStyle: "italic" },

    // Strings
    { token: "string", foreground: "86EFAC" },
    { token: "string.escape", foreground: "FDE047" },
    { token: "string.regex", foreground: "F87171" },

    // Numbers
    { token: "number", foreground: "FDE047" },
    { token: "number.hex", foreground: "FDE047" },
    { token: "number.octal", foreground: "FDE047" },
    { token: "number.binary", foreground: "FDE047" },

    // Keywords
    { token: "keyword", foreground: "C084FC", fontStyle: "bold" },
    { token: "keyword.control", foreground: "C084FC", fontStyle: "bold" },
    { token: "keyword.operator", foreground: "60A5FA" },

    // Variables and Functions
    { token: "variable", foreground: "F3F4F6" },
    { token: "variable.parameter", foreground: "FCA5A5", fontStyle: "italic" },
    { token: "function", foreground: "93C5FD" },
    { token: "function.method", foreground: "93C5FD" },

    // Types and Classes
    { token: "type", foreground: "FDE047" },
    { token: "type.interface", foreground: "FDE047", fontStyle: "italic" },
    { token: "class", foreground: "FDE047", fontStyle: "bold" },
    { token: "namespace", foreground: "A78BFA" },

    // Constants
    { token: "constant", foreground: "F87171", fontStyle: "bold" },
    { token: "constant.language", foreground: "F87171", fontStyle: "bold" },

    // Tags (HTML/XML)
    { token: "tag", foreground: "F87171" },
    { token: "tag.attribute.name", foreground: "93C5FD" },
    { token: "tag.attribute.value", foreground: "86EFAC" },

    // Punctuation
    { token: "delimiter", foreground: "9CA3AF" },
    { token: "delimiter.bracket", foreground: "9CA3AF" },
    { token: "delimiter.parenthesis", foreground: "9CA3AF" },

    // Operators
    { token: "operator", foreground: "60A5FA" },

    // Annotations
    { token: "annotation", foreground: "FDE047", fontStyle: "italic" },

    // Errors
    { token: "invalid", foreground: "EF4444", fontStyle: "bold underline" },
  ],
  colors: {
    // Editor colors
    "editor.background": "#0F172A",
    "editor.foreground": "#F3F4F6",
    "editor.lineHighlightBackground": "#1E293B",
    "editor.selectionBackground": "#334155",
    "editor.inactiveSelectionBackground": "#1E293B",
    "editorCursor.foreground": "#60A5FA",
    "editorWhitespace.foreground": "#334155",

    // Editor gutter
    "editorLineNumber.foreground": "#475569",
    "editorLineNumber.activeForeground": "#94A3B8",
    "editorGutter.background": "#0F172A",
    "editorGutter.modifiedBackground": "#3B82F6",
    "editorGutter.addedBackground": "#10B981",
    "editorGutter.deletedBackground": "#EF4444",

    // Editor widgets
    "editorWidget.background": "#1E293B",
    "editorWidget.foreground": "#F3F4F6",
    "editorWidget.border": "#334155",
    "editorHoverWidget.background": "#1E293B",
    "editorHoverWidget.border": "#334155",
    "editorSuggestWidget.background": "#1E293B",
    "editorSuggestWidget.border": "#334155",
    "editorSuggestWidget.foreground": "#F3F4F6",
    "editorSuggestWidget.highlightForeground": "#60A5FA",
    "editorSuggestWidget.selectedBackground": "#334155",

    // Editor markers
    "editorError.foreground": "#EF4444",
    "editorWarning.foreground": "#F59E0B",
    "editorInfo.foreground": "#3B82F6",
    "editorHint.foreground": "#10B981",

    // Diff editor
    "diffEditor.insertedTextBackground": "#10B98133",
    "diffEditor.removedTextBackground": "#EF444433",

    // Editor find match
    "editor.findMatchBackground": "#FDE04755",
    "editor.findMatchHighlightBackground": "#FDE04733",

    // Brackets
    "editorBracketMatch.background": "#60A5FA33",
    "editorBracketMatch.border": "#60A5FA",

    // Overview ruler
    "editorOverviewRuler.border": "#334155",
    "editorOverviewRuler.findMatchForeground": "#FDE047",
    "editorOverviewRuler.modifiedForeground": "#3B82F6",
    "editorOverviewRuler.addedForeground": "#10B981",
    "editorOverviewRuler.deletedForeground": "#EF4444",
    "editorOverviewRuler.errorForeground": "#EF4444",
    "editorOverviewRuler.warningForeground": "#F59E0B",
    "editorOverviewRuler.infoForeground": "#3B82F6",

    // Scrollbar
    "scrollbar.shadow": "#00000033",
    "scrollbarSlider.background": "#33415566",
    "scrollbarSlider.hoverBackground": "#475569AA",
    "scrollbarSlider.activeBackground": "#64748BAA",

    // Minimap
    "minimap.background": "#0F172A",
    "minimap.selectionHighlight": "#334155",
    "minimap.findMatchHighlight": "#FDE047",
    "minimap.errorHighlight": "#EF4444",
    "minimap.warningHighlight": "#F59E0B",

    // Panel colors
    "panel.background": "#0F172A",
    "panel.border": "#334155",
    "panelTitle.activeBorder": "#60A5FA",
    "panelTitle.activeForeground": "#F3F4F6",
    "panelTitle.inactiveForeground": "#94A3B8",

    // Status bar
    "statusBar.background": "#1E293B",
    "statusBar.foreground": "#94A3B8",
    "statusBar.border": "#334155",
    "statusBar.debuggingBackground": "#F59E0B",
    "statusBar.debuggingForeground": "#0F172A",
    "statusBar.noFolderBackground": "#1E293B",
    "statusBarItem.hoverBackground": "#334155",

    // Activity bar
    "activityBar.background": "#0F172A",
    "activityBar.foreground": "#94A3B8",
    "activityBar.inactiveForeground": "#475569",
    "activityBar.border": "#334155",
    "activityBarBadge.background": "#3B82F6",
    "activityBarBadge.foreground": "#FFFFFF",

    // Side bar
    "sideBar.background": "#0F172A",
    "sideBar.foreground": "#94A3B8",
    "sideBar.border": "#334155",
    "sideBarTitle.foreground": "#F3F4F6",
    "sideBarSectionHeader.background": "#1E293B",
    "sideBarSectionHeader.foreground": "#F3F4F6",

    // Lists and trees
    "list.activeSelectionBackground": "#334155",
    "list.activeSelectionForeground": "#F3F4F6",
    "list.inactiveSelectionBackground": "#1E293B",
    "list.inactiveSelectionForeground": "#F3F4F6",
    "list.hoverBackground": "#1E293B",
    "list.hoverForeground": "#F3F4F6",
    "list.focusBackground": "#334155",
    "list.focusForeground": "#F3F4F6",
    "list.highlightForeground": "#60A5FA",
    "tree.indentGuidesStroke": "#334155",

    // Input controls
    "input.background": "#1E293B",
    "input.foreground": "#F3F4F6",
    "input.border": "#334155",
    "input.placeholderForeground": "#64748B",
    "inputOption.activeBorder": "#60A5FA",
    "inputOption.activeBackground": "#33415533",
    "inputValidation.errorBackground": "#EF444433",
    "inputValidation.errorBorder": "#EF4444",
    "inputValidation.infoBackground": "#3B82F633",
    "inputValidation.infoBorder": "#3B82F6",
    "inputValidation.warningBackground": "#F59E0B33",
    "inputValidation.warningBorder": "#F59E0B",

    // Dropdown
    "dropdown.background": "#1E293B",
    "dropdown.foreground": "#F3F4F6",
    "dropdown.border": "#334155",

    // Button
    "button.background": "#3B82F6",
    "button.foreground": "#FFFFFF",
    "button.hoverBackground": "#2563EB",

    // Badge
    "badge.background": "#3B82F6",
    "badge.foreground": "#FFFFFF",

    // Progress bar
    "progressBar.background": "#3B82F6",

    // Title bar
    "titleBar.activeBackground": "#0F172A",
    "titleBar.activeForeground": "#F3F4F6",
    "titleBar.inactiveBackground": "#0F172A",
    "titleBar.inactiveForeground": "#94A3B8",
    "titleBar.border": "#334155",

    // Menu
    "menu.background": "#1E293B",
    "menu.foreground": "#F3F4F6",
    "menu.selectionBackground": "#334155",
    "menu.selectionForeground": "#F3F4F6",
    "menu.selectionBorder": "#60A5FA",
    "menubar.selectionBackground": "#334155",
    "menubar.selectionForeground": "#F3F4F6",

    // Notifications
    "notificationCenter.border": "#334155",
    "notificationCenterHeader.background": "#1E293B",
    "notificationCenterHeader.foreground": "#F3F4F6",
    "notifications.background": "#1E293B",
    "notifications.foreground": "#F3F4F6",
    "notifications.border": "#334155",
    "notificationLink.foreground": "#60A5FA",

    // Terminal
    "terminal.background": "#0F172A",
    "terminal.foreground": "#F3F4F6",
    "terminal.ansiBlack": "#0F172A",
    "terminal.ansiRed": "#EF4444",
    "terminal.ansiGreen": "#10B981",
    "terminal.ansiYellow": "#FDE047",
    "terminal.ansiBlue": "#3B82F6",
    "terminal.ansiMagenta": "#C084FC",
    "terminal.ansiCyan": "#06B6D4",
    "terminal.ansiWhite": "#F3F4F6",
    "terminal.ansiBrightBlack": "#475569",
    "terminal.ansiBrightRed": "#F87171",
    "terminal.ansiBrightGreen": "#86EFAC",
    "terminal.ansiBrightYellow": "#FDE68A",
    "terminal.ansiBrightBlue": "#60A5FA",
    "terminal.ansiBrightMagenta": "#E9D5FF",
    "terminal.ansiBrightCyan": "#67E8F9",
    "terminal.ansiBrightWhite": "#FFFFFF",

    // Git colors
    "gitDecoration.addedResourceForeground": "#10B981",
    "gitDecoration.modifiedResourceForeground": "#3B82F6",
    "gitDecoration.deletedResourceForeground": "#EF4444",
    "gitDecoration.untrackedResourceForeground": "#FDE047",
    "gitDecoration.ignoredResourceForeground": "#64748B",
    "gitDecoration.conflictingResourceForeground": "#F59E0B",
    "gitDecoration.submoduleResourceForeground": "#C084FC",
  },
};

// 금강 2.0 Light Theme
export const gumgangLightTheme: editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    // Comments
    { token: "comment", foreground: "6B7280", fontStyle: "italic" },
    { token: "comment.doc", foreground: "6B7280", fontStyle: "italic" },

    // Strings
    { token: "string", foreground: "059669" },
    { token: "string.escape", foreground: "D97706" },
    { token: "string.regex", foreground: "DC2626" },

    // Numbers
    { token: "number", foreground: "D97706" },
    { token: "number.hex", foreground: "D97706" },
    { token: "number.octal", foreground: "D97706" },
    { token: "number.binary", foreground: "D97706" },

    // Keywords
    { token: "keyword", foreground: "7C3AED", fontStyle: "bold" },
    { token: "keyword.control", foreground: "7C3AED", fontStyle: "bold" },
    { token: "keyword.operator", foreground: "2563EB" },

    // Variables and Functions
    { token: "variable", foreground: "111827" },
    { token: "variable.parameter", foreground: "DC2626", fontStyle: "italic" },
    { token: "function", foreground: "2563EB" },
    { token: "function.method", foreground: "2563EB" },

    // Types and Classes
    { token: "type", foreground: "D97706" },
    { token: "type.interface", foreground: "D97706", fontStyle: "italic" },
    { token: "class", foreground: "D97706", fontStyle: "bold" },
    { token: "namespace", foreground: "7C3AED" },

    // Constants
    { token: "constant", foreground: "DC2626", fontStyle: "bold" },
    { token: "constant.language", foreground: "DC2626", fontStyle: "bold" },

    // Tags (HTML/XML)
    { token: "tag", foreground: "DC2626" },
    { token: "tag.attribute.name", foreground: "2563EB" },
    { token: "tag.attribute.value", foreground: "059669" },

    // Punctuation
    { token: "delimiter", foreground: "6B7280" },
    { token: "delimiter.bracket", foreground: "6B7280" },
    { token: "delimiter.parenthesis", foreground: "6B7280" },

    // Operators
    { token: "operator", foreground: "2563EB" },

    // Annotations
    { token: "annotation", foreground: "D97706", fontStyle: "italic" },

    // Errors
    { token: "invalid", foreground: "DC2626", fontStyle: "bold underline" },
  ],
  colors: {
    "editor.background": "#FFFFFF",
    "editor.foreground": "#111827",
    "editorLineNumber.foreground": "#9CA3AF",
    "editorLineNumber.activeForeground": "#4B5563",
  },
};

// Apply theme function
export function applyMonacoTheme(
  monaco: any,
  themeName: "dark" | "light" = "dark",
) {
  const theme = themeName === "dark" ? gumgangDarkTheme : gumgangLightTheme;
  monaco.editor.defineTheme(`gumgang-${themeName}`, theme);
  monaco.editor.setTheme(`gumgang-${themeName}`);
}

// Export default theme names
export const THEME_NAMES = {
  DARK: "gumgang-dark",
  LIGHT: "gumgang-light",
} as const;

export default {
  gumgangDarkTheme,
  gumgangLightTheme,
  applyMonacoTheme,
  THEME_NAMES,
};
