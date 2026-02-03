import { useState, useEffect, useRef, useCallback } from 'react';
import { useShell, useOperation } from '@/hooks/use-shell';

interface ShellTerminalProps {
  shellType?: string;
  shellName?: string;
  executionContext?: string;
  showHeader?: boolean;
}

export function ShellTerminal({ 
  shellType = 'terminal',
  shellName = 'Terminal',
  executionContext = 'user',
  showHeader = true
}: ShellTerminalProps) {
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const { shellId, isReady, output, errors, write, writeError } = useShell({
    type: shellType,
    name: shellName,
    executionContext,
    inputSources: ['user:keyboard'],
    outputDestinations: ['console:log', 'ui:display']
  });

  const { createOperation } = useOperation(shellId);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output, errors]);

  useEffect(() => {
    if (isReady) {
      write(`GrudgeOS ${shellName} v1.0`);
      write(`Shell ID: ${shellId}`);
      write(`Context: ${executionContext}`);
      write('Type "help" for available commands.');
    }
  }, [isReady, shellId, shellName, executionContext, write]);

  const executeCommand = useCallback(async (cmd: string) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;

    setHistory(prev => [...prev, trimmed]);
    setHistoryIndex(-1);
    write(`$ ${trimmed}`);

    const [command, ...args] = trimmed.split(' ');

    switch (command.toLowerCase()) {
      case 'help':
        write('Available commands:');
        write('  help     - Show this help message');
        write('  clear    - Clear the terminal');
        write('  echo     - Echo text back');
        write('  date     - Show current date/time');
        write('  whoami   - Show current user');
        write('  pwd      - Print working directory');
        write('  ls       - List files');
        write('  status   - Show shell status');
        write('  ops      - Show active operations');
        break;

      case 'clear':
        break;

      case 'echo':
        write(args.join(' '));
        break;

      case 'date':
        write(new Date().toString());
        break;

      case 'whoami':
        const win = window as any;
        if (win.puter?.auth) {
          try {
            const user = await win.puter.auth.getUser();
            write(user?.username || 'guest');
          } catch {
            write('guest (offline)');
          }
        } else {
          write('guest');
        }
        break;

      case 'pwd':
        write('/home/user');
        break;

      case 'ls':
        write('Documents/  Projects/  Downloads/  .config/');
        break;

      case 'status':
        write(`Shell ID: ${shellId}`);
        write(`Type: ${shellType}`);
        write(`Context: ${executionContext}`);
        write(`Ready: ${isReady}`);
        write(`Output lines: ${output.length}`);
        write(`Error lines: ${errors.length}`);
        break;

      case 'ops':
        const registry = (window as any).OperationsRegistry;
        if (registry) {
          const stats = registry.getStats();
          write(`Active operations: ${stats.active}`);
          write(`History size: ${stats.historySize}`);
        } else {
          write('Operations registry not available');
        }
        break;

      case 'run':
        if (args.length === 0) {
          writeError('Usage: run <script>');
          break;
        }
        const op = createOperation({
          type: 'script',
          name: `Run: ${args[0]}`,
          description: `Executing ${args.join(' ')}`
        });
        if (op) {
          op.start();
          op.progress(50, 'Executing...');
          setTimeout(() => {
            op.complete({ result: 'Script completed' });
            write('Script execution completed');
          }, 1000);
        }
        break;

      default:
        writeError(`Command not found: ${command}`);
        writeError('Type "help" for available commands.');
    }
  }, [write, writeError, shellId, shellType, executionContext, isReady, output.length, errors.length, createOperation]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const newIndex = historyIndex < history.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex] || '');
      } else {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  }, [input, history, historyIndex, executeCommand]);

  const handleContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const allOutput = [...output, ...errors].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div 
      className="h-full flex flex-col bg-black text-[#00ff88] font-mono text-sm"
      onClick={handleContainerClick}
      data-testid="shell-terminal"
    >
      {showHeader && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-[#2a2a3a] bg-[#0a0a12]">
          <div className={`w-2 h-2 rounded-full ${isReady ? 'bg-[#00ff88]' : 'bg-[#f59e0b] animate-pulse'}`} />
          <span className="text-xs text-[#8b8b9b]">{shellName}</span>
          <span className="text-xs text-[#505070]">|</span>
          <span className="text-xs text-[#505070]">{shellId?.slice(0, 20)}...</span>
          <span className="ml-auto text-xs text-[#505070]">{executionContext}</span>
        </div>
      )}

      <div 
        ref={outputRef}
        className="flex-1 overflow-y-auto p-3 space-y-0.5"
      >
        {allOutput.map((entry) => (
          <div 
            key={entry.id} 
            className={`${entry.level === 'error' ? 'text-[#ff6b6b]' : 
                        entry.level === 'warn' ? 'text-[#f59e0b]' : 
                        entry.level === 'success' ? 'text-[#00ff88]' : 
                        'text-[#e8e8ff]'}`}
            data-testid={`output-line-${entry.id}`}
          >
            {entry.message}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#2a2a3a] bg-[#0a0a12]">
        <span className="text-[#00f5ff]">guest@grudgeos</span>
        <span className="text-white">:</span>
        <span className="text-[#3b82f6]">~</span>
        <span className="text-white">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-[#e8e8ff] caret-[#00ff88]"
          placeholder={isReady ? '' : 'Initializing...'}
          disabled={!isReady}
          autoFocus
          data-testid="terminal-input"
        />
      </div>
    </div>
  );
}
