"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line, Float } from "@react-three/drei";
import { MeshDistortMaterial, Trail } from "@/src/components/three/DreiTyped";
import * as THREE from "three";
import { useWebSocket } from "@/contexts/WebSocketContext";

// WebGL 지원 체크 함수
function checkWebGLSupport(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    return gl !== null;
  } catch (e) {
    console.warn("WebGL not supported:", e);
    return false;
  }
}

// Fallback UI for when WebGL is not supported - removed unused function

// Error Boundary for Canvas
class Memory3DErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Memory3D Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-gray-900 rounded-lg p-8">
          <div className="text-center">
            <div className="mb-4">
              <svg
                className="w-16 h-16 mx-auto text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              3D 렌더링 오류
            </h3>
            <p className="text-gray-400 mb-4">
              {this.state.error?.message || "3D 시각화 중 오류가 발생했습니다."}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              페이지 새로고침
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 메모리 레벨 정의
const MEMORY_LEVELS = [
  {
    id: "sensory",
    name: "감각 메모리",
    color: "#00ff88",
    position: [0, 4, 0],
    size: 1.2,
    ringCount: 3,
  },
  {
    id: "working",
    name: "작업 메모리",
    color: "#00bbff",
    position: [-3, 2, 0],
    size: 1.0,
    ringCount: 2,
  },
  {
    id: "short_term",
    name: "단기 메모리",
    color: "#ff00ff",
    position: [3, 2, 0],
    size: 1.0,
    ringCount: 2,
  },
  {
    id: "long_term",
    name: "장기 메모리",
    color: "#ffaa00",
    position: [-2, 0, 0],
    size: 1.3,
    ringCount: 4,
  },
  {
    id: "core",
    name: "핵심 메모리",
    color: "#ff0066",
    position: [2, -2, 0],
    size: 1.5,
    ringCount: 5,
  },
];

// 데이터 파티클 컴포넌트
function DataParticle({ start, end, color }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(0);

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    progress.current = (progress.current + delta * 0.3) % 1; // Reduced speed from 0.5 to 0.3
    const t = progress.current;

    // 베지어 곡선을 따라 이동
    const midPoint = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2 + 2,
      (start[2] + end[2]) / 2,
    ];

    meshRef.current.position.x =
      start[0] * (1 - t) * (1 - t) +
      2 * midPoint[0] * (1 - t) * t +
      end[0] * t * t;
    meshRef.current.position.y =
      start[1] * (1 - t) * (1 - t) +
      2 * midPoint[1] * (1 - t) * t +
      end[1] * t * t;
    meshRef.current.position.z =
      start[2] * (1 - t) * (1 - t) +
      2 * midPoint[2] * (1 - t) * t +
      end[2] * t * t;

    // 크기 애니메이션
    const scale = Math.sin(t * Math.PI) * 0.3 + 0.1;
    (meshRef.current.scale as any).setScalar(scale);
  });

  return (
    <Trail
      width={2}
      length={6}
      color={color}
      attenuation={(t: number) => t * t}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.05, 6, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </Trail>
  );
}

// 메모리 노드 컴포넌트
function MemoryNode({ level, data, isActive }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRefs = useRef<THREE.Mesh[]>([]);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;

    // 중심 구체 회전 (속도 감소)
    meshRef.current.rotation.y += 0.002; // Reduced from 0.005

    // 활성 상태일 때 펄스 효과
    if (isActive) {
      const scale = 1 + Math.sin(state.clock.getElapsedTime() * 2) * 0.1; // Reduced frequency
      (meshRef.current.scale as any).setScalar(scale * level.size);
    }

    // 링 회전 (속도 감소)
    ringRefs.current.forEach((ring, i) => {
      if (ring) {
        ring.rotation.x += 0.005 * (i + 1); // Reduced from 0.01
        ring.rotation.y += 0.002 * (i + 1); // Reduced from 0.005
        ring.rotation.z += 0.001 * (i + 1); // Reduced from 0.002
      }
    });
  });

  return (
    <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={level.position}>
        {/* 중심 구체 */}
        <mesh
          ref={meshRef}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          scale={level.size}
        >
          <sphereGeometry args={[1, 16, 16]} />
          <MeshDistortMaterial
            color={level.color}
            emissive={level.color}
            emissiveIntensity={hovered ? 0.8 : 0.3}
            roughness={0.1}
            metalness={0.8}
            distort={0.3}
            speed={2}
          />
        </mesh>

        {/* 궤도 링 */}
        {Array.from({ length: level.ringCount }).map((_, i) => (
          <mesh
            key={i}
            ref={(el: THREE.Mesh | null) => {
              if (el) ringRefs.current[i] = el;
            }}
            rotation={[Math.random() * Math.PI, Math.random() * Math.PI, 0]}
          >
            {React.createElement("torusGeometry" as any, {
              args: [level.size + 0.5 + i * 0.3, 0.02, 6, 32],
            })}
            <meshBasicMaterial
              color={level.color}
              opacity={0.3 - i * 0.05}
              transparent
            />
          </mesh>
        ))}

        {/* 텍스트 라벨 */}
        <Text
          position={[0, -level.size - 0.8, 0]}
          fontSize={0.3}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {level.name}
        </Text>

        {/* 데이터 카운트 */}
        {data > 0 && (
          <Text
            position={[0, level.size + 0.5, 0]}
            fontSize={0.25}
            color={level.color}
            anchorX="center"
            anchorY="middle"
          >
            {data} items
          </Text>
        )}
      </group>
    </Float>
  );
}

