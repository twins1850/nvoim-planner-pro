import { RedisService } from './redisService';
import { logWithContext } from '../utils/logger';
import { AppError, ErrorType } from '../middleware/errorHandler';

/**
 * 고급 캐싱 전략 서비스
 * 다양한 캐싱 패턴과 전략을 제공합니다.
 */
export class CacheStrategyService {
  private static redisService: RedisService;
  private static localCache: Map<string, { value: any; expiry: number; hits: number }> = new Map();
  private static cacheStats = {
    totalRequests: 0,
    redisHits: 0,
    localHits: 0,
    misses: 0,
    errors: 0
  };

  /**
   * 서비스 초기화
   */
  static async initialize(): Promise<void> {
    try {
      this.redisService = RedisService.getInstance();
      
      // 주기적 로컬 캐시 정리
      this.startLocalCacheCleanup();
      
      logWithContext('info', '캐시 전략 서비스가 초기화되었습니다.');
    } catch (error) {
      logWithContext('error', '캐시 전략 서비스 초기화 실패:', error);
      throw new AppError(
        '캐시 전략 서비스 초기화에 실패했습니다.',
        ErrorType.SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * L1(로컬) + L2(Redis) 캐시 전략
   * 가장 빠른 조회를 위한 2단계 캐시
   */
  static async getWithL1L2Cache<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    options: {
      l1TTL?: number; // 로컬 캐시 TTL (기본: 1분)
      l2TTL?: number; // Redis 캐시 TTL (기본: 10분)
      strategy?: 'write-through' | 'write-behind' | 'cache-aside';
    } = {}
  ): Promise<T> {
    const { l1TTL = 60000, l2TTL = 600000, strategy = 'cache-aside' } = options;
    this.cacheStats.totalRequests++;

    try {
      // L1 캐시 (로컬 메모리) 확인
      const l1Data = this.getFromLocalCache(key);
      if (l1Data !== null) {
        this.cacheStats.localHits++;
        return l1Data;
      }

      // L2 캐시 (Redis) 확인
      const l2Data = await this.getFromRedisCache<T>(key);
      if (l2Data !== null) {
        this.cacheStats.redisHits++;
        // L1 캐시에도 저장 (백필)
        this.setToLocalCache(key, l2Data, l1TTL);
        return l2Data;
      }

      // 캐시 미스 - 원본 데이터 조회
      this.cacheStats.misses++;
      const data = await fetchFunction();

      // 캐싱 전략에 따른 저장
      await this.applyWriteStrategy(key, data, l1TTL, l2TTL, strategy);

      return data;
    } catch (error) {
      this.cacheStats.errors++;
      logWithContext('error', `L1L2 캐시 오류 - ${key}:`, error);
      throw error;
    }
  }

  /**
   * 시간 기반 캐시 무효화 (TTL 기반)
   */
  static async setWithTTL<T>(
    key: string,
    value: T,
    ttl: number,
    tier: 'l1' | 'l2' | 'both' = 'both'
  ): Promise<void> {
    try {
      if (tier === 'l1' || tier === 'both') {
        this.setToLocalCache(key, value, ttl);
      }

      if (tier === 'l2' || tier === 'both') {
        await this.setToRedisCache(key, value, ttl);
      }
    } catch (error) {
      logWithContext('error', `TTL 캐시 설정 실패 - ${key}:`, error);
    }
  }

  /**
   * 태그 기반 캐시 무효화
   */
  static async setWithTags<T>(
    key: string,
    value: T,
    tags: string[],
    ttl: number = 600000
  ): Promise<void> {
    try {
      // 값 저장
      await this.setToRedisCache(key, value, ttl);

      // 태그별 키 목록 관리
      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const existingKeys = await this.redisService.get(tagKey);
        const keyList = existingKeys ? JSON.parse(existingKeys) : [];
        
        if (!keyList.includes(key)) {
          keyList.push(key);
          await this.redisService.setex(tagKey, Math.floor(ttl / 1000) + 3600, JSON.stringify(keyList));
        }
      }

      logWithContext('debug', `태그 기반 캐시 저장: ${key}`, { tags });
    } catch (error) {
      logWithContext('error', `태그 기반 캐시 저장 실패 - ${key}:`, error);
    }
  }

  /**
   * 태그로 캐시 무효화
   */
  static async invalidateByTag(tag: string): Promise<void> {
    try {
      const tagKey = `tag:${tag}`;
      const existingKeys = await this.redisService.get(tagKey);
      
      if (existingKeys) {
        const keyList = JSON.parse(existingKeys);
        
        // 해당 태그의 모든 키 삭제
        for (const key of keyList) {
          await this.invalidate(key);
        }

        // 태그 키도 삭제
        await this.redisService.del(tagKey);

        logWithContext('info', `태그 기반 캐시 무효화 완료: ${tag}`, {
          invalidatedKeys: keyList.length
        });
      }
    } catch (error) {
      logWithContext('error', `태그 기반 캐시 무효화 실패 - ${tag}:`, error);
    }
  }

  /**
   * 조건부 캐시 (특정 조건에서만 캐싱)
   */
  static async getWithCondition<T>(
    key: string,
    fetchFunction: () => Promise<T>,
    condition: (data: T) => boolean,
    ttl: number = 300000
  ): Promise<T> {
    try {
      // 캐시에서 확인
      const cached = await this.getWithL1L2Cache(key, fetchFunction, { l2TTL: ttl });
      
      // 조건 확인 후 캐싱 결정
      if (condition(cached)) {
        return cached;
      } else {
        // 조건에 맞지 않으면 캐시에서 제거
        await this.invalidate(key);
        return cached;
      }
    } catch (error) {
      logWithContext('error', `조건부 캐시 오류 - ${key}:`, error);
      throw error;
    }
  }

  /**
   * 계층적 캐시 (부모-자식 관계)
   */
  static async getWithHierarchy<T>(
    key: string,
    parentKeys: string[],
    fetchFunction: () => Promise<T>,
    ttl: number = 300000
  ): Promise<T> {
    try {
      // 부모 키들이 유효한지 확인
      for (const parentKey of parentKeys) {
        const parentExists = await this.exists(parentKey);
        if (!parentExists) {
          // 부모 키가 없으면 현재 키도 무효화
          await this.invalidate(key);
          break;
        }
      }

      return await this.getWithL1L2Cache(key, fetchFunction, { l2TTL: ttl });
    } catch (error) {
      logWithContext('error', `계층적 캐시 오류 - ${key}:`, error);
      throw error;
    }
  }

  /**
   * 미리 예열 캐시 (Warm-up)
   */
  static async warmupCache<T>(
    keys: Array<{ key: string; fetchFunction: () => Promise<T>; ttl?: number }>
  ): Promise<{ successful: number; failed: number }> {
    let successful = 0;
    let failed = 0;

    const warmupPromises = keys.map(async ({ key, fetchFunction, ttl = 300000 }) => {
      try {
        const data = await fetchFunction();
        await this.setWithTTL(key, data, ttl, 'both');
        successful++;
      } catch (error) {
        failed++;
        logWithContext('error', `캐시 예열 실패 - ${key}:`, error);
      }
    });

    await Promise.all(warmupPromises);

    logWithContext('info', '캐시 예열 완료', { successful, failed });
    return { successful, failed };
  }

  /**
   * 캐시 키 존재 여부 확인
   */
  static async exists(key: string): Promise<boolean> {
    try {
      // L1 캐시 확인
      if (this.localCache.has(key)) {
        const entry = this.localCache.get(key)!;
        if (Date.now() <= entry.expiry) {
          return true;
        } else {
          this.localCache.delete(key);
        }
      }

      // L2 캐시 확인
      return (await this.redisService.exists(key)) > 0;
    } catch (error) {
      logWithContext('error', `캐시 존재 확인 오류 - ${key}:`, error);
      return false;
    }
  }

  /**
   * 캐시 무효화
   */
  static async invalidate(key: string): Promise<void> {
    try {
      // L1 캐시에서 제거
      this.localCache.delete(key);

      // L2 캐시에서 제거
      await this.redisService.del(key);

      logWithContext('debug', `캐시 무효화: ${key}`);
    } catch (error) {
      logWithContext('error', `캐시 무효화 실패 - ${key}:`, error);
    }
  }

  /**
   * 패턴 기반 캐시 무효화
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Redis 패턴 매칭
      const keys = await this.redisService.keys(pattern);
      if (keys.length > 0) {
        await this.redisService.del(...keys);
      }

      // 로컬 캐시 패턴 매칭
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      for (const key of this.localCache.keys()) {
        if (regex.test(key)) {
          this.localCache.delete(key);
        }
      }

      logWithContext('info', `패턴 기반 캐시 무효화: ${pattern}`, {
        redisKeysDeleted: keys.length
      });
    } catch (error) {
      logWithContext('error', `패턴 기반 캐시 무효화 실패 - ${pattern}:`, error);
    }
  }

  /**
   * 로컬 캐시 조회
   */
  private static getFromLocalCache<T>(key: string): T | null {
    const entry = this.localCache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.localCache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.value;
  }

  /**
   * 로컬 캐시 저장
   */
  private static setToLocalCache<T>(key: string, value: T, ttl: number): void {
    const entry = {
      value,
      expiry: Date.now() + ttl,
      hits: 0
    };

    this.localCache.set(key, entry);

    // 메모리 제한 (최대 1000개 항목)
    if (this.localCache.size > 1000) {
      const firstKey = this.localCache.keys().next().value;
      this.localCache.delete(firstKey);
    }
  }

  /**
   * Redis 캐시 조회
   */
  private static async getFromRedisCache<T>(key: string): Promise<T | null> {
    try {
      const data = await this.redisService.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logWithContext('error', `Redis 캐시 조회 실패 - ${key}:`, error);
      return null;
    }
  }

  /**
   * Redis 캐시 저장
   */
  private static async setToRedisCache<T>(key: string, value: T, ttl: number): Promise<void> {
    try {
      await this.redisService.setex(key, Math.floor(ttl / 1000), JSON.stringify(value));
    } catch (error) {
      logWithContext('error', `Redis 캐시 저장 실패 - ${key}:`, error);
    }
  }

  /**
   * 쓰기 전략 적용
   */
  private static async applyWriteStrategy<T>(
    key: string,
    data: T,
    l1TTL: number,
    l2TTL: number,
    strategy: 'write-through' | 'write-behind' | 'cache-aside'
  ): Promise<void> {
    switch (strategy) {
      case 'write-through':
        // 즉시 L1, L2 모두에 저장
        await Promise.all([
          this.setToLocalCache(key, data, l1TTL),
          this.setToRedisCache(key, data, l2TTL)
        ]);
        break;

      case 'write-behind':
        // L1에 즉시 저장, L2는 비동기로 저장
        this.setToLocalCache(key, data, l1TTL);
        setImmediate(() => this.setToRedisCache(key, data, l2TTL));
        break;

      case 'cache-aside':
      default:
        // 필요 시에만 저장 (현재 요청에 대해 저장)
        this.setToLocalCache(key, data, l1TTL);
        await this.setToRedisCache(key, data, l2TTL);
        break;
    }
  }

  /**
   * 로컬 캐시 정리 시작
   */
  private static startLocalCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      let deletedCount = 0;

      for (const [key, entry] of this.localCache) {
        if (now > entry.expiry) {
          this.localCache.delete(key);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logWithContext('debug', `로컬 캐시 정리: ${deletedCount}개 항목 삭제`);
      }
    }, 60000); // 1분마다 정리
  }

  /**
   * 캐시 통계 조회
   */
  static getCacheStats(): {
    totalRequests: number;
    redisHits: number;
    localHits: number;
    misses: number;
    errors: number;
    hitRate: number;
    localCacheSize: number;
  } {
    const totalHits = this.cacheStats.redisHits + this.cacheStats.localHits;
    const hitRate = this.cacheStats.totalRequests > 0 
      ? (totalHits / this.cacheStats.totalRequests) * 100 
      : 0;

    return {
      ...this.cacheStats,
      hitRate: Math.round(hitRate * 100) / 100,
      localCacheSize: this.localCache.size
    };
  }

  /**
   * 캐시 성능 보고서 생성
   */
  static generateCacheReport(): {
    stats: ReturnType<typeof CacheStrategyService.getCacheStats>;
    recommendations: string[];
    topHitKeys: Array<{ key: string; hits: number }>;
  } {
    const stats = this.getCacheStats();
    const recommendations: string[] = [];

    // 성능 개선 권장사항 생성
    if (stats.hitRate < 70) {
      recommendations.push('캐시 적중률이 70% 미만입니다. TTL 설정을 검토하거나 캐싱 전략을 재고해보세요.');
    }

    if (stats.errors / stats.totalRequests > 0.05) {
      recommendations.push('캐시 오류율이 5%를 초과합니다. Redis 연결 상태를 확인하세요.');
    }

    if (stats.localCacheSize > 800) {
      recommendations.push('로컬 캐시 크기가 큽니다. 메모리 사용량을 모니터링하세요.');
    }

    if (stats.misses / stats.totalRequests > 0.5) {
      recommendations.push('캐시 미스율이 50%를 초과합니다. 캐시 키 설계를 재검토하세요.');
    }

    // 인기 있는 캐시 키 분석
    const topHitKeys = Array.from(this.localCache.entries())
      .map(([key, entry]) => ({ key, hits: entry.hits }))
      .sort((a, b) => b.hits - a.hits)
      .slice(0, 10);

    return {
      stats,
      recommendations,
      topHitKeys
    };
  }
}

// 인스턴스 생성
export const cacheStrategyService = CacheStrategyService;