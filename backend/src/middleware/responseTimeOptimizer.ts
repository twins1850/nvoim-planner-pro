import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import { logWithContext } from '../utils/logger';

interface ResponseTimeMetrics {
  totalRequests: number;
  totalResponseTime: number;
  averageResponseTime: number;
  slowRequests: number;
  requestCounts: Map<string, number>;
  responseTimesMap: Map<string, number[]>;
}

/**
 * API 응답 시간 최적화 미들웨어
 */
export class ResponseTimeOptimizer {
  private static metrics: ResponseTimeMetrics = {
    totalRequests: 0,
    totalResponseTime: 0,
    averageResponseTime: 0,
    slowRequests: 0,
    requestCounts: new Map(),
    responseTimesMap: new Map()
  };

  private static readonly SLOW_REQUEST_THRESHOLD = 1000; // 1초
  private static readonly WARNING_THRESHOLD = 2000; // 2초
  private static readonly CRITICAL_THRESHOLD = 5000; // 5초

  /**
   * 응답 시간 추적 미들웨어
   */
  static trackResponseTime() {
    return (req: Request, res: Response, next: NextFunction) => {
      const startTime = performance.now();
      const originalSend = res.send;
      
      // Request 객체에 시작 시간 저장
      (req as any).startTime = startTime;

      // Response의 send 메서드를 오버라이드
      res.send = function(data: any) {
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        const route = `${req.method} ${req.route?.path || req.path}`;

        // 메트릭 업데이트
        ResponseTimeOptimizer.updateMetrics(route, responseTime);

        // 응답 시간이 임계치를 초과하는 경우 로그 기록
        if (responseTime > ResponseTimeOptimizer.CRITICAL_THRESHOLD) {
          logWithContext('error', `Critical slow response: ${route}`, {
            responseTime: `${responseTime.toFixed(2)}ms`,
            method: req.method,
            path: req.path,
            userAgent: req.get('User-Agent'),
            ip: req.ip
          });
        } else if (responseTime > ResponseTimeOptimizer.WARNING_THRESHOLD) {
          logWithContext('warn', `Warning slow response: ${route}`, {
            responseTime: `${responseTime.toFixed(2)}ms`,
            method: req.method,
            path: req.path
          });
        }

        // 헤더에 응답 시간 추가
        this.set('X-Response-Time', `${responseTime.toFixed(2)}ms`);

        // 원래 send 함수 호출
        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * 메트릭 업데이트
   */
  private static updateMetrics(route: string, responseTime: number): void {
    this.metrics.totalRequests++;
    this.metrics.totalResponseTime += responseTime;
    this.metrics.averageResponseTime = this.metrics.totalResponseTime / this.metrics.totalRequests;

    if (responseTime > this.SLOW_REQUEST_THRESHOLD) {
      this.metrics.slowRequests++;
    }

    // 라우트별 카운트 업데이트
    const currentCount = this.metrics.requestCounts.get(route) || 0;
    this.metrics.requestCounts.set(route, currentCount + 1);

    // 라우트별 응답 시간 기록
    const responseTimes = this.metrics.responseTimesMap.get(route) || [];
    responseTimes.push(responseTime);
    
    // 최대 100개까지만 보관 (메모리 절약)
    if (responseTimes.length > 100) {
      responseTimes.shift();
    }
    
    this.metrics.responseTimesMap.set(route, responseTimes);
  }

  /**
   * 성능 압축 미들웨어 (큰 응답에 대해)
   */
  static compressionOptimizer() {
    return (req: Request, res: Response, next: NextFunction) => {
      const originalJson = res.json;

      res.json = function(data: any) {
        // 응답 데이터 크기 확인
        const dataSize = JSON.stringify(data).length;
        
        // 100KB 이상의 응답에 대해 압축 힌트 제공
        if (dataSize > 102400) {
          this.set('Content-Encoding-Recommendation', 'gzip');
          this.set('X-Data-Size', dataSize.toString());
          
          // 큰 데이터의 경우 캐시 헤더 설정
          if (req.method === 'GET') {
            this.set('Cache-Control', 'public, max-age=300'); // 5분 캐시
          }
        }

        return originalJson.call(this, data);
      };

      next();
    };
  }

  /**
   * 성능 메트릭 조회
   */
  static getMetrics(): {
    summary: Omit<ResponseTimeMetrics, 'requestCounts' | 'responseTimesMap'>;
    topSlowRoutes: Array<{ route: string; averageTime: number; count: number }>;
    routeStats: Array<{ route: string; count: number; averageTime: number; maxTime: number }>;
  } {
    const topSlowRoutes: Array<{ route: string; averageTime: number; count: number }> = [];
    const routeStats: Array<{ route: string; count: number; averageTime: number; maxTime: number }> = [];

    // 라우트별 성능 통계 계산
    for (const [route, responseTimes] of this.metrics.responseTimesMap) {
      const count = responseTimes.length;
      const averageTime = responseTimes.reduce((sum, time) => sum + time, 0) / count;
      const maxTime = Math.max(...responseTimes);

      routeStats.push({
        route,
        count,
        averageTime: Math.round(averageTime * 100) / 100,
        maxTime: Math.round(maxTime * 100) / 100
      });

      if (averageTime > this.SLOW_REQUEST_THRESHOLD) {
        topSlowRoutes.push({
          route,
          averageTime: Math.round(averageTime * 100) / 100,
          count
        });
      }
    }

    // 느린 라우트 정렬 (평균 응답 시간 기준)
    topSlowRoutes.sort((a, b) => b.averageTime - a.averageTime);
    routeStats.sort((a, b) => b.averageTime - a.averageTime);

    return {
      summary: {
        totalRequests: this.metrics.totalRequests,
        totalResponseTime: Math.round(this.metrics.totalResponseTime * 100) / 100,
        averageResponseTime: Math.round(this.metrics.averageResponseTime * 100) / 100,
        slowRequests: this.metrics.slowRequests
      },
      topSlowRoutes: topSlowRoutes.slice(0, 10),
      routeStats: routeStats.slice(0, 20)
    };
  }

  /**
   * 메트릭 리셋
   */
  static resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      totalResponseTime: 0,
      averageResponseTime: 0,
      slowRequests: 0,
      requestCounts: new Map(),
      responseTimesMap: new Map()
    };
  }

  /**
   * 성능 보고서 생성
   */
  static generatePerformanceReport(): {
    metrics: ReturnType<typeof ResponseTimeOptimizer.getMetrics>;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const recommendations: string[] = [];

    // 성능 개선 권장사항 생성
    if (metrics.summary.averageResponseTime > 500) {
      recommendations.push('평균 응답 시간이 500ms를 초과합니다. 캐싱 전략을 검토하세요.');
    }

    if (metrics.summary.slowRequests > metrics.summary.totalRequests * 0.1) {
      recommendations.push('느린 요청이 전체의 10%를 초과합니다. 데이터베이스 쿼리를 최적화하세요.');
    }

    if (metrics.topSlowRoutes.length > 5) {
      recommendations.push(`${metrics.topSlowRoutes.length}개의 느린 API 엔드포인트가 감지되었습니다. 우선순위를 정해 최적화하세요.`);
    }

    // 특정 라우트에 대한 권장사항
    metrics.topSlowRoutes.forEach(route => {
      if (route.averageTime > 2000) {
        recommendations.push(`${route.route} 엔드포인트의 평균 응답 시간이 ${route.averageTime}ms입니다. 즉시 최적화가 필요합니다.`);
      }
    });

    return {
      metrics,
      recommendations
    };
  }

  /**
   * 주기적 성능 보고서 생성 시작
   */
  static startPeriodicReporting(): void {
    setInterval(() => {
      const report = this.generatePerformanceReport();
      
      if (report.recommendations.length > 0) {
        logWithContext('info', 'API 성능 보고서', {
          totalRequests: report.metrics.summary.totalRequests,
          averageResponseTime: `${report.metrics.summary.averageResponseTime}ms`,
          slowRequests: report.metrics.summary.slowRequests,
          recommendations: report.recommendations
        });
      }
    }, 3600000); // 1시간마다 보고서 생성

    logWithContext('info', 'API 성능 모니터링이 시작되었습니다.');
  }
}

// 기본 응답 시간 추적 미들웨어 export
export const trackResponseTime = ResponseTimeOptimizer.trackResponseTime();
export const compressionOptimizer = ResponseTimeOptimizer.compressionOptimizer();