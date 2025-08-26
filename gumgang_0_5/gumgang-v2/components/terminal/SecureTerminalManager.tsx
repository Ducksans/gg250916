"use client";
import { useEffect, useRef } from "react";

export default function SecureTerminalManager() {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let term: import("xterm").Terminal | null = null;
    let fit: any | null = null;
    let cancelled = false;
    (async () => {
      const [{ Terminal }, { FitAddon }] = await Promise.all([
        import("xterm"),
        import("xterm-addon-fit"),
      ]);
      if (cancelled || !ref.current) return;
      term = new Terminal({ convertEol: true, fontFamily: "ui-monospace" });
      fit = new FitAddon();
      term.loadAddon(fit);
      term.open(ref.current);
      fit.fit();
      // WS PoC 승인 전: I/O 바인딩 생략(설계만)
    })();
    return () => {
      cancelled = true;
      try {
        (term as any)?.dispose?.();
      } catch {}
      try {
        (fit as any)?.dispose?.();
      } catch {}
    };
  }, []);
  return <div className="xterm-container" ref={ref} />;
}
