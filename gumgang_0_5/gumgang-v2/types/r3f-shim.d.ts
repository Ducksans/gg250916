// Minimal React Three Fiber and Drei type shims for compilation
// To be replaced with official @types when properly configured

declare module "@react-three/fiber" {
  import { ReactNode, RefObject, MutableRefObject } from "react";
  import {
    Camera,
    Scene,
    WebGLRenderer,
    Object3D,
    Raycaster,
    Vector2,
    Clock,
  } from "three";

  export interface RootState {
    gl: WebGLRenderer;
    scene: Scene;
    camera: Camera;
    mouse: Vector2;
    clock: Clock;
    raycaster: Raycaster;
    size: {
      width: number;
      height: number;
      top: number;
      left: number;
    };
    viewport: {
      width: number;
      height: number;
      factor: number;
      distance: number;
      aspect: number;
    };
    performance: {
      current: number;
      min: number;
      max: number;
      debounce: number;
      regress: () => void;
    };
    set: (state: Partial<RootState>) => void;
    get: () => RootState;
    invalidate: () => void;
    advance: (timestamp: number, runGlobalEffects?: boolean) => void;
  }

  export interface CanvasProps {
    children?: ReactNode;
    camera?:
      | Camera
      | Partial<{
          fov?: number;
          near?: number;
          far?: number;
          position?:
            | [number, number, number]
            | { x: number; y: number; z: number };
          rotation?: [number, number, number];
          zoom?: number;
        }>;
    shadows?: boolean | "basic" | "percentage" | "soft" | "variance";
    gl?:
      | Partial<WebGLRenderer>
      | ((canvas: HTMLCanvasElement) => WebGLRenderer);
    dpr?: number | [number, number];
    linear?: boolean;
    flat?: boolean;
    legacy?: boolean;
    orthographic?: boolean;
    frameloop?: "always" | "demand" | "never";
    performance?: Partial<{
      min?: number;
      max?: number;
      debounce?: number;
    }>;
    resize?: {
      scroll?: boolean;
      debounce?: number | { scroll?: number; resize?: number };
    };
    style?: React.CSSProperties;
    className?: string;
    onCreated?: (state: RootState) => void;
    onPointerMissed?: (event: MouseEvent) => void;
  }

  export const Canvas: React.FC<CanvasProps>;

  export function useFrame(
    callback: (state: RootState, delta: number) => void,
    priority?: number,
  ): void;
  export function useThree<T = RootState>(
    selector?: (state: RootState) => T,
  ): T;
  export function useLoader<T>(
    loader: any,
    url: string | string[],
    onProgress?: (event: ProgressEvent) => void,
  ): T;
  export function useGraph(object: Object3D): {
    nodes: { [key: string]: Object3D };
    materials: { [key: string]: any };
  };

  export function extend(objects: { [key: string]: any }): void;
  export function createRoot(canvas: HTMLCanvasElement): any;

  export type ThreeEvent<T = any> = T & {
    intersections: any[];
    object: Object3D;
    eventObject: Object3D;
    unprojectedPoint: any;
    ray: Raycaster;
    camera: Camera;
    stopPropagation: () => void;
    delta: number;
    nativeEvent: PointerEvent | MouseEvent | WheelEvent;
  };

  // Extended JSX for Three.js objects
  export namespace JSX {
    interface IntrinsicElements {
      // Cameras
      perspectiveCamera: any;
      orthographicCamera: any;

      // Lights
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      spotLight: any;
      hemisphereLight: any;

      // Geometries
      boxGeometry: any;
      sphereGeometry: any;
      planeGeometry: any;
      cylinderGeometry: any;
      coneGeometry: any;
      torusGeometry: any;

      // Materials
      meshBasicMaterial: any;
      meshStandardMaterial: any;
      meshPhongMaterial: any;
      meshPhysicalMaterial: any;
      lineBasicMaterial: any;
      pointsMaterial: any;

      // Objects
      mesh: any;
      line: any;
      points: any;
      group: any;
      scene: any;

      // Helpers
      axesHelper: any;
      gridHelper: any;
      boxHelper: any;

      // Primitives (allows any Three.js object)
      primitive: { object: Object3D } & any;
    }
  }
}

declare module "@react-three/drei" {
  import { ReactNode, RefObject, ComponentProps } from "react";
  import {
    Object3D,
    Mesh,
    Material,
    BufferGeometry,
    Camera,
    Color,
    Vector3,
    Texture,
  } from "three";
  import { ThreeEvent } from "@react-three/fiber";

