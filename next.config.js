/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    // Enable build cache
    turbotrace: {
      logLevel: 'error',
      memoryLimit: 4096,
    },
    // Enable server components
    serverComponents: true,
    // Enable concurrent features
    concurrentFeatures: true,
  },
  // Configure logging
  logging: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  },
  // Configure build output
  output: 'standalone',
  // Configure build cache
  distDir: process.env.BUILD_DIR || '.next',
  // Configure build optimization
  swcMinify: true,
  // Configure module resolution
  modularizeImports: {
    '@walletconnect/universal-provider': {
      transform: '@walletconnect/universal-provider/dist/esm/index.js',
    },
    '@walletconnect/solana-adapter': {
      transform: '@walletconnect/solana-adapter/dist/esm/index.js',
    },
  },
};

module.exports = nextConfig;