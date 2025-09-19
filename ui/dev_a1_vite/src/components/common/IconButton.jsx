import React from "react";

function Svg({ name = "dot", size = 16, color = "currentColor" }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  switch (name) {
    case "explorer": // folder tree
      return (
        <svg {...common}>
          <path d="M3 6h6l2 2h10v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" fill="none" />
          <path d="M3 10h18" />
        </svg>
      );
    case "chat": // message bubble
      return (
        <svg {...common}>
          <path d="M21 12a7 7 0 0 1-7 7H7l-4 3V12a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7Z" />
          <path d="M8 12h8" /><path d="M8 9h8" />
        </svg>
      );
    case "balanced": // three columns
      return (
        <svg {...common}>
          <rect x="3" y="4" width="5" height="16" rx="1.5" />
          <rect x="10" y="4" width="4" height="16" rx="1.5" />
          <rect x="16" y="4" width="5" height="16" rx="1.5" />
        </svg>
      );
    case "presetChat": // right focus
      return (
        <svg {...common}>
          <rect x="3" y="4" width="6" height="16" rx="1.5" opacity=".4" />
          <rect x="10" y="4" width="5" height="16" rx="1.5" opacity=".6" />
          <rect x="16" y="4" width="5" height="16" rx="1.5" />
        </svg>
      );
    case "presetEditor": // center focus
      return (
        <svg {...common}>
          <rect x="3" y="4" width="5" height="16" rx="1.5" opacity=".6" />
          <rect x="10" y="4" width="6" height="16" rx="1.5" />
          <rect x="18" y="4" width="3" height="16" rx="1.5" opacity=".4" />
        </svg>
      );
    default:
      return (
        <svg {...common}><circle cx="12" cy="12" r="4" /></svg>
      );
  }
}

export default function IconButton({ title, icon, onClick, onDoubleClick, size = 16, active = false }) {
  return (
    <button
      className="btn mini icon-btn"
      aria-label={title}
      title={title}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      style={{
        padding: 6,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderColor: active ? "var(--accent-primary)" : undefined,
        boxShadow: active ? "0 0 0 1px var(--accent-primary) inset" : undefined,
      }}
    >
      <Svg name={icon} size={size} color={active ? "var(--accent-primary)" : "currentColor"} />
    </button>
  );
}

