class WebGLVisualizer {
  static SCENE_TYPES = {
    NETWORK: 'network',
    AGENTS: 'agents',
    PODS: 'pods',
    METRICS: 'metrics',
    CUSTOM: 'custom'
  };

  constructor(canvasId) {
    this.canvasId = canvasId;
    this.canvas = null;
    this.gl = null;
    this.scenes = new Map();
    this.activeScene = null;
    this.camera = {
      position: [0, 0, 5],
      target: [0, 0, 0],
      up: [0, 1, 0],
      fov: 60,
      near: 0.1,
      far: 1000
    };
    this.nodes = [];
    this.edges = [];
    this.animationId = null;
    this.initialized = false;
    this.shaders = {};
  }

  async initialize(canvasElement = null) {
    if (this.initialized) return true;

    this.canvas = canvasElement || document.getElementById(this.canvasId);
    if (!this.canvas) {
      console.warn('[WebGLVisualizer] Canvas not found');
      return false;
    }

    this.gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl');
    if (!this.gl) {
      console.warn('[WebGLVisualizer] WebGL not supported');
      return false;
    }

    this.setupShaders();
    this.setupBuffers();
    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
    
    this.initialized = true;
    console.log('[WebGLVisualizer] Initialized');
    return true;
  }

  setupShaders() {
    const vertexShaderSource = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      attribute float aSize;
      
      uniform mat4 uProjection;
      uniform mat4 uView;
      uniform mat4 uModel;
      
      varying vec4 vColor;
      
      void main() {
        gl_Position = uProjection * uView * uModel * vec4(aPosition, 1.0);
        gl_PointSize = aSize;
        vColor = aColor;
      }
    `;

    const fragmentShaderSource = `
      precision mediump float;
      varying vec4 vColor;
      
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
        gl_FragColor = vec4(vColor.rgb, vColor.a * alpha);
      }
    `;

    const lineVertexSource = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      
      uniform mat4 uProjection;
      uniform mat4 uView;
      
      varying vec4 vColor;
      
      void main() {
        gl_Position = uProjection * uView * vec4(aPosition, 1.0);
        vColor = aColor;
      }
    `;

    const lineFragmentSource = `
      precision mediump float;
      varying vec4 vColor;
      
      void main() {
        gl_FragColor = vColor;
      }
    `;

