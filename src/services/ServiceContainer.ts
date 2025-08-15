/**
 * Simple Dependency Injection Container for Game Services
 */

type ServiceFactory<T = any> = () => T;
type ServiceInstance<T = any> = T;

export interface IServiceContainer {
  register<T>(token: string, factory: ServiceFactory<T>): void;
  registerSingleton<T>(token: string, factory: ServiceFactory<T>): void;
  get<T>(token: string): T;
  has(token: string): boolean;
  clear(): void;
}

export class ServiceContainer implements IServiceContainer {
  private factories = new Map<string, ServiceFactory>();
  private singletons = new Map<string, ServiceInstance>();
  private instances = new Map<string, ServiceInstance>();

  /**
   * Register a transient service (new instance each time)
   */
  register<T>(token: string, factory: ServiceFactory<T>): void {
    this.factories.set(token, factory);
  }

  /**
   * Register a singleton service (same instance each time)
   */
  registerSingleton<T>(token: string, factory: ServiceFactory<T>): void {
    this.factories.set(token, factory);
    this.singletons.set(token, true);
  }

  /**
   * Get a service instance
   */
  get<T>(token: string): T {
    // Check if it's a singleton and already created
    if (this.singletons.has(token) && this.instances.has(token)) {
      return this.instances.get(token) as T;
    }

    const factory = this.factories.get(token);
    if (!factory) {
      throw new Error(`Service '${token}' not registered. Available services: ${Array.from(this.factories.keys()).join(', ')}`);
    }

    try {
      const instance = factory() as T;
      
      // Store singleton instances
      if (this.singletons.has(token)) {
        this.instances.set(token, instance);
      }

      return instance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to create service '${token}': ${errorMessage}`);
    }
  }

  /**
   * Check if a service is registered
   */
  has(token: string): boolean {
    return this.factories.has(token);
  }

  /**
   * Clear all services (useful for testing)
   */
  clear(): void {
    this.factories.clear();
    this.singletons.clear();
    this.instances.clear();
  }

  /**
   * Get all registered service tokens
   */
  getRegisteredServices(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Create a child container with parent fallback
   */
  createChild(): ServiceContainer {
    const child = new ServiceContainer();
    const originalGet = child.get.bind(child);
    
    child.get = <T>(token: string): T => {
      try {
        return originalGet<T>(token);
      } catch (error) {
        // Fallback to parent container
        return this.get<T>(token);
      }
    };

    return child;
  }
}

// Service tokens (type-safe service identifiers)
export const ServiceTokens = {
  // Core Services
  LEVERAGE_SERVICE: 'LeverageService',
  HONEYCOMB_SERVICE: 'HoneycombService',
  RESOURCE_MANAGER: 'ResourceManager',
  COMBAT_SYSTEM: 'CombatSystem',
  CRAFTING_SYSTEM: 'CraftingSystem',
  TERRITORY_MANAGER: 'TerritoryManager',
  TRAIT_EVOLUTION_SYSTEM: 'TraitEvolutionSystem',
  
  // System Services
  OPTIMIZATION_MANAGER: 'OptimizationManager',
  SAVE_SYSTEM: 'SaveSystem',
  SOUND_SYSTEM: 'SoundSystem',
  ANALYTICS: 'Analytics',
  
  // Utilities
  SECURITY_LOGGER: 'SecurityLogger',
  PERFORMANCE_PROFILER: 'PerformanceProfiler',
  ERROR_HANDLER: 'ErrorHandler',
} as const;

// Global container instance
export const container = new ServiceContainer();

// Service registration helper
export function registerServices(): void {
  // Lazy import to avoid circular dependencies
  
  // Register singleton services
  container.registerSingleton(ServiceTokens.OPTIMIZATION_MANAGER, () => {
    const { optimizationManager } = require('../systems/OptimizationManager');
    return optimizationManager;
  });

  container.registerSingleton(ServiceTokens.SAVE_SYSTEM, () => {
    const { saveSystem } = require('../systems/SaveSystem');
    return saveSystem;
  });

  container.registerSingleton(ServiceTokens.SOUND_SYSTEM, () => {
    const { soundSystem } = require('../systems/SoundSystem');
    return soundSystem;
  });

  container.registerSingleton(ServiceTokens.ANALYTICS, () => {
    const { analytics } = require('../systems/Analytics');
    return analytics;
  });

  container.registerSingleton(ServiceTokens.PERFORMANCE_PROFILER, () => {
    const { profiler } = require('../utils/performanceProfiler');
    return profiler;
  });

  // Register transient services (new instances)
  container.register(ServiceTokens.LEVERAGE_SERVICE, () => {
    const { LeverageServiceOffline } = require('./LeverageServiceOffline');
    return new LeverageServiceOffline();
  });

  container.register(ServiceTokens.HONEYCOMB_SERVICE, () => {
    const { HoneycombService } = require('./honeycomb');
    return new HoneycombService();
  });

  container.register(ServiceTokens.RESOURCE_MANAGER, () => {
    const { ResourceManager } = require('./ResourceManager');
    return new ResourceManager();
  });

  // Combat system with dependencies
  container.register(ServiceTokens.COMBAT_SYSTEM, () => {
    const { CombatSystem } = require('./CombatSystem');
    const leverageService = container.get(ServiceTokens.LEVERAGE_SERVICE);
    const honeycomb = container.get(ServiceTokens.HONEYCOMB_SERVICE);
    const resourceManager = container.get(ServiceTokens.RESOURCE_MANAGER);
    // Note: This is a placeholder - actual CombatSystem constructor may differ
    return new CombatSystem(leverageService, honeycomb, resourceManager, null);
  });

  // Territory manager with dependencies
  container.register(ServiceTokens.TERRITORY_MANAGER, () => {
    const { TerritoryManager } = require('./TerritoryManager');
    const honeycomb = container.get(ServiceTokens.HONEYCOMB_SERVICE);
    const leverageSystem = container.get(ServiceTokens.LEVERAGE_SERVICE);
    return new TerritoryManager(honeycomb, leverageSystem);
  });
}

// React hook for service access
export function useService<T>(token: string): T {
  try {
    return container.get<T>(token);
  } catch (error) {
    console.error(`Failed to get service ${token}:`, error);
    throw error;
  }
}

// Utility for service composition
export function withServices<T extends object>(
  serviceTokens: string[],
  factory: (...services: any[]) => T
): () => T {
  return () => {
    const services = serviceTokens.map(token => container.get(token));
    return factory(...services);
  };
}

// Initialize services on module load
let initialized = false;
export function initializeServices(): void {
  if (initialized) return;
  
  try {
    registerServices();
    initialized = true;
    console.log('Services initialized successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    throw error;
  }
}

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  initializeServices();
}
