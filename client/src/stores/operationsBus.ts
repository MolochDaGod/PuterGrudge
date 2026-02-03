import { create } from 'zustand';

export interface Operation {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  startedAt: Date;
  completedAt?: Date;
  logs: string[];
  result?: any;
  error?: string;
  category: 'deploy' | 'ai' | 'build' | 'sync' | 'agent' | 'system';
}

interface OperationsBusState {
  operations: Operation[];
  isPanelOpen: boolean;
  
  addOperation: (op: Omit<Operation, 'id' | 'startedAt' | 'logs' | 'progress' | 'status'>) => string;
  updateOperation: (id: string, updates: Partial<Operation>) => void;
  appendLog: (id: string, message: string) => void;
  setProgress: (id: string, progress: number) => void;
  completeOperation: (id: string, result?: any) => void;
  failOperation: (id: string, error: string) => void;
  cancelOperation: (id: string) => void;
  removeOperation: (id: string) => void;
  clearCompleted: () => void;
  togglePanel: () => void;
  setPanel: (open: boolean) => void;
}

export const useOperationsBus = create<OperationsBusState>((set, get) => ({
  operations: [],
  isPanelOpen: true,

  addOperation: (op) => {
    const id = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const operation: Operation = {
      ...op,
      id,
      status: 'pending',
      progress: 0,
      startedAt: new Date(),
      logs: [`[${new Date().toLocaleTimeString()}] Operation started: ${op.name}`],
    };
    set(state => ({ operations: [operation, ...state.operations] }));
    return id;
  },

  updateOperation: (id, updates) => {
    set(state => ({
      operations: state.operations.map(op =>
        op.id === id ? { ...op, ...updates } : op
      )
    }));
  },

  appendLog: (id, message) => {
    const timestamp = new Date().toLocaleTimeString();
    set(state => ({
      operations: state.operations.map(op =>
        op.id === id
          ? { ...op, logs: [...op.logs, `[${timestamp}] ${message}`] }
          : op
      )
    }));
  },

  setProgress: (id, progress) => {
    set(state => ({
      operations: state.operations.map(op =>
        op.id === id ? { ...op, progress: Math.min(100, Math.max(0, progress)), status: 'running' } : op
      )
    }));
  },

  completeOperation: (id, result) => {
    const timestamp = new Date().toLocaleTimeString();
    set(state => ({
      operations: state.operations.map(op =>
        op.id === id
          ? {
              ...op,
              status: 'completed',
              progress: 100,
              completedAt: new Date(),
              result,
              logs: [...op.logs, `[${timestamp}] Operation completed successfully`]
            }
          : op
      )
    }));
  },

  failOperation: (id, error) => {
    const timestamp = new Date().toLocaleTimeString();
    set(state => ({
      operations: state.operations.map(op =>
        op.id === id
          ? {
              ...op,
              status: 'failed',
              completedAt: new Date(),
              error,
              logs: [...op.logs, `[${timestamp}] ERROR: ${error}`]
            }
          : op
      )
    }));
  },

  cancelOperation: (id) => {
    const timestamp = new Date().toLocaleTimeString();
    set(state => ({
      operations: state.operations.map(op =>
        op.id === id
          ? {
              ...op,
              status: 'cancelled',
              completedAt: new Date(),
              logs: [...op.logs, `[${timestamp}] Operation cancelled`]
            }
          : op
      )
    }));
  },

  removeOperation: (id) => {
    set(state => ({
      operations: state.operations.filter(op => op.id !== id)
    }));
  },

  clearCompleted: () => {
    set(state => ({
      operations: state.operations.filter(op => 
        op.status !== 'completed' && op.status !== 'failed' && op.status !== 'cancelled'
      )
    }));
  },

  togglePanel: () => {
    set(state => ({ isPanelOpen: !state.isPanelOpen }));
  },

  setPanel: (open) => {
    set({ isPanelOpen: open });
  },
}));

export function getOverallProgress(operations: Operation[]): number {
  const active = operations.filter(op => op.status === 'running' || op.status === 'pending');
  if (active.length === 0) return 100;
  return Math.round(active.reduce((sum, op) => sum + op.progress, 0) / active.length);
}

export function getCategoryIcon(category: Operation['category']): string {
  switch (category) {
    case 'deploy': return '🚀';
    case 'ai': return '🤖';
    case 'build': return '🔨';
    case 'sync': return '🔄';
    case 'agent': return '🕵️';
    case 'system': return '⚙️';
    default: return '📋';
  }
}
