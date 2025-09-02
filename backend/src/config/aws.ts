import AWS from 'aws-sdk';

// AWS 설정
export function configureAWS(): void {
  AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION || 'ap-northeast-2' // 서울 리전
  });
}

// S3 클라이언트 생성
export const s3Client = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4'
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

// S3 업로드 파라미터 생성 함수
export function createS3UploadParams(
  key: string,
  buffer: Buffer,
  mimeType: string,
  folder: string = ''
): AWS.S3.PutObjectRequest {
  return {
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: folder + key,
    Body: buffer,
    ContentType: mimeType,
    ServerSideEncryption: 'AES256',
    Metadata: {
      'uploaded-at': new Date().toISOString(),
      'service': 'english-conversation-management'
    }
  };
}

// S3 파일 삭제 파라미터 생성 함수
export function createS3DeleteParams(key: string): AWS.S3.DeleteObjectRequest {
  return {
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key
  };
}

// S3 파일 URL 생성 함수
export function getS3FileUrl(key: string): string {
  return `https://${S3_CONFIG.BUCKET_NAME}.s3.${process.env.AWS_REGION || 'ap-northeast-2'}.amazonaws.com/${key}`;
}

// Presigned URL 생성 함수 (임시 다운로드 링크)
export function generatePresignedUrl(key: string, expiresIn: number = 3600): string {
  return s3Client.getSignedUrl('getObject', {
    Bucket: S3_CONFIG.BUCKET_NAME,
    Key: key,
    Expires: expiresIn // 기본 1시간
  });
}

// S3 버킷 존재 확인 및 생성 함수
export async function ensureS3BucketExists(): Promise<void> {
  try {
    await s3Client.headBucket({ Bucket: S3_CONFIG.BUCKET_NAME }).promise();
    console.log(`✅ S3 버킷 '${S3_CONFIG.BUCKET_NAME}' 확인 완료`);
  } catch (error: any) {
    if (error.statusCode === 404) {
      console.log(`🔧 S3 버킷 '${S3_CONFIG.BUCKET_NAME}' 생성 중...`);
      
      await s3Client.createBucket({
        Bucket: S3_CONFIG.BUCKET_NAME,
        CreateBucketConfiguration: {
          LocationConstraint: process.env.AWS_REGION || 'ap-northeast-2'
        }
      }).promise();
      
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
      
      await s3Client.putBucketPolicy({
        Bucket: S3_CONFIG.BUCKET_NAME,
        Policy: JSON.stringify(bucketPolicy)
      }).promise();
      
      console.log(`✅ S3 버킷 '${S3_CONFIG.BUCKET_NAME}' 생성 완료`);
    } else {
      throw error;
    }
  }
}