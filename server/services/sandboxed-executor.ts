import type { Request, Response } from 'express';
import { z } from 'zod';

export const executeCodeSchema = z.object({
  code: z.string().min(1).max(100000),
  language: z.enum(['javascript']),
  timeout: z.number().int().min(100).max(30000).default(5000),
  context: z.record(z.any()).optional(),
});

export const executionResultSchema = z.object({
  id: z.string(),
  status: z.enum(['success', 'error', 'timeout']),
  output: z.any().optional(),
  logs: z.array(z.string()),
  error: z.string().optional(),
  executionTime: z.number(),
});

export type ExecuteCode = z.infer<typeof executeCodeSchema>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;

interface ComputePod {
  id: string;
  status: 'idle' | 'warming' | 'busy' | 'cooling' | 'terminated';
  runtime: 'node' | 'wasm';
  currentJob: string | null;
  stats: {
    jobsCompleted: number;
    jobsFailed: number;
    totalCpuMs: number;
    uptime: number;
  };
  createdAt: Date;
}

class SandboxedExecutorService {
  private pods: Map<string, ComputePod> = new Map();
  private executions: Map<string, ExecutionResult> = new Map();
  private pythonShell: any = null;

  constructor() {
    this.initializePods();
  }

  private initializePods() {
    const runtimes: ComputePod['runtime'][] = ['node', 'wasm'];
    
    runtimes.forEach((runtime, index) => {
      const pod: ComputePod = {
        id: `pod_${runtime}_${index}`,
        status: 'idle',
        runtime,
        currentJob: null,
        stats: {
          jobsCompleted: 0,
          jobsFailed: 0,
          totalCpuMs: 0,
          uptime: 0,
        },
        createdAt: new Date(),
      };
      this.pods.set(pod.id, pod);
    });
    
    console.log('[SandboxedExecutor] Initialized with', this.pods.size, 'secure QuickJS pods');
  }

  async executeJavaScript(code: string, context: Record<string, any> = {}, timeout: number = 5000): Promise<ExecutionResult> {
    const execId = `exec_js_${Date.now()}`;
    const consoleLogs: string[] = [];
    const startTime = Date.now();
    
    const pod = this.getAvailablePod('node');
    if (!pod) {
      return {
        id: execId,
        status: 'error',
        logs: consoleLogs,
        error: 'No available compute pods',
        executionTime: 0,
      };
    }
    
    pod.status = 'busy';
    pod.currentJob = execId;

    try {
      const quickjsModule = await import('@tootallnate/quickjs-emscripten');
      const getQuickJS = quickjsModule.getQuickJS || quickjsModule.default?.getQuickJS;
      
      if (!getQuickJS) {
        throw new Error('QuickJS not available - falling back to restricted execution');
      }
      
      const QuickJS = await getQuickJS();
      const vm = QuickJS.newContext();
      
      const consoleHandle = vm.newObject();
      const logFn = vm.newFunction('log', (...args: any[]) => {
        const message = args.map((arg: any) => {
          try {
            const str = vm.getString(arg);
            return str;
          } catch {
            return String(arg);
          }
        }).join(' ');
        consoleLogs.push(message);
      });
      vm.setProp(consoleHandle, 'log', logFn);
      vm.setProp(consoleHandle, 'warn', logFn);
      vm.setProp(consoleHandle, 'error', logFn);
      vm.setProp(consoleHandle, 'info', logFn);
      logFn.dispose();
      
      vm.setProp(vm.global, 'console', consoleHandle);
      consoleHandle.dispose();
      
      if (context && Object.keys(context).length > 0) {
        const contextHandle = vm.newObject();
        for (const [key, value] of Object.entries(context)) {
          if (typeof value === 'string') {
            const strHandle = vm.newString(value);
            vm.setProp(contextHandle, key, strHandle);
            strHandle.dispose();
          } else if (typeof value === 'number') {
            const numHandle = vm.newNumber(value);
            vm.setProp(contextHandle, key, numHandle);
            numHandle.dispose();
          } else if (typeof value === 'boolean') {
            vm.setProp(contextHandle, key, value ? vm.true : vm.false);
          }
        }
        vm.setProp(vm.global, 'context', contextHandle);
        contextHandle.dispose();
      }
      
      vm.runtime.setInterruptHandler(() => {
        return Date.now() - startTime > timeout;
      });
      
      // If code contains 'return' statement, wrap it in an IIFE for convenience
      let wrappedCode = code;
      if (code.includes('return ') && !code.includes('function')) {
        wrappedCode = `(function() { ${code} })()`;
      }
      
      const evalResult = vm.evalCode(wrappedCode);
      
      let output: any;
      if (evalResult.error) {
        const errorObj = vm.dump(evalResult.error);
        evalResult.error.dispose();
        throw new Error(String(errorObj));
      } else {
        output = vm.dump(evalResult.value);
        evalResult.value.dispose();
      }
      
      vm.dispose();
      
      pod.status = 'idle';
      pod.currentJob = null;
      pod.stats.jobsCompleted++;
      pod.stats.totalCpuMs += Date.now() - startTime;

      const execResult: ExecutionResult = {
        id: execId,
        status: 'success',
        output,
        logs: consoleLogs,
        executionTime: Date.now() - startTime,
      };
      
      this.executions.set(execId, execResult);
      return execResult;

    } catch (e: any) {
      pod.status = 'idle';
      pod.currentJob = null;
      pod.stats.jobsFailed++;
      
      const isTimeout = e.message?.includes('interrupt') || Date.now() - startTime > timeout;

      const execResult: ExecutionResult = {
        id: execId,
        status: isTimeout ? 'timeout' : 'error',
        logs: consoleLogs,
        error: e.message,
        executionTime: Date.now() - startTime,
      };
      
      this.executions.set(execId, execResult);
      return execResult;
    }
  }

