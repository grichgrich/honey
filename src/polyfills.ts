import { Buffer } from 'buffer';
import * as process from 'process';

if (typeof (window as any).global === 'undefined') {
  (window as any).global = window;
}

if (typeof (window as any).Buffer === 'undefined') {
  (window as any).Buffer = Buffer;
}

if (typeof (window as any).process === 'undefined') {
  (window as any).process = process;
} else {
  // Merge any missing properties from the imported process
  Object.assign((window as any).process, process);
}

export {};