import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface DefenseSystemProps {
  radius: number;
  strength: number;
  active: boolean;
}

const DefenseSystem: React.FC<DefenseSystemProps> = ({
  radius,
  strength,
  active
}) => {
  const shieldRef = useRef<THREE.Mesh>(null);

  // Validate and sanitize inputs
  const safeRadius = Math.max(0.1, isNaN(radius) ? 1.3 : radius);
  const safeStrength = Math.max(0, Math.min(isNaN(strength) ? 1 : strength, 10));

  useFrame((state) => {
    if (shieldRef.current) {
      shieldRef.current.rotation.y += 0.005;
    }
  });

  return (
    <mesh ref={shieldRef}>
      <sphereGeometry args={[safeRadius, 32, 32]} />
      <meshStandardMaterial
        color="#4488ff"
        transparent
        opacity={active ? 0.4 : 0.2}
        emissive="#4488ff"
        emissiveIntensity={active ? 0.3 : 0.1}
        wireframe={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};

export default DefenseSystem;