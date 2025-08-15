// Application configuration

// Server connection settings
export const SERVER_CONFIG = {
  // Set to true to enable WebSocket connection attempts
  ENABLE_WEBSOCKET: true, // Enabled to connect to the backend server
  
  // API base URL and WS URL can be injected at build-time via Vite env
  API_BASE_URL: (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL)
    || (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:8001` : 'http://localhost:8001'),
  
  WEBSOCKET_URL: (() => {
    const envWs = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_WS_URL) as string | undefined;
    if (envWs) return envWs;
    const api = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) as string | undefined;
    if (api) {
      try {
        const u = new URL(api);
        const wsScheme = u.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${wsScheme}//${u.host}/ws`;
      } catch {}
    }
    if (typeof window !== 'undefined') {
      return `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:8001/ws`;
    }
    return 'ws://localhost:8001/ws';
  })(),
  
  // Maximum number of reconnection attempts
  MAX_RECONNECT_ATTEMPTS: 1,
  
  // Reconnection delay in milliseconds
  RECONNECT_DELAY_MS: 3000
};

// WebGL settings
export const WEBGL_CONFIG = {
  // Whether to use simple renderer by default in development
  USE_SIMPLE_RENDERER_IN_DEV: true,
  
  // Always use simple renderer to prevent WebGL context issues
  FORCE_SIMPLE_RENDERER: false,
  
  // Maximum allowed WebGL context losses before switching to safe mode
  MAX_CONTEXT_LOSS: 1
};

// Feature flags
export const FEATURES = {
  // Whether to use offline mode for services that would normally require a server
  USE_OFFLINE_SERVICES: false,
  
  // Whether to show performance monitoring tools
  SHOW_PERFORMANCE_TOOLS: false,
  
  // Whether to enable debug logging
  DEBUG_LOGGING: true
};
