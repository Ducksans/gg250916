import React from "react";
import ChatTimeline from "@/components/chat/ChatTimeline";
import Composer from "@/components/chat/Composer";

export default function IdeChat({ thread, onSend, height }) {
  return (
    <div className="col" style={{ height, display: "grid", gridTemplateRows: "1fr auto" }}>
      <div className="section-title" style={{ gridColumn: "1 / -1" }}>Chat</div>
      <div style={{ height: `calc(${height} - 36px - 120px)`, overflow: "auto" }}>
        <ChatTimeline thread={thread} />
      </div>
      <div style={{ borderTop: "1px solid var(--gg-border)", background: "#0b1222" }}>
        <Composer onSend={onSend} />
      </div>
    </div>
  );
}

