/**
 * gsh — Grudge Shell (GrudgeOS P1).
 *
 * A browser-only shell with bash-style and PowerShell-style commands over a
 * small virtual file system. Nothing here runs on a server: no network calls,
 * no eval, no AI calls (so it cannot spend anyone's Puter credits).
 *
 * Storage: IndexedDB in the browser (per device), memory in Node tests.
 * P2 will add mounts for Puter FS (user-pays), GitHub and R2.
 *
 * Output is plain text. The terminal UI renders it with textContent only.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.GrudgeShell = factory();
})(typeof globalThis !== 'undefined' ? globalThis : self, function () {
  'use strict';

  const VERSION = '0.1.0';
  const MAX_FILE_BYTES = 1024 * 1024;      // 1 MB per file
  const MAX_TOTAL_BYTES = 5 * 1024 * 1024; // 5 MB per device

  class ShellError extends Error {
    constructor(msg, code) { super(msg); this.code = code || 1; }
  }

  // ── Stores ────────────────────────────────────────────────────────────
  class MemoryStore {
    constructor() { this.data = null; }
    async load() { return this.data ? JSON.parse(this.data) : null; }
    async save(tree) { this.data = JSON.stringify(tree); }
  }

  class IdbStore {
    constructor(dbName) { this.dbName = dbName || 'grudgeos-gsh'; }
    _open() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(this.dbName, 1);
        req.onupgradeneeded = () => req.result.createObjectStore('vfs');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }
    async load() {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        const r = db.transaction('vfs', 'readonly').objectStore('vfs').get('root');
        r.onsuccess = () => resolve(r.result || null);
        r.onerror = () => reject(r.error);
      });
    }
    async save(tree) {
      const db = await this._open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('vfs', 'readwrite');
        tx.objectStore('vfs').put(tree, 'root');
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  }

  // ── Virtual file system ──────────────────────────────────────────────
  const dir = () => ({ type: 'dir', children: {}, mtime: Date.now() });
  const file = (content) => ({ type: 'file', content: String(content || ''), mtime: Date.now() });

  class VFS {
    constructor(tree) { this.root = tree || dir(); }

    static normalize(path, cwd) {
      const raw = String(path || '').replace(/\\/g, '/');
      const parts = (raw.startsWith('/') ? raw : (cwd || '/') + '/' + raw).split('/');
      const out = [];
      for (const p of parts) {
        if (!p || p === '.') continue;
        if (p === '..') out.pop(); else out.push(p);
      }
      return '/' + out.join('/');
    }

    _walk(abs) {
      if (abs === '/') return this.root;
      let node = this.root;
      for (const part of abs.slice(1).split('/')) {
        if (!node || node.type !== 'dir') return null;
        node = node.children[part];
      }
      return node || null;
    }

    _parent(abs) {
      const i = abs.lastIndexOf('/');
      const parentPath = i <= 0 ? '/' : abs.slice(0, i);
      return { parent: this._walk(parentPath), name: abs.slice(i + 1), parentPath };
    }

    stat(abs) { return this._walk(abs); }

    totalBytes(node) {
      node = node || this.root;
      if (node.type === 'file') return node.content.length;
      return Object.values(node.children).reduce((n, c) => n + this.totalBytes(c), 0);
    }

    list(abs) {
      const node = this._walk(abs);
      if (!node) throw new ShellError(`no such file or directory: ${abs}`);
      if (node.type === 'file') return [{ name: abs.split('/').pop(), ...node }];
      return Object.keys(node.children).sort().map((name) => ({ name, ...node.children[name] }));
    }

    read(abs) {
      const node = this._walk(abs);
      if (!node) throw new ShellError(`no such file: ${abs}`);
      if (node.type !== 'file') throw new ShellError(`is a directory: ${abs}`);
      return node.content;
    }

    write(abs, content, append) {
      const { parent, name } = this._parent(abs);
      if (!parent || parent.type !== 'dir') throw new ShellError(`no such directory for: ${abs}`);
      const existing = parent.children[name];
      if (existing && existing.type === 'dir') throw new ShellError(`is a directory: ${abs}`);
      const next = append && existing ? existing.content + content : String(content);
      if (next.length > MAX_FILE_BYTES) throw new ShellError('file too large (1 MB limit)');
      const delta = next.length - (existing ? existing.content.length : 0);
      if (this.totalBytes() + delta > MAX_TOTAL_BYTES) throw new ShellError('storage full (5 MB device limit)');
      parent.children[name] = file(next);
      parent.mtime = Date.now();
    }

    mkdir(abs, parents) {
      if (abs === '/') return;
      const { parent, name, parentPath } = this._parent(abs);
      if (!parent) {
        if (!parents) throw new ShellError(`no such directory: ${parentPath}`);
        this.mkdir(parentPath, true);
        return this.mkdir(abs, false);
      }
      if (parent.type !== 'dir') throw new ShellError(`not a directory: ${parentPath}`);
      const existing = parent.children[name];
      if (existing) {
        if (existing.type === 'dir' && parents) return;
        throw new ShellError(`already exists: ${abs}`);
      }
      parent.children[name] = dir();
    }

    rm(abs, recursive) {
      if (abs === '/') throw new ShellError('refusing to remove /');
      const { parent, name } = this._parent(abs);
      const node = parent && parent.children[name];
      if (!node) throw new ShellError(`no such file or directory: ${abs}`);
      if (node.type === 'dir' && Object.keys(node.children).length && !recursive) {
        throw new ShellError(`directory not empty (use -r / -Recurse): ${abs}`);
      }
      delete parent.children[name];
    }

    copy(src, dest, move) {
      const node = this._walk(src);
      if (!node) throw new ShellError(`no such file or directory: ${src}`);
      if (dest === src || dest.startsWith(src + '/')) throw new ShellError('cannot copy into itself');
      const target = this._walk(dest);
      const finalDest = target && target.type === 'dir' ? VFS.normalize(src.split('/').pop(), dest) : dest;
      const { parent, name } = this._parent(finalDest);
      if (!parent || parent.type !== 'dir') throw new ShellError(`no such directory for: ${dest}`);
      const clone = JSON.parse(JSON.stringify(node));
      if (!move && this.totalBytes() + this.totalBytes(clone) > MAX_TOTAL_BYTES) {
        throw new ShellError('storage full (5 MB device limit)');
      }
      parent.children[name] = clone;
      if (move) this.rm(src, true);
    }
  }

  // ── Parsing ──────────────────────────────────────────────────────────
  // Splits a line into commands joined by ; && and pipes, with quotes.
  function tokenize(line) {
    const tokens = [];
    let cur = '', quote = null, had = false;
    const push = () => { if (had) tokens.push(cur); cur = ''; had = false; };
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (quote) {
        if (c === quote) quote = null; else cur += c;
        continue;
      }
      if (c === '"' || c === "'") { quote = c; had = true; continue; }
      if (c === ' ' || c === '\t') { push(); continue; }
      if (c === '|' || c === ';') { push(); tokens.push({ op: c }); continue; }
      if (c === '&' && line[i + 1] === '&') { push(); tokens.push({ op: '&&' }); i++; continue; }
      if (c === '>') {
        push();
        if (line[i + 1] === '>') { tokens.push({ op: '>>' }); i++; } else tokens.push({ op: '>' });
        continue;
      }
      cur += c; had = true;
    }
    if (quote) throw new ShellError('unterminated quote');
    push();
    return tokens;
  }

  // Groups tokens into a list of { join, pipeline: [ {argv, redirect} ] }.
  function parse(line) {
    const tokens = tokenize(line);
    const chains = [];
    let pipeline = [], argv = [], redirect = null, join = ';';
    const endCmd = () => {
      if (argv.length) pipeline.push({ argv, redirect });
      else if (redirect) throw new ShellError('missing command before redirect');
      argv = []; redirect = null;
    };
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (typeof t === 'string') { argv.push(t); continue; }
      if (t.op === '>' || t.op === '>>') {
        const target = tokens[++i];
        if (typeof target !== 'string') throw new ShellError('missing redirect target');
        redirect = { path: target, append: t.op === '>>' };
      } else if (t.op === '|') {
        endCmd();
      } else {
        endCmd();
        if (pipeline.length) chains.push({ join, pipeline });
        pipeline = []; join = t.op;
      }
    }
    endCmd();
    if (pipeline.length) chains.push({ join, pipeline });
    return chains;
  }

  // Flags: -rf → r,f; -Recurse/--recursive → recurse; value flags take the next arg.
  const LONG_FLAGS = new Set(['recurse', 'recursive', 'force', 'path', 'value', 'itemtype', 'pattern',
    'name', 'destination', 'literalpath', 'all', 'help', 'first', 'last', 'lines', 'filepath', 'parents']);
  const VALUE_FLAGS = new Set(['path', 'value', 'itemtype', 'pattern', 'name', 'destination', 'literalpath',
    'n', 'first', 'last', 'filepath']);

  function parseArgs(args) {
    const flags = new Set(), named = {}, pos = [];
    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (/^-\d+$/.test(a)) { named.n = a.slice(1); continue; }
      if (a.startsWith('-') && a.length > 1) {
        const body = a.replace(/^--?/, '').toLowerCase();
        const isLong = a.startsWith('--') || LONG_FLAGS.has(body) || body.length > 2;
        const names = isLong ? [body] : body.split('');
        for (const n of names) {
          if (VALUE_FLAGS.has(n) && i + 1 < args.length) named[n] = args[++i];
          else flags.add(n);
        }
        continue;
      }
      pos.push(a);
    }
    return { flags, named, pos };
  }

  // PowerShell verbs and common aliases → canonical command names.
  const ALIASES = {
    'get-childitem': 'ls', gci: 'ls', dir: 'ls',
    'set-location': 'cd', sl: 'cd', chdir: 'cd',
    'get-location': 'pwd', gl: 'pwd',
    'get-content': 'cat', gc: 'cat', type: 'cat',
    'set-content': 'set-content', 'add-content': 'add-content',
    'new-item': 'new-item', ni: 'new-item',
    'remove-item': 'rm', ri: 'rm', del: 'rm', erase: 'rm', rmdir: 'rm',
    'copy-item': 'cp', copy: 'cp', cpi: 'cp',
    'move-item': 'mv', move: 'mv', mi: 'mv',
    'write-output': 'echo', 'write-host': 'echo', write: 'echo',
    'clear-host': 'clear', cls: 'clear',
    'get-command': 'commands', gcm: 'commands',
    'get-help': 'help', man: 'help',
    'get-history': 'history', h: 'history',
    'get-date': 'date',
    'select-string': 'grep', sls: 'grep',
    'measure-object': 'wc', measure: 'wc',
    'start-process': 'open', start: 'open', saps: 'open',
    'get-process': 'ps', gps: 'ps',
    'get-variable': 'env',
    'select-object': 'head',
  };

  function fmtTime(ms) {
    const d = new Date(ms);
    return d.toISOString().slice(0, 16).replace('T', ' ');
  }

  // ── Shell ────────────────────────────────────────────────────────────
  class Shell {
    constructor(opts) {
      opts = opts || {};
      this.store = opts.store || new MemoryStore();
      this.user = (opts.user || 'guest').replace(/[^\w.-]/g, '') || 'guest';
      this.hooks = opts.hooks || {};
      this.env = Object.assign({
        USER: this.user,
        HOME: '/home/' + this.user,
        SHELL: '/bin/gsh',
        TERM: 'xterm-256color',
        GSH_VERSION: VERSION,
        OS: 'GrudgeOS',
      }, opts.env || {});
      this.cwd = this.env.HOME;
      this.history = [];
      this.vfs = null;
      this.lastCode = 0;
    }

    async init() {
      let tree = null;
      try { tree = await this.store.load(); } catch (_) { tree = null; }
      this.vfs = new VFS(tree);
      if (!tree) this._seed();
      if (!this.vfs.stat(this.cwd)) this.vfs.mkdir(this.cwd, true);
      return this;
    }

    _seed() {
      const home = this.env.HOME;
      for (const d of ['Desktop', 'Documents', 'Downloads', 'Projects']) this.vfs.mkdir(`${home}/${d}`, true);
      this.vfs.mkdir('/etc', true);
      this.vfs.mkdir('/tmp', true);
      this.vfs.write('/etc/motd', 'Welcome to GrudgeOS. Type "help" to see commands. Files stay on this device.\n');
      this.vfs.write(`${home}/README.txt`, [
        'Grudge Shell (gsh) quick start',
        '  ls / Get-ChildItem      list files',
        '  cd Projects             change folder',
        '  echo hi > note.txt      write a file',
        '  cat note.txt            read it',
        '  open treaty             open an OS app (try: apps)',
        '  help                    every command',
        '',
        'Files are saved in this browser only (IndexedDB, 5 MB).',
        'Cloud folders (Puter, GitHub, R2) arrive in a later phase.',
        '',
      ].join('\n'));
    }

    async _persist() {
      try { await this.store.save(this.vfs.root); } catch (_) { /* storage unavailable: stay in memory */ }
    }

    prompt() {
      const home = this.env.HOME;
      const shown = this.cwd === home ? '~' : this.cwd.startsWith(home + '/') ? '~' + this.cwd.slice(home.length) : this.cwd;
      return `${this.user}@grudgeos:${shown}$`;
    }

    resolve(p) {
      const s = String(p || '');
      if (s === '~' || s.startsWith('~/')) return VFS.normalize(this.env.HOME + s.slice(1), '/');
      return VFS.normalize(s, this.cwd);
    }

    expand(arg) {
      return arg
        .replace(/\$env:([A-Za-z_][\w]*)/g, (_, k) => this.env[k] != null ? this.env[k] : '')
        .replace(/\$\{([A-Za-z_][\w]*)\}/g, (_, k) => this.env[k] != null ? this.env[k] : '')
        .replace(/\$\?/g, String(this.lastCode))
        .replace(/\$([A-Za-z_][\w]*)/g, (_, k) => this.env[k] != null ? this.env[k] : '');
    }

    commandNames() {
      return Object.keys(COMMANDS).sort();
    }

    /** Runs one line. Returns { out, code, clear }. Never throws. */
    async run(line) {
      const text = String(line || '').trim();
      if (!text) return { out: '', code: 0 };
      this.history.push(text);
      if (this.history.length > 500) this.history.shift();
      // PowerShell variable assignment: $env:NAME = value
      const psAssign = /^\$env:([A-Za-z_]\w*)\s*=\s*(.*)$/.exec(text);
      if (psAssign) {
        this.env[psAssign[1]] = psAssign[2].replace(/^(["'])(.*)\1$/, '$2');
        this.lastCode = 0;
        return { out: '', code: 0 };
      }
      let chains;
      try { chains = parse(text); } catch (e) { return { out: 'gsh: ' + e.message, code: 2 }; }
      const outputs = [];
      let code = 0, clear = false, dirty = false;
      for (const chain of chains) {
        if (chain.join === '&&' && code !== 0) continue;
        let stdin = null;
        try {
          for (const cmd of chain.pipeline) {
            const argv = cmd.argv.map((a) => this.expand(a));
            const res = await this._exec(argv, stdin);
            if (res && res.clear) clear = true;
            if (res && res.dirty) dirty = true;
            stdin = res && res.out != null ? String(res.out) : '';
            if (cmd.redirect) {
              const target = this.resolve(this.expand(cmd.redirect.path));
              this.vfs.write(target, stdin && !stdin.endsWith('\n') ? stdin + '\n' : stdin, cmd.redirect.append);
              dirty = true;
              stdin = '';
            }
          }
          code = 0;
          if (stdin) outputs.push(stdin.replace(/\n$/, ''));
        } catch (e) {
          code = e instanceof ShellError ? e.code : 1;
          outputs.push('gsh: ' + (e && e.message ? e.message : String(e)));
        }
      }
      this.lastCode = code;
      if (dirty) await this._persist();
      return { out: outputs.join('\n'), code, clear };
    }

    async _exec(argv, stdin) {
      const raw = argv[0];
      // `$env:NAME = value` and `export NAME=value` / `NAME=value`
      const assign = /^([A-Za-z_]\w*)=(.*)$/.exec(raw);
      if (assign && argv.length === 1) { this.env[assign[1]] = assign[2]; return { out: '' }; }
      let name = raw.toLowerCase();
      if (ALIASES[name]) name = ALIASES[name];
      const fn = COMMANDS[name];
      if (!fn) throw new ShellError(`command not found: ${raw} (try "help")`, 127);
      return (await fn.call(this, argv.slice(1), stdin, raw.toLowerCase())) || { out: '' };
    }
  }

  // ── Commands ─────────────────────────────────────────────────────────
  // Each command: function (args, stdin, invokedAs) → { out, dirty?, clear? }
  const HELP = {
    help: 'help [cmd]              show commands',
    ls: 'ls [-l] [-a] [path]     list files (Get-ChildItem, dir)',
    cd: 'cd [path]               change folder (Set-Location)',
    pwd: 'pwd                     current folder (Get-Location)',
    cat: 'cat <file>              print a file (Get-Content, type)',
    echo: 'echo <text>             print text (Write-Output, Write-Host)',
    mkdir: 'mkdir [-p] <dir>        make a folder',
    touch: 'touch <file>            create an empty file',
    'new-item': 'New-Item <path> [-ItemType Directory|File] [-Value text]',
    'set-content': 'Set-Content <file> -Value <text>',
    'add-content': 'Add-Content <file> -Value <text>',
    rm: 'rm [-r] <path>          remove (Remove-Item -Recurse, del)',
    cp: 'cp [-r] <src> <dest>    copy (Copy-Item)',
    mv: 'mv <src> <dest>         move or rename (Move-Item)',
    tree: 'tree [path]             show a folder tree',
    grep: 'grep [-i] <pat> [file]  find lines (Select-String)',
    head: 'head [-n N] [file]      first lines',
    tail: 'tail [-n N] [file]      last lines',
    wc: 'wc [file]               count lines, words, bytes (Measure-Object)',
    clear: 'clear                   clear the screen (cls, Clear-Host)',
    history: 'history                 past commands (Get-History)',
    env: 'env                     environment ($env:NAME, export NAME=v)',
    export: 'export NAME=value       set a variable',
    whoami: 'whoami                  current user',
    date: 'date                    current date and time (Get-Date)',
    uname: 'uname [-a]              system info',
    neofetch: 'neofetch                system summary',
    df: 'df                      device storage used by gsh',
    apps: 'apps                    OS apps you can open',
    open: 'open <app>              open an OS app (Start-Process)',
    ps: 'ps                      open windows (Get-Process)',
    commands: 'commands                every command (Get-Command)',
    alias: 'alias                   PowerShell-style aliases',
  };

  function textOrFile(sh, pos, stdin) {
    if (pos.length) return pos.map((p) => sh.vfs.read(sh.resolve(p))).join('');
    return stdin || '';
  }

  const COMMANDS = {
    help(args) {
      if (args[0]) {
        const n = ALIASES[args[0].toLowerCase()] || args[0].toLowerCase();
        return { out: HELP[n] || `no help for ${args[0]}` };
      }
      return { out: 'Grudge Shell ' + VERSION + ' — bash and PowerShell style. Runs in your browser only.\n\n' +
        Object.values(HELP).map((h) => '  ' + h).join('\n') };
    },
    commands() { return { out: Object.keys(COMMANDS).sort().join('  ') }; },
    alias() {
      return { out: Object.entries(ALIASES).map(([a, c]) => `${a} -> ${c}`).join('\n') };
    },
    pwd() { return { out: this.cwd }; },
    cd(args) {
      const { pos, named } = parseArgs(args);
      const target = this.resolve(named.path || pos[0] || this.env.HOME);
      const node = this.vfs.stat(target);
      if (!node) throw new ShellError(`no such directory: ${target}`);
      if (node.type !== 'dir') throw new ShellError(`not a directory: ${target}`);
      this.cwd = target;
      return { out: '' };
    },
    ls(args) {
      const { flags, pos, named } = parseArgs(args);
      const target = this.resolve(named.path || pos[0] || '.');
      const items = this.vfs.list(target).filter((i) => flags.has('a') || flags.has('force') || !i.name.startsWith('.'));
      if (flags.has('l')) {
        return { out: items.map((i) => `${i.type === 'dir' ? 'd' : '-'}  ${String(i.type === 'dir' ? '-' : i.content.length).padStart(8)}  ${fmtTime(i.mtime)}  ${i.name}${i.type === 'dir' ? '/' : ''}`).join('\n') };
      }
      return { out: items.map((i) => i.name + (i.type === 'dir' ? '/' : '')).join('  ') };
    },
    cat(args, stdin) {
      const { pos, named } = parseArgs(args);
      return { out: textOrFile(this, named.path ? [named.path] : pos, stdin) };
    },
    echo(args, stdin, invokedAs) {
      return { out: args.join(' ') };
    },
    mkdir(args) {
      const { flags, pos } = parseArgs(args);
      if (!pos.length) throw new ShellError('mkdir: missing folder name');
      for (const p of pos) this.vfs.mkdir(this.resolve(p), flags.has('p') || flags.has('parents') || flags.has('force'));
      return { out: '', dirty: true };
    },
    touch(args) {
      if (!args.length) throw new ShellError('touch: missing file name');
      for (const p of args) {
        const abs = this.resolve(p);
        const node = this.vfs.stat(abs);
        if (node) node.mtime = Date.now(); else this.vfs.write(abs, '');
      }
      return { out: '', dirty: true };
    },
    'new-item'(args) {
      const { pos, named } = parseArgs(args);
      const p = named.path || named.name || pos[0];
      if (!p) throw new ShellError('New-Item: missing -Path');
      const abs = this.resolve(p);
      if (String(named.itemtype || '').toLowerCase() === 'directory') this.vfs.mkdir(abs, true);
      else this.vfs.write(abs, named.value != null ? named.value + '\n' : '');
      return { out: abs, dirty: true };
    },
    'set-content'(args, stdin) {
      const { pos, named } = parseArgs(args);
      const p = named.path || pos[0];
      if (!p) throw new ShellError('Set-Content: missing -Path');
      const value = named.value != null ? named.value : (pos.slice(1).join(' ') || stdin || '');
      this.vfs.write(this.resolve(p), value.endsWith('\n') ? value : value + '\n');
      return { out: '', dirty: true };
    },
    'add-content'(args, stdin) {
      const { pos, named } = parseArgs(args);
      const p = named.path || pos[0];
      if (!p) throw new ShellError('Add-Content: missing -Path');
      const value = named.value != null ? named.value : (pos.slice(1).join(' ') || stdin || '');
      this.vfs.write(this.resolve(p), value.endsWith('\n') ? value : value + '\n', true);
      return { out: '', dirty: true };
    },
    rm(args, stdin, invokedAs) {
      const { flags, pos, named } = parseArgs(args);
      const targets = named.path ? [named.path] : pos;
      if (!targets.length) throw new ShellError('rm: missing path');
      const recursive = flags.has('r') || flags.has('recurse') || flags.has('recursive') || invokedAs === 'rmdir';
      for (const p of targets) {
        try { this.vfs.rm(this.resolve(p), recursive); }
        catch (e) { if (!flags.has('f') && !flags.has('force')) throw e; }
      }
      return { out: '', dirty: true };
    },
    cp(args) {
      const { pos, named } = parseArgs(args);
      const src = named.path || pos[0];
      const dest = named.destination || pos[1];
      if (!src || !dest) throw new ShellError('cp: need <src> <dest>');
      this.vfs.copy(this.resolve(src), this.resolve(dest), false);
      return { out: '', dirty: true };
    },
    mv(args) {
      const { pos, named } = parseArgs(args);
      const src = named.path || pos[0];
      const dest = named.destination || pos[1];
      if (!src || !dest) throw new ShellError('mv: need <src> <dest>');
      this.vfs.copy(this.resolve(src), this.resolve(dest), true);
      return { out: '', dirty: true };
    },
    tree(args) {
      const start = this.resolve(args[0] || '.');
      const node = this.vfs.stat(start);
      if (!node) throw new ShellError(`no such directory: ${start}`);
      const lines = [start];
      const walk = (n, prefix, depth) => {
        if (n.type !== 'dir' || depth > 8) return;
        const names = Object.keys(n.children).sort();
        names.forEach((name, i) => {
          const last = i === names.length - 1;
          const child = n.children[name];
          lines.push(prefix + (last ? '└── ' : '├── ') + name + (child.type === 'dir' ? '/' : ''));
          walk(child, prefix + (last ? '    ' : '│   '), depth + 1);
        });
      };
      walk(node, '', 0);
      return { out: lines.join('\n') };
    },
    grep(args, stdin) {
      const { flags, pos, named } = parseArgs(args);
      const pattern = named.pattern || pos.shift();
      if (!pattern) throw new ShellError('grep: missing pattern');
      const files = named.path ? [named.path] : pos;
      const text = textOrFile(this, files, stdin);
      const needle = flags.has('i') ? pattern.toLowerCase() : pattern;
      return { out: text.split('\n').filter((l) => (flags.has('i') ? l.toLowerCase() : l).includes(needle)).join('\n') };
    },
    head(args, stdin) {
      const { pos, named } = parseArgs(args);
      const n = parseInt(named.n || named.first || '10', 10);
      return { out: textOrFile(this, pos, stdin).split('\n').slice(0, n).join('\n') };
    },
    tail(args, stdin) {
      const { pos, named } = parseArgs(args);
      const n = parseInt(named.n || named.last || '10', 10);
      const lines = textOrFile(this, pos, stdin).replace(/\n$/, '').split('\n');
      return { out: lines.slice(-n).join('\n') };
    },
    wc(args, stdin) {
      const { pos } = parseArgs(args);
      const text = textOrFile(this, pos, stdin);
      const lines = text ? text.replace(/\n$/, '').split('\n').length : 0;
      const words = text.split(/\s+/).filter(Boolean).length;
      return { out: `${lines} ${words} ${text.length}` };
    },
    clear() { return { out: '', clear: true }; },
    history() { return { out: this.history.map((h, i) => `${String(i + 1).padStart(4)}  ${h}`).join('\n') }; },
    env() { return { out: Object.keys(this.env).sort().map((k) => `${k}=${this.env[k]}`).join('\n') }; },
    export(args) {
      for (const a of args) {
        const m = /^([A-Za-z_]\w*)=(.*)$/.exec(a);
        if (!m) throw new ShellError(`export: bad assignment: ${a}`);
        this.env[m[1]] = m[2];
      }
      return { out: '' };
    },
    whoami() { return { out: this.user }; },
    date() { return { out: new Date().toString() }; },
    uname(args) {
      return { out: args.includes('-a') ? `GrudgeOS gsh ${VERSION} browser ${typeof navigator !== 'undefined' ? navigator.userAgent : 'node'}` : 'GrudgeOS' };
    },
    neofetch() {
      const used = this.vfs.totalBytes();
      return { out: [
        `${this.user}@grudgeos`,
        '-------------',
        'OS: GrudgeOS (Puter Monitor AI)',
        `Shell: gsh ${VERSION}`,
        'Runtime: your browser (no server, no AI spend)',
        `Storage: ${(used / 1024).toFixed(1)} KB of ${MAX_TOTAL_BYTES / 1024 / 1024} MB on this device`,
        `Installed app: ${typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ? 'yes' : 'no (browser tab)'}`,
      ].join('\n') };
    },
    df() {
      const used = this.vfs.totalBytes();
      return { out: `Filesystem  Used      Size  Mounted on\nidb         ${(used / 1024).toFixed(1)}K  ${MAX_TOTAL_BYTES / 1024}K  /` };
    },
    apps() {
      const list = this.hooks.listApps ? this.hooks.listApps() : [];
      return { out: list.length ? list.join('  ') : 'No app list available here.' };
    },
    open(args) {
      const { pos, named } = parseArgs(args);
      const id = named.filepath || named.name || pos[0];
      if (!id) throw new ShellError('open: which app? (try: apps)');
      if (!this.hooks.openApp) throw new ShellError('open: no desktop to open apps in');
      const ok = this.hooks.openApp(id);
      if (ok === false) throw new ShellError(`open: unknown app: ${id} (try: apps)`);
      return { out: `opening ${id}` };
    },
    ps() {
      const list = this.hooks.listWindows ? this.hooks.listWindows() : [];
      return { out: list.length ? list.join('\n') : 'No open windows.' };
    },
  };

  // ── Browser terminal UI ──────────────────────────────────────────────
  function mountTerminal(outputEl, inputEl, opts) {
    opts = opts || {};
    const promptEl = opts.promptEl || null;
    const shell = new Shell({
      store: opts.store || (typeof indexedDB !== 'undefined' ? new IdbStore() : new MemoryStore()),
      user: opts.user,
      hooks: opts.hooks,
    });
    const print = (text, cls) => {
      if (text == null || text === '') return;
      const line = document.createElement('div');
      line.style.whiteSpace = 'pre-wrap';
      line.style.wordBreak = 'break-word';
      if (cls === 'err') line.style.color = '#ff7a7a';
      if (cls === 'cmd') line.style.color = '#70d4a8';
      line.textContent = text; // never innerHTML
      outputEl.appendChild(line);
      outputEl.scrollTop = outputEl.scrollHeight;
    };
    let hIndex = -1;
    const ready = shell.init().then(() => {
      if (promptEl) promptEl.textContent = shell.prompt();
      try { print(shell.vfs.read('/etc/motd').trim()); } catch (_) { /* no motd */ }
    });
    inputEl.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        await ready;
        const line = inputEl.value;
        inputEl.value = '';
        hIndex = -1;
        print(`${shell.prompt()} ${line}`, 'cmd');
        const res = await shell.run(line);
        if (res.clear) outputEl.textContent = '';
        print(res.out, res.code ? 'err' : null);
        if (promptEl) promptEl.textContent = shell.prompt();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault();
        const h = shell.history;
        if (!h.length) return;
        if (hIndex === -1) hIndex = h.length;
        hIndex = Math.max(0, Math.min(h.length, hIndex + (e.key === 'ArrowUp' ? -1 : 1)));
        inputEl.value = h[hIndex] || '';
      } else if (e.key === 'Tab') {
        e.preventDefault();
        await ready;
        const parts = inputEl.value.split(' ');
        const last = parts[parts.length - 1];
        let pool;
        if (parts.length === 1) pool = shell.commandNames().concat(Object.keys(ALIASES));
        else {
          const slash = last.lastIndexOf('/');
          const base = slash >= 0 ? last.slice(0, slash + 1) : '';
          try { pool = shell.vfs.list(shell.resolve(base || '.')).map((i) => base + i.name + (i.type === 'dir' ? '/' : '')); }
          catch (_) { pool = []; }
        }
        const hits = pool.filter((p) => p.toLowerCase().startsWith(last.toLowerCase()));
        if (hits.length === 1) { parts[parts.length - 1] = hits[0]; inputEl.value = parts.join(' '); }
        else if (hits.length > 1) print(hits.slice(0, 40).join('  '));
      } else if (e.key === 'l' && e.ctrlKey) {
        e.preventDefault();
        outputEl.textContent = '';
      }
    });
    return shell;
  }

  // Replace the desktop's simulated terminal with gsh when loaded in GrudgeOS.
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const desktopHooks = () => ({
      openApp(id) {
        const fn = window.openApp || (window.parent && window.parent.openApp);
        if (typeof fn !== 'function') return false;
        fn(String(id).toLowerCase());
        return true;
      },
      listApps() {
        const reg = window.GrudgeFleetRegistry && window.GrudgeFleetRegistry.APPS;
        const ids = new Set(reg ? Object.keys(reg) : []);
        document.querySelectorAll('[data-app]').forEach((el) => {
          const id = el.getAttribute('data-app');
          if (id && !el.dataset.purged) ids.add(id);
        });
        return [...ids].sort();
      },
      listWindows() {
        return [...document.querySelectorAll('.window')].map((w, i) =>
          `${String(i + 1).padStart(3)}  ${w.getAttribute('data-app-id') || w.id || 'window'}  ${(w.querySelector('.window-title') || {}).textContent || ''}`.trim());
      },
    });
    window.initTerminal = function () {
      const output = document.getElementById('terminal-output');
      const input = document.getElementById('terminal-input');
      if (!output || !input || input.dataset.gsh) return;
      input.dataset.gsh = '1';
      const promptEl = input.previousElementSibling;
      const user = (window.PuterAuth && typeof window.PuterAuth.getUsername === 'function' && window.PuterAuth.getUsername()) || 'guest';
      const header = document.querySelector('#terminal-app .terminal-header div:last-child');
      if (header) header.textContent = 'Grudge Shell — bash and PowerShell commands, runs in your browser';
      mountTerminal(output, input, { promptEl, user, hooks: desktopHooks() });
      input.focus();
    };
  }

  return { VERSION, Shell, VFS, MemoryStore, IdbStore, ShellError, parse, tokenize, parseArgs, mountTerminal, ALIASES };
});