  // Controls
  export interface OrbitControlsProps {
    camera?: Camera;
    domElement?: HTMLElement;
    enabled?: boolean;
    enableDamping?: boolean;
    dampingFactor?: number;
    enableZoom?: boolean;
    enableRotate?: boolean;
    enablePan?: boolean;
    autoRotate?: boolean;
    autoRotateSpeed?: number;
    makeDefault?: boolean;
    target?: [number, number, number] | Vector3;
    minDistance?: number;
    maxDistance?: number;
    minPolarAngle?: number;
    maxPolarAngle?: number;
    minAzimuthAngle?: number;
    maxAzimuthAngle?: number;
    onChange?: (event?: any) => void;
    onStart?: (event?: any) => void;
    onEnd?: (event?: any) => void;
  }
  export const OrbitControls: React.FC<OrbitControlsProps>;

  // Shapes
  export interface BoxProps {
    args?: [number?, number?, number?];
    children?: ReactNode;
    ref?: RefObject<Mesh>;
  }
  export const Box: React.FC<BoxProps & ComponentProps<"mesh">>;

  export interface SphereProps {
    args?: [number?, number?, number?];
    children?: ReactNode;
    ref?: RefObject<Mesh>;
  }
  export const Sphere: React.FC<SphereProps & ComponentProps<"mesh">>;

  export interface CylinderProps {
    args?: [number?, number?, number?, number?];
    children?: ReactNode;
    ref?: RefObject<Mesh>;
  }
  export const Cylinder: React.FC<CylinderProps & ComponentProps<"mesh">>;

  export interface PlaneProps {
    args?: [number?, number?];
    children?: ReactNode;
    ref?: RefObject<Mesh>;
  }
  export const Plane: React.FC<PlaneProps & ComponentProps<"mesh">>;

  // Grid
  export interface GridProps {
    args?: [number?, number?, string?, string?];
    cellSize?: number;
    cellThickness?: number;
    cellColor?: Color | string;
    sectionSize?: number;
    sectionThickness?: number;
    sectionColor?: Color | string;
    fadeDistance?: number;
    fadeStrength?: number;
    followCamera?: boolean;
    infiniteGrid?: boolean;
    ref?: RefObject<any>;
  }
  export const Grid: React.FC<GridProps>;

  // Text
  export interface TextProps {
    children?: ReactNode | string;
    color?: Color | string;
    fontSize?: number;
    maxWidth?: number;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: "left" | "right" | "center" | "justify";
    font?: string;
    anchorX?: number | "left" | "center" | "right";
    anchorY?:
      | number
      | "top"
      | "top-baseline"
      | "middle"
      | "bottom-baseline"
      | "bottom";
    clipRect?: [number, number, number, number];
    depthOffset?: number;
    direction?: "auto" | "ltr" | "rtl";
    overflowWrap?: "normal" | "break-word";
    whiteSpace?: "normal" | "overflowWrap" | "nowrap";
    outlineWidth?: number | string;
    outlineOffsetX?: number | string;
    outlineOffsetY?: number | string;
    outlineBlur?: number | string;
    outlineColor?: Color | string;
    outlineOpacity?: number;
    strokeWidth?: number | string;
    strokeColor?: Color | string;
    strokeOpacity?: number;
    fillOpacity?: number;
    ref?: RefObject<any>;
    onClick?: (event: ThreeEvent<MouseEvent>) => void;
    onPointerOver?: (event: ThreeEvent<PointerEvent>) => void;
    onPointerOut?: (event: ThreeEvent<PointerEvent>) => void;
  }
  export const Text: React.FC<TextProps & ComponentProps<"mesh">>;

  // Float
  export interface FloatProps {
    children?: ReactNode;
    speed?: number;
    rotationIntensity?: number;
    floatIntensity?: number;
    floatingRange?: [number, number];
  }
  export const Float: React.FC<FloatProps>;

  // Stars
  export interface StarsProps {
    radius?: number;
    depth?: number;
    count?: number;
    factor?: number;
    saturation?: number;
    fade?: boolean;
    speed?: number;
  }
  export const Stars: React.FC<StarsProps>;

