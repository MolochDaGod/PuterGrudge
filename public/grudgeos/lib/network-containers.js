class NetworkContainers {
  constructor() {
    this.containers = new Map();
    this.tools = this.getDefaultTools();
    this.initialized = false;
  }

  getDefaultTools() {
    return [
      {
        id: 'nmap',
        name: 'Nmap Scanner',
        icon: '🔍',
        description: 'Network exploration and security auditing',
        image: 'nmap:latest',
        ports: ['80/tcp', '443/tcp'],
        category: 'scanning',
        commands: ['nmap -sV', 'nmap -sS', 'nmap -A', 'nmap -p-'],
        resources: { cpu: '0.5', memory: '256MB' }
      },
      {
        id: 'wireshark',
        name: 'Wireshark',
        icon: '🦈',
        description: 'Network protocol analyzer and packet capture',
        image: 'wireshark:latest',
        ports: ['3000/tcp'],
        category: 'analysis',
        commands: ['tshark', 'dumpcap', 'editcap'],
        resources: { cpu: '1.0', memory: '512MB' }
      },
      {
        id: 'netcat',
        name: 'Netcat',
        icon: '🐱',
        description: 'TCP/UDP networking utility',
        image: 'netcat:alpine',
        ports: [],
        category: 'utility',
        commands: ['nc -l', 'nc -z', 'nc -v'],
        resources: { cpu: '0.1', memory: '64MB' }
      },
      {
        id: 'tcpdump',
        name: 'TCPDump',
        icon: '📦',
        description: 'Command-line packet analyzer',
        image: 'tcpdump:latest',
        ports: [],
        category: 'analysis',
        commands: ['tcpdump -i', 'tcpdump -w', 'tcpdump -r'],
        resources: { cpu: '0.3', memory: '128MB' }
      },
      {
        id: 'masscan',
        name: 'Masscan',
        icon: '⚡',
        description: 'High-speed TCP port scanner',
        image: 'masscan:latest',
        ports: [],
        category: 'scanning',
        commands: ['masscan -p', 'masscan --rate'],
        resources: { cpu: '0.8', memory: '256MB' }
      },
      {
        id: 'nikto',
        name: 'Nikto',
        icon: '🕷️',
        description: 'Web server vulnerability scanner',
        image: 'nikto:latest',
        ports: [],
        category: 'scanning',
        commands: ['nikto -h', 'nikto -ssl'],
        resources: { cpu: '0.5', memory: '256MB' }
      },
      {
        id: 'curl',
        name: 'cURL',
        icon: '🌐',
        description: 'Command-line HTTP client',
        image: 'curl:alpine',
        ports: [],
        category: 'utility',
        commands: ['curl -X GET', 'curl -X POST', 'curl -I'],
        resources: { cpu: '0.1', memory: '64MB' }
      },
      {
        id: 'dns-tools',
        name: 'DNS Tools',
        icon: '🔗',
        description: 'DNS lookup and diagnostics (dig, nslookup)',
        image: 'dnsutils:latest',
        ports: [],
        category: 'utility',
        commands: ['dig', 'nslookup', 'host'],
        resources: { cpu: '0.1', memory: '64MB' }
      }
    ];
  }

  async initialize() {
    if (this.initialized) return;
    
    try {
      if (typeof puter !== 'undefined' && puter.kv) {
        const saved = await puter.kv.get('network_containers');
        if (saved) {
          const parsed = JSON.parse(saved);
          Object.entries(parsed).forEach(([id, state]) => {
            this.containers.set(id, state);
          });
        }
      }
      this.initialized = true;
    } catch (e) {
      console.log('NetworkContainers: Using local state');
      this.initialized = true;
    }
  }

  async saveState() {
    try {
      if (typeof puter !== 'undefined' && puter.kv) {
        const state = Object.fromEntries(this.containers);
        await puter.kv.set('network_containers', JSON.stringify(state));
      }
    } catch (e) {
      console.error('Failed to save container state:', e);
    }
  }

  getTools() {
    return this.tools;
  }

  getToolsByCategory(category) {
    return this.tools.filter(t => t.category === category);
  }

  getTool(id) {
    return this.tools.find(t => t.id === id);
  }

  getContainer(id) {
    return this.containers.get(id);
  }

  getAllContainers() {
    return Array.from(this.containers.entries()).map(([id, state]) => {
      const tool = this.getTool(id);
      return {
        toolId: id,
        toolName: tool?.name || id,
        toolIcon: tool?.icon || '📦',
        containerId: state.containerId,
        status: state.status,
        startedAt: state.startedAt,
        stoppedAt: state.stoppedAt,
        uptime: state.uptime || 0,
        cpu: state.cpu || 0,
        memory: state.memory || 0,
        network: state.network || { rx: 0, tx: 0 },
        logs: state.logs || []
      };
    });
  }

  getRunningContainers() {
    return this.getAllContainers().filter(c => c.status === 'running');
  }

  async deploy(toolId) {
    const tool = this.getTool(toolId);
    if (!tool) throw new Error(`Tool ${toolId} not found`);

    const existingContainer = this.containers.get(toolId);
    if (existingContainer && existingContainer.status === 'running') {
      return { success: false, message: 'Container already running' };
    }

    if (existingContainer && existingContainer.status === 'stopped') {
      return await this.start(toolId);
    }

    const container = {
      toolId: toolId,
      containerId: this.generateContainerId(),
      status: 'starting',
      startedAt: null,
      stoppedAt: null,
      uptime: 0,
      cpu: 0,
      memory: 0,
      network: { rx: 0, tx: 0 },
      logs: existingContainer?.logs || []
    };

    this.containers.set(toolId, container);
    this.addLog(toolId, `Pulling image ${tool.image}...`);
    
    await this.simulateDelay(500);
    this.addLog(toolId, `Image pulled successfully`);
    this.addLog(toolId, `Creating container from ${tool.image}...`);
    
    await this.simulateDelay(300);
    this.addLog(toolId, `Container ${container.containerId} created`);
    this.addLog(toolId, `Starting container...`);
    
    await this.simulateDelay(200);
    
    container.status = 'running';
    container.startedAt = Date.now();
    container.cpu = Math.random() * parseFloat(tool.resources.cpu) * 50;
    container.memory = Math.random() * parseInt(tool.resources.memory) * 0.7;
    
    this.addLog(toolId, `Container ${container.containerId} is now running`);
    this.containers.set(toolId, container);
    
    this.startResourceMonitoring(toolId);
    await this.saveState();

    return { success: true, container };
  }

  async start(toolId) {
    const container = this.containers.get(toolId);
    if (!container) {
      return await this.deploy(toolId);
    }

    if (container.status === 'running') {
      return { success: false, message: 'Container already running' };
    }

    const tool = this.getTool(toolId);
    this.addLog(toolId, `Starting container ${container.containerId}...`);
    container.status = 'starting';
    this.containers.set(toolId, container);

    await this.simulateDelay(300);

    container.status = 'running';
    container.startedAt = Date.now();
    container.stoppedAt = null;
    container.cpu = Math.random() * parseFloat(tool.resources.cpu) * 50;
    container.memory = Math.random() * parseInt(tool.resources.memory) * 0.7;
    
    this.addLog(toolId, `Container ${container.containerId} is now running`);
    this.containers.set(toolId, container);
    
    this.startResourceMonitoring(toolId);
    await this.saveState();

    return { success: true, container };
  }

  async stop(toolId) {
    const container = this.containers.get(toolId);
    if (!container) {
      return { success: false, message: 'Container not found' };
    }

    if (container.status !== 'running') {
      return { success: false, message: 'Container not running' };
    }

    this.addLog(toolId, `Stopping container ${container.containerId}...`);
    container.status = 'stopping';
    this.containers.set(toolId, container);

    await this.simulateDelay(500);

    this.stopResourceMonitoring(toolId);
    container.status = 'stopped';
    container.stoppedAt = Date.now();
    this.addLog(toolId, `Container ${container.containerId} stopped`);
    
    this.containers.set(toolId, container);
    await this.saveState();

    return { success: true };
  }

  async restart(toolId) {
    await this.stop(toolId);
    await this.simulateDelay(200);
    return await this.deploy(toolId);
  }

  async remove(toolId) {
    const container = this.containers.get(toolId);
    if (!container) {
      return { success: false, message: 'Container not found' };
    }

    if (container.status === 'running') {
      await this.stop(toolId);
    }

    this.addLog(toolId, `Removing container ${container.containerId}...`);
    await this.simulateDelay(300);
    
    this.containers.delete(toolId);
    await this.saveState();

    return { success: true };
  }

  async execute(toolId, command) {
    const container = this.containers.get(toolId);
    if (!container || container.status !== 'running') {
      return { success: false, message: 'Container not running' };
    }

    this.addLog(toolId, `$ ${command}`);
    
    await this.simulateDelay(Math.random() * 500 + 200);
    
    const output = this.simulateCommandOutput(toolId, command);
    this.addLog(toolId, output);

    return { success: true, output };
  }

  simulateCommandOutput(toolId, command) {
    const tool = this.getTool(toolId);
    
    const outputs = {
      'nmap': `Starting Nmap scan...
Host is up (0.0045s latency).
PORT     STATE SERVICE     VERSION
22/tcp   open  ssh         OpenSSH 8.4
80/tcp   open  http        nginx 1.18.0
443/tcp  open  https       nginx 1.18.0
3306/tcp open  mysql       MySQL 8.0.26
Nmap done: 1 IP scanned in 2.34 seconds`,
      
      'wireshark': `Capturing on 'eth0'
1   0.000000 192.168.1.1 → 192.168.1.100 TCP 74 443 → 52431 [SYN, ACK]
2   0.000156 192.168.1.100 → 192.168.1.1 TCP 66 52431 → 443 [ACK]
3   0.001234 192.168.1.100 → 192.168.1.1 TLSv1.3 583 Client Hello
4   0.045678 192.168.1.1 → 192.168.1.100 TLSv1.3 1514 Server Hello
5 packets captured`,
      
      'netcat': `Connection to 192.168.1.1 443 port [tcp/https] succeeded!
[v] Listening on 0.0.0.0:8080`,
      
      'tcpdump': `tcpdump: listening on eth0, link-type EN10MB
15:42:31.123456 IP 192.168.1.100.52431 > 192.168.1.1.443: Flags [S]
15:42:31.124567 IP 192.168.1.1.443 > 192.168.1.100.52431: Flags [S.]
15:42:31.124678 IP 192.168.1.100.52431 > 192.168.1.1.443: Flags [.]
3 packets captured`,
      
      'masscan': `Starting masscan at 2024-01-10 15:42:31
Scanning 1 hosts [65535 ports/host]
Discovered open port 22/tcp on 192.168.1.1
Discovered open port 80/tcp on 192.168.1.1
Discovered open port 443/tcp on 192.168.1.1
rate: 10000.00-kpps, 100.00% done`,
      
      'nikto': `- Nikto v2.1.6
+ Target IP: 192.168.1.1
+ Target Hostname: example.com
+ Target Port: 443
+ SSL Info: Subject: /CN=example.com
+ Start Time: 2024-01-10 15:42:31
+ Server: nginx/1.18.0
+ /: The X-Frame-Options header is not present.
+ /admin/: Directory indexing found.
+ 1 host(s) tested`,
      
      'curl': `HTTP/1.1 200 OK
Server: nginx/1.18.0
Content-Type: text/html; charset=UTF-8
Content-Length: 1256
Connection: keep-alive
X-Powered-By: CloudPilot/1.0`,
      
      'dns-tools': `; <<>> DiG 9.16.1 <<>> example.com
;; ANSWER SECTION:
example.com.    300    IN    A    93.184.216.34
example.com.    300    IN    AAAA 2606:2800:220:1:248:1893:25c8:1946

;; Query time: 12 msec
;; SERVER: 8.8.8.8#53(8.8.8.8)`
    };

    return outputs[toolId] || `Command executed: ${command}`;
  }

  addLog(toolId, message) {
    const container = this.containers.get(toolId);
    if (container) {
      if (!container.logs) container.logs = [];
      container.logs.push({
        timestamp: new Date().toISOString(),
        message
      });
      if (container.logs.length > 100) {
        container.logs = container.logs.slice(-100);
      }
      this.containers.set(toolId, container);
    }
  }

  getLogs(toolId) {
    const container = this.containers.get(toolId);
    return container?.logs || [];
  }

  startResourceMonitoring(toolId) {
    const container = this.containers.get(toolId);
    if (!container) return;

    container.monitorInterval = setInterval(() => {
      const c = this.containers.get(toolId);
      if (c && c.status === 'running') {
        c.uptime = Date.now() - c.startedAt;
        c.cpu = Math.max(0.1, c.cpu + (Math.random() - 0.5) * 5);
        c.memory = Math.max(10, c.memory + (Math.random() - 0.5) * 20);
        c.network.rx += Math.floor(Math.random() * 1024);
        c.network.tx += Math.floor(Math.random() * 512);
        this.containers.set(toolId, c);
      }
    }, 2000);
  }

  stopResourceMonitoring(toolId) {
    const container = this.containers.get(toolId);
    if (container?.monitorInterval) {
      clearInterval(container.monitorInterval);
      delete container.monitorInterval;
    }
  }

  generateContainerId() {
    const chars = 'abcdef0123456789';
    let id = '';
    for (let i = 0; i < 12; i++) {
      id += chars[Math.floor(Math.random() * chars.length)];
    }
    return id;
  }

  simulateDelay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  formatUptime(ms) {
    if (!ms) return '0s';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  getStats() {
    const running = this.getRunningContainers();
    let totalCpu = 0;
    let totalMemory = 0;
    let totalRx = 0;
    let totalTx = 0;

    running.forEach(c => {
      totalCpu += c.cpu || 0;
      totalMemory += c.memory || 0;
      totalRx += c.network?.rx || 0;
      totalTx += c.network?.tx || 0;
    });

    return {
      containersRunning: running.length,
      totalContainers: this.containers.size,
      totalCpu: totalCpu.toFixed(1),
      totalMemory: this.formatBytes(totalMemory * 1024 * 1024),
      networkRx: this.formatBytes(totalRx),
      networkTx: this.formatBytes(totalTx)
    };
  }
}

window.NetworkContainers = new NetworkContainers();