// 연결선 컴포넌트
function ConnectionLine({ start, end, active }: any) {
  const points = useMemo(() => {
    const CatmullRomCurve3 =
      (THREE as any).CatmullRomCurve3 || (THREE as any).Curve;
    const curve = new CatmullRomCurve3([
      new THREE.Vector3(...start),
      new THREE.Vector3(
        (start[0] + end[0]) / 2,
        (start[1] + end[1]) / 2 + 1,
        (start[2] + end[2]) / 2,
      ),
      new THREE.Vector3(...end),
    ]);
    return curve.getPoints(50);
  }, [start, end]);

  return (
    <Line
      {...({ points } as any)}
      color={active ? "#00ffff" : "#ffffff"}
      lineWidth={active ? 2 : 1}
      opacity={active ? 1 : 0.3}
      transparent
      dashed={!active}
    />
  );
}

// 배경 별 효과
function StarField() {
  const stars = useMemo(() => {
    const temp: { position: [number, number, number]; size: number }[] = [];
    for (let i = 0; i < 100; i++) {
      // Reduced from 500 to 100 stars
      temp.push({
        position: [
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30,
          (Math.random() - 0.5) * 30,
        ] as [number, number, number],
        size: Math.random() * 0.05,
      });
    }
    return temp;
  }, []);

  return (
    <>
      {stars.map((star, i) => (
        <mesh key={i} position={star.position}>
          <sphereGeometry args={[star.size, 3, 3]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      ))}
    </>
  );
}

// 메인 3D 씬
function Scene() {
  const { memoryStatus, isConnected } = useWebSocket() as any;
  const [activeConnections, setActiveConnections] = useState<any[]>([]);
  const [particles, setParticles] = useState<any[]>([]);

  // 메모리 데이터 매핑
  const memoryData = useMemo(
    () => ({
      sensory: memoryStatus?.sensory?.count || 0,
      working: memoryStatus?.working?.count || 0,
      short_term: memoryStatus?.short_term?.count || 0,
      long_term: memoryStatus?.long_term?.count || 0,
      core: memoryStatus?.core?.count || 0,
    }),
    [memoryStatus],
  );

  // 데이터 플로우 시뮬레이션
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      // 랜덤 연결 활성화
      const connections = [
        { start: MEMORY_LEVELS[0].position, end: MEMORY_LEVELS[1].position },
        { start: MEMORY_LEVELS[0].position, end: MEMORY_LEVELS[2].position },
        { start: MEMORY_LEVELS[1].position, end: MEMORY_LEVELS[3].position },
        { start: MEMORY_LEVELS[2].position, end: MEMORY_LEVELS[3].position },
        { start: MEMORY_LEVELS[3].position, end: MEMORY_LEVELS[4].position },
      ];

      const randomIndex = Math.floor(Math.random() * connections.length);
      setActiveConnections([connections[randomIndex]]);

      // 파티클 생성
      const newParticle = {
        id: Date.now(),
        ...connections[randomIndex],
        color:
          MEMORY_LEVELS[Math.floor(Math.random() * MEMORY_LEVELS.length)].color,
      };

      setParticles((prev) => [...prev.slice(-5), newParticle]); // Reduced max particles from 10 to 5

      setTimeout(() => {
        setActiveConnections([]);
      }, 1500); // Increased timeout
    }, 3000); // Reduced frequency from 2000ms to 3000ms

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <>
      {/* 조명 설정 */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#0088ff" />

      {/* 배경 별 */}
      <StarField />

      {/* 메모리 노드들 */}
      {MEMORY_LEVELS.map((level) => (
        <MemoryNode
          key={level.id}
          level={level}
          data={memoryData[level.id as keyof typeof memoryData]}
          isActive={activeConnections.some(
            (conn) =>
              conn.start === level.position || conn.end === level.position,
          )}
        />
      ))}

      {/* 연결선 */}
      <ConnectionLine
        start={MEMORY_LEVELS[0].position}
        end={MEMORY_LEVELS[1].position}
        active={false}
      />
      <ConnectionLine
        start={MEMORY_LEVELS[0].position}
        end={MEMORY_LEVELS[2].position}
        active={false}
      />
      <ConnectionLine
        start={MEMORY_LEVELS[1].position}
        end={MEMORY_LEVELS[3].position}
        active={false}
      />
      <ConnectionLine
        start={MEMORY_LEVELS[2].position}
        end={MEMORY_LEVELS[3].position}
        active={false}
      />
      <ConnectionLine
        start={MEMORY_LEVELS[3].position}
        end={MEMORY_LEVELS[4].position}
        active={false}
      />

      {/* 활성 연결 */}
      {activeConnections.map((conn, i) => (
        <ConnectionLine key={i} {...conn} active={true} />
      ))}

      {/* 데이터 파티클 */}
      {particles.map((particle) => (
        <DataParticle key={particle.id} {...particle} />
      ))}

      {/* 카메라 컨트롤 */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        autoRotateSpeed={0.2}
        maxDistance={20}
        minDistance={5}
      />
    </>
  );
}

