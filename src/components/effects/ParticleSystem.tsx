import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface ParticleSystemProps {
  count?: number;
  size?: number;
  radius?: number;
  speed?: number;
  color?: string;
  intensity?: number;
}

const ParticleSystem: React.FC<ParticleSystemProps> = ({
  count = 50,
  size = 0.05,
  radius = 1.2,
  speed = 0.2,
  color = "#ffffff",
  intensity = 1
}) => {
  const points = useRef<THREE.Points>(null);
  
  // Validate and sanitize inputs
  const safeCount = Math.max(1, Math.min(count || 50, 1000));
  const safeSize = Math.max(0.01, size || 0.05);
  const safeRadius = Math.max(0.1, radius || 1.2);
  const safeSpeed = Math.max(0.01, speed || 0.2);
  const safeIntensity = Math.max(0.1, Math.min(intensity || 1, 2));

  const { positions, velocities } = useMemo(() => {
    const positions = new Float32Array(safeCount * 3);
    const velocities = new Float32Array(safeCount * 3);

    // Initialize particle positions and velocities with validation
    for (let i = 0; i < safeCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusVariance = safeRadius * (0.8 + Math.random() * 0.4);
      
      // Ensure no NaN values
      const x = Math.cos(angle) * radiusVariance;
      const y = Math.sin(angle) * radiusVariance;
      const z = (Math.random() - 0.5) * safeRadius * 0.2;
      
      positions[i * 3] = isNaN(x) ? 0 : x;
      positions[i * 3 + 1] = isNaN(y) ? 0 : y;
      positions[i * 3 + 2] = isNaN(z) ? 0 : z;

      const vx = (Math.random() - 0.5) * safeSpeed;
      const vy = (Math.random() - 0.5) * safeSpeed;
      const vz = (Math.random() - 0.5) * safeSpeed;

      velocities[i * 3] = isNaN(vx) ? 0 : vx;
      velocities[i * 3 + 1] = isNaN(vy) ? 0 : vy;
      velocities[i * 3 + 2] = isNaN(vz) ? 0 : vz;
    }

    return { positions, velocities };
  }, [safeCount, safeRadius, safeSpeed]);

  useFrame((state, delta) => {
    if (!points.current?.geometry?.attributes?.position) return;

    const positions = points.current.geometry.attributes.position.array as Float32Array;
    const safeDelta = Math.min(delta, 0.1); // Limit delta to prevent large jumps
    
    for (let i = 0; i < safeCount; i++) {
      const i3 = i * 3;

      // Update positions with validation
      let newX = positions[i3] + velocities[i3] * safeDelta;
      let newY = positions[i3 + 1] + velocities[i3 + 1] * safeDelta;
      let newZ = positions[i3 + 2] + velocities[i3 + 2] * safeDelta;

      // Validate for NaN
      if (isNaN(newX)) newX = 0;
      if (isNaN(newY)) newY = 0;
      if (isNaN(newZ)) newZ = 0;

      positions[i3] = newX;
      positions[i3 + 1] = newY;
      positions[i3 + 2] = newZ;

      // Keep particles within bounds
      const distance = Math.sqrt(newX * newX + newY * newY + newZ * newZ);

      if (distance > safeRadius && distance > 0) {
        const scale = safeRadius / distance;
        positions[i3] *= scale;
        positions[i3 + 1] *= scale;
        positions[i3 + 2] *= scale;
      }
    }

    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={safeCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={safeSize}
        color={color}
        transparent
        opacity={0.6 * safeIntensity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        sizeAttenuation={true}
      />
    </points>
  );
};

export default ParticleSystem;