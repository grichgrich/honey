import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, Html } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameContext } from '../context/GameContext';
import ParticleSystem from './effects/ParticleSystem';
import HarvestBeam from './effects/HarvestBeam';
import DefenseSystem from './combat/DefenseSystem';

interface TerritoryProps {
  id: string;
  position: [number, number, number];
  scale: number;
  resources: Array<{
    type: string;
    amount: number;
  }>;
  controlled: boolean;
  defense: number;
  onClick?: () => void;
}

const Territory: React.FC<TerritoryProps> = ({
  id,
  position,
  scale,
  resources = [],
  controlled = false,
  defense = 0,
  onClick
}) => {
  const { loading } = useGameContext();
  const meshRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [orbitCount, setOrbitCount] = useState<number>(() => (controlled ? 60 : 25));
  const [gathering, setGathering] = useState<boolean>(false);

  // Validate and sanitize inputs
  const safePosition = position.map(val => isNaN(val) ? 0 : val) as [number, number, number];
  const safeScale = Math.max(0.1, isNaN(scale) ? 1 : scale);
  const safeDefense = Math.max(0, isNaN(defense) ? 0 : defense);

  const getColor = () => {
    if (controlled) return new THREE.Color(0.2, 0.8, 0.4);
    return new THREE.Color(0.2, 0.4, 1.0);
  };

  // Seedlings orbiting the planet (visual idle units)
  const orbitMeshRef = useRef<THREE.InstancedMesh>(null);
  const orbitAngles = useMemo(() => new Array(120).fill(0).map((_, i) => Math.random() * Math.PI * 2), []);
  const orbitHeights = useMemo(() => new Array(120).fill(0).map(() => (Math.random() - 0.5) * 0.2), []);
  const baseOrbitRadius = Math.max(0.4, safeScale * 1.6);
  const orbitColor = controlled ? new THREE.Color('#66ff88') : new THREE.Color('#88aaff');
  const orbitDummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((_, delta) => {
    if (!orbitMeshRef.current) return;
    const visible = Math.max(0, Math.min(orbitCount, 120));
    let idx = 0;
    for (let i = 0; i < visible; i += 1) {
      // Slow rotation and subtle bobbing
      orbitAngles[i] += delta * (controlled ? 0.35 : 0.2);
      const angle = orbitAngles[i];
      const h = orbitHeights[i] + Math.sin(performance.now() * 0.001 + i) * 0.05;
      const currentR = gathering ? baseOrbitRadius * 1.05 : baseOrbitRadius;
      const x = Math.cos(angle) * currentR;
      const z = Math.sin(angle) * currentR;
      orbitDummy.position.set(x, h, z);
      const s = 0.06;
      orbitDummy.scale.set(s, s, s);
      orbitDummy.updateMatrix();
      orbitMeshRef.current.setMatrixAt(idx++, orbitDummy.matrix);
    }
    orbitMeshRef.current.count = visible;
    orbitMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Drain orbiters when a launch happens from this planet
  useEffect(() => {
    const onDrain = (e: any) => {
      const d = e?.detail;
      if (!d) return;
      if (d.planetId !== id) return;
      const amount = Math.max(1, Number(d.count) || 10);
      setOrbitCount(prev => Math.max(0, prev - amount));
      // Restore gradually after a delay
      const restore = setTimeout(() => setOrbitCount(prev => Math.min(120, prev + Math.ceil(amount * 0.7))), 6000);
      return () => clearTimeout(restore);
    };
    const onGather = (e: any) => {
      const d = e?.detail;
      if (!d || d.planetId !== id) return;
      setGathering(true);
      setTimeout(() => setGathering(false), Math.max(400, Number(d.durationMs) || 800));
    };
    window.addEventListener('seedlings-drain', onDrain as EventListener);
    window.addEventListener('seedlings-gather', onGather as EventListener);
    return () => window.removeEventListener('seedlings-drain', onDrain as EventListener);
  }, [id]);

  // Animate orbiters and a subtle halo pulse so ownership is obvious
  useFrame((_, delta) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y += delta * 0.5; // seedlings orbit speed
    }
    if (haloRef.current) {
      const s = 1 + Math.sin(performance.now() * 0.003) * 0.06;
      haloRef.current.scale.setScalar(s);
      (haloRef.current.material as THREE.MeshBasicMaterial).opacity = controlled ? 0.35 + (s - 1) * 1.2 : 0.15;
    }
  });

  return (
    <group position={safePosition}>
      {/* Main territory sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          if (onClick) onClick();
        }}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[safeScale, 32, 32]} />
      
        <meshStandardMaterial
          color={getColor()}
          transparent
          opacity={hovered ? 0.9 : 0.7}
          emissive={getColor()}
          emissiveIntensity={hovered ? 0.3 : 0.1}
          wireframe={!controlled}
        />
      </mesh>

      {/* Territory label */}
      <Text
        position={[0, safeScale * 1.5, 0]}
        fontSize={0.3}
        color={controlled ? "#44ff44" : "#4444ff"}
        anchorX="center"
        anchorY="middle"
      >
        {controlled ? "CONTROLLED" : "UNCLAIMED"}
      </Text>

      {/* Hover info card */}
      {hovered && (
        <Html distanceFactor={8} position={[0, safeScale * 2.2, 0]} center style={{ pointerEvents: 'none' }}>
          <div style={{
            background: 'rgba(0,10,20,0.9)',
            border: '1px solid rgba(100,150,200,0.35)',
            borderRadius: 6,
            padding: '6px 8px',
            color: '#cfe9ff',
            fontSize: 12,
            minWidth: 140
          }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{id}</div>
            <div style={{ opacity: 0.85 }}>Owner: {controlled ? 'You' : 'Unclaimed/Enemy'}</div>
            <div style={{ opacity: 0.85 }}>Defense: {safeDefense}</div>
            <div style={{ opacity: 0.85, marginTop: 4 }}>
              Resources:
              <div>
                {resources && resources.length > 0 ? resources.map((r, i) => (
                  <span key={i} style={{ marginRight: 6 }}>{r.type}: {r.amount}</span>
                )) : ' None'}
              </div>
            </div>
          </div>
        </Html>
      )}

      {/* Ownership halo */}
      <mesh ref={haloRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[safeScale * 1.15, safeScale * 1.35, 48]} />
        <meshBasicMaterial
          color={controlled ? "#44ff44" : "#4477ff"}
          transparent
          opacity={controlled ? 0.35 : 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Planet ID/Name */}
      <Text
        position={[0, safeScale * 1.8, 0]}
        fontSize={0.2}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {id.split('-').pop() || id}
      </Text>

      {/* Resource indicators (seedlings) */}
      <group ref={orbitRef}>
      {resources.map((resource, index) => {
        const angle = (index / Math.max(resources.length, 1)) * Math.PI * 2;
        const orbitRadius = safeScale * 1.5;
        const x = Math.cos(angle) * orbitRadius;
        const y = Math.sin(angle) * orbitRadius;
        
        // Validate position values
        const pos: [number, number, number] = [
          isNaN(x) ? 0 : x,
          isNaN(y) ? 0 : y,
          0
        ];

        return (
          <group key={`${id}-${resource.type}-${index}`} position={pos}>
            <Text
              position={[0, safeScale * 0.3, 0]}
              fontSize={0.2}
              color={hovered ? "#ffffff" : "#aaaaaa"}
              anchorX="center"
              anchorY="middle"
            >
              {`${resource.type}: ${resource.amount}`}
            </Text>
            <mesh>
              <sphereGeometry args={[safeScale * 0.1, 16, 16]} />
              <meshStandardMaterial
                color={hovered ? "#44ff44" : "#4444ff"}
                emissive={hovered ? "#44ff44" : "#4444ff"}
                emissiveIntensity={0.5}
              />
            </mesh>
          </group>
        );
      })}
      </group>

      {/* Orbiting seedlings instanced mesh */}
      <instancedMesh ref={orbitMeshRef} args={[undefined as any, undefined as any, 120] as unknown as any} raycast={null as any}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={orbitColor} transparent opacity={0.9} blending={THREE.AdditiveBlending} />
      </instancedMesh>

      {/* Ambient particle effects */}
      <ParticleSystem
        count={30}
        size={0.05}
        radius={safeScale * 1.2}
        speed={0.2}
        color={controlled ? "#44ff44" : "#4444ff"}
        intensity={hovered ? 2 : 1}
      />

      {/* Harvest beam when active */}
      {hovered && (
        <HarvestBeam
          from={[0, 0, 0]}
          to={[0, safeScale * 2, 0]}
          color={controlled ? "#44ff44" : "#4444ff"}
        />
      )}

      {/* Defense system */}
      {safeDefense > 0 && (
        <DefenseSystem
          radius={safeScale * 1.3}
          strength={safeDefense}
          active={hovered}
        />
      )}

      {/* Loading indicator */}
      {loading && (
        <Text
          position={[0, -safeScale * 1.5, 0]}
          fontSize={0.2}
          color="#ffffff"
          anchorX="center"
          anchorY="middle"
        >
          Loading...
        </Text>
      )}
    </group>
  );
};

export default Territory;