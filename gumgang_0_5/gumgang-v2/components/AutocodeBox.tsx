"use client";

import React, { useState } from "react";

type RunResponse = {
  ok: boolean;
  code: number;
  stdout?: string;
  stderr?: string;
  touched?: string[];
  error?: string;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";
const APPROVE = "GO-ZED-ESCAPE-01";

export default function AutocodeBox() {
  const [task, setTask] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [resp, setResp] = useState<RunResponse | null>(null);

  const run = async () => {
    if (!task.trim()) return;
    setLoading(true);
    setResp(null);
    try {
      const r = await fetch(`${API_BASE}/api/protocol/autocode/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Approve-Code": APPROVE,
        },
        body: JSON.stringify({ task }),
      });
      const j = (await r.json()) as RunResponse;
      setResp(j);
    } catch (e: any) {
      setResp({ ok: false, code: -1, error: String(e) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-3 rounded-xl border border-gray-700/40 bg-black/20 space-y-3">
      <div className="text-sm text-gray-200">
        프롬프트 → 실제 파일 생성/수정 + 체크포인트 (AutoCoder)
      </div>
      <textarea
        className="w-full p-2 rounded-md bg-black/40 border border-gray-700 text-sm text-gray-100 outline-none focus:ring-2 focus:ring-emerald-600"
        rows={3}
        placeholder={`예) Create docs/snippets/hello.py printing "hello world"`}
        value={task}
        onChange={(e) => setTask(e.target.value)}
      />
      <div className="flex items-center gap-2">
        <button
          onClick={run}
          disabled={loading}
          className="px-3 py-2 rounded-lg border border-emerald-500/50 text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          {loading ? "실행 중..." : "코드 생성 실행"}
        </button>
        <span className="text-xs text-gray-400">
          API: {API_BASE.replace(/^https?:\/\//, "")}
        </span>
      </div>

      {resp && (
        <div className="text-sm mt-2 space-y-2">
          <div className="text-gray-200">
            ok: <span className="text-white">{String(resp.ok)}</span> / code:{" "}
            <span className="text-white">{resp.code}</span>
          </div>

          {resp.touched?.length ? (
            <div className="text-gray-200">
              touched:
              <ul className="list-disc ml-6 mt-1 space-y-0.5">
                {resp.touched.map((p) => (
                  <li key={p} className="flex items-center gap-2 text-gray-100">
                    <span className="font-mono text-xs">{p}</span>
                    <button
                      onClick={async () => {
                        try {
                          const r = await fetch(
                            `${API_BASE}/api/files/read?path=${encodeURIComponent(p)}`,
                          );
                          const j = await r.json();
                          alert(
                            `Preview: ${p}\n\n${(j.content || "").slice(0, 600)}`,
                          );
                        } catch (e) {
                          alert(`Preview failed: ${String(e)}`);
                        }
                      }}
                      className="px-2 py-0.5 rounded border border-blue-500/50 hover:bg-blue-500/10 text-xs"
                    >
                      미리보기
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="space-y-1">
            {resp.stdout ? (
              <>
                <div className="text-gray-300">stdout (tail):</div>
                <pre className="whitespace-pre-wrap text-xs max-h-64 overflow-auto bg-black/30 p-2 rounded text-gray-100">
                  {resp.stdout}
                </pre>
              </>
            ) : null}

            {resp.stderr ? (
              <>
                <div className="text-gray-300">stderr (tail):</div>
                <pre className="whitespace-pre-wrap text-xs max-h-64 overflow-auto bg-black/30 p-2 rounded text-red-300">
                  {resp.stderr}
                </pre>
              </>
            ) : null}

            {resp.error ? (
              <div className="text-xs text-red-400">error: {resp.error}</div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
