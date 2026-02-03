import { useState, useEffect, useCallback } from 'react';
import { Play, CheckCircle, XCircle, Cpu, Zap, ChevronRight, RefreshCw, Terminal } from 'lucide-react';

interface WasmExample {
  id: string;
  name: string;
  description: string;
  category: string;
  exports: string[];
  testCases: { fn: string; args: number[]; expected: number }[];
}

interface TestResult {
  function: string;
  args: number[];
  expected: number;
  actual: number | null;
  passed: boolean;
  error?: string;
}

interface RunResult {
  example: string;
  function: string;
  args: number[];
  result: number;
}

export function WasmRunner() {
  const [examples, setExamples] = useState<WasmExample[]>([]);
  const [selectedExample, setSelectedExample] = useState<WasmExample | null>(null);
  const [args, setArgs] = useState<string>('');
  const [result, setResult] = useState<RunResult | null>(null);
  const [testResults, setTestResults] = useState<TestResult[] | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [runtimeReady, setRuntimeReady] = useState(false);
  const [consoleLog, setConsoleLog] = useState<string[]>([]);

  useEffect(() => {
    const loadExamples = () => {
      const win = window as any;
      if (win.WasmExamples) {
        setExamples(win.WasmExamples.examples || []);
      }
      if (win.wasmRuntime) {
        win.wasmRuntime.initialize().then(() => {
          setRuntimeReady(true);
          addLog('[WASM Runtime] Initialized successfully');
        });
      }
    };

    const loadScript = (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    Promise.all([
      loadScript('/grudgeos/lib/runtime/wasm-runtime.js'),
      loadScript('/grudgeos/lib/runtime/wasm-examples.js')
    ]).then(() => {
      setTimeout(loadExamples, 100);
    }).catch(err => {
      addLog(`[Error] Failed to load WASM libraries: ${err.message}`);
    });
  }, []);

  const addLog = useCallback((message: string) => {
    setConsoleLog(prev => [...prev.slice(-50), `[${new Date().toLocaleTimeString()}] ${message}`]);
  }, []);

  const handleRun = useCallback(async () => {
    if (!selectedExample || isRunning) return;

    setIsRunning(true);
    setResult(null);
    
    try {
      const win = window as any;
      const parsedArgs = args.trim() 
        ? args.split(',').map(a => parseInt(a.trim(), 10))
        : selectedExample.testCases[0]?.args || [];

      addLog(`[Run] ${selectedExample.name}.${selectedExample.exports[0]}(${parsedArgs.join(', ')})`);

      const output = await win.WasmExamples.loadAndRun(
        selectedExample.id,
        selectedExample.exports[0],
        parsedArgs
      );

      setResult(output);
      addLog(`[Result] ${output.result}`);
    } catch (error: any) {
      addLog(`[Error] ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [selectedExample, args, isRunning, addLog]);

  const handleRunTests = useCallback(async () => {
    if (!selectedExample || isRunning) return;

    setIsRunning(true);
    setTestResults(null);

    try {
      const win = window as any;
      addLog(`[Test] Running ${selectedExample.testCases.length} test cases for ${selectedExample.name}`);

      const output = await win.WasmExamples.runTestCases(selectedExample.id);
      setTestResults(output.testCases);
      addLog(`[Test] ${output.passed}/${output.total} tests passed`);
    } catch (error: any) {
      addLog(`[Error] ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [selectedExample, isRunning, addLog]);

  const handleRunAllTests = useCallback(async () => {
    if (isRunning) return;

    setIsRunning(true);
    setTestResults(null);

    try {
      const win = window as any;
      addLog('[Test] Running all WASM example tests...');

      const output = await win.WasmExamples.runAllTests();
      addLog(`[Test] Overall: ${output.totalPassed}/${output.totalTests} tests passed`);
      
      for (const ex of output.examples) {
        addLog(`  - ${ex.example}: ${ex.passed}/${ex.total}`);
      }
    } catch (error: any) {
      addLog(`[Error] ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, addLog]);

  const categories = Array.from(new Set(examples.map(e => e.category)));

  return (
    <div className="h-full flex flex-col bg-[#0a0a12] text-[#e8e8ff]" data-testid="wasm-runner">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2a2a3a] bg-[#12121a]">
        <Cpu className="w-5 h-5 text-[#00f5ff]" />
        <h2 className="text-sm font-semibold">WASM Runner</h2>
        <div className={`ml-auto flex items-center gap-2 text-xs ${runtimeReady ? 'text-[#00ff88]' : 'text-[#ff6b6b]'}`}>
          <div className={`w-2 h-2 rounded-full ${runtimeReady ? 'bg-[#00ff88]' : 'bg-[#ff6b6b]'}`} />
          {runtimeReady ? 'Runtime Ready' : 'Loading...'}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-48 border-r border-[#2a2a3a] overflow-y-auto bg-[#0d0d15]">
          <div className="p-2">
            <button
              onClick={handleRunAllTests}
              disabled={isRunning || !runtimeReady}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs bg-[#8b5cf6]/20 hover:bg-[#8b5cf6]/30 rounded-lg transition-colors disabled:opacity-50"
              data-testid="button-run-all-tests"
            >
              <Zap className="w-3.5 h-3.5 text-[#8b5cf6]" />
              Run All Tests
            </button>
          </div>

          {categories.map(category => (
            <div key={category} className="mb-2">
              <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-[#8b8b9b] font-medium">
                {category}
              </div>
              {examples
                .filter(e => e.category === category)
                .map(example => (
                  <button
                    key={example.id}
                    onClick={() => {
                      setSelectedExample(example);
                      setResult(null);
                      setTestResults(null);
                      setArgs('');
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors ${
                      selectedExample?.id === example.id
                        ? 'bg-[#00f5ff]/20 text-[#00f5ff] border-l-2 border-[#00f5ff]'
                        : 'hover:bg-[#8b5cf6]/10 text-[#c8c8d8]'
                    }`}
                    data-testid={`button-example-${example.id}`}
                  >
                    <ChevronRight className="w-3 h-3" />
                    {example.name}
                  </button>
                ))}
            </div>
          ))}
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedExample ? (
            <>
              <div className="p-4 border-b border-[#2a2a3a] bg-[#12121a]">
                <h3 className="text-sm font-semibold text-[#e8e8ff] mb-1">{selectedExample.name}</h3>
                <p className="text-xs text-[#8b8b9b] mb-3">{selectedExample.description}</p>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-[#8b8b9b]">Exports:</span>
                  {selectedExample.exports.map(exp => (
                    <span key={exp} className="px-2 py-0.5 text-xs bg-[#8b5cf6]/20 text-[#8b5cf6] rounded">
                      {exp}()
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={args}
                    onChange={(e) => setArgs(e.target.value)}
                    placeholder={`Arguments: ${selectedExample.testCases[0]?.args.join(', ') || 'none'}`}
                    className="flex-1 px-3 py-2 text-xs bg-[#1a1a25] border border-[#2a2a3a] rounded-lg focus:outline-none focus:border-[#00f5ff]"
                    data-testid="input-args"
                  />
                  <button
                    onClick={handleRun}
                    disabled={isRunning || !runtimeReady}
                    className="flex items-center gap-2 px-4 py-2 text-xs bg-[#00f5ff]/20 hover:bg-[#00f5ff]/30 text-[#00f5ff] rounded-lg transition-colors disabled:opacity-50"
                    data-testid="button-run"
                  >
                    {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                    Run
                  </button>
                  <button
                    onClick={handleRunTests}
                    disabled={isRunning || !runtimeReady}
                    className="flex items-center gap-2 px-4 py-2 text-xs bg-[#00ff88]/20 hover:bg-[#00ff88]/30 text-[#00ff88] rounded-lg transition-colors disabled:opacity-50"
                    data-testid="button-run-tests"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Test
                  </button>
                </div>
              </div>

              {result && (
                <div className="p-4 border-b border-[#2a2a3a] bg-[#0a0a12]">
                  <div className="text-xs text-[#8b8b9b] mb-1">Result:</div>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono text-[#00ff88]" data-testid="text-result">
                      {result.function}({result.args.join(', ')}) = {result.result}
                    </code>
                  </div>
                </div>
              )}

              {testResults && (
                <div className="flex-1 overflow-y-auto p-4">
                  <div className="text-xs text-[#8b8b9b] mb-2">Test Results:</div>
                  <div className="space-y-2">
                    {testResults.map((test, i) => (
                      <div
                        key={i}
                        className={`flex items-center gap-3 p-2 rounded-lg ${
                          test.passed ? 'bg-[#00ff88]/10' : 'bg-[#ff6b6b]/10'
                        }`}
                        data-testid={`test-result-${i}`}
                      >
                        {test.passed ? (
                          <CheckCircle className="w-4 h-4 text-[#00ff88]" />
                        ) : (
                          <XCircle className="w-4 h-4 text-[#ff6b6b]" />
                        )}
                        <code className="text-xs font-mono text-[#e8e8ff]">
                          {test.function}({test.args.join(', ')})
                        </code>
                        <span className="text-xs text-[#8b8b9b]">=</span>
                        <code className={`text-xs font-mono ${test.passed ? 'text-[#00ff88]' : 'text-[#ff6b6b]'}`}>
                          {test.actual ?? 'error'}
                        </code>
                        {!test.passed && (
                          <span className="text-xs text-[#8b8b9b]">
                            (expected: {test.expected})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-[#8b8b9b]">
              <div className="text-center">
                <Cpu className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select an example to run</p>
                <p className="text-xs mt-1">{examples.length} WASM examples available</p>
              </div>
            </div>
          )}

          <div className="h-32 border-t border-[#2a2a3a] bg-black overflow-y-auto">
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#2a2a3a] bg-[#0a0a12]">
              <Terminal className="w-3.5 h-3.5 text-[#00ff88]" />
              <span className="text-xs text-[#8b8b9b]">Console</span>
            </div>
            <div className="p-2 font-mono text-xs">
              {consoleLog.map((log, i) => (
                <div
                  key={i}
                  className={`${
                    log.includes('[Error]') 
                      ? 'text-[#ff6b6b]' 
                      : log.includes('[Result]') 
                        ? 'text-[#00ff88]' 
                        : 'text-[#8b8b9b]'
                  }`}
                >
                  {log}
                </div>
              ))}
              {consoleLog.length === 0 && (
                <div className="text-[#505070]">WASM runtime console output will appear here...</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
