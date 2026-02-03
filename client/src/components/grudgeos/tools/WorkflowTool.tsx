import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Play, CheckCircle, XCircle, Clock, Loader2, Rocket, 
  Code, Server, Database, Layers, ChevronRight, ExternalLink
} from 'lucide-react';
import { 
  WORKFLOW_TEMPLATES, 
  workflowExecutor, 
  Workflow, 
  WorkflowTemplate, 
  WorkflowStatus 
} from '@/lib/workflows';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  frontend: <Code className="w-4 h-4" />,
  backend: <Server className="w-4 h-4" />,
  fullstack: <Layers className="w-4 h-4" />,
  api: <Server className="w-4 h-4" />,
  data: <Database className="w-4 h-4" />,
};

const STATUS_STYLES: Record<WorkflowStatus, { color: string; icon: React.ReactNode }> = {
  pending: { color: '#8b8b9b', icon: <Clock className="w-3 h-3" /> },
  running: { color: '#3b82f6', icon: <Loader2 className="w-3 h-3 animate-spin" /> },
  completed: { color: '#00ff88', icon: <CheckCircle className="w-3 h-3" /> },
  failed: { color: '#e94560', icon: <XCircle className="w-3 h-3" /> },
  cancelled: { color: '#f59e0b', icon: <XCircle className="w-3 h-3" /> },
};

export function WorkflowTool() {
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [workflowName, setWorkflowName] = useState('');

  useEffect(() => {
    setWorkflows(workflowExecutor.getAllWorkflows());
    
    const unsubscribe = workflowExecutor.subscribe(workflow => {
      setWorkflows(workflowExecutor.getAllWorkflows());
    });

    return unsubscribe;
  }, []);

  const startWorkflow = async (template: WorkflowTemplate) => {
    const name = workflowName.trim() || template.name;
    const workflow = workflowExecutor.createWorkflow(template, name);
    setWorkflows(workflowExecutor.getAllWorkflows());
    setWorkflowName('');
    setSelectedTemplate(null);
    
    workflowExecutor.executeWorkflow(workflow.id);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 p-3 border-b border-[#2a2a3a]">
        <Rocket className="w-4 h-4 text-[#8b5cf6]" />
        <span className="text-sm font-medium text-[#e8e8ff]">Workflow Engine</span>
        <Badge className="bg-[#00ff88]/20 text-[#00ff88] text-[10px]">{workflows.length} active</Badge>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Templates Panel */}
        <div className="w-1/2 border-r border-[#2a2a3a] flex flex-col">
          <div className="p-2 border-b border-[#2a2a3a]">
            <span className="text-xs font-medium text-[#8b8b9b]">TEMPLATES</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {WORKFLOW_TEMPLATES.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id 
                      ? 'bg-[#8b5cf6]/20 border border-[#8b5cf6]/50' 
                      : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="text-[#8b5cf6]">{TYPE_ICONS[template.type]}</div>
                    <span className="text-sm text-[#e8e8ff]">{template.name}</span>
                  </div>
                  <p className="text-[10px] text-[#8b8b9b] mt-1 ml-6">{template.description}</p>
                  <div className="flex gap-1 mt-1 ml-6">
                    {template.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="border-[#2a2a3a] text-[#8b8b9b] text-[8px] px-1">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {selectedTemplate && (
            <div className="p-2 border-t border-[#2a2a3a] bg-[#0f0f18]">
              <Input
                value={workflowName}
                onChange={e => setWorkflowName(e.target.value)}
                placeholder={selectedTemplate.name}
                className="mb-2 bg-[#1a1a25] border-[#2a2a3a] h-7 text-sm"
              />
              <Button 
                onClick={() => startWorkflow(selectedTemplate)}
                className="w-full bg-[#8b5cf6] hover:bg-[#7c4dff] h-7 text-xs"
              >
                <Play className="w-3 h-3 mr-1" />
                Start Workflow
              </Button>
            </div>
          )}
        </div>

        {/* Active Workflows Panel */}
        <div className="w-1/2 flex flex-col">
          <div className="p-2 border-b border-[#2a2a3a]">
            <span className="text-xs font-medium text-[#8b8b9b]">ACTIVE WORKFLOWS</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-2">
              {workflows.length === 0 ? (
                <div className="text-center py-8 text-[#8b8b9b] text-xs">
                  No active workflows.<br />Select a template to start.
                </div>
              ) : (
                workflows.map(workflow => (
                  <div key={workflow.id} className="p-2 bg-[#1a1a25] rounded">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="text-[#8b5cf6]">{TYPE_ICONS[workflow.type]}</div>
                      <span className="text-sm text-[#e8e8ff] flex-1">{workflow.name}</span>
                      <div style={{ color: STATUS_STYLES[workflow.status].color }} className="flex items-center gap-1">
                        {STATUS_STYLES[workflow.status].icon}
                        <span className="text-[10px]">{workflow.status}</span>
                      </div>
                    </div>
                    
                    <div className="space-y-0.5">
                      {workflow.steps.map((step, i) => (
                        <div key={step.id} className="flex items-center gap-2 text-[10px]">
                          <div style={{ color: STATUS_STYLES[step.status].color }}>
                            {STATUS_STYLES[step.status].icon}
                          </div>
                          <span className={step.status === 'running' ? 'text-[#e8e8ff]' : 'text-[#8b8b9b]'}>
                            {step.name}
                          </span>
                          {step.output && step.status === 'completed' && (
                            <span className="text-[#00ff88] ml-auto truncate max-w-[120px]">{step.output}</span>
                          )}
                        </div>
                      ))}
                    </div>

                    {workflow.result?.deployUrl && (
                      <a
                        href={workflow.result.deployUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 mt-2 text-[10px] text-[#00ff88] hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" />
                        {workflow.result.deployUrl}
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
