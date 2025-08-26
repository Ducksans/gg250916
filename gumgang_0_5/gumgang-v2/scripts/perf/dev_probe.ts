// Development Performance Probe
// Only active in development mode, no external dependencies

interface PerfMetrics {
  marks: Map<string, number>;
  measures: Map<string, { duration: number; count: number }>;
  memorySnapshots: Array<{ timestamp: number; used: number; total: number }>;
  renderTimeline: Array<{
    timestamp: number;
    phase: string;
    duration?: number;
  }>;
}

class DevPerformanceProbe {
  private metrics: PerfMetrics = {
    marks: new Map(),
    measures: new Map(),
    memorySnapshots: [],
    renderTimeline: [],
  };

  private memoryInterval?: NodeJS.Timeout;
  private gcObserver?: PerformanceObserver;
  private startTime = performance.now();

  constructor() {
    console.log("[DevProbe] Initializing performance monitoring...");
    // Standard markers for release check
    this.mark("boot");
    this.setupMemoryMonitoring();
    this.setupGCMonitoring();
    this.setupRenderMonitoring();
    this.installGlobalHooks();
    // Mark editor ready when probe is fully initialized
    setTimeout(() => this.mark("editorReady"), 100);
  }

  private setupMemoryMonitoring(): void {
    if (typeof (performance as any).memory !== "undefined") {
      this.memoryInterval = setInterval(() => {
        const mem = (performance as any).memory;
        this.metrics.memorySnapshots.push({
          timestamp: performance.now(),
          used: mem.usedJSHeapSize,
          total: mem.totalJSHeapSize,
        });

        // Keep only last 100 snapshots
        if (this.metrics.memorySnapshots.length > 100) {
          this.metrics.memorySnapshots.shift();
        }
      }, 5000); // Every 5 seconds
    }
  }