    this.shaders.node = this.createProgram(vertexShaderSource, fragmentShaderSource);
    this.shaders.edge = this.createProgram(lineVertexSource, lineFragmentSource);
  }

  createProgram(vertexSource, fragmentSource) {
    const gl = this.gl;
    
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vertexSource);
    gl.compileShader(vertexShader);
    
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fragmentSource);
    gl.compileShader(fragmentShader);
    
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    return program;
  }

  setupBuffers() {
    this.buffers = {
      nodePosition: this.gl.createBuffer(),
      nodeColor: this.gl.createBuffer(),
      nodeSize: this.gl.createBuffer(),
      edgePosition: this.gl.createBuffer(),
      edgeColor: this.gl.createBuffer()
    };
  }

  createScene(config) {
    const scene = {
      id: config.id || `scene_${Date.now()}`,
      name: config.name || 'Untitled Scene',
      type: config.type || WebGLVisualizer.SCENE_TYPES.NETWORK,
      camera: config.camera || { ...this.camera },
      nodes: config.nodes || [],
      edges: config.edges || [],
      settings: config.settings || {},
      createdAt: new Date().toISOString()
    };

    this.scenes.set(scene.id, scene);
    return scene;
  }

  setActiveScene(sceneId) {
    const scene = this.scenes.get(sceneId);
    if (scene) {
      this.activeScene = scene;
      this.nodes = scene.nodes;
      this.edges = scene.edges;
      this.camera = { ...scene.camera };
    }
  }

  addNode(node) {
    const nodeData = {
      id: node.id || `node_${Date.now()}`,
      type: node.type || 'default',
      position: node.position || [0, 0, 0],
      scale: node.scale || [1, 1, 1],
      color: node.color || '#4a9eff',
      size: node.size || 10,
      data: node.data || {}
    };
    
    this.nodes.push(nodeData);
    return nodeData;
  }

  addEdge(edge) {
    const edgeData = {
      id: edge.id || `edge_${Date.now()}`,
      from: edge.from,
      to: edge.to,
      weight: edge.weight || 1,
      color: edge.color || '#666666'
    };
    
    this.edges.push(edgeData);
    return edgeData;
  }

  removeNode(nodeId) {
    this.nodes = this.nodes.filter(n => n.id !== nodeId);
    this.edges = this.edges.filter(e => e.from !== nodeId && e.to !== nodeId);
  }

  removeEdge(edgeId) {
    this.edges = this.edges.filter(e => e.id !== edgeId);
  }

  visualizeAgents(agents) {
    this.nodes = [];
    this.edges = [];
    
    const colors = {
      orchestrator: '#ff6b6b',
      'code-agent': '#4ecdc4',
      'art-agent': '#a855f7',
      analyst: '#f59e0b',
      default: '#4a9eff'
    };

    agents.forEach((agent, index) => {
      const angle = (index / agents.length) * Math.PI * 2;
      const radius = 2;
      
      this.addNode({
        id: agent.id || agent,
        type: 'agent',
        position: [
          Math.cos(angle) * radius,
          Math.sin(angle) * radius,
          0
        ],
        color: colors[agent.id || agent] || colors.default,
        size: 20,
        data: agent
      });
    });

    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        this.addEdge({
          from: this.nodes[i].id,
          to: this.nodes[j].id,
          color: '#333333',
          weight: 0.5
        });
      }
    }
  }

  visualizePods(pods) {
    this.nodes = [];
    this.edges = [];
    
    const statusColors = {
      idle: '#22c55e',
      busy: '#f59e0b',
      warming: '#3b82f6',
      cooling: '#8b5cf6',
      terminated: '#ef4444'
    };

    pods.forEach((pod, index) => {
      const x = (index % 4) * 1.5 - 2.25;
      const y = Math.floor(index / 4) * 1.5 - 1;
      
      this.addNode({
        id: pod.id,
        type: 'pod',
        position: [x, y, 0],
        color: statusColors[pod.status] || '#666666',
        size: 25,
        data: pod
      });
    });
  }

  visualizeNetwork(topology) {
    this.nodes = [];
    this.edges = [];
    
    (topology.nodes || []).forEach(node => {
      this.addNode(node);
    });
    
    (topology.edges || []).forEach(edge => {
      this.addEdge(edge);
    });
  }

  render() {
    if (!this.initialized) return;
    
    const gl = this.gl;
    
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.05, 0.05, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    const projectionMatrix = this.perspectiveMatrix(
      this.camera.fov * Math.PI / 180,
      this.canvas.width / this.canvas.height,
      this.camera.near,
      this.camera.far
    );
    
    const viewMatrix = this.lookAtMatrix(
      this.camera.position,
      this.camera.target,
      this.camera.up
    );
    
    this.renderEdges(projectionMatrix, viewMatrix);
    this.renderNodes(projectionMatrix, viewMatrix);
  }

  renderNodes(projectionMatrix, viewMatrix) {
    if (this.nodes.length === 0) return;
    
    const gl = this.gl;
    const program = this.shaders.node;
    gl.useProgram(program);
    
    const positions = [];
    const colors = [];
    const sizes = [];
    
    this.nodes.forEach(node => {
      positions.push(...node.position);
      const c = this.hexToRgb(node.color);
      colors.push(c.r / 255, c.g / 255, c.b / 255, 1.0);
      sizes.push(node.size);
    });
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.nodePosition);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.nodeColor);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    const colorLoc = gl.getAttribLocation(program, 'aColor');
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.nodeSize);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sizes), gl.DYNAMIC_DRAW);
    const sizeLoc = gl.getAttribLocation(program, 'aSize');
    gl.enableVertexAttribArray(sizeLoc);
    gl.vertexAttribPointer(sizeLoc, 1, gl.FLOAT, false, 0, 0);
    
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, viewMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uModel'), false, this.identityMatrix());
    
    gl.drawArrays(gl.POINTS, 0, this.nodes.length);
  }

  renderEdges(projectionMatrix, viewMatrix) {
    if (this.edges.length === 0) return;
    
    const gl = this.gl;
    const program = this.shaders.edge;
    gl.useProgram(program);
    
    const positions = [];
    const colors = [];
    
    this.edges.forEach(edge => {
      const fromNode = this.nodes.find(n => n.id === edge.from);
      const toNode = this.nodes.find(n => n.id === edge.to);
      if (!fromNode || !toNode) return;
      
      positions.push(...fromNode.position, ...toNode.position);
      const c = this.hexToRgb(edge.color);
      colors.push(c.r / 255, c.g / 255, c.b / 255, 0.5);
      colors.push(c.r / 255, c.g / 255, c.b / 255, 0.5);
    });
    
    if (positions.length === 0) return;
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.edgePosition);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
    const posLoc = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
    
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers.edgeColor);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.DYNAMIC_DRAW);
    const colorLoc = gl.getAttribLocation(program, 'aColor');
    gl.enableVertexAttribArray(colorLoc);
    gl.vertexAttribPointer(colorLoc, 4, gl.FLOAT, false, 0, 0);
    
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uProjection'), false, projectionMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(program, 'uView'), false, viewMatrix);
    
    gl.drawArrays(gl.LINES, 0, positions.length / 3);
  }

  startAnimation() {
    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };
    animate();
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  perspectiveMatrix(fov, aspect, near, far) {
    const f = 1.0 / Math.tan(fov / 2);
    const nf = 1 / (near - far);
    return new Float32Array([
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (far + near) * nf, -1,
      0, 0, 2 * far * near * nf, 0
    ]);
  }

  lookAtMatrix(eye, target, up) {
    const z = this.normalize(this.subtract(eye, target));
    const x = this.normalize(this.cross(up, z));
    const y = this.cross(z, x);
    
    return new Float32Array([
      x[0], y[0], z[0], 0,
      x[1], y[1], z[1], 0,
      x[2], y[2], z[2], 0,
      -this.dot(x, eye), -this.dot(y, eye), -this.dot(z, eye), 1
    ]);
  }

  identityMatrix() {
    return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  }

  normalize(v) {
    const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  subtract(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  dot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 74, g: 158, b: 255 };
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;
  }

  destroy() {
    this.stopAnimation();
    this.nodes = [];
    this.edges = [];
    this.scenes.clear();
    this.initialized = false;
  }
}

if (typeof window !== 'undefined') {
  window.WebGLVisualizer = WebGLVisualizer;
}

if (typeof module !== 'undefined') {
  module.exports = { WebGLVisualizer };
}
