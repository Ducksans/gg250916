import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";
import { OutlinePass } from "three/examples/jsm/postprocessing/OutlinePass";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer";
import { TWEEN } from "@tweenjs/tween.js";

// Types for code structure
export interface CodeNode {
  id: string;
  type:
    | "file"
    | "function"
    | "class"
    | "variable"
    | "import"
    | "export"
    | "module";
  name: string;
  path?: string;
  position?: THREE.Vector3;
  size?: number;
  complexity?: number;
  dependencies?: string[];
  children?: CodeNode[];
  metadata?: Record<string, any>;
}

export interface CodeEdge {
  id: string;
  source: string;
  target: string;
  type: "import" | "export" | "call" | "inheritance" | "dependency";
  weight?: number;
  metadata?: Record<string, any>;
}

export interface VisualizationConfig {
  container: HTMLElement;
  width?: number;
  height?: number;
  theme?: "dark" | "light" | "matrix" | "galaxy";
  physics?: boolean;
  animationSpeed?: number;
  particleEffects?: boolean;
  showLabels?: boolean;
  showGrid?: boolean;
  cameraPosition?: THREE.Vector3;
  autoRotate?: boolean;
  // Performance guardrails
  maxNodes?: number; // hard cap on nodes rendered (default 2000)
  fpsWarnThreshold?: number; // FPS warning threshold (default 30)
  enableLOD?: boolean; // enable level-of-detail reductions under load (default true)
}

export interface NodeStyle {
  geometry: "sphere" | "box" | "cone" | "cylinder" | "torus" | "icosahedron";
  color: string | number;
  emissive?: string | number;
  metalness?: number;
  roughness?: number;
  opacity?: number;
  scale?: number;
}

// Node style mapping
const NODE_STYLES: Record<CodeNode["type"], NodeStyle> = {
  file: {
    geometry: "box",
    color: 0x3b82f6,
    emissive: 0x1e40af,
    metalness: 0.7,
    roughness: 0.3,
    scale: 1.0,
  },
  function: {
    geometry: "sphere",
    color: 0x10b981,
    emissive: 0x065f46,
    metalness: 0.5,
    roughness: 0.5,
    scale: 0.8,
  },
  class: {
    geometry: "cylinder",
    color: 0x8b5cf6,
    emissive: 0x5b21b6,
    metalness: 0.6,
    roughness: 0.4,
    scale: 1.2,
  },
  variable: {
    geometry: "icosahedron",
    color: 0xfbbf24,
    emissive: 0x92400e,
    metalness: 0.3,
    roughness: 0.7,
    scale: 0.6,
  },
  import: {
    geometry: "cone",
    color: 0xef4444,
    emissive: 0x991b1b,
    metalness: 0.8,
    roughness: 0.2,
    scale: 0.7,
  },
  export: {
    geometry: "torus",
    color: 0x06b6d4,
    emissive: 0x164e63,
    metalness: 0.9,
    roughness: 0.1,
    scale: 0.9,
  },
  module: {
    geometry: "box",
    color: 0xf97316,
    emissive: 0x9a3412,
    metalness: 0.6,
    roughness: 0.4,
    scale: 1.5,
  },
};

