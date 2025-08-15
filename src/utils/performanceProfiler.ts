interface PerformanceProfile {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  memoryStart?: number;
  memoryEnd?: number;
  memoryDelta?: number;
}

class PerformanceProfiler {
  private profiles: Map<string, PerformanceProfile> = new Map();
  private enabled: boolean = process.env.NODE_ENV === 'development';

  enable() {
    this.enabled = true;
  }

  disable() {
    this.enabled = false;
  }

  start(name: string): void {
    if (!this.enabled) return;

    const profile: PerformanceProfile = {
      name,
      startTime: performance.now(),
      memoryStart: this.getMemoryUsage()
    };

    this.profiles.set(name, profile);
  }

  end(name: string): number {
    if (!this.enabled) return 0;

    const profile = this.profiles.get(name);
    if (!profile) {
      console.warn(`Performance profile '${name}' not found`);
      return 0;
    }

    const endTime = performance.now();
    const duration = endTime - profile.startTime;
    const memoryEnd = this.getMemoryUsage();

    profile.endTime = endTime;
    profile.duration = duration;
    profile.memoryEnd = memoryEnd;
    profile.memoryDelta = memoryEnd - (profile.memoryStart || 0);

    return duration;
  }

  measure<T>(name: string, fn: () => T): T {
    if (!this.enabled) return fn();

    this.start(name);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    if (!this.enabled) return fn();

    this.start(name);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  getProfile(name: string): PerformanceProfile | undefined {
    return this.profiles.get(name);
  }

  getAllProfiles(): PerformanceProfile[] {
    return Array.from(this.profiles.values());
  }

  getStats(name: string): { avg: number; min: number; max: number; count: number } | null {
    const profiles = this.getAllProfiles().filter(p => p.name === name && p.duration !== undefined);
    
    if (profiles.length === 0) return null;

    const durations = profiles.map(p => p.duration!);
    return {
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      count: durations.length
    };
  }

  clear(name?: string): void {
    if (name) {
      this.profiles.delete(name);
    } else {
      this.profiles.clear();
    }
  }

  report(): void {
    if (!this.enabled) return;

    console.group('Performance Report');
    
    const profileNames = Array.from(new Set(this.getAllProfiles().map(p => p.name)));
    
    profileNames.forEach(name => {
      const stats = this.getStats(name);
      if (stats) {
        console.log(`${name}:`, {
          average: `${stats.avg.toFixed(2)}ms`,
          min: `${stats.min.toFixed(2)}ms`,
          max: `${stats.max.toFixed(2)}ms`,
          count: stats.count
        });
      }
    });

    console.groupEnd();
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  // Performance markers for React components
  markComponentRender(componentName: string, phase: 'start' | 'end'): void {
    if (!this.enabled) return;
    
    const markName = `${componentName}-render-${phase}`;
    if (phase === 'start') {
      this.start(markName);
    } else {
      this.end(markName);
    }
  }

  // Frame rate monitoring
  private frameCount = 0;
  private lastTime = 0;
  private fpsCallback?: (fps: number) => void;

  startFPSMonitoring(callback: (fps: number) => void): void {
    this.fpsCallback = callback;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.requestFrameCount();
  }

  stopFPSMonitoring(): void {
    this.fpsCallback = undefined;
  }

  private requestFrameCount = (): void => {
    if (!this.fpsCallback) return;

    this.frameCount++;
    const currentTime = performance.now();
    
    if (currentTime - this.lastTime >= 1000) {
      const fps = Math.round((this.frameCount * 1000) / (currentTime - this.lastTime));
      this.fpsCallback(fps);
      this.frameCount = 0;
      this.lastTime = currentTime;
    }

    requestAnimationFrame(this.requestFrameCount);
  };

  // Memory leak detection
  detectMemoryLeaks(): void {
    if (!this.enabled || !('memory' in performance)) return;

    const memory = (performance as any).memory;
    const memoryUsage = memory.usedJSHeapSize;
    const memoryLimit = memory.jsHeapSizeLimit;
    const memoryPercentage = (memoryUsage / memoryLimit) * 100;

    if (memoryPercentage > 90) {
      console.error('Critical memory usage detected:', {
        used: `${(memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memoryLimit / 1024 / 1024).toFixed(2)}MB`,
        percentage: `${memoryPercentage.toFixed(2)}%`
      });
    } else if (memoryPercentage > 75) {
      console.warn('High memory usage detected:', {
        used: `${(memoryUsage / 1024 / 1024).toFixed(2)}MB`,
        limit: `${(memoryLimit / 1024 / 1024).toFixed(2)}MB`,
        percentage: `${memoryPercentage.toFixed(2)}%`
      });
    }
  }
}

export const profiler = new PerformanceProfiler();

// Decorators for easy profiling
export function profile(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const profileName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return profiler.measure(profileName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

export function profileAsync(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const profileName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return profiler.measureAsync(profileName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

// React hooks for profiling
export const useProfiler = () => {
  return {
    start: profiler.start.bind(profiler),
    end: profiler.end.bind(profiler),
    measure: profiler.measure.bind(profiler),
    measureAsync: profiler.measureAsync.bind(profiler),
    getStats: profiler.getStats.bind(profiler),
    clear: profiler.clear.bind(profiler),
    report: profiler.report.bind(profiler)
  };
};
