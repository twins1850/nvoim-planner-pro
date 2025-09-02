import mongoose, { Schema, Document } from 'mongoose';
import { HomeworkSubmission as HomeworkSubmissionType } from '../../../shared/types';

export interface HomeworkSubmissionDocument extends Document, Omit<HomeworkSubmissionType, '_id'> {
  // Additional methods or properties for the document
}

const FileReferenceSchema = new Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  size: { type: Number, required: true },
  mimeType: { type: String, required: true },
  s3Key: { type: String, required: true },
  s3Url: { type: String, required: true },
  uploadedAt: { type: Date, required: true, default: Date.now }
});

const SubmissionAnswerSchema = new Schema({
  questionId: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['audio', 'text', 'choice']
  },
  content: { type: Schema.Types.Mixed, required: true }, // Can be string or FileReference
  metadata: {
    recordingDuration: { type: Number },
    wordCount: { type: Number },
    submittedAt: { type: Date, default: Date.now }
  }
});

const AIEvaluationSchema = new Schema({
  pronunciationScore: {
    overallScore: { type: Number, min: 0, max: 100 },
    wordScores: [{
      word: { type: String, required: true },
      score: { type: Number, required: true, min: 0, max: 100 }
    }],
    feedback: { type: String }
  },
  grammarCorrections: [{
    original: { type: String, required: true },
    corrected: { type: String, required: true },
    explanation: { type: String, required: true }
  }],
  vocabularyFeedback: {
    usedWords: [{ type: String }],
    suggestions: [{ type: String }],
    level: { 
      type: String, 
      enum: ['beginner', 'intermediate', 'advanced'] 
    }
  },
  overallScore: { type: Number, required: true, min: 0, max: 100 },
  strengths: [{ type: String }],
  improvementAreas: [{ type: String }],
  generatedAt: { type: Date, required: true, default: Date.now }
});

const PlannerFeedbackSchema = new Schema({
  score: { type: Number, required: true, min: 0, max: 100 },
  comments: { type: String, required: true },
  audioFeedback: FileReferenceSchema,
  reviewedAt: { type: Date, required: true, default: Date.now }
});

const HomeworkSubmissionSchema = new Schema({
  homeworkId: { 
    type: Schema.Types.ObjectId, 
    ref: 'Homework', 
    required: true 
  },
  studentId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  answers: [SubmissionAnswerSchema],
  submittedAt: { type: Date, required: true, default: Date.now },
  aiEvaluation: AIEvaluationSchema,
  plannerFeedback: PlannerFeedbackSchema,
  finalScore: { type: Number, min: 0, max: 100 },
  status: { 
    type: String, 
    required: true,
    enum: ['submitted', 'ai_evaluated', 'reviewed', 'completed'],
    default: 'submitted'
  },
  // Additional fields for submission management
  isLate: { type: Boolean, default: false },
  submissionAttempts: { type: Number, default: 1 },
  lastModifiedAt: { type: Date, default: Date.now },
  // Offline submission support
  offlineSubmission: {
    isOffline: { type: Boolean, default: false },
    syncedAt: { type: Date },
    originalSubmissionTime: { type: Date }
  }
}, {
  timestamps: true
});

// Indexes for performance
HomeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });
HomeworkSubmissionSchema.index({ studentId: 1, submittedAt: -1 });
HomeworkSubmissionSchema.index({ status: 1, submittedAt: -1 });
HomeworkSubmissionSchema.index({ homeworkId: 1, status: 1 });

// Pre-save middleware to check if submission is late
HomeworkSubmissionSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Homework = mongoose.model('Homework');
      const homework = await Homework.findById(this.homeworkId);
      
      if (homework && homework.dueDate) {
        const dueDate = new Date(homework.dueDate);
        const submissionTime = this.offlineSubmission?.originalSubmissionTime || this.submittedAt;
        this.isLate = submissionTime > dueDate;
      }
    } catch (error) {
      console.error('Error checking submission deadline:', error);
    }
  }
  next();
});

const HomeworkSubmission = mongoose.model<HomeworkSubmissionDocument>('HomeworkSubmission', HomeworkSubmissionSchema);

export default HomeworkSubmission;