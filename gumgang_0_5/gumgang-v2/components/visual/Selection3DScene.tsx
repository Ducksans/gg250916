"use client";
import dynamic from "next/dynamic";
const Canvas = dynamic(() => import("@react-three/fiber").then(m => m.Canvas), { ssr: false });

export function Selection3DScene() {
  return <div style={{ height: 240 }}><Canvas>{/* reserved */}</Canvas></div>;
}
