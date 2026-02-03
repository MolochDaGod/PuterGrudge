class IconGenerator {
  constructor() {
    this.cache = new Map();
    this.basePath = '/grudgeos/assets/icons/';
    this.defaultIcons = this.getDefaultIcons();
  }

  getDefaultIcons() {
    return {
      'ai-studio': { path: this.basePath + 'ai-studio.png', fallbackColor: '#8b5cf6' },
      'code-studio': { path: this.basePath + 'code-studio.png', fallbackColor: '#00ff88' },
      'games-launcher': { path: this.basePath + 'games-launcher.png', fallbackColor: '#ff6b35' },
      'compute-pods': { path: this.basePath + 'compute-pods.png', fallbackColor: '#00f5ff' },
      'agent-swarm': { path: this.basePath + 'agent-swarm.png', fallbackColor: '#a855f7' },
      'file-manager': { path: this.basePath + 'file-manager.png', fallbackColor: '#22c55e' },
      'terminal': { path: this.basePath + 'terminal.png', fallbackColor: '#14b8a6' },
      'settings': { path: this.basePath + 'settings.png', fallbackColor: '#6b7280' },
      'grudge-chat': { path: this.basePath + 'grudge-chat.png', fallbackColor: '#ec4899' },
      'deploy': { path: this.basePath + 'deploy.png', fallbackColor: '#3b82f6' },
      'run-exe': { path: this.basePath + 'run-exe.png', fallbackColor: '#22c55e' },
      'run-task': { path: this.basePath + 'run-task.png', fallbackColor: '#eab308' },
      'preview': { path: this.basePath + 'preview.png', fallbackColor: '#06b6d4' },
      'debug': { path: this.basePath + 'debug.png', fallbackColor: '#ef4444' },
      'build': { path: this.basePath + 'build.png', fallbackColor: '#f97316' },
      'ai-tool': { path: this.basePath + 'ai-tool.png', fallbackColor: '#8b5cf6' },
      'network': { path: this.basePath + 'network.png', fallbackColor: '#3b82f6' },
      'canvas': { path: this.basePath + 'canvas.png', fallbackColor: '#a855f7' },
      'observer': { path: this.basePath + 'observer.png', fallbackColor: '#14b8a6' }
    };
  }

  async generateIcon(prompt, options = {}) {
    const {
      size = 64,
      style = 'cyberpunk',
      saveAs = null
    } = options;

    if (typeof puter === 'undefined' || !puter.ai) {
      console.warn('[IconGenerator] Puter not available, using fallback');
      return this.createFallbackIcon(prompt, options);
    }

    const fullPrompt = `${style} style icon for ${prompt}, dark background, neon glow, flat design, game UI style, high contrast, 64x64 pixel art quality`;

    try {
      const result = await puter.ai.txt2img(fullPrompt, {
        size: `${size}x${size}`,
        testMode: false
      });

      if (result && result.src) {
        if (saveAs) {
          await this.saveIcon(result.src, saveAs);
        }
        this.cache.set(prompt, result.src);
        return result.src;
      }
    } catch (error) {
      console.error('[IconGenerator] Generation failed:', error);
    }

    return this.createFallbackIcon(prompt, options);
  }

  async saveIcon(dataUrl, filename) {
    if (typeof puter !== 'undefined' && puter.fs) {
      try {
        const path = `/grudgeos/assets/icons/${filename}`;
        const blob = await this.dataUrlToBlob(dataUrl);
        await puter.fs.write(path, blob);
        console.log(`[IconGenerator] Saved icon to ${path}`);
        return path;
      } catch (error) {
        console.error('[IconGenerator] Save failed:', error);
      }
    }
    return null;
  }

  async dataUrlToBlob(dataUrl) {
    const response = await fetch(dataUrl);
    return response.blob();
  }

  createFallbackIcon(name, options = {}) {
    const { size = 64, color = null } = options;
    
    const colors = ['#8b5cf6', '#00ff88', '#00f5ff', '#ff6b35', '#ec4899', '#22c55e'];
    const baseColor = color || colors[Math.abs(this.hashCode(name)) % colors.length];
    
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, baseColor);
    gradient.addColorStop(1, this.darkenColor(baseColor, 40));
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(4, 4, size-8, size-8, 12);
    ctx.fill();

    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2;
    ctx.shadowColor = baseColor;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.roundRect(4, 4, size-8, size-8, 12);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size/2.5}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    
    const initial = name.charAt(0).toUpperCase();
    ctx.fillText(initial, size/2, size/2);

    return canvas.toDataURL('image/png');
  }

  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }

  darkenColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = Math.max(0, (num >> 16) - amt);
    const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    const B = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
  }

  getIcon(name) {
    if (this.cache.has(name)) {
      return this.cache.get(name);
    }
    
    const defaultIcon = this.defaultIcons[name];
    if (defaultIcon) {
      return defaultIcon.path;
    }
    
    return this.createFallbackIcon(name);
  }

  async generateSystemIcons() {
    const systems = [
      { name: 'ai-studio', prompt: 'AI brain neural network chip' },
      { name: 'code-studio', prompt: 'code editor brackets syntax highlighting' },
      { name: 'games-launcher', prompt: 'gamepad controller joystick' },
      { name: 'compute-pods', prompt: 'server rack cloud computing' },
      { name: 'agent-swarm', prompt: 'robot swarm network nodes' },
      { name: 'file-manager', prompt: 'folder files directory tree' },
      { name: 'terminal', prompt: 'command line console prompt' },
      { name: 'settings', prompt: 'gear cog configuration' },
      { name: 'grudge-chat', prompt: 'chat bubble message communication' },
      { name: 'deploy', prompt: 'rocket launch deployment' },
      { name: 'canvas', prompt: 'art canvas paint brush creative' },
      { name: 'observer', prompt: 'eye monitoring surveillance' }
    ];

    const results = {};
    for (const system of systems) {
      try {
        const icon = await this.generateIcon(system.prompt, {
          style: 'cyberpunk dark',
          saveAs: `${system.name}.png`
        });
        results[system.name] = icon;
        console.log(`[IconGenerator] Generated icon for ${system.name}`);
      } catch (error) {
        console.error(`[IconGenerator] Failed to generate ${system.name}:`, error);
        results[system.name] = this.createFallbackIcon(system.name);
      }
    }
    return results;
  }

  renderIcon(iconData, size = 32) {
    if (!iconData) {
      return this.createFallbackIcon('unknown', { size });
    }
    
    if (iconData.iconType === 'image' || (typeof iconData === 'string' && iconData.startsWith('/'))) {
      const path = typeof iconData === 'string' ? iconData : iconData.icon;
      return `<img src="${path}" alt="icon" class="agent-icon-img" style="width:${size}px;height:${size}px;border-radius:8px;object-fit:cover;">`;
    }
    
    if (typeof iconData === 'string' && iconData.startsWith('data:')) {
      return `<img src="${iconData}" alt="icon" style="width:${size}px;height:${size}px;border-radius:8px;">`;
    }
    
    if (typeof iconData === 'object' && iconData.icon) {
      return this.renderIcon(iconData.icon, size);
    }
    
    const fallback = this.createFallbackIcon(String(iconData), { size });
    return `<img src="${fallback}" alt="icon" style="width:${size}px;height:${size}px;border-radius:8px;">`;
  }
}

const iconGenerator = new IconGenerator();

if (typeof window !== 'undefined') {
  window.IconGenerator = iconGenerator;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IconGenerator, iconGenerator };
}
