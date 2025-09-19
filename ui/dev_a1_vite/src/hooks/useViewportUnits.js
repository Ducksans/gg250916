import { useEffect } from "react";

/**
 * useViewportUnits — publishes a stable CSS var --gg-vh that equals window.innerHeight in px.
 * This fixes WebKitGTK/Tauri glitches with 100vh/100dvh during window resize.
 */
export default function useViewportUnits({ varName = "--gg-vh" } = {}) {
  useEffect(() => {
    const set = () => {
      try {
        const vh = window.innerHeight;
        document.documentElement.style.setProperty(varName, `${vh}px`);
      } catch {
        /* noop */
      }
    };
    set();
    // Resize and visual viewport listeners for dynamic chrome
    window.addEventListener("resize", set);
    const vv = window.visualViewport;
    if (vv && typeof vv.addEventListener === "function") {
      vv.addEventListener("resize", set);
    }
    return () => {
      window.removeEventListener("resize", set);
      if (vv && typeof vv.removeEventListener === "function") vv.removeEventListener("resize", set);
    };
  }, [varName]);
}

