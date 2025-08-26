# Bridge Contract (Draft)

목표: UI ↔ Bridge(3037) ↔ Backend(8000) 간 메시지 규격 정의. 서버 실행 없이 문서만.

## 공통 프레이밍
- transport: WebSocket (Bridge), HTTP(Backend)
- envelope (WS):
```/dev/null/bridge_envelope.json#L1-50
{
  "type": "request|response|event",
  "channel": "semanticSearch|fs|system",
  "id": "uuid-v4",
  "correlationId": "uuid-v4|null",
  "timestamp": "ISO8601Z",
  "payload": { }
}
```

## semanticSearch — Request
```/dev/null/semantic_search_request.json#L1-60
{
  "type": "request",
  "channel": "semanticSearch",
  "id": "uuid-v4",
  "payload": {
    "query": "string",
    "top_k": 5,
    "ef_search": 64
  }
}
```

- 제약: top_k ∈ [1,50], ef_search ≥ 1. payload 구조는 backend SearchRequest와 일치해야 함.

## semanticSearch — Response
```/dev/null/semantic_search_response.json#L1-120
{
  "type": "response",
  "channel": "semanticSearch",
  "correlationId": "<request id>",
  "id": "uuid-v4",
  "payload": {
    "query": "string",
    "top_k": 5,
    "results": [
      {
        "score": 0.0,
        "path": "string",
        "line_start": 1,
        "line_end": 10,
        "snippet": "string"
      }
    ]
  }
}
```

## semanticSearch — Error Response (payload.error)
```/dev/null/semantic_search_error_response.json#L1-80
{
  "type": "response",
  "channel": "semanticSearch",
  "correlationId": "<request id>",
  "id": "uuid-v4",
  "payload": {
    "error": "BadRequest|Internal",
    "message": "human-readable message",
    "details": {
      "field": "query",
      "issue": "required"
    }
  }
}
```

- 정합성: payload.error 구조는 backend ErrorResponse(error, message, details)와 동일해야 함.

## system — Heartbeat 이벤트
```/dev/null/system_heartbeat_event.json#L1-60
{
  "type": "event",
  "channel": "system",
  "id": "uuid-v4",
  "correlationId": null,
  "timestamp": "ISO8601Z",
  "payload": {
    "kind": "heartbeat",
    "interval_ms": 30000,
    "bridge_version": "0.1.0"
  }
}
```

- 운영 규칙: 연속 2회(예: 60s) 하트비트 미수신 시 UI는 연결 끊김으로 간주하고 재연결 시도 및 로그 남김.

참고: status/design/backend_semantic_search_api.yaml (백엔드 계약)
