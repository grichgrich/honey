import * as THREE from 'three';
import { analytics } from './Analytics';
import { optimizationManager } from './OptimizationManager';

interface ResourceMetadata {
  type: 'texture' | 'model' | 'audio' | 'shader';
  size: number;
  lastAccessed: number;
  accessCount: number;
  loadTime: number;
  priority: number;
}

interface CacheConfig {
  maxSize: number;
  maxAge: number;
  priorityThreshold: number;
}

class ResourceManager {
  private static instance: ResourceManager;
  private resourceCache: Map<string, {
    resource: any;
    metadata: ResourceMetadata;
  }> = new Map();

  private loadingPromises: Map<string, Promise<any>> = new Map();
  private preloadQueue: string[] = [];
  private textureAtlases: Map<string, THREE.Texture> = new Map();
  
  private config: CacheConfig = {
    maxSize: 512 * 1024 * 1024, // 512MB
    maxAge: 5 * 60 * 1000, // 5 minutes
    priorityThreshold: 0.7
  };

  private currentCacheSize = 0;
  private isPreloading = false;

  private constructor() {
    this.initializeCache();
    this.startCacheManagement();
  }

  public static getInstance(): ResourceManager {
    if (!ResourceManager.instance) {
      ResourceManager.instance = new ResourceManager();
    }
    return ResourceManager.instance;
  }

  private initializeCache(): void {
    // Initialize IndexedDB for persistent cache
    const request = indexedDB.open('ResourceCache', 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      db.createObjectStore('resources', { keyPath: 'id' });
      db.createObjectStore('metadata', { keyPath: 'id' });
    };

    request.onsuccess = () => {
      this.loadCachedResources(request.result);
    };
  }

  private async loadCachedResources(db: IDBDatabase): Promise<void> {
    const transaction = db.transaction(['resources', 'metadata'], 'readonly');
    const resourceStore = transaction.objectStore('resources');
    const metadataStore = transaction.objectStore('metadata');

    const resourceRequest = resourceStore.getAll();
    const metadataRequest = metadataStore.getAll();

    try {
      const [resources, metadata] = await Promise.all([
        new Promise(resolve => resourceRequest.onsuccess = () => resolve(resourceRequest.result)),
        new Promise(resolve => metadataRequest.onsuccess = () => resolve(metadataRequest.result))
      ]);

      resources.forEach((resource: any, index: number) => {
        this.resourceCache.set(resource.id, {
          resource: resource.data,
          metadata: metadata[index]
        });
        this.currentCacheSize += metadata[index].size;
      });
    } catch (error) {
      console.error('Error loading cached resources:', error);
    }
  }

  private startCacheManagement(): void {
    // Periodic cache cleanup
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Every minute

    // Monitor memory usage
    setInterval(() => {
      this.monitorMemoryUsage();
    }, 10000); // Every 10 seconds
  }

  private cleanupCache(): void {
    const now = Date.now();
    const entries = Array.from(this.resourceCache.entries());
    
    // Sort by priority and last accessed time
    entries.sort(([, a], [, b]) => {
      const scoreA = a.metadata.priority * (now - a.metadata.lastAccessed);
      const scoreB = b.metadata.priority * (now - b.metadata.lastAccessed);
      return scoreA - scoreB;
    });

    // Remove low-priority and old resources until under maxSize
    while (this.currentCacheSize > this.config.maxSize && entries.length > 0) {
      const [key, { metadata }] = entries.shift()!;
      this.resourceCache.delete(key);
      this.currentCacheSize -= metadata.size;
    }
  }

  private monitorMemoryUsage(): void {
    const metrics = optimizationManager.getMetrics();
    if (metrics.memoryUsage > 0.8) {
      // Aggressive cleanup if memory usage is high
      this.config.maxSize *= 0.8;
      this.cleanupCache();
    } else if (metrics.memoryUsage < 0.5) {
      // Increase cache size if memory usage is low
      this.config.maxSize = Math.min(
        this.config.maxSize * 1.2,
        1024 * 1024 * 1024 // 1GB max
      );
    }
  }

  public async preloadResources(resources: string[]): Promise<void> {
    this.preloadQueue.push(...resources);
    
    if (!this.isPreloading) {
      this.isPreloading = true;
      await this.processPreloadQueue();
      this.isPreloading = false;
    }
  }

  private async processPreloadQueue(): Promise<void> {
    const metrics = optimizationManager.getMetrics();
    const batchSize = metrics.fps > 50 ? 5 : metrics.fps > 30 ? 3 : 1;

    while (this.preloadQueue.length > 0) {
      const batch = this.preloadQueue.splice(0, batchSize);
      await Promise.all(batch.map(resource => this.loadResource(resource)));
      
      // Give time for other operations
      await new Promise(resolve => setTimeout(resolve, 16));
    }
  }

