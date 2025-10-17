import { logger } from './logger';

/**
 * Performance monitoring and optimization utilities for AI Flow Assistant
 */
export class AIFlowPerformanceMonitor {
  private static instance: AIFlowPerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private readonly maxMetricsPerType = 100;

  static getInstance(): AIFlowPerformanceMonitor {
    if (!AIFlowPerformanceMonitor.instance) {
      AIFlowPerformanceMonitor.instance = new AIFlowPerformanceMonitor();
    }
    return AIFlowPerformanceMonitor.instance;
  }

  /**
   * Start timing an operation
   */
  startTiming(operationId: string, operationType: string, metadata?: any): PerformanceTimer {
    return new PerformanceTimer(operationId, operationType, metadata, this);
  }

  /**
   * Record a completed operation
   */
  recordMetric(metric: PerformanceMetric): void {
    const key = metric.operationType;
    
    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    const metrics = this.metrics.get(key)!;
    metrics.push(metric);


    if (metrics.length > this.maxMetricsPerType) {
      metrics.shift();
    }


    if (metric.duration > this.getSlowThreshold(metric.operationType)) {
      logger.warn('AIFlowPerformance', `Slow operation detected: ${metric.operationType}`, {
        operationId: metric.operationId,
        duration: metric.duration,
        metadata: metric.metadata
      });
    }
  }

  /**
   * Get performance statistics for an operation type
   */
  getStats(operationType: string): PerformanceStats | null {
    const metrics = this.metrics.get(operationType);
    if (!metrics || metrics.length === 0) {
      return null;
    }

    const durations = metrics.map(m => m.duration);
    const sorted = durations.sort((a, b) => a - b);

    return {
      operationType,
      count: metrics.length,
      avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      errorRate: metrics.filter(m => m.error).length / metrics.length,
      lastUpdated: new Date()
    };
  }

  /**
   * Get all performance statistics
   */
  getAllStats(): { [operationType: string]: PerformanceStats } {
    const stats: { [operationType: string]: PerformanceStats } = {};
    
    for (const operationType of Array.from(this.metrics.keys())) {
      const stat = this.getStats(operationType);
      if (stat) {
        stats[operationType] = stat;
      }
    }

    return stats;
  }

  /**
   * Get slow operation threshold for different operation types
   */
  private getSlowThreshold(operationType: string): number {
    const thresholds: { [key: string]: number } = {
      'ai_chat_request': 10000, // 10 seconds
      'flow_generation': 15000, // 15 seconds
      'knowledge_search': 1000, // 1 second
      'node_validation': 500, // 500ms
      'flow_validation': 2000, // 2 seconds
      'websocket_broadcast': 100 // 100ms
    };

    return thresholds[operationType] || 5000; // Default 5 seconds
  }

  /**
   * Clear all metrics (useful for testing)
   */
  clearMetrics(): void {
    this.metrics.clear();
  }

  /**
   * Get health status based on recent performance
   */
  getHealthStatus(): HealthStatus {
    const stats = this.getAllStats();
    const issues: string[] = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    for (const [operationType, stat] of Object.entries(stats)) {

      if (stat.errorRate > 0.1) { // More than 10% errors
        issues.push(`High error rate for ${operationType}: ${(stat.errorRate * 100).toFixed(1)}%`);
        overallStatus = 'critical';
      } else if (stat.errorRate > 0.05) { // More than 5% errors
        issues.push(`Elevated error rate for ${operationType}: ${(stat.errorRate * 100).toFixed(1)}%`);
        if (overallStatus === 'healthy') overallStatus = 'warning';
      }


      const threshold = this.getSlowThreshold(operationType);
      if (stat.p95 > threshold) {
        issues.push(`Slow performance for ${operationType}: P95 ${stat.p95}ms > ${threshold}ms`);
        if (overallStatus === 'healthy') overallStatus = 'warning';
      }
    }

    return {
      status: overallStatus,
      issues,
      stats,
      timestamp: new Date()
    };
  }
}

