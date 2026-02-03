import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  X, Minus, Maximize2, Minimize2, GripVertical, Send,
  Terminal, MessageSquare, Code, Play, FileJson, Sparkles,
  CheckCircle, AlertCircle, Braces, Server, Palette, Wand2,
  Bot, Settings, Plus, RefreshCw, Zap
} from 'lucide-react';
import { usePuter } from '@/hooks/usePuter';

interface CanvasPanel {
  id: string;
  type: 'ai' | 'terminal' | 'console' | 'rest-client' | 'live-server' | 'extension';
  title: string;
  x: number;
  y: number;
  width: number;
  height: number;
  minimized: boolean;
  zIndex: number;
  extensionId?: string;
}

interface Extension {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  description: string;
  enabled: boolean;
}

const EXTENSIONS: Extension[] = [
  { id: 'spell-checker', name: 'Code Spell Checker', icon: <CheckCircle className="w-4 h-4" />, color: '#00ff88', description: 'Spelling checker for code', enabled: true },
  { id: 'prettier', name: 'Prettier', icon: <Palette className="w-4 h-4" />, color: '#f59e0b', description: 'Code formatter', enabled: true },
  { id: 'bracket-colorizer', name: 'Bracket Colorizer', icon: <Braces className="w-4 h-4" />, color: '#8b5cf6', description: 'Colorize matching brackets', enabled: true },
  { id: 'live-server', name: 'Live Server', icon: <Server className="w-4 h-4" />, color: '#e94560', description: 'Launch local development server', enabled: true },
  { id: 'es6-snippets', name: 'JavaScript ES6', icon: <Code className="w-4 h-4" />, color: '#f7df1e', description: 'ES6 code snippets', enabled: true },
  { id: 'rest-client', name: 'REST Client', icon: <FileJson className="w-4 h-4" />, color: '#3b82f6', description: 'Send HTTP requests', enabled: true },
  { id: 'cmd-grudge', name: 'GrudgeOS CMD', icon: <Terminal className="w-4 h-4" />, color: '#00ff88', description: 'System command line', enabled: true },
  { id: 'ai-assistant', name: 'AI Assistant', icon: <Bot className="w-4 h-4" />, color: '#8b5cf6', description: 'Puter.js AI integration', enabled: true },
];

function PanelShell({ 
  panel, 
  onClose, 
  onMinimize, 
  onMaximize,
  onMove,
  onResize,
  onFocus,
  children 
}: { 
  panel: CanvasPanel;
  onClose: () => void;
  onMinimize: () => void;
  onMaximize: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  onFocus: () => void;
  children: React.ReactNode;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.panel-controls')) return;
    onFocus();
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - panel.x,
      y: e.clientY - panel.y
    });
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFocus();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        onMove(e.clientX - dragOffset.x, e.clientY - dragOffset.y);
      }
      if (isResizing && panelRef.current) {
        const rect = panelRef.current.getBoundingClientRect();
        const newWidth = Math.max(280, e.clientX - rect.left);
        const newHeight = Math.max(200, e.clientY - rect.top);
        onResize(newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, onMove, onResize]);

  if (panel.minimized) {
    return null;
  }

  return (
    <div
      ref={panelRef}
      className="absolute bg-[#12121a] border border-[#2a2a3a] rounded-lg shadow-2xl overflow-hidden flex flex-col"
      style={{
        left: panel.x,
        top: panel.y,
        width: panel.width,
        height: panel.height,
        zIndex: panel.zIndex,
      }}
      onClick={onFocus}
      data-testid={`canvas-panel-${panel.id}`}
    >
      <div 
        className="flex items-center justify-between px-3 py-2 bg-[#1a1a25] border-b border-[#2a2a3a] cursor-move"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="w-3 h-3 text-[#5b5b6b]" />
          <span className="text-xs font-medium text-[#e8e8ff]">{panel.title}</span>
        </div>
        <div className="flex items-center gap-1 panel-controls">
          <button
            onClick={onMinimize}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#2a2a3a] text-[#8b8b9b]"
            data-testid={`button-minimize-${panel.id}`}
          >
            <Minus className="w-3 h-3" />
          </button>
          <button
            onClick={onMaximize}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#2a2a3a] text-[#8b8b9b]"
            data-testid={`button-maximize-${panel.id}`}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
          <button
            onClick={onClose}
            className="w-5 h-5 rounded flex items-center justify-center hover:bg-[#e94560] text-[#8b8b9b] hover:text-white"
            data-testid={`button-close-${panel.id}`}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
      <div 
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        onMouseDown={handleResizeStart}
      />
    </div>
  );
}

