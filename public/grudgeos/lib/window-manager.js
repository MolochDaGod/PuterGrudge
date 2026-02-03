class WindowManager {
  constructor(container, options = {}) {
    this.container = container;
    this.windows = new Map();
    this.zIndexCounter = 100;
    this.snapZones = options.snapZones !== false;
    this.onWindowChange = options.onWindowChange || (() => {});
    
    this.snapIndicator = null;
    this.createSnapIndicator();
  }
  
  createSnapIndicator() {
    this.snapIndicator = document.createElement('div');
    this.snapIndicator.className = 'snap-indicator';
    this.snapIndicator.style.cssText = `
      position: absolute;
      pointer-events: none;
      background: rgba(0, 255, 136, 0.1);
      border: 2px solid rgba(0, 255, 136, 0.5);
      border-radius: 8px;
      z-index: 9999;
      display: none;
      transition: all 0.15s ease;
    `;
    this.container.appendChild(this.snapIndicator);
  }
  
  createWindow(id, options = {}) {
    const win = document.createElement('div');
    win.className = 'wm-window';
    win.dataset.windowId = id;
    win.style.cssText = `
      position: absolute;
      left: ${options.x || 50}px;
      top: ${options.y || 50}px;
      width: ${options.width || 400}px;
      height: ${options.height || 300}px;
      background: rgba(20, 20, 35, 0.95);
      border: 1px solid rgba(0, 255, 136, 0.3);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      z-index: ${this.zIndexCounter++};
    `;
    
    const titleBar = document.createElement('div');
    titleBar.className = 'wm-titlebar';
    titleBar.style.cssText = `
      display: flex;
      align-items: center;
      padding: 8px 12px;
      background: linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 200, 255, 0.1));
      border-bottom: 1px solid rgba(0, 255, 136, 0.2);
      cursor: move;
      user-select: none;
      gap: 8px;
    `;
    
    const title = document.createElement('span');
    title.className = 'wm-title';
    title.textContent = options.title || 'Window';
    title.style.cssText = `
      flex: 1;
      font-size: 12px;
      font-weight: 600;
      color: #00ff88;
    `;
    
    const controls = document.createElement('div');
    controls.className = 'wm-controls';
    controls.style.cssText = 'display: flex; gap: 6px;';
    
    const minimizeBtn = this.createControlButton('−', '#ffaa00', () => this.minimizeWindow(id));
    const maximizeBtn = this.createControlButton('□', '#00ff88', () => this.toggleMaximize(id));
    const closeBtn = this.createControlButton('×', '#ff4444', () => this.closeWindow(id));
    
    controls.append(minimizeBtn, maximizeBtn, closeBtn);
    titleBar.append(title, controls);
    
    const content = document.createElement('div');
    content.className = 'wm-content';
    content.style.cssText = `
      flex: 1;
      overflow: auto;
      position: relative;
    `;
    
    if (options.content) {
      if (typeof options.content === 'string') {
        content.innerHTML = options.content;
      } else {
        content.appendChild(options.content);
      }
    }
    
    if (options.iframe) {
      const iframe = document.createElement('iframe');
      iframe.src = options.iframe;
      iframe.style.cssText = 'width: 100%; height: 100%; border: none;';
      iframe.sandbox = options.sandbox || 'allow-scripts allow-same-origin';
      content.appendChild(iframe);
    }
    
    const resizeHandle = document.createElement('div');
    resizeHandle.className = 'wm-resize';
    resizeHandle.style.cssText = `
      position: absolute;
      right: 0;
      bottom: 0;
      width: 16px;
      height: 16px;
      cursor: se-resize;
      background: linear-gradient(135deg, transparent 50%, rgba(0, 255, 136, 0.5) 50%);
    `;
    
    win.append(titleBar, content, resizeHandle);
    this.container.appendChild(win);
    
    const windowData = {
      id,
      element: win,
      titleBar,
      content,
      options,
      state: {
        x: options.x || 50,
        y: options.y || 50,
        width: options.width || 400,
        height: options.height || 300,
        minimized: false,
        maximized: false,
        snapped: null
      },
      restoreState: null
    };
    
    this.windows.set(id, windowData);
    this.setupDrag(windowData);
    this.setupResize(windowData);
    
    win.addEventListener('mousedown', () => this.focusWindow(id));
    
    this.onWindowChange('created', windowData);
    return windowData;
  }
  
  createControlButton(text, color, onClick) {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      width: 20px;
      height: 20px;
      border: none;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      color: ${color};
      font-size: 14px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    `;
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });
    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.2)';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.1)';
    });
    return btn;
  }
  
  setupDrag(windowData) {
    const { element, titleBar, state } = windowData;
    let isDragging = false;
    let grabRatioX = 0.5;
    let grabRatioY = 0.5;
    
    titleBar.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      
      isDragging = true;
      element.style.transition = 'none';
      this.focusWindow(windowData.id);
      
      const rect = element.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      
      if (state.snapped && windowData.restoreState) {
        grabRatioX = (e.clientX - rect.left) / rect.width;
        grabRatioY = (e.clientY - rect.top) / rect.height;
        
        state.width = windowData.restoreState.width;
        state.height = windowData.restoreState.height;
        
        state.x = e.clientX - containerRect.left - (state.width * grabRatioX);
        state.y = e.clientY - containerRect.top - (state.height * grabRatioY);
        
        element.style.width = state.width + 'px';
        element.style.height = state.height + 'px';
        element.style.left = state.x + 'px';
        element.style.top = state.y + 'px';
        
        state.snapped = null;
        state.maximized = false;
      } else {
        grabRatioX = (e.clientX - rect.left) / rect.width;
        grabRatioY = (e.clientY - rect.top) / rect.height;
      }
      
      const onMouseMove = (e) => {
        if (!isDragging) return;
        
        const containerRect = this.container.getBoundingClientRect();
        state.x = e.clientX - containerRect.left - (state.width * grabRatioX);
        state.y = e.clientY - containerRect.top - (state.height * grabRatioY);
        
        element.style.left = Math.max(0, state.x) + 'px';
        element.style.top = Math.max(0, state.y) + 'px';
        
        if (this.snapZones) {
          this.checkSnapZones(e, windowData);
        }
      };
      
      const onMouseUp = (e) => {
        isDragging = false;
        element.style.transition = '';
        this.snapIndicator.style.display = 'none';
        
        if (this.snapZones && this.pendingSnap) {
          this.applySnap(windowData, this.pendingSnap);
          this.pendingSnap = null;
        }
        
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        this.onWindowChange('moved', windowData);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
  
  checkSnapZones(e, windowData) {
    const containerRect = this.container.getBoundingClientRect();
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    const w = containerRect.width;
    const h = containerRect.height;
    const margin = 20;
    
    let snap = null;
    
    if (x < margin && y < margin) snap = 'top-left';
    else if (x > w - margin && y < margin) snap = 'top-right';
    else if (x < margin && y > h - margin) snap = 'bottom-left';
    else if (x > w - margin && y > h - margin) snap = 'bottom-right';
    else if (x < margin) snap = 'left';
    else if (x > w - margin) snap = 'right';
    else if (y < margin) snap = 'top';
    
    this.pendingSnap = snap;
    
    if (snap) {
      this.showSnapPreview(snap);
    } else {
      this.snapIndicator.style.display = 'none';
    }
  }
  
  showSnapPreview(zone) {
    const rect = this.container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    
    const positions = {
      'left': { left: 0, top: 0, width: w/2, height: h },
      'right': { left: w/2, top: 0, width: w/2, height: h },
      'top': { left: 0, top: 0, width: w, height: h/2 },
      'top-left': { left: 0, top: 0, width: w/2, height: h/2 },
      'top-right': { left: w/2, top: 0, width: w/2, height: h/2 },
      'bottom-left': { left: 0, top: h/2, width: w/2, height: h/2 },
      'bottom-right': { left: w/2, top: h/2, width: w/2, height: h/2 }
    };
    
    const pos = positions[zone];
    if (pos) {
      this.snapIndicator.style.display = 'block';
      this.snapIndicator.style.left = pos.left + 'px';
      this.snapIndicator.style.top = pos.top + 'px';
      this.snapIndicator.style.width = pos.width + 'px';
      this.snapIndicator.style.height = pos.height + 'px';
    }
  }
  
  applySnap(windowData, zone) {
    const { element, state } = windowData;
    const rect = this.container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    
    if (!windowData.restoreState) {
      windowData.restoreState = {
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height
      };
    }
    
    const positions = {
      'left': { x: 0, y: 0, width: w/2, height: h },
      'right': { x: w/2, y: 0, width: w/2, height: h },
      'top': { x: 0, y: 0, width: w, height: h },
      'top-left': { x: 0, y: 0, width: w/2, height: h/2 },
      'top-right': { x: w/2, y: 0, width: w/2, height: h/2 },
      'bottom-left': { x: 0, y: h/2, width: w/2, height: h/2 },
      'bottom-right': { x: w/2, y: h/2, width: w/2, height: h/2 }
    };
    
    const pos = positions[zone];
    if (pos) {
      state.x = pos.x;
      state.y = pos.y;
      state.width = pos.width;
      state.height = pos.height;
      state.snapped = zone;
      
      element.style.transition = 'all 0.2s ease';
      element.style.left = pos.x + 'px';
      element.style.top = pos.y + 'px';
      element.style.width = pos.width + 'px';
      element.style.height = pos.height + 'px';
      
      setTimeout(() => element.style.transition = '', 200);
    }
  }
  
  setupResize(windowData) {
    const { element, state } = windowData;
    const resizeHandle = element.querySelector('.wm-resize');
    
    resizeHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startW = state.width;
      const startH = state.height;
      
      const onMouseMove = (e) => {
        state.width = Math.max(200, startW + (e.clientX - startX));
        state.height = Math.max(150, startH + (e.clientY - startY));
        element.style.width = state.width + 'px';
        element.style.height = state.height + 'px';
        
        state.snapped = null;
        windowData.restoreState = null;
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        this.onWindowChange('resized', windowData);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }
  
  focusWindow(id) {
    const windowData = this.windows.get(id);
    if (windowData) {
      windowData.element.style.zIndex = ++this.zIndexCounter;
      this.onWindowChange('focused', windowData);
    }
  }
  
  minimizeWindow(id) {
    const windowData = this.windows.get(id);
    if (windowData) {
      windowData.element.style.display = 'none';
      windowData.state.minimized = true;
      this.onWindowChange('minimized', windowData);
    }
  }
  
  restoreWindow(id) {
    const windowData = this.windows.get(id);
    if (windowData) {
      windowData.element.style.display = 'flex';
      windowData.state.minimized = false;
      this.focusWindow(id);
      this.onWindowChange('restored', windowData);
    }
  }
  
  toggleMaximize(id) {
    const windowData = this.windows.get(id);
    if (!windowData) return;
    
    const { element, state } = windowData;
    
    if (state.maximized) {
      if (windowData.restoreState) {
        state.x = windowData.restoreState.x;
        state.y = windowData.restoreState.y;
        state.width = windowData.restoreState.width;
        state.height = windowData.restoreState.height;
      }
      state.maximized = false;
      state.snapped = null;
    } else {
      windowData.restoreState = {
        x: state.x,
        y: state.y,
        width: state.width,
        height: state.height
      };
      state.x = 0;
      state.y = 0;
      state.width = this.container.clientWidth;
      state.height = this.container.clientHeight;
      state.maximized = true;
    }
    
    element.style.transition = 'all 0.2s ease';
    element.style.left = state.x + 'px';
    element.style.top = state.y + 'px';
    element.style.width = state.width + 'px';
    element.style.height = state.height + 'px';
    
    setTimeout(() => element.style.transition = '', 200);
    this.onWindowChange('maximized', windowData);
  }
  
  closeWindow(id) {
    const windowData = this.windows.get(id);
    if (windowData) {
      windowData.element.remove();
      this.windows.delete(id);
      this.onWindowChange('closed', windowData);
    }
  }
  
  getWindow(id) {
    return this.windows.get(id);
  }
  
  getAllWindows() {
    return Array.from(this.windows.values());
  }
  
  setContent(id, content) {
    const windowData = this.windows.get(id);
    if (windowData) {
      const contentEl = windowData.content;
      if (typeof content === 'string') {
        contentEl.innerHTML = content;
      } else {
        contentEl.innerHTML = '';
        contentEl.appendChild(content);
      }
    }
  }
  
  setTitle(id, title) {
    const windowData = this.windows.get(id);
    if (windowData) {
      const titleEl = windowData.titleBar.querySelector('.wm-title');
      if (titleEl) titleEl.textContent = title;
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WindowManager;
}
