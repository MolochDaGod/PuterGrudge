const WasmExamples = {
  examples: [
    {
      id: 'add',
      name: 'Add Two Numbers',
      description: 'Simple addition of two 32-bit integers',
      category: 'math',
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA2FkZAAACgkBBwAgACABags=',
      exports: ['add'],
      testCases: [
        { fn: 'add', args: [5, 3], expected: 8 },
        { fn: 'add', args: [100, 200], expected: 300 },
        { fn: 'add', args: [-10, 10], expected: 0 }
      ]
    },
    {
      id: 'multiply',
      name: 'Multiply Two Numbers',
      description: 'Multiplication of two 32-bit integers',
      category: 'math',
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwgBBG11bHQAAQoJAQcAIAAgAWwL',
      exports: ['mult'],
      testCases: [
        { fn: 'mult', args: [6, 7], expected: 42 },
        { fn: 'mult', args: [12, 12], expected: 144 },
        { fn: 'mult', args: [0, 1000], expected: 0 }
      ]
    },
    {
      id: 'subtract',
      name: 'Subtract Two Numbers',
      description: 'Subtraction of two 32-bit integers',
      category: 'math',
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA3N1YgAACgkBBwAgACABaws=',
      exports: ['sub'],
      testCases: [
        { fn: 'sub', args: [10, 3], expected: 7 },
        { fn: 'sub', args: [100, 150], expected: -50 },
        { fn: 'sub', args: [0, 0], expected: 0 }
      ]
    },
    {
      id: 'factorial',
      name: 'Factorial (Recursive)',
      description: 'Calculate factorial using recursion',
      category: 'algorithms',
      base64: 'AGFzbQEAAAABBgFgAX8BfwMCAQAHDQEJZmFjdG9yaWFsAAAKEQEPACAAQQFMBEBBAQ8LIAAgAEEBayAAEQAAawsL',
      exports: ['factorial'],
      testCases: [
        { fn: 'factorial', args: [5], expected: 120 },
        { fn: 'factorial', args: [0], expected: 1 },
        { fn: 'factorial', args: [10], expected: 3628800 }
      ]
    },
    {
      id: 'fibonacci',
      name: 'Fibonacci Number',
      description: 'Calculate nth Fibonacci number iteratively',
      category: 'algorithms',
      base64: 'AGFzbQEAAAABBgFgAX8BfwMCAQAHDQEJZmlib25hY2NpAAAKIgEgAQJ/IABBAkgEQCAADwtBACEBQQEhAiAAQQJrQQADQCABIAJqIQEgAiEAIAFBAWsLCw==',
      exports: ['fibonacci'],
      testCases: [
        { fn: 'fibonacci', args: [10], expected: 55 },
        { fn: 'fibonacci', args: [1], expected: 1 },
        { fn: 'fibonacci', args: [0], expected: 0 }
      ]
    },
    {
      id: 'is_prime',
      name: 'Prime Number Check',
      description: 'Check if a number is prime (returns 1 for prime, 0 for not prime)',
      category: 'algorithms',
      base64: 'AGFzbQEAAAABBgFgAX8BfwMCAQAHCgEGaXNQcmltZQAACh0BGwAgAEECSARAQQAPCyAAQQJGBEBBAQ8LQQALCw==',
      exports: ['isPrime'],
      testCases: [
        { fn: 'isPrime', args: [2], expected: 1 },
        { fn: 'isPrime', args: [1], expected: 0 },
        { fn: 'isPrime', args: [17], expected: 1 }
      ]
    },
    {
      id: 'max',
      name: 'Maximum of Two Numbers',
      description: 'Returns the larger of two 32-bit integers',
      category: 'math',
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA21heAAACgsBCQAgACABIAAgAUobCw==',
      exports: ['max'],
      testCases: [
        { fn: 'max', args: [10, 20], expected: 20 },
        { fn: 'max', args: [100, 50], expected: 100 },
        { fn: 'max', args: [-5, -10], expected: -5 }
      ]
    },
    {
      id: 'min',
      name: 'Minimum of Two Numbers',
      description: 'Returns the smaller of two 32-bit integers',
      category: 'math',
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA21pbgAACgsBCQAgACABIAAgAUgbCw==',
      exports: ['min'],
      testCases: [
        { fn: 'min', args: [10, 20], expected: 10 },
        { fn: 'min', args: [100, 50], expected: 50 },
        { fn: 'min', args: [-5, -10], expected: -10 }
      ]
    },
    {
      id: 'abs',
      name: 'Absolute Value',
      description: 'Returns the absolute value of an integer',
      category: 'math',
      base64: 'AGFzbQEAAAABBgFgAX8BfwMCAQAHBwEDYWJzAAAKDQELACAAQQBIBH8gAGsFIAALCw==',
      exports: ['abs'],
      testCases: [
        { fn: 'abs', args: [-42], expected: 42 },
        { fn: 'abs', args: [42], expected: 42 },
        { fn: 'abs', args: [0], expected: 0 }
      ]
    },
    {
      id: 'power',
      name: 'Power (Exponentiation)',
      description: 'Calculate base raised to the power of exponent',
      category: 'math',
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwgBBXBvd2VyAAAKFQETAQF/QQEhAiABQQBKBEAgACABQQFrEQAACyACCw==',
      exports: ['power'],
      testCases: [
        { fn: 'power', args: [2, 10], expected: 1024 },
        { fn: 'power', args: [5, 3], expected: 125 },
        { fn: 'power', args: [10, 0], expected: 1 }
      ]
    },
    {
      id: 'gcd',
      name: 'Greatest Common Divisor',
      description: 'Calculate GCD using Euclidean algorithm',
      category: 'algorithms',
      base64: 'AGFzbQEAAAABBwFgAn9/AX8DAgEABwcBA2djZAAACg8BDQBBAQ8gAEUEQCAADwsgACABcA8L',
      exports: ['gcd'],
      testCases: [
        { fn: 'gcd', args: [48, 18], expected: 6 },
        { fn: 'gcd', args: [100, 25], expected: 25 },
        { fn: 'gcd', args: [17, 13], expected: 1 }
      ]
    },
    {
      id: 'clamp',
      name: 'Clamp Value',
      description: 'Clamp a value between min and max bounds',
      category: 'utility',
      base64: 'AGFzbQEAAAABCAFgA39/fwF/AwIBAAcJAQVjbGFtcAAACg0BCwAgACABIAAgAUgbIAIgACACShsL',
      exports: ['clamp'],
      testCases: [
        { fn: 'clamp', args: [5, 0, 10], expected: 5 },
        { fn: 'clamp', args: [-5, 0, 10], expected: 0 },
        { fn: 'clamp', args: [15, 0, 10], expected: 10 }
      ]
    }
  ],

  getExample(id) {
    return this.examples.find(e => e.id === id);
  },

  getByCategory(category) {
    return this.examples.filter(e => e.category === category);
  },

  getCategories() {
    return [...new Set(this.examples.map(e => e.category))];
  },

  async loadAndRun(exampleId, functionName, args = []) {
    const example = this.getExample(exampleId);
    if (!example) {
      throw new Error(`Example '${exampleId}' not found`);
    }

    if (!window.wasmRuntime) {
      throw new Error('WASM Runtime not available');
    }

    const runtime = window.wasmRuntime;
    
    const moduleInfo = await runtime.loadModule({
      id: `example_${exampleId}_${Date.now()}`,
      name: example.name,
      description: example.description,
      base64: example.base64
    });

    const fn = functionName || example.exports[0];
    const result = runtime.callFunction(moduleInfo.id, fn, ...args);
    
    return {
      example: example.name,
      function: fn,
      args,
      result,
      moduleId: moduleInfo.id,
      exports: moduleInfo.exports
    };
  },

  async runTestCases(exampleId) {
    const example = this.getExample(exampleId);
    if (!example) {
      throw new Error(`Example '${exampleId}' not found`);
    }

    const results = [];
    
    for (const testCase of example.testCases) {
      try {
        const output = await this.loadAndRun(exampleId, testCase.fn, testCase.args);
        results.push({
          function: testCase.fn,
          args: testCase.args,
          expected: testCase.expected,
          actual: output.result,
          passed: output.result === testCase.expected
        });
      } catch (error) {
        results.push({
          function: testCase.fn,
          args: testCase.args,
          expected: testCase.expected,
          actual: null,
          passed: false,
          error: error.message
        });
      }
    }

    return {
      example: example.name,
      testCases: results,
      passed: results.filter(r => r.passed).length,
      total: results.length
    };
  },

  async runAllTests() {
    const allResults = [];
    
    for (const example of this.examples) {
      const result = await this.runTestCases(example.id);
      allResults.push(result);
    }

    return {
      examples: allResults,
      totalPassed: allResults.reduce((sum, r) => sum + r.passed, 0),
      totalTests: allResults.reduce((sum, r) => sum + r.total, 0)
    };
  }
};

if (typeof window !== 'undefined') {
  window.WasmExamples = WasmExamples;
}

if (typeof module !== 'undefined') {
  module.exports = { WasmExamples };
}
