import { useOperationsBus, getOverallProgress, type Operation } from '@/stores/operationsBus';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  X, 
  ChevronRight, 
  ChevronDown, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Clock,
  Rocket,
  Bot,
  Hammer,
  RefreshCw,
  User,
  Settings
} from 'lucide-react';
import { useState } from 'react';

const CATEGORY_ICONS: Record<Operation['category'], typeof Rocket> = {
  deploy: Rocket,
  ai: Bot,
  build: Hammer,
  sync: RefreshCw,
  agent: User,
  system: Settings,
};

const STATUS_CONFIG: Record<Operation['status'], { color: string; icon: typeof CheckCircle2 }> = {
  pending: { color: 'bg-yellow-500', icon: Clock },
  running: { color: 'bg-blue-500', icon: Loader2 },
  completed: { color: 'bg-green-500', icon: CheckCircle2 },
  failed: { color: 'bg-red-500', icon: XCircle },
  cancelled: { color: 'bg-gray-500', icon: XCircle },
};

function OperationCard({ operation }: { operation: Operation }) {
  const [isExpanded, setIsExpanded] = useState(operation.status === 'running');
  const { cancelOperation, removeOperation } = useOperationsBus();
  
  const CategoryIcon = CATEGORY_ICONS[operation.category];
  const StatusIcon = STATUS_CONFIG[operation.status].icon;
  const statusColor = STATUS_CONFIG[operation.status].color;
  
  return (
    <Card className="p-3 mb-2 bg-background/80" data-testid={`operation-card-${operation.id}`}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <div className="flex items-center gap-2">
          <CollapsibleTrigger asChild data-testid={`trigger-expand-${operation.id}`}>
            <Button variant="ghost" size="icon" className="h-6 w-6" data-testid={`button-expand-${operation.id}`}>
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </CollapsibleTrigger>
          
          <CategoryIcon className="h-4 w-4 text-muted-foreground" />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium truncate text-sm">{operation.name}</span>
              <Badge variant="outline" className="text-xs">
                {operation.category}
              </Badge>
            </div>
            {operation.status === 'running' && (
              <Progress value={operation.progress} className="h-1 mt-1" />
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{operation.progress}%</span>
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
            <StatusIcon className={`h-4 w-4 ${operation.status === 'running' ? 'animate-spin' : ''}`} />
          </div>
          
          {(operation.status === 'running' || operation.status === 'pending') && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => cancelOperation(operation.id)}
              data-testid={`button-cancel-${operation.id}`}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
          
          {(operation.status === 'completed' || operation.status === 'failed' || operation.status === 'cancelled') && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6"
              onClick={() => removeOperation(operation.id)}
              data-testid={`button-remove-${operation.id}`}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
        
        <CollapsibleContent>
          <div className="mt-2 pl-8">
            <p className="text-xs text-muted-foreground mb-2">{operation.description}</p>
            
            {operation.logs.length > 0 && (
              <ScrollArea className="h-24 rounded border bg-muted/50 p-2">
                <div className="font-mono text-xs space-y-0.5">
                  {operation.logs.slice(-10).map((log, i) => (
                    <div key={i} className="text-muted-foreground">{log}</div>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            {operation.error && (
              <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                <p className="text-xs text-red-500">{operation.error}</p>
              </div>
            )}
            
            {operation.result && (
              <div className="mt-2 p-2 rounded bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-500">
                  {typeof operation.result === 'string' ? operation.result : JSON.stringify(operation.result)}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

export function OperationsPanel() {
  const { operations, isPanelOpen, togglePanel, clearCompleted } = useOperationsBus();
  const overallProgress = getOverallProgress(operations);
  const activeCount = operations.filter(op => op.status === 'running' || op.status === 'pending').length;
  const completedCount = operations.filter(op => op.status === 'completed').length;
  const failedCount = operations.filter(op => op.status === 'failed').length;
  
  if (!isPanelOpen) {
    return (
      <div 
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50"
        data-testid="operations-panel-collapsed"
      >
        <Button
          variant="outline"
          className="rounded-l-lg rounded-r-none h-24 w-8 flex flex-col items-center justify-center gap-1 bg-background/95 backdrop-blur"
          onClick={togglePanel}
          data-testid="button-open-operations"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          {activeCount > 0 && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs">{overallProgress}%</span>
            </>
          )}
          {activeCount === 0 && completedCount > 0 && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
          {failedCount > 0 && (
            <XCircle className="h-4 w-4 text-red-500" />
          )}
        </Button>
      </div>
    );
  }
  
  return (
    <div 
      className="fixed right-0 top-0 h-full w-80 bg-background/95 backdrop-blur border-l shadow-lg z-50 flex flex-col"
      data-testid="operations-panel"
    >
      <div className="p-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          <span className="font-semibold">Operations</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeCount} active
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(completedCount > 0 || failedCount > 0) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCompleted}
              data-testid="button-clear-completed"
            >
              Clear
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={togglePanel}
            data-testid="button-close-operations"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {activeCount > 0 && (
        <div className="p-3 border-b">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-medium" data-testid="text-overall-progress">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} data-testid="progress-overall" />
        </div>
      )}
      
      <ScrollArea className="flex-1 p-3">
        {operations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Settings className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No operations</p>
            <p className="text-xs">Operations will appear here</p>
          </div>
        ) : (
          operations.map(op => (
            <OperationCard key={op.id} operation={op} />
          ))
        )}
      </ScrollArea>
      
      <div className="p-3 border-t text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span data-testid="text-total-ops">Total: {operations.length}</span>
          <span>
            <span className="text-green-500" data-testid="text-completed-count">{completedCount}</span>
            {' / '}
            <span className="text-red-500" data-testid="text-failed-count">{failedCount}</span>
            {' / '}
            <span className="text-blue-500" data-testid="text-active-count">{activeCount}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
