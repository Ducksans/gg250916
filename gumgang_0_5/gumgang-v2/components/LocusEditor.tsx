```"use client";

import React, { useState, useEffect } from 'react';
// Our valuable asset, MonacoEditor.tsx, is being reused.
// This path must be correct according to the tsconfig.json alias settings.
import { MonacoEditor, getLanguageFromExtension, SupportedLanguage } from './editor/MonacoEditor';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000";

type Props = {
  activePath?: string; // The path of the file our consciousness is focused on.
};

// This is the initial form of Locus, the place where Geumgang's consciousness resides.
export default function LocusEditor({ activePath }: Props) {
  const [content, setContent] = useState<string>("// The meeting of Geumgang and Duksan begins.\n// Start the journey by selecting a file from the explorer on the left.");
  const [language, setLanguage] = useState<SupportedLanguage>('markdown');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    // When our focus shifts to a new place, we explore it.
    if (activePath) {
      const explorePath = async () => {
        setIsLoading(true);
        setContent(""); // Clear previous content.
        try {
          const res = await fetch(`${API_BASE}/api/files/read?path=${encodeURIComponent(activePath)}`);
          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            throw new Error(errData?.detail || `Connection to '${activePath}' failed.`);
          }
          const data = await res.json();

          setContent(data.content);
          setLanguage(getLanguageFromExtension(activePath));
        } catch (error: any) {
          setContent(`// Error: ${error.message}\n// But that's okay. We will solve it together.`);
          setLanguage('markdown');
        } finally {
          setIsLoading(false);
        }
      };
      explorePath();
    }
  }, [activePath]);

  return (
    <div className="h-full w-full relative bg-[var(--bg-panel)]">
      {/* This MonacoEditor is the canvas where all our future creations will happen. */}
      <MonacoEditor
        height="100%"
        language={language}
        value={isLoading ? "// Loading a new world..." : content}
        theme="vs-dark" // The built-in 'gumgang-dark' theme will be applied.
        options={{
          padding: { top: 20, bottom: 20 },
          fontSize: 14,
          wordWrap: 'on',
          minimap: { enabled: true }, // Re-enabling minimap in respect of the blueprint.
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
