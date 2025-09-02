import { Request, Response } from 'express';
import { performance } from 'perf_hooks';
import { EventEmitter } from 'events';
import { RedisService } from './redisService';
import { logWithContext } from '../utils/logger';
import { AppError, ErrorType } from '../middleware/errorHandler';

// 성능 지표 인터페이스
interface PerformanceMetrics {
  timestamp: Date;
  cpuUsage: NodeJS.CpuUsage;
  memoryUsage: NodeJS.MemoryUsage;
  eventLoopDelay: number;
  activeHandles: number;
  activeRequests: number;
  uptime: number;
  responseTime?: number;
  requestsPerSecond: number;
  errorRate: number;
  dbConnectionCount?: number;
  redisConnectionCount?: number;
}

// 알림 설정
interface AlertConfig {
  metric: keyof PerformanceMetrics;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  enabled: boolean;
  cooldown: number; // 알림 쿨다운 (초)
  recipients: string[];
}

// 성능 임계값
interface PerformanceThresholds {
  responseTime: { warning: number; critical: number };
  memoryUsage: { warning: number; critical: number };
  cpuUsage: { warning: number; critical: number };
  eventLoopDelay: { warning: number; critical: number };
  errorRate: { warning: number; critical: number };
  requestsPerSecond: { min: number; max: number };
}

// 성능 히스토리
interface PerformanceHistory {
  hourly: PerformanceMetrics[];
  daily: PerformanceMetrics[];
  weekly: PerformanceMetrics[];
}

/**
 * 성능 모니터링 서비스
 * 실시간 성능 지표 수집, 알림, 대시보드 데이터 제공
 */
export class PerformanceMonitoringService extends EventEmitter {
  private static instance: PerformanceMonitoringService;
  private redisService: RedisService;
  private isMonitoring: boolean = false;
  private intervalIds: NodeJS.Timeout[] = [];
  private metricsHistory: PerformanceHistory;
  private alertLastSent: Map<string, number> = new Map();
  
  // 기본 임계값 설정
  private thresholds: PerformanceThresholds = {
    responseTime: { warning: 1000, critical: 5000 }, // ms
    memoryUsage: { warning: 0.8, critical: 0.9 }, // 80%, 90%
    cpuUsage: { warning: 0.7, critical: 0.9 }, // 70%, 90%
    eventLoopDelay: { warning: 10, critical: 50 }, // ms
    errorRate: { warning: 0.05, critical: 0.1 }, // 5%, 10%
    requestsPerSecond: { min: 1, max: 1000 }
  };

  // 알림 설정
  private alertConfigs: AlertConfig[] = [
    {
      metric: 'responseTime',
      threshold: 2000,
      operator: 'gt',
      enabled: true,
      cooldown: 300, // 5분
      recipients: ['admin@example.com']
    },
    {
      metric: 'errorRate',
      threshold: 0.1,
      operator: 'gt',
      enabled: true,
      cooldown: 300,
      recipients: ['admin@example.com']
    }
  ];

  private constructor() {
    super();
    this.metricsHistory = {
      hourly: [],
      daily: [],
      weekly: []
    };
  }

