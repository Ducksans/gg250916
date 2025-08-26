// Minimal Three.js type shims for compilation
// To be replaced with official @types/three when properly configured

declare module "three" {
  // Core
  export class Object3D {
    position: Vector3;
    rotation: Euler;
    scale: Vector3;
    children: Object3D[];
    add(...objects: Object3D[]): this;
    remove(...objects: Object3D[]): this;
    lookAt(target: Vector3): void;
    visible: boolean;
    userData: any;
    name: string;
    uuid: string;
    traverse(callback: (object: Object3D) => void): void;
  }

  export class Scene extends Object3D {
    background: Color | null;
    fog: Fog | null;
  }

  export class Camera extends Object3D {
    matrixWorldInverse: Matrix4;
    projectionMatrix: Matrix4;
  }

  export class PerspectiveCamera extends Camera {
    constructor(fov?: number, aspect?: number, near?: number, far?: number);
    fov: number;
    aspect: number;
    near: number;
    far: number;
    updateProjectionMatrix(): void;
  }

  export class OrthographicCamera extends Camera {
    constructor(left: number, right: number, top: number, bottom: number, near?: number, far?: number);
  }

  // Renderer
  export class WebGLRenderer {
    constructor(parameters?: any);
    domElement: HTMLCanvasElement;
    setSize(width: number, height: number, updateStyle?: boolean): void;
    setPixelRatio(value: number): void;
    render(scene: Scene, camera: Camera): void;
    dispose(): void;
    shadowMap: { enabled: boolean; type: number };
    toneMapping: number;
    toneMappingExposure: number;
    outputEncoding: number;
  }

  // Math
  export class Vector2 {
    constructor(x?: number, y?: number);
    x: number;
    y: number;
    set(x: number, y: number): this;
    clone(): Vector2;
  }

  export class Vector3 {
    constructor(x?: number, y?: number, z?: number);
    x: number;
    y: number;
    z: number;
    set(x: number, y: number, z: number): this;
    clone(): Vector3;
    add(v: Vector3): this;
    sub(v: Vector3): this;
    multiplyScalar(scalar: number): this;
    normalize(): this;
    length(): number;
    distanceTo(v: Vector3): number;
  }

  export class Vector4 {
    constructor(x?: number, y?: number, z?: number, w?: number);
    x: number;
    y: number;
    z: number;
    w: number;
  }

  export class Euler {
    constructor(x?: number, y?: number, z?: number, order?: string);
    x: number;
    y: number;
    z: number;
    order: string;
  }

  export class Quaternion {
    x: number;
    y: number;
    z: number;
    w: number;
  }

  export class Matrix4 {
    elements: number[];
    identity(): this;
    multiply(m: Matrix4): this;
  }

  export class Color {
    constructor(color?: string | number);
    r: number;
    g: number;
    b: number;
    setHex(hex: number): this;
    setRGB(r: number, g: number, b: number): this;
    setStyle(style: string): this;
  }

  // Geometry
  export class BufferGeometry {
    attributes: any;
    index: any;
    dispose(): void;
  }

