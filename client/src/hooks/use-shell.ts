import { useState, useEffect, useCallback, useRef } from 'react';

interface ShellConfig {
  type: string;
  name: string;
  executionContext?: string;
  inputSources?: string[];
  outputDestinations?: string[];
  backingService?: string;
  metadata?: Record<string, unknown>;
}

interface StreamEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  raw: unknown;
  streamId: string;
  source: string;
  channel: string;
}

interface ShellInstance {
  shell: {
    id: string;
    type: string;
    name: string;
    status: string;
  };
  streams: {
    stdout: { id: string };
    stderr: { id: string };
    events: { id: string };
  };
  stdout: (msg: string) => void;
  stderr: (msg: string) => void;
  event: (msg: string) => void;
  getBuffer: (channel?: string) => StreamEntry[];
  subscribe: (channel: string, callback: (entry: StreamEntry) => void) => () => void;
  destroy: () => void;
}

export function useShell(config: ShellConfig) {
  const [shellInstance, setShellInstance] = useState<ShellInstance | null>(null);
  const [output, setOutput] = useState<StreamEntry[]>([]);
  const [errors, setErrors] = useState<StreamEntry[]>([]);
  const [isReady, setIsReady] = useState(false);
  const unsubscribesRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    const loadScripts = async () => {
      const scripts = [
        '/grudgeos/lib/core/shell-registry.js',
        '/grudgeos/lib/core/console-stream.js',
        '/grudgeos/lib/core/operations-registry.js',
        '/grudgeos/lib/core/index.js'
      ];

      for (const src of scripts) {
        if (!document.querySelector(`script[src="${src}"]`)) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
          });
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    };

    const initShell = async () => {
      try {
        await loadScripts();

        const win = window as any;
        if (!win.GrudgeCore) {
          console.error('[useShell] GrudgeCore not available');
          return;
        }

        await win.GrudgeCore.initialize();

        const instance = win.GrudgeCore.createShellWithStreams({
          type: config.type,
          name: config.name,
          executionContext: config.executionContext || 'user',
          inputSources: config.inputSources || ['user:keyboard'],
          outputDestinations: config.outputDestinations || ['console:log', 'ui:display'],
          backingService: config.backingService,
          metadata: config.metadata
        });

        if (!instance) {
          console.error('[useShell] Failed to create shell instance');
          return;
        }

        setShellInstance(instance);

        const unsubStdout = instance.subscribe('stdout', (entry: StreamEntry) => {
          setOutput(prev => [...prev.slice(-500), entry]);
        });

        const unsubStderr = instance.subscribe('stderr', (entry: StreamEntry) => {
          setErrors(prev => [...prev.slice(-100), entry]);
        });

        unsubscribesRef.current = [unsubStdout, unsubStderr];
        setIsReady(true);
      } catch (err) {
        console.error('[useShell] Initialization error:', err);
      }
    };

    initShell();

    return () => {
      unsubscribesRef.current.forEach(unsub => unsub());
      if (shellInstance) {
        shellInstance.destroy();
      }
    };
  }, [config.type, config.name]);

  const write = useCallback((message: string) => {
    if (shellInstance) {
      shellInstance.stdout(message);
    }
  }, [shellInstance]);

  const writeError = useCallback((message: string) => {
    if (shellInstance) {
      shellInstance.stderr(message);
    }
  }, [shellInstance]);

  const writeEvent = useCallback((message: string) => {
    if (shellInstance) {
      shellInstance.event(message);
    }
  }, [shellInstance]);

  const clearOutput = useCallback(() => {
    setOutput([]);
    setErrors([]);
  }, []);

  return {
    shellId: shellInstance?.shell.id || null,
    shellType: shellInstance?.shell.type || config.type,
    shellName: shellInstance?.shell.name || config.name,
    isReady,
    output,
    errors,
    write,
    writeError,
    writeEvent,
    clearOutput
  };
}

export function useOperation(shellId: string | null) {
  const [activeOps, setActiveOps] = useState<any[]>([]);

  const createOperation = useCallback((config: {
    type: string;
    name: string;
    description?: string;
  }) => {
    const win = window as any;
    if (!win.GrudgeCore) {
      console.error('[useOperation] GrudgeCore not available');
      return null;
    }

    return win.GrudgeCore.createOperation({
      ...config,
      shellId
    });
  }, [shellId]);

  return {
    activeOps,
    createOperation
  };
}
