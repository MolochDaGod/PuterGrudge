import { useEffect, useRef, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Save, Play, Copy, Undo, Redo, Search, Settings, AlertCircle } from 'lucide-react';
import { useOperationsBus } from '@/stores/operationsBus';

interface VSCodeShellProps {
  filePath?: string;
  initialContent?: string;
  language?: string;
  readOnly?: boolean;
}

declare const monaco: any;

export function VSCodeShell({ 
  filePath = '/welcome.md', 
  initialContent = '',
  language,
  readOnly = false 
}: VSCodeShellProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const monacoEditorRef = useRef<any>(null);
  const [content, setContent] = useState(initialContent);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const { addOperation, setProgress, completeOperation, failOperation, appendLog } = useOperationsBus();
  
  const detectLanguage = useCallback((path: string): string => {
    if (language) return language;
    const ext = path.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'rb': 'ruby',
      'rs': 'rust',
      'go': 'go',
      'java': 'java',
      'cpp': 'cpp',
      'c': 'c',
      'h': 'c',
      'css': 'css',
      'scss': 'scss',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'yaml': 'yaml',
      'yml': 'yaml',
      'xml': 'xml',
      'sql': 'sql',
      'sh': 'shell',
      'bash': 'shell',
      'lua': 'lua',
    };
    return langMap[ext] || 'plaintext';
  }, [language]);
  
  const loadFile = useCallback(async () => {
    if (!(window as any).puter) {
      setContent(`# Welcome to GrudgeOS Studio

This is your AI-powered development environment.

## Quick Start

1. **Create files** - Use the file explorer or create new tabs
2. **AI Assistant** - Open an AI tab to get help with code
3. **Terminal** - Run commands directly in the browser
4. **Deploy** - One-click deployment to Puter hosting

## Puter AI Ready

Access 500+ AI models through Puter:
\`\`\`javascript
const response = await puter.ai.chat('Hello!');
console.log(response);
\`\`\`

Start coding and let AI help you build!
`);
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      const puter = (window as any).puter;
      const fileContent = await puter.fs.read(filePath);
      const text = typeof fileContent === 'string' ? fileContent : await fileContent.text();
      setContent(text);
      setIsDirty(false);
    } catch (err: any) {
      if (err.message?.includes('not found') || err.code === 'ENOENT') {
        setContent('');
      } else {
        setError(err.message || 'Failed to load file');
      }
    } finally {
      setIsLoading(false);
    }
  }, [filePath]);
  
  const saveFile = useCallback(async () => {
    if (!(window as any).puter || readOnly) return;
    
    const opId = addOperation({
      name: `Save ${filePath}`,
      description: `Saving file to Puter filesystem`,
      category: 'sync',
    });
    
    try {
      setIsSaving(true);
      setProgress(opId, 30);
      appendLog(opId, `Writing to ${filePath}...`);
      
      const currentContent = monacoEditorRef.current?.getValue() || content;
      const puter = (window as any).puter;
      await puter.fs.write(filePath, currentContent);
      
      setProgress(opId, 100);
      setIsDirty(false);
      completeOperation(opId, 'File saved successfully');
    } catch (err: any) {
      failOperation(opId, err.message || 'Save failed');
      setError(err.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  }, [filePath, content, readOnly, addOperation, setProgress, completeOperation, failOperation, appendLog]);
  
  useEffect(() => {
    loadFile();
  }, [loadFile]);
  
  useEffect(() => {
    if (!editorRef.current || isLoading) return;
    
    const loadMonaco = async () => {
      if (!(window as any).monaco) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/monaco-editor@0.45.0/min/vs/loader.js';
        script.onload = () => {
          (window as any).require.config({
            paths: { vs: 'https://unpkg.com/monaco-editor@0.45.0/min/vs' }
          });
          (window as any).require(['vs/editor/editor.main'], () => {
            initEditor();
          });
        };
        document.head.appendChild(script);
      } else {
        initEditor();
      }
    };
    
    const initEditor = () => {
      if (!editorRef.current || monacoEditorRef.current) return;
      
      const monacoLib = (window as any).monaco;
      const editor = monacoLib.editor.create(editorRef.current, {
        value: content,
        language: detectLanguage(filePath),
        theme: 'vs-dark',
        minimap: { enabled: true },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
        lineNumbers: 'on',
        wordWrap: 'on',
        automaticLayout: true,
        readOnly,
        scrollBeyondLastLine: false,
        padding: { top: 10 },
      });
      
      monacoEditorRef.current = editor;
      
      editor.onDidChangeModelContent(() => {
        setIsDirty(true);
      });
      
      editor.addCommand(monacoLib.KeyMod.CtrlCmd | monacoLib.KeyCode.KeyS, () => {
        saveFile();
      });
    };
    
    loadMonaco();
    
    return () => {
      if (monacoEditorRef.current) {
        monacoEditorRef.current.dispose();
        monacoEditorRef.current = null;
      }
    };
  }, [isLoading, content, filePath, detectLanguage, readOnly, saveFile]);
  
  const handleCopy = useCallback(() => {
    const text = monacoEditorRef.current?.getValue() || content;
    navigator.clipboard.writeText(text);
  }, [content]);
  
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1e1e1e]">
        <div className="text-center text-muted-foreground">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2" />
          <p className="text-sm">Loading {filePath}...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]" data-testid="vscode-shell">
      <div className="flex items-center justify-between h-8 px-2 bg-[#252526] border-b border-[#3c3c3c]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{filePath}</span>
          {isDirty && <Badge variant="outline" className="text-xs h-4 px-1">Modified</Badge>}
          {error && (
            <div className="flex items-center gap-1 text-red-400">
              <AlertCircle className="h-3 w-3" />
              <span className="text-xs">{error}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={saveFile}
            disabled={!isDirty || isSaving || readOnly}
            data-testid="button-save-file"
          >
            <Save className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleCopy}
            data-testid="button-copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => monacoEditorRef.current?.trigger('keyboard', 'undo', null)}
            data-testid="button-undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => monacoEditorRef.current?.trigger('keyboard', 'redo', null)}
            data-testid="button-redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => monacoEditorRef.current?.trigger('keyboard', 'actions.find', null)}
            data-testid="button-search"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <div ref={editorRef} className="flex-1" data-testid="monaco-editor" />
    </div>
  );
}
