import { analytics } from './Analytics';
import { optimizationManager } from './OptimizationManager';
import { SecurityLogger } from '../utils/security';
import { profiler } from '../utils/performanceProfiler';

interface MetricData {
  timestamp: number;
  value: number;
  tags?: Record<string, string>;
}

interface Alert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  source: string;
  metadata?: any;
}

interface MonitoringConfig {
  enablePerformanceMonitoring: boolean;
  enableErrorTracking: boolean;
  enableSecurityMonitoring: boolean;
  enableUserAnalytics: boolean;
  alertThresholds: {
    fps: number;
    memoryUsage: number;
    errorRate: number;
    loadTime: number;
  };
  retentionPeriod: number; // in milliseconds
}

export class MonitoringSystem {
  private static instance: MonitoringSystem;
  private metrics: Map<string, MetricData[]> = new Map();
  private alerts: Alert[] = [];
  private config: MonitoringConfig;
  private monitoringInterval: number | null = null;
  private isInitialized = false;

  private constructor() {
    this.config = {
      enablePerformanceMonitoring: true,
      enableErrorTracking: true,
      enableSecurityMonitoring: true,
      enableUserAnalytics: process.env.NODE_ENV === 'production',
      alertThresholds: {
        fps: 30,
        memoryUsage: 85, // percentage
        errorRate: 5, // errors per minute
        loadTime: 3000 // milliseconds
      },
      retentionPeriod: 24 * 60 * 60 * 1000 // 24 hours
    };
  }

