import { performance } from 'perf_hooks';
import { logWithContext } from '../utils/logger';
import { AppError, ErrorType } from '../middleware/errorHandler';

interface MemoryMetrics {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
  timestamp: Date;
}

interface MemoryPool<T> {
  objects: T[];
  factory: () => T;
  reset: (obj: T) => void;
  maxSize: number;
  currentSize: number;
}

/**
 * 메모리 사용 최적화 서비스
 * 메모리 누수 방지, 객체 풀링, 가비지 컬렉션 최적화 등을 제공합니다.
 */
export class MemoryOptimizationService {
  private static memoryHistory: MemoryMetrics[] = [];
  private static objectPools: Map<string, MemoryPool<any>> = new Map();
  private static memoryThresholds = {
    warning: 0.75, // 75% 사용 시 경고
    critical: 0.85, // 85% 사용 시 위험
    emergency: 0.95 // 95% 사용 시 긴급
  };

  // WeakMap을 사용한 메모리 효율적 참조 관리
  private static weakRefs: WeakMap<object, any> = new WeakMap();
  private static cleanupTasks: Set<() => Promise<void>> = new Set();

  /**
   * 서비스 초기화
   */
  static async initialize(): Promise<void> {
    try {
      // 주기적 메모리 모니터링 시작
      this.startMemoryMonitoring();
      
      // 가비지 컬렉션 최적화 시작
      this.startGCOptimization();
      
      // 메모리 누수 감지 시작
      this.startMemoryLeakDetection();
      
      logWithContext('info', '메모리 최적화 서비스가 초기화되었습니다.');
    } catch (error) {
      logWithContext('error', '메모리 최적화 서비스 초기화 실패:', error);
      throw new AppError(
        '메모리 최적화 서비스 초기화에 실패했습니다.',
        ErrorType.SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 객체 풀 생성 및 관리
   */
  static createObjectPool<T>(
    name: string,
    factory: () => T,
    reset: (obj: T) => void,
    maxSize: number = 100
  ): void {
    const pool: MemoryPool<T> = {
      objects: [],
      factory,
      reset,
      maxSize,
      currentSize: 0
    };

    this.objectPools.set(name, pool);
    logWithContext('debug', `객체 풀 생성: ${name} (최대 ${maxSize}개)`);
  }

  /**
   * 객체 풀에서 객체 가져오기
   */
  static borrowFromPool<T>(poolName: string): T | null {
    const pool = this.objectPools.get(poolName) as MemoryPool<T>;
    if (!pool) {
      logWithContext('warn', `존재하지 않는 객체 풀: ${poolName}`);
      return null;
    }

    if (pool.objects.length > 0) {
      const obj = pool.objects.pop()!;
      pool.currentSize--;
      return obj;
    }

    // 풀이 비어있으면 새 객체 생성
    return pool.factory();
  }

  /**
   * 객체 풀에 객체 반환
   */
  static returnToPool<T>(poolName: string, obj: T): void {
    const pool = this.objectPools.get(poolName) as MemoryPool<T>;
    if (!pool) {
      logWithContext('warn', `존재하지 않는 객체 풀: ${poolName}`);
      return;
    }

    if (pool.currentSize < pool.maxSize) {
      pool.reset(obj);
      pool.objects.push(obj);
      pool.currentSize++;
    }
    // 풀이 가득 차면 객체를 버림 (GC가 처리)
  }

  /**
   * 스트림 기반 데이터 처리 (메모리 효율적)
   */
  static async processLargeDataStream<T, R>(
    data: T[],
    processor: (chunk: T[]) => Promise<R>,
    chunkSize: number = 1000
  ): Promise<R[]> {
    const results: R[] = [];
    
    try {
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const result = await processor(chunk);
        results.push(result);
        
        // 각 청크 처리 후 메모리 상태 확인
        if (this.isMemoryPressureHigh()) {
          await this.performEmergencyCleanup();
        }
        
        // 다음 청크 처리 전에 Event Loop에 양보
        await new Promise(resolve => setImmediate(resolve));
      }
      
      return results;
    } catch (error) {
      logWithContext('error', '대용량 데이터 스트림 처리 실패:', error);
      throw error;
    }
  }

  /**
   * 메모리 효율적 배치 처리
   */
  static async processBatch<T>(
    items: T[],
    processor: (item: T) => Promise<void>,
    batchSize: number = 50,
    delayMs: number = 10
  ): Promise<void> {
    try {
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        await Promise.all(batch.map(processor));
        
        // 배치 간 지연으로 메모리 압박 완화
        if (delayMs > 0 && i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
        // 메모리 압박 시 즉시 정리
        if (this.isMemoryPressureHigh()) {
          await this.performEmergencyCleanup();
        }
      }
    } catch (error) {
      logWithContext('error', '배치 처리 실패:', error);
      throw error;
    }
  }

  /**
   * 버퍼 풀 관리 (파일 처리용)
   */
  static getBuffer(size: number): Buffer {
    const poolName = `buffer_${size}`;
    let buffer = this.borrowFromPool<Buffer>(poolName);
    
    if (!buffer) {
      // 해당 크기의 풀이 없으면 생성
      this.createObjectPool(
        poolName,
        () => Buffer.allocUnsafe(size),
        (buf) => buf.fill(0),
        10 // 각 크기별로 최대 10개까지 보관
      );
      buffer = Buffer.allocUnsafe(size);
    }
    
    return buffer;
  }

  /**
   * 버퍼 반환
   */
  static returnBuffer(buffer: Buffer): void {
    const poolName = `buffer_${buffer.length}`;
    this.returnToPool(poolName, buffer);
  }

  /**
   * WeakMap 기반 임시 데이터 저장
   */
  static setTemporaryData(key: object, data: any): void {
    this.weakRefs.set(key, data);
  }

  /**
   * 임시 데이터 조회
   */
  static getTemporaryData(key: object): any {
    return this.weakRefs.get(key);
  }

  /**
   * 정리 작업 등록
   */
  static registerCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.add(task);
  }

  /**
   * 정리 작업 해제
   */
  static unregisterCleanupTask(task: () => Promise<void>): void {
    this.cleanupTasks.delete(task);
  }

  /**
   * 즉시 정리 실행
   */
  static async performEmergencyCleanup(): Promise<void> {
    logWithContext('warn', '긴급 메모리 정리 시작');
    
    try {
      // 등록된 모든 정리 작업 실행
      const cleanupPromises = Array.from(this.cleanupTasks).map(task => 
        task().catch(error => logWithContext('error', '정리 작업 실패:', error))
      );
      
      await Promise.all(cleanupPromises);
      
      // 객체 풀 정리
      this.cleanupObjectPools();
      
      // 강제 가비지 컬렉션 (가능한 경우)
      if (global.gc) {
        global.gc();
      }
      
      logWithContext('info', '긴급 메모리 정리 완료');
    } catch (error) {
      logWithContext('error', '긴급 메모리 정리 실패:', error);
    }
  }

  /**
   * 메모리 압박 상태 확인
   */
  static isMemoryPressureHigh(): boolean {
    const memUsage = process.memoryUsage();
    const usageRatio = memUsage.heapUsed / memUsage.heapTotal;
    
    return usageRatio > this.memoryThresholds.warning;
  }

  /**
   * 메모리 사용량 최적화
   */
  static async optimizeMemoryUsage(): Promise<void> {
    try {
      const memUsage = process.memoryUsage();
      const usageRatio = memUsage.heapUsed / memUsage.heapTotal;
      
      if (usageRatio > this.memoryThresholds.critical) {
        logWithContext('warn', '높은 메모리 사용률 감지', {
          usageRatio: `${Math.round(usageRatio * 100)}%`,
          heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`
        });
        
        await this.performEmergencyCleanup();
      }
      
      // 객체 풀 크기 조정
      this.adjustObjectPoolSizes();
      
    } catch (error) {
      logWithContext('error', '메모리 사용량 최적화 실패:', error);
    }
  }

  /**
   * 메모리 누수 감지
   */
  private static startMemoryLeakDetection(): void {
    const initialMemory = process.memoryUsage();
    let suspiciousGrowth = 0;
    
    setInterval(() => {
      const currentMemory = process.memoryUsage();
      const growthRatio = currentMemory.heapUsed / initialMemory.heapUsed;
      
      if (growthRatio > 2) { // 초기 대비 2배 이상 증가
        suspiciousGrowth++;
        
        if (suspiciousGrowth >= 3) { // 연속 3회 이상
          logWithContext('warn', '메모리 누수 의심 상황', {
            initialHeap: `${Math.round(initialMemory.heapUsed / 1024 / 1024)}MB`,
            currentHeap: `${Math.round(currentMemory.heapUsed / 1024 / 1024)}MB`,
            growthRatio: `${Math.round(growthRatio * 100)}%`
          });
        }
      } else {
        suspiciousGrowth = Math.max(0, suspiciousGrowth - 1);
      }
    }, 300000); // 5분마다 확인
  }

  /**
   * 주기적 메모리 모니터링 시작
   */
  private static startMemoryMonitoring(): void {
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const metrics: MemoryMetrics = {
        ...memUsage,
        timestamp: new Date()
      };
      
      // 메모리 히스토리 관리 (최대 100개)
      this.memoryHistory.push(metrics);
      if (this.memoryHistory.length > 100) {
        this.memoryHistory.shift();
      }
      
      // 임계값 확인
      const usageRatio = memUsage.heapUsed / memUsage.heapTotal;
      
      if (usageRatio > this.memoryThresholds.emergency) {
        this.performEmergencyCleanup();
      } else if (usageRatio > this.memoryThresholds.critical) {
        this.optimizeMemoryUsage();
      }
      
    }, 60000); // 1분마다 모니터링
  }

  /**
   * 가비지 컬렉션 최적화
   */
  private static startGCOptimization(): void {
    // V8 가비지 컬렉션 최적화 힌트
    if (process.env.NODE_ENV === 'production') {
      process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + 
        ' --optimize-for-size --max-old-space-size=2048';
    }
    
    // 주기적 최적화 (개발 환경에서만)
    if (process.env.NODE_ENV !== 'production') {
      setInterval(() => {
        if (global.gc && this.isMemoryPressureHigh()) {
          const before = process.memoryUsage().heapUsed;
          global.gc();
          const after = process.memoryUsage().heapUsed;
          const freed = before - after;
          
          if (freed > 1024 * 1024) { // 1MB 이상 해제된 경우만 로그
            logWithContext('debug', '가비지 컬렉션 실행', {
              freedMemory: `${Math.round(freed / 1024 / 1024)}MB`
            });
          }
        }
      }, 120000); // 2분마다 확인
    }
  }

  /**
   * 객체 풀 정리
   */
  private static cleanupObjectPools(): void {
    for (const [name, pool] of this.objectPools) {
      // 각 풀의 크기를 절반으로 줄임
      const targetSize = Math.floor(pool.maxSize / 2);
      while (pool.objects.length > targetSize) {
        pool.objects.pop();
        pool.currentSize--;
      }
    }
  }

  /**
   * 객체 풀 크기 동적 조정
   */
  private static adjustObjectPoolSizes(): void {
    const memUsage = process.memoryUsage();
    const usageRatio = memUsage.heapUsed / memUsage.heapTotal;
    
    for (const [name, pool] of this.objectPools) {
      if (usageRatio > this.memoryThresholds.warning) {
        // 메모리 압박 시 풀 크기 축소
        pool.maxSize = Math.max(10, Math.floor(pool.maxSize * 0.8));
      } else if (usageRatio < 0.5) {
        // 메모리 여유 시 풀 크기 확장
        pool.maxSize = Math.min(200, Math.floor(pool.maxSize * 1.1));
      }
    }
  }

  /**
   * 메모리 통계 조회
   */
  static getMemoryStats(): {
    current: MemoryMetrics;
    history: MemoryMetrics[];
    pools: Array<{ name: string; currentSize: number; maxSize: number }>;
    thresholds: typeof MemoryOptimizationService.memoryThresholds;
    pressureLevel: 'low' | 'medium' | 'high' | 'critical';
  } {
    const current = {
      ...process.memoryUsage(),
      timestamp: new Date()
    };
    
    const usageRatio = current.heapUsed / current.heapTotal;
    let pressureLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (usageRatio > this.memoryThresholds.emergency) {
      pressureLevel = 'critical';
    } else if (usageRatio > this.memoryThresholds.critical) {
      pressureLevel = 'high';
    } else if (usageRatio > this.memoryThresholds.warning) {
      pressureLevel = 'medium';
    }
    
    const pools = Array.from(this.objectPools.entries()).map(([name, pool]) => ({
      name,
      currentSize: pool.currentSize,
      maxSize: pool.maxSize
    }));
    
    return {
      current,
      history: this.memoryHistory.slice(),
      pools,
      thresholds: this.memoryThresholds,
      pressureLevel
    };
  }

  /**
   * 메모리 보고서 생성
   */
  static generateMemoryReport(): {
    stats: ReturnType<typeof MemoryOptimizationService.getMemoryStats>;
    recommendations: string[];
    trends: {
      averageGrowth: number;
      peakUsage: number;
      gcEfficiency: number;
    };
  } {
    const stats = this.getMemoryStats();
    const recommendations: string[] = [];
    
    // 성능 개선 권장사항 생성
    if (stats.pressureLevel === 'critical') {
      recommendations.push('메모리 사용률이 위험 수준입니다. 즉시 최적화가 필요합니다.');
    } else if (stats.pressureLevel === 'high') {
      recommendations.push('메모리 사용률이 높습니다. 불필요한 객체 참조를 제거하세요.');
    }
    
    const currentUsage = stats.current.heapUsed / stats.current.heapTotal;
    if (currentUsage > 0.8) {
      recommendations.push('힙 메모리 사용률이 80%를 초과합니다. Node.js 힙 크기 증가를 고려하세요.');
    }
    
    if (stats.pools.some(pool => pool.currentSize === pool.maxSize)) {
      recommendations.push('일부 객체 풀이 포화 상태입니다. 풀 크기 증가를 검토하세요.');
    }
    
    // 트렌드 분석
    const trends = {
      averageGrowth: 0,
      peakUsage: 0,
      gcEfficiency: 0
    };
    
    if (this.memoryHistory.length > 1) {
      const first = this.memoryHistory[0];
      const last = this.memoryHistory[this.memoryHistory.length - 1];
      trends.averageGrowth = (last.heapUsed - first.heapUsed) / first.heapUsed;
      trends.peakUsage = Math.max(...this.memoryHistory.map(m => m.heapUsed));
    }
    
    return {
      stats,
      recommendations,
      trends
    };
  }
}

// 인스턴스 생성
export const memoryOptimizationService = MemoryOptimizationService;