import { PublicKey } from '@solana/web3.js';

/**
 * Security utilities for input validation, sanitization, and protection
 */

// Input sanitization
export class InputSanitizer {
  // HTML sanitization
  static sanitizeHTML(input: string): string {
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // Remove dangerous characters for SQL-like queries
  static sanitizeQuery(input: string): string {
    return input.replace(/['"\\;]/g, '');
  }

  // Sanitize for use in URLs
  static sanitizeURL(input: string): string {
    try {
      const url = new URL(input);
      // Only allow certain protocols
      if (!['http:', 'https:', 'data:'].includes(url.protocol)) {
        throw new Error('Invalid protocol');
      }
      return url.toString();
    } catch {
      // If not a valid URL, sanitize as string
      return encodeURIComponent(input);
    }
  }

  // Remove or escape potentially dangerous characters
  static sanitizeGeneral(input: string, maxLength: number = 1000): string {
    return input
      .trim()
      .slice(0, maxLength)
      .replace(/[<>'"&]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '');
  }
}

// Input validation
export class InputValidator {
  // Validate Solana public key
  static isValidPublicKey(key: string): boolean {
    try {
      new PublicKey(key);
      return true;
    } catch {
      return false;
    }
  }

  // Validate character name
  static isValidCharacterName(name: string): boolean {
    if (!name || name.length < 1 || name.length > 50) return false;
    // Only allow alphanumeric characters, spaces, and basic punctuation
    return /^[a-zA-Z0-9\s\-_\.]+$/.test(name);
  }

  // Validate numeric input
  static isValidNumber(value: any, min?: number, max?: number): boolean {
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return false;
    if (min !== undefined && num < min) return false;
    if (max !== undefined && num > max) return false;
    return true;
  }

  // Validate string length
  static isValidStringLength(str: string, minLength: number = 0, maxLength: number = 1000): boolean {
    return str.length >= minLength && str.length <= maxLength;
  }

  // Validate object structure
  static validateObject(obj: any, requiredFields: string[]): boolean {
    if (!obj || typeof obj !== 'object') return false;
    return requiredFields.every(field => field in obj);
  }

  // Rate limiting validation
  private static requestCounts: Map<string, { count: number; resetTime: number }> = new Map();

  static checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
    const now = Date.now();
    const record = this.requestCounts.get(identifier);

    if (!record || now > record.resetTime) {
      this.requestCounts.set(identifier, { count: 1, resetTime: now + windowMs });
      return true;
    }

    if (record.count >= maxRequests) {
      return false;
    }

    record.count++;
    return true;
  }
}

// Secure storage wrapper
export class SecureStorage {
  private static readonly ENCRYPTION_KEY = 'honey_comb_secure_key';

  // Simple XOR encryption (for basic obfuscation, not cryptographic security)
  private static encrypt(data: string): string {
    return btoa(data.split('').map((char, i) => 
      String.fromCharCode(char.charCodeAt(0) ^ this.ENCRYPTION_KEY.charCodeAt(i % this.ENCRYPTION_KEY.length))
    ).join(''));
  }

  private static decrypt(encryptedData: string): string {
    try {
      const decoded = atob(encryptedData);
      return decoded.split('').map((char, i) => 
        String.fromCharCode(char.charCodeAt(0) ^ this.ENCRYPTION_KEY.charCodeAt(i % this.ENCRYPTION_KEY.length))
      ).join('');
    } catch {
      throw new Error('Failed to decrypt data');
    }
  }

  static setItem(key: string, value: any): void {
    try {
      const sanitizedKey = InputSanitizer.sanitizeGeneral(key, 100);
      const jsonString = JSON.stringify(value);
      const encrypted = this.encrypt(jsonString);
      localStorage.setItem(sanitizedKey, encrypted);
    } catch (error) {
      console.error('Failed to securely store item:', error);
    }
  }

  static getItem<T>(key: string): T | null {
    try {
      const sanitizedKey = InputSanitizer.sanitizeGeneral(key, 100);
      const encrypted = localStorage.getItem(sanitizedKey);
      if (!encrypted) return null;
      
      const decrypted = this.decrypt(encrypted);
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Failed to retrieve secure item:', error);
      return null;
    }
  }

  static removeItem(key: string): void {
    const sanitizedKey = InputSanitizer.sanitizeGeneral(key, 100);
    localStorage.removeItem(sanitizedKey);
  }

  static clear(): void {
    localStorage.clear();
  }
}

// Content Security Policy helper
export class CSPHelper {
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  static createCSPHeader(nonce?: string): string {
    const basePolicy = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Note: 'unsafe-inline' should be avoided in production
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https:",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'"
    ];

    if (nonce) {
      basePolicy[1] = `script-src 'self' 'nonce-${nonce}'`;
      basePolicy[2] = `style-src 'self' 'nonce-${nonce}'`;
    }

    return basePolicy.join('; ');
  }
}

// Transaction security for blockchain operations
export class TransactionSecurity {
  // Validate transaction parameters
  static validateTransaction(params: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params) {
      errors.push('Transaction parameters are required');
      return { valid: false, errors };
    }

    // Validate public keys
    if (params.from && !InputValidator.isValidPublicKey(params.from)) {
      errors.push('Invalid from public key');
    }

    if (params.to && !InputValidator.isValidPublicKey(params.to)) {
      errors.push('Invalid to public key');
    }

    // Validate amounts
    if (params.amount !== undefined) {
      if (!InputValidator.isValidNumber(params.amount, 0)) {
        errors.push('Invalid amount');
      }
    }

    // Check for reasonable gas limits
    if (params.gasLimit !== undefined) {
      if (!InputValidator.isValidNumber(params.gasLimit, 1, 10000000)) {
        errors.push('Gas limit out of reasonable range');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  // Add additional security checks before signing
  static async preSigningChecks(transaction: any): Promise<{ safe: boolean; warnings: string[] }> {
    const warnings: string[] = [];

    // Check for suspicious patterns
    if (transaction.amount && transaction.amount > 1000000) {
      warnings.push('Large transaction amount detected');
    }

    // Add more sophisticated checks as needed
    // - Check against known malicious addresses
    // - Validate smart contract calls
    // - Check transaction frequency

    return { safe: warnings.length === 0, warnings };
  }
}

// Security event logger
export class SecurityLogger {
  private static logs: Array<{ timestamp: number; event: string; details: any; severity: 'low' | 'medium' | 'high' }> = [];

  static logEvent(event: string, details: any = {}, severity: 'low' | 'medium' | 'high' = 'low'): void {
    const logEntry = {
      timestamp: Date.now(),
      event,
      details: this.sanitizeLogDetails(details),
      severity
    };

    this.logs.push(logEntry);

    // Keep only last 1000 logs
    if (this.logs.length > 1000) {
      this.logs.shift();
    }

    // Console log for high severity events
    if (severity === 'high') {
      console.error('Security Event:', logEntry);
    } else if (severity === 'medium') {
      console.warn('Security Event:', logEntry);
    }
  }

  private static sanitizeLogDetails(details: any): any {
    if (typeof details === 'string') {
      return InputSanitizer.sanitizeGeneral(details, 500);
    }
    
    if (typeof details === 'object' && details !== null) {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(details)) {
        if (typeof value === 'string') {
          sanitized[key] = InputSanitizer.sanitizeGeneral(value, 200);
        } else if (typeof value === 'number') {
          sanitized[key] = value;
        } else {
          sanitized[key] = '[Object]';
        }
      }
      return sanitized;
    }

    return details;
  }

  static getLogs(severity?: 'low' | 'medium' | 'high'): typeof this.logs {
    if (severity) {
      return this.logs.filter(log => log.severity === severity);
    }
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
  }
}

// Export utility functions
export const security = {
  sanitize: InputSanitizer,
  validate: InputValidator,
  storage: SecureStorage,
  csp: CSPHelper,
  transaction: TransactionSecurity,
  logger: SecurityLogger
};
