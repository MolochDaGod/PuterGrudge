class ThirdPersonCamera {
  constructor(config = {}) {
    this.target = config.target || { x: 0, y: 1.5, z: 0 };
    this.offset = config.offset || { x: 0, y: 1.5, z: 0 };
    
    this.distance = config.distance || 5;
    this.minDistance = config.minDistance || 1.5;
    this.maxDistance = config.maxDistance || 15;
    
    this.pitch = config.pitch || -15;
    this.yaw = config.yaw || 0;
    this.minPitch = config.minPitch || -80;
    this.maxPitch = config.maxPitch || 60;
    
    this.sensitivity = config.sensitivity || { x: 0.3, y: 0.25 };
    this.zoomSpeed = config.zoomSpeed || 2;
    this.smoothing = config.smoothing || 0.1;
    this.rotationSmoothing = config.rotationSmoothing || 0.15;
    
    this.position = { x: 0, y: 2, z: -5 };
    this.rotation = { x: 0, y: 0, z: 0 };
    
    this.targetPitch = this.pitch;
    this.targetYaw = this.yaw;
    this.targetDistance = this.distance;
    
    this.collisionEnabled = config.collisionEnabled !== false;
    this.collisionPadding = config.collisionPadding || 0.2;
    this.collisionLayers = config.collisionLayers || [];
    
    this.fov = config.fov || 60;
    this.targetFov = this.fov;
    this.sprintFovBoost = config.sprintFovBoost || 10;
    
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeDecay = 0.9;
    
    this.cinematicMode = false;
    this.cinematicPath = [];
    this.cinematicProgress = 0;
    
    this.initialized = false;
  }

  initialize(inputManager) {
    this.input = inputManager;
    
    if (this.input) {
      this.input.on('wheel', (delta) => {
        this.targetDistance += delta * this.zoomSpeed;
        this.targetDistance = Math.max(this.minDistance, Math.min(this.maxDistance, this.targetDistance));
      });
    }
    
    this.initialized = true;
    console.log('[ThirdPersonCamera] Initialized');
  }

  setTarget(target) {
    if (typeof target === 'object') {
      this.target = { ...this.target, ...target };
    }
  }

  update(deltaTime) {
    if (!this.initialized) return;
    
    if (this.cinematicMode) {
      this.updateCinematic(deltaTime);
      return;
    }
    
    this.handleInput(deltaTime);
    this.updateRotation(deltaTime);
    this.updatePosition(deltaTime);
    this.updateShake(deltaTime);
    this.updateFov(deltaTime);
  }

  handleInput(deltaTime) {
    if (!this.input) return;
    
    const look = this.input.getLookVector();
    
    this.targetYaw += look.x * this.sensitivity.x;
    this.targetPitch -= look.y * this.sensitivity.y;
    
    this.targetPitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.targetPitch));
    
    while (this.targetYaw > 180) this.targetYaw -= 360;
    while (this.targetYaw < -180) this.targetYaw += 360;
  }

  updateRotation(deltaTime) {
    const t = 1 - Math.pow(1 - this.rotationSmoothing, deltaTime * 60);
    
    this.pitch = this.lerp(this.pitch, this.targetPitch, t);
    this.yaw = this.lerpAngle(this.yaw, this.targetYaw, t);
    this.distance = this.lerp(this.distance, this.targetDistance, t);
    
    this.rotation.x = this.pitch;
    this.rotation.y = this.yaw;
  }

  updatePosition(deltaTime) {
    const t = 1 - Math.pow(1 - this.smoothing, deltaTime * 60);
    
    const pitchRad = this.pitch * Math.PI / 180;
    const yawRad = this.yaw * Math.PI / 180;
    
    let effectiveDistance = this.distance;
    
    if (this.collisionEnabled) {
      effectiveDistance = this.checkCollision(effectiveDistance, pitchRad, yawRad);
    }
    
    const idealX = this.target.x + this.offset.x - Math.sin(yawRad) * Math.cos(pitchRad) * effectiveDistance;
    const idealY = this.target.y + this.offset.y - Math.sin(pitchRad) * effectiveDistance;
    const idealZ = this.target.z + this.offset.z - Math.cos(yawRad) * Math.cos(pitchRad) * effectiveDistance;
    
    this.position.x = this.lerp(this.position.x, idealX, t);
    this.position.y = this.lerp(this.position.y, idealY, t);
    this.position.z = this.lerp(this.position.z, idealZ, t);
  }

  checkCollision(desiredDistance, pitchRad, yawRad) {
    const origin = {
      x: this.target.x + this.offset.x,
      y: this.target.y + this.offset.y,
      z: this.target.z + this.offset.z
    };
    
    const direction = {
      x: -Math.sin(yawRad) * Math.cos(pitchRad),
      y: -Math.sin(pitchRad),
      z: -Math.cos(yawRad) * Math.cos(pitchRad)
    };
    
    if (this.collisionLayers.length > 0 && typeof this.raycast === 'function') {
      const hit = this.raycast(origin, direction, desiredDistance, this.collisionLayers);
      if (hit && hit.distance < desiredDistance) {
        return Math.max(this.minDistance, hit.distance - this.collisionPadding);
      }
    }
    
    return desiredDistance;
  }

  updateShake(deltaTime) {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= deltaTime;
      this.shakeIntensity *= this.shakeDecay;
      
      const shakeX = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * 2 * this.shakeIntensity;
      
      this.position.x += shakeX;
      this.position.y += shakeY;
    }
  }

  updateFov(deltaTime) {
    const t = 1 - Math.pow(0.9, deltaTime * 60);
    this.fov = this.lerp(this.fov, this.targetFov, t);
  }

  shake(intensity = 0.5, duration = 0.3) {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  setSprinting(isSprinting) {
    this.targetFov = isSprinting ? 60 + this.sprintFovBoost : 60;
  }

  setAiming(isAiming) {
    if (isAiming) {
      this.targetDistance = this.minDistance + 0.5;
      this.targetFov = 45;
    } else {
      this.targetDistance = (this.minDistance + this.maxDistance) / 3;
      this.targetFov = 60;
    }
  }

  startCinematic(path, duration = 3) {
    this.cinematicMode = true;
    this.cinematicPath = path;
    this.cinematicProgress = 0;
    this.cinematicDuration = duration;
  }

  stopCinematic() {
    this.cinematicMode = false;
    this.cinematicPath = [];
    this.cinematicProgress = 0;
  }

  updateCinematic(deltaTime) {
    if (this.cinematicPath.length < 2) {
      this.stopCinematic();
      return;
    }
    
    this.cinematicProgress += deltaTime / this.cinematicDuration;
    
    if (this.cinematicProgress >= 1) {
      this.stopCinematic();
      return;
    }
    
    const point = this.getCatmullRomPoint(this.cinematicProgress);
    this.position = point.position;
    this.rotation = point.rotation;
  }

  getCatmullRomPoint(t) {
    const path = this.cinematicPath;
    const n = path.length - 1;
    const segment = Math.floor(t * n);
    const localT = (t * n) - segment;
    
    const p0 = path[Math.max(0, segment - 1)];
    const p1 = path[segment];
    const p2 = path[Math.min(n, segment + 1)];
    const p3 = path[Math.min(n, segment + 2)];
    
    const catmull = (a, b, c, d, u) => {
      const u2 = u * u;
      const u3 = u2 * u;
      return 0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3);
    };
    
    return {
      position: {
        x: catmull(p0.position.x, p1.position.x, p2.position.x, p3.position.x, localT),
        y: catmull(p0.position.y, p1.position.y, p2.position.y, p3.position.y, localT),
        z: catmull(p0.position.z, p1.position.z, p2.position.z, p3.position.z, localT)
      },
      rotation: {
        x: catmull(p0.rotation.x, p1.rotation.x, p2.rotation.x, p3.rotation.x, localT),
        y: catmull(p0.rotation.y, p1.rotation.y, p2.rotation.y, p3.rotation.y, localT),
        z: 0
      }
    };
  }

  lerp(a, b, t) {
    return a + (b - a) * t;
  }

  lerpAngle(a, b, t) {
    let diff = b - a;
    while (diff > 180) diff -= 360;
    while (diff < -180) diff += 360;
    return a + diff * t;
  }

  getViewMatrix() {
    return {
      position: { ...this.position },
      rotation: { ...this.rotation },
      fov: this.fov,
      target: { ...this.target }
    };
  }

  getForwardVector() {
    const pitchRad = this.pitch * Math.PI / 180;
    const yawRad = this.yaw * Math.PI / 180;
    
    return {
      x: Math.sin(yawRad) * Math.cos(pitchRad),
      y: Math.sin(pitchRad),
      z: Math.cos(yawRad) * Math.cos(pitchRad)
    };
  }

  getRightVector() {
    const yawRad = (this.yaw + 90) * Math.PI / 180;
    
    return {
      x: Math.sin(yawRad),
      y: 0,
      z: Math.cos(yawRad)
    };
  }

  reset() {
    this.pitch = -15;
    this.yaw = 0;
    this.targetPitch = this.pitch;
    this.targetYaw = this.yaw;
    this.targetDistance = 5;
    this.distance = 5;
  }
}

if (typeof window !== 'undefined') {
  window.ThirdPersonCamera = ThirdPersonCamera;
}

if (typeof module !== 'undefined') {
  module.exports = { ThirdPersonCamera };
}