  private setupGCMonitoring(): void {
    if (typeof PerformanceObserver !== "undefined") {
      try {
        this.gcObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (
              entry.entryType === "measure" ||
              entry.entryType === "navigation"
            ) {
              console.log(
                `[DevProbe] GC Event: ${entry.name} (${entry.duration.toFixed(2)}ms)`,
              );
            }
          }
        });
        this.gcObserver.observe({ entryTypes: ["measure", "navigation"] });
      } catch (e) {
        // GC monitoring not available
      }
    }
  }

  private setupRenderMonitoring(): void {
    // Hook into React render cycle if available
    if (typeof window !== "undefined" && (window as any).React) {
      const originalCreateElement = (window as any).React.createElement;
      let renderCount = 0;
      let firstRenderMarked = false;

      (window as any).React.createElement = function (...args: any[]) {
        const start = performance.now();
        const result = originalCreateElement.apply(this, args);
        const duration = performance.now() - start;

        // Mark first render
        if (!firstRenderMarked && renderCount === 0) {
          performance.mark("firstRender");
          firstRenderMarked = true;
        }

        if (duration > 16) {
          // Log slow renders (>16ms)
          console.warn(
            `[DevProbe] Slow render detected: ${duration.toFixed(2)}ms`,
          );
        }

        if (++renderCount % 100 === 0) {
          console.log(`[DevProbe] Render count: ${renderCount}`);
        }

        return result;
      };
    }
  }

  private installGlobalHooks(): void {
    // Expose global performance utilities
    if (typeof window !== "undefined") {
      (window as any).__devProbe = {
        mark: (name: string) => this.mark(name),
        measure: (name: string, startMark?: string, endMark?: string) =>
          this.measure(name, startMark, endMark),
        getMetrics: () => this.getMetrics(),
        reset: () => this.reset(),
        report: () => this.generateReport(),
      };

      // Auto-report on page unload
      window.addEventListener("beforeunload", () => {
        this.generateReport();
      });

      // Report on demand with Ctrl+Shift+P
      window.addEventListener("keydown", (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === "P") {
          e.preventDefault();
          this.generateReport();
        }
      });
    }
  }

  public mark(name: string): void {
    const timestamp = performance.now();
    this.metrics.marks.set(name, timestamp);
    performance.mark(name);
  }

  public measure(name: string, startMark?: string, endMark?: string): void {
    try {
      if (startMark && endMark) {
        performance.measure(name, startMark, endMark);
      } else if (startMark) {
        performance.measure(name, startMark);
      } else {
        performance.measure(name);
      }

      const entries = performance.getEntriesByName(name, "measure");
      if (entries.length > 0) {
        const entry = entries[entries.length - 1];
        const existing = this.metrics.measures.get(name) || {
          duration: 0,
          count: 0,
        };
        this.metrics.measures.set(name, {
          duration: existing.duration + entry.duration,
          count: existing.count + 1,
        });
      }
    } catch (e) {
      console.error(`[DevProbe] Failed to measure ${name}:`, e);
    }
  }

  public getMetrics(): PerfMetrics {
    return {
      marks: new Map(this.metrics.marks),
      measures: new Map(this.metrics.measures),
      memorySnapshots: [...this.metrics.memorySnapshots],
      renderTimeline: [...this.metrics.renderTimeline],
    };
  }

  public reset(): void {
    this.metrics.marks.clear();
    this.metrics.measures.clear();
    this.metrics.memorySnapshots = [];
    this.metrics.renderTimeline = [];
    performance.clearMarks();
    performance.clearMeasures();
  }

  public generateReport(): void {
    const runtime = ((performance.now() - this.startTime) / 1000).toFixed(2);

    console.group(`[DevProbe] Performance Report (Runtime: ${runtime}s)`);

    // Marks
    if (this.metrics.marks.size > 0) {
      console.group("📍 Performance Marks");
      // Highlight standard markers
      const standardMarkers = ["boot", "editorReady", "firstRender"];
      this.metrics.marks.forEach((timestamp, name) => {
        const isStandard = standardMarkers.includes(name);
        console.log(
          `${isStandard ? "⭐ " : ""}${name}: ${timestamp.toFixed(2)}ms`,
        );
      });
      console.groupEnd();
    }

    // Measures
    if (this.metrics.measures.size > 0) {
      console.group("📏 Performance Measures");
      this.metrics.measures.forEach((data, name) => {
        const avg = data.duration / data.count;
        console.log(
          `${name}: ${avg.toFixed(2)}ms avg (${data.count} calls, ${data.duration.toFixed(2)}ms total)`,
        );
      });
      console.groupEnd();
    }

    // Memory
    if (this.metrics.memorySnapshots.length > 0) {
      const latest =
        this.metrics.memorySnapshots[this.metrics.memorySnapshots.length - 1];
      const oldest = this.metrics.memorySnapshots[0];
      const memGrowth = ((latest.used - oldest.used) / 1024 / 1024).toFixed(2);

      console.group("💾 Memory Usage");
      console.log(
        `Current: ${(latest.used / 1024 / 1024).toFixed(2)} MB / ${(latest.total / 1024 / 1024).toFixed(2)} MB`,
      );
      console.log(
        `Growth: ${memGrowth} MB over ${this.metrics.memorySnapshots.length} samples`,
      );
      console.groupEnd();
    }

    // Navigation timing
    if (
      typeof window !== "undefined" &&
      window.performance &&
      window.performance.timing
    ) {
      const timing = window.performance.timing;
      const loadTime = timing.loadEventEnd - timing.navigationStart;
      const domReady = timing.domContentLoadedEventEnd - timing.navigationStart;

      console.group("⏱️ Page Load Timing");
      console.log(`DOM Ready: ${domReady}ms`);
      console.log(`Page Load: ${loadTime}ms`);
      console.groupEnd();
    }

    console.groupEnd();
  }

  public destroy(): void {
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }
    if (this.gcObserver) {
      this.gcObserver.disconnect();
    }
    this.reset();
  }
}

// Auto-initialize in development mode
if (typeof window !== "undefined") {
  new DevPerformanceProbe();
  console.log(
    "[DevProbe] Ready! Press Ctrl+Shift+P for report, or use window.__devProbe",
  );
}

export default DevPerformanceProbe;
