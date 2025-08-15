import { useState, useEffect, useCallback, useMemo } from 'react';
import { optimizationManager } from '../systems/OptimizationManager';
import { leverageSystem } from '../systems/LeverageSystem';

export interface OptimizationHookResult {
  metrics: {
    fps: number;
    frameTime: number;
    memoryUsage: number;
    networkLatency: number;
  };
  state: {
    graphicsQuality: 'low' | 'medium' | 'high' | 'ultra';
    particleCount: number;
    renderDistance: number;
    shadowQuality: 'off' | 'low' | 'high';
    textureQuality: 'low' | 'medium' | 'high';
    antiAliasing: boolean;
    useOcclusionCulling: boolean;
    useLevelOfDetail: boolean;
    useInstancedMeshes: boolean;
    batchedUpdates: boolean;
  };
  recommendations: {
    type: 'performance' | 'memory' | 'network';
    message: string;
    impact: 'low' | 'medium' | 'high';
    action?: () => void;
  }[];
  setQualityPreset: (preset: 'low' | 'medium' | 'high' | 'ultra') => void;
  forceOptimization: () => void;
}

export function useOptimization(): OptimizationHookResult {
  const [metrics, setMetrics] = useState(optimizationManager.getMetrics());
  const [state, setState] = useState(optimizationManager.getState());
  const [recommendations, setRecommendations] = useState<OptimizationHookResult['recommendations']>([]);

  // Update metrics and state
  useEffect(() => {
    const updateInterval = setInterval(() => {
      setMetrics(optimizationManager.getMetrics());
      setState(optimizationManager.getState());
    }, 1000);

    const handleOptimizationUpdate = (event: CustomEvent) => {
      setState(event.detail);
    };

    window.addEventListener('optimizationUpdate', handleOptimizationUpdate as EventListener);

    return () => {
      clearInterval(updateInterval);
      window.removeEventListener('optimizationUpdate', handleOptimizationUpdate as EventListener);
    };
  }, []);

  // Generate recommendations based on current metrics and leverage system
  useEffect(() => {
    const newRecommendations: OptimizationHookResult['recommendations'] = [];
    const leverageMultiplier = leverageSystem.getCurrentMultiplier();

    // Performance recommendations
    if (metrics.fps < 30) {
      newRecommendations.push({
        type: 'performance',
        message: 'Low FPS detected. Consider lowering graphics quality.',
        impact: 'high',
        action: () => optimizationManager.setQualityPreset('low')
      });
    } else if (metrics.fps < 60) {
      newRecommendations.push({
        type: 'performance',
        message: 'Sub-optimal FPS. Consider medium graphics preset.',
        impact: 'medium',
        action: () => optimizationManager.setQualityPreset('medium')
      });
    }

    // Memory recommendations
    if (metrics.memoryUsage > 0.8) {
      newRecommendations.push({
        type: 'memory',
        message: 'High memory usage. Cleaning up resources.',
        impact: 'high'
      });
    }

    // Network recommendations
    if (metrics.networkLatency > 200) {
      newRecommendations.push({
        type: 'network',
        message: 'High network latency detected.',
        impact: 'medium'
      });
    }

    // Leverage system recommendations
    if (leverageMultiplier && leverageMultiplier.total > 2) {
      newRecommendations.push({
        type: 'performance',
        message: 'High leverage multiplier achieved. Enhancing visual effects.',
        impact: 'low',
        action: () => optimizationManager.setQualityPreset('ultra')
      });
    }

    setRecommendations(newRecommendations);
  }, [metrics, state]);

  // Memoized functions
  const setQualityPreset = useCallback((preset: 'low' | 'medium' | 'high' | 'ultra') => {
    optimizationManager.setQualityPreset(preset);
  }, []);

  const forceOptimization = useCallback(() => {
    optimizationManager.forceOptimizationPass();
  }, []);

  return useMemo(() => ({
    metrics,
    state,
    recommendations,
    setQualityPreset,
    forceOptimization
  }), [metrics, state, recommendations, setQualityPreset, forceOptimization]);
}

// Custom hook for optimizing specific components
export function useComponentOptimization(componentId: string) {
  const shouldRender = useMemo(() => {
    const state = optimizationManager.getState();
    const metrics = optimizationManager.getMetrics();

    // Determine if component should render based on performance metrics
    if (metrics.fps < 30) {
      return componentId === 'critical';
    }

    return true;
  }, [componentId]);

  const optimizedProps = useMemo(() => {
    const state = optimizationManager.getState();
    const leverageMultiplier = leverageSystem.getCurrentMultiplier();

    return {
      particleCount: Math.floor(state.particleCount * (leverageMultiplier?.total || 1)),
      renderDistance: state.renderDistance,
      quality: state.graphicsQuality,
      shadows: state.shadowQuality !== 'off',
      antiAliasing: state.antiAliasing
    };
  }, []);

  return {
    shouldRender,
    optimizedProps
  };
}