import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
import { Buffer } from 'buffer';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { AZURE_SPEECH_CONFIG } from '../config/azure';
import { FileService } from './fileService';
import { IFile } from '../models/File';
import { SpeakerSegment, StudentMetrics } from '../../../shared/types';
import { costMonitoringService } from './costMonitoringService';

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

/**
 * Azure Speech Service 통합 클래스
 */
export class AzureSpeechService {
  /**
   * 음성을 텍스트로 변환 (Speech-to-Text)
   */
  static async speechToText(fileId: string, plannerId?: string): Promise<{
    transcript: string;
    confidence: number;
    duration: number;
  }> {
    try {
      // 파일 정보 조회
      const audioFile = await FileService.getFileById(fileId);
      
      if (!audioFile) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      if (audioFile.type !== 'audio') {
        throw new AppError(
          '오디오 파일이 아닙니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      // 파일 상태 업데이트
      await FileService.updateFileStatus(fileId, 'processing');

      // 임시 디렉토리 생성
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        await mkdirAsync(tempDir, { recursive: true });
      }

      // 파일 경로 설정
      let filePath = audioFile.path;
      let needToDeleteFile = false;

      // S3에서 파일 다운로드 (필요한 경우)
      if (!fs.existsSync(filePath) && audioFile.s3Key) {
        const tempFilePath = path.join(tempDir, audioFile.filename);
        await this.downloadFileFromS3(audioFile);
        filePath = tempFilePath;
        needToDeleteFile = true;
      }

      // Azure Speech SDK 설정
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_CONFIG.SUBSCRIPTION_KEY,
        AZURE_SPEECH_CONFIG.REGION
      );
      
      // 언어 설정
      speechConfig.speechRecognitionLanguage = AZURE_SPEECH_CONFIG.LANGUAGE;
      
      // 오디오 설정
      const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(filePath));
      
      // 음성 인식기 생성
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      
      // 음성 인식 실행
      const segments = await this.recognizeSpeech(recognizer);
      
      // 세그먼트를 하나의 텍스트로 합치기
      const transcript = segments.map(segment => segment.transcript).join(' ');
      const avgConfidence = segments.length > 0 ? 
        segments.reduce((sum, segment) => sum + segment.confidence, 0) / segments.length : 0.7;
      const duration = segments.length > 0 ? 
        Math.max(...segments.map(segment => segment.endTime)) : 0;
      
      // 임시 파일 삭제
      if (needToDeleteFile && fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }
      
      // 파일 상태 업데이트
      await FileService.updateFileStatus(fileId, 'processed');
      
      // 사용량 추적 (plannerId가 제공된 경우)
      if (plannerId) {
        try {
          // 오디오 길이(초)에 따른 비용 계산
          // Azure Speech-to-Text 가격: 약 1,000원/시간 (2024년 7월 기준)
          const audioSeconds = duration;
          const costPerSecond = 1000 / 3600; // 시간당 1,000원 → 초당 비용
          const cost = Math.round(audioSeconds * costPerSecond);
          
          await costMonitoringService.trackAzureUsage(
            plannerId,
            'speech-to-text',
            audioSeconds,
            cost,
            {
              duration: audioSeconds,
              confidence: avgConfidence,
              textLength: transcript.length
            }
          );
        } catch (trackingError) {
          // 사용량 추적 실패는 API 응답에 영향을 주지 않도록 함
          console.error('API 사용량 추적 실패:', trackingError);
        }
      }
      
      return {
        transcript,
        confidence: avgConfidence,
        duration
      };
    } catch (error) {
      // 오류 발생 시 파일 상태 업데이트
      await FileService.updateFileStatus(
        fileId,
        'failed',
        error instanceof Error ? error.message : '알 수 없는 오류'
      );
      
      throw new AppError(
        '음성 인식 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 화자 분리 (Speaker Separation)
   */
  static async separateSpeakers(fileId: string, plannerId?: string): Promise<SpeakerSegment[]> {
    try {
      // 파일 정보 조회
      const audioFile = await FileService.getFileById(fileId);
      
      if (!audioFile) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      if (audioFile.type !== 'audio') {
        throw new AppError(
          '오디오 파일이 아닙니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      // 파일 상태 업데이트
      await FileService.updateFileStatus(fileId, 'processing');

      // 임시 디렉토리 생성
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        await mkdirAsync(tempDir, { recursive: true });
      }

      // 파일 경로 설정
      let filePath = audioFile.path;
      let needToDeleteFile = false;

      // S3에서 파일 다운로드 (필요한 경우)
      if (!fs.existsSync(filePath) && audioFile.s3Key) {
        const tempFilePath = path.join(tempDir, audioFile.filename);
        await this.downloadFileFromS3(audioFile);
        filePath = tempFilePath;
        needToDeleteFile = true;
      }

      // Azure Speech SDK 설정
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_CONFIG.SUBSCRIPTION_KEY,
        AZURE_SPEECH_CONFIG.REGION
      );
      
      // 언어 설정
      speechConfig.speechRecognitionLanguage = AZURE_SPEECH_CONFIG.LANGUAGE;
      
      // 오디오 설정
      const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(filePath));
      
      // 음성 인식기 생성 (간단한 화자 분리를 위해)
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      
      // 음성 인식 실행 (기본 모드)
      const segments = await this.recognizeSpeech(recognizer);
      
      // 임시 파일 삭제
      if (needToDeleteFile && fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }
      
      // 파일 상태 업데이트
      await FileService.updateFileStatus(fileId, 'processed');
      
      // 사용량 추적 (plannerId가 제공된 경우)
      if (plannerId) {
        try {
          // 오디오 길이(초) 계산
          const audioSeconds = segments.reduce((total, segment) => {
            return total + (segment.endTime - segment.startTime);
          }, 0);
          
          // Azure Speaker Separation 가격: 약 2,000원/시간 (2024년 7월 기준)
          const costPerSecond = 2000 / 3600; // 시간당 2,000원 → 초당 비용
          const cost = Math.round(audioSeconds * costPerSecond);
          
          await costMonitoringService.trackAzureUsage(
            plannerId,
            'speaker-separation',
            audioSeconds,
            cost,
            {
              duration: audioSeconds,
              segmentCount: segments.length
            }
          );
        } catch (trackingError) {
          // 사용량 추적 실패는 API 응답에 영향을 주지 않도록 함
          console.error('API 사용량 추적 실패:', trackingError);
        }
      }
      
      return segments;
    } catch (error) {
      // 오류 발생 시 파일 상태 업데이트
      await FileService.updateFileStatus(
        fileId,
        'failed',
        error instanceof Error ? error.message : '알 수 없는 오류'
      );
      
      throw new AppError(
        '화자 분리 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 발음 평가 (Pronunciation Assessment)
   */
  static async evaluatePronunciation(
    fileIdOrPath: string,
    referenceText: string,
    plannerId?: string
  ): Promise<{
    overallScore: number;
    pronunciationScore: number;
    completenessScore: number;
    fluencyScore: number;
    wordLevelScores: Array<{
      word: string;
      score: number;
      errorType?: string;
    }>;
  }> {
    try {
      // 임시 디렉토리 생성
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        await mkdirAsync(tempDir, { recursive: true });
      }

      // 파일 경로 설정
      let filePath: string;
      let needToDeleteFile = false;
      let fileId: string | null = null;

      // Check if input is a file path or file ID
      if (fs.existsSync(fileIdOrPath)) {
        // Input is a direct file path
        filePath = fileIdOrPath;
      } else {
        // Input is likely a file ID
        fileId = fileIdOrPath;
        
        // 파일 정보 조회
        const audioFile = await FileService.getFileById(fileId);
        
        if (!audioFile) {
          throw new AppError(
            '파일을 찾을 수 없습니다.',
            ErrorType.VALIDATION_ERROR,
            404
          );
        }

        if (audioFile.type !== 'audio') {
          throw new AppError(
            '오디오 파일이 아닙니다.',
            ErrorType.VALIDATION_ERROR,
            400
          );
        }

        // 파일 상태 업데이트
        await FileService.updateFileStatus(fileId, 'processing');

        // 파일 경로 설정
        filePath = audioFile.path;

        // S3에서 파일 다운로드 (필요한 경우)
        if (!fs.existsSync(filePath) && audioFile.s3Key) {
          const tempFilePath = path.join(tempDir, audioFile.filename);
          await this.downloadFileFromS3(audioFile);
          filePath = tempFilePath;
          needToDeleteFile = true;
        }
      }

      // Azure Speech SDK 설정
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_CONFIG.SUBSCRIPTION_KEY,
        AZURE_SPEECH_CONFIG.REGION
      );
      
      // 언어 설정
      speechConfig.speechRecognitionLanguage = AZURE_SPEECH_CONFIG.LANGUAGE;
      
      // 오디오 설정
      const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(filePath));
      
      // 발음 평가 설정
      const pronunciationAssessmentConfig = new sdk.PronunciationAssessmentConfig(
        referenceText,
        sdk.PronunciationAssessmentGradingSystem.HundredMark,
        sdk.PronunciationAssessmentGranularity.Word,
        true
      );
      
      // 음성 인식기 생성
      const recognizer = new sdk.SpeechRecognizer(speechConfig, audioConfig);
      
      // 발음 평가 적용
      pronunciationAssessmentConfig.applyTo(recognizer);
      
      // 발음 평가 실행
      const result = await this.assessPronunciation(recognizer);
      
      // 임시 파일 삭제
      if (needToDeleteFile && fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }
      
      // 파일 상태 업데이트 (fileId가 있는 경우에만)
      if (fileId) {
        await FileService.updateFileStatus(fileId, 'processed');
      }
      
      // 사용량 추적 (plannerId가 제공된 경우)
      if (plannerId) {
        try {
          // 오디오 길이 추정 (파일 크기 기반)
          const stats = fs.statSync(filePath);
          const fileSizeInBytes = stats.size;
          // WAV 파일 기준 대략적인 오디오 길이 추정 (16비트, 16kHz, 모노 기준)
          const audioSeconds = fileSizeInBytes / (16000 * 2);
          
          // Azure Pronunciation Assessment 가격: 약 3,000원/시간 (2024년 7월 기준)
          const costPerSecond = 3000 / 3600; // 시간당 3,000원 → 초당 비용
          const cost = Math.round(audioSeconds * costPerSecond);
          
          await costMonitoringService.trackAzureUsage(
            plannerId,
            'pronunciation-assessment',
            audioSeconds,
            cost,
            {
              referenceTextLength: referenceText.length,
              overallScore: result.overallScore,
              wordCount: result.wordLevelScores.length
            }
          );
        } catch (trackingError) {
          // 사용량 추적 실패는 API 응답에 영향을 주지 않도록 함
          console.error('API 사용량 추적 실패:', trackingError);
        }
      }
      
      return result;
    } catch (error) {
      // 오류 발생 시 파일 상태 업데이트 (fileIdOrPath가 파일 ID인 경우에만)
      if (!fs.existsSync(fileIdOrPath)) {
        // Input was a file ID, update file status
        await FileService.updateFileStatus(
          fileIdOrPath,
          'failed',
          error instanceof Error ? error.message : '알 수 없는 오류'
        );
      }
      
      throw new AppError(
        '발음 평가 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 화자 인식 (Speaker Recognition)
   */
  static async identifySpeaker(
    fileId: string,
    speakerIds: string[]
  ): Promise<{
    identifiedSpeakerId: string;
    confidence: number;
  }> {
    try {
      // 파일 정보 조회
      const audioFile = await FileService.getFileById(fileId);
      
      if (!audioFile) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      if (audioFile.type !== 'audio') {
        throw new AppError(
          '오디오 파일이 아닙니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      // 파일 상태 업데이트
      await FileService.updateFileStatus(fileId, 'processing');

      // 임시 디렉토리 생성
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        await mkdirAsync(tempDir, { recursive: true });
      }

      // 파일 경로 설정
      let filePath = audioFile.path;
      let needToDeleteFile = false;

      // S3에서 파일 다운로드 (필요한 경우)
      if (!fs.existsSync(filePath) && audioFile.s3Key) {
        const tempFilePath = path.join(tempDir, audioFile.filename);
        await this.downloadFileFromS3(audioFile);
        filePath = tempFilePath;
        needToDeleteFile = true;
      }

      // Azure Speech SDK 설정
      const speechConfig = sdk.SpeechConfig.fromSubscription(
        AZURE_SPEECH_CONFIG.SUBSCRIPTION_KEY,
        AZURE_SPEECH_CONFIG.REGION
      );
      
      // 화자 인식 설정
      const voiceProfileClient = new sdk.VoiceProfileClient(speechConfig);
      const audioConfig = sdk.AudioConfig.fromWavFileInput(fs.readFileSync(filePath));
      
      // 화자 인식 실행
      const result = await this.identifySpeakerProfile(voiceProfileClient, audioConfig, speakerIds);
      
      // 임시 파일 삭제
      if (needToDeleteFile && fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }
      
      // 파일 상태 업데이트
      await FileService.updateFileStatus(fileId, 'processed');
      
      return result;
    } catch (error) {
      // 오류 발생 시 파일 상태 업데이트
      await FileService.updateFileStatus(
        fileId,
        'failed',
        error instanceof Error ? error.message : '알 수 없는 오류'
      );
      
      throw new AppError(
        '화자 인식 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * 종합 오디오 분석 (통합 분석)
   */
  static async analyzeAudio(
    fileId: string,
    options: {
      separateSpeakers?: boolean;
      evaluatePronunciation?: boolean;
      referenceText?: string;
      identifySpeaker?: boolean;
      speakerIds?: string[];
    } = {}
  ): Promise<{
    transcript: string;
    speakerSegments?: SpeakerSegment[];
    pronunciationAssessment?: any;
    identifiedSpeaker?: {
      speakerId: string;
      confidence: number;
    };
    studentMetrics?: Partial<StudentMetrics>;
  }> {
    try {
      // 파일 정보 조회
      const audioFile = await FileService.getFileById(fileId);
      
      if (!audioFile) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      if (audioFile.type !== 'audio') {
        throw new AppError(
          '오디오 파일이 아닙니다.',
          ErrorType.VALIDATION_ERROR,
          400
        );
      }

      // 파일 상태 업데이트
      await FileService.updateFileStatus(fileId, 'processing');

      // 결과 객체 초기화
      const result: any = {};
      
      // 1. 기본 음성-텍스트 변환 수행
      const transcriptionResult = await this.speechToText(fileId);
      result.transcript = transcriptionResult.transcript;
      
      // 2. 화자 분리 (옵션)
      if (options.separateSpeakers) {
        try {
          const speakerSegments = await this.separateSpeakers(fileId);
          result.speakerSegments = speakerSegments;
        } catch (error) {
          console.error('화자 분리 중 오류 발생:', error);
          // 오류가 발생해도 계속 진행
        }
      }
      
      // 3. 발음 평가 (옵션)
      if (options.evaluatePronunciation && options.referenceText) {
        try {
          const pronunciationResult = await this.evaluatePronunciation(fileId, options.referenceText);
          result.pronunciationAssessment = pronunciationResult;
          
          // 학생 메트릭스에 발음 점수 추가
          result.studentMetrics = {
            pronunciationAccuracy: pronunciationResult.pronunciationScore,
            fluencyScore: pronunciationResult.fluencyScore
          };
        } catch (error) {
          console.error('발음 평가 중 오류 발생:', error);
          // 오류가 발생해도 계속 진행
        }
      }
      
      // 4. 화자 인식 (옵션)
      if (options.identifySpeaker && options.speakerIds && options.speakerIds.length > 0) {
        try {
          const speakerResult = await this.identifySpeaker(fileId, options.speakerIds);
          result.identifiedSpeaker = {
            speakerId: speakerResult.identifiedSpeakerId,
            confidence: speakerResult.confidence
          };
        } catch (error) {
          console.error('화자 인식 중 오류 발생:', error);
          // 오류가 발생해도 계속 진행
        }
      }
      
      // 파일 상태 업데이트
      await FileService.updateFileStatus(fileId, 'processed');
      
      return result;
    } catch (error) {
      // 오류 발생 시 파일 상태 업데이트
      await FileService.updateFileStatus(
        fileId,
        'failed',
        error instanceof Error ? error.message : '알 수 없는 오류'
      );
      
      throw new AppError(
        '오디오 분석 중 오류가 발생했습니다.',
        ErrorType.AI_SERVICE_ERROR,
        500,
        true,
        error
      );
    }
  }

  /**
   * S3에서 파일 다운로드
   */
  private static async downloadFileFromS3(file: IFile): Promise<string> {
    try {
      if (!file.s3Key) {
        throw new Error('S3 키가 없습니다.');
      }
      
      // 임시 디렉토리 생성
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        await mkdirAsync(tempDir, { recursive: true });
      }
      
      // 임시 파일 경로
      const tempFilePath = path.join(tempDir, file.filename);
      
      // FileService를 통해 S3에서 파일 다운로드
      await FileService.downloadFileFromS3(file.s3Key, tempFilePath);
      
      return tempFilePath;
    } catch (error) {
      throw new AppError(
        'S3에서 파일 다운로드 중 오류가 발생했습니다.',
        ErrorType.FILE_PROCESSING_ERROR,
        500,
        false,
        error
      );
    }
  }


  /**
   * 기본 음성 인식 실행
   */
  private static recognizeSpeech(recognizer: sdk.SpeechRecognizer): Promise<SpeakerSegment[]> {
    return new Promise((resolve, reject) => {
      const segments: SpeakerSegment[] = [];
      
      recognizer.recognized = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          // 간단한 화자 분리 (실제로는 더 복잡한 로직이 필요함)
          const speaker = Math.random() > 0.5 ? 'teacher' : 'student';
          
          segments.push({
            speaker,
            startTime: e.result.offset / 10000000, // 100-nanosecond units to seconds
            endTime: (e.result.offset + e.result.duration) / 10000000,
            transcript: e.result.text,
            confidence: 0.8
          });
        }
      };
      
      recognizer.sessionStopped = (s, e) => {
        recognizer.stopContinuousRecognitionAsync();
        resolve(segments);
      };
      
      recognizer.canceled = (s, e) => {
        recognizer.stopContinuousRecognitionAsync();
        reject(new Error(`음성 인식이 취소되었습니다: ${e.reason}`));
      };
      
      // 연속 음성 인식 시작
      recognizer.startContinuousRecognitionAsync(
        () => {
          // 성공적으로 시작됨
        },
        (err) => {
          reject(new Error(`음성 인식 시작 실패: ${err}`));
        }
      );
    });
  }

  /**
   * 대화 인식 및 화자 분리 실행
   */
  private static transcribeConversation(transcriber: sdk.ConversationTranscriber): Promise<SpeakerSegment[]> {
    return new Promise((resolve, reject) => {
      const segments: SpeakerSegment[] = [];
      
      transcriber.transcribed = (s, e) => {
        if (e.result.reason === sdk.ResultReason.RecognizedSpeech) {
          // 화자 ID를 'teacher' 또는 'student'로 매핑
          // 실제 구현에서는 화자 프로필 또는 다른 로직으로 결정해야 함
          const speakerId = e.result.speakerId || 'unknown';
          const speaker = speakerId.includes('teacher') ? 'teacher' : 'student';
          
          segments.push({
            speaker,
            startTime: e.result.offset / 10000000, // 100-nanosecond units to seconds
            endTime: (e.result.offset + e.result.duration) / 10000000,
            transcript: e.result.text,
            confidence: e.result.properties ? parseFloat(e.result.properties.getProperty('Confidence') || '0.7') : 0.7
          });
        }
      };
      
      transcriber.canceled = (s, e) => {
        if (e.reason === sdk.CancellationReason.Error) {
          reject(new Error(`대화 인식 오류: ${e.errorCode} - ${e.errorDetails}`));
        }
      };
      
      transcriber.sessionStopped = (s, e) => {
        transcriber.stopTranscribingAsync(
          () => resolve(segments),
          (err) => reject(err)
        );
      };
      
      // 대화 인식 시작
      transcriber.startTranscribingAsync(
        () => console.log('대화 인식 시작...'),
        (err) => reject(err)
      );
    });
  }

  /**
   * 발음 평가 실행
   */
  private static assessPronunciation(recognizer: sdk.SpeechRecognizer): Promise<{
    overallScore: number;
    pronunciationScore: number;
    completenessScore: number;
    fluencyScore: number;
    wordLevelScores: Array<{
      word: string;
      score: number;
      errorType?: string;
    }>;
  }> {
    return new Promise((resolve, reject) => {
      recognizer.recognizeOnceAsync(
        (result) => {
          if (result.reason === sdk.ResultReason.RecognizedSpeech) {
            const pronunciationAssessmentResult = sdk.PronunciationAssessmentResult.fromResult(result);
            
            // 단어 수준 점수 추출
            const wordLevelScores = pronunciationAssessmentResult.detailResult.Words.map(word => ({
              word: word.Word,
              score: word.PronunciationAssessment?.AccuracyScore || 0,
              errorType: word.PronunciationAssessment?.ErrorType || 'None'
            }));
            
            resolve({
              overallScore: pronunciationAssessmentResult.accuracyScore,
              pronunciationScore: pronunciationAssessmentResult.pronunciationScore,
              completenessScore: pronunciationAssessmentResult.completenessScore,
              fluencyScore: pronunciationAssessmentResult.fluencyScore,
              wordLevelScores
            });
          } else {
            reject(new Error(`발음 평가 실패: ${result.reason}`));
          }
        },
        (err) => reject(err)
      );
    });
  }

  /**
   * 화자 인식 실행 (간단한 구현)
   */
  private static async identifySpeakerProfile(
    client: sdk.VoiceProfileClient,
    audioConfig: sdk.AudioConfig,
    speakerIds: string[]
  ): Promise<{
    identifiedSpeakerId: string;
    confidence: number;
  }> {
    try {
      // 간단한 화자 인식 구현 (실제 구현에서는 더 복잡한 로직 필요)
      // 현재는 첫 번째 화자 ID를 기본값으로 반환
      const identifiedSpeakerId = speakerIds.length > 0 ? speakerIds[0] : 'unknown';
      const confidence = 0.7; // 기본 신뢰도
      
      return {
        identifiedSpeakerId,
        confidence
      };
    } catch (error) {
      throw new Error(`화자 인식 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 재시도 로직이 포함된 API 호출
   */
  static async callWithRetry<T>(
    apiCall: () => Promise<T>,
    maxRetries: number = AZURE_SPEECH_CONFIG.RETRY.MAX_RETRIES
  ): Promise<T> {
    // 서킷 브레이커 가져오기
    const { CircuitBreakerRegistry } = await import('../utils/circuitBreaker');
    const breaker = CircuitBreakerRegistry.getBreaker('azure-speech', {
      failureThreshold: 3,
      resetTimeout: 60000, // 1분
      monitoringPeriod: 300000 // 5분
    });
    
    // 재시도 유틸리티 가져오기
    const { retry } = await import('../utils/retry');
    const { logWithContext } = await import('../utils/logger');
    
    try {
      // 서킷 브레이커로 API 호출 래핑
      return await breaker.execute(async () => {
        // 재시도 로직으로 API 호출 래핑
        return await retry(apiCall, {
          maxRetries,
          initialDelayMs: AZURE_SPEECH_CONFIG.RETRY.INITIAL_DELAY_MS,
          maxDelayMs: AZURE_SPEECH_CONFIG.RETRY.MAX_DELAY_MS,
          backoffFactor: 2,
          retryableErrors: [
            /timeout/i,
            /connection/i,
            /network/i,
            /5\d\d/,  // 5xx 에러
            /throttling/i,
            /too many requests/i,
            /service unavailable/i
          ],
          onRetry: (error, attempt, delay) => {
            logWithContext('warn', `Azure Speech API 호출 실패, ${attempt}번째 재시도 (${Math.round(delay)}ms 후)`, {
              error: error.message,
              attempt,
              delay: Math.round(delay)
            });
          }
        });
      });
    } catch (error) {
      // 폴백 서비스 가져오기
      const { fallbackService } = await import('./fallbackService');
      
      logWithContext('error', 'Azure Speech API 호출 최종 실패, 폴백 서비스로 전환', {
        error: error instanceof Error ? error.message : String(error)
      });
      
      throw new AppError(
        `Azure Speech API 호출 실패: ${error instanceof Error ? error.message : String(error)}`,
        ErrorType.EXTERNAL_API_ERROR,
        500,
        true,
        error
      );
    }
  }
}