/**
 * GrudgeOS Studio Canvas Engine
 * Fixed-size canvas with viewport navigation (zoom/pan),
 * drag-and-drop, gizmo controls, layers, undo/redo, copy/paste
 */

class CanvasEngine {
  constructor(container, options = {}) {
    this.container = typeof container === 'string' 
      ? document.getElementById(container) 
      : container;
    
    this.options = {
      canvasWidth: options.canvasWidth || 4096,
      canvasHeight: options.canvasHeight || 2304,
      minZoom: options.minZoom || 0.1,
      maxZoom: options.maxZoom || 5,
      gridSize: options.gridSize || 20,
      snapToGrid: options.snapToGrid ?? true,
      showGrid: options.showGrid ?? true,
      ...options
    };

    this.viewport = {
      x: 0,
      y: 0,
      zoom: 1,
      width: 0,
      height: 0
    };

    this.layers = [];
    this.selectedNodes = [];
    this.clipboard = [];
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 100;
    
    this.isDragging = false;
    this.isPanning = false;
    this.dragStart = { x: 0, y: 0 };
    this.activeGizmo = null;
    
    this.init();
  }

  init() {
    this.createCanvas();
    this.setupEventListeners();
    this.createDefaultLayer();
    this.centerViewport();
    this.render();
  }

  createCanvas() {
    this.container.innerHTML = '';
    this.container.style.cssText = `
      position: relative;
      overflow: hidden;
      background: #0a0a1a;
      cursor: grab;
    `;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.container.clientWidth || 800;
    this.canvas.height = this.container.clientHeight || 600;
    this.canvas.style.cssText = 'display: block; width: 100%; height: 100%;';
    this.container.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');

    this.viewport.width = this.canvas.width;
    this.viewport.height = this.canvas.height;

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
  }

  handleResize() {
    this.canvas.width = this.container.clientWidth;
    this.canvas.height = this.container.clientHeight;
    this.viewport.width = this.canvas.width;
    this.viewport.height = this.canvas.height;
    this.render();
  }

  centerViewport() {
    this.viewport.x = (this.options.canvasWidth - this.viewport.width / this.viewport.zoom) / 2;
    this.viewport.y = (this.options.canvasHeight - this.viewport.height / this.viewport.zoom) / 2;
  }

