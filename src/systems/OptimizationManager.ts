import * as THREE from 'three';
import { analytics } from './Analytics';
import { leverageSystem } from './LeverageSystem';

interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  networkLatency: number;
  lastUpdate: number;
}

interface OptimizationState {
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
}

class OptimizationManager {
  private static instance: OptimizationManager;
  private metrics: PerformanceMetrics = {
    fps: 60,
    frameTime: 16.67,
    memoryUsage: 0,
    networkLatency: 0,
    lastUpdate: Date.now()
  };

  private state: OptimizationState = {
    graphicsQuality: 'high',
    particleCount: 1000,
    renderDistance: 1000,
    shadowQuality: 'high',
    textureQuality: 'high',
    antiAliasing: true,
    useOcclusionCulling: true,
    useLevelOfDetail: true,
    useInstancedMeshes: true,
    batchedUpdates: true
  };

  private frameTimeHistory: number[] = [];
  private readonly TARGET_FPS = 60;
  private readonly MIN_FPS = 30;
  private readonly FRAME_HISTORY_SIZE = 60;
  private readonly UPDATE_INTERVAL = 1000; // 1 second

  private constructor() {
    this.initializeOptimizations();
  }

  public static getInstance(): OptimizationManager {
    if (!OptimizationManager.instance) {
      OptimizationManager.instance = new OptimizationManager();
    }
    return OptimizationManager.instance;
  }

  private initializeOptimizations(): void {
    // Set up performance monitoring
    this.setupPerformanceMonitoring();

    // Initialize WebGL context optimizations
    this.initializeWebGLOptimizations();

    // Set up network optimization
    this.setupNetworkOptimization();

    // Initialize memory management
    this.initializeMemoryManagement();

    // Start the optimization loop
    this.startOptimizationLoop();
  }

  private setupPerformanceMonitoring(): void {
    let lastTime = performance.now();
    let frames = 0;

    const measurePerformance = () => {
      const now = performance.now();
      const delta = now - lastTime;
      frames++;

      if (delta >= 1000) {
        const fps = Math.round((frames * 1000) / delta);
        const frameTime = delta / frames;

        this.updateMetrics({
          fps,
          frameTime,
          memoryUsage: this.getMemoryUsage(),
          networkLatency: this.metrics.networkLatency,
          lastUpdate: Date.now()
        });

        frames = 0;
        lastTime = now;
      }

      requestAnimationFrame(measurePerformance);
    };

    requestAnimationFrame(measurePerformance);
  }

