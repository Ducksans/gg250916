---
phase: present
---

# 금강 MCP 서버 구축 — 최종 가이드

- **작성자:** Gemini
- **날짜:** 2025-09-10 (Asia/Seoul)
- **목적:** Zed Editor에서 **파일 시스템 전용** MCP 서버(`filesystem`)를 설정하여, AI 에이전트가 불안정한 터미널 명령(`cat`, `ls`) 대신 Zed의 공식적인 파일 시스템 도구(`read_file` 등)를 일관되게 사용하도록 한다. 이를 통해 AI의 드리프트와 환각을 원천적으로 방지하고, 안정적인 `write` 모드 실행 환경의 기반을 구축한다.

---

## 1. MCP란 무엇이며, 왜 지금 당장 필요한가?

- **MCP (Model Context Protocol):** **'AI를 위한 USB-C'**와 같은 개방형 표준입니다. 어떤 AI 애플리케이션(ChatGPT, Claude 등)이든, 어떤 외부 시스템(로컬 파일, 데이터베이스, 검색 엔진)이든, MCP라는 표준화된 '포트'를 통해 서로 연결됩니다. Zed는 이 프로토콜을 사용하여 AI 에이전트가 **'도구(Tool)'**에 접근하도록 합니다.
- **왜 필요한가:** 이 MCP 서버를 설정하면, Gemini, GPT, Claude 등 어떤 AI를 사용하더라도 모두 **똑같은 표준 도구**(`filesystem` 서버의 `read_text_file` 등)를 사용하게 됩니다. 이를 통해 AI의 예측 불가능한 행동(불안정한 터미널 명령 사용 등)을 원천적으로 차단하고, **'믿을 수 있는 동료'**를 만들 수 있습니다.

---

## 2. 사전 준비 (1분 점검)

1.  **Node.js 및 `npx` 설치 확인:** 이 MCP 서버는 Node.js 환경에서 실행됩니다. 터미널에서 아래 명령어를 실행하여 버전이 표시되는지 확인하십시오. (v18 이상 권장)
    ```bash
    node -v
    npx -v
    ```
2.  **Zed Editor 최신 버전 확인:** 이 가이드는 Zed의 최신 버전을 기준으로 합니다.
3.  **도구 사용 설정 확인:**
    *   Agent Panel 우측 상단 **톱니바퀴(⚙️)** 클릭 → **Configure Tool Usage**
    *   `Always ask before using tools` 옵션이 **꺼져 있는지(자동 승인)** 또는 **켜져 있는지(수동 승인)** 확인만 해둡니다.

---

## 3. '파일 시스템' MCP 서버 등록 (GUI 방식)

GPT-5가 제안하고 공식 문서에서 검증된, 가장 쉽고 확실한 방법입니다.

1.  Agent Panel 우측 상단 **톱니바퀴(⚙️)**를 클릭합니다.
2.  메뉴에서 **`+ Add Custom Server`**를 클릭합니다.
3.  나타나는 설정 창에 아래 내용을 **정확하게** 입력합니다.

    *   **Name:**
        ```
        filesystem
        ```

    *   **Command:**
        ```
        npx
        ```

    *   **Args:** (한 줄에 하나씩, 총 3개의 인수를 추가합니다)
        ```
        -y
        @modelcontextprotocol/server-filesystem
        /home/duksan/바탕화면/gumgang_meeting
        ```
        -   **`@modelcontextprotocol/server-filesystem`**: 우리가 사용할 공식 파일 시스템 서버의 이름입니다.
        -   **`/home/duksan/바탕화면/gumgang_meeting`**: **(매우 중요)** 이 서버가 접근할 수 있는 유일한 폴더입니다. 이 경로 밖의 파일은 절대 읽거나 쓸 수 없으므로, 프로젝트의 가장 강력한 보안 장치가 됩니다.

4.  **`Save`** 버튼을 클릭합니다.

