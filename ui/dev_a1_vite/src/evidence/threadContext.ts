export type EvidenceItem = {
  path: string;
  line_from: number;
  line_to: number;
  text: string;
};

export function buildThreadContextEvidence(t: any): EvidenceItem | null {
  try {
    if (!t || !Array.isArray(t.messages) || t.messages.length === 0)
      return null;
    const msgs = t.messages.filter(
      (m: any) => m && (m.role === "user" || m.role === "assistant"),
    );
    const joined = msgs
      .map(
        (m: any) =>
          `${m.role}: ${String(m.content || "").replace(/\s+/g, " ")}`,
      )
      .join("\n")
      .slice(0, 1600);
    const path = `gumgang_meeting/conversations/threads/${t.id || "CURRENT"}.jsonl`;
    const meta = `[스레드 ID: ${t.id || "CURRENT"}]\n[제목: ${t.title || "Untitled"}]\n[메시지 수: ${msgs.length}]\n\n${joined}`;
    return { path, line_from: 1, line_to: 1, text: meta };
  } catch {
    return null;
  }
}
