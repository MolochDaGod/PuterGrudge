/**
 * GrudgeOS WASM Kit — best built-in modules for OS work
 * (math, algorithms, clamp/lerp, seeds, distance). Pure base64 WASM, no files.
 */
(function (global) {
  const OS_MODULES = [
    // —— Math (core) ——
    {
      id: 'os_add',
      name: 'i32.add',
      purpose: 'Sum two integers (stats, inventory stacks)',
      category: 'os-math',
      os: true,
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA2FkZAAACgkBBwAgACABags=',
      exports: ['add'],
      defaults: [12, 30],
      testCases: [
        { fn: 'add', args: [5, 3], expected: 8 },
        { fn: 'add', args: [100, 200], expected: 300 },
      ],
    },
    {
      id: 'os_mul',
      name: 'i32.mul',
      purpose: 'Multiply (damage scaling, XP curves)',
      category: 'os-math',
      os: true,
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwgBBG11bHQAAQoJAQcAIAAgAWwL',
      exports: ['mult'],
      defaults: [6, 7],
      testCases: [
        { fn: 'mult', args: [6, 7], expected: 42 },
        { fn: 'mult', args: [12, 12], expected: 144 },
      ],
    },
    {
      id: 'os_sub',
      name: 'i32.sub',
      purpose: 'Subtract (HP, resource drain)',
      category: 'os-math',
      os: true,
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA3N1YgAACgkBBwAgACABaws=',
      exports: ['sub'],
      defaults: [100, 25],
      testCases: [
        { fn: 'sub', args: [10, 3], expected: 7 },
        { fn: 'sub', args: [100, 150], expected: -50 },
      ],
    },
    {
      id: 'os_max',
      name: 'i32.max',
      purpose: 'Max of two (stat caps)',
      category: 'os-math',
      os: true,
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA21heAAACgsBCQAgACABIAAgAUobCw==',
      exports: ['max'],
      defaults: [10, 20],
      testCases: [
        { fn: 'max', args: [10, 20], expected: 20 },
        { fn: 'max', args: [-5, -10], expected: -5 },
      ],
    },
    {
      id: 'os_min',
      name: 'i32.min',
      purpose: 'Min of two (cooldowns, floors)',
      category: 'os-math',
      os: true,
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA21pbgAACgsBCQAgACABIAAgAUgbCw==',
      exports: ['min'],
      defaults: [10, 20],
      testCases: [
        { fn: 'min', args: [10, 20], expected: 10 },
        { fn: 'min', args: [100, 50], expected: 50 },
      ],
    },
    {
      id: 'os_abs',
      name: 'i32.abs',
      purpose: 'Absolute value (deltas, distance components)',
      category: 'os-math',
      os: true,
      base64: 'AGFzbQEAAAABBgFgAX8BfwMCAQAHBwEDYWJzAAAKDQELACAAQQBIBH8gAGsFIAALCw==',
      exports: ['abs'],
      defaults: [-42],
      testCases: [
        { fn: 'abs', args: [-42], expected: 42 },
        { fn: 'abs', args: [42], expected: 42 },
      ],
    },
    {
      id: 'os_clamp',
      name: 'clamp',
      purpose: 'Clamp value into [min,max] — UI, HP, progress bars',
      category: 'os-utility',
      os: true,
      base64: 'AGFzbQEAAAABCAFgA39/fwF/AwIBAAcJAQVjbGFtcAAACg0BCwAgACABIAAgAUgbIAIgACACShsL',
      exports: ['clamp'],
      defaults: [15, 0, 10],
      testCases: [
        { fn: 'clamp', args: [5, 0, 10], expected: 5 },
        { fn: 'clamp', args: [-5, 0, 10], expected: 0 },
        { fn: 'clamp', args: [15, 0, 10], expected: 10 },
      ],
    },
    {
      id: 'os_power',
      name: 'power',
      purpose: 'Integer power (level curves, scaling)',
      category: 'os-math',
      os: true,
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwgBBXBvd2VyAAAKFQETAQF/QQEhAiABQQBKBEAgACABQQFrEQAACyACCw==',
      exports: ['power'],
      defaults: [2, 10],
      testCases: [
        { fn: 'power', args: [2, 10], expected: 1024 },
        { fn: 'power', args: [5, 3], expected: 125 },
      ],
    },
    // —— Algorithms ——
    {
      id: 'os_factorial',
      name: 'factorial',
      purpose: 'Recursive factorial (sandbox recursion test)',
      category: 'os-algo',
      os: true,
      base64: 'AGFzbQEAAAABBgFgAX8BfwMCAQAHDQEJZmFjdG9yaWFsAAAKEQEPACAAQQFMBEBBAQ8LIAAgAEEBayAAEQAAawsL',
      exports: ['factorial'],
      defaults: [5],
      testCases: [
        { fn: 'factorial', args: [5], expected: 120 },
        { fn: 'factorial', args: [0], expected: 1 },
      ],
    },
    {
      id: 'os_fib',
      name: 'fibonacci',
      purpose: 'Nth Fibonacci (procedural sequences)',
      category: 'os-algo',
      os: true,
      base64: 'AGFzbQEAAAABBgFgAX8BfwMCAQAHDQEJZmlib25hY2NpAAAKIgEgAQJ/IABBAkgEQCAADwtBACEBQQEhAiAAQQJrQQADQCABIAJqIQEgAiEAIAFBAWsLCw==',
      exports: ['fibonacci'],
      defaults: [10],
      testCases: [
        { fn: 'fibonacci', args: [10], expected: 55 },
        { fn: 'fibonacci', args: [1], expected: 1 },
      ],
    },
    {
      id: 'os_prime',
      name: 'isPrime',
      purpose: 'Primality (seed / shard filters)',
      category: 'os-algo',
      os: true,
      base64: 'AGFzbQEAAAABBgFgAX8BfwMCAQAHCgEGaXNQcmltZQAACh0BGwAgAEECSARAQQAPCyAAQQJGBEBBAQ8LQQALCw==',
      exports: ['isPrime'],
      defaults: [17],
      testCases: [
        { fn: 'isPrime', args: [2], expected: 1 },
        { fn: 'isPrime', args: [17], expected: 1 },
      ],
    },
    {
      id: 'os_gcd',
      name: 'gcd',
      purpose: 'GCD — grid snap, aspect ratios',
      category: 'os-algo',
      os: true,
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA2djZAAACg8BDQBBAQ8gAEUEQCAADwsgACABcA8L',
      exports: ['gcd'],
      defaults: [48, 18],
      testCases: [
        { fn: 'gcd', args: [48, 18], expected: 6 },
        { fn: 'gcd', args: [100, 25], expected: 25 },
      ],
    },
  ];

  /** Categories tuned for GrudgeOS */
  const CATEGORIES = {
    'os-math': { label: 'OS Math', color: '#00f5ff', desc: 'Add/mul/clamp/power for stats & UI' },
    'os-algo': { label: 'Algorithms', color: '#8b5cf6', desc: 'Fib, prime, gcd for procedural systems' },
    'os-utility': { label: 'Utility', color: '#00ff88', desc: 'Clamp and bounds for HUD/HP' },
    math: { label: 'Math (extra)', color: '#3b82f6', desc: 'General math demos' },
    algorithms: { label: 'Algo (extra)', color: '#a855f7', desc: 'General algorithm demos' },
    utility: { label: 'Util (extra)', color: '#22c55e', desc: 'Misc utilities' },
  };

  /**
   * Merge OS kit + WasmExamples into one catalog; OS modules first.
   */
  function getCatalog() {
    const fromExamples = (global.WasmExamples?.examples || []).map((e) => ({
      ...e,
      os: false,
      purpose: e.description,
      defaults: e.testCases?.[0]?.args || [],
    }));
    const ids = new Set(OS_MODULES.map((m) => m.id));
    // Prefer OS kit; skip duplicate export names from examples when same id collision
    const extras = fromExamples.filter((e) => !ids.has(e.id) && !OS_MODULES.find((m) => m.exports[0] === e.exports[0] && m.category.startsWith('os-')));
    return [...OS_MODULES, ...extras];
  }

  async function ensureRuntime() {
    if (!global.wasmRuntime) {
      throw new Error('WasmRuntime not loaded');
    }
    await global.wasmRuntime.initialize();
    return global.wasmRuntime;
  }

  async function loadModule(mod) {
    const runtime = await ensureRuntime();
    return runtime.loadModule({
      id: mod.id,
      name: mod.name,
      description: mod.purpose || mod.description,
      base64: mod.base64,
    });
  }

  /** Preload all OS-priority modules into the runtime */
  async function loadOsKit() {
    const runtime = await ensureRuntime();
    const loaded = [];
    const errors = [];
    for (const mod of OS_MODULES) {
      try {
        const info = await loadModule(mod);
        loaded.push({ ...mod, exports: info.exports, status: info.status });
      } catch (e) {
        errors.push({ id: mod.id, error: e.message || String(e) });
      }
    }
    return { loaded, errors, count: loaded.length };
  }

  async function run(modId, fn, args) {
    const catalog = getCatalog();
    const mod = catalog.find((m) => m.id === modId);
    if (!mod) throw new Error(`Unknown module ${modId}`);
    const runtime = await ensureRuntime();
    // Reload fresh instance for isolation
    const info = await runtime.loadModule({
      id: `${mod.id}_${Date.now()}`,
      name: mod.name,
      base64: mod.base64,
    });
    const name = fn || mod.exports[0];
    const result = runtime.callFunction(info.id, name, ...(args || mod.defaults || []));
    return { module: mod.name, fn: name, args: args || mod.defaults, result, moduleId: info.id };
  }

  async function runTests(modId) {
    const catalog = getCatalog();
    const mod = catalog.find((m) => m.id === modId);
    if (!mod?.testCases?.length) return { passed: 0, total: 0, cases: [] };
    const cases = [];
    for (const tc of mod.testCases) {
      try {
        const out = await run(modId, tc.fn, tc.args);
        cases.push({
          fn: tc.fn,
          args: tc.args,
          expected: tc.expected,
          actual: out.result,
          passed: out.result === tc.expected,
        });
      } catch (e) {
        cases.push({
          fn: tc.fn,
          args: tc.args,
          expected: tc.expected,
          actual: null,
          passed: false,
          error: e.message,
        });
      }
    }
    return {
      module: mod.name,
      cases,
      passed: cases.filter((c) => c.passed).length,
      total: cases.length,
    };
  }

  async function runAllOsTests() {
    const results = [];
    for (const mod of OS_MODULES) {
      results.push(await runTests(mod.id));
    }
    return {
      results,
      passed: results.reduce((s, r) => s + r.passed, 0),
      total: results.reduce((s, r) => s + r.total, 0),
    };
  }

  const api = {
    OS_MODULES,
    CATEGORIES,
    getCatalog,
    loadOsKit,
    loadModule,
    run,
    runTests,
    runAllOsTests,
  };

  global.WasmOsKit = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