  /**
   * 싱글톤 인스턴스 반환
   */
  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  /**
   * 서비스 초기화
   */
  async initialize(): Promise<void> {
    try {
      this.redisService = RedisService.getInstance();
      
      // 기존 히스토리 로드
      await this.loadHistoryFromRedis();
      
      // 모니터링 시작
      this.startMonitoring();
      
      // 이벤트 리스너 설정
      this.setupEventListeners();
      
      logWithContext('info', '성능 모니터링 서비스가 초기화되었습니다.');
    } catch (error) {
      logWithContext('error', '성능 모니터링 서비스 초기화 실패:', error);
      throw new AppError(
        '성능 모니터링 서비스 초기화에 실패했습니다.',
        ErrorType.SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 실시간 성능 모니터링 시작
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    // 1초마다 실시간 메트릭 수집
    const realtimeInterval = setInterval(() => {
      this.collectRealtimeMetrics();
    }, 1000);
    
    // 1분마다 요약 메트릭 저장
    const summaryInterval = setInterval(() => {
      this.saveSummaryMetrics();
    }, 60000);
    
    // 10분마다 히스토리 정리
    const cleanupInterval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 600000);
    
    // 5분마다 성능 보고서 생성
    const reportInterval = setInterval(() => {
      this.generatePerformanceReport();
    }, 300000);

    this.intervalIds.push(realtimeInterval, summaryInterval, cleanupInterval, reportInterval);
    
    logWithContext('info', '실시간 성능 모니터링이 시작되었습니다.');
  }

  /**
   * 모니터링 중지
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    
    this.intervalIds.forEach(id => clearInterval(id));
    this.intervalIds = [];
    
    logWithContext('info', '성능 모니터링이 중지되었습니다.');
  }

  /**
   * 실시간 성능 지표 수집
   */
  private async collectRealtimeMetrics(): Promise<void> {
    try {
      const startTime = performance.now();
      
      // 시스템 메트릭 수집
      const metrics: PerformanceMetrics = {
        timestamp: new Date(),
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        eventLoopDelay: await this.measureEventLoopDelay(),
        activeHandles: (process as any)._getActiveHandles().length,
        activeRequests: (process as any)._getActiveRequests().length,
        uptime: process.uptime(),
        requestsPerSecond: 0, // 계산될 예정
        errorRate: 0 // 계산될 예정
      };

      // Redis 연결 상태 확인
      try {
        const redisInfo = await this.redisService.info();
        metrics.redisConnectionCount = this.parseRedisConnections(redisInfo);
      } catch (error) {
        logWithContext('warn', 'Redis 연결 상태 확인 실패:', error);
      }

      // 임계값 검사 및 알림
      await this.checkThresholds(metrics);
      
      // Redis에 실시간 데이터 저장 (최근 100개만 보관)
      await this.saveRealtimeMetrics(metrics);
      
      // WebSocket으로 실시간 데이터 전송
      this.emit('metrics', metrics);
      
      const collectTime = performance.now() - startTime;
      if (collectTime > 100) { // 100ms 이상 소요 시 경고
        logWithContext('warn', `성능 지표 수집이 느립니다: ${collectTime.toFixed(2)}ms`);
      }
      
    } catch (error) {
      logWithContext('error', '실시간 성능 지표 수집 실패:', error);
    }
  }

  /**
   * Event Loop 지연 측정
   */
  private measureEventLoopDelay(): Promise<number> {
    return new Promise((resolve) => {
      const start = performance.now();
      setImmediate(() => {
        const delay = performance.now() - start;
        resolve(delay);
      });
    });
  }

  /**
   * Redis 연결 수 파싱
   */
  private parseRedisConnections(info: string): number {
    const lines = info.split('\r\n');
    const clientsLine = lines.find(line => line.startsWith('connected_clients:'));
    return clientsLine ? parseInt(clientsLine.split(':')[1]) : 0;
  }

  /**
   * 임계값 검사 및 알림 발송
   */
  private async checkThresholds(metrics: PerformanceMetrics): Promise<void> {
    for (const config of this.alertConfigs) {
      if (!config.enabled) continue;

      const metricValue = metrics[config.metric];
      if (typeof metricValue !== 'number') continue;

      let shouldAlert = false;
      switch (config.operator) {
        case 'gt':
          shouldAlert = metricValue > config.threshold;
          break;
        case 'lt':
          shouldAlert = metricValue < config.threshold;
          break;
        case 'eq':
          shouldAlert = metricValue === config.threshold;
          break;
      }

      if (shouldAlert) {
        await this.sendAlert(config, metricValue, metrics.timestamp);
      }
    }

    // 시스템 상태별 알림
    const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
    const cpuUsagePercent = (metrics.cpuUsage.user + metrics.cpuUsage.system) / 1000000; // 마이크로초를 초로 변환

    if (memoryUsagePercent > this.thresholds.memoryUsage.critical) {
      await this.sendCriticalAlert('memory', memoryUsagePercent, metrics.timestamp);
    }

    if (metrics.eventLoopDelay > this.thresholds.eventLoopDelay.critical) {
      await this.sendCriticalAlert('eventLoop', metrics.eventLoopDelay, metrics.timestamp);
    }
  }

  /**
   * 알림 발송
   */
  private async sendAlert(config: AlertConfig, value: number, timestamp: Date): Promise<void> {
    const alertKey = `${config.metric}_${config.threshold}`;
    const lastSent = this.alertLastSent.get(alertKey) || 0;
    const now = Date.now();

    // 쿨다운 체크
    if (now - lastSent < config.cooldown * 1000) {
      return;
    }

    const alertData = {
      metric: config.metric,
      value,
      threshold: config.threshold,
      operator: config.operator,
      timestamp,
      severity: value > config.threshold * 2 ? 'critical' : 'warning'
    };

    // 이벤트 발생
    this.emit('alert', alertData);

    // Redis에 알림 히스토리 저장
    await this.saveAlertHistory(alertData);

    // 쿨다운 설정
    this.alertLastSent.set(alertKey, now);

    logWithContext('warn', `성능 알림 발송: ${config.metric}`, alertData);
  }

  /**
   * 크리티컬 알림 발송
   */
  private async sendCriticalAlert(type: string, value: number, timestamp: Date): Promise<void> {
    const alertKey = `critical_${type}`;
    const lastSent = this.alertLastSent.get(alertKey) || 0;
    const now = Date.now();

    if (now - lastSent < 300000) { // 5분 쿨다운
      return;
    }

    const alertData = {
      type: 'critical',
      metric: type,
      value,
      timestamp,
      severity: 'critical'
    };

    this.emit('criticalAlert', alertData);
    await this.saveAlertHistory(alertData);
    this.alertLastSent.set(alertKey, now);

    logWithContext('error', `크리티컬 알림: ${type}`, alertData);
  }

  /**
   * 실시간 메트릭 Redis 저장
   */
  private async saveRealtimeMetrics(metrics: PerformanceMetrics): Promise<void> {
    try {
      const key = 'performance:realtime';
      const data = JSON.stringify(metrics);
      
      // 리스트에 추가
      await this.redisService.lpush(key, data);
      
      // 최근 100개만 보관
      await this.redisService.ltrim(key, 0, 99);
      
      // TTL 설정 (1시간)
      await this.redisService.expire(key, 3600);
      
    } catch (error) {
      logWithContext('error', '실시간 메트릭 저장 실패:', error);
    }
  }

  /**
   * 요약 메트릭 저장
   */
  private async saveSummaryMetrics(): Promise<void> {
    try {
      // 최근 1분간의 실시간 데이터 조회
      const realtimeData = await this.redisService.lrange('performance:realtime', 0, 59);
      
      if (realtimeData.length === 0) return;

      const metrics = realtimeData.map(data => JSON.parse(data) as PerformanceMetrics);
      
      // 평균값 계산
      const summary = this.calculateSummaryMetrics(metrics);
      
      // 시간별 히스토리에 추가
      this.metricsHistory.hourly.push(summary);
      
      // 히스토리 크기 제한 (최근 24시간)
      if (this.metricsHistory.hourly.length > 24 * 60) {
        this.metricsHistory.hourly.shift();
      }

      // Redis에 저장
      await this.saveHistoryToRedis();
      
      logWithContext('debug', '요약 메트릭이 저장되었습니다.');
      
    } catch (error) {
      logWithContext('error', '요약 메트릭 저장 실패:', error);
    }
  }

  /**
   * 요약 메트릭 계산
   */
  private calculateSummaryMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    const count = metrics.length;
    
    return {
      timestamp: new Date(),
      cpuUsage: {
        user: metrics.reduce((sum, m) => sum + m.cpuUsage.user, 0) / count,
        system: metrics.reduce((sum, m) => sum + m.cpuUsage.system, 0) / count
      },
      memoryUsage: {
        rss: metrics.reduce((sum, m) => sum + m.memoryUsage.rss, 0) / count,
        heapTotal: metrics.reduce((sum, m) => sum + m.memoryUsage.heapTotal, 0) / count,
        heapUsed: metrics.reduce((sum, m) => sum + m.memoryUsage.heapUsed, 0) / count,
        external: metrics.reduce((sum, m) => sum + m.memoryUsage.external, 0) / count,
        arrayBuffers: metrics.reduce((sum, m) => sum + m.memoryUsage.arrayBuffers, 0) / count
      },
      eventLoopDelay: metrics.reduce((sum, m) => sum + m.eventLoopDelay, 0) / count,
      activeHandles: Math.round(metrics.reduce((sum, m) => sum + m.activeHandles, 0) / count),
      activeRequests: Math.round(metrics.reduce((sum, m) => sum + m.activeRequests, 0) / count),
      uptime: metrics[metrics.length - 1].uptime, // 마지막 값 사용
      requestsPerSecond: metrics.reduce((sum, m) => sum + m.requestsPerSecond, 0) / count,
      errorRate: metrics.reduce((sum, m) => sum + m.errorRate, 0) / count
    };
  }

