import Queue from 'bull';
import { RedisClientType } from 'redis';
import { getRedisClient } from './redis';

// 큐 타입 정의
export type QueueType = 'audio-extraction' | 'file-upload' | 'ai-analysis';

// 큐 인스턴스 저장소
const queues: Record<string, Queue.Queue> = {};

/**
 * 큐 초기화 함수
 */
export function initializeQueues(): void {
  try {
    // 오디오 추출 큐
    createQueue('audio-extraction', {
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });

    // 파일 업로드 큐
    createQueue('file-upload', {
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 3000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });

    // AI 분석 큐
    createQueue('ai-analysis', {
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    });

    console.log('✅ 작업 큐 초기화 완료');
  } catch (error) {
    console.error('❌ 작업 큐 초기화 실패:', error);
    throw error;
  }
}

/**
 * 큐 생성 함수
 */
function createQueue(name: QueueType, options: Queue.QueueOptions = {}): Queue.Queue {
  const redisClient = getRedisClient();
  
  const queue = new Queue(name, {
    redis: {
      host: 'localhost',
      port: 6379,
    },
    ...options
  });

  // 이벤트 리스너 설정
  queue.on('error', (error) => {
    console.error(`[Queue:${name}] 오류 발생:`, error);
  });

  queue.on('failed', (job, error) => {
    console.error(`[Queue:${name}] 작업 실패 (ID: ${job.id}):`, error);
  });

  queue.on('stalled', (job) => {
    console.warn(`[Queue:${name}] 작업 지연 (ID: ${job.id})`);
  });

  // 큐 저장
  queues[name] = queue;
  return queue;
}

/**
 * 큐 가져오기 함수
 */
export function getQueue(name: QueueType): Queue.Queue {
  const queue = queues[name];
  if (!queue) {
    throw new Error(`큐 '${name}'가 초기화되지 않았습니다.`);
  }
  return queue;
}

/**
 * 모든 큐 종료 함수
 */
export async function closeAllQueues(): Promise<void> {
  try {
    const closePromises = Object.values(queues).map(queue => queue.close());
    await Promise.all(closePromises);
    console.log('✅ 모든 큐 종료 완료');
  } catch (error) {
    console.error('❌ 큐 종료 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 큐 상태 확인 함수
 */
export async function getQueueStats(): Promise<Record<string, any>> {
  const stats: Record<string, any> = {};
  
  for (const [name, queue] of Object.entries(queues)) {
    const [waiting, active, completed, failed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount()
    ]);
    
    stats[name] = {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed
    };
  }
  
  return stats;
}