function AIPanel() {
  const puter = usePuter();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'ai'; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('claude-sonnet-4');
  const scrollRef = useRef<HTMLDivElement>(null);

  const models = [
    'claude-sonnet-4', 'claude-opus-4', 'gpt-5-nano', 'gpt-4o', 
    'deepseek/deepseek-r1', 'meta-llama/llama-4-maverick'
  ];

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      if (puter.isReady) {
        const response = await puter.ai.chat(userMessage, selectedModel);
        setMessages(prev => [...prev, { role: 'ai', content: response }]);
      } else {
        setMessages(prev => [...prev, { role: 'ai', content: 'Puter AI not available. Please sign in.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: `Error: ${error}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-[#2a2a3a]">
        <select 
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="flex-1 h-7 text-xs bg-[#1a1a25] border border-[#2a2a3a] rounded px-2 text-[#e8e8ff]"
          data-testid="select-ai-model"
        >
          {models.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <Badge variant="outline" className="border-[#8b5cf6] text-[#8b5cf6] text-[10px]">
          <Sparkles className="w-3 h-3 mr-1" />
          Puter.js
        </Badge>
      </div>
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-[#5b5b6b] text-xs py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
              Ask anything using free Puter.js AI
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3 py-2 rounded-lg text-xs ${
                msg.role === 'user' 
                  ? 'bg-[#8b5cf6] text-white' 
                  : 'bg-[#1a1a25] text-[#e8e8ff] border border-[#2a2a3a]'
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-center gap-2 text-[#8b5cf6] text-xs">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Thinking...
            </div>
          )}
        </div>
      </ScrollArea>
      <div className="p-2 border-t border-[#2a2a3a]">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder="Ask AI anything..."
            className="flex-1 h-8 text-xs bg-[#1a1a25] border-[#2a2a3a]"
            data-testid="input-ai-message"
          />
          <Button 
            size="sm" 
            onClick={sendMessage} 
            disabled={isLoading}
            className="h-8 bg-[#8b5cf6] hover:bg-[#7c4dff]"
            data-testid="button-send-ai"
          >
            <Send className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function TerminalPanel() {
  const [history, setHistory] = useState<string[]>(['GrudgeOS CMD v1.0.0', 'Type "help" for commands.', '']);
  const [input, setInput] = useState('');

  const executeCommand = (cmd: string) => {
    const commands: Record<string, string> = {
      help: 'Available commands: help, clear, ls, pwd, echo, date, whoami, version',
      clear: '__CLEAR__',
      ls: 'src/  package.json  README.md  node_modules/  public/',
      pwd: '/home/user/project',
      date: new Date().toLocaleString(),
      whoami: 'grudge-user',
      version: 'GrudgeOS CMD v1.0.0 | Node.js v20.0.0',
    };

    if (cmd.startsWith('echo ')) {
      return cmd.slice(5);
    }

    return commands[cmd] || `Command not found: ${cmd}`;
  };

  const handleCommand = () => {
    if (!input.trim()) return;
    
    const result = executeCommand(input.trim().toLowerCase());
    
    if (result === '__CLEAR__') {
      setHistory(['']);
    } else {
      setHistory(prev => [...prev, `$ ${input}`, result, '']);
    }
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] font-mono">
      <ScrollArea className="flex-1 p-3">
        <div className="text-xs text-[#00ff88] whitespace-pre-wrap">
          {history.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </ScrollArea>
      <div className="flex items-center gap-2 p-2 border-t border-[#1a1a25]">
        <span className="text-[#00ff88] text-xs">$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleCommand()}
          className="flex-1 bg-transparent text-[#e8e8ff] text-xs outline-none"
          placeholder="Enter command..."
          data-testid="input-terminal-command"
        />
      </div>
    </div>
  );
}

function ConsolePanel() {
  const [logs, setLogs] = useState<Array<{ type: 'log' | 'warn' | 'error' | 'info'; message: string; time: string }>>([
    { type: 'info', message: 'Console ready', time: new Date().toLocaleTimeString() },
  ]);

  const addLog = (type: 'log' | 'warn' | 'error' | 'info', message: string) => {
    setLogs(prev => [...prev, { type, message, time: new Date().toLocaleTimeString() }]);
  };

  const typeColors = {
    log: 'text-[#e8e8ff]',
    warn: 'text-[#f59e0b]',
    error: 'text-[#e94560]',
    info: 'text-[#3b82f6]',
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-2 border-b border-[#2a2a3a]">
        <Button size="sm" variant="ghost" onClick={() => addLog('log', 'Test log message')} className="h-6 text-xs">Log</Button>
        <Button size="sm" variant="ghost" onClick={() => addLog('warn', 'Warning message')} className="h-6 text-xs">Warn</Button>
        <Button size="sm" variant="ghost" onClick={() => addLog('error', 'Error message')} className="h-6 text-xs">Error</Button>
        <Button size="sm" variant="ghost" onClick={() => setLogs([])} className="h-6 text-xs ml-auto">Clear</Button>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-[#5b5b6b]">{log.time}</span>
              <span className={typeColors[log.type]}>[{log.type.toUpperCase()}]</span>
              <span className="text-[#e8e8ff]">{log.message}</span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function RESTClientPanel() {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/posts/1');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendRequest = async () => {
    setIsLoading(true);
    setResponse('');
    try {
      const res = await fetch(url, { method });
      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (error) {
      setResponse(`Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-[#2a2a3a] space-y-2">
        <div className="flex gap-2">
          <select 
            value={method} 
            onChange={(e) => setMethod(e.target.value)}
            className="h-8 w-20 text-xs bg-[#1a1a25] border border-[#2a2a3a] rounded px-2 text-[#e8e8ff]"
            data-testid="select-http-method"
          >
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => <option key={m}>{m}</option>)}
          </select>
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 h-8 text-xs bg-[#1a1a25] border-[#2a2a3a]"
            placeholder="Enter URL..."
            data-testid="input-rest-url"
          />
          <Button 
            size="sm" 
            onClick={sendRequest}
            disabled={isLoading}
            className="h-8 bg-[#3b82f6] hover:bg-[#2563eb]"
            data-testid="button-send-request"
          >
            <Zap className="w-3 h-3 mr-1" />
            Send
          </Button>
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        <pre className="text-xs font-mono text-[#e8e8ff] whitespace-pre-wrap">
          {isLoading ? 'Loading...' : response || 'Response will appear here...'}
        </pre>
      </ScrollArea>
    </div>
  );
}

function LiveServerPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [port, setPort] = useState('3000');
  const [logs, setLogs] = useState<string[]>([]);

  const toggleServer = () => {
    if (isRunning) {
      setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Server stopped`]);
      setIsRunning(false);
    } else {
      setLogs(prev => [
        ...prev, 
        `[${new Date().toLocaleTimeString()}] Starting server on port ${port}...`,
        `[${new Date().toLocaleTimeString()}] Server running at http://localhost:${port}`,
        `[${new Date().toLocaleTimeString()}] Watching for file changes...`
      ]);
      setIsRunning(true);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b border-[#2a2a3a]">
        <div className="flex items-center gap-2">
          <Input
            value={port}
            onChange={(e) => setPort(e.target.value)}
            className="w-20 h-8 text-xs bg-[#1a1a25] border-[#2a2a3a]"
            placeholder="Port"
            data-testid="input-server-port"
          />
          <Button 
            size="sm" 
            onClick={toggleServer}
            className={`h-8 ${isRunning ? 'bg-[#e94560] hover:bg-[#d13350]' : 'bg-[#00ff88] hover:bg-[#00dd77] text-black'}`}
            data-testid="button-toggle-server"
          >
            {isRunning ? 'Stop' : 'Start'}
          </Button>
          {isRunning && (
            <Badge className="bg-[#00ff88] text-black text-[10px]">
              <Play className="w-3 h-3 mr-1" />
              Running
            </Badge>
          )}
        </div>
      </div>
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1 font-mono text-xs">
          {logs.map((log, i) => (
            <div key={i} className="text-[#8b8b9b]">{log}</div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function ExtensionPanel({ extensionId }: { extensionId: string }) {
  const extension = EXTENSIONS.find(e => e.id === extensionId);
  
  if (!extension) {
    return <div className="p-4 text-[#8b8b9b] text-xs">Extension not found</div>;
  }

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: extension.color + '20' }}>
          <span style={{ color: extension.color }}>{extension.icon}</span>
        </div>
        <div>
          <h3 className="text-sm font-medium text-[#e8e8ff]">{extension.name}</h3>
          <p className="text-xs text-[#8b8b9b]">{extension.description}</p>
        </div>
      </div>
      <div className="flex-1 bg-[#0a0a0f] rounded-lg p-3">
        <div className="text-xs text-[#5b5b6b]">
          Extension panel ready. Configure {extension.name} settings here.
        </div>
      </div>
    </div>
  );
}

export function LiveCanvas() {
  const [panels, setPanels] = useState<CanvasPanel[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(100);
  const [showExtensions, setShowExtensions] = useState(false);

  const createPanel = useCallback((type: CanvasPanel['type'], title: string, extensionId?: string) => {
    const newPanel: CanvasPanel = {
      id: `panel-${Date.now()}`,
      type,
      title,
      x: 50 + (panels.length % 5) * 30,
      y: 50 + (panels.length % 5) * 30,
      width: type === 'ai' ? 380 : 400,
      height: type === 'ai' ? 450 : 350,
      minimized: false,
      zIndex: maxZIndex + 1,
      extensionId,
    };
    setMaxZIndex(prev => prev + 1);
    setPanels(prev => [...prev, newPanel]);
  }, [panels.length, maxZIndex]);

  const closePanel = useCallback((id: string) => {
    setPanels(prev => prev.filter(p => p.id !== id));
  }, []);

  const minimizePanel = useCallback((id: string) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, minimized: true } : p));
  }, []);

  const maximizePanel = useCallback((id: string) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, x: 10, y: 10, width: 600, height: 500 } : p));
  }, []);

  const movePanel = useCallback((id: string, x: number, y: number) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, x: Math.max(0, x), y: Math.max(0, y) } : p));
  }, []);

  const resizePanel = useCallback((id: string, width: number, height: number) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, width, height } : p));
  }, []);

  const focusPanel = useCallback((id: string) => {
    setMaxZIndex(prev => prev + 1);
    setPanels(prev => prev.map(p => p.id === id ? { ...p, zIndex: maxZIndex + 1 } : p));
  }, [maxZIndex]);

  const restorePanel = useCallback((id: string) => {
    setPanels(prev => prev.map(p => p.id === id ? { ...p, minimized: false } : p));
    focusPanel(id);
  }, [focusPanel]);

  const renderPanelContent = (panel: CanvasPanel) => {
    switch (panel.type) {
      case 'ai': return <AIPanel />;
      case 'terminal': return <TerminalPanel />;
      case 'console': return <ConsolePanel />;
      case 'rest-client': return <RESTClientPanel />;
      case 'live-server': return <LiveServerPanel />;
      case 'extension': return <ExtensionPanel extensionId={panel.extensionId || ''} />;
      default: return null;
    }
  };

  const minimizedPanels = panels.filter(p => p.minimized);

  return (
    <div className="relative w-full h-full bg-[#0a0a0f] overflow-hidden" data-testid="live-canvas">
      {/* Toolbar - h-11 (44px) consistent with header, gap-3 for uniform spacing */}
      <div className="absolute top-3 left-3 right-3 h-11 flex items-center justify-between gap-3 z-50">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => createPanel('ai', 'AI Assistant')}
            className="h-9 bg-[#8b5cf6] hover:bg-[#7c4dff]"
            data-testid="button-new-ai-panel"
          >
            <Bot className="w-4 h-4 mr-2" />
            AI
          </Button>
          <Button
            size="sm"
            onClick={() => createPanel('terminal', 'Terminal')}
            className="h-9 bg-[#00ff88] hover:bg-[#00dd77] text-black"
            data-testid="button-new-terminal"
          >
            <Terminal className="w-4 h-4 mr-2" />
            Terminal
          </Button>
          <Button
            size="sm"
            onClick={() => createPanel('console', 'Console')}
            className="h-9 bg-[#3b82f6] hover:bg-[#2563eb]"
            data-testid="button-new-console"
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Console
          </Button>
          <Button
            size="sm"
            onClick={() => createPanel('rest-client', 'REST Client')}
            className="h-9 bg-[#f59e0b] hover:bg-[#d97706]"
            data-testid="button-new-rest"
          >
            <FileJson className="w-4 h-4 mr-2" />
            REST
          </Button>
          <Button
            size="sm"
            onClick={() => createPanel('live-server', 'Live Server')}
            className="h-9 bg-[#e94560] hover:bg-[#d13350]"
            data-testid="button-new-liveserver"
          >
            <Server className="w-4 h-4 mr-2" />
            Server
          </Button>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowExtensions(!showExtensions)}
          className="h-9 border-[#2a2a3a]"
          data-testid="button-toggle-extensions"
        >
          <Settings className="w-4 h-4 mr-2" />
          Extensions
        </Button>
      </div>

      {/* Extensions Dropdown - consistent spacing and touch targets */}
      {showExtensions && (
        <div className="absolute top-16 right-3 w-64 bg-[#12121a] border border-[#2a2a3a] rounded-lg shadow-xl z-50 p-3">
          <div className="text-xs font-medium text-[#8b8b9b] px-2 py-2 border-b border-[#2a2a3a] mb-2">Available Extensions</div>
          <div className="space-y-1">
            {EXTENSIONS.map(ext => (
              <button
                key={ext.id}
                onClick={() => {
                  createPanel('extension', ext.name, ext.id);
                  setShowExtensions(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1a1a25] text-left transition-colors"
                data-testid={`button-ext-${ext.id}`}
              >
                <span style={{ color: ext.color }}>{ext.icon}</span>
                <span className="text-sm text-[#e8e8ff]">{ext.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Canvas Area */}
      <div className="absolute inset-0 pt-14">
        {panels.map(panel => (
          <PanelShell
            key={panel.id}
            panel={panel}
            onClose={() => closePanel(panel.id)}
            onMinimize={() => minimizePanel(panel.id)}
            onMaximize={() => maximizePanel(panel.id)}
            onMove={(x, y) => movePanel(panel.id, x, y)}
            onResize={(w, h) => resizePanel(panel.id, w, h)}
            onFocus={() => focusPanel(panel.id)}
          >
            {renderPanelContent(panel)}
          </PanelShell>
        ))}
      </div>

      {/* Minimized Panels Bar - consistent h-9 touch targets */}
      {minimizedPanels.length > 0 && (
        <div className="absolute bottom-3 left-3 flex gap-2 z-50">
          {minimizedPanels.map(panel => (
            <Button
              key={panel.id}
              size="sm"
              variant="outline"
              onClick={() => restorePanel(panel.id)}
              className="h-9 border-[#2a2a3a] text-xs"
              data-testid={`button-restore-${panel.id}`}
            >
              <Minimize2 className="w-4 h-4 mr-2" />
              {panel.title}
            </Button>
          ))}
        </div>
      )}

      {/* Empty State */}
      {panels.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#1a1a25] flex items-center justify-center">
              <Plus className="w-8 h-8 text-[#5b5b6b]" />
            </div>
            <h3 className="text-[#e8e8ff] font-medium mb-1">Live Canvas</h3>
            <p className="text-xs text-[#5b5b6b] max-w-xs">
              Click the buttons above to add AI assistants, terminals, consoles, and more
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
