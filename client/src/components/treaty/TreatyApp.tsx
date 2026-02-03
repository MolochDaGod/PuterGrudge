import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Hash, Volume2, Users, Settings, Plus, ChevronDown, ChevronRight,
  Folder, FileCode, Package, Rocket, Bot, MessageSquare, Send,
  Search, Bell, Pin, AtSign, LogIn, LayoutGrid, Code2,
  Terminal, FolderArchive, ImageIcon, HardDrive, Database
} from 'lucide-react';
import { usePuter } from '@/hooks/usePuter';
import { WindowManagerProvider, useWindowManager, WindowShell, TOOL_REGISTRY } from '@/components/grudgeos';
import { LiveCanvas } from '@/components/canvas/LiveCanvas';
import cloudPilotLogo from '@assets/19baa9024f3fe_1768093178403.png';

/**
 * Mobile Touch Hook - Long Press for Right Click
 * Best practice for mobile: 500ms hold triggers context menu
 */
function useLongPress(callback: (e: React.TouchEvent | React.MouseEvent) => void, ms = 500) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  const start = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    timerRef.current = setTimeout(() => {
      callbackRef.current(e);
    }, ms);
  }, [ms]);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  return {
    onTouchStart: start,
    onTouchEnd: stop,
    onTouchMove: stop,
    onMouseDown: start,
    onMouseUp: stop,
    onMouseLeave: stop,
  };
}

interface Server {
  id: string;
  name: string;
  icon: string;
  color: string;
  unread?: number;
}

interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'video' | 'category';
  unread?: boolean;
  parentId?: string;
}

interface Message {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: Date;
  isAI?: boolean;
}

interface ProjectFile {
  id: string;
  name: string;
  type: 'folder' | 'file';
  children?: ProjectFile[];
  language?: string;
}

interface TaskbarApp {
  id: string;
  name: string;
  icon: React.ReactNode;
  component: string;
  color: string;
}

const SERVERS: Server[] = [
  { id: 'grudachain', name: 'GRUDACHAIN', icon: 'G', color: '#8b5cf6' },
  { id: 'treaty', name: 'Treaty Studio', icon: 'T', color: '#e94560' },
  { id: 'arena', name: 'Arena Games', icon: 'A', color: '#00ff88', unread: 3 },
];

const CHANNELS: Channel[] = [
  { id: 'cat-1', name: 'INFORMATION', type: 'category' },
  { id: 'welcome', name: 'welcome', type: 'text', parentId: 'cat-1' },
  { id: 'announcements', name: 'announcements', type: 'text', parentId: 'cat-1', unread: true },
  { id: 'cat-2', name: 'DEVELOPMENT', type: 'category' },
  { id: 'general', name: 'general', type: 'text', parentId: 'cat-2' },
  { id: 'ai-canvas', name: 'ai-canvas', type: 'text', parentId: 'cat-2' },
  { id: 'deployments', name: 'deployments', type: 'text', parentId: 'cat-2' },
  { id: 'cat-3', name: 'VOICE', type: 'category' },
  { id: 'building', name: 'Building', type: 'voice', parentId: 'cat-3' },
  { id: 'meeting', name: 'Team Meeting', type: 'voice', parentId: 'cat-3' },
];

const TASKBAR_APPS: TaskbarApp[] = [
  { id: 'workflows', name: 'Workflows', icon: <Rocket className="w-5 h-5" />, component: 'workflows', color: '#8b5cf6' },
  { id: 'compiler', name: 'Compiler', icon: <Terminal className="w-5 h-5" />, component: 'compiler', color: '#00ff88' },
  { id: 'archive', name: 'Archive', icon: <FolderArchive className="w-5 h-5" />, component: 'archive', color: '#f59e0b' },
  { id: 'converter', name: 'Converter', icon: <ImageIcon className="w-5 h-5" />, component: 'converter', color: '#8b5cf6' },
  { id: 'storage', name: 'Storage', icon: <HardDrive className="w-5 h-5" />, component: 'storage', color: '#3b82f6' },
  { id: 'vectors', name: 'Qdrant', icon: <Database className="w-5 h-5" />, component: 'qdrant', color: '#e94560' },
];

