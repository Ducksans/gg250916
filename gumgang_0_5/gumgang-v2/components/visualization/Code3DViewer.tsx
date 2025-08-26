"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Code3DVisualizationEngine,
  CodeNode,
  VisualizationConfig,
} from "../../services/Code3DVisualizationEngine";
import {
  CodeStructureAnalyzer,
  FileContent,
  AnalysisResult,
  ProjectMetrics,
  CodeSmell,
  getCodeStructureAnalyzer,
} from "../../services/CodeStructureAnalyzer";
import {
  BoxIcon,
  ActivityIcon,
  AlertTriangleIcon,
  EyeIcon,
  EyeOffIcon,
  MaximizeIcon,
  MinimizeIcon,
  SettingsIcon,
  CameraIcon,
  CodeIcon,
  FileIcon,
  FunctionSquareIcon,
  PackageIcon,
  VariableIcon,
  ImportIcon,
  ShareIcon,
  InfoIcon,
  // ChevronRightIcon, // Removed: unused import
  // ChevronDownIcon, // Removed: unused import
  SearchIcon,
  FilterIcon,
  // ZoomInIcon, // Removed: unused import
  // ZoomOutIcon, // Removed: unused import
  // RotateCwIcon, // Removed: unused import
  DownloadIcon,
  UploadIcon,
} from "lucide-react";

