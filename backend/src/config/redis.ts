import { createClient, RedisClientType } from 'redis';

// Redis 클라이언트 인스턴스
let redisClient: RedisClientType;

// Redis 연결 설정
export async function connectRedis(): Promise<void> {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = createClient({
      url: redisUrl,
      socket: {
        connectTimeout: 5000,
        // lazyConnect 옵션은 최신 버전에서 제거됨
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            console.error('Redis 재연결 시도 횟수 초과');
            return false;
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    // Redis 이벤트 리스너
    redisClient.on('error', (error) => {
      console.error('Redis 연결 오류:', error);
    });

    redisClient.on('connect', () => {
      console.log('Redis 연결 시도 중...');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis 연결 준비 완료');
    });

    redisClient.on('end', () => {
      console.log('Redis 연결 종료');
    });

    redisClient.on('reconnecting', () => {
      console.log('Redis 재연결 중...');
    });

    // Redis 연결
    await redisClient.connect();
    
    // 연결 테스트
    await redisClient.ping();
    console.log('✅ Redis 연결 성공');

  } catch (error) {
    console.error('❌ Redis 연결 실패:', error);
    throw error;
  }
}

// Redis 연결 종료
export async function disconnectRedis(): Promise<void> {
  try {
    if (redisClient && redisClient.isOpen) {
      await redisClient.quit();
      console.log('Redis 연결 종료 완료');
    }
  } catch (error) {
    console.error('Redis 연결 종료 실패:', error);
    throw error;
  }
}

// Redis 클라이언트 반환
export function getRedisClient(): RedisClientType {
  if (!redisClient || !redisClient.isOpen) {
    throw new Error('Redis 클라이언트가 연결되지 않았습니다.');
  }
  return redisClient;
}

// 캐시 관련 유틸리티 함수들
export class RedisCache {
  private static client: RedisClientType;

  static initialize(client: RedisClientType) {
    this.client = client;
  }

  // 데이터 저장 (TTL 포함)
  static async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    try {
      const serializedValue = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.setEx(key, ttlSeconds, serializedValue);
      } else {
        await this.client.set(key, serializedValue);
      }
    } catch (error) {
      console.error(`Redis SET 오류 (key: ${key}):`, error);
      throw error;
    }
  }

  // 데이터 조회
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis GET 오류 (key: ${key}):`, error);
      return null;
    }
  }

  // 데이터 삭제
  static async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (error) {
      console.error(`Redis DEL 오류 (key: ${key}):`, error);
      throw error;
    }
  }

  // 키 존재 확인
  static async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`Redis EXISTS 오류 (key: ${key}):`, error);
      return false;
    }
  }

  // TTL 설정
  static async expire(key: string, seconds: number): Promise<void> {
    try {
      await this.client.expire(key, seconds);
    } catch (error) {
      console.error(`Redis EXPIRE 오류 (key: ${key}):`, error);
      throw error;
    }
  }

  // 패턴으로 키 검색
  static async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error(`Redis KEYS 오류 (pattern: ${pattern}):`, error);
      return [];
    }
  }

  // Hash 데이터 저장
  static async hSet(key: string, field: string, value: any): Promise<void> {
    try {
      await this.client.hSet(key, field, JSON.stringify(value));
    } catch (error) {
      console.error(`Redis HSET 오류 (key: ${key}, field: ${field}):`, error);
      throw error;
    }
  }

  // Hash 데이터 조회
  static async hGet<T>(key: string, field: string): Promise<T | null> {
    try {
      const value = await this.client.hGet(key, field);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Redis HGET 오류 (key: ${key}, field: ${field}):`, error);
      return null;
    }
  }

  // Hash 전체 데이터 조회
  static async hGetAll<T>(key: string): Promise<Record<string, T>> {
    try {
      const data = await this.client.hGetAll(key);
      const result: Record<string, T> = {};
      
      for (const [field, value] of Object.entries(data)) {
        result[field] = JSON.parse(value);
      }
      
      return result;
    } catch (error) {
      console.error(`Redis HGETALL 오류 (key: ${key}):`, error);
      return {};
    }
  }
}

// 세션 관리 클래스
export class SessionManager {
  private static readonly SESSION_PREFIX = 'session:';
  private static readonly DEFAULT_TTL = 24 * 60 * 60; // 24시간

  // 세션 생성
  static async createSession(userId: string, sessionData: any, ttlSeconds?: number): Promise<string> {
    const sessionId = `${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const sessionKey = this.SESSION_PREFIX + sessionId;
    
    await RedisCache.set(sessionKey, {
      userId,
      ...sessionData,
      createdAt: new Date().toISOString()
    }, ttlSeconds || this.DEFAULT_TTL);
    
    return sessionId;
  }

  // 세션 조회
  static async getSession(sessionId: string): Promise<any | null> {
    const sessionKey = this.SESSION_PREFIX + sessionId;
    return await RedisCache.get(sessionKey);
  }

  // 세션 업데이트
  static async updateSession(sessionId: string, sessionData: any, ttlSeconds?: number): Promise<void> {
    const sessionKey = this.SESSION_PREFIX + sessionId;
    const existingSession = await this.getSession(sessionId);
    
    if (existingSession) {
      await RedisCache.set(sessionKey, {
        ...existingSession,
        ...sessionData,
        updatedAt: new Date().toISOString()
      }, ttlSeconds || this.DEFAULT_TTL);
    }
  }

  // 세션 삭제
  static async deleteSession(sessionId: string): Promise<void> {
    const sessionKey = this.SESSION_PREFIX + sessionId;
    await RedisCache.del(sessionKey);
  }

  // 사용자의 모든 세션 삭제
  static async deleteUserSessions(userId: string): Promise<void> {
    const pattern = `${this.SESSION_PREFIX}${userId}_*`;
    const keys = await RedisCache.keys(pattern);
    
    for (const key of keys) {
      await RedisCache.del(key);
    }
  }
  
  // 사용자의 모든 세션 조회
  static async getUserSessions(userId: string): Promise<any[]> {
    const pattern = `${this.SESSION_PREFIX}${userId}_*`;
    const keys = await RedisCache.keys(pattern);
    const sessions = [];
    
    for (const key of keys) {
      const session = await RedisCache.get(key);
      if (session) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }
  
  // 특정 세션 업데이트 (리프레시 토큰으로 찾기)
  static async updateUserSession(userId: string, oldRefreshToken: string, data: any): Promise<void> {
    const pattern = `${this.SESSION_PREFIX}${userId}_*`;
    const keys = await RedisCache.keys(pattern);
    
    for (const key of keys) {
      const session = await RedisCache.get<any>(key);
      if (session && session.refreshToken === oldRefreshToken) {
        await RedisCache.set(key, {
          ...session,
          ...data,
          updatedAt: new Date().toISOString()
        }, this.DEFAULT_TTL);
        return;
      }
    }
    
    throw new Error('세션을 찾을 수 없습니다.');
  }
}