// Main 3D Visualization Engine
export class Code3DVisualizationEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private labelRenderer: CSS2DRenderer;
  private composer: EffectComposer;
  private controls: OrbitControls;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private config: Required<VisualizationConfig>;
  private nodes: Map<string, THREE.Mesh>;
  private edges: Map<string, THREE.Line>;
  private labels: Map<string, CSS2DObject>;
  private particles: THREE.Points | null = null;

  private selectedNode: THREE.Mesh | null = null;
  private hoveredNode: THREE.Mesh | null = null;
  // private animationId: number | null = null; // Not used currently

  private nodeData: Map<string, CodeNode>;
  private edgeData: Map<string, CodeEdge>;

  private eventListeners: Map<string, Set<Function>>;
  // private clock: THREE.Clock; // Not used currently

  // Performance monitoring
  private fpsFrames: number = 0;
  private lastFpsCheck: number =
    typeof performance !== "undefined" && performance.now
      ? performance.now()
      : Date.now();
  private currentFPS: number = 60;

  constructor(config: VisualizationConfig) {
    this.config = {
      width: config.width || config.container.clientWidth,
      height: config.height || config.container.clientHeight,
      theme: config.theme || "galaxy",
      physics: config.physics !== false,
      animationSpeed: config.animationSpeed || 1.0,
      particleEffects: config.particleEffects !== false,
      showLabels: config.showLabels !== false,
      showGrid: config.showGrid !== false,
      cameraPosition: config.cameraPosition || new THREE.Vector3(0, 0, 100),
      autoRotate: config.autoRotate || false,
      // Performance guardrails (defaults)
      maxNodes: typeof config.maxNodes === "number" ? config.maxNodes : 2000,
      fpsWarnThreshold:
        typeof config.fpsWarnThreshold === "number"
          ? config.fpsWarnThreshold
          : 30,
      enableLOD: config.enableLOD !== false,
      container: config.container,
    };

    this.nodes = new Map();
    this.edges = new Map();
    this.labels = new Map();
    this.nodeData = new Map();
    this.edgeData = new Map();
    this.eventListeners = new Map();
    // Clock initialization moved to constructor

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    // Initialize Three.js components
    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.labelRenderer = this.createLabelRenderer();
    this.composer = this.createComposer();
    this.controls = this.createControls();

    // Setup the scene
    this.setupLighting();
    this.setupEnvironment();
    this.setupEventHandlers();

    // Start animation loop
    // Animation loop will be started after initialization
    this.startAnimationLoop();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();

    // Apply theme
    switch (this.config.theme) {
      case "dark":
        scene.background = new THREE.Color(0x0a0a0a);
        scene.fog = new THREE.Fog(0x0a0a0a, 100, 500);
        break;
      case "light":
        scene.background = new THREE.Color(0xf0f0f0);
        scene.fog = new THREE.Fog(0xf0f0f0, 100, 500);
        break;
      case "matrix":
        scene.background = new THREE.Color(0x000000);
        scene.fog = new THREE.Fog(0x003300, 50, 400);
        break;
      case "galaxy":
        scene.background = new THREE.Color(0x0a0e1a);
        scene.fog = new THREE.Fog(0x0a0e1a, 100, 600);
        break;
    }

    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      75,
      this.config.width / this.config.height,
      0.1,
      1000,
    );
    camera.position.set(
      this.config.cameraPosition.x,
      this.config.cameraPosition.y,
      this.config.cameraPosition.z,
    );
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(this.config.width, this.config.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    this.config.container.appendChild(renderer.domElement);
    return renderer;
  }

  private createLabelRenderer(): CSS2DRenderer {
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(this.config.width, this.config.height);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    this.config.container.appendChild(labelRenderer.domElement);
    return labelRenderer;
  }

  private createComposer(): EffectComposer {
    const composer = new EffectComposer(this.renderer);

    // Render pass
    const renderPass = new RenderPass(this.scene, this.camera);
    composer.addPass(renderPass);

    // Bloom effect
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.config.width, this.config.height),
      0.5, // strength
      0.4, // radius
      0.85, // threshold
    );
    composer.addPass(bloomPass);

    // Outline effect
    const outlinePass = new OutlinePass(
      new THREE.Vector2(this.config.width, this.config.height),
      this.scene,
      this.camera,
    );
    outlinePass.edgeStrength = 3;
    (outlinePass as any).edgeGlow = 0.7;
    outlinePass.edgeThickness = 1;
    (outlinePass as any).pulsePeriod = 2;
    composer.addPass(outlinePass);

    return composer;
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    (controls as any).screenSpacePanning = false;
    (controls as any).minDistance = 10;
    (controls as any).maxDistance = 500;
    (controls as any).maxPolarAngle = Math.PI / 2;
    controls.autoRotate = this.config.autoRotate;
    controls.autoRotateSpeed = 0.5;
    return controls;
  }

  private setupLighting(): void {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    this.scene.add(ambientLight);

    // Directional lights
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(50, 50, 50);
    (directionalLight1 as any).castShadow = true;
    directionalLight1.shadow.mapSize.width = 2048;
    directionalLight1.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x4080ff, 0.5);
    directionalLight2.position.set(-50, 50, -50);
    this.scene.add(directionalLight2);

    // Point lights for accent
    const pointLight1 = new THREE.PointLight(0xff0080, 0.5, 100);
    pointLight1.position.set(25, 25, 25);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x80ff00, 0.5, 100);
    pointLight2.position.set(-25, -25, -25);
    this.scene.add(pointLight2);

    // Hemisphere light for soft overall lighting
    const hemisphereLight = new (THREE as any).HemisphereLight(
      0x8080ff,
      0x404040,
      0.5,
    );
    this.scene.add(hemisphereLight);
  }

  private setupEnvironment(): void {
    // Grid helper
    if (this.config.showGrid) {
      const gridHelper = new THREE.GridHelper(200, 50, 0x444444, 0x222222);
      this.scene.add(gridHelper);
    }

    // Particle system for atmosphere
    if (this.config.particleEffects) {
      this.createParticleSystem();
    }

    // Skybox or environment map
    if (this.config.theme === "galaxy") {
      this.createStarfield();
    }
  }

  private createParticleSystem(): void {
    const particleCount = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      positions[i3] = (Math.random() - 0.5) * 300;
      positions[i3 + 1] = (Math.random() - 0.5) * 300;
      positions[i3 + 2] = (Math.random() - 0.5) * 300;

      colors[i3] = Math.random();
      colors[i3 + 1] = Math.random();
      colors[i3 + 2] = Math.random();
    }

    geometry.attributes.position = new (THREE as any).BufferAttribute(
      new Float32Array(positions),
      3,
    );
    geometry.attributes.color = new (THREE as any).BufferAttribute(colors, 3);

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.6,
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createStarfield(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.7,
      transparent: true,
      opacity: 0.8,
    });

    const starsVertices = [];
    for (let i = 0; i < 5000; i++) {
      const x = (Math.random() - 0.5) * 1000;
      const y = (Math.random() - 0.5) * 1000;
      const z = (Math.random() - 0.5) * 1000;
      starsVertices.push(x, y, z);
    }

    starsGeometry.attributes.position = new (
      THREE as any
    ).Float32BufferAttribute(starsVertices, 3);
    const starField = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(starField);
  }

  private setupEventHandlers(): void {
    // Mouse events
    this.renderer.domElement.addEventListener(
      "mousemove",
      this.onMouseMove.bind(this),
    );
    this.renderer.domElement.addEventListener("click", this.onClick.bind(this));
    this.renderer.domElement.addEventListener(
      "dblclick",
      this.onDoubleClick.bind(this),
    );

    // Window resize
    window.addEventListener("resize", this.onWindowResize.bind(this));

    // Keyboard events
    window.addEventListener("keydown", this.onKeyDown.bind(this));
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.checkIntersections();
  }

  private onClick(_event: MouseEvent): void {
    if (this.hoveredNode) {
      this.selectNode(this.hoveredNode);
    }
  }

  private onDoubleClick(_event: MouseEvent): void {
    if (this.hoveredNode) {
      const nodeId = this.getNodeId(this.hoveredNode);
      if (nodeId) {
        this.focusOnNode(nodeId);
        this.emit("node:doubleclick", this.nodeData.get(nodeId));
      }
    }
  }

  private onKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case "Escape":
        this.deselectNode();
        break;
      case "f":
        if (this.selectedNode) {
          const nodeId = this.getNodeId(this.selectedNode);
          if (nodeId) this.focusOnNode(nodeId);
        }
        break;
      case "r":
        this.resetCamera();
        break;
      case "g":
        this.config.showGrid = !this.config.showGrid;
        this.updateGrid();
        break;
      case "l":
        this.config.showLabels = !this.config.showLabels;
        this.updateLabels();
        break;
    }
  }

  private onWindowResize(): void {
    const width = this.config.container.clientWidth;
    const height = this.config.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
    this.labelRenderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  private checkIntersections(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      Array.from(this.nodes.values()),
    );

    if (intersects.length > 0) {
      const newHovered = intersects[0].object as THREE.Mesh;
      if (newHovered !== this.hoveredNode) {
        this.unhoverNode();
        this.hoverNode(newHovered);
      }
    } else {
      this.unhoverNode();
    }
  }

  private hoverNode(node: THREE.Mesh): void {
    this.hoveredNode = node;
    document.body.style.cursor = "pointer";

    // Highlight effect
    const material = node.material as THREE.MeshStandardMaterial;
    material.emissiveIntensity = 0.5;

    const nodeId = this.getNodeId(node);
    if (nodeId) {
      this.emit("node:hover", this.nodeData.get(nodeId));
    }
  }

  private unhoverNode(): void {
    if (this.hoveredNode) {
      document.body.style.cursor = "default";

      const material = this.hoveredNode.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.2;

      const nodeId = this.getNodeId(this.hoveredNode);
      if (nodeId) {
        this.emit("node:unhover", this.nodeData.get(nodeId));
      }

      this.hoveredNode = null;
    }
  }

  private selectNode(node: THREE.Mesh): void {
    this.deselectNode();
    this.selectedNode = node;

    // Add to outline pass
    const outlinePass = (this.composer as any).passes?.find(
      (pass: any) => pass instanceof OutlinePass,
    ) as OutlinePass;
    if (outlinePass) {
      outlinePass.selectedObjects = [node];
    }

    const nodeId = this.getNodeId(node);
    if (nodeId) {
      this.highlightConnections(nodeId);
      this.emit("node:select", this.nodeData.get(nodeId));
    }
  }

  private deselectNode(): void {
    if (this.selectedNode) {
      // Remove from outline pass
      const outlinePass = (this.composer as any).passes?.find(
        (pass: any) => pass instanceof OutlinePass,
      ) as OutlinePass;
      if (outlinePass) {
        outlinePass.selectedObjects = [];
      }

      this.unhighlightConnections();

      const nodeId = this.getNodeId(this.selectedNode);
      if (nodeId) {
        this.emit("node:deselect", this.nodeData.get(nodeId));
      }

      this.selectedNode = null;
    }
  }

  private getNodeId(node: THREE.Mesh): string | undefined {
    for (const [id, mesh] of this.nodes.entries()) {
      if (mesh === node) return id;
    }
    return undefined;
  }

  private highlightConnections(nodeId: string): void {
    // Highlight edges connected to the node
    for (const [edgeId, edge] of this.edgeData.entries()) {
      if (edge.source === nodeId || edge.target === nodeId) {
        const line = this.edges.get(edgeId);
        if (line) {
          const material = line.material as THREE.LineBasicMaterial;
          material.opacity = 1;
          material.linewidth = 3;
        }
      }
    }
  }

  private unhighlightConnections(): void {
    for (const [_edgeId, line] of this.edges.entries()) {
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = 0.3;
      material.linewidth = 1;
    }
  }

  // Public API methods
  public addNode(node: CodeNode): void {
    // Hard node cap guard
    const maxNodes = (this.config as any).maxNodes ?? 2000;
    if (this.nodes.size >= maxNodes) {
      // Silently ignore nodes beyond cap to preserve FPS
      return;
    }

    // Calculate position if not provided
    if (!node.position) {
      node.position = this.calculateNodePosition(node);
    }

    // Create geometry based on node type (createGeometry applies LOD if enabled)
    const style = NODE_STYLES[node.type];
    const geometry = this.createGeometry(style.geometry, node.size || 1);

    // Create material
    const material = new THREE.MeshStandardMaterial({
      color: style.color,
      emissive: style.emissive || style.color,
      emissiveIntensity: 0.2,
      metalness: style.metalness || 0.5,
      roughness: style.roughness || 0.5,
      transparent: true,
      opacity: style.opacity || 1,
    });

    // Create mesh
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(node.position.x, node.position.y, node.position.z);
    mesh.scale.multiplyScalar(style.scale || 1);
    (mesh as any).castShadow = true;
    (mesh as any).receiveShadow = true;

    // Add to scene and store
    this.scene.add(mesh);
    this.nodes.set(node.id, mesh);
    this.nodeData.set(node.id, node);

    // Add label
    if (this.config.showLabels) {
      this.addLabel(node.id, node.name);
    }

    // Animate entrance
    this.animateNodeEntrance(mesh);
  }

  public addEdge(edge: CodeEdge): void {
    const sourceNode = this.nodes.get(edge.source);
    const targetNode = this.nodes.get(edge.target);

    if (!sourceNode || !targetNode) return;

    // Create curve between nodes
    const curve = new (THREE as any).CatmullRomCurve3([
      sourceNode.position,
      new THREE.Vector3(
        (sourceNode.position.x + targetNode.position.x) / 2,
        (sourceNode.position.y + targetNode.position.y) / 2 + 10,
        (sourceNode.position.z + targetNode.position.z) / 2,
      ),
      targetNode.position,
    ]);

    const points = curve.getPoints(50);
    const geometry = new THREE.BufferGeometry();
    (geometry as any).setFromPoints(points);

    // Create material based on edge type
    const color = this.getEdgeColor(edge.type);
    const material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      linewidth: edge.weight || 1,
    });

    const line = new THREE.Line(geometry, material);
    this.scene.add(line);
    this.edges.set(edge.id, line);
    this.edgeData.set(edge.id, edge);

    // Animate edge
    this.animateEdgeFlow(line, edge);
  }

  private createGeometry(type: string, size: number): THREE.BufferGeometry {
    const scale = size * 2;

    // LOD heuristic: when enabled and node count grows, reduce segment counts
    const enableLOD = (this.config as any).enableLOD !== false;
    const nodeCount = this.nodes ? this.nodes.size : 0;
    const maxNodes = (this.config as any).maxNodes ?? 2000;
    const heavy = enableLOD && nodeCount > Math.floor(maxNodes * 0.5);

    const sphereSeg = heavy ? 12 : 32;
    const cylRadSeg = heavy ? 12 : 32;
    const torusRadSeg = heavy ? 8 : 16;
    const torusTubSeg = heavy ? 32 : 100;
    const icoDetail = heavy ? 0 : 1;
    const coneRadSeg = heavy ? 4 : 12;

    switch (type) {
      case "sphere":
        return new THREE.SphereGeometry(scale, sphereSeg, sphereSeg);
      case "box":
        return new THREE.BoxGeometry(scale, scale, scale);
      case "cone":
        return new (THREE as any).ConeGeometry(scale, scale * 2, coneRadSeg);
      case "cylinder":
        return new THREE.CylinderGeometry(scale, scale, scale * 2, cylRadSeg);
      case "torus":
        return new (THREE as any).TorusGeometry(
          scale,
          scale * 0.4,
          torusRadSeg,
          torusTubSeg,
        );
      case "octahedron":
        return new (THREE as any).IcosahedronGeometry(scale, icoDetail);
      default:
        return new THREE.SphereGeometry(scale, sphereSeg, sphereSeg);
    }
  }

  private calculateNodePosition(_node: CodeNode): THREE.Vector3 {
    // Simple force-directed layout
    const angle = Math.random() * Math.PI * 2;
    const radius = 30 + Math.random() * 50;
    const height = (Math.random() - 0.5) * 50;

    return new THREE.Vector3(
      Math.cos(angle) * radius,
      height,
      Math.sin(angle) * radius,
    );
  }

  private getEdgeColor(type: string): number {
    const colors: Record<string, number> = {
      import: 0xff4444,
      export: 0x44ff44,
      call: 0x4444ff,
      inheritance: 0xff44ff,
      dependency: 0xffff44,
    };
    return colors[type] || 0x888888;
  }

  private addLabel(nodeId: string, text: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const labelDiv = document.createElement("div");
    labelDiv.className = "node-label";
    labelDiv.textContent = text;
    labelDiv.style.color = "white";
    labelDiv.style.fontSize = "12px";
    labelDiv.style.padding = "2px 6px";
    labelDiv.style.background = "rgba(0, 0, 0, 0.6)";
    labelDiv.style.borderRadius = "3px";
    labelDiv.style.whiteSpace = "nowrap";

    const label = new CSS2DObject(labelDiv);
    label.position.set(0, 3, 0);
    node.add(label);
    this.labels.set(nodeId, label);
  }

  private animateNodeEntrance(mesh: THREE.Mesh): void {
    mesh.scale.set(0, 0, 0);
    new TWEEN.Tween(mesh.scale)
      .to({ x: 1, y: 1, z: 1 }, 500)
      .easing(TWEEN.Easing.Elastic.Out)
      .start();
  }

  private animateEdgeFlow(line: THREE.Line, _edge: CodeEdge): void {
    // Create flowing effect on edges
    const material = line.material as THREE.LineBasicMaterial;
    const originalOpacity = material.opacity;

    new TWEEN.Tween({ opacity: 0.3 })
      .to({ opacity: originalOpacity }, 2000)
      .easing(TWEEN.Easing.Sinusoidal.InOut)
      .repeat(Infinity)
      .start()
      .yoyo(true)
      .onUpdate((obj) => {
        material.opacity = obj.opacity;
      })
      .start();
  }

  public focusOnNode(nodeId: string, duration: number = 1000): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    const targetPosition = node.position.clone();
    targetPosition.z += 30;

    new TWEEN.Tween(this.camera.position)
      .to(targetPosition, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        this.camera.lookAt(node.position);
      })
      .start();

    new TWEEN.Tween(this.controls.target)
      .to(node.position, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
  }

  public resetCamera(duration: number = 1000): void {
    new TWEEN.Tween(this.camera.position)
      .to(this.config.cameraPosition, duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();

    new TWEEN.Tween(this.controls.target)
      .to(new THREE.Vector3(0, 0, 0), duration)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
  }

  private updateGrid(): void {
    const grid = (this.scene as any).getObjectByName("GridHelper");
    if (grid) {
      grid.visible = this.config.showGrid;
    }
  }

  private updateLabels(): void {
    this.labels.forEach((label) => {
      label.visible = this.config.showLabels;
    });
  }

  // Event system
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  //
  // Public methods for external control
  dispose(): void {
    console.warn("dispose called but not fully implemented");
    if (this.renderer) {
      this.renderer.dispose();
    }
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
  }

  updateSettings(settings: Partial<VisualizationConfig>): void {
    Object.assign(this.config, settings);
    // Re-apply settings that need immediate update
    if (this.controls && settings) {
      // Apply control settings if provided
    }
  }

  clear(): void {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.nodes.clear();
    this.edges.clear();
    this.scene = this.createScene();
    this.setupLighting();
  }

  private startAnimationLoop(): void {
    const animate = () => {
      requestAnimationFrame(animate);

      // FPS monitor (simple 1s window)
      this.fpsFrames += 1;
      const now =
        typeof performance !== "undefined" && performance.now
          ? performance.now()
          : Date.now();
      const elapsed = now - this.lastFpsCheck;
      if (elapsed >= 1000) {
        this.currentFPS = Math.round((this.fpsFrames * 1000) / elapsed);
        this.fpsFrames = 0;
        this.lastFpsCheck = now;

        const warnThreshold = (this.config as any).fpsWarnThreshold ?? 30;
        if (this.currentFPS < warnThreshold) {
          // Emit low-FPS event and apply minimal visual throttle if LOD enabled
          this.emit("performance:fps", {
            fps: this.currentFPS,
            threshold: warnThreshold,
          });

          if ((this.config as any).enableLOD !== false) {
            // Hide labels under load to reduce DOM overhead
            if ((this.config as any).showLabels !== false) {
              (this.config as any).showLabels = false;
              this.updateLabels();
            }
          }
          // Console signal for diagnostics
          // eslint-disable-next-line no-console
          console.warn(
            `[Code3D] Low FPS: ${this.currentFPS} (< ${warnThreshold})`,
          );
        }
      }

      if (this.controls) {
        this.controls.update();
      }

      if (this.composer) {
        this.composer.render();
      } else if (this.renderer) {
        this.renderer.render(this.scene, this.camera);
      }
    };
    animate();
  }
}
