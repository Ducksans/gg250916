// SGM gate detection and decision logic
// Extracted from A1Dev.jsx to reduce responsibility and centralize guard config

export type EvidenceHit = {
  h?: { text?: string; line_from?: number; line_to?: number };
  path: string;
  overlap: number;
};

export function detectThreadQuestion(q: string): boolean {
  const s = String(q || "").toLowerCase();
  const terms = [
    "이\\s*스레드",
    "이\\s*대화",
    "thread",
    "스레드",
    "인식",
    "recognize",
    "aware",
    "너.*알",
    "너.*기억",
    "의미",
    "의도",
    "주제",
    "무엇",
    "뭐야",
    "무엇인지",
    "about",
    "topic",
    "purpose",
  ];
  const re = new RegExp(`(${terms.join("|")})`, "i");
  return re.test(s);
}

export function detectSummaryQuestion(q: string): boolean {
  const s = String(q || "").toLowerCase();
  return /(요약|summary|summarize|정리|핵심)/i.test(s);
}

export function hasThreadEvidence(top: EvidenceHit[]): boolean {
  return top.some((s) => String(s.path || "").includes("/threads/"));
}

export function shouldPassGate(params: {
  top: EvidenceHit[];
  onlyTiers: boolean;
  hasSSOT: boolean;
  query: string;
}): boolean {
  const { top, onlyTiers, hasSSOT, query } = params;
  const topOverlap = top.length > 0 ? top[0].overlap : 0;
  const isThreadQ = detectThreadQuestion(query);
  const isSummaryQ = detectSummaryQuestion(query);
  const threadEv = hasThreadEvidence(top);

  return (
    hasSSOT ||
    (isThreadQ && threadEv) ||
    (isSummaryQ && threadEv) ||
    (!onlyTiers && top.length > 0 && topOverlap >= 0.3) ||
    (!onlyTiers && top.length > 0 && topOverlap >= 0.2)
  );
}