  // Environment
  export interface EnvironmentProps {
    files?: string | string[];
    path?: string;
    preset?:
      | "sunset"
      | "dawn"
      | "night"
      | "warehouse"
      | "forest"
      | "apartment"
      | "studio"
      | "city"
      | "park"
      | "lobby";
    background?: boolean | "only";
    blur?: number;
    encoding?: any;
    ground?: boolean | { height?: number; radius?: number; scale?: number };
  }
  export const Environment: React.FC<EnvironmentProps>;

  // Html
  export interface HtmlProps {
    children?: ReactNode;
    prepend?: boolean;
    center?: boolean;
    fullscreen?: boolean;
    distanceFactor?: number;
    zIndexRange?: [number, number];
    portal?: RefObject<HTMLElement>;
    transform?: boolean;
    sprite?: boolean;
    calculatePosition?: (
      el: Object3D,
      camera: Camera,
      size: { width: number; height: number },
    ) => [number, number];
    occlude?: RefObject<Object3D>[] | boolean | "raycast" | "blending";
    onOcclude?: (occluded: boolean) => void;
    material?: Material;
    geometry?: BufferGeometry;
    castShadow?: boolean;
    receiveShadow?: boolean;
    style?: React.CSSProperties;
    className?: string;
    wrapperClass?: string;
    as?: keyof JSX.IntrinsicElements;
  }
  export const Html: React.FC<HtmlProps>;

  // Billboard
  export interface BillboardProps {
    children?: ReactNode;
    follow?: boolean;
    lockX?: boolean;
    lockY?: boolean;
    lockZ?: boolean;
  }
  export const Billboard: React.FC<BillboardProps>;

  // Reflector
  export interface ReflectorProps {
    mixBlur?: number;
    mixStrength?: number;
    resolution?: number;
    blur?: [number, number] | number;
    mirror?: number;
    minDepthThreshold?: number;
    maxDepthThreshold?: number;
    depthScale?: number;
    depthToBlurRatioBias?: number;
    distortion?: number;
    distortionMap?: Texture;
    mixContrast?: number;
    args?: [BufferGeometry?, any?];
  }
  export const Reflector: React.FC<ReflectorProps & ComponentProps<"mesh">>;

  // MeshReflectorMaterial
  export interface MeshReflectorMaterialProps {
    mixBlur?: number;
    mixStrength?: number;
    resolution?: number;
    blur?: [number, number] | number;
    mirror?: number;
    minDepthThreshold?: number;
    maxDepthThreshold?: number;
    depthScale?: number;
    depthToBlurRatioBias?: number;
    distortion?: number;
    distortionMap?: Texture;
    mixContrast?: number;
    color?: Color | string;
    metalness?: number;
    roughness?: number;
  }
  export const MeshReflectorMaterial: React.FC<MeshReflectorMaterialProps>;

  // Line component
  export interface LineProps {
    points: Array<[number, number, number] | Vector3>;
    color?: Color | string;
    lineWidth?: number;
    dashed?: boolean;
    vertexColors?: Array<[number, number, number]>;
  }
  export const Line: React.FC<LineProps>;

  // Edges
  export interface EdgesProps {
    threshold?: number;
    color?: Color | string;
    linewidth?: number;
  }
  export const Edges: React.FC<EdgesProps>;

  // Stats
  export interface StatsProps {
    showPanel?: number;
    className?: string;
    parent?: RefObject<HTMLElement>;
  }
  export const Stats: React.FC<StatsProps>;

  // PerspectiveCamera
  export interface PerspectiveCameraProps {
    makeDefault?: boolean;
    manual?: boolean;
    children?: ReactNode;
    fov?: number;
    near?: number;
    far?: number;
    position?: [number, number, number] | Vector3;
    rotation?: [number, number, number];
    ref?: RefObject<Camera>;
  }
  export const PerspectiveCamera: React.FC<PerspectiveCameraProps>;

  // Center
  export interface CenterProps {
    children?: ReactNode;
    top?: boolean;
    right?: boolean;
    bottom?: boolean;
    left?: boolean;
    front?: boolean;
    back?: boolean;
    disable?: boolean;
    disableX?: boolean;
    disableY?: boolean;
    disableZ?: boolean;
    precise?: boolean;
    cacheKey?: any;
    onCentered?: (props: {
      parent: Object3D;
      container: Object3D;
      width: number;
      height: number;
      depth: number;
      boundingBox: any;
      boundingSphere: any;
      center: Vector3;
    }) => void;
  }
  export const Center: React.FC<CenterProps>;

  // Exports for hooks
  export function useTexture(url: string | string[]): Texture | Texture[];
  export function useGLTF(url: string): any;
}