/**
 * Performance timer for measuring operation duration
 */
export class PerformanceTimer {
  private startTime: number;

  constructor(
    private operationId: string,
    private operationType: string,
    private metadata: any,
    private monitor: AIFlowPerformanceMonitor
  ) {
    this.startTime = Date.now();
  }

  /**
   * End timing and record the metric
   */
  end(error?: Error): void {
    const duration = Date.now() - this.startTime;
    
    const metric: PerformanceMetric = {
      operationId: this.operationId,
      operationType: this.operationType,
      duration,
      timestamp: new Date(),
      metadata: this.metadata,
      error: !!error,
      errorMessage: error?.message
    };

    this.monitor.recordMetric(metric);
  }
}

/**
 * Optimization recommendations based on performance data
 */
export class AIFlowOptimizer {
  private static instance: AIFlowOptimizer;
  private monitor: AIFlowPerformanceMonitor;

  constructor() {
    this.monitor = AIFlowPerformanceMonitor.getInstance();
  }

  static getInstance(): AIFlowOptimizer {
    if (!AIFlowOptimizer.instance) {
      AIFlowOptimizer.instance = new AIFlowOptimizer();
    }
    return AIFlowOptimizer.instance;
  }

  /**
   * Get optimization recommendations
   */
  getRecommendations(): OptimizationRecommendation[] {
    const stats = this.monitor.getAllStats();
    const recommendations: OptimizationRecommendation[] = [];

    for (const [operationType, stat] of Object.entries(stats)) {

      if (stat.count > 50 && stat.avgDuration > 1000) {
        recommendations.push({
          type: 'caching',
          priority: 'medium',
          operationType,
          description: `Consider caching results for ${operationType} operations`,
          expectedImprovement: 'Reduce average response time by 50-80%',
          implementation: 'Add Redis caching layer for frequently requested data'
        });
      }


      if (stat.p95 > 5000) {
        recommendations.push({
          type: 'async_processing',
          priority: 'high',
          operationType,
          description: `Move ${operationType} to background processing`,
          expectedImprovement: 'Improve user experience with immediate response',
          implementation: 'Use job queue (Bull/Agenda) for long-running operations'
        });
      }


      if (stat.count > 100) {
        recommendations.push({
          type: 'rate_limiting',
          priority: 'low',
          operationType,
          description: `Add rate limiting for ${operationType} operations`,
          expectedImprovement: 'Prevent system overload and improve stability',
          implementation: 'Implement per-user/company rate limits'
        });
      }


      if (stat.errorRate > 0.05) {
        recommendations.push({
          type: 'error_handling',
          priority: 'high',
          operationType,
          description: `Improve error handling for ${operationType}`,
          expectedImprovement: `Reduce error rate from ${(stat.errorRate * 100).toFixed(1)}%`,
          implementation: 'Add retry logic, better validation, and fallback mechanisms'
        });
      }
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }
}


interface PerformanceMetric {
  operationId: string;
  operationType: string;
  duration: number;
  timestamp: Date;
  metadata?: any;
  error: boolean;
  errorMessage?: string;
}

interface PerformanceStats {
  operationType: string;
  count: number;
  avgDuration: number;
  minDuration: number;
  maxDuration: number;
  p50: number;
  p95: number;
  p99: number;
  errorRate: number;
  lastUpdated: Date;
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  issues: string[];
  stats: { [operationType: string]: PerformanceStats };
  timestamp: Date;
}

interface OptimizationRecommendation {
  type: 'caching' | 'async_processing' | 'rate_limiting' | 'error_handling';
  priority: 'low' | 'medium' | 'high';
  operationType: string;
  description: string;
  expectedImprovement: string;
  implementation: string;
}


export const aiFlowPerformanceMonitor = AIFlowPerformanceMonitor.getInstance();
export const aiFlowOptimizer = AIFlowOptimizer.getInstance();
