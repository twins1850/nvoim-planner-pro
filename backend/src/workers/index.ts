import { getQueue } from '../config/queue';
import { processAudioExtraction, processMetadataExtraction, processFileUpload } from './audioExtractionWorker';

/**
 * 모든 작업자 등록
 */
export function registerWorkers(): void {
  try {
    // 오디오 추출 작업자 등록
    const audioExtractionQueue = getQueue('audio-extraction');
    audioExtractionQueue.process(processAudioExtraction);
    audioExtractionQueue.process('extract-metadata', processMetadataExtraction);
    
    // 파일 업로드 작업자 등록
    const fileUploadQueue = getQueue('file-upload');
    fileUploadQueue.process(processFileUpload);
    
    console.log('✅ 모든 작업자 등록 완료');
  } catch (error) {
    console.error('❌ 작업자 등록 실패:', error);
    throw error;
  }
}

/**
 * 작업자 초기화
 */
export async function initializeWorkers(): Promise<void> {
  try {
    registerWorkers();
    
    // 큐 이벤트 리스너 설정
    const queues = [
      getQueue('audio-extraction'),
      getQueue('file-upload'),
      getQueue('ai-analysis')
    ];
    
    for (const queue of queues) {
      queue.on('completed', (job) => {
        console.log(`[${queue.name}] 작업 완료 (ID: ${job.id})`);
      });
      
      queue.on('failed', (job, error) => {
        console.error(`[${queue.name}] 작업 실패 (ID: ${job.id}):`, error);
      });
      
      queue.on('stalled', (job) => {
        console.warn(`[${queue.name}] 작업 지연 (ID: ${job.id})`);
      });
    }
    
    console.log('✅ 작업자 초기화 완료');
  } catch (error) {
    console.error('❌ 작업자 초기화 실패:', error);
    throw error;
  }
}