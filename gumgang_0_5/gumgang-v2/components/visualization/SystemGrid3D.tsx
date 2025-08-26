"use client";

import React, { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  OrbitControls,
  Grid,
  Text,
  MeshReflectorMaterial,
  Environment,
  Float,
  Line,
} from "@react-three/drei";
import { Sparkles, Trail } from "@/src/components/three/DreiTyped";
import * as THREE from "three";
import { useWebSocket } from "@/contexts/WebSocketContext";

// 시스템 컴포넌트 정의
const SYSTEM_COMPONENTS = [
  { id: "input", name: "입력 처리", position: [-4, 0.5, -4], color: "#00ff88" },
  { id: "processor", name: "중앙 처리", position: [0, 1, 0], color: "#00bbff" },
  {
    id: "memory",
    name: "메모리 관리",
    position: [4, 0.5, -4],
    color: "#ff00ff",
  },
  {
    id: "evolution",
    name: "진화 엔진",
    position: [-4, 0.5, 4],
    color: "#ffaa00",
  },
  { id: "output", name: "출력 생성", position: [4, 0.5, 4], color: "#ff0066" },
];

// 데이터 플로우 경로
const DATA_FLOWS = [
  { from: "input", to: "processor", priority: "high" },
  { from: "processor", to: "memory", priority: "high" },
  { from: "processor", to: "evolution", priority: "medium" },
  { from: "memory", to: "processor", priority: "high" },
  { from: "evolution", to: "processor", priority: "medium" },
  { from: "processor", to: "output", priority: "high" },
];

// 에너지 파티클 컴포넌트
function EnergyParticle({ path, speed = 1, color = "#00ffff" }: any) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef(Math.random());

  useFrame((_state, delta) => {
    if (!meshRef.current) return;

    progress.current = (progress.current + delta * speed * 0.5) % 1; // Reduced speed by 50%
    const t = progress.current;

    // 경로를 따라 이동
    const x = path.start[0] + (path.end[0] - path.start[0]) * t;
    const y = 0.2 + Math.sin(t * Math.PI) * 0.5;
    const z = path.start[2] + (path.end[2] - path.start[2]) * t;

    meshRef.current.position.set(x, y, z);

    // 크기 펄스
    const scale = 0.1 + Math.sin(t * Math.PI) * 0.05;
    (meshRef.current.scale as any).setScalar(scale);
  });

  return (
    <Trail
      width={2}
      length={5}
      color={color}
      attenuation={(t: number) => t * t}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={2}
        />
      </mesh>
    </Trail>
  );
}

// 시스템 노드 컴포넌트
function SystemNode({ component, isActive, dataCount }: any) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (!meshRef.current) return;

    // 활성 상태 애니메이션 (속도 감소)
    if (isActive) {
      meshRef.current.rotation.y += 0.01; // Reduced from 0.02
      const scale = 1 + Math.sin(state.clock.getElapsedTime() * 2) * 0.1; // Reduced frequency
      (meshRef.current.scale as any).setScalar(scale);
    } else {
      meshRef.current.rotation.y += 0.002; // Reduced from 0.005
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.5} floatIntensity={0.5}>
      <group
        ref={meshRef}
        position={component.position}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        {/* 베이스 큐브 */}
        <mesh>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial
            color={component.color}
            emissive={component.color}
            emissiveIntensity={hovered ? 0.5 : 0.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        {/* 상부 피라미드 */}
        <mesh position={[0, 0.8, 0]} rotation={[0, Math.PI / 4, 0]}>
          {React.createElement("coneGeometry" as any, { args: [0.3, 0.6, 4] })}
          <meshStandardMaterial
            color={component.color}
            emissive={component.color}
            emissiveIntensity={0.3}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        {/* 라벨 */}
        <Text
          position={[0, -0.8, 0]}
          fontSize={0.2}
          color="white"
          anchorX="center"
          anchorY="middle"
        >
          {component.name}
        </Text>

        {/* 데이터 카운터 */}
        {dataCount > 0 && (
          <Text
            position={[0, 1.5, 0]}
            fontSize={0.15}
            color={component.color}
            anchorX="center"
            anchorY="middle"
          >
            {dataCount} ops/s
          </Text>
        )}

        {/* 활성 인디케이터 */}
        {isActive && (
          <mesh position={[0, 2, 0]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        )}
      </group>
    </Float>
  );
}

// 데이터 플로우 라인
function DataFlowLine({ from, to, isActive, priority }: any) {
  const points = useMemo(() => {
    const fromPos = SYSTEM_COMPONENTS.find((c) => c.id === from)?.position || [
      0, 0, 0,
    ];
    const toPos = SYSTEM_COMPONENTS.find((c) => c.id === to)?.position || [
      0, 0, 0,
    ];

    const CubicBezierCurve3 =
      (THREE as any).CubicBezierCurve3 || (THREE as any).Curve;
    const curve = new CubicBezierCurve3(
      new THREE.Vector3(...fromPos),
      new THREE.Vector3(fromPos[0], 2, fromPos[2]),
      new THREE.Vector3(toPos[0], 2, toPos[2]),
      new THREE.Vector3(...toPos),
    );

    return curve.getPoints(30);
  }, [from, to]);

  useFrame(() => {
    if (!isActive) return;

    // 활성 라인 애니메이션은 Line 컴포넌트가 직접 처리
  });

  const color = priority === "high" ? "#00ffff" : "#8888ff";

  return (
    <Line
      points={points}
      color={color}
      // @ts-expect-error: linewidth prop name differs in drei versions
      linewidth={priority === "high" ? 2 : 1}
      opacity={priority === "high" ? 0.8 : 0.3}
      transparent
    />
  );
}