const SAMPLE_FILES: ProjectFile[] = [
  { id: 'src', name: 'src', type: 'folder', children: [
    { id: 'components', name: 'components', type: 'folder', children: [
      { id: 'app', name: 'App.tsx', type: 'file', language: 'tsx' },
      { id: 'header', name: 'Header.tsx', type: 'file', language: 'tsx' },
    ]},
    { id: 'index', name: 'index.ts', type: 'file', language: 'ts' },
  ]},
  { id: 'package', name: 'package.json', type: 'file', language: 'json' },
  { id: 'readme', name: 'README.md', type: 'file', language: 'md' },
];

function TreatyWorkspace() {
  const puter = usePuter();
  const { windows, openWindow } = useWindowManager();
  const [activeServer, setActiveServer] = useState('grudachain');
  const [activeChannel, setActiveChannel] = useState('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src', 'components']));
  const [activeView, setActiveView] = useState<'chat' | 'canvas'>('canvas');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const NAMESPACE = 'treaty';

  useEffect(() => {
    if (puter.isReady) {
      loadMessages(activeChannel);
    }
  }, [puter.isReady, activeChannel]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadMessages = async (channelId: string) => {
    try {
      const keys = await puter.kv.list(`${NAMESPACE}:msg:${channelId}:`);
      const loadedMessages: Message[] = [];
      
      for (const key of keys.slice(-50)) {
        const msg = await puter.kv.get<Message>(key);
        if (msg) {
          loadedMessages.push({ ...msg, timestamp: new Date(msg.timestamp) });
        }
      }
      
      if (loadedMessages.length === 0) {
        loadedMessages.push(
          { id: '1', author: 'System', avatar: 'S', content: 'Welcome to Treaty Studio! Your AI-powered workspace is ready.', timestamp: new Date(), isAI: true },
          { id: '2', author: 'AI Canvas', avatar: 'A', content: 'I can help you organize files, manage dependencies, and deploy projects. Just ask!', timestamp: new Date(), isAI: true }
        );
      }
      
      setMessages(loadedMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()));
    } catch (e) {
      setMessages([
        { id: '1', author: 'System', avatar: 'S', content: 'Welcome to Treaty Studio! Sign in with Puter for persistent chat.', timestamp: new Date(), isAI: true },
      ]);
    }
  };

  const saveMessage = async (msg: Message) => {
    try {
      const key = `${NAMESPACE}:msg:${activeChannel}:${msg.id}`;
      await puter.kv.set(key, msg);
    } catch (e) {}
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sendMessage = async () => {
    if (!messageInput.trim()) return;
    
    const author = puter.user?.username || 'You';
    const avatar = puter.user?.username?.[0]?.toUpperCase() || 'Y';
    
    const newMsg: Message = {
      id: `${Date.now()}`,
      author,
      avatar,
      content: messageInput,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newMsg]);
    setMessageInput('');
    await saveMessage(newMsg);

    if (messageInput.toLowerCase().includes('@ai') || messageInput.toLowerCase().includes('help')) {
      setTimeout(async () => {
        const aiMsg: Message = {
          id: `${Date.now()}-ai`,
          author: 'AI Assistant',
          avatar: 'A',
          content: getAIResponse(messageInput),
          timestamp: new Date(),
          isAI: true,
        };
        setMessages(prev => [...prev, aiMsg]);
        await saveMessage(aiMsg);
      }, 1000);
    }
  };

  const getAIResponse = (input: string): string => {
    if (input.includes('deploy')) return 'I can deploy your project! Click the Rocket icon in the canvas to start deployment. Your project will be live at *.grudge.site';
    if (input.includes('file') || input.includes('folder')) return 'Use the file tree on the right to organize your project. I can create new files, move folders, or restructure your codebase.';
    if (input.includes('package') || input.includes('depend')) return 'I can manage your dependencies! Tell me which packages you need and I\'ll add them to package.json.';
    return 'I\'m here to help! You can ask me to organize files, manage packages, or deploy your project.';
  };

  const openTool = (app: TaskbarApp) => {
    openWindow({
      id: app.id,
      title: app.name,
      icon: app.icon,
      component: app.component,
      width: 500,
      height: 400,
    });
  };

  const renderFileTree = (files: ProjectFile[], depth = 0) => {
    return files.map(file => (
      <div key={file.id}>
        <div 
          className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-white/5 transition-colors"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
          onClick={() => file.type === 'folder' && toggleFolder(file.id)}
          data-testid={`file-${file.id}`}
        >
          {file.type === 'folder' ? (
            <>
              {expandedFolders.has(file.id) ? <ChevronDown className="w-3 h-3 text-[#8b8b9b]" /> : <ChevronRight className="w-3 h-3 text-[#8b8b9b]" />}
              <Folder className="w-4 h-4 text-[#f59e0b]" />
            </>
          ) : (
            <>
              <span className="w-3" />
              <FileCode className="w-4 h-4 text-[#3b82f6]" />
            </>
          )}
          <span className="text-sm text-[#e8e8ff]">{file.name}</span>
        </div>
        {file.type === 'folder' && file.children && expandedFolders.has(file.id) && (
          renderFileTree(file.children, depth + 1)
        )}
      </div>
    ));
  };

  return (
    <div 
      ref={containerRef}
      className="grid h-full bg-[#0a0a0f] touch-manipulation" 
      style={{ 
        gridTemplateRows: 'auto 1fr',
        gridTemplateColumns: '1fr',
      }}
      data-testid="treaty-app"
    >
      {/* Header - full width with all controls (h-11 = 44px for touch) */}
      <header className="h-11 px-3 flex items-center justify-between gap-3 bg-[#12121a] border-b border-[#2a2a3a]">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Toggle - 36px touch target */}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-[#1a1a25] active:bg-[#2a2a3a] transition-colors cursor-pointer touch-manipulation"
            data-testid="btn-hamburger-menu"
          >
            <div className="flex flex-col gap-1">
              <div className={`w-4 h-0.5 bg-[#e8e8ff] transition-transform ${sidebarOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
              <div className={`w-4 h-0.5 bg-[#e8e8ff] transition-opacity ${sidebarOpen ? 'opacity-0' : ''}`} />
              <div className={`w-4 h-0.5 bg-[#e8e8ff] transition-transform ${sidebarOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
            </div>
          </button>
          
          {/* CloudPilot Logo */}
          <img src={cloudPilotLogo} alt="CloudPilot" className="h-6 w-auto" />
          
          {/* Games Button - h-9 for consistent touch target */}
          <button 
            className="flex items-center gap-2 px-3 h-9 rounded-lg bg-gradient-to-r from-[#8b5cf6]/20 to-[#e94560]/20 hover:from-[#8b5cf6]/30 hover:to-[#e94560]/30 active:from-[#8b5cf6]/40 active:to-[#e94560]/40 border border-[#8b5cf6]/30 transition-all cursor-pointer touch-manipulation"
            data-testid="btn-flip-games"
          >
            <Rocket className="w-4 h-4 text-[#e94560]" />
            <span className="text-xs font-medium text-[#e8e8ff]">Games</span>
          </button>
          
          <Badge className="bg-[#00ff88]/20 text-[#00ff88] text-[10px] hidden sm:flex">v2.0</Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1a1a25] active:bg-[#2a2a3a] transition-colors touch-manipulation" data-testid="btn-search">
            <Search className="w-4 h-4 text-[#8b8b9b]" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1a1a25] active:bg-[#2a2a3a] transition-colors touch-manipulation" data-testid="btn-notifications">
            <Bell className="w-4 h-4 text-[#8b8b9b]" />
          </button>
          <button className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#1a1a25] active:bg-[#2a2a3a] transition-colors touch-manipulation" data-testid="btn-settings">
            <Settings className="w-4 h-4 text-[#8b8b9b]" />
          </button>
        </div>
      </header>

      {/* Main Content Area - Edge to Edge */}
      <main 
        className="overflow-hidden relative"
        style={{
          display: 'grid',
          gridTemplateColumns: sidebarOpen ? '180px 1fr 160px' : '1fr',
          transition: 'grid-template-columns 200ms ease',
        }}
      >
        {/* Channel Sidebar - collapsible with consistent spacing */}
        {sidebarOpen && (
          <div className="bg-[#12121a] flex flex-col overflow-hidden" data-testid="channel-sidebar">
            <div className="h-11 px-3 flex items-center justify-between border-b border-[#2a2a3a]">
              <span className="font-medium text-sm text-[#e8e8ff]">{SERVERS.find(s => s.id === activeServer)?.name}</span>
              <ChevronDown className="w-4 h-4 text-[#8b8b9b]" />
            </div>

            <ScrollArea className="flex-1">
              <div className="p-3">
                {CHANNELS.filter(c => c.type === 'category').map(category => (
                  <div key={category.id} className="mb-4">
                    <div className="flex items-center gap-2 px-2 py-1.5 text-[10px] font-semibold text-[#8b8b9b] uppercase tracking-wide cursor-pointer hover:text-[#e8e8ff]">
                      <ChevronDown className="w-3 h-3" />
                      {category.name}
                    </div>
                    <div className="space-y-1">
                      {CHANNELS.filter(c => c.parentId === category.id).map(channel => (
                        <div
                          key={channel.id}
                          onClick={() => setActiveChannel(channel.id)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${activeChannel === channel.id ? 'bg-[#3a3a4a] text-white' : 'text-[#8b8b9b] hover:text-[#e8e8ff] hover:bg-[#1a1a25]'}`}
                          data-testid={`channel-${channel.id}`}
                        >
                          {channel.type === 'voice' ? <Volume2 className="w-4 h-4" /> : <Hash className="w-4 h-4" />}
                          <span className="text-sm">{channel.name}</span>
                          {channel.unread && <div className="w-2 h-2 rounded-full bg-white ml-auto" />}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Chat + Canvas with View Toggle - center column */}
        <div className="flex flex-col bg-[#1a1a25] overflow-hidden">
          <div className="h-11 px-3 flex items-center gap-3 border-b border-[#2a2a3a]">
            {/* View Toggle Tabs - consistent with header height */}
            <div className="flex items-center bg-[#0a0a0f] rounded-lg p-1">
              <button
                onClick={() => setActiveView('canvas')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeView === 'canvas' 
                    ? 'bg-[#8b5cf6] text-white' 
                    : 'text-[#8b8b9b] hover:text-white'
                }`}
                data-testid="tab-canvas"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Canvas
              </button>
              <button
                onClick={() => setActiveView('chat')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activeView === 'chat' 
                    ? 'bg-[#8b5cf6] text-white' 
                    : 'text-[#8b8b9b] hover:text-white'
                }`}
                data-testid="tab-chat"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Chat
              </button>
            </div>
            
            {activeView === 'chat' && (
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-[#8b8b9b]" />
                <span className="font-medium text-sm text-[#e8e8ff]">{activeChannel}</span>
              </div>
            )}
            {activeView === 'canvas' && (
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#8b5cf6]" />
                <span className="font-medium text-sm text-[#e8e8ff]">Live Canvas</span>
                <Badge className="bg-[#00ff88]/20 text-[#00ff88] text-[10px]">Multi-Panel</Badge>
              </div>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#2a2a3a] transition-colors" data-testid="btn-pin">
                <Pin className="w-4 h-4 text-[#8b8b9b]" />
              </button>
              <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#2a2a3a] transition-colors" data-testid="btn-users">
                <Users className="w-4 h-4 text-[#8b8b9b]" />
              </button>
            </div>
          </div>

          {/* Canvas View */}
          {activeView === 'canvas' && (
            <div className="flex-1 overflow-hidden">
              <LiveCanvas />
            </div>
          )}

          {/* Chat View */}
          {activeView === 'chat' && (
            <>
              <ScrollArea className="flex-1 p-3">
                <div className="space-y-3">
                  {messages.map(msg => (
                    <div key={msg.id} className="flex gap-2 hover:bg-[#1f1f2e] p-2 rounded -mx-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${msg.isAI ? 'bg-gradient-to-br from-[#8b5cf6] to-[#e94560]' : 'bg-[#3a3a4a]'}`}>
                        {msg.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium text-sm ${msg.isAI ? 'text-[#8b5cf6]' : 'text-[#e8e8ff]'}`}>{msg.author}</span>
                          {msg.isAI && <Badge className="bg-[#8b5cf6]/20 text-[#8b5cf6] text-[10px]">AI</Badge>}
                          <span className="text-[10px] text-[#8b8b9b]">{msg.timestamp.toLocaleTimeString()}</span>
                        </div>
                        <p className="text-sm text-[#c8c8d8] mt-0.5">{msg.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              <div className="p-3 border-t border-[#2a2a3a]">
                <div className="flex items-center gap-2 bg-[#2a2a3a] rounded-lg p-2">
                  <Plus className="w-4 h-4 text-[#8b8b9b] cursor-pointer hover:text-white" />
                  <Input
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={`Message #${activeChannel}`}
                    className="flex-1 bg-transparent border-0 text-[#e8e8ff] placeholder:text-[#8b8b9b] focus-visible:ring-0 h-7 text-sm"
                    data-testid="input-message"
                  />
                  <AtSign className="w-4 h-4 text-[#8b8b9b] cursor-pointer hover:text-white" />
                  <Bot className="w-4 h-4 text-[#8b5cf6] cursor-pointer hover:text-white" />
                  <Button size="sm" onClick={sendMessage} className="bg-[#8b5cf6] hover:bg-[#7c4dff] h-7 px-2" data-testid="btn-send">
                    <Send className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* AI Canvas Panel - only visible when sidebar open with consistent spacing */}
        {sidebarOpen && (
        <div className="bg-[#12121a] flex flex-col border-l border-[#2a2a3a] overflow-hidden">
          <div className="h-11 px-3 flex items-center justify-between border-b border-[#2a2a3a]">
            <span className="text-sm font-medium text-[#e8e8ff]">AI Canvas</span>
            <button className="w-8 h-8 flex items-center justify-center rounded hover:bg-[#2a2a3a] transition-colors" data-testid="btn-ai-deploy">
              <Rocket className="w-4 h-4 text-[#e94560]" />
            </button>
          </div>

          <div className="p-3 border-b border-[#2a2a3a]">
            <div className="flex items-center gap-2 mb-2">
              <Folder className="w-4 h-4 text-[#f59e0b]" />
              <span className="text-xs font-medium text-[#e8e8ff]">Project Files</span>
            </div>
            <div className="bg-[#0f0f18] rounded-lg p-2 max-h-32 overflow-auto">
              {renderFileTree(SAMPLE_FILES)}
            </div>
          </div>

          <div className="p-3 border-b border-[#2a2a3a]">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-[#00ff88]" />
              <span className="text-xs font-medium text-[#e8e8ff]">Dependencies</span>
            </div>
            <div className="space-y-1">
              {['react@18.2.0', 'typescript@5.0', 'vite@5.0'].map(pkg => (
                <div key={pkg} className="flex items-center justify-between px-2 py-1.5 bg-[#0f0f18] rounded-lg text-[11px]">
                  <span className="text-[#c8c8d8]">{pkg}</span>
                  <span className="text-[#00ff88]">ok</span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 flex-1">
            <Button 
              size="sm"
              className="w-full bg-gradient-to-r from-[#8b5cf6] to-[#e94560] hover:opacity-90 h-9 text-xs"
              data-testid="btn-deploy"
            >
              <Rocket className="w-4 h-4 mr-2" />
              Deploy
            </Button>
          </div>

          <div className="p-3 border-t border-[#2a2a3a]">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-[#8b5cf6]" />
              <div className="flex-1">
                <div className="text-xs font-medium text-[#8b5cf6]">AI Active</div>
              </div>
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            </div>
          </div>
        </div>
        )}

        {/* GrudgeOS Windows */}
        {windows.map(win => {
          const ToolComponent = TOOL_REGISTRY[win.component];
          return (
            <WindowShell 
              key={win.id} 
              window={win}
              containerBounds={containerRef.current ? { width: containerRef.current.offsetWidth, height: containerRef.current.offsetHeight } : undefined}
            >
              {ToolComponent ? <ToolComponent /> : <div className="p-4 text-[#8b8b9b]">Tool not found</div>}
            </WindowShell>
          );
        })}
      </main>

    </div>
  );
}

export function TreatyApp() {
  return (
    <WindowManagerProvider>
      <TreatyWorkspace />
    </WindowManagerProvider>
  );
}
