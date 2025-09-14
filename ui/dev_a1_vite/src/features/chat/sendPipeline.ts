// Minimal placeholder for future extraction of send pipeline
export type SendPayload = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
};

export type ToolDef = {
  id: string;
  name?: string;
  description?: string;
  params?: any;
};

function extractContent(j: any): string {
  return (
    j?.data?.message?.content ??
    j?.message?.content ??
    j?.choices?.[0]?.message?.content ??
    j?.content ??
    "(응답 수신)"
  );
}

export async function callChatAPI(base: string, payload: SendPayload) {
  const res = await fetch(`${base}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.ok) {
    try {
      const j = await res.json();
      return extractContent(j);
    } catch {
      return "(응답 수신)";
    }
  }
  return `⚠️ API 응답 오류: ${res.status} ${res.statusText}`;
}

export type EvidenceHit = {
  h?: { text?: string; line_from?: number; line_to?: number };
  path: string;
  overlap?: number;
  total?: number;
};

/**
 * 증거 문자열(불릿/레퍼런스) 생성 헬퍼
 * - bullets: "1. 텍스트 (path#Lx-y)" 형태의 줄바꿈 문자열
 * - refs: "path#Lx-y" 배열
 */
export function buildEvidenceStrings(hits: EvidenceHit[]) {
  const bullets = (hits || [])
    .map((s, i) => {
      const from = s.h?.line_from ?? 0;
      const to = s.h?.line_to ?? 0;
      const text = s.h?.text ?? "";
      return `${i + 1}. ${text} (${s.path}#L${from}-${to})`;
    })
    .join("\n");

  const refs = (hits || []).map((s) => {
    const from = s.h?.line_from ?? 0;
    const to = s.h?.line_to ?? 0;
    return `${s.path}#L${from}-${to}`;
  });

  return { bullets, refs };
}

/**
 * 시스템 메시지 생성 헬퍼
 * - agentSystemPrompt: 모델 별 시스템 프롬프트
 * - evidenceBullets: buildEvidenceStrings().bullets 결과
 * - ssotRuleNote: 근거 인용 규칙 노트(커스터마이즈 가능)
 * - threadContext: 스레드 요약/메타 정보 문자열(선택)
 */
export function buildSystemMessages(opts: {
  agentSystemPrompt?: string;
  evidenceBullets?: string;
  ssotRuleNote?: string;
  threadContext?: string;
}): Array<{ role: "system"; content: string }> {
  const { agentSystemPrompt, evidenceBullets, ssotRuleNote, threadContext } =
    opts || {};
  const out: Array<{ role: "system"; content: string }> = [];

  if (agentSystemPrompt) {
    out.push({ role: "system", content: agentSystemPrompt });
  }

  if (threadContext) {
    out.push({ role: "system", content: threadContext });
  }

  if (evidenceBullets && evidenceBullets.trim().length > 0) {
    const rule =
      ssotRuleNote ||
      "규칙: 반드시 출처 경로(path#Lx-y)를 인용하여 답하라. SSOT(.rules, CKPT_72H_RUN.jsonl, app/api.py, docs/0_0_금강 발원문 원본.md)를 우선 인용하라.";
    out.push({
      role: "system",
      content: `다음은 프로젝트 내 검색된 관련 근거들입니다(SSOT 우선):\n${evidenceBullets}\n\n${rule}`,
    });
  }

  return out;
}

export function buildPayload(
  model: string,
  systemMsgs: Array<{ role: "system"; content: string }>,
  history: Array<{ role: string; content: string }>,
  temperature: number = 0.7,
): SendPayload {
  return { model, messages: [...systemMsgs, ...history], temperature };
}

/**
 * 증거 스코어링 및 필터링
 * - query 토큰과의 겹침(overlap) + SSOT 보너스 + tiers 패널티로 총점 계산
 * - 보수형 필터: SSOT이거나 overlap≥minOverlap(기본 0.2)
 * - 정렬: SSOT 우선 → total 내림차순
 */
export function scoreAndFilterEvidence(
  hits: EvidenceHit[],
  opts?: {
    query?: string;
    isSSOT?: (path: string) => boolean;
    isTierMemo?: (path: string) => boolean;
    max?: number;
    minOverlap?: number;
    ssotBonus?: number; // when isSSOT(path) === true
    tierPenalty?: number; // when isTierMemo(path) === true
  },
): EvidenceHit[] {
  const query = String(opts?.query || "");
  const max = Number.isFinite(opts?.max as number) ? (opts!.max as number) : 3;
  const minOverlap = Number.isFinite(opts?.minOverlap as number)
    ? (opts!.minOverlap as number)
    : 0.2;
  const ssotBonus = Number.isFinite(opts?.ssotBonus as number)
    ? (opts!.ssotBonus as number)
    : 1;
  const tierPenalty = Number.isFinite(opts?.tierPenalty as number)
    ? (opts!.tierPenalty as number)
    : -0.25;

  const isSSOT =
    opts?.isSSOT ||
    ((p: string) => {
      const s = String(p || "");
      return (
        s.includes("gumgang_meeting/.rules") ||
        s.includes("status/checkpoints/CKPT_72H_RUN.jsonl") ||
        s.includes("gumgang_meeting/app/api.py") ||
        s.includes("docs/0_0_금강 발원문 원본.md")
      );
    });

  const isTierMemo =
    opts?.isTierMemo ||
    ((p: string) => String(p || "").includes("status/evidence/memory/tiers/"));

  const tokenize = (s: string) =>
    String(s || "")
      .toLowerCase()
      .split(/[^a-z0-9가-힣_]+/g)
      .filter((x) => x && x.length >= 2);

  const qTokens = tokenize(query);

  const scored: EvidenceHit[] = (hits || []).map((h) => {
    const text = h?.h?.text || "";
    const tks = tokenize(text);
    const overlap =
      tks.filter((tk) => qTokens.includes(tk)).length /
      Math.max(1, qTokens.length);
    const ss = isSSOT(h.path) ? ssotBonus : 0;
    const tp = isTierMemo(h.path) ? tierPenalty : 0;
    const total = overlap + ss + tp;
    return { ...h, overlap, total };
  });

  const filtered = scored
    .filter(
      (s) =>
        (isSSOT(s.path) && (s.overlap ?? 0) >= 0.05) ||
        (s.overlap ?? 0) >= minOverlap,
    )
    .sort((a, b) => {
      const aSS = isSSOT(a.path) ? 1 : 0;
      const bSS = isSSOT(b.path) ? 1 : 0;
      if (aSS !== bSS) return bSS - aSS;
      const at = a.total ?? 0;
      const bt = b.total ?? 0;
      return bt - at;
    });

  return filtered.slice(0, Math.max(1, max));
}

export async function callToolcallAPI(
  base: string,
  payload: SendPayload,
  tools: ToolDef[] = [],
) {
  const res = await fetch(`${base}/chat/toolcall`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, tools }),
  });
  if (res.ok) {
    try {
      const j = await res.json();
      return extractContent(j);
    } catch {
      return "(응답 수신)";
    }
  }
  return `⚠️ API 응답 오류: ${res.status} ${res.statusText}`;
}
