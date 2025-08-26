"use client";

import { useState } from "react";

interface TestResponse {
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  data?: unknown;
}

export default function TestPage() {
  const [response, setResponse] = useState<TestResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const testEndpoint = async (
    endpoint: string,
    method: string = "GET",
    body?: unknown,
  ) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (body && method !== "GET") {
        options.body = JSON.stringify(body);
      }

      const res = await fetch(`http://localhost:8001/api${endpoint}`, options);
      const data = await res.json();

      setResponse({
        status: res.status,
        statusText: res.statusText,
        data: data,
        headers: Object.fromEntries(res.headers.entries()),
      } as TestResponse);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">API 테스트 페이지</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 테스트 버튼들 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">엔드포인트 테스트</h2>

          <button
            onClick={() => testEndpoint("/health")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            GET /health
          </button>

          <button
            onClick={() => testEndpoint("/status")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            GET /status
          </button>

          <button
            onClick={() => testEndpoint("/memory/status")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            GET /memory/status
          </button>

          <button
            onClick={() =>
              testEndpoint("/ask", "POST", {
                message: "안녕하세요",
                session_id: "test",
              })
            }
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            POST /ask (안녕하세요)
          </button>

          <button
            onClick={() => testEndpoint("/memory/search?query=덕산")}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            GET /memory/search?query=덕산
          </button>

          <button
            onClick={() => testEndpoint("/evolution/events?limit=5")}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            GET /evolution/events
          </button>
        </div>

        {/* 응답 표시 */}
        <div className="bg-gray-800 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-4">응답 결과</h2>

          {loading && <div className="text-yellow-400">로딩 중...</div>}

          {error && (
            <div className="text-red-400">
              <strong>에러:</strong> {error}
            </div>
          )}

          {response && (
            <div className="space-y-4">
              <div>
                <strong className="text-green-400">상태:</strong>{" "}
                {response.status} {response.statusText}
              </div>

              <div>
                <strong className="text-blue-400">헤더:</strong>
                <pre className="text-xs mt-2 overflow-auto">
                  {JSON.stringify(response.headers, null, 2)}
                </pre>
              </div>

              <div>
                <strong className="text-purple-400">데이터:</strong>
                <pre className="text-xs mt-2 overflow-auto max-h-96">
                  {JSON.stringify(response.data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 직접 테스트 */}
      <div className="mt-8 p-4 bg-gray-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">직접 테스트</h2>

        <div className="space-y-4">
          <input
            type="text"
            id="custom-endpoint"
            placeholder="/endpoint"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded"
          />

          <select
            id="custom-method"
            className="w-full px-3 py-2 bg-gray-700 text-white rounded"
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <textarea
            id="custom-body"
            placeholder='{"key": "value"}'
            className="w-full px-3 py-2 bg-gray-700 text-white rounded h-24"
          />

          <button
            onClick={() => {
              const endpoint = (
                document.getElementById("custom-endpoint") as HTMLInputElement
              )?.value;
              const method = (
                document.getElementById("custom-method") as HTMLSelectElement
              )?.value;
              const bodyText = (
                document.getElementById("custom-body") as HTMLTextAreaElement
              )?.value;

              let body = null;
              if (bodyText) {
                try {
                  body = JSON.parse(bodyText);
                } catch {
                  setError("Invalid JSON in body");
                  return;
                }
              }

              if (endpoint) {
                testEndpoint(endpoint, method, body);
              }
            }}
            className="w-full px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          >
            테스트 실행
          </button>
        </div>
      </div>
    </div>
  );
}
