import { Request, Response } from 'express';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { ResponseTimeOptimizer } from '../middleware/responseTimeOptimizer';
import { performanceOptimizationService } from '../services/performanceOptimizationService';
import { cacheStrategyService } from '../services/cacheStrategyService';
import { memoryOptimizationService } from '../services/memoryOptimizationService';
import { logWithContext } from '../utils/logger';
import { AppError, ErrorType } from '../middleware/errorHandler';

/**
 * 성능 관련 API 컨트롤러
 */
export class PerformanceController {
  /**
   * 실시간 성능 지표 조회
   */
  static async getCurrentMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await performanceMonitoringService.getCurrentMetrics();
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date()
      });
    } catch (error) {
      logWithContext('error', '성능 지표 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: '성능 지표 조회에 실패했습니다.'
      });
    }
  }

  /**
   * 성능 히스토리 조회
   */
  static async getMetricsHistory(req: Request, res: Response): Promise<void> {
    try {
      const { period = 'hourly' } = req.query;
      
      if (!['hourly', 'daily', 'weekly'].includes(period as string)) {
        throw new AppError(
          '잘못된 기간 파라미터입니다. (hourly, daily, weekly)',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      const history = performanceMonitoringService.getMetricsHistory(period as 'hourly' | 'daily' | 'weekly');
      
      res.json({
        success: true,
        data: {
          period,
          metrics: history,
          count: history.length
        }
      });
    } catch (error) {
      logWithContext('error', '성능 히스토리 조회 실패:', error);
      res.status(error instanceof AppError ? error.statusCode : 500).json({
        success: false,
        error: error instanceof AppError ? error.message : '성능 히스토리 조회에 실패했습니다.'
      });
    }
  }

  /**
   * 최근 알림 조회
   */
  static async getRecentAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { hours = 24 } = req.query;
      const hoursNum = parseInt(hours as string, 10);
      
      if (isNaN(hoursNum) || hoursNum <= 0 || hoursNum > 168) { // 최대 7일
        throw new AppError(
          '시간 범위는 1-168시간 사이여야 합니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      const alerts = await performanceMonitoringService.getRecentAlerts(hoursNum);
      
      res.json({
        success: true,
        data: {
          hours: hoursNum,
          alerts,
          count: alerts.length,
          summary: {
            critical: alerts.filter(a => a.severity === 'critical').length,
            warning: alerts.filter(a => a.severity === 'warning').length
          }
        }
      });
    } catch (error) {
      logWithContext('error', '알림 조회 실패:', error);
      res.status(error instanceof AppError ? error.statusCode : 500).json({
        success: false,
        error: error instanceof AppError ? error.message : '알림 조회에 실패했습니다.'
      });
    }
  }

  /**
   * 성능 대시보드 데이터 조회
   */
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const dashboardData = await performanceMonitoringService.getDashboardData();
      
      res.json({
        success: true,
        data: dashboardData,
        timestamp: new Date()
      });
    } catch (error) {
      logWithContext('error', '대시보드 데이터 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: '대시보드 데이터 조회에 실패했습니다.'
      });
    }
  }

  /**
   * API 응답 시간 통계 조회
   */
  static async getResponseTimeStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = ResponseTimeOptimizer.getMetrics();
      
      res.json({
        success: true,
        data: stats,
        timestamp: new Date()
      });
    } catch (error) {
      logWithContext('error', '응답 시간 통계 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: '응답 시간 통계 조회에 실패했습니다.'
      });
    }
  }

  /**
   * 캐시 통계 조회
   */
  static async getCacheStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = cacheStrategyService.getCacheStats();
      const report = cacheStrategyService.generateCacheReport();
      
      res.json({
        success: true,
        data: {
          stats,
          report
        },
        timestamp: new Date()
      });
    } catch (error) {
      logWithContext('error', '캐시 통계 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: '캐시 통계 조회에 실패했습니다.'
      });
    }
  }

  /**
   * 메모리 통계 조회
   */
  static async getMemoryStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = memoryOptimizationService.getMemoryStats();
      const report = memoryOptimizationService.generateMemoryReport();
      
      res.json({
        success: true,
        data: {
          stats,
          report
        },
        timestamp: new Date()
      });
    } catch (error) {
      logWithContext('error', '메모리 통계 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: '메모리 통계 조회에 실패했습니다.'
      });
    }
  }

  /**
   * 종합 성능 보고서 조회
   */
  static async getPerformanceReport(req: Request, res: Response): Promise<void> {
    try {
      const [
        dashboardData,
        responseTimeStats,
        cacheReport,
        memoryReport
      ] = await Promise.all([
        performanceMonitoringService.getDashboardData(),
        ResponseTimeOptimizer.getMetrics(),
        cacheStrategyService.generateCacheReport(),
        memoryOptimizationService.generateMemoryReport()
      ]);

      const comprehensiveReport = {
        timestamp: new Date(),
        summary: {
          systemStatus: dashboardData.status,
          uptime: dashboardData.current.uptime,
          totalRequests: responseTimeStats.summary.totalRequests,
          averageResponseTime: responseTimeStats.summary.averageResponseTime,
          cacheHitRate: cacheReport.stats.hitRate,
          memoryPressure: memoryReport.stats.pressureLevel
        },
        performance: {
          responseTime: responseTimeStats,
          cache: cacheReport,
          memory: memoryReport
        },
        monitoring: {
          current: dashboardData.current,
          alerts: dashboardData.alerts,
          trends: dashboardData.trends
        },
        recommendations: [
          ...dashboardData.recommendations,
          ...cacheReport.recommendations,
          ...memoryReport.recommendations
        ].filter((rec, index, arr) => arr.indexOf(rec) === index) // 중복 제거
      };

      res.json({
        success: true,
        data: comprehensiveReport
      });
    } catch (error) {
      logWithContext('error', '종합 성능 보고서 생성 실패:', error);
      res.status(500).json({
        success: false,
        error: '성능 보고서 생성에 실패했습니다.'
      });
    }
  }

  /**
   * 성능 임계값 설정
   */
  static async setThresholds(req: Request, res: Response): Promise<void> {
    try {
      const { thresholds } = req.body;
      
      if (!thresholds || typeof thresholds !== 'object') {
        throw new AppError(
          '임계값 데이터가 필요합니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      performanceMonitoringService.setThresholds(thresholds);
      
      res.json({
        success: true,
        message: '임계값이 성공적으로 설정되었습니다.',
        data: thresholds
      });
    } catch (error) {
      logWithContext('error', '임계값 설정 실패:', error);
      res.status(error instanceof AppError ? error.statusCode : 500).json({
        success: false,
        error: error instanceof AppError ? error.message : '임계값 설정에 실패했습니다.'
      });
    }
  }

  /**
   * 알림 설정 업데이트
   */
  static async updateAlertConfig(req: Request, res: Response): Promise<void> {
    try {
      const { alerts } = req.body;
      
      if (!Array.isArray(alerts)) {
        throw new AppError(
          '알림 설정은 배열 형태여야 합니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      performanceMonitoringService.updateAlertConfig(alerts);
      
      res.json({
        success: true,
        message: '알림 설정이 성공적으로 업데이트되었습니다.',
        data: { alertCount: alerts.length }
      });
    } catch (error) {
      logWithContext('error', '알림 설정 업데이트 실패:', error);
      res.status(error instanceof AppError ? error.statusCode : 500).json({
        success: false,
        error: error instanceof AppError ? error.message : '알림 설정 업데이트에 실패했습니다.'
      });
    }
  }

  /**
   * 성능 최적화 실행
   */
  static async optimizePerformance(req: Request, res: Response): Promise<void> {
    try {
      const { type = 'all' } = req.body;
      const results: any = {
        timestamp: new Date(),
        optimizations: []
      };

      if (type === 'all' || type === 'cache') {
        // 캐시 최적화
        await performanceOptimizationService.optimizeCache();
        results.optimizations.push({
          type: 'cache',
          status: 'completed',
          message: '캐시 최적화가 완료되었습니다.'
        });
      }

      if (type === 'all' || type === 'memory') {
        // 메모리 최적화
        await memoryOptimizationService.optimizeMemoryUsage();
        results.optimizations.push({
          type: 'memory',
          status: 'completed',
          message: '메모리 최적화가 완료되었습니다.'
        });
      }

      if (type === 'all' || type === 'cleanup') {
        // 긴급 정리
        await memoryOptimizationService.performEmergencyCleanup();
        results.optimizations.push({
          type: 'cleanup',
          status: 'completed',
          message: '시스템 정리가 완료되었습니다.'
        });
      }

      res.json({
        success: true,
        message: '성능 최적화가 완료되었습니다.',
        data: results
      });
    } catch (error) {
      logWithContext('error', '성능 최적화 실행 실패:', error);
      res.status(500).json({
        success: false,
        error: '성능 최적화 실행에 실패했습니다.'
      });
    }
  }

  /**
   * 성능 모니터링 상태 조회
   */
  static async getMonitoringStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = {
        isMonitoring: true, // 항상 모니터링 중
        uptime: process.uptime(),
        version: process.version,
        platform: process.platform,
        arch: process.arch,
        nodeEnv: process.env.NODE_ENV,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
        timestamp: new Date()
      };

      res.json({
        success: true,
        data: status
      });
    } catch (error) {
      logWithContext('error', '모니터링 상태 조회 실패:', error);
      res.status(500).json({
        success: false,
        error: '모니터링 상태 조회에 실패했습니다.'
      });
    }
  }

  /**
   * 헬스 체크 (간단한 상태 확인)
   */
  static async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const memoryUsage = process.memoryUsage();
      const memoryUsagePercent = memoryUsage.heapUsed / memoryUsage.heapTotal;
      
      const health = {
        status: memoryUsagePercent > 0.9 ? 'unhealthy' : 'healthy',
        timestamp: new Date(),
        uptime: process.uptime(),
        memory: {
          used: Math.round(memoryUsage.heapUsed / 1024 / 1024),
          total: Math.round(memoryUsage.heapTotal / 1024 / 1024),
          usage: Math.round(memoryUsagePercent * 100)
        }
      };

      const statusCode = health.status === 'healthy' ? 200 : 503;
      res.status(statusCode).json({
        success: health.status === 'healthy',
        data: health
      });
    } catch (error) {
      logWithContext('error', '헬스 체크 실패:', error);
      res.status(500).json({
        success: false,
        error: '헬스 체크에 실패했습니다.'
      });
    }
  }
}