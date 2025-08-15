import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbitSwarmProps {
  center: [number, number, number];
  count?: number;
  innerRadius?: number;
  outerRadius?: number;
  speed?: number; // base angular speed
  color?: string;
  opacity?: number;
}

const OrbitSwarm: React.FC<OrbitSwarmProps> = ({
  center,
  count = 60,
  innerRadius = 1.4,
  outerRadius = 2.2,
  speed = 0.15,
  color = '#9bd4ff',
  opacity = 0.85,
}) => {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const timeRef = useRef(0);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Precompute each particle's orbit parameters
  const particles = useMemo(
    () =>
      new Array(Math.max(1, count)).fill(0).map((_, i) => ({
        angle: Math.random() * Math.PI * 2,
        radius:
          innerRadius + Math.random() * Math.max(0.1, outerRadius - innerRadius),
        speed: speed * (0.6 + Math.random() * 0.8),
        phase: Math.random() * Math.PI * 2,
        bob: 0.05 + Math.random() * 0.08,
        size: 0.05 + Math.random() * 0.06,
      })),
    [count, innerRadius, outerRadius, speed]
  );

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!meshRef.current) return;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.angle += p.speed * delta;
      const x = center[0] + Math.cos(p.angle) * p.radius;
      const z = center[2] + Math.sin(p.angle) * p.radius;
      const y = center[1] + Math.sin(timeRef.current * 0.7 + p.phase) * p.bob;

      dummy.position.set(x, y, z);
      const s = p.size * (1.0 + 0.2 * Math.sin(timeRef.current * 2 + p.phase));
      dummy.scale.setScalar(Math.max(0.01, s));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined as any, undefined as any, particles.length]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} />
    </instancedMesh>
  );
};

export default OrbitSwarm;