---

## 4. 설정 확인 (30초 검증)

1.  저장 후, Agent Panel 설정 화면의 **Model Context Protocol (MCP) Servers** 목록에 방금 추가한 **`filesystem`** 항목이 보이는지 확인합니다.
2.  몇 초 후, `filesystem` 이름 옆의 점이 **녹색(🟢)**으로 바뀌고, 마우스를 올렸을 때 "Server is active"라는 툴팁이 나타나야 합니다.
3.  `filesystem` 항목을 클릭하여 펼쳤을 때, `read_text_file`, `write_file`, `search_files` 등 사용 가능한 도구 목록이 나타나면, 모든 설정이 완벽하게 완료된 것입니다.

---

## 5. 테스트 (첫 번째 공식 임무)

이제 AI가 새로운 '언어'를 배우고, 원시적인 `cat` 대신 정교한 '도구'를 사용하는지 확인합니다.

*   Agent Panel 채팅창에 아래와 같이 질문해보십시오.

    > `filesystem` 서버의 `read_text_file` 도구를 사용하여, `.rules` 파일의 내용을 처음부터 10줄만 읽어줘.

*   **기대 결과:** AI는 더 이상 터미널을 호출하지 않습니다. 대신, `Tool Call` 이라는 로그와 함께 `filesystem:read_text_file` 도구를 사용하는 모습을 보여주고, 파일 내용을 정확하게 가져와야 합니다. 이것이 우리가 그토록 원했던, 안정적이고 예측 가능한 AI와의 협업입니다.

---

## 6. 참고 자료 (References)

