import { useEffect, useCallback, useRef, useMemo } from 'react';
import { optimizationManager } from '../systems/OptimizationManager';

interface PerformanceConfig {
  maxRenderDistance?: number;
  maxParticleCount?: number;
  enableLOD?: boolean;
  enableBatching?: boolean;
  targetFPS?: number;
}

export const usePerformanceOptimization = (config: PerformanceConfig = {}) => {
  const frameCount = useRef(0);
  const lastTime = useRef(performance.now());
  const fpsHistory = useRef<number[]>([]);

  const {
    maxRenderDistance = 1000,
    maxParticleCount = 500,
    enableLOD = true,
    enableBatching = true,
    targetFPS = 60
  } = config;

  // FPS monitoring and adaptive quality
  const monitorPerformance = useCallback(() => {
    frameCount.current++;
    const now = performance.now();
    const delta = now - lastTime.current;

    if (delta >= 1000) { // Update every second
      const fps = Math.round((frameCount.current * 1000) / delta);
      fpsHistory.current.push(fps);
      
      // Keep only last 10 measurements
      if (fpsHistory.current.length > 10) {
        fpsHistory.current.shift();
      }

      // Calculate average FPS
      const avgFPS = fpsHistory.current.reduce((a, b) => a + b, 0) / fpsHistory.current.length;

      // Auto-adjust quality based on performance
      if (avgFPS < targetFPS * 0.8) {
        optimizationManager.degradeQuality();
      } else if (avgFPS > targetFPS * 0.95) {
        optimizationManager.improveQuality();
      }

      frameCount.current = 0;
      lastTime.current = now;
    }
  }, [targetFPS]);

  // Memory management
  const clearUnusedResources = useCallback(() => {
    // Clear unused textures and geometries
    if (typeof window !== 'undefined' && (window as any).THREE) {
      const THREE = (window as any).THREE;
      THREE.Cache.clear();
    }

    // Force garbage collection if available
    if (typeof window !== 'undefined' && (window as any).gc) {
      (window as any).gc();
    }
  }, []);

  // Distance-based LOD calculation
  const calculateLOD = useCallback((distance: number) => {
    if (!enableLOD) return 1;
    
    if (distance < maxRenderDistance * 0.3) return 1; // Full detail
    if (distance < maxRenderDistance * 0.6) return 0.5; // Half detail
    if (distance < maxRenderDistance) return 0.25; // Quarter detail
    return 0; // Cull
  }, [enableLOD, maxRenderDistance]);

  // Particle count adjustment
  const getOptimalParticleCount = useCallback((baseCount: number) => {
    const quality = optimizationManager.getState().graphicsQuality;
    const multipliers = {
      low: 0.25,
      medium: 0.5,
      high: 0.75,
      ultra: 1.0
    };
    
    return Math.min(
      Math.floor(baseCount * multipliers[quality]),
      maxParticleCount
    );
  }, [maxParticleCount]);

  // Batching utility
  const shouldBatch = useMemo(() => {
    return enableBatching && optimizationManager.getState().batchedUpdates;
  }, [enableBatching]);

  useEffect(() => {
    const interval = setInterval(monitorPerformance, 100);
    const cleanupInterval = setInterval(clearUnusedResources, 30000); // Every 30 seconds

    return () => {
      clearInterval(interval);
      clearInterval(cleanupInterval);
    };
  }, [monitorPerformance, clearUnusedResources]);

  return {
    calculateLOD,
    getOptimalParticleCount,
    shouldBatch,
    clearUnusedResources,
    monitorPerformance
  };
};

// Hook for memory monitoring
export const useMemoryMonitor = () => {
  const memoryInfo = useRef<MemoryInfo | null>(null);

  const updateMemoryInfo = useCallback(() => {
    if ('memory' in performance) {
      memoryInfo.current = (performance as any).memory;
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMemoryInfo, 5000);
    return () => clearInterval(interval);
  }, [updateMemoryInfo]);

  return {
    getMemoryUsage: () => memoryInfo.current?.usedJSHeapSize || 0,
    getMemoryLimit: () => memoryInfo.current?.jsHeapSizeLimit || 0,
    getMemoryPercentage: () => {
      if (!memoryInfo.current) return 0;
      return (memoryInfo.current.usedJSHeapSize / memoryInfo.current.jsHeapSizeLimit) * 100;
    }
  };
};

// Hook for render optimization
export const useRenderOptimization = () => {
  const shouldRender = useRef(true);
  const lastRenderTime = useRef(0);

  const requestRender = useCallback((force = false) => {
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTime.current;
    
    // Throttle renders to max 60 FPS unless forced
    if (force || timeSinceLastRender >= 16.67) {
      shouldRender.current = true;
      lastRenderTime.current = now;
      return true;
    }
    
    return false;
  }, []);

  const markRendered = useCallback(() => {
    shouldRender.current = false;
  }, []);

  return {
    shouldRender: shouldRender.current,
    requestRender,
    markRendered
  };
};