  private initializeWebGLOptimizations(): void {
    // Set up WebGL context with optimized parameters
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const gl = canvas.getContext('webgl2', {
        powerPreference: 'high-performance',
        antialias: this.state.antiAliasing,
        depth: true,
        stencil: true,
        alpha: false, // Disable alpha for better performance
        premultipliedAlpha: false,
        preserveDrawingBuffer: false,
        desynchronized: true
      });

      if (gl) {
        // Enable extensions for better performance
        gl.getExtension('EXT_texture_filter_anisotropic');
        gl.getExtension('OES_texture_float');
        gl.getExtension('WEBGL_compressed_texture_s3tc');
      }
    }
  }

  private setupNetworkOptimization(): void {
    // Measure network latency
    setInterval(() => {
      const start = performance.now();
      fetch('/api/ping')
        .then(() => {
          const latency = performance.now() - start;
          this.metrics.networkLatency = latency;
        })
        .catch(() => {
          // Handle error
        });
    }, 5000);
  }

  private initializeMemoryManagement(): void {
    // Set up memory monitoring
    setInterval(() => {
      this.metrics.memoryUsage = this.getMemoryUsage();
      this.cleanupUnusedResources();
    }, 10000);
  }

  private startOptimizationLoop(): void {
    setInterval(() => {
      this.optimizePerformance();
    }, this.UPDATE_INTERVAL);
  }

  private updateMetrics(newMetrics: PerformanceMetrics): void {
    this.metrics = newMetrics;
    this.frameTimeHistory.push(newMetrics.frameTime);
    if (this.frameTimeHistory.length > this.FRAME_HISTORY_SIZE) {
      this.frameTimeHistory.shift();
    }

    // Track performance metrics
    analytics.trackEvent('performance', 'metrics', {
      fps: newMetrics.fps,
      frameTime: newMetrics.frameTime,
      memoryUsage: newMetrics.memoryUsage,
      networkLatency: newMetrics.networkLatency
    });
  }

  private optimizePerformance(): void {
    const averageFPS = this.metrics.fps;
    const averageFrameTime = this.getAverageFrameTime();
    const currentLeverageMultiplier = leverageSystem.getCurrentMultiplier();

    // Adjust settings based on performance metrics
    if (averageFPS < this.MIN_FPS) {
      this.applyLowPerformanceOptimizations();
    } else if (averageFPS < this.TARGET_FPS) {
      this.applyMediumPerformanceOptimizations();
    } else if (this.metrics.memoryUsage > 0.8) {
      this.applyMemoryOptimizations();
    }

    // Adjust particle effects based on leverage multiplier
    if (currentLeverageMultiplier) {
      this.adjustParticleEffects(currentLeverageMultiplier.total);
    }

    // Update optimization state
    this.updateOptimizationState();
  }

  private applyLowPerformanceOptimizations(): void {
    this.state = {
      ...this.state,
      graphicsQuality: 'low',
      particleCount: 200,
      renderDistance: 500,
      shadowQuality: 'off',
      textureQuality: 'low',
      antiAliasing: false
    };
  }

  private applyMediumPerformanceOptimizations(): void {
    this.state = {
      ...this.state,
      graphicsQuality: 'medium',
      particleCount: 500,
      renderDistance: 750,
      shadowQuality: 'low',
      textureQuality: 'medium',
      antiAliasing: true
    };
  }

  private applyMemoryOptimizations(): void {
    this.cleanupUnusedResources();
    this.state.textureQuality = 'medium';
    this.state.particleCount = Math.floor(this.state.particleCount * 0.8);
  }

  private adjustParticleEffects(leverageMultiplier: number): void {
    // Scale particle effects with leverage multiplier
    const baseParticleCount = this.state.graphicsQuality === 'high' ? 1000 : 500;
    this.state.particleCount = Math.floor(baseParticleCount * leverageMultiplier);
  }

  private getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeHistory.length;
  }

  private getMemoryUsage(): number {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit;
    }
    return 0;
  }

  private cleanupUnusedResources(): void {
    // Clear texture cache
    THREE.Cache.clear();
    
    // Clear any disposed geometries and materials
    if (window.__THREE_DEVTOOLS__) {
      window.__THREE_DEVTOOLS__.disposeUnusedObjects();
    }

    // Force garbage collection if available
    if (window.gc) {
      window.gc();
    }
  }

  private updateOptimizationState(): void {
    // Emit optimization state changes
    const event = new CustomEvent('optimizationUpdate', {
      detail: this.state
    });
    window.dispatchEvent(event);

    // Track optimization changes
    analytics.trackEvent('optimization', 'state_update', this.state);
  }

  // Public API
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getState(): OptimizationState {
    return { ...this.state };
  }

  public forceOptimizationPass(): void {
    this.optimizePerformance();
  }

  public setQualityPreset(preset: 'low' | 'medium' | 'high' | 'ultra'): void {
    switch (preset) {
      case 'ultra':
        this.state = {
          ...this.state,
          graphicsQuality: 'ultra',
          particleCount: 2000,
          renderDistance: 1500,
          shadowQuality: 'high',
          textureQuality: 'high',
          antiAliasing: true,
          useOcclusionCulling: true,
          useLevelOfDetail: true,
          useInstancedMeshes: true,
          batchedUpdates: true
        };
        break;
      case 'high':
        this.state = {
          ...this.state,
          graphicsQuality: 'high',
          particleCount: 1000,
          renderDistance: 1000,
          shadowQuality: 'high',
          textureQuality: 'high',
          antiAliasing: true,
          useOcclusionCulling: true,
          useLevelOfDetail: true,
          useInstancedMeshes: true,
          batchedUpdates: true
        };
        break;
      case 'medium':
        this.state = {
          ...this.state,
          graphicsQuality: 'medium',
          particleCount: 500,
          renderDistance: 750,
          shadowQuality: 'low',
          textureQuality: 'medium',
          antiAliasing: true,
          useOcclusionCulling: true,
          useLevelOfDetail: true,
          useInstancedMeshes: true,
          batchedUpdates: true
        };
        break;
      case 'low':
        this.state = {
          ...this.state,
          graphicsQuality: 'low',
          particleCount: 200,
          renderDistance: 500,
          shadowQuality: 'off',
          textureQuality: 'low',
          antiAliasing: false,
          useOcclusionCulling: true,
          useLevelOfDetail: true,
          useInstancedMeshes: true,
          batchedUpdates: true
        };
        break;
    }
    this.updateOptimizationState();
  }

  // Public methods for external quality control
  degradeQuality(): void {
    const currentIndex = ['low', 'medium', 'high', 'ultra'].indexOf(this.state.graphicsQuality);
    if (currentIndex > 0) {
      const qualities = ['low', 'medium', 'high', 'ultra'] as const;
      this.state.graphicsQuality = qualities[currentIndex - 1];
      this.applyQualitySettings();
    }
  }

  improveQuality(): void {
    const currentIndex = ['low', 'medium', 'high', 'ultra'].indexOf(this.state.graphicsQuality);
    if (currentIndex < 3) {
      const qualities = ['low', 'medium', 'high', 'ultra'] as const;
      this.state.graphicsQuality = qualities[currentIndex + 1];
      this.applyQualitySettings();
    }
  }

  private applyQualitySettings(): void {
    // Apply quality settings based on current state
    switch (this.state.graphicsQuality) {
      case 'low':
        this.state.particleCount = 250;
        this.state.renderDistance = 500;
        this.state.shadowQuality = 'off';
        this.state.textureQuality = 'low';
        this.state.antiAliasing = false;
        break;
      case 'medium':
        this.state.particleCount = 500;
        this.state.renderDistance = 750;
        this.state.shadowQuality = 'low';
        this.state.textureQuality = 'medium';
        this.state.antiAliasing = false;
        break;
      case 'high':
        this.state.particleCount = 1000;
        this.state.renderDistance = 1000;
        this.state.shadowQuality = 'high';
        this.state.textureQuality = 'high';
        this.state.antiAliasing = true;
        break;
      case 'ultra':
        this.state.particleCount = 2000;
        this.state.renderDistance = 1500;
        this.state.shadowQuality = 'high';
        this.state.textureQuality = 'high';
        this.state.antiAliasing = true;
        break;
    }
  }
}

export const optimizationManager = OptimizationManager.getInstance();

// Add type definitions for global objects
declare global {
  interface Performance {
    memory?: {
      usedJSHeapSize: number;
      jsHeapSizeLimit: number;
    };
  }

  interface Window {
    __THREE_DEVTOOLS__?: {
      disposeUnusedObjects: () => void;
    };
    gc?: () => void;
  }
}