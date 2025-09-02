import mongoose, { Document, Schema } from 'mongoose';

// 파일 참조 인터페이스
export interface IFileReference {
  filename: string;
  originalName: string;
  size: number;
  mimeType: string;
  s3Key: string;
  s3Url: string;
  uploadedAt: Date;
}

// 화자 세그먼트 인터페이스
export interface ISpeakerSegment {
  speaker: 'teacher' | 'student';
  startTime: number;
  endTime: number;
  transcript: string;
  confidence: number;
}

// 학생 메트릭 인터페이스
export interface IStudentMetrics {
  speakingTime: number; // 초 단위
  pronunciationAccuracy: number; // 0-100
  fluencyScore: number; // 0-100
  vocabularyUsage: {
    word: string;
    frequency: number;
    correctUsage: boolean;
  }[];
  grammarAccuracy: number; // 0-100
}

// 수업 분석 인터페이스
export interface ILessonAnalysis {
  speakerSegments: ISpeakerSegment[];
  studentMetrics: IStudentMetrics;
  pronunciationScores: {
    word: string;
    score: number;
    feedback: string;
  }[];
  participationLevel: number; // 0-100
  improvementAreas: string[];
  lessonInsights: string[];
  generatedNotes: string;
  analysisCompletedAt: Date;
}

// 수업 인터페이스
export interface ILesson extends Document {
  plannerId: mongoose.Types.ObjectId;
  studentId: mongoose.Types.ObjectId;
  originalVideoFile: IFileReference;
  extractedAudioFile?: IFileReference;
  analysisResult?: ILessonAnalysis;
  lessonDate: Date;
  duration: number; // 초 단위
  status: 'uploaded' | 'extracting' | 'extracted' | 'analyzing' | 'analyzed' | 'completed' | 'failed';
  errorMessage?: string;
  metadata: {
    studentName: string;
    extractedFromFilename: boolean;
    originalFileSize: number;
    extractedFileSize?: number;
    compressionRatio?: number;
    analysisMetadata?: {
      keyExpressions?: string[];
      pronunciationPoints?: string[];
      homeworkSuggestions?: string[];
      teacherCorrections?: { original: string; corrected: string; explanation: string }[];
      teacherSuggestions?: string[];
      teacherPraises?: string[];
      topics?: string[];
      vocabulary?: { word: string; meaning: string; example: string }[];
      grammar?: { pattern: string; explanation: string; example: string }[];
      culturalNotes?: string[];
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

// 파일 참조 스키마
const FileReferenceSchema = new Schema<IFileReference>({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  s3Key: { type: String, required: true },
  s3Url: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now }
});

// 화자 세그먼트 스키마
const SpeakerSegmentSchema = new Schema<ISpeakerSegment>({
  speaker: { type: String, enum: ['teacher', 'student'], required: true },
  startTime: { type: Number, required: true },
  endTime: { type: Number, required: true },
  transcript: { type: String, required: true },
  confidence: { type: Number, min: 0, max: 1, required: true }
});

// 학생 메트릭 스키마
const StudentMetricsSchema = new Schema<IStudentMetrics>({
  speakingTime: { type: Number, required: true, min: 0 },
  pronunciationAccuracy: { type: Number, required: true, min: 0, max: 100 },
  fluencyScore: { type: Number, required: true, min: 0, max: 100 },
  vocabularyUsage: [{
    word: { type: String, required: true },
    frequency: { type: Number, required: true, min: 1 },
    correctUsage: { type: Boolean, required: true }
  }],
  grammarAccuracy: { type: Number, required: true, min: 0, max: 100 }
});

// 수업 분석 스키마
const LessonAnalysisSchema = new Schema<ILessonAnalysis>({
  speakerSegments: [SpeakerSegmentSchema],
  studentMetrics: StudentMetricsSchema,
  pronunciationScores: [{
    word: { type: String, required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    feedback: { type: String, required: true }
  }],
  participationLevel: { type: Number, required: true, min: 0, max: 100 },
  improvementAreas: [{ type: String }],
  lessonInsights: [{ type: String }],
  generatedNotes: { type: String, default: '' },
  analysisCompletedAt: { type: Date, default: Date.now }
});

// 수업 스키마
const LessonSchema = new Schema<ILesson>({
  plannerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '플래너 ID는 필수입니다.']
  },
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '학생 ID는 필수입니다.']
  },
  originalVideoFile: {
    type: FileReferenceSchema,
    required: [true, '원본 비디오 파일 정보는 필수입니다.']
  },
  extractedAudioFile: {
    type: FileReferenceSchema
  },
  analysisResult: {
    type: LessonAnalysisSchema
  },
  lessonDate: {
    type: Date,
    required: [true, '수업 날짜는 필수입니다.']
  },
  duration: {
    type: Number,
    required: [true, '수업 시간은 필수입니다.'],
    min: [0, '수업 시간은 0보다 커야 합니다.']
  },
  status: {
    type: String,
    enum: ['uploaded', 'extracting', 'extracted', 'analyzing', 'analyzed', 'completed', 'failed'],
    default: 'uploaded'
  },
  errorMessage: {
    type: String
  },
  metadata: {
    studentName: { type: String, required: true },
    extractedFromFilename: { type: Boolean, default: false },
    originalFileSize: { type: Number, required: true },
    extractedFileSize: { type: Number },
    compressionRatio: { type: Number },
    analysisMetadata: {
      keyExpressions: [{ type: String }],
      pronunciationPoints: [{ type: String }],
      homeworkSuggestions: [{ type: String }],
      teacherCorrections: [{
        original: { type: String },
        corrected: { type: String },
        explanation: { type: String }
      }],
      teacherSuggestions: [{ type: String }],
      teacherPraises: [{ type: String }],
      topics: [{ type: String }],
      vocabulary: [{
        word: { type: String },
        meaning: { type: String },
        example: { type: String }
      }],
      grammar: [{
        pattern: { type: String },
        explanation: { type: String },
        example: { type: String }
      }],
      culturalNotes: [{ type: String }]
    }
  }
}, {
  timestamps: true
});

// 인덱스 설정
LessonSchema.index({ plannerId: 1, lessonDate: -1 });
LessonSchema.index({ studentId: 1, lessonDate: -1 });
LessonSchema.index({ status: 1, createdAt: -1 });
LessonSchema.index({ lessonDate: -1 });

export const Lesson = mongoose.model<ILesson>('Lesson', LessonSchema);