  public async loadResource(path: string): Promise<any> {
    // Check cache first
    const cached = this.resourceCache.get(path);
    if (cached) {
      cached.metadata.lastAccessed = Date.now();
      cached.metadata.accessCount++;
      return cached.resource;
    }

    // Check if already loading
    if (this.loadingPromises.has(path)) {
      return this.loadingPromises.get(path);
    }

    // Start loading
    const loadPromise = this.loadResourceFromDisk(path);
    this.loadingPromises.set(path, loadPromise);

    try {
      const resource = await loadPromise;
      this.loadingPromises.delete(path);
      return resource;
    } catch (error) {
      this.loadingPromises.delete(path);
      throw error;
    }
  }

  private async loadResourceFromDisk(path: string): Promise<any> {
    const startTime = performance.now();
    let resource;

    try {
      const extension = path.split('.').pop()?.toLowerCase();
      switch (extension) {
        case 'jpg':
        case 'png':
        case 'webp':
          resource = await this.loadTexture(path);
          break;
        case 'glb':
        case 'gltf':
          resource = await this.loadModel(path);
          break;
        case 'mp3':
        case 'wav':
          resource = await this.loadAudio(path);
          break;
        case 'glsl':
          resource = await this.loadShader(path);
          break;
        default:
          throw new Error(`Unsupported resource type: ${extension}`);
      }

      const loadTime = performance.now() - startTime;
      const size = await this.getResourceSize(resource);

      // Add to cache
      this.resourceCache.set(path, {
        resource,
        metadata: {
          type: this.getResourceType(extension!),
          size,
          lastAccessed: Date.now(),
          accessCount: 1,
          loadTime,
          priority: this.calculatePriority(size, loadTime)
        }
      });

      this.currentCacheSize += size;

      // Track analytics
      analytics.trackEvent('resource', 'load', {
        path,
        loadTime,
        size,
        type: extension
      });

      return resource;

    } catch (error) {
      console.error(`Error loading resource ${path}:`, error);
      throw error;
    }
  }

  private async loadTexture(path: string): Promise<THREE.Texture> {
    // Check if part of an atlas
    const atlas = this.findTextureAtlas(path);
    if (atlas) {
      return this.extractFromAtlas(atlas, path);
    }

    return new Promise((resolve, reject) => {
      new THREE.TextureLoader().load(
        path,
        texture => {
          texture.encoding = THREE.sRGBEncoding;
          texture.needsUpdate = true;
          resolve(texture);
        },
        undefined,
        reject
      );
    });
  }

  private async loadModel(path: string): Promise<THREE.Group> {
    const { GLTFLoader } = await import('@react-three/drei');
    return new Promise((resolve, reject) => {
      new GLTFLoader().load(
        path,
        gltf => resolve(gltf.scene),
        undefined,
        reject
      );
    });
  }

  private async loadAudio(path: string): Promise<AudioBuffer> {
    const response = await fetch(path);
    const arrayBuffer = await response.arrayBuffer();
    const audioContext = new AudioContext();
    return audioContext.decodeAudioData(arrayBuffer);
  }

  private async loadShader(path: string): Promise<string> {
    const response = await fetch(path);
    return response.text();
  }

  private findTextureAtlas(path: string): THREE.Texture | undefined {
    // Check if texture is part of an atlas
    for (const [atlasPath, atlas] of this.textureAtlases) {
      if (path.startsWith(atlasPath)) {
        return atlas;
      }
    }
    return undefined;
  }

  private extractFromAtlas(atlas: THREE.Texture, path: string): THREE.Texture {
    // Extract portion of atlas based on UV coordinates
    // ... implementation
    return atlas;
  }

  private async getResourceSize(resource: any): Promise<number> {
    if (resource instanceof THREE.Texture) {
      return resource.image.width * resource.image.height * 4;
    }
    if (resource instanceof AudioBuffer) {
      return resource.length * resource.numberOfChannels * 4;
    }
    if (typeof resource === 'string') {
      return resource.length * 2;
    }
    // Estimate model size
    return 1024 * 1024; // 1MB default
  }

  private getResourceType(extension: string): ResourceMetadata['type'] {
    const typeMap: Record<string, ResourceMetadata['type']> = {
      jpg: 'texture',
      png: 'texture',
      webp: 'texture',
      glb: 'model',
      gltf: 'model',
      mp3: 'audio',
      wav: 'audio',
      glsl: 'shader'
    };
    return typeMap[extension] || 'texture';
  }

  private calculatePriority(size: number, loadTime: number): number {
    // Higher priority for smaller, faster-loading resources
    const sizeScore = 1 - (size / (100 * 1024 * 1024)); // Normalize to 100MB
    const timeScore = 1 - (loadTime / 5000); // Normalize to 5 seconds
    return (sizeScore + timeScore) / 2;
  }

  // Public API
  public getCacheStats(): {
    size: number;
    count: number;
    hitRate: number;
  } {
    return {
      size: this.currentCacheSize,
      count: this.resourceCache.size,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  public clearCache(): void {
    this.resourceCache.clear();
    this.currentCacheSize = 0;
  }

  public setPriority(path: string, priority: number): void {
    const resource = this.resourceCache.get(path);
    if (resource) {
      resource.metadata.priority = priority;
    }
  }
}

export const resourceManager = ResourceManager.getInstance();