  /**
   * 히스토리 정리
   */
  private cleanupOldMetrics(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneDay = 24 * oneHour;
    const oneWeek = 7 * oneDay;

    // 1시간 이상된 시간별 데이터를 일별로 압축
    const oldHourlyData = this.metricsHistory.hourly.filter(
      m => now - m.timestamp.getTime() > oneHour
    );
    
    if (oldHourlyData.length > 0) {
      const dailySummary = this.calculateSummaryMetrics(oldHourlyData);
      this.metricsHistory.daily.push(dailySummary);
      
      // 시간별 데이터에서 제거
      this.metricsHistory.hourly = this.metricsHistory.hourly.filter(
        m => now - m.timestamp.getTime() <= oneHour
      );
    }

    // 1일 이상된 일별 데이터를 주별로 압축
    const oldDailyData = this.metricsHistory.daily.filter(
      m => now - m.timestamp.getTime() > oneDay
    );
    
    if (oldDailyData.length >= 7) {
      const weeklySummary = this.calculateSummaryMetrics(oldDailyData.slice(0, 7));
      this.metricsHistory.weekly.push(weeklySummary);
      
      // 일별 데이터에서 제거
      this.metricsHistory.daily = this.metricsHistory.daily.filter(
        m => now - m.timestamp.getTime() <= oneDay
      );
    }

    // 4주 이상된 주별 데이터 제거
    this.metricsHistory.weekly = this.metricsHistory.weekly.filter(
      m => now - m.timestamp.getTime() <= oneWeek * 4
    );
  }

