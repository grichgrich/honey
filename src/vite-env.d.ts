/// <reference types="vite/client" />

interface Window {
  global: Window;
  process: any;
  Buffer: typeof Buffer;
}

declare module 'process/browser' {
  import process from 'process';
  export = process;
}

declare module 'buffer' {
  export const Buffer: typeof global.Buffer;
}