  setupEventListeners() {
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e), { passive: false });
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('dblclick', (e) => this.handleDoubleClick(e));
    
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    document.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  handleWheel(e) {
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const worldX = this.viewport.x + mouseX / this.viewport.zoom;
    const worldY = this.viewport.y + mouseY / this.viewport.zoom;

    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    const newZoom = Math.max(this.options.minZoom, 
                   Math.min(this.options.maxZoom, this.viewport.zoom * zoomFactor));

    this.viewport.x = worldX - mouseX / newZoom;
    this.viewport.y = worldY - mouseY / newZoom;
    this.viewport.zoom = newZoom;

    this.render();
    this.onZoomChange?.();
  }

  handleMouseDown(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(mouseX, mouseY);

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      this.isPanning = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
      return;
    }

    const gizmoHit = this.hitTestGizmo(worldPos);
    if (gizmoHit) {
      this.activeGizmo = gizmoHit;
      this.isDragging = true;
      this.dragStart = { ...worldPos };
      return;
    }

    const node = this.hitTestNode(worldPos);
    if (node) {
      if (!e.shiftKey) {
        this.selectedNodes = [node];
      } else {
        const idx = this.selectedNodes.indexOf(node);
        if (idx === -1) {
          this.selectedNodes.push(node);
        } else {
          this.selectedNodes.splice(idx, 1);
        }
      }
      this.isDragging = true;
      this.dragStart = { ...worldPos };
    } else {
      if (!e.shiftKey) {
        this.selectedNodes = [];
      }
      this.isPanning = true;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.canvas.style.cursor = 'grabbing';
    }

    this.render();
  }

  handleMouseMove(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(mouseX, mouseY);

    if (this.isPanning) {
      const dx = (e.clientX - this.dragStart.x) / this.viewport.zoom;
      const dy = (e.clientY - this.dragStart.y) / this.viewport.zoom;
      this.viewport.x -= dx;
      this.viewport.y -= dy;
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.render();
      return;
    }

    if (this.isDragging && this.activeGizmo) {
      this.handleGizmoDrag(worldPos);
      this.render();
      return;
    }

    if (this.isDragging && this.selectedNodes.length > 0) {
      const dx = worldPos.x - this.dragStart.x;
      const dy = worldPos.y - this.dragStart.y;
      
      this.selectedNodes.forEach(node => {
        node.x += dx;
        node.y += dy;
        if (this.options.snapToGrid) {
          node.x = Math.round(node.x / this.options.gridSize) * this.options.gridSize;
          node.y = Math.round(node.y / this.options.gridSize) * this.options.gridSize;
        }
      });
      
      this.dragStart = { ...worldPos };
      this.render();
      return;
    }

    this.updateCursor(worldPos);
  }

  handleMouseUp(e) {
    if (this.isDragging && this.selectedNodes.length > 0) {
      this.saveHistory('Move nodes');
    }
    this.isPanning = false;
    this.isDragging = false;
    this.activeGizmo = null;
    this.canvas.style.cursor = 'grab';
  }

  handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.handleMouseDown({ 
        clientX: touch.clientX, 
        clientY: touch.clientY, 
        button: 0,
        altKey: false,
        shiftKey: false
      });
    } else if (e.touches.length === 2) {
      this.pinchStart = {
        distance: this.getPinchDistance(e.touches),
        zoom: this.viewport.zoom
      };
    }
  }

  handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    } else if (e.touches.length === 2 && this.pinchStart) {
      const distance = this.getPinchDistance(e.touches);
      const scale = distance / this.pinchStart.distance;
      this.viewport.zoom = Math.max(this.options.minZoom,
                          Math.min(this.options.maxZoom, this.pinchStart.zoom * scale));
      this.render();
      this.onZoomChange?.();
    }
  }

  handleTouchEnd(e) {
    this.handleMouseUp(e);
    this.pinchStart = null;
  }

  getPinchDistance(touches) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY
    );
  }

  handleDoubleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const worldPos = this.screenToWorld(mouseX, mouseY);

    const node = this.hitTestNode(worldPos);
    if (node && node.onDoubleClick) {
      node.onDoubleClick(node);
    }
  }

  handleKeyDown(e) {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'z':
          e.preventDefault();
          if (e.shiftKey) {
            this.redo();
          } else {
            this.undo();
          }
          break;
        case 'y':
          e.preventDefault();
          this.redo();
          break;
        case 'c':
          e.preventDefault();
          this.copy();
          break;
        case 'v':
          e.preventDefault();
          this.paste();
          break;
        case 'x':
          e.preventDefault();
          this.cut();
          break;
        case 'a':
          e.preventDefault();
          this.selectAll();
          break;
        case 'd':
          e.preventDefault();
          this.duplicate();
          break;
      }
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedNodes.length > 0) {
        e.preventDefault();
        this.deleteSelected();
      }
    }

    if (e.key === 'Escape') {
      this.selectedNodes = [];
      this.render();
    }
  }

  screenToWorld(screenX, screenY) {
    return {
      x: this.viewport.x + screenX / this.viewport.zoom,
      y: this.viewport.y + screenY / this.viewport.zoom
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.viewport.x) * this.viewport.zoom,
      y: (worldY - this.viewport.y) * this.viewport.zoom
    };
  }

  createDefaultLayer() {
    this.addLayer({ name: 'Layer 1', visible: true, locked: false });
  }

  addLayer(options = {}) {
    const layer = {
      id: `layer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: options.name || `Layer ${this.layers.length + 1}`,
      visible: options.visible ?? true,
      locked: options.locked ?? false,
      opacity: options.opacity ?? 1,
      nodes: []
    };
    this.layers.push(layer);
    this.saveHistory('Add layer');
    return layer;
  }

  removeLayer(layerId) {
    const idx = this.layers.findIndex(l => l.id === layerId);
    if (idx > -1 && this.layers.length > 1) {
      this.layers.splice(idx, 1);
      this.saveHistory('Remove layer');
    }
  }

  getActiveLayer() {
    return this.layers.find(l => l.visible && !l.locked) || this.layers[0];
  }

  addNode(type, options = {}) {
    const layer = options.layer || this.getActiveLayer();
    const node = {
      id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      x: options.x ?? 100,
      y: options.y ?? 100,
      width: options.width ?? 100,
      height: options.height ?? 100,
      rotation: options.rotation ?? 0,
      fill: options.fill ?? '#3b82f6',
      stroke: options.stroke ?? '#1e40af',
      strokeWidth: options.strokeWidth ?? 2,
      opacity: options.opacity ?? 1,
      text: options.text ?? '',
      fontSize: options.fontSize ?? 14,
      data: options.data ?? {},
      ...options
    };
    layer.nodes.push(node);
    this.saveHistory('Add node');
    this.render();
    return node;
  }

  removeNode(nodeId) {
    for (const layer of this.layers) {
      const idx = layer.nodes.findIndex(n => n.id === nodeId);
      if (idx > -1) {
        layer.nodes.splice(idx, 1);
        this.saveHistory('Remove node');
        this.render();
        return true;
      }
    }
    return false;
  }

  hitTestNode(worldPos) {
    for (let i = this.layers.length - 1; i >= 0; i--) {
      const layer = this.layers[i];
      if (!layer.visible) continue;
      
      for (let j = layer.nodes.length - 1; j >= 0; j--) {
        const node = layer.nodes[j];
        if (this.pointInNode(worldPos, node)) {
          return node;
        }
      }
    }
    return null;
  }

  pointInNode(point, node) {
    return point.x >= node.x && point.x <= node.x + node.width &&
           point.y >= node.y && point.y <= node.y + node.height;
  }

  hitTestGizmo(worldPos) {
    if (this.selectedNodes.length !== 1) return null;
    const node = this.selectedNodes[0];
    const handleSize = 10 / this.viewport.zoom;
    const handles = this.getGizmoHandles(node, handleSize);
    
    for (const [name, handle] of Object.entries(handles)) {
      if (Math.abs(worldPos.x - handle.x) < handleSize &&
          Math.abs(worldPos.y - handle.y) < handleSize) {
        return { type: name, node };
      }
    }
    return null;
  }

  getGizmoHandles(node, size) {
    return {
      nw: { x: node.x, y: node.y },
      ne: { x: node.x + node.width, y: node.y },
      sw: { x: node.x, y: node.y + node.height },
      se: { x: node.x + node.width, y: node.y + node.height },
      n: { x: node.x + node.width / 2, y: node.y },
      s: { x: node.x + node.width / 2, y: node.y + node.height },
      e: { x: node.x + node.width, y: node.y + node.height / 2 },
      w: { x: node.x, y: node.y + node.height / 2 },
      rotate: { x: node.x + node.width / 2, y: node.y - 30 / this.viewport.zoom }
    };
  }

  handleGizmoDrag(worldPos) {
    if (!this.activeGizmo) return;
    const { type, node } = this.activeGizmo;
    const dx = worldPos.x - this.dragStart.x;
    const dy = worldPos.y - this.dragStart.y;

    switch (type) {
      case 'nw':
        node.x += dx; node.y += dy;
        node.width -= dx; node.height -= dy;
        break;
      case 'ne':
        node.y += dy;
        node.width += dx; node.height -= dy;
        break;
      case 'sw':
        node.x += dx;
        node.width -= dx; node.height += dy;
        break;
      case 'se':
        node.width += dx; node.height += dy;
        break;
      case 'n':
        node.y += dy; node.height -= dy;
        break;
      case 's':
        node.height += dy;
        break;
      case 'e':
        node.width += dx;
        break;
      case 'w':
        node.x += dx; node.width -= dx;
        break;
      case 'rotate':
        const cx = node.x + node.width / 2;
        const cy = node.y + node.height / 2;
        node.rotation = Math.atan2(worldPos.y - cy, worldPos.x - cx) * 180 / Math.PI + 90;
        break;
    }

    node.width = Math.max(20, node.width);
    node.height = Math.max(20, node.height);
    this.dragStart = { ...worldPos };
  }

  updateCursor(worldPos) {
    if (this.selectedNodes.length === 1) {
      const gizmo = this.hitTestGizmo(worldPos);
      if (gizmo) {
        const cursors = {
          nw: 'nwse-resize', ne: 'nesw-resize', sw: 'nesw-resize', se: 'nwse-resize',
          n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize',
          rotate: 'crosshair'
        };
        this.canvas.style.cursor = cursors[gizmo.type] || 'pointer';
        return;
      }
    }

    const node = this.hitTestNode(worldPos);
    this.canvas.style.cursor = node ? 'pointer' : 'grab';
  }

  saveHistory(action) {
    const state = {
      action,
      layers: JSON.parse(JSON.stringify(this.layers)),
      selectedNodes: this.selectedNodes.map(n => n.id),
      timestamp: Date.now()
    };

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(state);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.historyIndex = this.history.length - 1;
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreState(this.history[this.historyIndex]);
      this.render();
    }
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreState(this.history[this.historyIndex]);
      this.render();
    }
  }

  restoreState(state) {
    this.layers = JSON.parse(JSON.stringify(state.layers));
    this.selectedNodes = [];
    state.selectedNodes.forEach(id => {
      for (const layer of this.layers) {
        const node = layer.nodes.find(n => n.id === id);
        if (node) this.selectedNodes.push(node);
      }
    });
  }

  copy() {
    this.clipboard = this.selectedNodes.map(n => JSON.parse(JSON.stringify(n)));
  }

  cut() {
    this.copy();
    this.deleteSelected();
  }

  paste() {
    if (this.clipboard.length === 0) return;
    
    this.selectedNodes = [];
    const layer = this.getActiveLayer();
    
    this.clipboard.forEach(nodeCopy => {
      const newNode = {
        ...nodeCopy,
        id: `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        x: nodeCopy.x + 20,
        y: nodeCopy.y + 20
      };
      layer.nodes.push(newNode);
      this.selectedNodes.push(newNode);
    });

    this.clipboard = this.selectedNodes.map(n => JSON.parse(JSON.stringify(n)));
    this.saveHistory('Paste');
    this.render();
  }

  duplicate() {
    if (this.selectedNodes.length === 0) return;
    this.copy();
    this.paste();
  }

  selectAll() {
    this.selectedNodes = [];
    this.layers.forEach(layer => {
      if (layer.visible && !layer.locked) {
        this.selectedNodes.push(...layer.nodes);
      }
    });
    this.render();
  }

  deleteSelected() {
    this.selectedNodes.forEach(node => {
      for (const layer of this.layers) {
        const idx = layer.nodes.findIndex(n => n.id === node.id);
        if (idx > -1) {
          layer.nodes.splice(idx, 1);
          break;
        }
      }
    });
    this.selectedNodes = [];
    this.saveHistory('Delete');
    this.render();
  }

  setZoom(zoom) {
    const centerX = this.viewport.x + this.viewport.width / (2 * this.viewport.zoom);
    const centerY = this.viewport.y + this.viewport.height / (2 * this.viewport.zoom);
    
    this.viewport.zoom = Math.max(this.options.minZoom, Math.min(this.options.maxZoom, zoom));
    
    this.viewport.x = centerX - this.viewport.width / (2 * this.viewport.zoom);
    this.viewport.y = centerY - this.viewport.height / (2 * this.viewport.zoom);
    
    this.render();
  }

  zoomIn() { this.setZoom(this.viewport.zoom * 1.2); }
  zoomOut() { this.setZoom(this.viewport.zoom / 1.2); }
  zoomFit() { this.centerViewport(); this.setZoom(0.5); }
  zoomReset() { this.centerViewport(); this.setZoom(1); }

  render() {
    const { ctx, canvas, viewport, options } = this;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0d1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-viewport.x * viewport.zoom, -viewport.y * viewport.zoom);
    ctx.scale(viewport.zoom, viewport.zoom);

    ctx.fillStyle = '#161b22';
    ctx.fillRect(0, 0, options.canvasWidth, options.canvasHeight);

    if (options.showGrid) {
      this.renderGrid();
    }

    this.layers.forEach(layer => {
      if (!layer.visible) return;
      ctx.globalAlpha = layer.opacity;
      layer.nodes.forEach(node => this.renderNode(node));
    });
    ctx.globalAlpha = 1;

    this.selectedNodes.forEach(node => this.renderGizmo(node));

    ctx.restore();

    this.renderHUD();
  }

  renderGrid() {
    const { ctx, options, viewport } = this;
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= options.canvasWidth; x += options.gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, options.canvasHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= options.canvasHeight; y += options.gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(options.canvasWidth, y);
      ctx.stroke();
    }
  }

  renderNode(node) {
    const { ctx } = this;
    ctx.save();
    
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(node.rotation * Math.PI / 180);
    ctx.translate(-cx, -cy);
    ctx.globalAlpha = node.opacity;

    switch (node.type) {
      case 'rect':
        ctx.fillStyle = node.fill;
        ctx.strokeStyle = node.stroke;
        ctx.lineWidth = node.strokeWidth;
        ctx.fillRect(node.x, node.y, node.width, node.height);
        ctx.strokeRect(node.x, node.y, node.width, node.height);
        break;
      case 'circle':
        ctx.fillStyle = node.fill;
        ctx.strokeStyle = node.stroke;
        ctx.lineWidth = node.strokeWidth;
        ctx.beginPath();
        ctx.ellipse(cx, cy, node.width / 2, node.height / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      case 'text':
        ctx.fillStyle = node.fill;
        ctx.font = `${node.fontSize}px system-ui, sans-serif`;
        ctx.fillText(node.text, node.x, node.y + node.fontSize);
        break;
      case 'image':
        if (node.image) {
          ctx.drawImage(node.image, node.x, node.y, node.width, node.height);
        }
        break;
      default:
        ctx.fillStyle = node.fill;
        ctx.fillRect(node.x, node.y, node.width, node.height);
    }

    ctx.restore();
  }

  renderGizmo(node) {
    const { ctx, viewport } = this;
    const handleSize = 8 / viewport.zoom;
    const handles = this.getGizmoHandles(node, handleSize);

    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / viewport.zoom;
    ctx.setLineDash([5 / viewport.zoom, 5 / viewport.zoom]);
    ctx.strokeRect(node.x, node.y, node.width, node.height);
    ctx.setLineDash([]);

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / viewport.zoom;

    Object.entries(handles).forEach(([name, handle]) => {
      ctx.beginPath();
      if (name === 'rotate') {
        ctx.arc(handle.x, handle.y, handleSize, 0, Math.PI * 2);
        ctx.fillStyle = '#10b981';
      } else {
        ctx.rect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize);
        ctx.fillStyle = '#ffffff';
      }
      ctx.fill();
      ctx.stroke();
    });

    ctx.beginPath();
    ctx.moveTo(node.x + node.width / 2, node.y);
    ctx.lineTo(handles.rotate.x, handles.rotate.y);
    ctx.strokeStyle = '#10b981';
    ctx.stroke();
  }

  renderHUD() {
    const { ctx, canvas, viewport } = this;
    
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(10, canvas.height - 35, 200, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px system-ui, sans-serif';
    ctx.fillText(`Zoom: ${(viewport.zoom * 100).toFixed(0)}% | ` +
                 `Nodes: ${this.getAllNodes().length} | ` +
                 `Selected: ${this.selectedNodes.length}`, 15, canvas.height - 18);
  }

  getAllNodes() {
    return this.layers.flatMap(l => l.nodes);
  }

  exportJSON() {
    return JSON.stringify({
      version: '1.0',
      canvasWidth: this.options.canvasWidth,
      canvasHeight: this.options.canvasHeight,
      layers: this.layers,
      viewport: this.viewport
    }, null, 2);
  }

  importJSON(json) {
    try {
      const data = typeof json === 'string' ? JSON.parse(json) : json;
      this.layers = data.layers || [];
      if (data.viewport) {
        this.viewport = { ...this.viewport, ...data.viewport };
      }
      this.selectedNodes = [];
      this.saveHistory('Import');
      this.render();
      return true;
    } catch (e) {
      console.error('Import failed:', e);
      return false;
    }
  }

  destroy() {
    this.resizeObserver?.disconnect();
    document.removeEventListener('keydown', this.handleKeyDown);
  }
}

window.CanvasEngine = CanvasEngine;
export { CanvasEngine };
