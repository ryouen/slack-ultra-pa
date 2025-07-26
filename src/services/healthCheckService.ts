import { logger } from '@/utils/logger';
import { getPrismaClient } from '@/config/database';
import { jobQueueService } from './jobQueueService';
import { 
  systemHealthStatus, 
  databaseConnectionStatus, 
  redisConnectionStatus 
} from '@/config/metrics';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  components: {
    database: ComponentHealth;
    redis: ComponentHealth;
    jobQueue: ComponentHealth;
    oauth: ComponentHealth;
  };
  metrics?: {
    totalTasks: number;
    activeJobs: number;
    queueStats: Record<string, any>;
  };
}

export interface ComponentHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  message?: string;
  responseTime?: number;
  lastChecked: string;
}

/**
 * Health Check Service
 * Monitors system components and provides health status
 */
export class HealthCheckService {
  private get prisma() {
    return getPrismaClient();
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      logger.info('Starting health check');

      // Check all components
      const [database, redis, jobQueue, oauth] = await Promise.allSettled([
        this.checkDatabase(),
        this.checkRedis(),
        this.checkJobQueue(),
        this.checkOAuth(),
      ]);

      // Determine overall status
      const components = {
        database: this.getResultValue(database),
        redis: this.getResultValue(redis),
        jobQueue: this.getResultValue(jobQueue),
        oauth: this.getResultValue(oauth),
      };

      const overallStatus = this.determineOverallStatus(components);

      // Update metrics
      this.updateHealthMetrics(components);

      // Get additional metrics
      const metrics = await this.getSystemMetrics();

      const result: HealthCheckResult = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        components,
        metrics,
      };

      const duration = Date.now() - startTime;
      logger.info('Health check completed', { 
        status: overallStatus, 
        duration: `${duration}ms` 
      });

      return result;
    } catch (error) {
      logger.error('Health check failed', { error });
      
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '1.0.0',
        components: {
          database: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
          redis: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
          jobQueue: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
          oauth: { status: 'unhealthy', message: 'Health check failed', lastChecked: new Date().toISOString() },
        },
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Simple query to test connection
      await this.prisma.$queryRaw`SELECT 1`;
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        message: responseTime > 1000 ? 'Slow response time' : undefined,
      };
    } catch (error) {
      logger.error('Database health check failed', { error });
      
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Database connection failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Test Redis connection through job queue service
      const stats = await jobQueueService.getQueueStats();
      
      const responseTime = Date.now() - startTime;
      
      return {
        status: responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        lastChecked: new Date().toISOString(),
        message: responseTime > 500 ? 'Slow response time' : undefined,
      };
    } catch (error) {
      logger.error('Redis health check failed', { error });
      
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Redis connection failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check job queue health
   */
  private async checkJobQueue(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      const stats = await jobQueueService.getQueueStats();
      
      // Check for excessive failed jobs
      const totalFailed = Object.values(stats).reduce((sum: number, stat: any) => sum + stat.failed, 0);
      const totalJobs = Object.values(stats).reduce((sum: number, stat: any) => 
        sum + stat.waiting + stat.active + stat.completed + stat.failed, 0);
      
      const failureRate = totalJobs > 0 ? totalFailed / totalJobs : 0;
      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message: string | undefined;
      
      if (failureRate > 0.1) {
        status = 'degraded';
        message = `High failure rate: ${(failureRate * 100).toFixed(1)}%`;
      } else if (failureRate > 0.2) {
        status = 'unhealthy';
        message = `Critical failure rate: ${(failureRate * 100).toFixed(1)}%`;
      }
      
      return {
        status,
        responseTime,
        lastChecked: new Date().toISOString(),
        message,
      };
    } catch (error) {
      logger.error('Job queue health check failed', { error });
      
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Job queue check failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Check OAuth system health
   */
  private async checkOAuth(): Promise<ComponentHealth> {
    const startTime = Date.now();
    
    try {
      // Check for valid OAuth tokens
      const tokenCount = await this.prisma.oAuthToken.count({
        where: { isValid: true }
      });
      
      // Check for expired tokens that need refresh
      const expiredCount = await this.prisma.oAuthToken.count({
        where: {
          isValid: true,
          expiresAt: {
            lt: new Date()
          }
        }
      });
      
      const responseTime = Date.now() - startTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      let message: string | undefined;
      
      if (tokenCount === 0) {
        status = 'degraded';
        message = 'No OAuth tokens configured';
      } else if (expiredCount > tokenCount * 0.5) {
        status = 'degraded';
        message = `Many expired tokens: ${expiredCount}/${tokenCount}`;
      }
      
      return {
        status,
        responseTime,
        lastChecked: new Date().toISOString(),
        message,
      };
    } catch (error) {
      logger.error('OAuth health check failed', { error });
      
      return {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'OAuth check failed',
        responseTime: Date.now() - startTime,
        lastChecked: new Date().toISOString(),
      };
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<HealthCheckResult['metrics']> {
    try {
      const [totalTasks, queueStats] = await Promise.all([
        this.prisma.task.count({
          where: {
            status: {
              in: ['PENDING', 'IN_PROGRESS']
            }
          }
        }),
        jobQueueService.getQueueStats(),
      ]);

      const activeJobs = Object.values(queueStats).reduce((sum: number, stat: any) => sum + stat.active, 0);

      return {
        totalTasks,
        activeJobs,
        queueStats,
      };
    } catch (error) {
      logger.error('Failed to get system metrics', { error });
      return undefined;
    }
  }

  /**
   * Update Prometheus metrics based on health check results
   */
  private updateHealthMetrics(components: HealthCheckResult['components']): void {
    try {
      // Update system health metrics
      Object.entries(components).forEach(([component, health]) => {
        const value = health.status === 'healthy' ? 1 : 0;
        systemHealthStatus.set({ component }, value);
      });

      // Update specific connection status metrics
      databaseConnectionStatus.set(components.database.status === 'healthy' ? 1 : 0);
      redisConnectionStatus.set(components.redis.status === 'healthy' ? 1 : 0);
    } catch (error) {
      logger.error('Failed to update health metrics', { error });
    }
  }

  /**
   * Determine overall system status
   */
  private determineOverallStatus(components: HealthCheckResult['components']): 'healthy' | 'degraded' | 'unhealthy' {
    const statuses = Object.values(components).map(c => c.status);
    
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    } else if (statuses.includes('degraded')) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Extract result value from Promise.allSettled result
   */
  private getResultValue(result: PromiseSettledResult<ComponentHealth>): ComponentHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        status: 'unhealthy',
        message: result.reason?.message || 'Component check failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }
}

// Export singleton instance
export const healthCheckService = new HealthCheckService();