  static getInstance(): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      MonitoringSystem.instance = new MonitoringSystem();
    }
    return MonitoringSystem.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;

    console.log('🔍 Initializing Monitoring System...');

    this.setupPerformanceMonitoring();
    this.setupErrorTracking();
    this.setupSecurityMonitoring();
    this.setupUserAnalytics();
    this.startMonitoringLoop();

    this.isInitialized = true;
    console.log('✅ Monitoring System initialized');
  }

  private setupPerformanceMonitoring(): void {
    if (!this.config.enablePerformanceMonitoring) return;

    // Monitor FPS
    profiler.startFPSMonitoring((fps) => {
      this.recordMetric('fps', fps);
      
      if (fps < this.config.alertThresholds.fps) {
        this.createAlert('warning', `Low FPS detected: ${fps}`, 'performance', { fps });
      }
    });

    // Monitor memory usage
    setInterval(() => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory;
        const memoryUsage = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
        
        this.recordMetric('memory_usage', memoryUsage);
        
        if (memoryUsage > this.config.alertThresholds.memoryUsage) {
          this.createAlert('error', `High memory usage: ${memoryUsage.toFixed(1)}%`, 'performance', { memoryUsage });
        }
      }
    }, 5000);

    // Monitor load times
    this.trackLoadTimes();
  }

  private setupErrorTracking(): void {
    if (!this.config.enableErrorTracking) return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.recordError(event.error, {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        type: 'javascript'
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError(event.reason, {
        type: 'promise_rejection',
        promise: event.promise
      });
    });

    // React error boundary integration
    this.setupReactErrorTracking();
  }

  private setupSecurityMonitoring(): void {
    if (!this.config.enableSecurityMonitoring) return;

    // Monitor for suspicious activities
    this.monitorSecurityEvents();
    
    // Monitor for XSS attempts
    this.monitorXSSAttempts();
    
    // Monitor for CSRF attempts
    this.monitorCSRFAttempts();
  }

  private setupUserAnalytics(): void {
    if (!this.config.enableUserAnalytics) return;

    // Track user interactions
    this.trackUserInteractions();
    
    // Track game events
    this.trackGameEvents();
    
    // Track performance from user perspective
    this.trackUserExperience();
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    const metric: MetricData = {
      timestamp: Date.now(),
      value,
      tags
    };

    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }

    const metrics = this.metrics.get(name)!;
    metrics.push(metric);

    // Clean up old metrics
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.metrics.set(name, metrics.filter(m => m.timestamp > cutoff));
  }

  recordError(error: Error | string, context?: any): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    this.recordMetric('error_count', 1);
    
    SecurityLogger.logEvent('Error occurred', {
      message: errorMessage,
      stack: errorStack,
      context
    }, 'high');

    this.createAlert('error', errorMessage, 'error', {
      stack: errorStack,
      context
    });

    // Check error rate
    this.checkErrorRate();
  }

  createAlert(level: Alert['level'], message: string, source: string, metadata?: any): void {
    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      message,
      timestamp: Date.now(),
      resolved: false,
      source,
      metadata
    };

    this.alerts.push(alert);

    // Log to console based on level
    switch (level) {
      case 'critical':
      case 'error':
        console.error(`🚨 ${level.toUpperCase()}: ${message}`, metadata);
        break;
      case 'warning':
        console.warn(`⚠️ WARNING: ${message}`, metadata);
        break;
      case 'info':
        console.info(`ℹ️ INFO: ${message}`, metadata);
        break;
    }

    // Clean up old alerts
    const cutoff = Date.now() - this.config.retentionPeriod;
    this.alerts = this.alerts.filter(a => a.timestamp > cutoff);
  }

  resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      console.log(`✅ Alert resolved: ${alert.message}`);
    }
  }

  getMetrics(name: string, timeRange?: { start: number; end: number }): MetricData[] {
    const metrics = this.metrics.get(name) || [];
    
    if (!timeRange) return metrics;
    
    return metrics.filter(m => 
      m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
    );
  }

  getAlerts(level?: Alert['level'], resolved?: boolean): Alert[] {
    let alerts = [...this.alerts];
    
    if (level) {
      alerts = alerts.filter(a => a.level === level);
    }
    
    if (resolved !== undefined) {
      alerts = alerts.filter(a => a.resolved === resolved);
    }
    
    return alerts.sort((a, b) => b.timestamp - a.timestamp);
  }

  getSystemHealth(): {
    status: 'healthy' | 'degraded' | 'critical';
    score: number;
    issues: string[];
    metrics: Record<string, number>;
  } {
    const issues: string[] = [];
    let score = 100;

    // Check FPS
    const recentFPS = this.getRecentAverage('fps', 30000); // Last 30 seconds
    if (recentFPS < this.config.alertThresholds.fps) {
      issues.push(`Low FPS: ${recentFPS?.toFixed(1)}`);
      score -= 20;
    }

    // Check memory usage
    const recentMemory = this.getRecentAverage('memory_usage', 30000);
    if (recentMemory && recentMemory > this.config.alertThresholds.memoryUsage) {
      issues.push(`High memory usage: ${recentMemory.toFixed(1)}%`);
      score -= 15;
    }

    // Check error rate
    const errorRate = this.getRecentErrorRate();
    if (errorRate > this.config.alertThresholds.errorRate) {
      issues.push(`High error rate: ${errorRate} errors/min`);
      score -= 25;
    }

    // Check unresolved alerts
    const unresolvedAlerts = this.getAlerts(undefined, false);
    const criticalAlerts = unresolvedAlerts.filter(a => a.level === 'critical').length;
    const errorAlerts = unresolvedAlerts.filter(a => a.level === 'error').length;

    if (criticalAlerts > 0) {
      issues.push(`${criticalAlerts} critical alert(s)`);
      score -= criticalAlerts * 30;
    }

    if (errorAlerts > 0) {
      issues.push(`${errorAlerts} error alert(s)`);
      score -= errorAlerts * 10;
    }

    score = Math.max(0, score);

    let status: 'healthy' | 'degraded' | 'critical';
    if (score >= 80) status = 'healthy';
    else if (score >= 50) status = 'degraded';
    else status = 'critical';

    return {
      status,
      score,
      issues,
      metrics: {
        fps: recentFPS || 0,
        memoryUsage: recentMemory || 0,
        errorRate,
        alertCount: unresolvedAlerts.length
      }
    };
  }

  private getRecentAverage(metricName: string, timeRange: number): number | null {
    const cutoff = Date.now() - timeRange;
    const metrics = this.getMetrics(metricName).filter(m => m.timestamp > cutoff);
    
    if (metrics.length === 0) return null;
    
    return metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length;
  }

  private getRecentErrorRate(): number {
    const oneMinuteAgo = Date.now() - 60000;
    const errorMetrics = this.getMetrics('error_count').filter(m => m.timestamp > oneMinuteAgo);
    return errorMetrics.reduce((sum, m) => sum + m.value, 0);
  }

  private checkErrorRate(): void {
    const errorRate = this.getRecentErrorRate();
    if (errorRate > this.config.alertThresholds.errorRate) {
      this.createAlert('error', `High error rate: ${errorRate} errors/min`, 'error_tracking');
    }
  }

  private trackLoadTimes(): void {
    // Track initial page load
    window.addEventListener('load', () => {
      const loadTime = performance.now();
      this.recordMetric('page_load_time', loadTime);
      
      if (loadTime > this.config.alertThresholds.loadTime) {
        this.createAlert('warning', `Slow page load: ${loadTime.toFixed(0)}ms`, 'performance');
      }
    });

    // Track navigation timing
    if ('navigation' in performance) {
      const nav = performance.navigation;
      this.recordMetric('navigation_type', nav.type);
    }
  }

  private setupReactErrorTracking(): void {
    // This would be integrated with React Error Boundaries
    // For now, we'll create a global handler
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const errorMessage = args.join(' ');
      if (errorMessage.includes('React') || errorMessage.includes('Component')) {
        this.recordError(new Error(errorMessage), { type: 'react' });
      }
      originalConsoleError.apply(console, args);
    };
  }

  private monitorSecurityEvents(): void {
    // Monitor for suspicious DOM mutations
    if ('MutationObserver' in window) {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                if (element.tagName === 'SCRIPT' && !element.hasAttribute('data-trusted')) {
                  this.createAlert('critical', 'Untrusted script injection detected', 'security');
                }
              }
            });
          }
        });
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }
  }

  private monitorXSSAttempts(): void {
    // Monitor for potential XSS in form inputs
    document.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement;
      if (target && target.value) {
        const suspiciousPatterns = [
          /<script/i,
          /javascript:/i,
          /onerror=/i,
          /onload=/i,
          /eval\(/i
        ];

        const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(target.value));
        if (isSuspicious) {
          this.createAlert('warning', 'Potential XSS attempt detected in user input', 'security', {
            input: target.value.substring(0, 100),
            element: target.tagName
          });
        }
      }
    });
  }

  private monitorCSRFAttempts(): void {
    // Monitor for unexpected form submissions
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement;
      if (form && !form.hasAttribute('data-csrf-token')) {
        this.createAlert('info', 'Form submission without CSRF token', 'security');
      }
    });
  }

  private trackUserInteractions(): void {
    ['click', 'keydown', 'scroll'].forEach(eventType => {
      document.addEventListener(eventType, () => {
        this.recordMetric(`user_${eventType}`, 1);
      });
    });
  }

  private trackGameEvents(): void {
    // This would integrate with the game's event system
    // For now, we'll create a placeholder
    analytics.trackEvent = (category: string, action: string, data?: any) => {
      this.recordMetric(`game_${category}_${action}`, 1, {
        category,
        action,
        data: JSON.stringify(data)
      });
    };
  }

  private trackUserExperience(): void {
    // Track user experience metrics
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      if (connection) {
        this.recordMetric('connection_speed', connection.downlink);
        this.recordMetric('connection_rtt', connection.rtt);
      }
    }

    // Track viewport size
    this.recordMetric('viewport_width', window.innerWidth);
    this.recordMetric('viewport_height', window.innerHeight);
  }

  private startMonitoringLoop(): void {
    this.monitoringInterval = window.setInterval(() => {
      // Periodic health checks
      const health = this.getSystemHealth();
      
      if (health.status === 'critical') {
        this.createAlert('critical', `System health critical (score: ${health.score})`, 'monitoring');
      } else if (health.status === 'degraded') {
        this.createAlert('warning', `System health degraded (score: ${health.score})`, 'monitoring');
      }

      // Log metrics to analytics
      Object.entries(health.metrics).forEach(([key, value]) => {
        this.recordMetric(`system_${key}`, value);
      });

    }, 30000); // Every 30 seconds
  }

  shutdown(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    profiler.stopFPSMonitoring();
    this.isInitialized = false;
    console.log('🔍 Monitoring System shutdown');
  }

  // Export data for external analysis
  exportData(): {
    metrics: Record<string, MetricData[]>;
    alerts: Alert[];
    config: MonitoringConfig;
    timestamp: number;
  } {
    return {
      metrics: Object.fromEntries(this.metrics),
      alerts: this.alerts,
      config: this.config,
      timestamp: Date.now()
    };
  }
}

export const monitoringSystem = MonitoringSystem.getInstance();

// Auto-initialize in browser environment
if (typeof window !== 'undefined') {
  // Initialize after DOM is loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      monitoringSystem.initialize();
    });
  } else {
    monitoringSystem.initialize();
  }
}
