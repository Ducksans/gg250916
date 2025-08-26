import React, { useState, useEffect, useRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { useTauriFileSystem } from '../hooks/useTauriFileSystem';
import {
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

interface MonacoEditorProps {
  initialPath?: string;
  height?: string;
  theme?: 'vs-dark' | 'vs' | 'hc-black';
  onSave?: (path: string, content: string) => void;
}

export function MonacoEditor({
  initialPath,
  height = '600px',
  theme = 'vs-dark',
  onSave
}: MonacoEditorProps) {
  const {
    readFile,
    writeFile,
    isLoading,
    error,
    clearError
  } = useTauriFileSystem();

  const [currentPath, setCurrentPath] = useState<string>(initialPath || '');
  const [content, setContent] = useState<string>('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [language, setLanguage] = useState<string>('plaintext');
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const editorRef = useRef<any>(null);

  // 파일 확장자에서 언어 감지
  const detectLanguage = (filePath: string): string => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rs': 'rust',
      'html': 'html',
      'css': 'css',
      'scss': 'scss',
      'json': 'json',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'toml': 'toml',
      'sh': 'shell',
      'bash': 'shell',
      'sql': 'sql',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'hpp': 'cpp',
      'java': 'java',
      'go': 'go',
      'rb': 'ruby',
      'php': 'php',
      'swift': 'swift',
      'kt': 'kotlin',
      'dart': 'dart',
      'r': 'r',
      'lua': 'lua',
      'vim': 'vim',
      'dockerfile': 'dockerfile'
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  // 파일 로드
  const loadFile = async (path: string) => {
    if (!path) return;

    clearError();
    const fileContent = await readFile(path);

    if (fileContent !== null) {
      setContent(fileContent);
      setOriginalContent(fileContent);
      setCurrentPath(path);
      setLanguage(detectLanguage(path));
      setIsDirty(false);
      setSaveStatus('idle');
    }
  };

  // 파일 저장
  const saveFile = async () => {
    if (!currentPath || !isDirty) return;

    setSaveStatus('saving');
    const success = await writeFile(currentPath, content);

    if (success) {
      setOriginalContent(content);
      setIsDirty(false);
      setSaveStatus('saved');
      onSave?.(currentPath, content);

      // 3초 후 상태 초기화
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } else {
      setSaveStatus('error');
    }
  };

  // 새로고침
  const reloadFile = async () => {
    if (currentPath) {
      await loadFile(currentPath);
    }
  };

  // 초기 파일 로드
  useEffect(() => {
    if (initialPath) {
      loadFile(initialPath);
    }
  }, [initialPath]);

  // 에디터 마운트 핸들러
  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;

    // 저장 단축키 등록 (Ctrl+S / Cmd+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveFile();
    });

    // 에디터 옵션 설정
    editor.updateOptions({
      minimap: { enabled: true },
      fontSize: 14,
      wordWrap: 'on',
      automaticLayout: true,
      formatOnPaste: true,
      formatOnType: true
    });
  };

  // 내용 변경 핸들러
  const handleEditorChange = (value: string | undefined) => {
    const newContent = value || '';
    setContent(newContent);
    setIsDirty(newContent !== originalContent);
  };

  // 파일 경로 변경
  const handlePathChange = (newPath: string) => {
    setCurrentPath(newPath);
    if (newPath) {
      loadFile(newPath);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* 툴바 */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* 파일 경로 입력 */}
            <DocumentTextIcon className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={currentPath}
              onChange={(e) => handlePathChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadFile(currentPath)}
              placeholder="파일 경로를 입력하세요..."
              className="bg-gray-700 text-gray-200 px-3 py-1 rounded text-sm w-96 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-500">
              언어: {language}
            </span>
            {isDirty && (
              <span className="text-xs text-yellow-400">● 수정됨</span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {/* 상태 표시 */}
            {saveStatus === 'saved' && (
              <div className="flex items-center text-green-400 text-sm">
                <CheckCircleIcon className="w-4 h-4 mr-1" />
                저장됨
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center text-red-400 text-sm">
                <ExclamationCircleIcon className="w-4 h-4 mr-1" />
                저장 실패
              </div>
            )}

            {/* 액션 버튼 */}
            <button
              onClick={reloadFile}
              disabled={!currentPath || isLoading}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
              title="새로고침 (파일 다시 로드)"
            >
              <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={saveFile}
              disabled={!currentPath || !isDirty || saveStatus === 'saving'}
              className="flex items-center px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="저장 (Ctrl+S)"
            >
              <ArrowDownTrayIcon className="w-4 h-4 mr-1" />
              {saveStatus === 'saving' ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>

        {/* 에러 표시 */}
        {error && (
          <div className="mt-2 p-2 bg-red-900/50 border border-red-700 rounded text-sm text-red-300">
            {error.message}
            <button
              onClick={clearError}
              className="ml-2 text-red-400 hover:text-red-300"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        <Editor
          height={height}
          language={language}
          theme={theme}
          value={content}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          options={{
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: 'line',
            automaticLayout: true,
            glyphMargin: true,
            folding: true,
            lineNumbersMinChars: 3,
            fontSize: 14,
            scrollBeyondLastLine: false,
            minimap: {
              enabled: true
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            tabSize: 2,
            wordWrap: 'on'
          }}
          loading={
            <div className="flex items-center justify-center h-full text-gray-400">
              <ArrowPathIcon className="w-8 h-8 animate-spin" />
            </div>
          }
        />
      </div>

      {/* 하단 상태바 */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-1 text-xs text-gray-400 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <span>Protocol Guard v2.0</span>
          <span>Task: GG-20250108-007</span>
        </div>
        <div className="flex items-center space-x-4">
          <span>Tauri + Monaco</span>
          <span>포트: 8001</span>
          <span>{currentPath ? `경로: ${currentPath}` : '파일 없음'}</span>
        </div>
      </div>
    </div>
  );
}

export default MonacoEditor;
