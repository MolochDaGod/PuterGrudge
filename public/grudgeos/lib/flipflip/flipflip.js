class FlipFlipTransition {
  constructor(options = {}) {
    this.container = options.container || document.body;
    this.duration = options.duration || 800;
    this.cardColor = options.cardColor || '#1a1a2e';
    this.backColor = options.backColor || '#0f3460';
    this.glowColor = options.glowColor || '#e94560';
    this.snapshots = new Map();
    this.isTransitioning = false;
    this.canvas = null;
    this.gl = null;
    this.shaderProgram = null;
    this.animationId = null;
    
    this.init();
  }

  init() {
    this.createOverlay();
    this.initWebGL();
    console.log('[FlipFlip] Initialized with WebGL');
  }

  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.id = 'flipflip-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 99999;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s;
    `;
    
    this.canvas = document.createElement('canvas');
    this.canvas.style.cssText = 'width: 100%; height: 100%;';
    this.overlay.appendChild(this.canvas);
    
    document.body.appendChild(this.overlay);
  }

  initWebGL() {
    this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
    if (!this.gl) {
      console.warn('[FlipFlip] WebGL not available, falling back to CSS');
      return;
    }

    const vertexShaderSource = `
      attribute vec4 aPosition;
      attribute vec2 aTexCoord;
      
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform float uFlipProgress;
      
      varying vec2 vTexCoord;
      varying float vFlipAngle;
      
      void main() {
        float angle = uFlipProgress * 3.14159;
        float z = sin(angle) * 0.5;
        float scale = 1.0 + sin(angle) * 0.1;
        
        vec4 pos = aPosition;
        pos.x *= scale;
        pos.y *= scale;
        pos.z = z;
        
        gl_Position = uProjectionMatrix * uModelViewMatrix * pos;
        vTexCoord = aTexCoord;
        vFlipAngle = angle;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      
      uniform sampler2D uFrontTexture;
      uniform sampler2D uBackTexture;
      uniform float uFlipProgress;
      uniform vec3 uGlowColor;
      uniform float uTime;
      
      varying vec2 vTexCoord;
      varying float vFlipAngle;
      
      void main() {
        vec2 uv = vTexCoord;
        
        float showBack = step(0.5, uFlipProgress);
        if (showBack > 0.5) {
          uv.x = 1.0 - uv.x;
        }
        
        vec4 frontColor = texture2D(uFrontTexture, uv);
        vec4 backColor = texture2D(uBackTexture, uv);
        
        vec4 color = mix(frontColor, backColor, showBack);
        
        float edgeGlow = smoothstep(0.0, 0.1, uv.x) * smoothstep(0.0, 0.1, 1.0 - uv.x);
        edgeGlow *= smoothstep(0.0, 0.1, uv.y) * smoothstep(0.0, 0.1, 1.0 - uv.y);
        
        float glowIntensity = sin(uFlipProgress * 3.14159) * 0.5;
        float pulse = sin(uTime * 5.0) * 0.1 + 0.9;
        
        vec3 glow = uGlowColor * glowIntensity * pulse * (1.0 - edgeGlow);
        color.rgb += glow;
        
        gl_FragColor = color;
      }
    `;

    const vertexShader = this.compileShader(this.gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = this.compileShader(this.gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return;

    this.shaderProgram = this.gl.createProgram();
    this.gl.attachShader(this.shaderProgram, vertexShader);
    this.gl.attachShader(this.shaderProgram, fragmentShader);
    this.gl.linkProgram(this.shaderProgram);

    if (!this.gl.getProgramParameter(this.shaderProgram, this.gl.LINK_STATUS)) {
      console.error('[FlipFlip] Shader program link error');
      return;
    }

    this.setupBuffers();
  }

  compileShader(type, source) {
    const shader = this.gl.createShader(type);
    this.gl.shaderSource(shader, source);
    this.gl.compileShader(shader);

    if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
      console.error('[FlipFlip] Shader compile error:', this.gl.getShaderInfoLog(shader));
      return null;
    }
    return shader;
  }

  setupBuffers() {
    const positions = new Float32Array([
      -1, -1, 0,
       1, -1, 0,
       1,  1, 0,
      -1,  1, 0
    ]);

    const texCoords = new Float32Array([
      0, 1,
      1, 1,
      1, 0,
      0, 0
    ]);

    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    this.positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);

    this.texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);

    this.indexBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    this.gl.bufferData(this.gl.ELEMENT_ARRAY_BUFFER, indices, this.gl.STATIC_DRAW);
  }

  async saveSnapshot(id, data = {}) {
    const snapshot = {
      id,
      timestamp: Date.now(),
      scroll: { x: window.scrollX, y: window.scrollY },
      route: window.location.pathname + window.location.search,
      data,
      screenCapture: await this.captureScreen()
    };
    
    this.snapshots.set(id, snapshot);
    
    if (typeof puter !== 'undefined' && puter.kv) {
      try {
        await puter.kv.set(`flipflip_snapshot_${id}`, JSON.stringify(snapshot));
      } catch (e) {
        console.log('[FlipFlip] Could not persist snapshot to Puter KV');
      }
    }
    
    console.log(`[FlipFlip] Snapshot saved: ${id}`);
    return snapshot;
  }

  async loadSnapshot(id) {
    let snapshot = this.snapshots.get(id);
    
    if (!snapshot && typeof puter !== 'undefined' && puter.kv) {
      try {
        const stored = await puter.kv.get(`flipflip_snapshot_${id}`);
        if (stored) {
          snapshot = JSON.parse(stored);
          this.snapshots.set(id, snapshot);
        }
      } catch (e) {
        console.log('[FlipFlip] Could not load snapshot from Puter KV');
      }
    }
    
    return snapshot;
  }

  async captureScreen() {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      const contentArea = document.querySelector('main') || document.querySelector('.app-content') || document.body;
      
      ctx.fillStyle = '#16213e';
      ctx.fillRect(50, 50, canvas.width - 100, canvas.height - 100);
      
      ctx.fillStyle = '#e94560';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CloudPilot AI', canvas.width / 2, canvas.height / 2);
      
      resolve(canvas.toDataURL('image/png', 0.8));
    });
  }

  async transition(targetId, options = {}) {
    if (this.isTransitioning) {
      console.warn('[FlipFlip] Transition already in progress');
      return false;
    }

    this.isTransitioning = true;
    const sourceSnapshot = options.sourceSnapshot || await this.saveSnapshot('temp_source');
    
    this.overlay.style.opacity = '1';
    this.overlay.style.pointerEvents = 'all';
    
    await this.runFlipAnimation(options.direction || 'forward');
    
    if (options.onMidpoint) {
      await options.onMidpoint();
    }
    
    if (options.targetUrl) {
      window.location.href = options.targetUrl;
    }
    
    await this.runFlipAnimation(options.direction === 'backward' ? 'forward' : 'backward');
    
    this.overlay.style.opacity = '0';
    this.overlay.style.pointerEvents = 'none';
    this.isTransitioning = false;
    
    console.log(`[FlipFlip] Transition to ${targetId} complete`);
    return true;
  }

  runFlipAnimation(direction) {
    return new Promise(resolve => {
      if (!this.gl) {
        this.runCSSFallbackAnimation(direction).then(resolve);
        return;
      }

      const startTime = performance.now();
      const duration = this.duration / 2;

      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        let progress = Math.min(elapsed / duration, 1);
        
        progress = this.easeInOutCubic(progress);
        
        if (direction === 'backward') {
          progress = 1 - progress;
        }
        
        this.renderFrame(progress, elapsed / 1000);
        
        if (elapsed < duration) {
          this.animationId = requestAnimationFrame(animate);
        } else {
          resolve();
        }
      };

      this.resizeCanvas();
      this.animationId = requestAnimationFrame(animate);
    });
  }

  runCSSFallbackAnimation(direction) {
    return new Promise(resolve => {
      const card = document.createElement('div');
      card.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        width: 80vw;
        height: 80vh;
        transform: translate(-50%, -50%) perspective(1000px) rotateY(0deg);
        background: linear-gradient(135deg, ${this.cardColor}, ${this.backColor});
        border-radius: 16px;
        box-shadow: 0 0 60px ${this.glowColor}40;
        transition: transform ${this.duration / 2}ms ease-in-out;
        z-index: 100000;
      `;
      
      const logo = document.createElement('div');
      logo.innerHTML = `<svg viewBox="0 0 100 100" style="width:100px;height:100px;position:absolute;top:50%;left:50%;transform:translate(-50%,-50%)">
        <circle cx="50" cy="50" r="40" fill="none" stroke="${this.glowColor}" stroke-width="4"/>
        <path d="M35 50 L45 60 L65 40" fill="none" stroke="${this.glowColor}" stroke-width="4" stroke-linecap="round"/>
      </svg>`;
      card.appendChild(logo);
      
      this.overlay.appendChild(card);
      
      requestAnimationFrame(() => {
        card.style.transform = `translate(-50%, -50%) perspective(1000px) rotateY(${direction === 'forward' ? 180 : 0}deg)`;
      });
      
      setTimeout(() => {
        card.remove();
        resolve();
      }, this.duration / 2);
    });
  }

  resizeCanvas() {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  renderFrame(progress, time) {
    const gl = this.gl;
    
    gl.clearColor(0.1, 0.1, 0.18, 0.95);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    
    gl.useProgram(this.shaderProgram);
    
    const flipProgressLoc = gl.getUniformLocation(this.shaderProgram, 'uFlipProgress');
    const timeLoc = gl.getUniformLocation(this.shaderProgram, 'uTime');
    const glowColorLoc = gl.getUniformLocation(this.shaderProgram, 'uGlowColor');
    
    gl.uniform1f(flipProgressLoc, progress);
    gl.uniform1f(timeLoc, time);
    
    const glowRGB = this.hexToRGB(this.glowColor);
    gl.uniform3f(glowColorLoc, glowRGB.r, glowRGB.g, glowRGB.b);
    
    const modelViewMatrix = new Float32Array([
      Math.cos(progress * Math.PI), 0, Math.sin(progress * Math.PI), 0,
      0, 1, 0, 0,
      -Math.sin(progress * Math.PI), 0, Math.cos(progress * Math.PI), 0,
      0, 0, -2, 1
    ]);
    
    const aspect = this.canvas.width / this.canvas.height;
    const projectionMatrix = this.createPerspectiveMatrix(45, aspect, 0.1, 100);
    
    const mvMatrixLoc = gl.getUniformLocation(this.shaderProgram, 'uModelViewMatrix');
    const projMatrixLoc = gl.getUniformLocation(this.shaderProgram, 'uProjectionMatrix');
    
    gl.uniformMatrix4fv(mvMatrixLoc, false, modelViewMatrix);
    gl.uniformMatrix4fv(projMatrixLoc, false, projectionMatrix);
    
    const positionLoc = gl.getAttribLocation(this.shaderProgram, 'aPosition');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
    gl.vertexAttribPointer(positionLoc, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(positionLoc);
    
    const texCoordLoc = gl.getAttribLocation(this.shaderProgram, 'aTexCoord');
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(texCoordLoc);
    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 0);
  }

  createPerspectiveMatrix(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov * Math.PI / 360);
    const nf = 1 / (near - far);
    
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  hexToRGB(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16) / 255,
      g: parseInt(result[2], 16) / 255,
      b: parseInt(result[3], 16) / 255
    } : { r: 0.91, g: 0.27, b: 0.38 };
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  async switchContext(from, to, options = {}) {
    console.log(`[FlipFlip] Switching context: ${from} -> ${to}`);
    
    const sourceSnapshot = await this.saveSnapshot(from, options.sourceData || {});
    
    await this.transition(to, {
      sourceSnapshot,
      direction: 'forward',
      onMidpoint: async () => {
        if (options.onSwitch) {
          await options.onSwitch();
        }
      }
    });
    
    return { from: sourceSnapshot, to };
  }

  async returnToContext(contextId, options = {}) {
    const snapshot = await this.loadSnapshot(contextId);
    
    if (!snapshot) {
      console.warn(`[FlipFlip] No snapshot found for context: ${contextId}`);
      return false;
    }
    
    await this.transition(contextId, {
      direction: 'backward',
      onMidpoint: async () => {
        if (options.onRestore) {
          await options.onRestore(snapshot);
        }
        
        window.scrollTo(snapshot.scroll.x, snapshot.scroll.y);
      }
    });
    
    return snapshot;
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    if (this.overlay) {
      this.overlay.remove();
    }
    this.snapshots.clear();
    console.log('[FlipFlip] Destroyed');
  }
}

if (typeof window !== 'undefined') {
  window.FlipFlipTransition = FlipFlipTransition;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FlipFlipTransition };
}