// 그리드 플레인
function GridPlane() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
      <planeGeometry args={[20, 20]} />
      <MeshReflectorMaterial
        blur={[300, 100]}
        resolution={2048}
        mixBlur={1}
        mixStrength={40}
        roughness={1}
        depthScale={1.2}
        minDepthThreshold={0.4}
        maxDepthThreshold={1.4}
        color="#101010"
        metalness={0.5}
      />
    </mesh>
  );
}

// 메인 씬
function Scene() {
  const { isConnected } = useWebSocket();
  const [activeFlows, setActiveFlows] = useState<string[]>([]);
  const [particles, setParticles] = useState<any[]>([]);

  // 시스템 상태 데이터 (현재는 시뮬레이션 데이터 사용)
  const systemData = useMemo(
    () => ({
      input: Math.random() * 100,
      processor: Math.random() * 100,
      memory: Math.random() * 100,
      evolution: Math.random() * 100,
      output: Math.random() * 100,
    }),
    [],
  );

  // 데이터 플로우 애니메이션
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      // 랜덤 플로우 활성화
      const randomFlows = DATA_FLOWS.filter(() => Math.random() > 0.5).map(
        (f) => `${f.from}-${f.to}`,
      );

      setActiveFlows(randomFlows);

      // 파티클 생성
      randomFlows.forEach((flowId) => {
        const [from, to] = flowId.split("-");
        const fromPos = SYSTEM_COMPONENTS.find((c) => c.id === from)
          ?.position || [0, 0, 0];
        const toPos = SYSTEM_COMPONENTS.find((c) => c.id === to)?.position || [
          0, 0, 0,
        ];
        const flow = DATA_FLOWS.find((f) => f.from === from && f.to === to);

        setParticles((prev) => [
          ...prev.slice(-10), // Reduced max particles from 20 to 10
          {
            id: `${Date.now()}-${flowId}`,
            path: { start: fromPos, end: toPos },
            speed: flow?.priority === "high" ? 1.5 : 1,
            color:
              SYSTEM_COMPONENTS.find((c) => c.id === from)?.color || "#00ffff",
          },
        ]);
      });

      setTimeout(() => setActiveFlows([]), 2000); // Increased timeout
    }, 3000); // Reduced frequency from 2000ms to 3000ms

    return () => clearInterval(interval);
  }, [isConnected]);

  return (
    <>
      {/* 조명 설정 */}
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={1} />
      <pointLight position={[10, 5, 10]} intensity={0.5} color="#00aaff" />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#ff00aa" />

      {/* 환경 맵 */}
      <Environment preset="city" />

      {/* 그리드 바닥 */}
      <GridPlane />
      <Grid
        args={[20, 20]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#444444"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#666666"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
      />

      {/* 시스템 노드 */}
      {SYSTEM_COMPONENTS.map((component) => (
        <SystemNode
          key={component.id}
          component={component}
          isActive={activeFlows.some((f) => f.includes(component.id))}
          dataCount={systemData[component.id as keyof typeof systemData]}
        />
      ))}

      {/* 데이터 플로우 라인 */}
      {DATA_FLOWS.map((flow) => (
        <DataFlowLine
          key={`${flow.from}-${flow.to}`}
          from={flow.from}
          to={flow.to}
          isActive={activeFlows.includes(`${flow.from}-${flow.to}`)}
          priority={flow.priority}
        />
      ))}

      {/* 에너지 파티클 */}
      {particles.map((particle) => (
        <EnergyParticle key={particle.id} {...particle} />
      ))}

      {/* 배경 효과 */}
      <Sparkles
        count={30}
        scale={20}
        size={2}
        speed={0.2}
        opacity={0.3}
        color="#00ffff"
      />

      {/* 카메라 컨트롤 */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={false}
        autoRotateSpeed={0.1}
        maxDistance={25}
        minDistance={8}
        maxPolarAngle={Math.PI / 2.2}
      />
    </>
  );
}

// 메인 컴포넌트
export default function SystemGrid3D() {
  const { isConnected } = useWebSocket();

  return (
    <div className="w-full h-full relative bg-black">
      {/* 상태 오버레이 */}
      <div className="absolute top-4 right-4 z-10 space-y-2">
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
            System {isConnected ? "Online" : "Offline"}
          </span>
        </div>
      </div>

      {/* 범례 */}
      <div className="absolute bottom-4 right-4 z-10 bg-black/50 backdrop-blur-sm rounded-lg p-3">
        <h3 className="text-white text-xs font-bold mb-2">시스템 구성요소</h3>
        <div className="space-y-1">
          {SYSTEM_COMPONENTS.map((comp) => (
            <div key={comp.id} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: comp.color }}
              />
              <span className="text-white/70 text-xs">{comp.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3D 캔버스 */}
      <Canvas camera={{ position: [10, 10, 10], fov: 50 }} shadows>
        <Scene />
      </Canvas>
    </div>
  );
}
