class ScreenInScreen {
  constructor(container, options = {}) {
    this.container = container;
    this.screens = new Map();
    this.activeScreen = null;
    this.zIndexCounter = 100;
    this.options = {
      allowNesting: options.allowNesting !== false,
      maxNestingDepth: options.maxNestingDepth || 3,
      onScreenChange: options.onScreenChange || (() => {}),
      theme: options.theme || 'neon'
    };
    
    this.setupContainer();
  }
  
  setupContainer() {
    this.container.style.position = 'relative';
    this.container.style.overflow = 'hidden';
    
    this.screenContainer = document.createElement('div');
    this.screenContainer.className = 'sis-container';
    this.screenContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      pointer-events: none;
      z-index: 1000;
    `;
    this.container.appendChild(this.screenContainer);
    
    this.taskbar = document.createElement('div');
    this.taskbar.className = 'sis-taskbar';
    this.taskbar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 36px;
      background: linear-gradient(180deg, rgba(20, 20, 35, 0.98), rgba(10, 10, 20, 0.98));
      border-top: 1px solid rgba(0, 255, 136, 0.3);
      display: flex;
      align-items: center;
      padding: 0 8px;
      gap: 6px;
      z-index: 9999;
      pointer-events: auto;
      overflow-x: auto;
    `;
    this.container.appendChild(this.taskbar);
  }
  
  createScreen(id, options = {}) {
    if (this.screens.has(id)) {
      return this.focusScreen(id);
    }
    
    const screen = document.createElement('div');
    screen.className = 'sis-screen';
    screen.dataset.screenId = id;
    screen.style.cssText = `
      position: absolute;
      left: ${options.x || 50 + this.screens.size * 30}px;
      top: ${options.y || 50 + this.screens.size * 30}px;
      width: ${options.width || 500}px;
      height: ${options.height || 400}px;
      background: ${options.transparent ? 'transparent' : 'rgba(15, 15, 28, 0.98)'};
      border: 1px solid rgba(0, 255, 136, 0.4);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 255, 136, 0.1);
      z-index: ${this.zIndexCounter++};
      pointer-events: auto;
      transition: box-shadow 0.2s;
    `;
    
    const header = this.createHeader(id, options);
    const content = this.createContent(options);
    const resizer = this.createResizer();
    
    screen.append(header, content, resizer);
    this.screenContainer.appendChild(screen);
    
    const screenData = {
      id,
      element: screen,
      header,
      content,
      options,
      state: {
        x: options.x || 50,
        y: options.y || 50,
        width: options.width || 500,
        height: options.height || 400,
        minimized: false,
        maximized: false,
        childWindowManager: null
      },
      restoreState: null
    };
    
    this.screens.set(id, screenData);
    this.setupDrag(screenData);
    this.setupResize(screenData);
    
    screen.addEventListener('mousedown', () => this.focusScreen(id));
    
    if (options.enableWindowManager && this.options.allowNesting) {
      this.initNestedWindowManager(screenData);
    }
    
    this.updateTaskbar();
    this.options.onScreenChange('created', screenData);
    
    return screenData;
  }
  
