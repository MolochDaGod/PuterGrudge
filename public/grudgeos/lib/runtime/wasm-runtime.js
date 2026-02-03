class WasmRuntime {
  static MODULE_STATUS = {
    LOADING: 'loading',
    READY: 'ready',
    ERROR: 'error',
    UNLOADED: 'unloaded'
  };

  constructor() {
    this.modules = new Map();
    this.memory = null;
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) return;
    
    if (typeof WebAssembly === 'undefined') {
      console.warn('[WasmRuntime] WebAssembly not supported');
      return;
    }

    this.memory = new WebAssembly.Memory({ initial: 256, maximum: 512 });
    this.initialized = true;
    console.log('[WasmRuntime] Initialized');
  }

  async loadModule(config) {
    if (!this.initialized) await this.initialize();
    
    const moduleInfo = {
      id: config.id || `wasm_${Date.now()}`,
      name: config.name || 'Unnamed Module',
      description: config.description || '',
      path: config.path,
      exports: [],
      memory: config.memory || { initial: 256, maximum: 512 },
      status: WasmRuntime.MODULE_STATUS.LOADING,
      instance: null,
      loadedAt: null
    };

    this.modules.set(moduleInfo.id, moduleInfo);

    try {
      let wasmBytes;
      
      if (config.bytes) {
        wasmBytes = config.bytes;
      } else if (config.path) {
        const response = await fetch(config.path);
        wasmBytes = await response.arrayBuffer();
      } else if (config.base64) {
        wasmBytes = this.base64ToArrayBuffer(config.base64);
      } else {
        throw new Error('No WASM source provided');
      }

      const importObject = this.createImportObject(config.imports);
      
      const { instance, module } = await WebAssembly.instantiate(wasmBytes, importObject);
      
      moduleInfo.instance = instance;
      moduleInfo.exports = Object.keys(instance.exports);
      moduleInfo.status = WasmRuntime.MODULE_STATUS.READY;
      moduleInfo.loadedAt = new Date().toISOString();
      
      console.log(`[WasmRuntime] Module ${moduleInfo.name} loaded with exports:`, moduleInfo.exports);
      return moduleInfo;
    } catch (error) {
      moduleInfo.status = WasmRuntime.MODULE_STATUS.ERROR;
      moduleInfo.error = error.message;
      console.error(`[WasmRuntime] Failed to load module ${moduleInfo.name}:`, error);
      throw error;
    }
  }

  createImportObject(customImports = {}) {
    return {
      env: {
        memory: this.memory,
        table: new WebAssembly.Table({ initial: 0, element: 'anyfunc' }),
        abort: (msg, file, line, col) => {
          console.error(`WASM abort: ${msg} at ${file}:${line}:${col}`);
        },
        log_i32: (value) => console.log('WASM log:', value),
        log_f64: (value) => console.log('WASM log:', value),
        log_string: (ptr, len) => {
          const bytes = new Uint8Array(this.memory.buffer, ptr, len);
          const str = new TextDecoder().decode(bytes);
          console.log('WASM log:', str);
        },
        ...customImports
      },
      wasi_snapshot_preview1: {
        fd_write: () => 0,
        fd_read: () => 0,
        fd_close: () => 0,
        fd_seek: () => 0,
        proc_exit: () => {},
        environ_get: () => 0,
        environ_sizes_get: () => 0,
        args_get: () => 0,
        args_sizes_get: () => 0,
        clock_time_get: () => 0
      }
    };
  }

  callFunction(moduleId, functionName, ...args) {
    const moduleInfo = this.modules.get(moduleId);
    if (!moduleInfo) throw new Error('Module not found');
    if (moduleInfo.status !== WasmRuntime.MODULE_STATUS.READY) {
      throw new Error('Module not ready');
    }

    const fn = moduleInfo.instance.exports[functionName];
    if (!fn) throw new Error(`Function ${functionName} not found`);

    return fn(...args);
  }

  async executeWasm(config) {
    const moduleInfo = await this.loadModule({
      id: `exec_${Date.now()}`,
      name: 'Execution Module',
      ...config
    });

    const mainFn = config.entryPoint || 'main';
    const args = config.args || [];

    try {
      const result = this.callFunction(moduleInfo.id, mainFn, ...args);
      return {
        success: true,
        result,
        exports: moduleInfo.exports
      };
    } finally {
      if (!config.keepLoaded) {
        this.unloadModule(moduleInfo.id);
      }
    }
  }

  unloadModule(moduleId) {
    const moduleInfo = this.modules.get(moduleId);
    if (moduleInfo) {
      moduleInfo.instance = null;
      moduleInfo.status = WasmRuntime.MODULE_STATUS.UNLOADED;
      this.modules.delete(moduleId);
    }
  }

  getModule(moduleId) {
    return this.modules.get(moduleId);
  }

  listModules() {
    return Array.from(this.modules.values()).map(m => ({
      id: m.id,
      name: m.name,
      status: m.status,
      exports: m.exports,
      loadedAt: m.loadedAt
    }));
  }

  base64ToArrayBuffer(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  allocateMemory(size) {
    const oldSize = this.memory.buffer.byteLength;
    const neededPages = Math.ceil((oldSize + size) / 65536) - Math.ceil(oldSize / 65536);
    if (neededPages > 0) {
      this.memory.grow(neededPages);
    }
    return oldSize;
  }

  writeToMemory(ptr, data) {
    const view = new Uint8Array(this.memory.buffer);
    if (typeof data === 'string') {
      const encoder = new TextEncoder();
      const bytes = encoder.encode(data);
      view.set(bytes, ptr);
      return bytes.length;
    } else if (data instanceof Uint8Array) {
      view.set(data, ptr);
      return data.length;
    }
    return 0;
  }

  readFromMemory(ptr, length) {
    const view = new Uint8Array(this.memory.buffer, ptr, length);
    return new Uint8Array(view);
  }

  readStringFromMemory(ptr, length) {
    const bytes = this.readFromMemory(ptr, length);
    return new TextDecoder().decode(bytes);
  }

  compileWat(watCode) {
    console.warn('[WasmRuntime] WAT compilation not implemented - use external tools');
    return null;
  }
}

const wasmRuntime = new WasmRuntime();

if (typeof window !== 'undefined') {
  window.WasmRuntime = WasmRuntime;
  window.wasmRuntime = wasmRuntime;
}

if (typeof module !== 'undefined') {
  module.exports = { WasmRuntime, wasmRuntime };
}
