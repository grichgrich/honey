import React, { useRef, useMemo, useCallback } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { usePerformanceOptimization } from '../../hooks/usePerformanceOptimization';

interface OptimizedParticleSystemProps {
  count?: number;
  size?: number;
  radius?: number;
  speed?: number;
  color?: string;
  intensity?: number;
  position?: [number, number, number];
  enableLOD?: boolean;
  cameraDistance?: number;
}

const OptimizedParticleSystem: React.FC<OptimizedParticleSystemProps> = ({
  count = 100,
  size = 0.05,
  radius = 1.2,
  speed = 0.2,
  color = "#ffffff",
  intensity = 1,
  position = [0, 0, 0],
  enableLOD = true,
  cameraDistance = 0
}) => {
  const pointsRef = useRef<THREE.Points>(null);
  const timeRef = useRef(0);
  const { calculateLOD, getOptimalParticleCount } = usePerformanceOptimization();

  // Calculate optimal particle count based on performance
  const optimizedCount = useMemo(() => {
    const lodFactor = enableLOD ? calculateLOD(cameraDistance) : 1;
    const baseCount = getOptimalParticleCount(count);
    return Math.max(1, Math.floor(baseCount * lodFactor));
  }, [count, enableLOD, cameraDistance, calculateLOD, getOptimalParticleCount]);

  // Memoize geometry and material
  const { geometry, material } = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(optimizedCount * 3);
    const velocities = new Float32Array(optimizedCount * 3);
    const ages = new Float32Array(optimizedCount);
    const lifespans = new Float32Array(optimizedCount);

    // Initialize particles
    for (let i = 0; i < optimizedCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radiusVariance = radius * (0.8 + Math.random() * 0.4);
      
      positions[i * 3] = Math.cos(angle) * radiusVariance + position[0];
      positions[i * 3 + 1] = Math.sin(angle) * radiusVariance + position[1];
      positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 0.2 + position[2];

      velocities[i * 3] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * speed;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * speed * 0.5;

      ages[i] = 0;
      lifespans[i] = 3 + Math.random() * 2; // 3-5 seconds
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('age', new THREE.BufferAttribute(ages, 1));
    geometry.setAttribute('lifespan', new THREE.BufferAttribute(lifespans, 1));

    const material = new THREE.PointsMaterial({
      size: size,
      color: new THREE.Color(color),
      transparent: true,
      opacity: intensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: false
    });

    return { geometry, material };
  }, [optimizedCount, radius, speed, size, color, intensity, position]);

  // Optimized update function with reduced frequency for distant particles
  const updateParticles = useCallback((delta: number) => {
    if (!pointsRef.current) return;

    const positions = geometry.attributes.position.array as Float32Array;
    const velocities = geometry.attributes.velocity.array as Float32Array;
    const ages = geometry.attributes.age.array as Float32Array;
    const lifespans = geometry.attributes.lifespan.array as Float32Array;

    // Update frequency based on distance (LOD)
    const updateFrequency = enableLOD ? Math.max(0.1, calculateLOD(cameraDistance)) : 1;
    if (Math.random() > updateFrequency) return;

    for (let i = 0; i < optimizedCount; i++) {
      ages[i] += delta;

      if (ages[i] > lifespans[i]) {
        // Reset particle
        const angle = Math.random() * Math.PI * 2;
        const radiusVariance = radius * (0.8 + Math.random() * 0.4);
        
        positions[i * 3] = Math.cos(angle) * radiusVariance + position[0];
        positions[i * 3 + 1] = Math.sin(angle) * radiusVariance + position[1];
        positions[i * 3 + 2] = (Math.random() - 0.5) * radius * 0.2 + position[2];

        velocities[i * 3] = (Math.random() - 0.5) * speed;
        velocities[i * 3 + 1] = (Math.random() - 0.5) * speed;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * speed * 0.5;

        ages[i] = 0;
        lifespans[i] = 3 + Math.random() * 2;
      } else {
        // Update position
        positions[i * 3] += velocities[i * 3] * delta;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * delta;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * delta;

        // Apply gravity/forces
        velocities[i * 3 + 1] -= 0.1 * delta; // Simple gravity
      }
    }

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.age.needsUpdate = true;
  }, [optimizedCount, radius, speed, position, enableLOD, cameraDistance, calculateLOD, geometry]);

  useFrame((state, delta) => {
    timeRef.current += delta;
    
    // Throttle updates for better performance
    if (timeRef.current > 0.016) { // ~60 FPS
      updateParticles(timeRef.current);
      timeRef.current = 0;
    }
  });

  // Don't render if too far away
  if (enableLOD && calculateLOD(cameraDistance) === 0) {
    return null;
  }

  return (
    <points ref={pointsRef} geometry={geometry} material={material} />
  );
};

export default React.memo(OptimizedParticleSystem);
