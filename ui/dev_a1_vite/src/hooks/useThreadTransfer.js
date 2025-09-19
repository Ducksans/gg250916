import { useEffect } from "react";
import { chatStore } from "@/state/chatStore";

/**
 * useThreadTransfer — wires import/export thread events to window events.
 *
 * Listens for:
 *  - gg:import-threads
 *  - gg:export-threads
 */
export default function useThreadTransfer() {
  useEffect(() => {
    // Import threads event handler (ported from A1Dev)
    const onImport = async () => {
      try {
        const base = "/api/v2/threads";
        // Fetch recent server-side threads then import into local store
        const u = new URL(`${base}/recent`, window.location.origin);
        u.searchParams.set("limit", "50");
        const r = await fetch(u.toString());
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = await r.json().catch(() => ({}));
        const items = Array.isArray(j?.items) ? j.items : j?.data?.items || [];
        if (!items.length) {
          chatStore.actions.addAssistantMessage("서버에서 가져올 스레드가 없습니다.");
          return;
        }

        let successCount = 0;
        let failCount = 0;
        const batchSize = 5;
        for (let i = 0; i < items.length; i += batchSize) {
          const batch = items.slice(i, i + batchSize);
          await Promise.all(
            batch.map(async (it) => {
              try {
                await chatStore.actions.importThread(it);
                successCount++;
              } catch (e) {
                console.warn("Import failed:", e);
                failCount++;
              }
            }),
          );
          const progress = Math.min(i + batchSize, items.length);
          if (progress < items.length) {
            chatStore.actions.addAssistantMessage(
              `📊 진행 상황: ${progress}/${items.length} 처리 중...`,
            );
          }
        }

        chatStore.actions.addAssistantMessage(
          `✅ Import 완료: ${successCount}개 성공${failCount > 0 ? `, ${failCount}개 실패` : ""}`,
        );
      } catch (e) {
        chatStore.actions.addAssistantMessage(
          `⚠️ Import 실패: ${e?.message || String(e)}`,
        );
      }
    };

    // Export threads event handler
    const onExport = () => {
      chatStore.actions.exportThreads();
    };

    window.addEventListener("gg:import-threads", onImport);
    window.addEventListener("gg:export-threads", onExport);

    return () => {
      window.removeEventListener("gg:import-threads", onImport);
      window.removeEventListener("gg:export-threads", onExport);
    };
  }, []);
}