  /**
   * 히스토리 Redis 저장
   */
  private async saveHistoryToRedis(): Promise<void> {
    try {
      await Promise.all([
        this.redisService.setex(
          'performance:history:hourly',
          3600 * 25, // 25시간
          JSON.stringify(this.metricsHistory.hourly)
        ),
        this.redisService.setex(
          'performance:history:daily',
          86400 * 8, // 8일
          JSON.stringify(this.metricsHistory.daily)
        ),
        this.redisService.setex(
          'performance:history:weekly',
          86400 * 30, // 30일
          JSON.stringify(this.metricsHistory.weekly)
        )
      ]);
    } catch (error) {
      logWithContext('error', '히스토리 Redis 저장 실패:', error);
    }
  }

  /**
   * 히스토리 Redis 로드
   */
  private async loadHistoryFromRedis(): Promise<void> {
    try {
      const [hourlyData, dailyData, weeklyData] = await Promise.all([
        this.redisService.get('performance:history:hourly'),
        this.redisService.get('performance:history:daily'),
        this.redisService.get('performance:history:weekly')
      ]);

      if (hourlyData) {
        this.metricsHistory.hourly = JSON.parse(hourlyData);
      }
      if (dailyData) {
        this.metricsHistory.daily = JSON.parse(dailyData);
      }
      if (weeklyData) {
        this.metricsHistory.weekly = JSON.parse(weeklyData);
      }

      logWithContext('info', '성능 히스토리를 Redis에서 로드했습니다.');
    } catch (error) {
      logWithContext('error', '히스토리 Redis 로드 실패:', error);
    }
  }

