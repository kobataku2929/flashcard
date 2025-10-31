/**
 * Performance monitoring utilities for the flashcard app
 */

import React from 'react';

interface PerformanceMetric {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private isEnabled: boolean = __DEV__;

  /**
   * Start measuring performance for a given operation
   */
  start(name: string, metadata?: Record<string, any>): void {
    if (!this.isEnabled) return;

    this.metrics.set(name, {
      name,
      startTime: performance.now(),
      metadata,
    });
  }

  /**
   * End measuring performance for a given operation
   */
  end(name: string): number | null {
    if (!this.isEnabled) return null;

    const metric = this.metrics.get(name);
    if (!metric) {
      console.warn(`Performance metric "${name}" not found`);
      return null;
    }

    const endTime = performance.now();
    const duration = endTime - metric.startTime;

    metric.endTime = endTime;
    metric.duration = duration;

    // Log slow operations
    if (duration > 100) {
      console.warn(`Slow operation detected: ${name} took ${duration.toFixed(2)}ms`, metric.metadata);
    }

    return duration;
  }

  /**
   * Measure the execution time of a function
   */
  measure<T>(name: string, fn: () => T, metadata?: Record<string, any>): T {
    if (!this.isEnabled) return fn();

    this.start(name, metadata);
    try {
      const result = fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Measure the execution time of an async function
   */
  async measureAsync<T>(name: string, fn: () => Promise<T>, metadata?: Record<string, any>): Promise<T> {
    if (!this.isEnabled) return fn();

    this.start(name, metadata);
    try {
      const result = await fn();
      this.end(name);
      return result;
    } catch (error) {
      this.end(name);
      throw error;
    }
  }

  /**
   * Get all recorded metrics
   */
  getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(metric => metric.duration !== undefined);
  }

  /**
   * Get metrics for a specific operation
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return this.metrics.get(name);
  }

  /**
   * Clear all metrics
   */
  clear(): void {
    this.metrics.clear();
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalOperations: number;
    averageDuration: number;
    slowestOperation: PerformanceMetric | null;
    fastestOperation: PerformanceMetric | null;
  } {
    const completedMetrics = this.getMetrics();
    
    if (completedMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        slowestOperation: null,
        fastestOperation: null,
      };
    }

    const durations = completedMetrics.map(m => m.duration!);
    const totalDuration = durations.reduce((sum, duration) => sum + duration, 0);
    const averageDuration = totalDuration / durations.length;

    const slowestOperation = completedMetrics.reduce((slowest, current) => 
      (current.duration! > slowest.duration!) ? current : slowest
    );

    const fastestOperation = completedMetrics.reduce((fastest, current) => 
      (current.duration! < fastest.duration!) ? current : fastest
    );

    return {
      totalOperations: completedMetrics.length,
      averageDuration,
      slowestOperation,
      fastestOperation,
    };
  }

  /**
   * Enable or disable performance monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Decorator for measuring method performance
 */
export function measurePerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measure(metricName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Decorator for measuring async method performance
 */
export function measureAsyncPerformance(name?: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const metricName = name || `${target.constructor.name}.${propertyKey}`;

    descriptor.value = function (...args: any[]) {
      return performanceMonitor.measureAsync(metricName, () => originalMethod.apply(this, args));
    };

    return descriptor;
  };
}

/**
 * Memory usage monitoring
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private isEnabled: boolean = __DEV__;

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  /**
   * Log current memory usage (if available)
   */
  logMemoryUsage(context?: string): void {
    if (!this.isEnabled) return;

    // Memory monitoring is limited in React Native
    // This is a placeholder for potential native module integration
    if (context) {
      console.log(`Memory check: ${context}`);
    }

    // In a real implementation, you might use:
    // - Native modules to get actual memory usage
    // - Performance API extensions
    // - Third-party libraries like react-native-device-info
  }

  /**
   * Monitor component mount/unmount for memory leaks
   */
  trackComponent(componentName: string, action: 'mount' | 'unmount'): void {
    if (!this.isEnabled) return;

    console.log(`Component ${action}: ${componentName}`);
    
    // In a real implementation, you might:
    // - Track component instances
    // - Monitor for memory leaks
    // - Alert on suspicious patterns
  }

  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }
}

export const memoryMonitor = MemoryMonitor.getInstance();

/**
 * React hook for performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
  React.useEffect(() => {
    memoryMonitor.trackComponent(componentName, 'mount');
    
    return () => {
      memoryMonitor.trackComponent(componentName, 'unmount');
    };
  }, [componentName]);

  return {
    startMeasure: (name: string, metadata?: Record<string, any>) => 
      performanceMonitor.start(`${componentName}.${name}`, metadata),
    
    endMeasure: (name: string) => 
      performanceMonitor.end(`${componentName}.${name}`),
    
    measure: <T>(name: string, fn: () => T, metadata?: Record<string, any>) => 
      performanceMonitor.measure(`${componentName}.${name}`, fn, metadata),
  };
}

/**
 * Debounce utility for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate?: boolean
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
}

/**
 * Throttle utility for performance optimization
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Batch operations for better performance
 */
export class BatchProcessor<T> {
  private batch: T[] = [];
  private batchSize: number;
  private flushTimeout: NodeJS.Timeout | null = null;
  private processor: (items: T[]) => Promise<void> | void;

  constructor(
    processor: (items: T[]) => Promise<void> | void,
    batchSize: number = 10,
    private flushDelay: number = 100
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
  }

  add(item: T): void {
    this.batch.push(item);

    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }

    this.flushTimeout = setTimeout(() => {
      this.flush();
    }, this.flushDelay);
  }

  async flush(): Promise<void> {
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }

    if (this.batch.length === 0) return;

    const itemsToProcess = [...this.batch];
    this.batch = [];

    try {
      await this.processor(itemsToProcess);
    } catch (error) {
      console.error('Batch processing failed:', error);
      // Optionally re-add items to batch for retry
    }
  }

  getBatchSize(): number {
    return this.batch.length;
  }

  clear(): void {
    this.batch = [];
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
      this.flushTimeout = null;
    }
  }
}