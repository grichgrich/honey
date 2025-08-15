// Application configuration

// Server connection settings
export const SERVER_CONFIG = {
  // Set to true to enable WebSocket connection attempts
  ENABLE_WEBSOCKET: true, // Enabled to connect to the backend server
  
  // WebSocket URL - only used if ENABLE_WEBSOCKET is true
  WEBSOCKET_URL: 'ws://localhost:8001/ws',
  
  // API base URL - only used if ENABLE_WEBSOCKET is true
  API_BASE_URL: 'http://localhost:8001',
  
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
