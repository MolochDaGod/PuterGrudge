import { useState, useRef, useCallback, useEffect } from 'react';
import { 
  Code, 
  Bot, 
  Terminal, 
  FolderArchive, 
  HardDrive, 
  FileCode, 
  Image, 
  Database,
  Settings,
  Workflow,
  Cpu
} from 'lucide-react';
import { WindowShell } from './WindowShell';
import { WindowManagerProvider, useWindowManager, WindowState } from './WindowManager';
import { VSCodeShell } from './VSCodeShell';
import { AIConsole } from './AIConsole';
import { CompilerTool, ArchiveTool, ConverterTool, StorageBrowser, QdrantTool, WasmRunner, ShellTerminal } from './tools';
import { WorkflowTool } from './tools/WorkflowTool';

interface DesktopApp {
  id: string;
  name: string;
  icon: typeof Code;
  iconColor: string;
  iconBg: string;
  component: string;
  width?: number;
  height?: number;
}

const DESKTOP_APPS: DesktopApp[] = [
  { id: 'editor', name: 'Code Editor', icon: Code, iconColor: '#3b82f6', iconBg: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', component: 'editor', width: 800, height: 500 },
  { id: 'ai', name: 'AI Assistant', icon: Bot, iconColor: '#00f5ff', iconBg: 'linear-gradient(135deg, #8b5cf6, #00f5ff)', component: 'ai', width: 600, height: 500 },
  { id: 'terminal', name: 'Terminal', icon: Terminal, iconColor: '#00ff88', iconBg: 'linear-gradient(135deg, #00ff88, #00aa55)', component: 'terminal', width: 700, height: 400 },
  { id: 'compiler', name: 'Compiler', icon: FileCode, iconColor: '#f59e0b', iconBg: 'linear-gradient(135deg, #f59e0b, #ff6b35)', component: 'compiler', width: 500, height: 400 },
  { id: 'archive', name: 'Archive Tool', icon: FolderArchive, iconColor: '#f59e0b', iconBg: 'linear-gradient(135deg, #f59e0b, #d97706)', component: 'archive', width: 500, height: 450 },
  { id: 'converter', name: 'Converter', icon: Image, iconColor: '#8b5cf6', iconBg: 'linear-gradient(135deg, #8b5cf6, #ff00aa)', component: 'converter', width: 500, height: 450 },
  { id: 'storage', name: 'Storage', icon: HardDrive, iconColor: '#3b82f6', iconBg: 'linear-gradient(135deg, #3b82f6, #00f5ff)', component: 'storage', width: 600, height: 450 },
  { id: 'qdrant', name: 'Vector DB', icon: Database, iconColor: '#e94560', iconBg: 'linear-gradient(135deg, #e94560, #ff00aa)', component: 'qdrant', width: 550, height: 450 },
  { id: 'workflows', name: 'Workflows', icon: Workflow, iconColor: '#00ff88', iconBg: 'linear-gradient(135deg, #00ff88, #8b5cf6)', component: 'workflows', width: 700, height: 500 },
  { id: 'wasm', name: 'WASM Runner', icon: Cpu, iconColor: '#00f5ff', iconBg: 'linear-gradient(135deg, #00f5ff, #8b5cf6)', component: 'wasm', width: 650, height: 500 },
  { id: 'settings', name: 'Settings', icon: Settings, iconColor: '#8b8b9b', iconBg: 'linear-gradient(135deg, #8b8b9b, #505070)', component: 'settings', width: 500, height: 400 },
];

function DesktopIcon({ app, onClick, isSelected }: { app: DesktopApp; onClick: () => void; isSelected: boolean }) {
  const Icon = app.icon;
  
  return (
    <div
      className={`flex flex-col items-center gap-1.5 p-3 rounded-lg cursor-pointer transition-all select-none ${
        isSelected ? 'bg-[#00f5ff]/20 border border-[#00f5ff]' : 'hover:bg-[#8b5cf6]/20'
      }`}
      onClick={onClick}
      onDoubleClick={onClick}
      data-testid={`desktop-icon-${app.id}`}
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center shadow-lg"
        style={{ background: app.iconBg }}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <span className="text-xs text-center text-[#e8e8ff] max-w-[80px] truncate drop-shadow-md">
        {app.name}
      </span>
    </div>
  );
}

function TaskbarApp({ window, onClick }: { window: WindowState; onClick: () => void }) {
  return (
    <button
      className={`h-10 px-4 flex items-center gap-2 rounded-lg transition-all ${
        window.isFocused 
          ? 'bg-[#00f5ff]/20 border border-[#00f5ff] shadow-[0_0_15px_rgba(0,245,255,0.3)]' 
          : 'bg-[#8b5cf6]/15 border border-transparent hover:bg-[#8b5cf6]/25 hover:border-[#8b5cf6]'
      }`}
      onClick={onClick}
      data-testid={`taskbar-app-${window.id}`}
    >
      <span className="text-sm">{window.icon}</span>
      <span className="text-sm font-medium text-[#e8e8ff] truncate max-w-[120px]">{window.title}</span>
    </button>
  );
}

function DesktopContent() {
  const { windows, openWindow, focusWindow, restoreWindow } = useWindowManager();
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerBounds, setContainerBounds] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateBounds = () => {
      setContainerBounds({
        width: container.offsetWidth,
        height: container.offsetHeight,
      });
    };

    updateBounds();

    const resizeObserver = new ResizeObserver(updateBounds);
    resizeObserver.observe(container);

    return () => resizeObserver.disconnect();
  }, []);

  const handleAppClick = useCallback((app: DesktopApp) => {
    setSelectedApp(app.id);
    
    const IconComponent = app.icon;
    openWindow({
      id: app.id,
      title: app.name,
      icon: <IconComponent className="w-4 h-4" style={{ color: app.iconColor }} />,
      component: app.component,
      width: app.width || 600,
      height: app.height || 400,
    });
  }, [openWindow]);

  const handleTaskbarClick = useCallback((window: WindowState) => {
    if (window.isMinimized) {
      restoreWindow(window.id);
    } else {
      focusWindow(window.id);
    }
  }, [focusWindow, restoreWindow]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedApp(null);
    }
  }, []);

  const renderWindowContent = (component: string) => {
    switch (component) {
      case 'editor':
        return <VSCodeShell />;
      case 'ai':
        return <AIConsole />;
      case 'terminal':
        return <ShellTerminal shellType="terminal" shellName="Terminal" executionContext="user" />;
      case 'compiler':
        return <CompilerTool />;
      case 'archive':
        return <ArchiveTool />;
      case 'converter':
        return <ConverterTool />;
      case 'storage':
        return <StorageBrowser />;
      case 'qdrant':
        return <QdrantTool />;
      case 'workflows':
        return <WorkflowTool />;
      case 'wasm':
        return <WasmRunner />;
      case 'settings':
        return (
          <div className="h-full p-6">
            <h2 className="text-lg font-semibold text-[#e8e8ff] mb-4">AI VM Settings</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-[#1a1a25] rounded-lg">
                <span className="text-sm text-[#e8e8ff]">Theme</span>
                <span className="text-sm text-[#8b5cf6]">Cyberpunk Dark</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1a1a25] rounded-lg">
                <span className="text-sm text-[#e8e8ff]">AI Model</span>
                <span className="text-sm text-[#00f5ff]">Claude 3.5</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-[#1a1a25] rounded-lg">
                <span className="text-sm text-[#e8e8ff]">Storage Provider</span>
                <span className="text-sm text-[#00ff88]">Puter</span>
              </div>
            </div>
          </div>
        );
      default:
        return <div className="p-4 text-[#8b8b9b]">Unknown component</div>;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" data-testid="aivm-desktop">
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        onClick={handleContainerClick}
        style={{
          backgroundImage: `
            radial-gradient(ellipse at 20% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 20%, rgba(0, 245, 255, 0.1) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(255, 0, 170, 0.08) 0%, transparent 70%)
          `,
        }}
      >
        <div className="absolute top-4 left-4 grid grid-flow-col grid-rows-3 gap-2 z-10" data-testid="desktop-icons-grid">
          {DESKTOP_APPS.map((app) => (
            <DesktopIcon
              key={app.id}
              app={app}
              onClick={() => handleAppClick(app)}
              isSelected={selectedApp === app.id}
            />
          ))}
        </div>

        {windows.map((window) => (
          <WindowShell key={window.id} window={window} containerBounds={containerBounds}>
            {renderWindowContent(window.component)}
          </WindowShell>
        ))}
      </div>

      <div 
        className="h-14 flex items-center gap-2 px-3 border-t backdrop-blur-xl flex-shrink-0"
        style={{
          background: 'rgba(20, 20, 40, 0.85)',
          borderColor: 'rgba(139, 92, 246, 0.3)',
        }}
        data-testid="aivm-taskbar"
      >
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110"
          style={{
            background: 'linear-gradient(135deg, #00f5ff, #8b5cf6)',
            boxShadow: '0 0 20px rgba(0, 245, 255, 0.5)',
          }}
          data-testid="button-aivm-launcher"
        >
          <Bot className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 flex gap-2 px-4 overflow-x-auto" data-testid="taskbar-apps">
          {windows.map((window) => (
            <TaskbarApp
              key={window.id}
              window={window}
              onClick={() => handleTaskbarClick(window)}
            />
          ))}
        </div>

        <div 
          className="flex items-center gap-3 pl-4 border-l"
          style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}
        >
          <span 
            className="text-sm font-mono"
            style={{ color: '#00f5ff', fontFamily: "'Orbitron', sans-serif" }}
            data-testid="text-clock"
          >
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
}

export function AIVMDesktop() {
  return (
    <WindowManagerProvider>
      <DesktopContent />
    </WindowManagerProvider>
  );
}
