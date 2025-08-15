import React, { useMemo } from 'react';
import * as THREE from 'three';

interface SeedTreesProps {
  center: [number, number, number];
  count?: number;
  radius?: number;
}

const SeedTrees: React.FC<SeedTreesProps> = ({ center, count = 10, radius = 0.9 }) => {
  const trees = useMemo(() => new Array(Math.max(1, count)).fill(0).map(() => ({
    angle: Math.random() * Math.PI * 2,
    dist: 0.2 + Math.random() * radius,
    height: 0.25 + Math.random() * 0.5,
  })), [count, radius]);

  return (
    <group>
      {trees.map((t, i) => {
        const x = center[0] + Math.cos(t.angle) * t.dist;
        const z = center[2] + Math.sin(t.angle) * t.dist;
        const y = center[1];
        return (
          <group key={i} position={[x, y, z]} rotation={[0, t.angle, 0]}>
            <mesh>
              <cylinderGeometry args={[0.01, 0.015, t.height, 6]} />
              <meshStandardMaterial color="#88aa88" emissive="#113311" emissiveIntensity={0.3} />
            </mesh>
            <mesh position={[0, t.height / 2, 0]}>
              <sphereGeometry args={[0.05, 8, 8]} />
              <meshBasicMaterial color="#b6ffb6" transparent opacity={0.8} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

export default SeedTrees;