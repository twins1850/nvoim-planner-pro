import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand, CreateBucketCommand, PutBucketPolicyCommand } from '@aws-sdk/client-s3';

// AWS S3 클라이언트 생성 (v3)
export const s3ClientV3 = new S3Client({
  region: process.env.AWS_REGION || 'ap-northeast-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// S3 버킷 설정
export const S3_CONFIG = {
  BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME || 'english-conversation-files',
  FOLDERS: {
    ORIGINAL_VIDEOS: 'original-videos/',
    EXTRACTED_AUDIO: 'extracted-audio/',
    HOMEWORK_SUBMISSIONS: 'homework-submissions/',
    PROFILE_IMAGES: 'profile-images/'
  },
  // 파일 업로드 제한
  MAX_FILE_SIZE: {
    VIDEO: 100 * 1024 * 1024, // 100MB
    AUDIO: 20 * 1024 * 1024,  // 20MB
    IMAGE: 5 * 1024 * 1024    // 5MB
  },
  // 허용된 파일 타입
  ALLOWED_MIME_TYPES: {
    VIDEO: ['video/mp4', 'video/avi', 'video/mov'],
    AUDIO: ['audio/mp3', 'audio/wav', 'audio/m4a'],
    IMAGE: ['image/jpeg', 'image/png', 'image/gif']
  }
};

// S3 업로드 파라미터 생성 함수 (v3)
export function createS3UploadParamsV3(
  key: string,
  buffer: Buffer,
  mimeType: string,
  folder: string = ''
): PutObjectCommand {
  return new PutObjectCommand({
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: folder + key,
    Body: buffer,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256',
    Metadata: {
      'uploaded-at': new Date().toISOString(),
      'service': 'english-conversation-management'
    }
  });
}

// S3 파일 삭제 파라미터 생성 함수 (v3)
export function createS3DeleteParamsV3(key: string): DeleteObjectCommand {
  return new DeleteObjectCommand({
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key
  });
}

// S3 파일 URL 생성 함수
export function getS3FileUrl(key: string): string {
  return `https://${S3_CONFIG.BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${key}`;
}

// Presigned URL 생성 함수 (v3)
export async function generatePresignedUrlV3(key: string, expiresIn: number = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key
  });

  return await getSignedUrl(s3ClientV3, command, { expiresIn });
}

// S3 버킷 존재 확인 및 생성 함수 (v3)
export async function ensureS3BucketExistsV3(): Promise<void> {
  try {
    const command = new HeadBucketCommand({ Bucket: S3_CONFIG.BUCKET_NAME });
    await s3ClientV3.send(command);
    console.log(`✅ S3 버킷 '${S3_CONFIG.BUCKET_NAME}' 확인 완료`);
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      console.log(`🔧 S3 버킷 '${S3_CONFIG.BUCKET_NAME}' 생성 중...`);
      
      const createCommand = new CreateBucketCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        CreateBucketConfiguration: {
          LocationConstraint: process.env.AWS_REGION || 'ap-northeast-2'
        }
      });
      
      await s3ClientV3.send(createCommand);
      
      // 버킷 정책 설정 (필요한 경우)
      const bucketPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowPrivateAccess',
            Effect: 'Allow',
            Principal: {
              AWS: `arn:aws:iam::${process.env.AWS_ACCOUNT_ID}:root`
            },
            Action: 's3:*',
            Resource: [
              `arn:aws:s3:::${S3_CONFIG.BUCKET_NAME}`,
              `arn:aws:s3:::${S3_CONFIG.BUCKET_NAME}/*`
            ]
          }
        ]
      };
      
      const policyCommand = new PutBucketPolicyCommand({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Policy: JSON.stringify(bucketPolicy)
      });
      
      await s3ClientV3.send(policyCommand);
      
      console.log(`✅ S3 버킷 '${S3_CONFIG.BUCKET_NAME}' 생성 완료`);
    } else {
      throw error;
    }
  }
}

// S3 파일 업로드 함수 (v3)
export async function uploadToS3V3(
  key: string,
  buffer: Buffer,
  mimeType: string,
  folder: string = ''
): Promise<void> {
  const command = createS3UploadParamsV3(key, buffer, mimeType, folder);
  await s3ClientV3.send(command);
}

// S3 파일 삭제 함수 (v3)
export async function deleteFromS3V3(key: string): Promise<void> {
  const command = createS3DeleteParamsV3(key);
  await s3ClientV3.send(command);
}

// 호환성을 위한 함수들 (점진적 마이그레이션)
export const configureAWS = () => {
  console.log('✅ AWS SDK v3 초기화 완료');
};

// v2와 v3 병렬 사용을 위한 내보내기
export { s3ClientV3 as s3Client }; // 호환성을 위해 alias 제공