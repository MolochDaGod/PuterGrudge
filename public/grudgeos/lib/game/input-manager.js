class InputManager {
  static DEVICE_TYPES = {
    KEYBOARD_MOUSE: 'keyboard_mouse',
    GAMEPAD: 'gamepad',
    TOUCH: 'touch'
  };

  constructor() {
    this.activeDevice = InputManager.DEVICE_TYPES.KEYBOARD_MOUSE;
    this.keys = new Map();
    this.mouse = { x: 0, y: 0, deltaX: 0, deltaY: 0, buttons: [false, false, false], wheel: 0, locked: false };
    this.gamepad = { connected: false, index: -1, axes: [0, 0, 0, 0], buttons: new Array(17).fill(false) };
    this.touch = { active: false, touches: [], joystick: { x: 0, y: 0 }, lookDelta: { x: 0, y: 0 } };
    
    this.bindings = new Map();
    this.axes = new Map();
    this.actions = new Map();
    
    this.deadzone = 0.15;
    this.sensitivity = { mouse: 1.0, gamepad: 2.0, touch: 1.5 };
    this.smoothing = { enabled: true, factor: 0.2 };
    
    this.smoothedAxes = new Map();
    this.previousAxes = new Map();
    
    this.initialized = false;
    this.listeners = new Map();
  }

  initialize(canvas = document.body) {
    if (this.initialized) return;
    
    this.canvas = canvas;
    this.setupDefaultBindings();
    this.setupKeyboardEvents();
    this.setupMouseEvents();
    this.setupGamepadEvents();
    this.setupTouchEvents();
    
    this.initialized = true;
    console.log('[InputManager] Initialized with unified input system');
  }

  setupDefaultBindings() {
    this.bindings.set('moveForward', { keyboard: 'KeyW', gamepad: { axis: 1, invert: true } });
    this.bindings.set('moveBackward', { keyboard: 'KeyS', gamepad: { axis: 1, invert: false } });
    this.bindings.set('moveLeft', { keyboard: 'KeyA', gamepad: { axis: 0, invert: true } });
    this.bindings.set('moveRight', { keyboard: 'KeyD', gamepad: { axis: 0, invert: false } });
    this.bindings.set('jump', { keyboard: 'Space', gamepad: { button: 0 } });
    this.bindings.set('sprint', { keyboard: 'ShiftLeft', gamepad: { button: 10 } });
    this.bindings.set('crouch', { keyboard: 'ControlLeft', gamepad: { button: 11 } });
    this.bindings.set('interact', { keyboard: 'KeyE', gamepad: { button: 2 } });
    this.bindings.set('attack', { mouse: 0, gamepad: { button: 5 } });
    this.bindings.set('aim', { mouse: 2, gamepad: { button: 4 } });
    
    this.axes.set('moveX', { keyboard: ['KeyA', 'KeyD'], gamepad: 0 });
    this.axes.set('moveY', { keyboard: ['KeyS', 'KeyW'], gamepad: 1 });
    this.axes.set('lookX', { mouse: 'deltaX', gamepad: 2 });
    this.axes.set('lookY', { mouse: 'deltaY', gamepad: 3 });
  }

  setupKeyboardEvents() {
    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
      this.activeDevice = InputManager.DEVICE_TYPES.KEYBOARD_MOUSE;
      this.emit('keydown', e.code);
      
      const action = this.getActionForKey(e.code);
      if (action) this.emit('action', { action, pressed: true, device: 'keyboard' });
    });
    
    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
      this.emit('keyup', e.code);
      
      const action = this.getActionForKey(e.code);
      if (action) this.emit('action', { action, pressed: false, device: 'keyboard' });
    });
  }

  setupMouseEvents() {
    const target = this.canvas || document.body;
    
    target.addEventListener('mousemove', (e) => {
      this.mouse.deltaX = e.movementX * this.sensitivity.mouse;
      this.mouse.deltaY = e.movementY * this.sensitivity.mouse;
      this.mouse.x = e.clientX;
      this.mouse.y = e.clientY;
      this.activeDevice = InputManager.DEVICE_TYPES.KEYBOARD_MOUSE;
    });
    
    target.addEventListener('mousedown', (e) => {
      this.mouse.buttons[e.button] = true;
      this.activeDevice = InputManager.DEVICE_TYPES.KEYBOARD_MOUSE;
      
      const action = this.getActionForMouse(e.button);
      if (action) this.emit('action', { action, pressed: true, device: 'mouse' });
    });
    
    target.addEventListener('mouseup', (e) => {
      this.mouse.buttons[e.button] = false;
      
      const action = this.getActionForMouse(e.button);
      if (action) this.emit('action', { action, pressed: false, device: 'mouse' });
    });
    
    target.addEventListener('wheel', (e) => {
      this.mouse.wheel = Math.sign(e.deltaY);
      this.emit('wheel', this.mouse.wheel);
    });
    
    target.addEventListener('click', () => {
      if (!this.mouse.locked && document.pointerLockElement !== target) {
        target.requestPointerLock?.();
      }
    });
    
    document.addEventListener('pointerlockchange', () => {
      this.mouse.locked = document.pointerLockElement === target;
      this.emit('pointerlock', this.mouse.locked);
    });
  }

  setupGamepadEvents() {
    window.addEventListener('gamepadconnected', (e) => {
      this.gamepad.connected = true;
      this.gamepad.index = e.gamepad.index;
      this.activeDevice = InputManager.DEVICE_TYPES.GAMEPAD;
      console.log('[InputManager] Gamepad connected:', e.gamepad.id);
      this.emit('gamepadconnected', e.gamepad);
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
      if (e.gamepad.index === this.gamepad.index) {
        this.gamepad.connected = false;
        this.gamepad.index = -1;
        console.log('[InputManager] Gamepad disconnected');
        this.emit('gamepaddisconnected', e.gamepad);
      }
    });
  }

  setupTouchEvents() {
    const target = this.canvas || document.body;
    
    target.addEventListener('touchstart', (e) => {
      this.touch.active = true;
      this.activeDevice = InputManager.DEVICE_TYPES.TOUCH;
      this.updateTouches(e.touches);
    });
    
    target.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.updateTouches(e.touches);
    }, { passive: false });
    
    target.addEventListener('touchend', (e) => {
      this.updateTouches(e.touches);
      if (e.touches.length === 0) {
        this.touch.active = false;
        this.touch.joystick = { x: 0, y: 0 };
        this.touch.lookDelta = { x: 0, y: 0 };
      }
    });
  }

  updateTouches(touches) {
    const rect = this.canvas?.getBoundingClientRect() || { width: window.innerWidth, height: window.innerHeight, left: 0, top: 0 };
    const midX = rect.width / 2;
    
    this.touch.touches = Array.from(touches).map(t => ({
      id: t.identifier,
      x: t.clientX - rect.left,
      y: t.clientY - rect.top
    }));
    
    for (const touch of this.touch.touches) {
      if (touch.x < midX) {
        const centerX = rect.width * 0.15;
        const centerY = rect.height * 0.75;
        const maxRadius = 60;
        
        const dx = (touch.x - centerX) / maxRadius;
        const dy = (touch.y - centerY) / maxRadius;
        
        this.touch.joystick.x = Math.max(-1, Math.min(1, dx));
        this.touch.joystick.y = Math.max(-1, Math.min(1, dy));
      } else {
        if (this.touch.prevLookTouch) {
          this.touch.lookDelta.x = (touch.x - this.touch.prevLookTouch.x) * this.sensitivity.touch;
          this.touch.lookDelta.y = (touch.y - this.touch.prevLookTouch.y) * this.sensitivity.touch;
        }
        this.touch.prevLookTouch = { x: touch.x, y: touch.y };
      }
    }
    
    if (!this.touch.touches.some(t => t.x >= midX)) {
      this.touch.prevLookTouch = null;
    }
  }

  pollGamepad() {
    if (!this.gamepad.connected) return;
    
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepad.index];
    if (!gp) return;
    
    for (let i = 0; i < Math.min(4, gp.axes.length); i++) {
      const raw = gp.axes[i];
      this.gamepad.axes[i] = Math.abs(raw) < this.deadzone ? 0 : raw;
    }
    
    for (let i = 0; i < Math.min(17, gp.buttons.length); i++) {
      const wasPressed = this.gamepad.buttons[i];
      const isPressed = gp.buttons[i].pressed;
      this.gamepad.buttons[i] = isPressed;
      
      if (isPressed !== wasPressed) {
        const action = this.getActionForGamepadButton(i);
        if (action) this.emit('action', { action, pressed: isPressed, device: 'gamepad' });
      }
    }
    
    if (this.gamepad.axes.some(a => Math.abs(a) > 0.1)) {
      this.activeDevice = InputManager.DEVICE_TYPES.GAMEPAD;
    }
  }

  update(deltaTime) {
    this.pollGamepad();
    
    this.mouse.wheel = 0;
    if (this.activeDevice !== InputManager.DEVICE_TYPES.TOUCH) {
      this.mouse.deltaX = 0;
      this.mouse.deltaY = 0;
    }
    this.touch.lookDelta = { x: 0, y: 0 };
    
    if (this.smoothing.enabled) {
      for (const [name, config] of this.axes) {
        const raw = this.getRawAxis(name);
        const prev = this.previousAxes.get(name) || 0;
        const smoothed = prev + (raw - prev) * this.smoothing.factor;
        this.smoothedAxes.set(name, smoothed);
        this.previousAxes.set(name, smoothed);
      }
    }
  }

  getAxis(name) {
    if (this.smoothing.enabled) {
      return this.smoothedAxes.get(name) || 0;
    }
    return this.getRawAxis(name);
  }

  getRawAxis(name) {
    const config = this.axes.get(name);
    if (!config) return 0;
    
    let value = 0;
    
    if (this.activeDevice === InputManager.DEVICE_TYPES.GAMEPAD && this.gamepad.connected) {
      if (typeof config.gamepad === 'number') {
        value = this.gamepad.axes[config.gamepad] || 0;
        if (name === 'lookX' || name === 'lookY') {
          value *= this.sensitivity.gamepad;
        }
      }
    } else if (this.activeDevice === InputManager.DEVICE_TYPES.TOUCH && this.touch.active) {
      if (name === 'moveX') value = this.touch.joystick.x;
      else if (name === 'moveY') value = -this.touch.joystick.y;
      else if (name === 'lookX') value = this.touch.lookDelta.x;
      else if (name === 'lookY') value = this.touch.lookDelta.y;
    } else {
      if (config.keyboard) {
        const [neg, pos] = config.keyboard;
        value = (this.keys.get(pos) ? 1 : 0) - (this.keys.get(neg) ? 1 : 0);
      }
      if (config.mouse) {
        if (config.mouse === 'deltaX') value = this.mouse.deltaX;
        else if (config.mouse === 'deltaY') value = this.mouse.deltaY;
      }
    }
    
    return value;
  }

  isPressed(action) {
    const binding = this.bindings.get(action);
    if (!binding) return false;
    
    if (binding.keyboard && this.keys.get(binding.keyboard)) return true;
    if (binding.mouse !== undefined && this.mouse.buttons[binding.mouse]) return true;
    if (binding.gamepad?.button !== undefined && this.gamepad.buttons[binding.gamepad.button]) return true;
    
    return false;
  }

  isJustPressed(action) {
    return this.actions.get(action)?.justPressed || false;
  }

  isJustReleased(action) {
    return this.actions.get(action)?.justReleased || false;
  }

  getActionForKey(code) {
    for (const [action, binding] of this.bindings) {
      if (binding.keyboard === code) return action;
    }
    return null;
  }

  getActionForMouse(button) {
    for (const [action, binding] of this.bindings) {
      if (binding.mouse === button) return action;
    }
    return null;
  }

  getActionForGamepadButton(button) {
    for (const [action, binding] of this.bindings) {
      if (binding.gamepad?.button === button) return action;
    }
    return null;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) callbacks.splice(index, 1);
    }
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(cb => cb(data));
    }
  }

  setBinding(action, device, key) {
    if (!this.bindings.has(action)) {
      this.bindings.set(action, {});
    }
    this.bindings.get(action)[device] = key;
  }

  getMovementVector() {
    let x = this.getAxis('moveX');
    let y = this.getAxis('moveY');
    
    const magnitude = Math.sqrt(x * x + y * y);
    if (magnitude < this.deadzone) {
      return { x: 0, y: 0 };
    }
    
    if (magnitude > 1) {
      x /= magnitude;
      y /= magnitude;
    }
    
    return { x, y };
  }

  getLookVector() {
    let x = this.getAxis('lookX');
    let y = this.getAxis('lookY');
    
    if (this.activeDevice === InputManager.DEVICE_TYPES.GAMEPAD) {
      const magnitude = Math.sqrt(x * x + y * y);
      if (magnitude < this.deadzone) {
        return { x: 0, y: 0 };
      }
    }
    
    return { x, y };
  }

  vibrate(duration = 200, intensity = 0.5) {
    if (!this.gamepad.connected) return;
    
    const gamepads = navigator.getGamepads();
    const gp = gamepads[this.gamepad.index];
    if (gp?.vibrationActuator) {
      gp.vibrationActuator.playEffect('dual-rumble', {
        duration,
        strongMagnitude: intensity,
        weakMagnitude: intensity * 0.5
      });
    }
  }

  requestPointerLock() {
    this.canvas?.requestPointerLock?.();
  }

  exitPointerLock() {
    document.exitPointerLock?.();
  }

  destroy() {
    this.listeners.clear();
    this.keys.clear();
    this.bindings.clear();
    this.initialized = false;
  }
}

const inputManager = new InputManager();

if (typeof window !== 'undefined') {
  window.InputManager = InputManager;
  window.inputManager = inputManager;
}

if (typeof module !== 'undefined') {
  module.exports = { InputManager, inputManager };
}
