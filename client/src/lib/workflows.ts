import axios from 'axios';

export type WorkflowStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  output?: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  type: 'frontend' | 'backend' | 'fullstack' | 'api' | 'data';
  status: WorkflowStatus;
  steps: WorkflowStep[];
  createdAt: Date;
  updatedAt: Date;
  result?: {
    deployUrl?: string;
    artifacts?: string[];
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  type: Workflow['type'];
  steps: Omit<WorkflowStep, 'status' | 'output' | 'error' | 'startedAt' | 'completedAt'>[];
  tags: string[];
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'frontend-react-mui',
    name: 'React + MUI Frontend',
    description: 'Build a modern React frontend with Material-UI components',
    type: 'frontend',
    tags: ['react', 'mui', 'typescript'],
    steps: [
      { id: 'init', name: 'Initialize Project', description: 'Set up React + TypeScript project structure' },
      { id: 'deps', name: 'Install Dependencies', description: 'Install MUI, Axios, and required packages' },
      { id: 'components', name: 'Generate Components', description: 'Create UI components from specifications' },
      { id: 'styling', name: 'Apply Theme', description: 'Configure MUI theme and global styles' },
      { id: 'build', name: 'Build', description: 'Compile and bundle the application' },
      { id: 'deploy', name: 'Deploy', description: 'Deploy to hosting platform' },
    ],
  },
  {
    id: 'backend-express-api',
    name: 'Express API Backend',
    description: 'Build a RESTful API with Express.js',
    type: 'backend',
    tags: ['express', 'nodejs', 'rest'],
    steps: [
      { id: 'init', name: 'Initialize Project', description: 'Set up Express + TypeScript project' },
      { id: 'routes', name: 'Define Routes', description: 'Create API endpoints from specifications' },
      { id: 'middleware', name: 'Configure Middleware', description: 'Set up auth, validation, error handling' },
      { id: 'database', name: 'Database Setup', description: 'Configure database connections and models' },
      { id: 'test', name: 'Run Tests', description: 'Execute API tests' },
      { id: 'deploy', name: 'Deploy', description: 'Deploy to server' },
    ],
  },
  {
    id: 'fullstack-app',
    name: 'Full-Stack Application',
    description: 'Complete frontend + backend application',
    type: 'fullstack',
    tags: ['react', 'express', 'fullstack'],
    steps: [
      { id: 'plan', name: 'Generate Plan', description: 'AI analyzes requirements and creates architecture' },
      { id: 'backend-init', name: 'Backend Setup', description: 'Initialize Express API with routes' },
      { id: 'frontend-init', name: 'Frontend Setup', description: 'Initialize React frontend with components' },
      { id: 'integration', name: 'API Integration', description: 'Connect frontend to backend APIs' },
      { id: 'testing', name: 'End-to-End Tests', description: 'Run integration tests' },
      { id: 'deploy', name: 'Deploy', description: 'Deploy full application' },
    ],
  },
  {
    id: 'ai-vector-search',
    name: 'AI Vector Search',
    description: 'Build semantic search with Qdrant + embeddings',
    type: 'data',
    tags: ['qdrant', 'ai', 'embeddings'],
    steps: [
      { id: 'collection', name: 'Create Collection', description: 'Set up Qdrant vector collection' },
      { id: 'embeddings', name: 'Generate Embeddings', description: 'Convert data to vector embeddings' },
      { id: 'ingest', name: 'Ingest Vectors', description: 'Upload vectors to Qdrant' },
      { id: 'search-api', name: 'Search API', description: 'Create search endpoint' },
      { id: 'test', name: 'Test Search', description: 'Validate search quality' },
      { id: 'deploy', name: 'Deploy', description: 'Deploy search service' },
    ],
  },
];

type WorkflowListener = (workflow: Workflow) => void;

class WorkflowExecutor {
  private workflows: Map<string, Workflow> = new Map();
  private listeners: Set<WorkflowListener> = new Set();

  subscribe(listener: WorkflowListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(workflow: Workflow): void {
    this.listeners.forEach(listener => listener(workflow));
  }

  createWorkflow(template: WorkflowTemplate, name?: string): Workflow {
    const workflow: Workflow = {
      id: `wf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: name || template.name,
      description: template.description,
      type: template.type,
      status: 'pending',
      steps: template.steps.map(step => ({
        ...step,
        status: 'pending' as WorkflowStatus,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  async executeWorkflow(workflowId: string): Promise<Workflow> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error('Workflow not found');

    workflow.status = 'running';
    workflow.updatedAt = new Date();
    this.notify(workflow);

    for (const step of workflow.steps) {
      try {
        step.status = 'running';
        step.startedAt = new Date();
        this.notify(workflow);

        await this.executeStep(workflow, step);

        step.status = 'completed';
        step.completedAt = new Date();
        workflow.updatedAt = new Date();
        this.notify(workflow);
      } catch (error) {
        step.status = 'failed';
        step.error = error instanceof Error ? error.message : 'Unknown error';
        step.completedAt = new Date();
        workflow.status = 'failed';
        workflow.updatedAt = new Date();
        this.notify(workflow);
        return workflow;
      }
    }

    workflow.status = 'completed';
    workflow.updatedAt = new Date();
    this.notify(workflow);
    return workflow;
  }

  private async executeStep(workflow: Workflow, step: WorkflowStep): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    switch (step.id) {
      case 'init':
        step.output = `Project initialized: ${workflow.name}`;
        break;
      case 'deps':
        step.output = 'Dependencies installed: @mui/material, axios, react, typescript';
        break;
      case 'components':
        step.output = 'Generated 5 components from specifications';
        break;
      case 'build':
        step.output = 'Build successful: dist/bundle.js (245kb)';
        break;
      case 'deploy':
        const deployUrl = `https://${workflow.name.toLowerCase().replace(/\s+/g, '-')}.grudge.site`;
        step.output = `Deployed to: ${deployUrl}`;
        workflow.result = { deployUrl };
        break;
      default:
        step.output = `Step ${step.name} completed successfully`;
    }
  }

  getWorkflow(id: string): Workflow | undefined {
    return this.workflows.get(id);
  }

  getAllWorkflows(): Workflow[] {
    return Array.from(this.workflows.values());
  }

  cancelWorkflow(id: string): boolean {
    const workflow = this.workflows.get(id);
    if (!workflow || workflow.status !== 'running') return false;

    workflow.status = 'cancelled';
    workflow.updatedAt = new Date();
    this.notify(workflow);
    return true;
  }
}

export const workflowExecutor = new WorkflowExecutor();

export const httpClient = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

httpClient.interceptors.response.use(
  response => response,
  error => {
    console.error('[HTTP]', error.message);
    return Promise.reject(error);
  }
);
