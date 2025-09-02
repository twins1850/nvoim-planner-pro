import mongoose from 'mongoose';
import { RedisService } from './redisService';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { performance } from 'perf_hooks';
import { logWithContext } from '../utils/logger';

/**
 * 성능 최적화 서비스
 * 데이터베이스 쿼리, 캐싱, 메모리 사용량 등을 최적화합니다.
 */
export class PerformanceOptimizationService {
  private static redisService: RedisService;
  private static queryCache: Map<string, any> = new Map();
  private static cacheStats = {
    hits: 0,
    misses: 0,
    totalQueries: 0
  };

  /**
   * 서비스 초기화
   */
  static async initialize(): Promise<void> {
    try {
      this.redisService = RedisService.getInstance();
      
      // MongoDB 연결 최적화 설정
      await this.optimizeMongoConnection();
      
      // 인덱스 성능 모니터링 시작
      await this.startIndexMonitoring();
      
      logWithContext('info', '성능 최적화 서비스가 초기화되었습니다.');
    } catch (error) {
      logWithContext('error', '성능 최적화 서비스 초기화 실패:', error);
      throw new AppError(
        '성능 최적화 서비스 초기화에 실패했습니다.',
        ErrorType.SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * MongoDB 연결 최적화
   */
  private static async optimizeMongoConnection(): Promise<void> {
    try {
      // 연결 풀 최적화
      mongoose.connection.on('connected', () => {
        logWithContext('info', 'MongoDB 연결이 최적화되었습니다.');
      });

      // 느린 쿼리 모니터링 설정
      mongoose.connection.db?.admin().command({
        profile: 2, // 모든 작업을 프로파일링
        slowms: 100, // 100ms 이상의 쿼리를 느린 쿼리로 분류
        sampleRate: 1.0
      });

      logWithContext('info', 'MongoDB 연결 최적화 설정이 완료되었습니다.');
    } catch (error) {
      logWithContext('warn', 'MongoDB 연결 최적화 설정 중 오류:', error);
    }
  }

  /**
   * 인덱스 성능 모니터링 시작
   */
  private static async startIndexMonitoring(): Promise<void> {
    try {
      setInterval(async () => {
        await this.analyzeIndexUsage();
      }, 300000); // 5분마다 분석

      logWithContext('info', '인덱스 성능 모니터링이 시작되었습니다.');
    } catch (error) {
      logWithContext('error', '인덱스 성능 모니터링 시작 실패:', error);
    }
  }

  /**
   * 인덱스 사용량 분석
   */
  private static async analyzeIndexUsage(): Promise<void> {
    try {
      const collections = ['lessons', 'homeworks', 'homeworksubmissions', 'users', 'notifications'];
      
      for (const collectionName of collections) {
        const stats = await mongoose.connection.db?.collection(collectionName).indexStats().toArray();
        
        if (stats) {
          const unusedIndexes = stats.filter(stat => stat.accesses.ops === 0);
          
          if (unusedIndexes.length > 0) {
            logWithContext('warn', `미사용 인덱스 발견 - ${collectionName}:`, {
              unusedIndexes: unusedIndexes.map(idx => idx.name)
            });
          }
        }
      }
    } catch (error) {
      logWithContext('error', '인덱스 사용량 분석 실패:', error);
    }
  }

  /**
   * 쿼리 성능 최적화를 위한 래퍼
   */
  static async optimizedQuery<T>(
    queryName: string,
    queryFunction: () => Promise<T>,
    cacheTTL: number = 300000 // 5분 기본 캐시
  ): Promise<T> {
    const startTime = performance.now();
    const cacheKey = `query:${queryName}`;
    
    try {
      this.cacheStats.totalQueries++;
      
      // Redis 캐시에서 확인
      const cachedResult = await this.redisService.get(cacheKey);
      if (cachedResult) {
        this.cacheStats.hits++;
        const endTime = performance.now();
        
        logWithContext('debug', `캐시된 쿼리 실행: ${queryName}`, {
          duration: `${(endTime - startTime).toFixed(2)}ms`,
          cacheHit: true
        });
        
        return JSON.parse(cachedResult);
      }

      // 메모리 캐시에서 확인
      if (this.queryCache.has(cacheKey)) {
        this.cacheStats.hits++;
        const endTime = performance.now();
        
        logWithContext('debug', `메모리 캐시된 쿼리 실행: ${queryName}`, {
          duration: `${(endTime - startTime).toFixed(2)}ms`,
          memoryCache: true
        });
        
        return this.queryCache.get(cacheKey);
      }

      // 실제 쿼리 실행
      this.cacheStats.misses++;
      const result = await queryFunction();
      const endTime = performance.now();
      const duration = endTime - startTime;

      // 결과를 캐시에 저장
      await this.redisService.setex(cacheKey, Math.floor(cacheTTL / 1000), JSON.stringify(result));
      this.queryCache.set(cacheKey, result);

      // 메모리 캐시 크기 제한 (최대 1000개)
      if (this.queryCache.size > 1000) {
        const firstKey = this.queryCache.keys().next().value;
        this.queryCache.delete(firstKey);
      }

      logWithContext('debug', `쿼리 실행 완료: ${queryName}`, {
        duration: `${duration.toFixed(2)}ms`,
        cached: false,
        slow: duration > 100
      });

      // 느린 쿼리 경고
      if (duration > 1000) {
        logWithContext('warn', `느린 쿼리 감지: ${queryName}`, {
          duration: `${duration.toFixed(2)}ms`
        });
      }

      return result;
    } catch (error) {
      const endTime = performance.now();
      logWithContext('error', `쿼리 실행 실패: ${queryName}`, {
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        error
      });
      throw error;
    }
  }

  /**
   * 집계 쿼리 최적화
   */
  static async optimizedAggregate<T>(
    collection: mongoose.Model<any>,
    pipeline: mongoose.PipelineStage[],
    queryName: string,
    cacheTTL: number = 300000
  ): Promise<T[]> {
    return this.optimizedQuery(
      `aggregate:${queryName}`,
      async () => {
        // 집계 파이프라인 최적화
        const optimizedPipeline = this.optimizeAggregationPipeline(pipeline);
        return collection.aggregate(optimizedPipeline).allowDiskUse(true).exec();
      },
      cacheTTL
    );
  }

  /**
   * 집계 파이프라인 최적화
   */
  private static optimizeAggregationPipeline(pipeline: mongoose.PipelineStage[]): mongoose.PipelineStage[] {
    const optimized = [...pipeline];
    
    // $match 스테이지를 가능한 한 앞으로 이동
    const matchStages = optimized.filter(stage => stage.$match);
    const otherStages = optimized.filter(stage => !stage.$match);
    
    // $sort 뒤에 $limit이 있는지 확인하고 최적화
    for (let i = 0; i < optimized.length - 1; i++) {
      if (optimized[i].$sort && optimized[i + 1].$limit) {
        // $sort + $limit은 MongoDB에서 자동으로 최적화됨
        break;
      }
    }
    
    return [...matchStages, ...otherStages];
  }

  /**
   * 페이지네이션 최적화
   */
  static async optimizedPagination<T>(
    model: mongoose.Model<T>,
    query: any,
    options: {
      page: number;
      limit: number;
      sort?: any;
      populate?: string | string[];
      select?: string;
    },
    queryName: string
  ): Promise<{
    data: T[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> {
    const { page, limit, sort = { createdAt: -1 }, populate, select } = options;
    const skip = (page - 1) * limit;

    const cacheKey = `pagination:${queryName}:${JSON.stringify({ query, page, limit, sort })}`;
    
    return this.optimizedQuery(
      cacheKey,
      async () => {
        // 병렬로 데이터와 총 개수 조회
        const [data, totalCount] = await Promise.all([
          (() => {
            let queryBuilder = model.find(query).sort(sort).skip(skip).limit(limit);
            
            if (select) {
              queryBuilder = queryBuilder.select(select);
            }
            
            if (populate) {
              if (Array.isArray(populate)) {
                populate.forEach(pop => {
                  queryBuilder = queryBuilder.populate(pop);
                });
              } else {
                queryBuilder = queryBuilder.populate(populate);
              }
            }
            
            return queryBuilder.lean().exec();
          })(),
          model.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCount / limit);
        
        return {
          data,
          totalCount,
          totalPages,
          currentPage: page,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        };
      },
      180000 // 3분 캐시
    );
  }

  /**
   * 캐시 무효화
   */
  static async invalidateCache(pattern: string): Promise<void> {
    try {
      // Redis 캐시 무효화
      const keys = await this.redisService.keys(`*${pattern}*`);
      if (keys.length > 0) {
        await this.redisService.del(...keys);
      }

      // 메모리 캐시 무효화
      for (const [key] of this.queryCache) {
        if (key.includes(pattern)) {
          this.queryCache.delete(key);
        }
      }

      logWithContext('debug', `캐시 무효화 완료: ${pattern}`, {
        redisKeysDeleted: keys.length,
        memoryKeysRemaining: this.queryCache.size
      });
    } catch (error) {
      logWithContext('error', '캐시 무효화 실패:', error);
    }
  }

  /**
   * 캐시 통계 조회
   */
  static getCacheStats(): {
    hits: number;
    misses: number;
    totalQueries: number;
    hitRate: number;
    memorySize: number;
  } {
    const hitRate = this.cacheStats.totalQueries > 0 
      ? (this.cacheStats.hits / this.cacheStats.totalQueries) * 100 
      : 0;

    return {
      ...this.cacheStats,
      hitRate: Math.round(hitRate * 100) / 100,
      memorySize: this.queryCache.size
    };
  }

  /**
   * 메모리 사용량 최적화
   */
  static async optimizeMemoryUsage(): Promise<void> {
    try {
      // 메모리 캐시 정리
      const memoryUsage = process.memoryUsage();
      const maxHeapSize = memoryUsage.heapTotal * 0.8; // 힙의 80% 이상 사용 시 정리
      
      if (memoryUsage.heapUsed > maxHeapSize) {
        // 캐시 크기를 절반으로 줄임
        const cacheSize = this.queryCache.size;
        const keysToDelete = Array.from(this.queryCache.keys()).slice(0, Math.floor(cacheSize / 2));
        
        keysToDelete.forEach(key => this.queryCache.delete(key));
        
        // 가비지 컬렉션 강제 실행
        if (global.gc) {
          global.gc();
        }
        
        logWithContext('info', '메모리 사용량 최적화 완료:', {
          beforeCacheSize: cacheSize,
          afterCacheSize: this.queryCache.size,
          memoryUsage: {
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`
          }
        });
      }
    } catch (error) {
      logWithContext('error', '메모리 사용량 최적화 실패:', error);
    }
  }

  /**
   * 데이터베이스 연결 상태 최적화
   */
  static async optimizeDbConnections(): Promise<void> {
    try {
      const connectionStats = {
        readyState: mongoose.connection.readyState,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        name: mongoose.connection.name
      };

      // 연결이 끊어진 경우 재연결
      if (mongoose.connection.readyState !== 1) {
        logWithContext('warn', 'MongoDB 연결 상태 불량, 재연결 시도:', connectionStats);
        await mongoose.connect(process.env.MONGODB_URI || '');
      }

      logWithContext('debug', 'MongoDB 연결 상태:', connectionStats);
    } catch (error) {
      logWithContext('error', '데이터베이스 연결 최적화 실패:', error);
    }
  }

  /**
   * 주기적인 성능 최적화 작업 실행
   */
  static startPeriodicOptimization(): void {
    // 10분마다 메모리 최적화
    setInterval(() => {
      this.optimizeMemoryUsage();
    }, 600000);

    // 30분마다 DB 연결 최적화
    setInterval(() => {
      this.optimizeDbConnections();
    }, 1800000);

    // 1시간마다 캐시 통계 로그
    setInterval(() => {
      const stats = this.getCacheStats();
      logWithContext('info', '캐시 성능 통계:', stats);
    }, 3600000);

    logWithContext('info', '주기적 성능 최적화 작업이 시작되었습니다.');
  }

  /**
   * 쿼리 성능 분석 리포트 생성
   */
  static async generatePerformanceReport(): Promise<{
    cacheStats: any;
    memoryUsage: NodeJS.MemoryUsage;
    dbStats: any;
    recommendations: string[];
  }> {
    try {
      const cacheStats = this.getCacheStats();
      const memoryUsage = process.memoryUsage();
      
      // 데이터베이스 통계
      const dbStats = await mongoose.connection.db?.stats();
      
      // 성능 개선 권장사항 생성
      const recommendations: string[] = [];
      
      if (cacheStats.hitRate < 70) {
        recommendations.push('캐시 적중률이 낮습니다. 캐시 TTL을 늘리거나 캐시 전략을 재검토하세요.');
      }
      
      if (memoryUsage.heapUsed / memoryUsage.heapTotal > 0.8) {
        recommendations.push('메모리 사용률이 높습니다. 메모리 캐시 크기를 줄이거나 가비지 컬렉션을 고려하세요.');
      }
      
      if (this.queryCache.size > 800) {
        recommendations.push('메모리 캐시 크기가 큽니다. 캐시 정리 주기를 단축하세요.');
      }

      return {
        cacheStats,
        memoryUsage,
        dbStats,
        recommendations
      };
    } catch (error) {
      logWithContext('error', '성능 리포트 생성 실패:', error);
      throw new AppError(
        '성능 리포트 생성에 실패했습니다.',
        ErrorType.SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }
}

// 인스턴스 생성
export const performanceOptimizationService = PerformanceOptimizationService;