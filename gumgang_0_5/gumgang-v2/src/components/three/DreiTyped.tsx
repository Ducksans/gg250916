import React from "react";

// Try to import from drei, provide fallbacks if not available
let MeshDistortMaterialBase: any;
let TrailBase: any;
let SparklesBase: any;

try {
  const drei = require("@react-three/drei");
  MeshDistortMaterialBase = drei.MeshDistortMaterial || ((): null => null);
  TrailBase = drei.Trail || ((): null => null);
  SparklesBase = drei.Sparkles || ((): null => null);
} catch {
  // Fallback if drei is not available
  MeshDistortMaterialBase = (): null => null;
  TrailBase = (): null => null;
  SparklesBase = (): null => null;
}

// Type definitions for the components
export interface MeshDistortMaterialProps {
  color?: string;
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
  metalness?: number;
  distort?: number;
  speed?: number;
  children?: React.ReactNode;
}

export interface TrailProps {
  width?: number;
  length?: number;
  color?: string;
  attenuation?: (t: number) => number;
  children?: React.ReactNode;
}

export interface SparklesProps {
  count?: number;
  size?: number | Float32Array;
  position?: [number, number, number];
  scale?: number | [number, number, number];
  color?: string;
  speed?: number;
  opacity?: number;
  noise?: number | [number, number, number];
}

// Type-safe exports
export const MeshDistortMaterial =
  MeshDistortMaterialBase as React.FC<MeshDistortMaterialProps>;
export const Trail = TrailBase as React.FC<TrailProps>;
export const Sparkles = SparklesBase as React.FC<SparklesProps>;
