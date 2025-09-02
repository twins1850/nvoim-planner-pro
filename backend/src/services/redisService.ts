/**
 * Redis 서비스
 * 캐싱 및 세션 관리를 위한 Redis 클라이언트 래퍼
 */

import { getRedisClient } from '../config/redis';
import logger from '../utils/logger';

export class RedisService {
  private static client: any;

  static async initialize() {
    try {
      this.client = getRedisClient();
      logger.info('Redis 서비스 초기화 완료');
    } catch (error) {
      logger.error('Redis 서비스 초기화 실패:', error);
      throw error;
    }
  }

  static async get(key: string): Promise<string | null> {
    try {
      if (!this.client) {
        this.client = getRedisClient();
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Redis GET 오류 (${key}):`, error);
      return null;
    }
  }

  static async set(key: string, value: string, ttl?: number): Promise<boolean> {
    try {
      if (!this.client) {
        this.client = getRedisClient();
      }
      
      if (ttl) {
        await this.client.setEx(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      logger.error(`Redis SET 오류 (${key}):`, error);
      return false;
    }
  }

  static async del(key: string): Promise<boolean> {
    try {
      if (!this.client) {
        this.client = getRedisClient();
      }
      await this.client.del(key);
      return true;
    } catch (error) {
      logger.error(`Redis DEL 오류 (${key}):`, error);
      return false;
    }
  }

  static async exists(key: string): Promise<boolean> {
    try {
      if (!this.client) {
        this.client = getRedisClient();
      }
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      logger.error(`Redis EXISTS 오류 (${key}):`, error);
      return false;
    }
  }

  static async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.client) {
        this.client = getRedisClient();
      }
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Redis KEYS 오류 (${pattern}):`, error);
      return [];
    }
  }

  static async flushAll(): Promise<boolean> {
    try {
      if (!this.client) {
        this.client = getRedisClient();
      }
      await this.client.flushAll();
      return true;
    } catch (error) {
      logger.error('Redis FLUSHALL 오류:', error);
      return false;
    }
  }
}

export default RedisService;