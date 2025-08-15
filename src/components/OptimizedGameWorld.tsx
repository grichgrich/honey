import React, { useRef, Suspense, useState, useEffect, useMemo, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Stars, OrbitControls, Environment } from '@react-three/drei';
import { useGameContext } from '../context/GameContext';
import Territory from './Territory';
import Resource from './Resource';
import { useFrame, useThree } from '@react-three/fiber';
import OptimizedParticleSystem from './effects/OptimizedParticleSystem';
import * as THREE from 'three';
import { usePerformanceOptimization, useMemoryMonitor, useRenderOptimization } from '../hooks/usePerformanceOptimization';

// Memoized components for better performance
const MemoizedTerritory = React.memo(Territory);
const MemoizedResource = React.memo(Resource);
const MemoizedStars = React.memo(Stars);

interface OptimizedGameWorldProps {
  className?: string;
  maxRenderDistance?: number;
  enableDynamicQuality?: boolean;
}

const CameraController: React.FC = () => {
  const { camera } = useThree();
  const cameraPosition = useRef(new THREE.Vector3());
  
  useFrame(() => {
    // Cache camera position for LOD calculations
    cameraPosition.current.copy(camera.position);
  });

  return null;
};

const PerformanceMonitor: React.FC<{ onDistanceChange: (distance: number) => void }> = ({ onDistanceChange }) => {
  const { camera } = useThree();
  const { getMemoryPercentage } = useMemoryMonitor();
  const lastDistance = useRef(0);

  useFrame(() => {
    const distance = camera.position.length();
    
    // Only update if distance changed significantly
    if (Math.abs(distance - lastDistance.current) > 1) {
      lastDistance.current = distance;
      onDistanceChange(distance);
    }

    // Memory monitoring
    const memoryUsage = getMemoryPercentage();
    if (memoryUsage > 85) {
      console.warn('High memory usage detected:', memoryUsage + '%');
    }
  });

  return null;
};

const OptimizedGameWorld: React.FC<OptimizedGameWorldProps> = ({
  className = "game-world",
  maxRenderDistance = 1000,
  enableDynamicQuality = true
}) => {
  const {
    territories,
    resources,
    activeCharacter,
    isLoading
  } = useGameContext();

  const [cameraDistance, setCameraDistance] = useState(0);
  const [visibleTerritories, setVisibleTerritories] = useState(territories);
  const [visibleResources, setVisibleResources] = useState(resources);

  const { calculateLOD, shouldBatch } = usePerformanceOptimization({
    maxRenderDistance,
    enableLOD: true,
    enableBatching: true,
    targetFPS: 60
  });

  const { shouldRender, requestRender } = useRenderOptimization();

  // Frustum culling and distance-based filtering
  const updateVisibleObjects = useCallback((distance: number) => {
    if (!shouldBatch) {
      // Real-time updates
      setVisibleTerritories(territories.filter(territory => {
        if (!territory.position) return true;
        const distToTerritory = Math.sqrt(
          Math.pow(territory.position.x, 2) + 
          Math.pow(territory.position.z, 2)
        );
        return distToTerritory <= maxRenderDistance;
      }));

      setVisibleResources(resources.filter(resource => {
        if (!resource.position) return true;
        const distToResource = Math.sqrt(
          Math.pow(resource.position.x, 2) + 
          Math.pow(resource.position.z, 2)
        );
        return distToResource <= maxRenderDistance;
      }));
    }
  }, [territories, resources, maxRenderDistance, shouldBatch]);

  // Batched updates for better performance
  useEffect(() => {
    if (shouldBatch) {
      const timeout = setTimeout(() => {
        updateVisibleObjects(cameraDistance);
      }, 100); // Batch updates every 100ms

      return () => clearTimeout(timeout);
    } else {
      updateVisibleObjects(cameraDistance);
    }
  }, [cameraDistance, shouldBatch, updateVisibleObjects]);

  // Memoized render lists
  const renderedTerritories = useMemo(() => {
    return visibleTerritories.map((territory) => (
      <MemoizedTerritory
        key={territory.id}
        territory={territory}
        cameraDistance={cameraDistance}
        enableLOD={enableDynamicQuality}
      />
    ));
  }, [visibleTerritories, cameraDistance, enableDynamicQuality]);

  const renderedResources = useMemo(() => {
    return visibleResources.map((resource) => (
      <MemoizedResource
        key={resource.id}
        resource={resource}
        cameraDistance={cameraDistance}
        enableLOD={enableDynamicQuality}
      />
    ));
  }, [visibleResources, cameraDistance, enableDynamicQuality]);

  // Environment optimization
  const environmentSettings = useMemo(() => {
    const lodLevel = calculateLOD(cameraDistance);
    
    return {
      background: lodLevel > 0.5,
      environment: lodLevel > 0.3,
      shadows: lodLevel > 0.7
    };
  }, [cameraDistance, calculateLOD]);

  const canvasSettings = useMemo(() => {
    return {
      shadows: environmentSettings.shadows,
      camera: { 
        position: [0, 10, 10],
        fov: 60,
        near: 0.1,
        far: maxRenderDistance * 1.5
      },
      gl: {
        antialias: cameraDistance < 50, // Disable AA when far away
        alpha: false,
        powerPreference: "high-performance" as const,
        stencil: false,
        depth: true
      },
      dpr: Math.min(window.devicePixelRatio, cameraDistance < 100 ? 2 : 1),
      performance: {
        min: 0.5, // Minimum framerate before quality reduction
        max: 1.0  // Maximum quality
      }
    };
  }, [environmentSettings.shadows, maxRenderDistance, cameraDistance]);

  if (isLoading) {
    return (
      <div className={className} style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        height: '100vh',
        background: '#000'
      }}>
        <div style={{ color: 'white', fontSize: '18px' }}>Loading game world...</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas {...canvasSettings}>
        <CameraController />
        <PerformanceMonitor onDistanceChange={setCameraDistance} />
        
        <Suspense fallback={null}>
          {/* Conditional environment rendering based on performance */}
          {environmentSettings.background && <color attach="background" args={['#000']} />}
          {environmentSettings.environment && <Environment preset="night" />}
          
          {/* Optimized lighting */}
          <ambientLight intensity={0.4} />
          <directionalLight 
            position={[10, 10, 5]} 
            intensity={0.8}
            castShadow={environmentSettings.shadows}
            shadow-mapSize-width={environmentSettings.shadows ? 2048 : 512}
            shadow-mapSize-height={environmentSettings.shadows ? 2048 : 512}
          />

          {/* Rendered game objects */}
          {renderedTerritories}
          {renderedResources}
          
          {/* Optimized particle system */}
          <OptimizedParticleSystem
            count={calculateLOD(cameraDistance) * 200}
            cameraDistance={cameraDistance}
            enableLOD={enableDynamicQuality}
          />

          {/* Conditional stars rendering */}
          {environmentSettings.background && (
            <MemoizedStars 
              radius={100} 
              depth={50} 
              count={Math.floor(calculateLOD(cameraDistance) * 1000)}
              factor={4} 
              saturation={0} 
              fade={true}
            />
          )}

          <OrbitControls 
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            zoomSpeed={0.6}
            panSpeed={0.8}
            rotateSpeed={0.4}
            maxDistance={maxRenderDistance}
            minDistance={5}
            maxPolarAngle={Math.PI * 0.75}
            onEnd={() => requestRender(true)}
          />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default React.memo(OptimizedGameWorld);
