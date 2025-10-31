// Search Performance Monitor

export interface SearchPerformanceMetrics {
  queryTime: number;
  resultCount: number;
  cacheHit: boolean;
  query: string;
  timestamp: Date;
}

export class SearchPerformanceMonitor {
  private static instance: SearchPerformanceMonitor;
  private metrics: SearchPerformanceMetrics[] = [];
  private readonly MAX_METRICS = 1000;

  private constructor() {}

  public static getInstance(): SearchPerformanceMonitor {
    if (!SearchPerformanceMonitor.instance) {
      SearchPerformanceMonitor.instance = new SearchPerformanceMonitor();
    }
    return SearchPerformanceMonitor.instance;
  }

  /**
   * Record search performance metrics
   */
  public recordSearch(metrics: SearchPerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Log slow queries
    if (metrics.queryTime > 1000) {
      console.warn(`Slow search query detected: ${metrics.query} took ${metrics.queryTime}ms`);
    }
  }

  /**
   * Get performance statistics
   */
  public getStats(): {
    averageQueryTime: number;
    slowQueries: SearchPerformanceMetrics[];
    cacheHitRate: number;
    totalSearches: number;
  } {
    if (this.metrics.length === 0) {
      return {
        averageQueryTime: 0,
        slowQueries: [],
        cacheHitRate: 0,
        totalSearches: 0
      };
    }

    const totalTime = this.metrics.reduce((sum, m) => sum + m.queryTime, 0);
    const averageQueryTime = totalTime / this.metrics.length;
    
    const slowQueries = this.metrics.filter(m => m.queryTime > 500);
    
    const cacheHits = this.metrics.filter(m => m.cacheHit).length;
    const cacheHitRate = (cacheHits / this.metrics.length) * 100;

    return {
      averageQueryTime: Math.round(averageQueryTime),
      slowQueries,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      totalSearches: this.metrics.length
    };
  }

  /**
   * Clear performance metrics
   */
  public clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Get recent metrics
   */
  public getRecentMetrics(limit: number = 10): SearchPerformanceMetrics[] {
    return this.metrics.slice(-limit);
  }
}