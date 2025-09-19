import React, { useMemo } from "react";
import CommandCenterDrawer from "@/components/CommandCenterDrawer";
import usePysparkPanel from "@/hooks/usePysparkPanel";
import { chatStore } from "@/state/chatStore";

export default function CommandCenterPanel({
  show,
  ccTab,
  setShowCC,
  setCCTab,
  setMainMode,
  backend,
  bridge,
  activeThread,
}) {
  const { pysparkData, onRefresh, onRerun, onPlannerRun } = usePysparkPanel({
    showCC: show,
    ccTab,
    setShowCC,
    setCCTab,
  });

  const plannerData = useMemo(() => {
    try {
      const msgs = activeThread?.messages || [];
      return {
        threadId: activeThread?.id,
        title: activeThread?.title,
        lastMessage: msgs.length ? msgs[msgs.length - 1]?.content : undefined,
      };
    } catch {
      return { threadId: activeThread?.id, title: activeThread?.title };
    }
  }, [activeThread?.id, activeThread?.title, activeThread?.messages]);

  const executorData = useMemo(() => {
    try {
      const state = chatStore.getState();
      const invs = (state?.mcp?.invocations || []).filter(
        (x) => x.threadId === activeThread?.id,
      );
      return invs[invs.length - 1] || null;
    } catch {
      return null;
    }
  }, [activeThread?.id]);

  return (
    <CommandCenterDrawer
      show={show}
      activeTab={ccTab}
      onTabChange={(k) => {
        setCCTab(k);
        setMainMode?.(k);
      }}
      onClose={() => setShowCC(false)}
      onOpenInMain={(k) => {
        setMainMode?.(k || ccTab);
        setShowCC(false);
      }}
      plannerData={plannerData}
      insightsData={{ backend, bridge }}
      executorData={executorData}
      pysparkData={pysparkData}
      onPysparkRefresh={onRefresh}
      onPysparkRerun={onRerun}
      onPlannerRunPyspark={onPlannerRun}
    />
  );
}

