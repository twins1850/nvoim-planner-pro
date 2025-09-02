import mongoose, { Document, Schema } from 'mongoose';

// 파일 상태 타입
export type FileStatus = 'uploaded' | 'processing' | 'processed' | 'failed';

// 파일 타입
export type FileType = 'video' | 'audio' | 'image';

// 파일 인터페이스
export interface IFile extends Document {
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  s3Key?: string;
  s3Url?: string;
  type: FileType;
  status: FileStatus;
  processingError?: string;
  metadata: {
    duration?: number;
    width?: number;
    height?: number;
    bitrate?: number;
    format?: string;
    studentName?: string;
    lessonDate?: Date;
    extractedFromFilename: boolean;
  };
  uploadedBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// 파일 스키마
const FileSchema = new Schema<IFile>(
  {
    originalName: {
      type: String,
      required: true,
    },
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    s3Key: {
      type: String,
    },
    s3Url: {
      type: String,
    },
    type: {
      type: String,
      enum: ['video', 'audio', 'image'],
      required: true,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'processed', 'failed'],
      default: 'uploaded',
    },
    processingError: {
      type: String,
    },
    metadata: {
      duration: {
        type: Number,
      },
      width: {
        type: Number,
      },
      height: {
        type: Number,
      },
      bitrate: {
        type: Number,
      },
      format: {
        type: String,
      },
      studentName: {
        type: String,
      },
      lessonDate: {
        type: Date,
      },
      extractedFromFilename: {
        type: Boolean,
        default: false,
      },
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// 인덱스 설정
FileSchema.index({ uploadedBy: 1, createdAt: -1 });
FileSchema.index({ status: 1 });
FileSchema.index({ type: 1 });
FileSchema.index({ 'metadata.studentName': 1 });
FileSchema.index({ 'metadata.lessonDate': 1 });

export const File = mongoose.model<IFile>('File', FileSchema);