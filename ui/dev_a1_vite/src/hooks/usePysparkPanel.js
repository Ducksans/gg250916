import { useCallback, useEffect, useState } from "react";

/**
 * usePysparkPanel — encapsulates PySpark panel state, fetchers, and events.
 *
 * Props:
 * - showCC: boolean
 * - ccTab: string
 * - setShowCC: (bool) => void
 * - setCCTab: (tab: string) => void
 */
export default function usePysparkPanel({ showCC, ccTab, setShowCC, setCCTab }) {
  const [pysparkData, setPysparkData] = useState(null);

  const fetchPysparkLatest = useCallback(async () => {
    try {
      const r = await fetch("/api/mcp/pyspark/latest");
      const j = await r.json().catch(() => ({}));
      if (r.ok && j) setPysparkData(j);
    } catch {
      /* ignore */
    }
  }, []);

  // Open-panels event bridge
  useEffect(() => {
    const onOpenPanelsEvt = (e) => {
      try {
        const tab = e?.detail?.tab;
        if (tab) setCCTab(tab);
        setShowCC(true);
        if (tab === "pyspark") fetchPysparkLatest();
      } catch {
        setShowCC(true);
      }
    };
    window.addEventListener("gg:open-panels", onOpenPanelsEvt);
    return () => window.removeEventListener("gg:open-panels", onOpenPanelsEvt);
  }, [setCCTab, setShowCC, fetchPysparkLatest]);

  // Auto-refresh when PySpark tab is visible
  useEffect(() => {
    if (showCC && ccTab === "pyspark") {
      fetchPysparkLatest();
    }
  }, [showCC, ccTab, fetchPysparkLatest]);

  const onRefresh = useCallback(() => fetchPysparkLatest(), [fetchPysparkLatest]);

  const onRerun = useCallback(
    async (script) => {
      const js = typeof script === "string" && script
        ? script
        : "scripts/pyspark_jobs/sample_verify_spark.py";
      try {
        const r = await fetch("/api/mcp/pyspark/run", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ script: js }),
        });
        await r.json().catch(() => ({}));
      } catch {}
      fetchPysparkLatest();
    },
    [fetchPysparkLatest],
  );

  const onPlannerRun = useCallback(async () => {
    try {
      const r = await fetch("/api/mcp/pyspark/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ script: "scripts/pyspark_jobs/sample_verify_spark.py" }),
      });
      await r.json().catch(() => ({}));
    } catch {}
    setCCTab("pyspark");
    setShowCC(true);
    fetchPysparkLatest();
  }, [setCCTab, setShowCC, fetchPysparkLatest]);

  return { pysparkData, onRefresh, onRerun, onPlannerRun };
}

