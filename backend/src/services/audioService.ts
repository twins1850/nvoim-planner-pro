import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { File, IFile } from '../models/File';
import { FileService } from './fileService';
import { AppError, ErrorType } from '../middleware/errorHandler';
import { s3Client, S3_CONFIG, getS3FileUrl } from '../config/aws';

// ffmpeg 경로 설정
if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);

/**
 * 오디오 추출 서비스
 */
export class AudioService {
  /**
   * 비디오에서 오디오 추출
   */
  static async extractAudioFromVideo(fileId: string): Promise<IFile> {
    try {
      // 파일 정보 조회
      const videoFile = await FileService.getFileById(fileId);
      if (!videoFile) {
        throw new AppError(
          '파일을 찾을 수 없습니다.',
          ErrorType.VALIDATION_ERROR,
          404
        );
      }

      // 비디오 파일이 아닌 경우 에러
      if (videoFile.type !== 'video') {
        throw new AppError(
          '비디오 파일이 아닙니다.',
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

      // 출력 파일 경로 설정
      const outputFilename = `${path.parse(videoFile.filename).name}.mp3`;
      const outputPath = path.join(tempDir, outputFilename);

      // S3에서 비디오 파일 다운로드 (필요한 경우)
      let inputPath = videoFile.path;
      let needToDeleteInputFile = false;

      if (!fs.existsSync(inputPath) && videoFile.s3Key) {
        const tempInputPath = path.join(tempDir, videoFile.filename);
        await this.downloadFileFromS3(videoFile.s3Key, tempInputPath);
        inputPath = tempInputPath;
        needToDeleteInputFile = true;
      }

      // 오디오 추출 실행
      await this.runFFmpegExtraction(inputPath, outputPath);

      // 추출된 오디오 파일 정보
      const audioFileStats = fs.statSync(outputPath);
      
      // 오디오 파일 정보 생성
      const audioFile = new File({
        originalName: `${path.parse(videoFile.originalName).name}.mp3`,
        filename: outputFilename,
        mimeType: 'audio/mpeg',
        size: audioFileStats.size,
        path: outputPath,
        type: 'audio',
        status: 'uploaded',
        metadata: {
          ...videoFile.metadata,
          format: 'mp3',
          extractedFromVideo: true,
          originalVideoId: videoFile._id
        },
        uploadedBy: videoFile.uploadedBy
      });

      // 데이터베이스에 저장
      await audioFile.save();

      // S3에 오디오 파일 업로드
      const uploadedAudioFile = await FileService.uploadFileToS3(audioFile._id ? audioFile._id.toString() : '');

      // 임시 파일 삭제
      if (fs.existsSync(outputPath)) {
        await unlinkAsync(outputPath);
      }

      // 다운로드한 임시 입력 파일 삭제
      if (needToDeleteInputFile && fs.existsSync(inputPath)) {
        await unlinkAsync(inputPath);
      }

      // 원본 비디오 파일 삭제 (S3 및 데이터베이스에서는 유지)
      if (fs.existsSync(videoFile.path)) {
        await unlinkAsync(videoFile.path);
      }

      // 비디오 파일 상태 업데이트
      await FileService.updateFileStatus(fileId, 'processed');

      return uploadedAudioFile;
    } catch (error) {
      // 오류 발생 시 파일 상태 업데이트
      await FileService.updateFileStatus(
        fileId,
        'failed',
        error instanceof Error ? error.message : '알 수 없는 오류'
      );

      throw new AppError(
        '오디오 추출 중 오류가 발생했습니다.',
        ErrorType.FILE_PROCESSING_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * FFmpeg를 사용한 오디오 추출
   */
  private static runFFmpegExtraction(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .output(outputPath)
        .noVideo() // 비디오 제거
        .audioCodec('libmp3lame') // MP3 코덱 사용
        .audioBitrate('128k') // 비트레이트 설정 (품질/크기 최적화)
        .audioChannels(2) // 스테레오
        .audioFrequency(44100) // 샘플레이트
        .on('start', (commandLine) => {
          console.log('FFmpeg 명령어 실행:', commandLine);
        })
        .on('progress', (progress) => {
          console.log(`처리 중: ${Math.floor(progress.percent || 0)}% 완료`);
        })
        .on('end', () => {
          console.log('오디오 추출 완료');
          resolve();
        })
        .on('error', (err) => {
          console.error('FFmpeg 오류:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * S3에서 파일 다운로드
   */
  private static async downloadFileFromS3(s3Key: string, outputPath: string): Promise<void> {
    try {
      const params = {
        Bucket: S3_CONFIG.BUCKET_NAME,
        Key: s3Key
      };

      const { Body } = await s3Client.getObject(params).promise();
      
      if (Body instanceof Buffer) {
        fs.writeFileSync(outputPath, Body);
      } else {
        throw new Error('S3 응답이 Buffer 형식이 아닙니다.');
      }
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
   * 오디오 파일 메타데이터 추출
   */
  static async extractAudioMetadata(fileId: string): Promise<IFile> {
    try {
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

      // 파일 경로 설정
      let filePath = audioFile.path;
      let needToDeleteFile = false;

      // S3에서 파일 다운로드 (필요한 경우)
      if (!fs.existsSync(filePath) && audioFile.s3Key) {
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
          await mkdirAsync(tempDir, { recursive: true });
        }
        
        const tempFilePath = path.join(tempDir, audioFile.filename);
        await this.downloadFileFromS3(audioFile.s3Key, tempFilePath);
        filePath = tempFilePath;
        needToDeleteFile = true;
      }

      // FFmpeg를 사용하여 메타데이터 추출
      const metadata = await this.getAudioMetadata(filePath);

      // 파일 메타데이터 업데이트
      const updatedFile = await FileService.updateFileMetadata(fileId, {
        duration: metadata.duration,
        bitrate: metadata.bitrate,
        format: metadata.format
      });

      // 임시 파일 삭제
      if (needToDeleteFile && fs.existsSync(filePath)) {
        await unlinkAsync(filePath);
      }

      return updatedFile;
    } catch (error) {
      throw new AppError(
        '오디오 메타데이터 추출 중 오류가 발생했습니다.',
        ErrorType.FILE_PROCESSING_ERROR,
        500,
        false,
        error
      );
    }
  }

  /**
   * FFmpeg를 사용한 오디오 메타데이터 추출
   */
  private static getAudioMetadata(filePath: string): Promise<{
    duration?: number;
    bitrate?: number;
    format?: string;
  }> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) {
          return reject(err);
        }

        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        
        resolve({
          duration: metadata.format.duration ? Math.floor(metadata.format.duration) : undefined,
          bitrate: metadata.format.bit_rate ? Math.floor(parseInt(metadata.format.bit_rate.toString()) / 1000) : undefined,
          format: audioStream?.codec_name
        });
      });
    });
  }
}