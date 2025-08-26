"use client";

import React, { useState, useCallback } from "react";
import { Layout } from "@arco-design/web-react";
import FileTree from "@/components/FileTree";
import AIEnhancedEditor, { EditorTab } from "@/components/AIEnhancedEditor";
import AIConsole from "@/components/AIConsole";

const Sider = Layout.Sider;
const Content = Layout.Content;
const Footer = Layout.Footer;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

// Panel의 구조를 정의합니다. 각 패널은 고유 ID와 탭 목록, 활성 탭을 가집니다.
type EditorPanel = {
  id: number;
  tabs: EditorTab[];
  activeTabPath?: string;
};

// 이곳이 다중 패널과 다중 우주를 지휘하는 최종 관제실입니다.
export default function ChatPage() {
  const [panels, setPanels] = useState<EditorPanel[]>([
    { id: Date.now(), tabs: [], activeTabPath: undefined },
  ]);
  const [activePanelId, setActivePanelId] = useState<number | null>(
    panels.length > 0 ? panels[0].id : null,
  );

  const handleFileSelect = useCallback(
    async (path: string) => {
      let targetPanelId = activePanelId;

      // 비동기 작업 전에 상태 업데이트를 보장하기 위해 함수형 업데이트를 사용합니다.
      setPanels((currentPanels) => {
        let panelsCopy = [...currentPanels];
        // 활성 패널이 없으면 (초기 상태), 첫번째 패널을 생성합니다.
        if (panelsCopy.length === 0) {
          const newPanelId = Date.now();
          const newPanel: EditorPanel = {
            id: newPanelId,
            tabs: [],
            activeTabPath: undefined,
          };
          setActivePanelId(newPanelId);
          targetPanelId = newPanelId;
          panelsCopy = [newPanel];
        } else if (targetPanelId === null) {
          targetPanelId = panelsCopy[0].id;
          setActivePanelId(targetPanelId);
        }

        const panelIndex = panelsCopy.findIndex((p) => p.id === targetPanelId);
        if (panelIndex === -1) return panelsCopy;

        const targetPanel = panelsCopy[panelIndex];

        // 이미 탭이 열려있으면 활성화만 합니다.
        if (targetPanel.tabs.some((tab) => tab.path === path)) {
          targetPanel.activeTabPath = path;
          return [...panelsCopy];
        }

        // 파일 내용을 가져오는 비동기 로직은 분리합니다.
        return panelsCopy;
      });

      // 새 탭을 엽니다.
      try {
        const res = await fetch(
          `${API_BASE}/api/files/read?path=${encodeURIComponent(path)}`,
        );
        if (!res.ok) throw new Error(`파일을 불러올 수 없습니다: ${path}`);
        const data = await res.json();
        const newTab: EditorTab = { path, content: data.content };

        setPanels((currentPanels) => {
          let targetPanelIdForUpdate = activePanelId;
          if (targetPanelIdForUpdate === null) {
            targetPanelIdForUpdate =
              currentPanels.length > 0 ? currentPanels[0].id : null;
          }
          if (targetPanelIdForUpdate === null) return currentPanels; // Should not happen

          return currentPanels.map((p) =>
            p.id === targetPanelIdForUpdate
              ? { ...p, tabs: [...p.tabs, newTab], activeTabPath: path }
              : p,
          );
        });
      } catch (error) {
        console.error(error);
      }
    },
    [activePanelId],
  );

  const handleSplit = useCallback((panelId: number) => {
    setPanels((currentPanels) => {
      const sourcePanelIndex = currentPanels.findIndex((p) => p.id === panelId);
      if (sourcePanelIndex === -1) return currentPanels;

      const sourcePanel = currentPanels[sourcePanelIndex];
      const activeTab = sourcePanel.tabs.find(
        (t) => t.path === sourcePanel.activeTabPath,
      );

      if (!activeTab || sourcePanel.tabs.length < 2) return currentPanels;

      const newPanel: EditorPanel = {
        id: Date.now(),
        tabs: [activeTab],
        activeTabPath: activeTab.path,
      };

      const updatedOldPanelTabs = sourcePanel.tabs.filter(
        (t) => t.path !== activeTab.path,
      );
      const newActiveTabForOldPanel =
        updatedOldPanelTabs.length > 0
          ? updatedOldPanelTabs[updatedOldPanelTabs.length - 1].path
          : undefined;

      const newPanels = [...currentPanels];
      newPanels[sourcePanelIndex] = {
        ...sourcePanel,
        tabs: updatedOldPanelTabs,
        activeTabPath: newActiveTabForOldPanel,
      };
      newPanels.splice(sourcePanelIndex + 1, 0, newPanel);

      setActivePanelId(newPanel.id);
      return newPanels;
    });
  }, []);

  const createPanelHandlers = (panelId: number) => ({
    onTabSelect: (path: string) => {
      setPanels((panels) =>
        panels.map((p) =>
          p.id === panelId ? { ...p, activeTabPath: path } : p,
        ),
      );
      setActivePanelId(panelId);
    },
    onTabClose: (path: string) => {
      setPanels((currentPanels) => {
        const panel = currentPanels.find((p) => p.id === panelId);
        if (!panel) return currentPanels;

        const newTabs = panel.tabs.filter((t) => t.path !== path);

        if (newTabs.length === 0 && currentPanels.length > 1) {
          const newPanels = currentPanels.filter((p) => p.id !== panelId);
          if (activePanelId === panelId) {
            setActivePanelId(newPanels.length > 0 ? newPanels[0].id : null);
          }
          return newPanels;
        }

        const newActivePath =
          panel.activeTabPath === path
            ? newTabs[newTabs.length - 1]?.path
            : panel.activeTabPath;
        return currentPanels.map((p) =>
          p.id === panelId
            ? { ...p, tabs: newTabs, activeTabPath: newActivePath }
            : p,
        );
      });
    },
    onContentChange: (path: string, content: string) => {
      setPanels((panels) =>
        panels.map((p) => {
          if (p.id !== panelId) return p;
          return {
            ...p,
            tabs: p.tabs.map((t) => (t.path === path ? { ...t, content } : t)),
          };
        }),
      );
    },
    onSplit: () => handleSplit(panelId),
  });

  const activePanel = panels.find((p) => p.id === activePanelId);
  const globalActiveFile = activePanel?.activeTabPath;

  return (
    <Layout className="h-full w-full bg-[var(--bg-deep-water)]">
      <Sider
        width={300}
        className="border-r border-[var(--border-default)]"
        style={{ backgroundColor: "var(--bg-panel)" }}
      >
        <div className="flex flex-col h-full">
          <div className="p-3 border-b border-[var(--border-default)] text-sm font-semibold h-[40px] flex-shrink-0 flex items-center">
            프로젝트 탐색
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileTree
              onSelect={handleFileSelect}
              activeFile={globalActiveFile}
            />
          </div>
        </div>
      </Sider>

      <Layout>
        <Content
          className="flex overflow-hidden"
          style={{ backgroundColor: "var(--bg-deep-water)" }}
        >
          {panels.map((panel, index) => (
            <React.Fragment key={panel.id}>
              <div
                className="flex-1 h-full overflow-hidden"
                onClick={() => setActivePanelId(panel.id)}
              >
                <AIEnhancedEditor
                  {...createPanelHandlers(panel.id)}
                  tabs={panel.tabs}
                  activeTabPath={panel.activeTabPath}
                />
              </div>
              {index < panels.length - 1 && (
                <div className="w-1.5 h-full bg-[var(--border-default)] cursor-col-resize hover:bg-[var(--accent-diamond)]/50" />
              )}
            </React.Fragment>
          ))}
          {panels.length === 0 && (
            <div className="h-full w-full flex flex-col items-center justify-center bg-[var(--bg-panel)] text-[var(--text-secondary)] select-none">
              <span className="text-4xl mb-4">{"<>"}</span>
              <h3 className="text-lg">열린 파일이 없습니다</h3>
              <p className="text-sm">
                탐색기에서 파일을 선택하여 여정을 시작하세요.
              </p>
            </div>
          )}
        </Content>
        <Footer
          className="h-[250px] border-t border-[var(--border-default)] p-0"
          style={{
            backgroundColor: "var(--bg-panel)",
            padding: 0,
            flexShrink: 0,
          }}
        >
          <AIConsole selectedFile={globalActiveFile} />
        </Footer>
      </Layout>
    </Layout>
  );
}
