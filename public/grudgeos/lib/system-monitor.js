class GRD17SystemMonitor {
  constructor() {
    this.bootTime = Date.now();
    this.processes = [];
    this.agents = [];
    this.metrics = {
      cpu: 0,
      memory: 0,
      network: { up: 0, down: 0 },
      storage: { used: 0, total: 50 * 1024 },
      grd17: {
        ratio: 3.7,
        saved: 2.4 * 1024,
        efficiency: 94.2
      }
    };
    this.virtualMemory = {
      total: 16384,
      used: 0,
      swap: { total: 8192, used: 0 },
      cache: { total: 4096, used: 0 }
    };
    this.updateInterval = null;
    this.initialized = false;
  }

  init() {
    if (this.initialized && this.updateInterval) {
      return;
    }
    
    if (!this.processes.length) {
      this.generateProcesses();
    }
    if (!this.agents.length) {
      this.generateAgents();
    }
    this.startMonitoring();
    this.initialized = true;
    console.log('[GRD-17] System Monitor initialized');
  }

  generateProcesses() {
    const processTemplates = [
      { name: 'System Kernel', icon: '⚙️', priority: 'High', base: { cpu: 2, memory: 128 } },
      { name: 'Window Manager', icon: '🖥️', priority: 'High', base: { cpu: 5, memory: 256 } },
      { name: 'GrudgeCloud Sync', icon: '☁️', priority: 'Normal', base: { cpu: 3, memory: 64 } },
      { name: 'AI Service', icon: '🤖', priority: 'High', base: { cpu: 15, memory: 512 } },
      { name: 'File Indexer', icon: '📁', priority: 'Low', base: { cpu: 1, memory: 32 } },
      { name: 'Network Handler', icon: '🌐', priority: 'Normal', base: { cpu: 2, memory: 48 } },
      { name: 'GRD-17 Compressor', icon: '📦', priority: 'Normal', base: { cpu: 8, memory: 256 } },
      { name: 'Audio Engine', icon: '🔊', priority: 'Normal', base: { cpu: 3, memory: 96 } },
      { name: 'Security Monitor', icon: '🔒', priority: 'High', base: { cpu: 4, memory: 128 } },
      { name: 'Cache Manager', icon: '💾', priority: 'Normal', base: { cpu: 2, memory: 192 } },
      { name: 'Event Dispatcher', icon: '📡', priority: 'Normal', base: { cpu: 1, memory: 24 } },
      { name: 'Theme Renderer', icon: '🎨', priority: 'Low', base: { cpu: 1, memory: 48 } }
    ];

    this.processes = processTemplates.map((p, i) => ({
      id: `proc_${i}`,
      name: p.name,
      icon: p.icon,
      status: Math.random() > 0.2 ? 'Running' : 'Idle',
      cpu: p.base.cpu + Math.floor(Math.random() * 5),
      memory: p.base.memory + Math.floor(Math.random() * 50),
      priority: p.priority
    }));
  }

  generateAgents() {
    this.agents = [
      { id: 'orchestrator', name: 'Orchestrator', model: 'claude-sonnet-4', status: 'Active', tasks: 3 },
      { id: 'coder', name: 'Code Agent', model: 'claude-sonnet-4', status: 'Idle', tasks: 0 },
      { id: 'artist', name: 'Art Agent', model: 'gpt-4o', status: 'Idle', tasks: 0 },
      { id: 'analyst', name: 'Analyst', model: 'gemini-2.0-flash', status: 'Idle', tasks: 0 },
      { id: 'assistant', name: 'Assistant', model: 'gpt-4o', status: 'Active', tasks: 1 }
    ];
  }

  startMonitoring() {
    if (this.updateInterval) clearInterval(this.updateInterval);
    
    this.updateInterval = setInterval(() => {
      this.updateMetrics();
      this.updateUI();
    }, 1000);
    
    this.updateMetrics();
    this.updateUI();
  }

  updateMetrics() {
    this.metrics.cpu = Math.min(100, 15 + Math.floor(Math.random() * 25));
    this.metrics.memory = Math.min(100, 30 + Math.floor(Math.random() * 20));
    this.metrics.network.up = Math.floor(Math.random() * 150);
    this.metrics.network.down = Math.floor(Math.random() * 500);
    
    this.virtualMemory.used = Math.floor(this.virtualMemory.total * (this.metrics.memory / 100));
    this.virtualMemory.swap.used = Math.floor(this.virtualMemory.swap.total * 0.25 + Math.random() * 500);
    this.virtualMemory.cache.used = Math.floor(this.virtualMemory.cache.total * 0.5 + Math.random() * 500);
    
    this.metrics.grd17.ratio = (3.2 + Math.random() * 0.8).toFixed(1);
    this.metrics.grd17.efficiency = (90 + Math.random() * 8).toFixed(1);

    this.processes.forEach(p => {
      if (p.status === 'Running') {
        p.cpu = Math.max(1, p.cpu + Math.floor(Math.random() * 5) - 2);
        p.memory = Math.max(16, p.memory + Math.floor(Math.random() * 20) - 10);
      }
    });
  }

  updateUI() {
    this.updateTaskManagerUI();
    this.updateSystemMonitorUI();
  }

  updateTaskManagerUI() {
    const processList = document.getElementById('process-list');
    if (processList) {
      processList.innerHTML = this.processes.map(p => `
        <div class="tm-row" data-process="${p.id}">
          <div class="tm-col name">
            <span class="icon">${p.icon}</span>
            <span>${p.name}</span>
          </div>
          <div class="tm-col status ${p.status.toLowerCase()}">${p.status}</div>
          <div class="tm-col cpu">${p.cpu}%</div>
          <div class="tm-col memory">${p.memory} MB</div>
          <div class="tm-col priority">${p.priority}</div>
        </div>
      `).join('');
    }

    const agentList = document.getElementById('agent-process-list');
    if (agentList) {
      agentList.innerHTML = this.agents.map(a => `
        <div class="tm-row" data-agent="${a.id}">
          <div class="tm-col name">${a.name}</div>
          <div class="tm-col model">${a.model}</div>
          <div class="tm-col status ${a.status.toLowerCase()}">${a.status}</div>
          <div class="tm-col tasks">${a.tasks}</div>
        </div>
      `).join('');
    }

    this.updateElement('cpu-value', this.metrics.cpu);
    this.updateElement('mem-value', this.virtualMemory.used);
    this.updateElement('net-value', this.metrics.network.down);
    this.updateElement('grd-value', this.metrics.grd17.efficiency);

    this.updateElement('vmem-used', this.virtualMemory.used);
    this.updateElement('swap-used', this.virtualMemory.swap.used);
    this.updateElement('cache-used', this.virtualMemory.cache.used);

    this.updateElement('grd-compression', 'Active');
    this.updateElement('grd-ratio', `${this.metrics.grd17.ratio}:1`);
    this.updateElement('data-saved', `${(this.metrics.grd17.saved / 1024).toFixed(1)} GB`);
    this.updateElement('mem-efficiency', `${this.metrics.grd17.efficiency}%`);

    this.updateElement('process-count', this.processes.length);
    this.updateElement('footer-cpu', this.metrics.cpu);
    this.updateElement('footer-mem', this.metrics.memory);
    this.updateElement('uptime', this.formatUptime());
  }

  updateSystemMonitorUI() {
    this.updateElement('cpu-gauge-val', `${this.metrics.cpu}%`);
    this.updateElement('mem-gauge-val', `${this.metrics.memory}%`);
    this.updateElement('mem-used', `${(this.virtualMemory.used / 1024).toFixed(1)} GB`);
    this.updateElement('mem-avail', `${((this.virtualMemory.total - this.virtualMemory.used) / 1024).toFixed(1)} GB`);

    this.updateElement('grd-ratio-val', `${this.metrics.grd17.ratio}:1`);
    this.updateElement('grd-saved-val', `${(this.metrics.grd17.saved / 1024).toFixed(1)} GB`);
    this.updateElement('grd-eff-val', `${Math.round(this.metrics.grd17.efficiency)}%`);

    this.updateElement('net-up', `${this.metrics.network.up} KB/s`);
    this.updateElement('net-down', `${this.metrics.network.down} KB/s`);
    this.updateElement('net-latency', `${8 + Math.floor(Math.random() * 10)}ms`);
    this.updateElement('net-conn', `${3 + Math.floor(Math.random() * 4)}`);

    this.updateElement('ai-agents', this.agents.filter(a => a.status === 'Active').length);
    this.updateElement('ai-queue', Math.floor(Math.random() * 3));
    this.updateElement('ai-calls', Math.floor(Math.random() * 50));

    this.updateElement('sys-uptime', this.formatUptime());
    this.updateElement('boot-time', new Date(this.bootTime).toLocaleTimeString());

    const cpuGauge = document.getElementById('cpu-gauge');
    if (cpuGauge) {
      const offset = 126 - (this.metrics.cpu / 100) * 80;
      cpuGauge.style.strokeDashoffset = offset;
    }

    const memGauge = document.getElementById('mem-gauge');
    if (memGauge) {
      const offset = 126 - (this.metrics.memory / 100) * 80;
      memGauge.style.strokeDashoffset = offset;
    }

    const storageBar = document.getElementById('storage-used-bar');
    if (storageBar) {
      const storagePercent = 35 + Math.floor(Math.random() * 10);
      storageBar.style.width = `${storagePercent}%`;
      this.updateElement('storage-used-label', `${(storagePercent * 0.5).toFixed(1)} GB used`);
    }
  }

  updateElement(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  formatUptime() {
    const ms = Date.now() - this.bootTime;
    const s = Math.floor(ms / 1000) % 60;
    const m = Math.floor(ms / 60000) % 60;
    const h = Math.floor(ms / 3600000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  setupTabEvents(container) {
    const tabs = container.querySelectorAll('.tm-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabName = tab.dataset.tab;
        container.querySelectorAll('.tm-panel').forEach(panel => {
          panel.classList.remove('active');
        });
        
        const targetPanel = container.querySelector(`.tm-panel.${tabName}`);
        if (targetPanel) targetPanel.classList.add('active');
      });
    });
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    this.initialized = false;
  }

  pause() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  resume() {
    if (!this.updateInterval) {
      this.startMonitoring();
    }
  }
}

const grd17Monitor = new GRD17SystemMonitor();

if (typeof window !== 'undefined') {
  window.GRD17Monitor = grd17Monitor;
}