interface Code3DViewerProps {
  files?: FileContent[];
  height?: string;
  className?: string;
  onNodeSelect?: (node: CodeNode) => void;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

interface ViewSettings {
  theme: "dark" | "light" | "matrix" | "galaxy";
  showLabels: boolean;
  showGrid: boolean;
  showParticles: boolean;
  autoRotate: boolean;
  physics: boolean;
  animationSpeed: number;
}

interface NodeTypeVisibility {
  file: boolean;
  function: boolean;
  class: boolean;
  variable: boolean;
  import: boolean;
  export: boolean;
  module: boolean;
}

interface MetricsPanelData {
  totalNodes: number;
  totalEdges: number;
  metrics: ProjectMetrics | null;
  selectedNode: CodeNode | null;
  hoveredNode: CodeNode | null;
}

export const Code3DViewer: React.FC<Code3DViewerProps> = ({
  files = [],
  height = "800px",
  className = "",
  onNodeSelect,
  onAnalysisComplete,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Code3DVisualizationEngine | null>(null);
  const analyzerRef = useRef<CodeStructureAnalyzer | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isMetricsOpen] = useState(false); // Removed unused setter
  const [searchQuery, setSearchQuery] = useState("");
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    theme: "galaxy",
    showLabels: true,
    showGrid: false,
    showParticles: true,
    autoRotate: false,
    physics: true,
    animationSpeed: 1.0,
  });
  const [nodeVisibility, setNodeVisibility] = useState<NodeTypeVisibility>({
    file: true,
    function: true,
    class: true,
    variable: true,
    import: true,
    export: true,
    module: true,
  });
  const [metricsData, setMetricsData] = useState<MetricsPanelData>({
    totalNodes: 0,
    totalEdges: 0,
    metrics: null,
    selectedNode: null,
    hoveredNode: null,
  });
  const [codeSmells, setCodeSmells] = useState<CodeSmell[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(
    null,
  );

  // Initialize 3D engine
  useEffect(() => {
    if (!containerRef.current) return;

    const config: VisualizationConfig = {
      container: containerRef.current,
      theme: viewSettings.theme,
      physics: viewSettings.physics,
      animationSpeed: viewSettings.animationSpeed,
      particleEffects: viewSettings.showParticles,
      showLabels: viewSettings.showLabels,
      showGrid: viewSettings.showGrid,
      autoRotate: viewSettings.autoRotate,
    };

    engineRef.current = new Code3DVisualizationEngine(config);
    analyzerRef.current = getCodeStructureAnalyzer();

    // Set up event listeners
    engineRef.current.on("node:select", handleNodeSelect);
    engineRef.current.on("node:hover", handleNodeHover);
    engineRef.current.on("node:unhover", handleNodeUnhover);

    // Load initial files if provided
    if (files.length > 0) {
      analyzeAndVisualize(files);
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.dispose();
      }
    };
  }, []);

  // Update view settings
  useEffect(() => {
    if (!engineRef.current) return;

    engineRef.current.updateSettings({
      theme: viewSettings.theme,
      showLabels: viewSettings.showLabels,
      showGrid: viewSettings.showGrid,
      particleEffects: viewSettings.showParticles,
      autoRotate: viewSettings.autoRotate,
      physics: viewSettings.physics,
      animationSpeed: viewSettings.animationSpeed,
    });
  }, [viewSettings]);

  // Analyze and visualize code
  const analyzeAndVisualize = async (filesToAnalyze: FileContent[]) => {
    if (!analyzerRef.current || !engineRef.current) return;

    setIsLoading(true);

    try {
      const result = await analyzerRef.current.analyzeProject(filesToAnalyze);
      setAnalysisResult(result);

      // Clear existing visualization
      engineRef.current.clear();

      // Filter nodes based on visibility settings
      const visibleNodes = result.nodes.filter(
        (node) => nodeVisibility[node.type as keyof NodeTypeVisibility],
      );

      // Add nodes to 3D scene
      visibleNodes.forEach((node) => {
        engineRef.current!.addNode(node);
      });

      // Add edges
      result.edges.forEach((edge) => {
        // Only add edge if both nodes are visible
        const sourceVisible = visibleNodes.some((n) => n.id === edge.source);
        const targetVisible = visibleNodes.some((n) => n.id === edge.target);
        if (sourceVisible && targetVisible) {
          engineRef.current!.addEdge(edge);
        }
      });

      // Update metrics
      setMetricsData((prev) => ({
        ...prev,
        totalNodes: visibleNodes.length,
        totalEdges: result.edges.length,
        metrics: result.metrics,
      }));

      setCodeSmells(result.metrics.codeSmells);

      if (onAnalysisComplete) {
        onAnalysisComplete(result);
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Event handlers
  const handleNodeSelect = (node: CodeNode) => {
    setMetricsData((prev) => ({ ...prev, selectedNode: node }));
    if (onNodeSelect) {
      onNodeSelect(node);
    }
  };

  const handleNodeHover = (node: CodeNode) => {
    setMetricsData((prev) => ({ ...prev, hoveredNode: node }));
  };

  const handleNodeUnhover = () => {
    setMetricsData((prev) => ({ ...prev, hoveredNode: null }));
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    const fileContents: FileContent[] = [];
    const filePromises: Promise<void>[] = [];

    Array.from(uploadedFiles).forEach((file) => {
      const promise = new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const extension = file.name.split(".").pop() || "";
          const language = getLanguageFromExtension(extension);

          fileContents.push({
            path: file.name,
            content,
            language,
          });
          resolve();
        };
        reader.readAsText(file);
      });
      filePromises.push(promise);
    });

    Promise.all(filePromises).then(() => {
      analyzeAndVisualize(fileContents);
    });
  };

  const getLanguageFromExtension = (ext: string): string => {
    const map: Record<string, string> = {
      ts: "typescript",
      tsx: "typescript",
      js: "javascript",
      jsx: "javascript",
      py: "python",
      java: "java",
      cpp: "cpp",
      cs: "csharp",
      go: "go",
      rs: "rust",
    };
    return map[ext] || "javascript";
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!engineRef.current || !analysisResult) return;

    const matchingNodes = analysisResult.nodes.filter((node) =>
      node.name.toLowerCase().includes(query.toLowerCase()),
    );

    if (matchingNodes.length > 0) {
      engineRef.current.focusOnNode(matchingNodes[0].id);
    }
  };

  const handleReset = () => {
    if (engineRef.current) {
      engineRef.current.resetCamera();
    }
  };

  const handleExport = () => {
    if (!analysisResult) return;

    const dataStr = JSON.stringify(analysisResult, null, 2);
    const dataUri =
      "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

    const exportFileDefaultName = "code-analysis.json";
    const linkElement = document.createElement("a");
    linkElement.setAttribute("href", dataUri);
    linkElement.setAttribute("download", exportFileDefaultName);
    linkElement.click();
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };

  const getNodeIcon = (type: string) => {
    switch (type) {
      case "file":
        return <FileIcon className="w-4 h-4" />;
      case "function":
        return <FunctionSquareIcon className="w-4 h-4" />;
      case "class":
        return <BoxIcon className="w-4 h-4" />;
      case "variable":
        return <VariableIcon className="w-4 h-4" />;
      case "import":
        return <ImportIcon className="w-4 h-4" />;
      case "export":
        return <ShareIcon className="w-4 h-4" />;
      case "module":
        return <PackageIcon className="w-4 h-4" />;
      default:
        return <CodeIcon className="w-4 h-4" />;
    }
  };

  const getSmellSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "text-red-500";
      case "high":
        return "text-orange-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-blue-500";
      default:
        return "text-gray-500";
    }
  };

  return (
    <div
      className={`relative bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 rounded-lg overflow-hidden ${className}`}
      style={{ height }}
    >
      {/* Header Controls */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-slate-900/90 backdrop-blur-sm border-b border-slate-800">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <BoxIcon className="w-5 h-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">
                3D Code Visualization
              </h2>
              {metricsData.totalNodes > 0 && (
                <span className="px-2 py-1 text-xs bg-purple-600/20 text-purple-400 rounded-full">
                  {metricsData.totalNodes} nodes • {metricsData.totalEdges}{" "}
                  edges
                </span>
              )}
            </div>

            {/* Search */}
            <div className="relative">
              <SearchIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search nodes..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 pr-4 py-1 bg-slate-800 text-white text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Upload Files */}
            <label className="p-2 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors">
              <UploadIcon className="w-4 h-4 text-slate-400" />
              <input
                type="file"
                multiple
                accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.cs,.go,.rs"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>

            {/* Export */}
            <button
              onClick={handleExport}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Export Analysis"
            >
              <DownloadIcon className="w-4 h-4 text-slate-400" />
            </button>

            {/* Reset Camera */}
            <button
              onClick={handleReset}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
              title="Reset Camera"
            >
              <CameraIcon className="w-4 h-4 text-slate-400" />
            </button>

            {/* Toggle Panel */}
            <button
              onClick={() => setIsPanelOpen(!isPanelOpen)}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isPanelOpen ? (
                <EyeOffIcon className="w-4 h-4 text-slate-400" />
              ) : (
                <EyeIcon className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            >
              {isFullscreen ? (
                <MinimizeIcon className="w-4 h-4 text-slate-400" />
              ) : (
                <MaximizeIcon className="w-4 h-4 text-slate-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3D Visualization Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Side Panel */}
      {isPanelOpen && (
        <div className="absolute top-16 right-4 w-80 max-h-[calc(100%-5rem)] bg-slate-900/95 backdrop-blur-sm rounded-lg border border-slate-800 overflow-hidden">
          {/* View Settings */}
          <div className="border-b border-slate-800 p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-white flex items-center space-x-2">
                <SettingsIcon className="w-4 h-4" />
                <span>View Settings</span>
              </h3>
            </div>

            <div className="space-y-3">
              {/* Theme */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Theme
                </label>
                <select
                  value={viewSettings.theme}
                  onChange={(e) =>
                    setViewSettings((prev) => ({
                      ...prev,
                      theme: e.target.value as any,
                    }))
                  }
                  className="w-full px-2 py-1 bg-slate-800 text-white text-sm rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="matrix">Matrix</option>
                  <option value="galaxy">Galaxy</option>
                </select>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewSettings.showLabels}
                    onChange={(e) =>
                      setViewSettings((prev) => ({
                        ...prev,
                        showLabels: e.target.checked,
                      }))
                    }
                    className="rounded text-purple-500 focus:ring-purple-500"
                  />
                  <span>Labels</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewSettings.showGrid}
                    onChange={(e) =>
                      setViewSettings((prev) => ({
                        ...prev,
                        showGrid: e.target.checked,
                      }))
                    }
                    className="rounded text-purple-500 focus:ring-purple-500"
                  />
                  <span>Grid</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewSettings.showParticles}
                    onChange={(e) =>
                      setViewSettings((prev) => ({
                        ...prev,
                        showParticles: e.target.checked,
                      }))
                    }
                    className="rounded text-purple-500 focus:ring-purple-500"
                  />
                  <span>Particles</span>
                </label>
                <label className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={viewSettings.autoRotate}
                    onChange={(e) =>
                      setViewSettings((prev) => ({
                        ...prev,
                        autoRotate: e.target.checked,
                      }))
                    }
                    className="rounded text-purple-500 focus:ring-purple-500"
                  />
                  <span>Auto Rotate</span>
                </label>
              </div>

              {/* Animation Speed */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Animation Speed: {viewSettings.animationSpeed.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="2"
                  step="0.1"
                  value={viewSettings.animationSpeed}
                  onChange={(e) =>
                    setViewSettings((prev) => ({
                      ...prev,
                      animationSpeed: parseFloat(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Node Type Filters */}
          <div className="border-b border-slate-800 p-4">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
              <FilterIcon className="w-4 h-4" />
              <span>Node Types</span>
            </h3>
            <div className="space-y-2">
              {Object.entries(nodeVisibility).map(([type, visible]) => (
                <label
                  key={type}
                  className="flex items-center space-x-2 text-xs text-slate-400 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={visible}
                    onChange={(e) =>
                      setNodeVisibility((prev) => ({
                        ...prev,
                        [type]: e.target.checked,
                      }))
                    }
                    className="rounded text-purple-500 focus:ring-purple-500"
                  />
                  {getNodeIcon(type)}
                  <span className="capitalize">{type}s</span>
                </label>
              ))}
            </div>
          </div>

          {/* Metrics */}
          {isMetricsOpen && metricsData.metrics && (
            <div className="border-b border-slate-800 p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                <ActivityIcon className="w-4 h-4" />
                <span>Metrics</span>
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500">Files</span>
                  <p className="text-white font-semibold">
                    {metricsData.metrics.totalFiles}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Functions</span>
                  <p className="text-white font-semibold">
                    {metricsData.metrics.totalFunctions}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Classes</span>
                  <p className="text-white font-semibold">
                    {metricsData.metrics.totalClasses}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Lines</span>
                  <p className="text-white font-semibold">
                    {metricsData.metrics.totalLines}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Avg Complexity</span>
                  <p className="text-white font-semibold">
                    {metricsData.metrics.avgComplexity.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500">Dependencies</span>
                  <p className="text-white font-semibold">
                    {metricsData.metrics.dependencies}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Selected Node Info */}
          {metricsData.selectedNode && (
            <div className="border-b border-slate-800 p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                <InfoIcon className="w-4 h-4" />
                <span>Selected Node</span>
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex items-center space-x-2">
                  {getNodeIcon(metricsData.selectedNode.type)}
                  <span className="text-white font-medium">
                    {metricsData.selectedNode.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Type: </span>
                  <span className="text-slate-300">
                    {metricsData.selectedNode.type}
                  </span>
                </div>
                {metricsData.selectedNode.complexity !== undefined && (
                  <div>
                    <span className="text-slate-500">Complexity: </span>
                    <span className="text-slate-300">
                      {metricsData.selectedNode.complexity}
                    </span>
                  </div>
                )}
                {metricsData.selectedNode.metadata && (
                  <div className="mt-2">
                    <span className="text-slate-500">Metadata:</span>
                    <pre className="mt-1 p-2 bg-slate-800 rounded text-slate-300 overflow-x-auto">
                      {JSON.stringify(
                        metricsData.selectedNode.metadata,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Code Smells */}
          {codeSmells.length > 0 && (
            <div className="p-4">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                <AlertTriangleIcon className="w-4 h-4 text-yellow-500" />
                <span>Code Smells ({codeSmells.length})</span>
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {codeSmells.map((smell, index) => (
                  <div key={index} className="p-2 bg-slate-800 rounded text-xs">
                    <div className="flex items-center space-x-2 mb-1">
                      <span
                        className={`font-semibold ${getSmellSeverityColor(smell.severity)}`}
                      >
                        {smell.severity.toUpperCase()}
                      </span>
                      <span className="text-slate-400">{smell.type}</span>
                    </div>
                    <p className="text-slate-300">{smell.message}</p>
                    <p className="text-slate-500 mt-1">{smell.location}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-30">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg font-semibold">
              Analyzing Code Structure...
            </p>
            <p className="text-slate-400 text-sm mt-2">
              Building 3D visualization
            </p>
          </div>
        </div>
      )}

      {/* Instructions Overlay */}
      {metricsData.totalNodes === 0 && !isLoading && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center p-8 bg-slate-900/50 rounded-lg">
            <BoxIcon className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">
              No Code Loaded
            </h3>
            <p className="text-slate-400 mb-4">
              Upload code files to visualize their structure in 3D
            </p>
            <label className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg cursor-pointer transition-colors inline-block">
              <UploadIcon className="w-4 h-4 inline mr-2" />
              Upload Files
              <input
                type="file"
                multiple
                accept=".js,.jsx,.ts,.tsx,.py,.java,.cpp,.cs,.go,.rs"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
        </div>
      )}

      {/* Controls Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-900/90 backdrop-blur-sm rounded-lg p-3 text-xs text-slate-400">
        <div className="space-y-1">
          <div>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded">Left Click</kbd>{" "}
            Rotate
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded">Right Click</kbd>{" "}
            Pan
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded">Scroll</kbd> Zoom
          </div>
          <div>
            <kbd className="px-1 py-0.5 bg-slate-800 rounded">Double Click</kbd>{" "}
            Focus
          </div>
        </div>
      </div>
    </div>
  );
};

export default Code3DViewer;