  private getAvailablePod(runtime: ComputePod['runtime']): ComputePod | null {
    const pods = Array.from(this.pods.values());
    for (const pod of pods) {
      if (pod.runtime === runtime && pod.status === 'idle') {
        return pod;
      }
    }
    return null;
  }

  getPods(): ComputePod[] {
    return Array.from(this.pods.values());
  }

  getPod(id: string): ComputePod | undefined {
    return this.pods.get(id);
  }

  getExecution(id: string): ExecutionResult | undefined {
    return this.executions.get(id);
  }

  getRecentExecutions(limit: number = 20): ExecutionResult[] {
    return Array.from(this.executions.values()).slice(-limit);
  }
}

export const sandboxedExecutorService = new SandboxedExecutorService();

export function registerSandboxedExecutorRoutes(app: any) {
  app.get('/api/v1/execute', (_req: Request, res: Response) => {
    res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST to execute code.',
      usage: {
        method: 'POST',
        body: {
          code: 'string (required) - JavaScript code to execute',
          language: 'javascript (required)',
          timeout: 'number (optional) - max execution time in ms',
          context: 'object (optional) - variables to inject'
        }
      }
    });
  });

  app.post('/api/v1/execute', async (req: Request, res: Response) => {
    try {
      const parsed = executeCodeSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: 'Validation error', 
          details: parsed.error.issues 
        });
      }

      const { code, language, timeout, context } = parsed.data;
      
      const result = await sandboxedExecutorService.executeJavaScript(code, context, timeout);
      res.json({ success: true, result });
    } catch (e: any) {
      res.status(500).json({ success: false, error: e.message });
    }
  });

  app.get('/api/v1/pods', (_req: Request, res: Response) => {
    res.json({ success: true, pods: sandboxedExecutorService.getPods() });
  });

  app.get('/api/v1/pods/:id', (req: Request, res: Response) => {
    const pod = sandboxedExecutorService.getPod(req.params.id);
    if (!pod) {
      return res.status(404).json({ success: false, error: 'Pod not found' });
    }
    res.json({ success: true, pod });
  });

  app.get('/api/v1/executions', (_req: Request, res: Response) => {
    const limit = parseInt(String(_req.query.limit)) || 20;
    res.json({ success: true, executions: sandboxedExecutorService.getRecentExecutions(limit) });
  });

  app.get('/api/v1/executions/:id', (req: Request, res: Response) => {
    const execution = sandboxedExecutorService.getExecution(req.params.id);
    if (!execution) {
      return res.status(404).json({ success: false, error: 'Execution not found' });
    }
    res.json({ success: true, execution });
  });

  console.log('[SandboxedExecutor] Routes registered');
}