1.  **npm — @modelcontextprotocol/server-filesystem:** [https://www.npmjs.com/package/%40modelcontextprotocol/server-filesystem](https://www.npmjs.com/package/%40modelcontextprotocol/server-filesystem)
2.  **Model Context Protocol Docs — Servers Quickstart:** [https://modelcontextprotocol.org/docs/quickstart/servers](https://modelcontextprotocol.org/docs/quickstart/servers)
3.  **Zed Docs — Model Context Protocol:** [https://zed.dev/docs/ai/mcp](https://zed.dev/docs/ai/mcp)
4.  **Neon Guide — Zed + Neon MCP:** [https://neon.com/guides/zed-mcp-neon](https://neon.com/guides/zed-mcp-neon)
5.  **Kernel Docs — Remote MCP:** [https://docs.onkernel.com/reference/mcp-server](https://docs.onkernel.com/reference/mcp-server)
6.  **Zed Docs — Agent Settings:** [https://zed.dev/docs/ai/agent-settings](https://zed.dev/docs/ai/agent-settings)
7.  **Zed Docs — Using the Agent panel:** [https://zed.dev/docs/ai/using-the-agent-panel](https://zed.dev/docs/ai/using-the-agent-panel)
8.  **GitHub — modelcontextprotocol/typescript-sdk:** [https://github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk)
9.  **Zed Docs — MCP Server Extensions:** [https://zed.dev/docs/extensions/mcp-extensions](https://zed.dev/docs/extensions/mcp-extensions)

---

## 7. 다음 단계: 웹 브라우징 기능 추가

현재 설정된 `filesystem` 서버는 파일 시스템 작업에만 특화되어 있습니다. '컨텐츠 자동화 파이프라인'과 같은 고차원적인 목표를 달성하기 위한 **웹 브라우징 및 스크래핑 기능**은 별도의 MCP 서버를 통해 추가해야 합니다.

- **후보 서버:**
  - **Brave Search MCP Server:** Brave 검색 엔진 API를 사용하여 웹 검색 기능을 제공합니다.
  - **Puppeteer MCP Server:** Puppeteer를 사용하여 실제 브라우저를 제어하고, 복잡한 웹 스크래핑 및 자동화 작업을 수행할 수 있습니다.
- **다음 행동:** `View Server Extensions` 목록이나 공식 문서를 참고하여, 위 서버들 중 하나를 `filesystem` 서버와 동일한 방식으로 추가 등록하는 것을 다음 목표로 삼습니다.

---

## 8. VS Code(Continue/Cline)에서 MCP 서버 등록 — 최신 구성

아래 설정은 VS Code의 대표적 MCP 클라이언트 확장인 Continue와 Cline에서 검증된 방식입니다. 먼저 템플릿을 저장한 뒤, 필요 시 실제 settings.json으로 복사하세요.

1) 템플릿 파일 위치(예시)
- `.vscode/settings.example.json` — 본 저장소에 제공되는 샘플(아래 9장에서 생성됨)

2) Continue 확장 설정 스니펫(복사/붙여넣기)
```jsonc
{
  "continue.mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/home/duksan/바탕화면/gumgang_meeting"
      ]
    },
    "gg-memory": {
      "command": "node",
      "args": [
        "scripts/mcp/gg-memory-server.js",
        "--db",
        "status/data/gumgang.sqlite3",
        "--ckpt",
        "status/checkpoints/CKPT_72H_RUN.jsonl"
      ]
    },
    "web-fetch": {
      "command": "node",
      "args": [
        "scripts/mcp/web-fetch-server.js",
        "--allow",
        "wikipedia.org,developer.mozilla.org,modelcontextprotocol.org",
        "--max-bytes",
        "1048576",
        "--timeout-ms",
        "8000"
      ]
    }
  }
}
```

3) Cline 확장도 유사한 키(`mcpServers`)를 제공하며, 동일 구조로 등록 가능합니다.

보안/운영 가드
- 루트 경계: filesystem 서버는 반드시 프로젝트 루트만 노출
- 제외 패턴: `.git/**`, `node_modules/**`, `dist/**`, `build/**`, `__pycache__/**`
- 웹 서버: 화이트리스트 도메인, 최대 바이트, 타임아웃 필수
- 비밀키: `.env`로 주입(로그/응답 노출 금지)

---

## 9. 샘플 커스텀 MCP 서버(골격) — memory / web

본 레포에는 다음 골격이 포함됩니다(의존 패키지 설치 후 동작). 설치 전까지는 템플릿/참고용으로만 사용하세요.

- `scripts/mcp/gg-memory-server.js`
  - 목적: 5계층 메모리·체크포인트(JSONL/SQLite) 읽기/추가/검색 도구 제공
  - 의존(권장): `@modelcontextprotocol/sdk`, `better-sqlite3`
  - 도구(예): `memory.search`, `checkpoint.append`, `memory.put`

- `scripts/mcp/web-fetch-server.js`
  - 목적: 안전한 웹 fetch/scrape 도구 제공(화이트리스트/사이즈/타임아웃 가드)
  - 의존(권장): `@modelcontextprotocol/sdk`, `node-fetch`, `cheerio`
  - 도구(예): `web.fetch`, `web.scrape`

설치 예시(루트에서)
```bash
npm init -y
npm install @modelcontextprotocol/sdk better-sqlite3 node-fetch cheerio
```

---

## 10. 동작 확인 체크리스트

1) Continue/Cline에서 MCP 서버가 녹색(활성) 상태인지 확인
2) 파일 읽기 테스트: `filesystem.read_text_file`로 `.rules` 10줄 읽기
3) 체크포인트 기록: `gg-memory.checkpoint.append(...)` → `status/checkpoints/CKPT_72H_RUN.jsonl`에 한 줄 추가
4) 메모리 검색: `gg-memory.memory.search({ query: "SSV", tier: 2 })` → 최근 기록 요약 반환
5) 웹 페치: `web.fetch("https://modelcontextprotocol.org/")` → 텍스트 길이/도메인 검증
6) 실패 가드: 허용되지 않은 도메인/초과 크기/타임아웃 시 안전히 차단되는지 확인
