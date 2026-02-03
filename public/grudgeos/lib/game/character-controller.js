class CharacterController {
  static STATES = {
    IDLE: 'idle',
    WALKING: 'walking',
    RUNNING: 'running',
    SPRINTING: 'sprinting',
    JUMPING: 'jumping',
    FALLING: 'falling',
    CROUCHING: 'crouching',
    CROUCH_WALKING: 'crouch_walking',
    SLIDING: 'sliding',
    CLIMBING: 'climbing',
    SWIMMING: 'swimming'
  };

  constructor(config = {}) {
    this.position = config.position || { x: 0, y: 0, z: 0 };
    this.rotation = config.rotation || { x: 0, y: 0, z: 0 };
    this.velocity = { x: 0, y: 0, z: 0 };
    
    this.walkSpeed = config.walkSpeed || 4;
    this.runSpeed = config.runSpeed || 7;
    this.sprintSpeed = config.sprintSpeed || 11;
    this.crouchSpeed = config.crouchSpeed || 2;
    
    this.jumpForce = config.jumpForce || 10;
    this.gravity = config.gravity || 25;
    this.groundDrag = config.groundDrag || 10;
    this.airDrag = config.airDrag || 0.5;
    this.airControl = config.airControl || 0.3;
    
    this.acceleration = config.acceleration || 50;
    this.deceleration = config.deceleration || 40;
    
    this.rotationSpeed = config.rotationSpeed || 10;
    this.rotationSmoothing = config.rotationSmoothing || 0.15;
    
    this.height = config.height || 1.8;
    this.crouchHeight = config.crouchHeight || 1.0;
    this.radius = config.radius || 0.4;
    this.stepHeight = config.stepHeight || 0.3;
    
    this.state = CharacterController.STATES.IDLE;
    this.previousState = this.state;
    this.stateTime = 0;
    
    this.isGrounded = false;
    this.isSprinting = false;
    this.isCrouching = false;
    this.isJumping = false;
    
    this.canJump = true;
    this.coyoteTime = 0.15;
    this.coyoteTimer = 0;
    this.jumpBufferTime = 0.1;
    this.jumpBufferTimer = 0;
    
    this.groundNormal = { x: 0, y: 1, z: 0 };
    this.slopeLimit = config.slopeLimit || 45;
    
    this.moveInput = { x: 0, y: 0 };
    this.targetRotation = 0;
    
    this.animations = new Map();
    this.currentAnimation = null;
    this.animationBlend = 0;
    
    this.listeners = new Map();
    this.initialized = false;
    this._prevCrouchPressed = false;
  }

  initialize(input, camera) {
    this.input = input;
    this.camera = camera;
    this.initialized = true;
    console.log('[CharacterController] Initialized');
  }

  update(deltaTime) {
    if (!this.initialized) return;
    
    this.handleInput();
    this.updateTimers(deltaTime);
    this.updateState();
    this.updateMovement(deltaTime);
    this.updateRotation(deltaTime);
    this.applyGravity(deltaTime);
    this.applyDrag(deltaTime);
    this.moveCharacter(deltaTime);
    this.updateAnimation(deltaTime);
    
    this.camera?.setTarget(this.position);
    this.camera?.setSprinting(this.isSprinting);
  }

  handleInput() {
    if (!this.input) return;
    
    const move = this.input.getMovementVector();
    this.moveInput = { x: move.x, y: move.y };
    
    if (this.input.isPressed('jump') && this.canJump) {
      this.jumpBufferTimer = this.jumpBufferTime;
    }
    
    this.isSprinting = this.input.isPressed('sprint') && !this.isCrouching && this.isGrounded;
    
    const crouchPressed = this.input.isPressed('crouch');
    if (crouchPressed && !this._prevCrouchPressed) {
      this.toggleCrouch();
    }
    this._prevCrouchPressed = crouchPressed;
  }

  updateTimers(deltaTime) {
    if (this.isGrounded) {
      this.coyoteTimer = this.coyoteTime;
    } else {
      this.coyoteTimer = Math.max(0, this.coyoteTimer - deltaTime);
    }
    
    this.jumpBufferTimer = Math.max(0, this.jumpBufferTimer - deltaTime);
    
    this.stateTime += deltaTime;
  }

  updateState() {
    this.previousState = this.state;
    
    const moving = Math.abs(this.moveInput.x) > 0.1 || Math.abs(this.moveInput.y) > 0.1;
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    
    if (!this.isGrounded) {
      if (this.velocity.y > 0.1) {
        this.state = CharacterController.STATES.JUMPING;
      } else {
        this.state = CharacterController.STATES.FALLING;
      }
    } else if (this.isCrouching) {
      this.state = moving ? CharacterController.STATES.CROUCH_WALKING : CharacterController.STATES.CROUCHING;
    } else if (moving) {
      if (this.isSprinting && speed > this.runSpeed) {
        this.state = CharacterController.STATES.SPRINTING;
      } else if (speed > this.walkSpeed * 0.9) {
        this.state = CharacterController.STATES.RUNNING;
      } else {
        this.state = CharacterController.STATES.WALKING;
      }
    } else {
      this.state = CharacterController.STATES.IDLE;
    }
    
    if (this.state !== this.previousState) {
      this.stateTime = 0;
      this.emit('statechange', { from: this.previousState, to: this.state });
    }
  }

  updateMovement(deltaTime) {
    const inputMagnitude = Math.sqrt(this.moveInput.x * this.moveInput.x + this.moveInput.y * this.moveInput.y);
    if (inputMagnitude < 0.01) return;
    
    let targetSpeed = this.walkSpeed;
    if (this.isSprinting) targetSpeed = this.sprintSpeed;
    else if (this.isCrouching) targetSpeed = this.crouchSpeed;
    else if (inputMagnitude > 0.7) targetSpeed = this.runSpeed;
    
    const cameraYaw = this.camera ? this.camera.yaw * Math.PI / 180 : 0;
    
    const forward = { x: Math.sin(cameraYaw), z: Math.cos(cameraYaw) };
    const right = { x: Math.cos(cameraYaw), z: -Math.sin(cameraYaw) };
    
    const moveDir = {
      x: forward.x * this.moveInput.y + right.x * this.moveInput.x,
      z: forward.z * this.moveInput.y + right.z * this.moveInput.x
    };
    
    const dirMag = Math.sqrt(moveDir.x * moveDir.x + moveDir.z * moveDir.z);
    if (dirMag > 0) {
      moveDir.x /= dirMag;
      moveDir.z /= dirMag;
    }
    
    this.targetRotation = Math.atan2(moveDir.x, moveDir.z) * 180 / Math.PI;
    
    const accel = this.isGrounded ? this.acceleration : this.acceleration * this.airControl;
    const targetVelX = moveDir.x * targetSpeed * inputMagnitude;
    const targetVelZ = moveDir.z * targetSpeed * inputMagnitude;
    
    this.velocity.x += (targetVelX - this.velocity.x) * accel * deltaTime;
    this.velocity.z += (targetVelZ - this.velocity.z) * accel * deltaTime;
    
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0 && !this.isJumping) {
      this.jump();
    }
  }

  updateRotation(deltaTime) {
    const moving = Math.abs(this.moveInput.x) > 0.1 || Math.abs(this.moveInput.y) > 0.1;
    if (!moving) return;
    
    let diff = this.targetRotation - this.rotation.y;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    
    const t = 1 - Math.pow(1 - this.rotationSmoothing, deltaTime * 60);
    this.rotation.y += diff * t;
    
    while (this.rotation.y > 180) this.rotation.y -= 360;
    while (this.rotation.y < -180) this.rotation.y += 360;
  }

  applyGravity(deltaTime) {
    if (!this.isGrounded) {
      this.velocity.y -= this.gravity * deltaTime;
      
      const terminalVelocity = 50;
      this.velocity.y = Math.max(-terminalVelocity, this.velocity.y);
    }
  }

  applyDrag(deltaTime) {
    const drag = this.isGrounded ? this.groundDrag : this.airDrag;
    
    const moving = Math.abs(this.moveInput.x) > 0.1 || Math.abs(this.moveInput.y) > 0.1;
    
    if (this.isGrounded && !moving) {
      const decel = this.deceleration * deltaTime;
      const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
      
      if (speed > 0) {
        const reduction = Math.min(speed, decel);
        const factor = (speed - reduction) / speed;
        this.velocity.x *= factor;
        this.velocity.z *= factor;
      }
    }
  }

  moveCharacter(deltaTime) {
    const movement = {
      x: this.velocity.x * deltaTime,
      y: this.velocity.y * deltaTime,
      z: this.velocity.z * deltaTime
    };
    
    this.position.x += movement.x;
    this.position.y += movement.y;
    this.position.z += movement.z;
    
    this.checkGrounded();
  }
  
  checkGrounded() {
    const groundLevel = 0;
    const groundThreshold = 0.05;
    
    if (this.position.y <= groundLevel + groundThreshold) {
      if (!this.isGrounded) {
        this.emit('landed');
      }
      this.position.y = groundLevel;
      this.velocity.y = Math.max(0, this.velocity.y);
      this.isGrounded = true;
      this.isJumping = false;
    } else {
      this.isGrounded = false;
    }
  }
  
  setGroundLevel(y) {
    this.groundLevel = y;
  }

  jump() {
    if (!this.canJump) return;
    
    this.velocity.y = this.jumpForce;
    this.isJumping = true;
    this.isGrounded = false;
    this.coyoteTimer = 0;
    this.jumpBufferTimer = 0;
    
    if (this.isCrouching) {
      this.isCrouching = false;
    }
    
    this.emit('jump');
    this.input?.vibrate?.(100, 0.3);
  }

  toggleCrouch() {
    this.isCrouching = !this.isCrouching;
    this.emit('crouch', this.isCrouching);
  }

  updateAnimation(deltaTime) {
    const targetAnim = this.getAnimationForState();
    
    if (targetAnim !== this.currentAnimation) {
      this.previousAnimation = this.currentAnimation;
      this.currentAnimation = targetAnim;
      this.animationBlend = 0;
    }
    
    if (this.animationBlend < 1) {
      this.animationBlend = Math.min(1, this.animationBlend + deltaTime * 5);
    }
  }

  getAnimationForState() {
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    
    switch (this.state) {
      case CharacterController.STATES.IDLE:
        return this.isCrouching ? 'crouch_idle' : 'idle';
      case CharacterController.STATES.WALKING:
        return 'walk';
      case CharacterController.STATES.RUNNING:
        return 'run';
      case CharacterController.STATES.SPRINTING:
        return 'sprint';
      case CharacterController.STATES.JUMPING:
        return 'jump';
      case CharacterController.STATES.FALLING:
        return 'fall';
      case CharacterController.STATES.CROUCHING:
        return 'crouch_idle';
      case CharacterController.STATES.CROUCH_WALKING:
        return 'crouch_walk';
      default:
        return 'idle';
    }
  }

  registerAnimation(name, config) {
    this.animations.set(name, {
      name,
      speed: config.speed || 1,
      loop: config.loop !== false,
      blend: config.blend || 0.2,
      ...config
    });
  }

  getAnimationState() {
    return {
      current: this.currentAnimation,
      previous: this.previousAnimation,
      blend: this.animationBlend,
      speed: this.getAnimationSpeed()
    };
  }

  getAnimationSpeed() {
    const speed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
    
    if (this.state === CharacterController.STATES.WALKING) {
      return speed / this.walkSpeed;
    } else if (this.state === CharacterController.STATES.RUNNING) {
      return speed / this.runSpeed;
    } else if (this.state === CharacterController.STATES.SPRINTING) {
      return speed / this.sprintSpeed;
    }
    return 1;
  }

  teleport(position) {
    this.position = { ...position };
    this.velocity = { x: 0, y: 0, z: 0 };
  }

  applyForce(force) {
    this.velocity.x += force.x;
    this.velocity.y += force.y;
    this.velocity.z += force.z;
    this.emit('force', force);
  }

  knockback(direction, force) {
    const normalized = this.normalize(direction);
    this.velocity.x = normalized.x * force;
    this.velocity.y = force * 0.3;
    this.velocity.z = normalized.z * force;
    this.isGrounded = false;
    this.emit('knockback', { direction, force });
  }

  normalize(vec) {
    const mag = Math.sqrt(vec.x * vec.x + (vec.y || 0) * (vec.y || 0) + vec.z * vec.z);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    return { x: vec.x / mag, y: (vec.y || 0) / mag, z: vec.z / mag };
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

  getState() {
    return {
      position: { ...this.position },
      rotation: { ...this.rotation },
      velocity: { ...this.velocity },
      state: this.state,
      isGrounded: this.isGrounded,
      isSprinting: this.isSprinting,
      isCrouching: this.isCrouching,
      animation: this.getAnimationState()
    };
  }
}

if (typeof window !== 'undefined') {
  window.CharacterController = CharacterController;
}

if (typeof module !== 'undefined') {
  module.exports = { CharacterController };
}
