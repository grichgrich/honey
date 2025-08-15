/**
 * WebGL Context Manager - Handles WebGL context loss and restoration
 */

interface WebGLContextManager {
  isContextLost: boolean;
  contextLossCount: number;
  maxRetries: number;
  onContextLost?: () => void;
  onContextRestored?: () => void;
}

class WebGLManager implements WebGLContextManager {
  public isContextLost = false;
  public contextLossCount = 0;
  public maxRetries = 5;
  public onContextLost?: () => void;
  public onContextRestored?: () => void;

  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  private extensions: { [key: string]: any } = {};
  private isInitialized = false;

  initialize(canvas: HTMLCanvasElement): boolean {
    if (this.isInitialized) return true;

    this.canvas = canvas;
    
    try {
      // Try WebGL2 first, fallback to WebGL1
      this.gl = canvas.getContext('webgl2', {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        premultipliedAlpha: false,
        stencil: false,
        depth: true
      }) || canvas.getContext('webgl', {
        antialias: true,
        alpha: false,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: false,
        premultipliedAlpha: false,
        stencil: false,
        depth: true
      });

      if (!this.gl) {
        console.error('WebGL not supported');
        return false;
      }

      this.setupContextHandlers();
      this.loadExtensions();
      this.isInitialized = true;
      
      console.log('WebGL context initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize WebGL context:', error);
      return false;
    }
  }

  private setupContextHandlers(): void {
    if (!this.canvas) return;

    this.canvas.addEventListener('webglcontextlost', (event) => {
      console.warn('WebGL context lost, attempting recovery...');
      event.preventDefault();
      
      this.isContextLost = true;
      this.contextLossCount++;
      
      this.onContextLost?.();
      
      // Attempt to restore context after a delay
      setTimeout(() => {
        this.attemptContextRestore();
      }, 100);
    }, false);

    this.canvas.addEventListener('webglcontextrestored', () => {
      console.log('WebGL context restored');
      this.isContextLost = false;
      
      // Reinitialize resources
      this.loadExtensions();
      this.onContextRestored?.();
    }, false);
  }

  private loadExtensions(): void {
    if (!this.gl) return;

    const commonExtensions = [
      'OES_vertex_array_object',
      'WEBGL_lose_context',
      'EXT_texture_filter_anisotropic',
      'OES_standard_derivatives',
      'EXT_blend_minmax',
      'EXT_shader_texture_lod'
    ];

    this.extensions = {};
    commonExtensions.forEach(name => {
      const ext = this.gl!.getExtension(name);
      if (ext) {
        this.extensions[name] = ext;
      }
    });
  }

  private attemptContextRestore(): void {
    if (this.contextLossCount > this.maxRetries) {
      console.error('Maximum context loss retries exceeded, giving up');
      return;
    }

    // Force context restoration
    const loseContext = this.extensions['WEBGL_lose_context'];
    if (loseContext) {
      try {
        loseContext.restoreContext();
      } catch (error) {
        console.error('Failed to restore WebGL context:', error);
      }
    }
  }

  getContext(): WebGLRenderingContext | WebGL2RenderingContext | null {
    return this.gl;
  }

  getExtension(name: string): any {
    return this.extensions[name];
  }

  dispose(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('webglcontextlost', () => {});
      this.canvas.removeEventListener('webglcontextrestored', () => {});
    }
    
    this.gl = null;
    this.canvas = null;
    this.extensions = {};
    this.isInitialized = false;
  }

  // Performance monitoring
  getContextInfo(): {
    isLost: boolean;
    lossCount: number;
    vendor: string;
    renderer: string;
    version: string;
    extensions: string[];
  } {
    if (!this.gl) {
      return {
        isLost: true,
        lossCount: this.contextLossCount,
        vendor: 'Unknown',
        renderer: 'Unknown',
        version: 'Unknown',
        extensions: []
      };
    }

    return {
      isLost: this.isContextLost,
      lossCount: this.contextLossCount,
      vendor: this.gl.getParameter(this.gl.VENDOR),
      renderer: this.gl.getParameter(this.gl.RENDERER),
      version: this.gl.getParameter(this.gl.VERSION),
      extensions: Object.keys(this.extensions)
    };
  }
}

export const webglManager = new WebGLManager();

// React hook for WebGL management
export const useWebGL = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [isContextLost, setIsContextLost] = React.useState(false);
  const [contextInfo, setContextInfo] = React.useState(webglManager.getContextInfo());

  React.useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    
    // Initialize WebGL manager
    const success = webglManager.initialize(canvas);
    if (!success) {
      console.error('Failed to initialize WebGL');
      return;
    }

    // Set up event handlers
    webglManager.onContextLost = () => {
      setIsContextLost(true);
      setContextInfo(webglManager.getContextInfo());
    };

    webglManager.onContextRestored = () => {
      setIsContextLost(false);
      setContextInfo(webglManager.getContextInfo());
    };

    // Initial context info
    setContextInfo(webglManager.getContextInfo());

    return () => {
      webglManager.dispose();
    };
  }, [canvasRef]);

  return {
    isContextLost,
    contextInfo,
    forceRestore: () => webglManager.attemptContextRestore()
  };
};