  createHeader(id, options) {
    const header = document.createElement('div');
    header.className = 'sis-header';
    header.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 10px;
      background: linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 200, 255, 0.08));
      border-bottom: 1px solid rgba(0, 255, 136, 0.2);
      cursor: move;
      user-select: none;
      gap: 8px;
    `;
    
    if (options.icon) {
      const icon = document.createElement('span');
      icon.innerHTML = options.icon;
      icon.style.cssText = 'font-size: 14px; display: flex; align-items: center;';
      header.appendChild(icon);
    }
    
    const title = document.createElement('span');
    title.className = 'sis-title';
    title.textContent = options.title || 'Virtual Screen';
    title.style.cssText = `
      flex: 1;
      font-size: 12px;
      font-weight: 600;
      color: #00ff88;
      font-family: 'Orbitron', monospace;
    `;
    header.appendChild(title);
    
    const controls = document.createElement('div');
    controls.style.cssText = 'display: flex; gap: 6px;';
    
    const minBtn = this.createControlBtn('−', '#ffaa00', () => this.minimizeScreen(id));
    const maxBtn = this.createControlBtn('□', '#00ff88', () => this.toggleMaximize(id));
    const closeBtn = this.createControlBtn('×', '#ff4455', () => this.closeScreen(id));
    
    controls.append(minBtn, maxBtn, closeBtn);
    header.appendChild(controls);
    
    return header;
  }
  
  createControlBtn(text, color, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      width: 18px;
      height: 18px;
      border: none;
      border-radius: 3px;
      background: rgba(255, 255, 255, 0.1);
      color: ${color};
      font-size: 13px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.15s;
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.2)';
      btn.style.transform = 'scale(1.1)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.1)';
      btn.style.transform = 'scale(1)';
    });
    return btn;
  }
  
  createContent(options) {
    const content = document.createElement('div');
    content.className = 'sis-content';
    content.style.cssText = `
      flex: 1;
      overflow: auto;
      position: relative;
      background: ${options.contentBg || 'transparent'};
    `;
    
    if (options.iframe) {
      const iframe = document.createElement('iframe');
      iframe.src = options.iframe;
      iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
      iframe.sandbox = options.sandbox || 'allow-scripts allow-same-origin allow-forms';
      content.appendChild(iframe);
    } else if (options.content) {
      if (typeof options.content === 'string') {
        content.innerHTML = options.content;
      } else {
        content.appendChild(options.content);
      }
    }
    
    return content;
  }
  
  createResizer() {
    const resizer = document.createElement('div');
    resizer.className = 'sis-resizer';
    resizer.style.cssText = `
      position: absolute;
      right: 0;
      bottom: 0;
      width: 14px;
      height: 14px;
      cursor: se-resize;
      background: linear-gradient(135deg, transparent 50%, rgba(0, 255, 136, 0.5) 50%);
    `;
    return resizer;
  }
  
  initNestedWindowManager(screenData) {
    if (typeof WindowManager === 'undefined') {
      console.warn('[SIS] WindowManager not available for nesting');
      return;
    }
    
    const wmContainer = document.createElement('div');
    wmContainer.style.cssText = 'width: 100%; height: 100%; position: relative;';
    screenData.content.innerHTML = '';
    screenData.content.appendChild(wmContainer);
    
    screenData.state.childWindowManager = new WindowManager(wmContainer, {
      snapZones: true,
      onWindowChange: (event, win) => {
        this.options.onScreenChange('nested-' + event, { screen: screenData, window: win });
      }
    });
  }
  
  setupDrag(screenData) {
    const { element, header, state } = screenData;
    let isDragging = false;
    let offsetX = 0, offsetY = 0;
    
    header.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      isDragging = true;
      this.focusScreen(screenData.id);
      
      const rect = element.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      if (state.maximized && screenData.restoreState) {
        const grabRatioX = (e.clientX - rect.left) / rect.width;
        state.width = screenData.restoreState.width;
        state.height = screenData.restoreState.height;
        state.x = e.clientX - containerRect.left - (state.width * grabRatioX);
        state.y = 0;
        
        element.style.width = state.width + 'px';
        element.style.height = state.height + 'px';
        element.style.left = state.x + 'px';
        element.style.top = state.y + 'px';
        
        state.maximized = false;
      }
      
      offsetX = e.clientX - rect.left;
      offsetY = e.clientY - rect.top;
      
      element.style.transition = 'none';
      
      const onMove = (e) => {
        if (!isDragging) return;
        const containerRect = this.container.getBoundingClientRect();
        state.x = Math.max(0, Math.min(containerRect.width - state.width, e.clientX - containerRect.left - offsetX));
        state.y = Math.max(0, Math.min(containerRect.height - state.height - 36, e.clientY - containerRect.top - offsetY));
        element.style.left = state.x + 'px';
        element.style.top = state.y + 'px';
      };
      
      const onUp = () => {
        isDragging = false;
        element.style.transition = '';
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this.options.onScreenChange('moved', screenData);
      };
      
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }
  
  setupResize(screenData) {
    const { element, state } = screenData;
    const resizer = element.querySelector('.sis-resizer');
    
    resizer.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = state.width;
      const startH = state.height;
      
      const onMove = (e) => {
        state.width = Math.max(300, startW + (e.clientX - startX));
        state.height = Math.max(200, startH + (e.clientY - startY));
        element.style.width = state.width + 'px';
        element.style.height = state.height + 'px';
        state.maximized = false;
      };
      
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this.options.onScreenChange('resized', screenData);
      };
      
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }
  
  focusScreen(id) {
    const screenData = this.screens.get(id);
    if (!screenData) return null;
    
    screenData.element.style.zIndex = ++this.zIndexCounter;
    screenData.element.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 255, 136, 0.2)';
    
    this.screens.forEach((s, sid) => {
      if (sid !== id) {
        s.element.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 255, 136, 0.1)';
      }
    });
    
    this.activeScreen = id;
    this.updateTaskbar();
    this.options.onScreenChange('focused', screenData);
    return screenData;
  }
  
  minimizeScreen(id) {
    const screenData = this.screens.get(id);
    if (!screenData) return;
    
    screenData.element.style.display = 'none';
    screenData.state.minimized = true;
    this.updateTaskbar();
    this.options.onScreenChange('minimized', screenData);
  }
  
  restoreScreen(id) {
    const screenData = this.screens.get(id);
    if (!screenData) return;
    
    screenData.element.style.display = 'flex';
    screenData.state.minimized = false;
    this.focusScreen(id);
    this.options.onScreenChange('restored', screenData);
  }
  
  toggleMaximize(id) {
    const screenData = this.screens.get(id);
    if (!screenData) return;
    
    const { element, state } = screenData;
    const containerRect = this.container.getBoundingClientRect();
    
    if (state.maximized) {
      if (screenData.restoreState) {
        state.x = screenData.restoreState.x;
        state.y = screenData.restoreState.y;
        state.width = screenData.restoreState.width;
        state.height = screenData.restoreState.height;
      }
      state.maximized = false;
    } else {
      screenData.restoreState = { x: state.x, y: state.y, width: state.width, height: state.height };
      state.x = 0;
      state.y = 0;
      state.width = containerRect.width;
      state.height = containerRect.height - 36;
      state.maximized = true;
    }
    
    element.style.transition = 'all 0.2s ease';
    element.style.left = state.x + 'px';
    element.style.top = state.y + 'px';
    element.style.width = state.width + 'px';
    element.style.height = state.height + 'px';
    
    setTimeout(() => element.style.transition = '', 200);
    this.options.onScreenChange('maximized', screenData);
  }
  
  closeScreen(id) {
    const screenData = this.screens.get(id);
    if (!screenData) return;
    
    screenData.element.remove();
    this.screens.delete(id);
    this.updateTaskbar();
    this.options.onScreenChange('closed', screenData);
  }
  
  updateTaskbar() {
    this.taskbar.innerHTML = '';
    
    this.screens.forEach((screenData, id) => {
      const item = document.createElement('button');
      item.className = 'sis-taskbar-item';
      item.style.cssText = `
        padding: 5px 10px;
        background: ${this.activeScreen === id && !screenData.state.minimized ? 'rgba(0, 255, 136, 0.2)' : 'rgba(30, 30, 50, 0.9)'};
        border: 1px solid ${this.activeScreen === id && !screenData.state.minimized ? 'rgba(0, 255, 136, 0.5)' : 'rgba(100, 100, 140, 0.3)'};
        border-radius: 4px;
        color: ${screenData.state.minimized ? '#888' : '#e8e8ff'};
        font-size: 11px;
        cursor: pointer;
        white-space: nowrap;
        font-family: 'Rajdhani', sans-serif;
        transition: all 0.15s;
      `;
      
      const icon = screenData.options.icon || '🖥️';
      const title = screenData.options.title || 'Screen';
      item.innerHTML = `${icon} ${title.substring(0, 15)}${title.length > 15 ? '...' : ''}`;
      
      item.addEventListener('click', () => {
        if (screenData.state.minimized) {
          this.restoreScreen(id);
        } else {
          this.focusScreen(id);
        }
      });
      
      item.addEventListener('mouseenter', () => {
        item.style.borderColor = 'rgba(0, 255, 136, 0.6)';
        item.style.background = 'rgba(0, 255, 136, 0.15)';
      });
      
      item.addEventListener('mouseleave', () => {
        item.style.borderColor = this.activeScreen === id && !screenData.state.minimized ? 'rgba(0, 255, 136, 0.5)' : 'rgba(100, 100, 140, 0.3)';
        item.style.background = this.activeScreen === id && !screenData.state.minimized ? 'rgba(0, 255, 136, 0.2)' : 'rgba(30, 30, 50, 0.9)';
      });
      
      this.taskbar.appendChild(item);
    });
  }
  
  getScreen(id) {
    return this.screens.get(id);
  }
  
  getAllScreens() {
    return Array.from(this.screens.values());
  }
  
  setScreenContent(id, content) {
    const screenData = this.screens.get(id);
    if (!screenData) return false;
    
    if (typeof content === 'string') {
      screenData.content.innerHTML = content;
    } else {
      screenData.content.innerHTML = '';
      screenData.content.appendChild(content);
    }
    return true;
  }
  
  setScreenTitle(id, title) {
    const screenData = this.screens.get(id);
    if (!screenData) return false;
    
    const titleEl = screenData.header.querySelector('.sis-title');
    if (titleEl) titleEl.textContent = title;
    screenData.options.title = title;
    this.updateTaskbar();
    return true;
  }
  
  getNestedWindowManager(id) {
    const screenData = this.screens.get(id);
    return screenData?.state.childWindowManager || null;
  }
  
  cascadeScreens() {
    let offset = 20;
    this.screens.forEach((screenData) => {
      screenData.state.x = offset;
      screenData.state.y = offset;
      screenData.element.style.left = offset + 'px';
      screenData.element.style.top = offset + 'px';
      offset += 30;
    });
  }
  
  tileScreens() {
    const count = this.screens.size;
    if (count === 0) return;
    
    const containerRect = this.container.getBoundingClientRect();
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const w = containerRect.width / cols;
    const h = (containerRect.height - 36) / rows;
    
    let i = 0;
    this.screens.forEach((screenData) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      screenData.state.x = col * w;
      screenData.state.y = row * h;
      screenData.state.width = w;
      screenData.state.height = h;
      
      screenData.element.style.transition = 'all 0.3s ease';
      screenData.element.style.left = screenData.state.x + 'px';
      screenData.element.style.top = screenData.state.y + 'px';
      screenData.element.style.width = screenData.state.width + 'px';
      screenData.element.style.height = screenData.state.height + 'px';
      
      setTimeout(() => screenData.element.style.transition = '', 300);
      i++;
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ScreenInScreen;
}