  /**
   * 알림 히스토리 저장
   */
  private async saveAlertHistory(alertData: any): Promise<void> {
    try {
      const key = 'performance:alerts';
      await this.redisService.lpush(key, JSON.stringify(alertData));
      await this.redisService.ltrim(key, 0, 999); // 최근 1000개 보관
      await this.redisService.expire(key, 86400 * 30); // 30일
    } catch (error) {
      logWithContext('error', '알림 히스토리 저장 실패:', error);
    }
  }

  /**
   * 이벤트 리스너 설정
   */
  private setupEventListeners(): void {
    // 프로세스 종료 시 정리
    process.on('SIGINT', () => {
      this.stopMonitoring();
    });

    process.on('SIGTERM', () => {
      this.stopMonitoring();
    });

    // 메모리 부족 경고
    process.on('warning', (warning) => {
      if (warning.name === 'MaxListenersExceededWarning') {
        logWithContext('warn', '이벤트 리스너 초과:', warning);
      }
    });
  }

  /**
   * 성능 보고서 생성
   */
  private async generatePerformanceReport(): Promise<void> {
    try {
      const currentMetrics = await this.getCurrentMetrics();
      const recentAlerts = await this.getRecentAlerts(24); // 최근 24시간
      
      const report = {
        timestamp: new Date(),
        summary: {
          status: this.getSystemStatus(currentMetrics),
          uptime: currentMetrics.uptime,
          memoryUsage: (currentMetrics.memoryUsage.heapUsed / currentMetrics.memoryUsage.heapTotal * 100).toFixed(2) + '%',
          eventLoopDelay: currentMetrics.eventLoopDelay.toFixed(2) + 'ms',
          activeConnections: currentMetrics.activeHandles + currentMetrics.activeRequests
        },
        alerts: {
          total: recentAlerts.length,
          critical: recentAlerts.filter(a => a.severity === 'critical').length,
          warning: recentAlerts.filter(a => a.severity === 'warning').length
        },
        trends: this.calculateTrends(),
        recommendations: this.generateRecommendations(currentMetrics, recentAlerts)
      };

      // 보고서 이벤트 발생
      this.emit('report', report);
      
      // Redis에 최신 보고서 저장
      await this.redisService.setex(
        'performance:latest_report',
        3600, // 1시간
        JSON.stringify(report)
      );

      logWithContext('info', '성능 보고서가 생성되었습니다.', {
        status: report.summary.status,
        alertsCount: report.alerts.total
      });
      
    } catch (error) {
      logWithContext('error', '성능 보고서 생성 실패:', error);
    }
  }

  /**
   * 시스템 상태 평가
   */
  private getSystemStatus(metrics: PerformanceMetrics): 'healthy' | 'warning' | 'critical' {
    const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;
    
    if (
      memoryUsagePercent > this.thresholds.memoryUsage.critical ||
      metrics.eventLoopDelay > this.thresholds.eventLoopDelay.critical
    ) {
      return 'critical';
    }
    
    if (
      memoryUsagePercent > this.thresholds.memoryUsage.warning ||
      metrics.eventLoopDelay > this.thresholds.eventLoopDelay.warning
    ) {
      return 'warning';
    }
    
    return 'healthy';
  }

