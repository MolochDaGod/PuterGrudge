import { useState, useCallback } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Code, 
  Bot, 
  Terminal, 
  FolderTree, 
  Settings, 
  Play,
  Plus,
  X,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { OperationsPanel } from './OperationsPanel';
import { useOperationsBus } from '@/stores/operationsBus';
import { VSCodeShell } from './VSCodeShell';
import { AIConsole } from './AIConsole';

interface DockTab {
  id: string;
  title: string;
  icon: typeof Code;
  component: 'editor' | 'ai' | 'terminal' | 'files';
  filePath?: string;
}

export function GrudgeDock() {
  const [tabs, setTabs] = useState<DockTab[]>([
    { id: 'editor-1', title: 'Welcome.md', icon: Code, component: 'editor', filePath: '/welcome.md' },
    { id: 'ai-1', title: 'AI Assistant', icon: Bot, component: 'ai' },
  ]);
  const [activeTab, setActiveTab] = useState('editor-1');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMaximized, setIsMaximized] = useState(false);
  const { isPanelOpen, togglePanel, operations } = useOperationsBus();
  
  const activeOps = operations.filter(op => op.status === 'running' || op.status === 'pending').length;
  
  const addTab = useCallback((type: DockTab['component'], title?: string, filePath?: string) => {
    const icons: Record<DockTab['component'], typeof Code> = {
      editor: Code,
      ai: Bot,
      terminal: Terminal,
      files: FolderTree,
    };
    const id = `${type}-${Date.now()}`;
    const newTab: DockTab = {
      id,
      title: title || type.charAt(0).toUpperCase() + type.slice(1),
      icon: icons[type],
      component: type,
      filePath,
    };
    setTabs(prev => [...prev, newTab]);
    setActiveTab(id);
  }, []);
  
  const closeTab = useCallback((id: string) => {
    setTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (activeTab === id && filtered.length > 0) {
        setActiveTab(filtered[filtered.length - 1].id);
      }
      return filtered;
    });
  }, [activeTab]);
  
  const renderTabContent = (tab: DockTab) => {
    switch (tab.component) {
      case 'editor':
        return <VSCodeShell filePath={tab.filePath} />;
      case 'ai':
        return <AIConsole />;
      case 'terminal':
        return (
          <div className="h-full bg-black p-4 font-mono text-sm text-green-400">
            <p>GrudgeOS Terminal v1.0</p>
            <p className="text-muted-foreground">Type 'help' for commands</p>
            <div className="flex items-center gap-2 mt-4">
              <span className="text-cyan-400">guest@grudgeos</span>
              <span className="text-white">:</span>
              <span className="text-blue-400">~</span>
              <span className="text-white">$</span>
              <span className="animate-pulse">_</span>
            </div>
          </div>
        );
      case 'files':
        return (
          <div className="h-full p-4">
            <p className="text-muted-foreground">File browser connected to Puter filesystem</p>
          </div>
        );
      default:
        return null;
    }
  };
  
  return (
    <div 
      className={`flex flex-col bg-background ${isMaximized ? 'fixed inset-0 z-40' : 'h-full'}`}
      data-testid="grudge-dock"
    >
      <div className="flex items-center justify-between h-10 px-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            data-testid="button-toggle-sidebar"
          >
            {sidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
          <span className="font-semibold text-sm">GrudgeOS Studio</span>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addTab('editor', 'Untitled')}
            data-testid="button-new-file"
          >
            <Plus className="h-4 w-4 mr-1" />
            File
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addTab('ai', 'AI Chat')}
            data-testid="button-new-ai"
          >
            <Bot className="h-4 w-4 mr-1" />
            AI
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addTab('terminal', 'Terminal')}
            data-testid="button-new-terminal"
          >
            <Terminal className="h-4 w-4 mr-1" />
            Term
          </Button>
          
          <div className="w-px h-4 bg-border mx-2" />
          
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsMaximized(!isMaximized)}
            data-testid="button-maximize"
          >
            {isMaximized ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          
          <Button
            variant={isPanelOpen ? 'secondary' : 'ghost'}
            size="sm"
            onClick={togglePanel}
            data-testid="button-toggle-ops"
          >
            <Settings className="h-4 w-4 mr-1" />
            Ops
            {activeOps > 0 && (
              <Badge variant="default" className="ml-1 h-5 px-1.5" data-testid="badge-ops-count">
                {activeOps}
              </Badge>
            )}
          </Button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {sidebarOpen && (
            <>
              <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
                <div className="h-full flex flex-col bg-muted/30">
                  <div className="p-2 border-b">
                    <span className="text-xs font-medium text-muted-foreground uppercase">Explorer</span>
                  </div>
                  <ScrollArea className="flex-1 p-2">
                    <div className="space-y-1" data-testid="explorer-folder-list">
                      <div className="flex items-center gap-2 px-2 py-1 rounded hover-elevate cursor-pointer" data-testid="folder-grudge-core">
                        <FolderTree className="h-4 w-4" />
                        <span className="text-sm" data-testid="text-folder-grudge-core">grudge-core/</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1 rounded hover-elevate cursor-pointer" data-testid="folder-grudge-workers">
                        <FolderTree className="h-4 w-4" />
                        <span className="text-sm" data-testid="text-folder-grudge-workers">grudge-workers/</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1 rounded hover-elevate cursor-pointer" data-testid="folder-grudge-ai">
                        <FolderTree className="h-4 w-4" />
                        <span className="text-sm" data-testid="text-folder-grudge-ai">grudge-ai/</span>
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1 rounded hover-elevate cursor-pointer" data-testid="folder-grudge-users">
                        <FolderTree className="h-4 w-4" />
                        <span className="text-sm" data-testid="text-folder-grudge-users">grudge-users/</span>
                      </div>
                    </div>
                  </ScrollArea>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle data-testid="handle-sidebar-resize" />
            </>
          )}
          
          <ResizablePanel defaultSize={isPanelOpen ? 60 : 80}>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
              <div className="border-b bg-muted/20">
                <ScrollArea className="w-full">
                  <TabsList className="h-9 bg-transparent rounded-none p-0 gap-0">
                    {tabs.map(tab => (
                      <TabsTrigger
                        key={tab.id}
                        value={tab.id}
                        className="relative h-9 rounded-none border-r px-3 data-[state=active]:bg-background"
                        data-testid={`tab-trigger-${tab.id}`}
                      >
                        <tab.icon className="h-3.5 w-3.5 mr-1.5" />
                        <span className="text-xs">{tab.title}</span>
                        <button
                          className="ml-2 h-4 w-4 rounded-sm hover:bg-muted flex items-center justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            closeTab(tab.id);
                          }}
                          data-testid={`button-close-tab-${tab.id}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>
              </div>
              
              <div className="flex-1 overflow-hidden">
                {tabs.map(tab => (
                  <TabsContent key={tab.id} value={tab.id} className="h-full m-0 data-[state=inactive]:hidden">
                    {renderTabContent(tab)}
                  </TabsContent>
                ))}
              </div>
            </Tabs>
          </ResizablePanel>
        </ResizablePanelGroup>
        
        <OperationsPanel />
      </div>
    </div>
  );
}
