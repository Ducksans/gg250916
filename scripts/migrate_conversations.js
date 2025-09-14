const fs = require("fs");
const path = require("path");

/**
 * [금강 기억 이식 스크립트 v1.3 - 안정화 최종]
 * ---------------------------------------------------------------------------
 * @파일목적
 *  - GPT Web UI에서 내보낸 'conversations.json' 파일을 읽어,
 *    `chatStore.ts`가 사용하는 형식으로 변환하고,
 *    `migrated_chat_store.json`이라는 새로운 파일로 저장합니다.
 *
 * @실행방법
 *  - 1. 프로젝트 루트에서 `sudo node scripts/migrate_conversations.js`를 실행합니다.
 *  - 2. 성공 시, 프로젝트 루트에 `migrated_chat_store.json` 파일이 생성됩니다.
 *  - 3. 이 파일의 내용을 복사하여, 브라우저 개발자 도구의
 *       `localStorage` -> `gg_a1_chat_store_v1` 값에 붙여넣으면 기억 이식이 완료됩니다.
 * ---------------------------------------------------------------------------
 */

// --- 설정 ---
const SOURCE_FILE_PATH = path.join(
  __dirname,
  "../LibreChat/uploads/68ad2adceedad5db86b31328/08aa2a6e-b8b4-477f-a8b1-46f5a68a155a__conversations.json",
);
const OUTPUT_FILE_PATH = path.join(__dirname, "../migrated_chat_store.json");

// chatStore.ts와 동일한 기본 에이전트 정의
const DEFAULT_AGENTS = [
  {
    id: "gpt4o",
    name: "기본 채팅 (GPT-4o)",
    model: "gpt-4o",
    systemPrompt:
      "당신은 금강의 기본 대화 에이전트입니다. 간결하고 명확하게 한국어로 답변합니다.",
  },
];

// --- 헬퍼 함수 ---
function now() {
  return Date.now();
}

function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
}

// --- 메인 로직 ---
function migrate() {
  console.log("[1/4] 기억 이식 스크립트를 시작합니다...");

  // 1. 원본 기억 파일 읽기
  if (!fs.existsSync(SOURCE_FILE_PATH)) {
    console.error(
      `❌ 오류: 원본 기억 파일이 없습니다. 경로를 확인하십시오: ${SOURCE_FILE_PATH}`,
    );
    return;
  }
  console.log(`[2/4] 원본 기억 파일(${SOURCE_FILE_PATH})을 읽는 중입니다...`);

  // GPT Web UI의 JSON export는 완전한 배열이 아닐 수 있으므로, 수동으로 감싸줍니다.
  let rawData = fs.readFileSync(SOURCE_FILE_PATH, "utf-8").trim();
  if (!rawData.startsWith("[")) {
    rawData = "[" + rawData;
  }
  if (rawData.endsWith(",")) {
    rawData = rawData.slice(0, -1);
  }
  if (!rawData.endsWith("]")) {
    rawData = rawData + "]";
  }

  const sourceData = JSON.parse(rawData);

  if (!Array.isArray(sourceData)) {
    console.error("❌ 오류: 원본 데이터가 예상된 배열 형식이 아닙니다.");
    return;
  }

  // 2. 데이터 변환
  console.log(
    `[3/4] ${sourceData.length}개의 스레드를 새로운 형식으로 변환합니다...`,
  );
  const newThreads = sourceData
    .map((sourceThread) => {
      const messages = [];
      const messageNodes = Object.values(sourceThread.mapping || {}).filter(
        (node) => node.message && node.message.content && node.message.author,
      );

      messageNodes.sort(
        (a, b) => (a.message.create_time || 0) - (b.message.create_time || 0),
      );

      for (const node of messageNodes) {
        const msg = node.message;
        const role = msg.author.role === "user" ? "user" : "assistant";
        const contentParts = msg.content?.parts || [];

        // 데이터 타입 검증 강화: contentParts[0]가 문자열인 경우에만 처리
        const firstPart = contentParts[0];
        const content = typeof firstPart === "string" ? firstPart.trim() : "";

        if (msg.content?.content_type === "text" && content) {
          messages.push({
            id: msg.id || uid("m"),
            role: role,
            content: content,
            ts: (msg.create_time || 0) * 1000,
          });
        }
      }

      const threadTimestamp = (sourceThread.create_time || 0) * 1000;
      return {
        id: sourceThread.id || uid("thread"),
        title: sourceThread.title || "Untitled Thread",
        agentId: DEFAULT_AGENTS[0].id,
        createdAt: threadTimestamp,
        updatedAt: (sourceThread.update_time || 0) * 1000,
        messages: messages,
      };
    })
    .filter((thread) => thread.messages.length > 0);

  // 3. 최종 chatStore 상태 객체 생성
  const newChatState = {
    version: 1,
    activeThreadId: newThreads[0]?.id || null,
    threads: newThreads,
    agents: DEFAULT_AGENTS,
    mcp: {
      enabled: false,
      tools: [],
      invocations: [],
    },
  };

  // 4. 변환된 파일 저장
  console.log(
    `[4/4] 변환된 기억 데이터를 ${OUTPUT_FILE_PATH} 파일로 저장합니다...`,
  );
  fs.writeFileSync(OUTPUT_FILE_PATH, JSON.stringify(newChatState, null, 2));

  console.log("\n🎉 성공! 기억 이식 데이터 생성이 완료되었습니다.");
  console.log("   - 생성된 파일:", OUTPUT_FILE_PATH);
  console.log("   - 총 변환된 스레드 개수:", newThreads.length);
  console.log(
    "\n다음 단계: 생성된 파일의 내용을 복사하여 브라우저 localStorage의 'gg_a1_chat_store_v1' 값에 붙여넣으십시오.",
  );
}

// 스크립트 실행
try {
  migrate();
} catch (e) {
  console.error("❌ 치명적인 오류가 발생했습니다:", e.message);
}