  /**
   * 트렌드 계산
   */
  private calculateTrends(): any {
    const hourlyData = this.metricsHistory.hourly;
    if (hourlyData.length < 2) return null;

    const recent = hourlyData.slice(-6); // 최근 6개 시점
    const older = hourlyData.slice(-12, -6); // 이전 6개 시점

    if (recent.length === 0 || older.length === 0) return null;

    const recentAvg = recent.reduce((sum, m) => sum + (m.memoryUsage.heapUsed / m.memoryUsage.heapTotal), 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + (m.memoryUsage.heapUsed / m.memoryUsage.heapTotal), 0) / older.length;

    return {
      memoryTrend: recentAvg > olderAvg ? 'increasing' : 'decreasing',
      memoryChange: ((recentAvg - olderAvg) * 100).toFixed(2) + '%'
    };
  }

  /**
   * 권장사항 생성
   */
  private generateRecommendations(metrics: PerformanceMetrics, alerts: any[]): string[] {
    const recommendations: string[] = [];
    const memoryUsagePercent = metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal;

    if (memoryUsagePercent > 0.8) {
      recommendations.push('메모리 사용률이 80%를 초과했습니다. 메모리 누수를 확인하세요.');
    }

    if (metrics.eventLoopDelay > 10) {
      recommendations.push('Event Loop 지연이 감지되었습니다. CPU 집약적인 작업을 확인하세요.');
    }

    if (alerts.length > 10) {
      recommendations.push('알림이 빈번하게 발생하고 있습니다. 임계값을 재검토하세요.');
    }

    if (metrics.activeHandles > 1000) {
      recommendations.push('활성 핸들 수가 많습니다. 리소스 정리를 확인하세요.');
    }

    return recommendations;
  }

  // Public API Methods

  /**
   * 현재 성능 지표 조회
   */
  async getCurrentMetrics(): Promise<PerformanceMetrics> {
    const realtimeData = await this.redisService.lrange('performance:realtime', 0, 0);
    if (realtimeData.length > 0) {
      return JSON.parse(realtimeData[0]);
    }

    // 실시간 데이터가 없으면 현재 지표 수집
    return {
      timestamp: new Date(),
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      eventLoopDelay: await this.measureEventLoopDelay(),
      activeHandles: (process as any)._getActiveHandles().length,
      activeRequests: (process as any)._getActiveRequests().length,
      uptime: process.uptime(),
      requestsPerSecond: 0,
      errorRate: 0
    };
  }

  /**
   * 히스토리 조회
   */
  getMetricsHistory(period: 'hourly' | 'daily' | 'weekly' = 'hourly'): PerformanceMetrics[] {
    return this.metricsHistory[period];
  }

  /**
   * 최근 알림 조회
   */
  async getRecentAlerts(hours: number = 24): Promise<any[]> {
    try {
      const alertsData = await this.redisService.lrange('performance:alerts', 0, -1);
      const alerts = alertsData.map(data => JSON.parse(data));
      
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      return alerts.filter(alert => new Date(alert.timestamp) >= cutoff);
    } catch (error) {
      logWithContext('error', '최근 알림 조회 실패:', error);
      return [];
    }
  }

  /**
   * 임계값 설정
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
    logWithContext('info', '성능 임계값이 업데이트되었습니다.', thresholds);
  }

  /**
   * 알림 설정 업데이트
   */
  updateAlertConfig(configs: AlertConfig[]): void {
    this.alertConfigs = configs;
    logWithContext('info', '알림 설정이 업데이트되었습니다.');
  }

  /**
   * 성능 대시보드 데이터 조회
   */
  async getDashboardData(): Promise<{
    current: PerformanceMetrics;
    history: PerformanceHistory;
    alerts: any[];
    status: string;
    trends: any;
    recommendations: string[];
  }> {
    const current = await this.getCurrentMetrics();
    const alerts = await this.getRecentAlerts(24);
    const trends = this.calculateTrends();
    const recommendations = this.generateRecommendations(current, alerts);

    return {
      current,
      history: this.metricsHistory,
      alerts,
      status: this.getSystemStatus(current),
      trends,
      recommendations
    };
  }
}

// 싱글톤 인스턴스 export
export const performanceMonitoringService = PerformanceMonitoringService.getInstance();