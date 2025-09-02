import { Job } from 'bull';
import { AudioService } from '../services/audioService';
import { FileService } from '../services/fileService';
import { getQueue } from '../config/queue';

/**
 * 오디오 추출 작업 처리기
 */
export async function processAudioExtraction(job: Job): Promise<void> {
  try {
    const { fileId, userId } = job.data;
    
    console.log(`[오디오 추출 작업 시작] 파일 ID: ${fileId}, 사용자 ID: ${userId}`);
    
    // 오디오 추출 실행
    const audioFile = await AudioService.extractAudioFromVideo(fileId);
    
    console.log(`[오디오 추출 완료] 파일 ID: ${fileId}, 오디오 파일 ID: ${audioFile._id}`);
    
    // 오디오 메타데이터 추출 작업 추가
    const audioExtractionQueue = getQueue('audio-extraction');
    await audioExtractionQueue.add(
      'extract-metadata',
      {
        fileId: audioFile._id ? audioFile._id.toString() : fileId,
        userId
      },
      {
        attempts: 2,
        backoff: {
          type: 'fixed',
          delay: 2000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    // AI 분석 작업 추가
    const aiAnalysisQueue = getQueue('ai-analysis');
    await aiAnalysisQueue.add(
      {
        fileId: audioFile._id ? audioFile._id.toString() : fileId,
        videoFileId: fileId,
        userId
      },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 10000
        },
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    return;
  } catch (error) {
    console.error('[오디오 추출 작업 실패]', error);
    throw error;
  }
}

/**
 * 오디오 메타데이터 추출 작업 처리기
 */
export async function processMetadataExtraction(job: Job): Promise<void> {
  try {
    const { fileId } = job.data;
    
    console.log(`[메타데이터 추출 작업 시작] 파일 ID: ${fileId}`);
    
    // 메타데이터 추출 실행
    const updatedFile = await AudioService.extractAudioMetadata(fileId);
    
    console.log(`[메타데이터 추출 완료] 파일 ID: ${fileId}, 길이: ${updatedFile.metadata.duration}초`);
    
    return;
  } catch (error) {
    console.error('[메타데이터 추출 작업 실패]', error);
    throw error;
  }
}

/**
 * 파일 업로드 작업 처리기
 */
export async function processFileUpload(job: Job): Promise<void> {
  try {
    const { fileId } = job.data;
    
    console.log(`[파일 업로드 작업 시작] 파일 ID: ${fileId}`);
    
    // S3 업로드 실행
    const uploadedFile = await FileService.uploadFileToS3(fileId);
    
    console.log(`[파일 업로드 완료] 파일 ID: ${fileId}, S3 URL: ${uploadedFile.s3Url}`);
    
    return;
  } catch (error) {
    console.error('[파일 업로드 작업 실패]', error);
    throw error;
  }
}