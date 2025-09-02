import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.test file if it exists
dotenv.config({ path: path.resolve(__dirname, '../config/.env.test') });

// Set default environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// AWS SDK v3 환경 변수
process.env.AWS_REGION = 'ap-northeast-2';
process.env.AWS_ACCESS_KEY_ID = 'test-access-key';
process.env.AWS_SECRET_ACCESS_KEY = 'test-secret-key';
process.env.AWS_S3_BUCKET = 'test-bucket';
process.env.AWS_BACKUP_BUCKET = 'test-backup-bucket';

// Fix util for mongoose compatibility
const util = require('util');
if (!util.inherits) {
  util.inherits = function(ctor: any, superCtor: any) {
    ctor.super_ = superCtor;
    ctor.prototype = Object.create(superCtor.prototype, {
      constructor: {
        value: ctor,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
  };
}

// Increase timeout for tests
jest.setTimeout(30000);

// Mock Node.js modules to prevent compatibility issues
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  promises: {
    readFile: jest.fn().mockResolvedValue(''),
    writeFile: jest.fn().mockResolvedValue(undefined),
    access: jest.fn().mockResolvedValue(undefined),
    stat: jest.fn().mockResolvedValue({}),
    mkdir: jest.fn().mockResolvedValue(undefined),
    rmdir: jest.fn().mockResolvedValue(undefined),
    unlink: jest.fn().mockResolvedValue(undefined)
  }
}));

// Mock path to prevent AWS SDK issues
jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => '/' + args.join('/'))
}));

// Mock os module for AWS SDK compatibility
jest.mock('os', () => ({
  ...jest.requireActual('os'),
  homedir: jest.fn(() => '/home/test'),
  platform: jest.fn(() => 'linux'),
  tmpdir: jest.fn(() => '/tmp')
}));

// Mock util module to fix inherits issue
jest.mock('util', () => {
  const actualUtil = jest.requireActual('util');
  return {
    ...actualUtil,
    inherits: actualUtil.inherits || jest.fn(),
    promisify: jest.fn((fn) => jest.fn().mockResolvedValue({}))
  };
});

// Mock child_process for backup services
jest.mock('child_process', () => ({
  exec: jest.fn(),
  spawn: jest.fn(),
  execSync: jest.fn()
}));

// Mock winston to prevent util.inherits issues
jest.mock('winston', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  })),
  format: {
    combine: jest.fn(),
    timestamp: jest.fn(),
    errors: jest.fn(),
    printf: jest.fn(),
    colorize: jest.fn(),
    json: jest.fn()
  },
  transports: {
    Console: jest.fn(),
    File: jest.fn(),
    DailyRotateFile: jest.fn()
  }
}));

// Mock logger utility
jest.mock('../utils/logger', () => ({
  logWithContext: jest.fn(),
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock external services
jest.mock('../config/firebase', () => ({
  messaging: {
    sendMulticast: jest.fn().mockResolvedValue({
      successCount: 1,
      failureCount: 0,
      responses: [{ success: true }]
    })
  }
}));

// Mock AWS SDK v2 (기존 호환성)
jest.mock('../config/aws', () => ({
  s3: {
    upload: jest.fn().mockImplementation(() => ({
      promise: jest.fn().mockResolvedValue({
        Location: 'https://test-bucket.s3.amazonaws.com/test-file.mp3',
        Key: 'test-file.mp3'
      })
    })),
    getSignedUrl: jest.fn().mockReturnValue('https://test-bucket.s3.amazonaws.com/test-file.mp3?signed=true')
  }
}));

// Mock AWS SDK v3 (새 버전)
jest.mock('../config/aws-v3', () => ({
  s3ClientV3: {
    send: jest.fn().mockImplementation((command) => {
      // PutObjectCommand 모킹
      if (command.constructor.name === 'PutObjectCommand') {
        return Promise.resolve({
          ETag: '"test-etag"',
          Location: 'https://test-bucket.s3.amazonaws.com/test-file.mp3'
        });
      }
      // GetObjectCommand 모킹
      if (command.constructor.name === 'GetObjectCommand') {
        return Promise.resolve({
          Body: Buffer.from('test file content'),
          ContentType: 'audio/mp3',
          ContentLength: 100
        });
      }
      // DeleteObjectCommand 모킹
      if (command.constructor.name === 'DeleteObjectCommand') {
        return Promise.resolve({});
      }
      // ListObjectsV2Command 모킹
      if (command.constructor.name === 'ListObjectsV2Command') {
        return Promise.resolve({
          Contents: [
            {
              Key: 'test-file.mp3',
              LastModified: new Date(),
              Size: 100
            }
          ]
        });
      }
      return Promise.resolve({});
    })
  },
  S3_CONFIG: {
    BUCKET_NAME: 'test-bucket',
    FOLDERS: {
      ORIGINAL_VIDEOS: 'original-videos/',
      EXTRACTED_AUDIO: 'extracted-audio/',
      HOMEWORK_SUBMISSIONS: 'homework-submissions/',
      PROFILE_IMAGES: 'profile-images/'
    }
  },
  getS3FileUrl: jest.fn().mockReturnValue('https://test-bucket.s3.amazonaws.com/test-file.mp3'),
  generatePresignedUrlV3: jest.fn().mockResolvedValue('https://test-bucket.s3.amazonaws.com/test-file.mp3?signed=true'),
  uploadToS3V3: jest.fn().mockResolvedValue(undefined),
  deleteFromS3V3: jest.fn().mockResolvedValue(undefined)
}));

jest.mock('../config/azure', () => ({
  speechConfig: {
    speechRecognitionLanguage: 'en-US',
    endpointId: 'test-endpoint-id',
    subscriptionKey: 'test-subscription-key',
    region: 'eastus'
  },
  createSpeechConfig: jest.fn().mockReturnValue({
    speechRecognitionLanguage: 'en-US',
    endpointId: 'test-endpoint-id'
  })
}));

jest.mock('../config/openai', () => ({
  openai: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: 'This is a test response from OpenAI'
              }
            }
          ],
          usage: {
            total_tokens: 100
          }
        })
      }
    }
  }
}));

// Global teardown
afterAll(async () => {
  // Add any global cleanup here
});