  export class BoxGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, depth?: number, widthSegments?: number, heightSegments?: number, depthSegments?: number);
  }

  export class SphereGeometry extends BufferGeometry {
    constructor(radius?: number, widthSegments?: number, heightSegments?: number);
  }

  export class PlaneGeometry extends BufferGeometry {
    constructor(width?: number, height?: number, widthSegments?: number, heightSegments?: number);
  }

  export class CylinderGeometry extends BufferGeometry {
    constructor(radiusTop?: number, radiusBottom?: number, height?: number, radialSegments?: number);
  }

  // Material
  export class Material {
    visible: boolean;
    transparent: boolean;
    opacity: number;
    side: number;
    needsUpdate: boolean;
    dispose(): void;
  }

  export class MeshBasicMaterial extends Material {
    constructor(parameters?: any);
    color: Color;
    map: Texture | null;
  }

  export class MeshStandardMaterial extends Material {
    constructor(parameters?: any);
    color: Color;
    metalness: number;
    roughness: number;
    emissive: Color;
    emissiveIntensity: number;
  }

  export class MeshPhongMaterial extends Material {
    constructor(parameters?: any);
    color: Color;
    specular: Color;
    shininess: number;
  }

  export class LineBasicMaterial extends Material {
    constructor(parameters?: any);
    color: Color;
    linewidth: number;
  }

  export class PointsMaterial extends Material {
    constructor(parameters?: any);
    color: Color;
    size: number;
    sizeAttenuation: boolean;
  }

  // Objects
  export class Mesh extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material | Material[]);
    geometry: BufferGeometry;
    material: Material | Material[];
  }

  export class Line extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
    geometry: BufferGeometry;
    material: Material;
  }

  export class Points extends Object3D {
    constructor(geometry?: BufferGeometry, material?: Material);
    geometry: BufferGeometry;
    material: Material;
  }

  export class Group extends Object3D {}

  // Lights
  export class Light extends Object3D {
    color: Color;
    intensity: number;
  }

  export class AmbientLight extends Light {
    constructor(color?: string | number, intensity?: number);
  }

  export class DirectionalLight extends Light {
    constructor(color?: string | number, intensity?: number);
    position: Vector3;
    target: Object3D;
    shadow: any;
  }

  export class PointLight extends Light {
    constructor(color?: string | number, intensity?: number, distance?: number, decay?: number);
  }

  export class SpotLight extends Light {
    constructor(color?: string | number, intensity?: number, distance?: number, angle?: number, penumbra?: number, decay?: number);
  }

  // Helpers
  export class AxesHelper extends Object3D {
    constructor(size?: number);
  }

  export class GridHelper extends Object3D {
    constructor(size?: number, divisions?: number, color1?: Color | number, color2?: Color | number);
  }

  // Loaders
  export class LoadingManager {
    constructor(onLoad?: () => void, onProgress?: (url: string, loaded: number, total: number) => void, onError?: (url: string) => void);
  }

  export class TextureLoader {
    constructor(manager?: LoadingManager);
    load(url: string, onLoad?: (texture: Texture) => void, onProgress?: (event: ProgressEvent) => void, onError?: (event: ErrorEvent) => void): Texture;
  }

  export class Texture {
    image: any;
    needsUpdate: boolean;
    dispose(): void;
  }

  // Fog
  export class Fog {
    constructor(color: number | string, near?: number, far?: number);
    color: Color;
    near: number;
    far: number;
  }

  // Clock
  export class Clock {
    constructor(autoStart?: boolean);
    start(): void;
    stop(): void;
    getElapsedTime(): number;
    getDelta(): number;
  }

  // Raycaster
  export class Raycaster {
    constructor(origin?: Vector3, direction?: Vector3, near?: number, far?: number);
    setFromCamera(coords: Vector2, camera: Camera): void;
    intersectObject(object: Object3D, recursive?: boolean): any[];
    intersectObjects(objects: Object3D[], recursive?: boolean): any[];
  }

  // Constants
  export const DoubleSide: number;
  export const FrontSide: number;
  export const BackSide: number;
  export const PCFSoftShadowMap: number;
  export const sRGBEncoding: number;
  export const ACESFilmicToneMapping: number;
  export const NormalBlending: number;
  export const AdditiveBlending: number;
}

// Three.js examples modules
declare module "three/examples/jsm/controls/OrbitControls" {
  import { Camera, EventDispatcher, Vector3 } from "three";
  export class OrbitControls extends EventDispatcher {
    constructor(camera: Camera, domElement: HTMLElement);
    enabled: boolean;
    enableDamping: boolean;
    dampingFactor: number;
    enableZoom: boolean;
    enableRotate: boolean;
    enablePan: boolean;
    autoRotate: boolean;
    autoRotateSpeed: number;
    target: Vector3;
    update(): void;
    dispose(): void;
  }
}

declare module "three/examples/jsm/postprocessing/EffectComposer" {
  import { WebGLRenderer, WebGLRenderTarget } from "three";
  export class EffectComposer {
    constructor(renderer: WebGLRenderer, renderTarget?: WebGLRenderTarget);
    addPass(pass: any): void;
    render(delta?: number): void;
    setSize(width: number, height: number): void;
  }
}

declare module "three/examples/jsm/postprocessing/RenderPass" {
  import { Scene, Camera } from "three";
  export class RenderPass {
    constructor(scene: Scene, camera: Camera);
    enabled: boolean;
  }
}

declare module "three/examples/jsm/postprocessing/UnrealBloomPass" {
  import { Vector2 } from "three";
  export class UnrealBloomPass {
    constructor(resolution: Vector2, strength: number, radius: number, threshold: number);
    strength: number;
    radius: number;
    threshold: number;
    enabled: boolean;
  }
}

declare module "three/examples/jsm/postprocessing/OutlinePass" {
  import { Vector2, Scene, Camera, Object3D, Color } from "three";
  export class OutlinePass {
    constructor(resolution: Vector2, scene: Scene, camera: Camera);
    selectedObjects: Object3D[];
    visibleEdgeColor: Color;
    hiddenEdgeColor: Color;
    edgeThickness: number;
    edgeStrength: number;
    enabled: boolean;
  }
}

declare module "three/examples/jsm/renderers/CSS2DRenderer" {
  import { Object3D } from "three";
  export class CSS2DRenderer {
    constructor();
    domElement: HTMLElement;
    setSize(width: number, height: number): void;
    render(scene: any, camera: any): void;
  }
  export class CSS2DObject extends Object3D {
    constructor(element: HTMLElement);
    element: HTMLElement;
  }
}