// 메인 컴포넌트
export default function Memory3D() {
  const { isConnected } = useWebSocket();
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [_error, _setError] = useState<string | null>(null);

  useEffect(() => {
    const supported = checkWebGLSupport();
    setWebGLSupported(supported);
    if (!supported) {
      console.error("WebGL is not supported in your browser");
    }
  }, []);

  // WebGL이 지원되지 않는 경우 대체 UI
  if (!webGLSupported) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🧠</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            3D 시각화를 사용할 수 없습니다
          </h2>
          <p className="text-gray-400 mb-4">
            WebGL이 지원되지 않거나 비활성화되어 있습니다.
          </p>
          <div className="bg-gray-800 rounded-lg p-4 text-left max-w-md mx-auto">
            <p className="text-sm text-gray-300 mb-2">해결 방법:</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>• Chrome 또는 Firefox 최신 버전 사용</li>
              <li>• 브라우저에서 하드웨어 가속 활성화</li>
              <li>• chrome://flags에서 WebGL 활성화</li>
              <li>• 그래픽 드라이버 업데이트</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Memory3DErrorBoundary>
      <div className="w-full h-full relative">
        {/* 연결 상태 표시 */}
        <div className="absolute top-4 left-4 z-10">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-lg backdrop-blur-sm ${
              isConnected ? "bg-green-500/20" : "bg-red-500/20"
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              } animate-pulse`}
            />
            <span className="text-sm text-white">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
        </div>

        {/* 컨트롤 힌트 */}
        <div className="absolute bottom-4 left-4 z-10 text-white/60 text-xs">
          <p>🖱️ 마우스 드래그: 회전</p>
          <p>🔍 스크롤: 확대/축소</p>
          <p>⌨️ Shift + 드래그: 이동</p>
        </div>

        {/* 3D 캔버스 */}
        <Canvas
          camera={{ position: [10, 10, 20], fov: 60 }}
          gl={
            ((canvas: HTMLCanvasElement) => {
              const gl = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                powerPreference: "high-performance",
                failIfMajorPerformanceCaveat: false,
              });
              return gl;
            }) as any
          }
          onCreated={({ gl }) => {
            if (gl && typeof (gl as any).setClearColor === "function") {
              (gl as any).setClearColor(0x000000, 0);
            }
          }}
        >
          <Scene />
        </Canvas>
      </div>
    </Memory3DErrorBoundary>
  );
}
