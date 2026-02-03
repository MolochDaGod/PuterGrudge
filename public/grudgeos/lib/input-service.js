/**
 * InputService - Unified Cross-Platform Input Handler
 * Handles keyboard, mouse, touch, pointer, and gamepad inputs with a consistent API
 */
class InputService {
  constructor(options = {}) {
    this.listeners = new Map();
    this.shortcuts = new Map();
    this.pointerState = { x: 0, y: 0, pressed: false, buttons: 0 };
    this.keyState = new Set();
    this.gamepadState = new Map();
    this.touchState = new Map();
    this.enabled = true;
    this.captureTarget = options.target || document;
    this.gestureThreshold = options.gestureThreshold || 50;
    this.repeatDelay = options.repeatDelay || 500;
    this.repeatRate = options.repeatRate || 50;
    
    this._repeatTimers = new Map();
    this._gestureStart = null;
    
    this.init();
  }
  
  init() {
    this.captureTarget.addEventListener('pointerdown', this._onPointerDown.bind(this), { passive: false });
    this.captureTarget.addEventListener('pointermove', this._onPointerMove.bind(this), { passive: true });
    this.captureTarget.addEventListener('pointerup', this._onPointerUp.bind(this));
    this.captureTarget.addEventListener('pointercancel', this._onPointerUp.bind(this));
    
    document.addEventListener('keydown', this._onKeyDown.bind(this));
    document.addEventListener('keyup', this._onKeyUp.bind(this));
    
    this.captureTarget.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
    
    this.captureTarget.addEventListener('contextmenu', this._onContextMenu.bind(this));
    
    if (navigator.getGamepads) {
      window.addEventListener('gamepadconnected', this._onGamepadConnected.bind(this));
      window.addEventListener('gamepaddisconnected', this._onGamepadDisconnected.bind(this));
      this._pollGamepads();
    }
    
    this.captureTarget.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    this.captureTarget.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: true });
    this.captureTarget.addEventListener('touchend', this._onTouchEnd.bind(this));
  }
  
  on(event, callback, options = {}) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push({ callback, options });
    return () => this.off(event, callback);
  }
  
  off(event, callback) {
    const listeners = this.listeners.get(event);
    if (listeners) {
      const idx = listeners.findIndex(l => l.callback === callback);
      if (idx !== -1) listeners.splice(idx, 1);
    }
  }
  
  emit(event, data) {
    if (!this.enabled) return;
    const listeners = this.listeners.get(event) || [];
    listeners.forEach(({ callback, options }) => {
      try {
        callback(data);
      } catch (e) {
        console.error(`InputService: Error in ${event} handler:`, e);
      }
    });
  }
  
  registerShortcut(combo, callback, options = {}) {
    const normalized = this._normalizeCombo(combo);
    this.shortcuts.set(normalized, { callback, options });
    return () => this.shortcuts.delete(normalized);
  }
  
  unregisterShortcut(combo) {
    this.shortcuts.delete(this._normalizeCombo(combo));
  }
  
  isKeyPressed(key) {
    return this.keyState.has(key.toLowerCase());
  }
  
  isPointerPressed(button = 0) {
    return this.pointerState.pressed && (this.pointerState.buttons & (1 << button));
  }
  
  getPointerPosition() {
    return { x: this.pointerState.x, y: this.pointerState.y };
  }
  
  getGamepad(index = 0) {
    return this.gamepadState.get(index);
  }
  
  vibrate(pattern = [100]) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }
  
  _normalizeCombo(combo) {
    return combo.toLowerCase().split('+').sort().join('+');
  }
  
  _getCurrentCombo() {
    const modifiers = [];
    if (this.keyState.has('control')) modifiers.push('ctrl');
    if (this.keyState.has('alt')) modifiers.push('alt');
    if (this.keyState.has('shift')) modifiers.push('shift');
    if (this.keyState.has('meta')) modifiers.push('meta');
    
    const keys = [...this.keyState].filter(k => 
      !['control', 'alt', 'shift', 'meta'].includes(k)
    );
    
    return [...modifiers, ...keys].sort().join('+');
  }
  
  _onPointerDown(e) {
    this.pointerState.pressed = true;
    this.pointerState.buttons = e.buttons;
    this.pointerState.x = e.clientX;
    this.pointerState.y = e.clientY;
    
    this._gestureStart = { x: e.clientX, y: e.clientY, time: Date.now() };
    
    this.emit('pointerdown', {
      x: e.clientX, y: e.clientY,
      button: e.button,
      buttons: e.buttons,
      target: e.target,
      originalEvent: e
    });
  }
  
  _onPointerMove(e) {
    this.pointerState.x = e.clientX;
    this.pointerState.y = e.clientY;
    
    const data = {
      x: e.clientX, y: e.clientY,
      movementX: e.movementX || 0,
      movementY: e.movementY || 0,
      buttons: e.buttons,
      target: e.target,
      originalEvent: e
    };
    
    this.emit('pointermove', data);
    
    if (this.pointerState.pressed) {
      this.emit('drag', data);
    }
  }
  
  _onPointerUp(e) {
    this.pointerState.pressed = false;
    this.pointerState.buttons = 0;
    
    const upData = {
      x: e.clientX, y: e.clientY,
      button: e.button,
      target: e.target,
      originalEvent: e
    };
    
    this.emit('pointerup', upData);
    
    if (this._gestureStart) {
      const dx = e.clientX - this._gestureStart.x;
      const dy = e.clientY - this._gestureStart.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const duration = Date.now() - this._gestureStart.time;
      
      if (distance > this.gestureThreshold && duration < 300) {
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        let direction = 'right';
        if (angle > 45 && angle < 135) direction = 'down';
        else if (angle > 135 || angle < -135) direction = 'left';
        else if (angle < -45 && angle > -135) direction = 'up';
        
        this.emit('swipe', { direction, distance, duration, dx, dy });
      } else if (distance < 10 && duration < 200) {
        this.emit('tap', upData);
      }
      
      this._gestureStart = null;
    }
  }
  
  _onKeyDown(e) {
    const key = e.key.toLowerCase();
    const wasPressed = this.keyState.has(key);
    this.keyState.add(key);
    
    const combo = this._getCurrentCombo();
    const shortcut = this.shortcuts.get(combo);
    
    if (shortcut) {
      if (shortcut.options.preventDefault !== false) {
        e.preventDefault();
      }
      shortcut.callback({ combo, originalEvent: e });
      return;
    }
    
    const data = {
      key,
      code: e.code,
      repeat: e.repeat,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey,
      originalEvent: e
    };
    
    if (!wasPressed) {
      this.emit('keydown', data);
    }
    
    this.emit('keypress', data);
  }
  
  _onKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keyState.delete(key);
    
    this.emit('keyup', {
      key,
      code: e.code,
      ctrl: e.ctrlKey,
      alt: e.altKey,
      shift: e.shiftKey,
      meta: e.metaKey,
      originalEvent: e
    });
  }
  
  _onWheel(e) {
    this.emit('wheel', {
      x: e.clientX,
      y: e.clientY,
      deltaX: e.deltaX,
      deltaY: e.deltaY,
      deltaZ: e.deltaZ,
      originalEvent: e
    });
  }
  
  _onContextMenu(e) {
    const shouldPrevent = this.emit('contextmenu', {
      x: e.clientX,
      y: e.clientY,
      target: e.target,
      originalEvent: e
    });
    
    if (shouldPrevent === false) {
      e.preventDefault();
    }
  }
  
  _onTouchStart(e) {
    for (const touch of e.changedTouches) {
      this.touchState.set(touch.identifier, {
        id: touch.identifier,
        startX: touch.clientX,
        startY: touch.clientY,
        x: touch.clientX,
        y: touch.clientY,
        startTime: Date.now()
      });
    }
    
    this.emit('touchstart', {
      touches: [...this.touchState.values()],
      count: this.touchState.size,
      originalEvent: e
    });
    
    if (this.touchState.size === 2) {
      const [t1, t2] = [...this.touchState.values()];
      this._pinchStart = Math.hypot(t2.x - t1.x, t2.y - t1.y);
    }
  }
  
  _onTouchMove(e) {
    for (const touch of e.changedTouches) {
      const state = this.touchState.get(touch.identifier);
      if (state) {
        state.x = touch.clientX;
        state.y = touch.clientY;
      }
    }
    
    if (this.touchState.size === 2 && this._pinchStart) {
      const [t1, t2] = [...this.touchState.values()];
      const currentDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      const scale = currentDist / this._pinchStart;
      
      this.emit('pinch', {
        scale,
        centerX: (t1.x + t2.x) / 2,
        centerY: (t1.y + t2.y) / 2
      });
    }
    
    this.emit('touchmove', {
      touches: [...this.touchState.values()],
      count: this.touchState.size,
      originalEvent: e
    });
  }
  
  _onTouchEnd(e) {
    for (const touch of e.changedTouches) {
      this.touchState.delete(touch.identifier);
    }
    
    if (this.touchState.size < 2) {
      this._pinchStart = null;
    }
    
    this.emit('touchend', {
      touches: [...this.touchState.values()],
      count: this.touchState.size,
      originalEvent: e
    });
  }
  
  _onGamepadConnected(e) {
    this.emit('gamepadconnected', { gamepad: e.gamepad, index: e.gamepad.index });
  }
  
  _onGamepadDisconnected(e) {
    this.gamepadState.delete(e.gamepad.index);
    this.emit('gamepaddisconnected', { index: e.gamepad.index });
  }
  
  _pollGamepads() {
    const gamepads = navigator.getGamepads();
    
    for (const gp of gamepads) {
      if (!gp) continue;
      
      const prev = this.gamepadState.get(gp.index);
      const state = {
        index: gp.index,
        id: gp.id,
        buttons: gp.buttons.map((b, i) => ({
          index: i,
          pressed: b.pressed,
          value: b.value,
          touched: b.touched
        })),
        axes: [...gp.axes],
        timestamp: gp.timestamp
      };
      
      this.gamepadState.set(gp.index, state);
      
      if (prev) {
        state.buttons.forEach((btn, i) => {
          if (btn.pressed && !prev.buttons[i]?.pressed) {
            this.emit('gamepadbuttondown', { gamepad: gp.index, button: i, value: btn.value });
          } else if (!btn.pressed && prev.buttons[i]?.pressed) {
            this.emit('gamepadbuttonup', { gamepad: gp.index, button: i });
          }
        });
        
        state.axes.forEach((val, i) => {
          if (Math.abs(val - (prev.axes[i] || 0)) > 0.1) {
            this.emit('gamepadaxismove', { gamepad: gp.index, axis: i, value: val });
          }
        });
      }
    }
    
    requestAnimationFrame(() => this._pollGamepads());
  }
  
  destroy() {
    this.enabled = false;
    this.listeners.clear();
    this.shortcuts.clear();
    this._repeatTimers.forEach(t => clearTimeout(t));
  }
}

if (typeof window !== 'undefined') {
  window.InputService = InputService;
}

if (typeof module !== 'undefined') {
  module.exports = InputService;
}
