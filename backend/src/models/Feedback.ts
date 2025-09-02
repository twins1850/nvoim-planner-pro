import mongoose, { Document, Schema } from 'mongoose';
import { ObjectId } from 'mongodb';

export interface FeedbackAttachment {
  type: 'audio' | 'text' | 'image';
  content: string; // URL for audio/image, actual text for text type
  mimeType?: string;
  fileName?: string;
}

export interface AssessmentCriteria {
  criteriaId: string;
  name: string;
  score: number;
  maxScore: number;
  comments: string;
}

export interface FeedbackDocument extends Document {
  submissionId: ObjectId;
  studentId: ObjectId;
  plannerId: ObjectId;
  homeworkId: ObjectId;
  aiEvaluation: {
    overallScore: number;
    strengths: string[];
    improvementAreas: string[];
    detailedFeedback: string;
    assessmentCriteria: AssessmentCriteria[];
    generatedAt: Date;
  };
  plannerFeedback: {
    overallScore: number;
    comments: string;
    attachments: FeedbackAttachment[];
    assessmentCriteria: AssessmentCriteria[];
    providedAt: Date;
  };
  status: 'ai_generated' | 'planner_reviewed' | 'sent_to_student';
  studentViewed: boolean;
  studentViewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<FeedbackDocument>(
  {
    submissionId: { type: Schema.Types.ObjectId, ref: 'HomeworkSubmission', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    plannerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    homeworkId: { type: Schema.Types.ObjectId, ref: 'Homework', required: true },
    aiEvaluation: {
      overallScore: { type: Number, required: true },
      strengths: [{ type: String }],
      improvementAreas: [{ type: String }],
      detailedFeedback: { type: String, required: true },
      assessmentCriteria: [
        {
          criteriaId: { type: String, required: true },
          name: { type: String, required: true },
          score: { type: Number, required: true },
          maxScore: { type: Number, required: true },
          comments: { type: String }
        }
      ],
      generatedAt: { type: Date, default: Date.now }
    },
    plannerFeedback: {
      overallScore: { type: Number },
      comments: { type: String },
      attachments: [
        {
          type: { type: String, enum: ['audio', 'text', 'image'], required: true },
          content: { type: String, required: true },
          mimeType: { type: String },
          fileName: { type: String }
        }
      ],
      assessmentCriteria: [
        {
          criteriaId: { type: String, required: true },
          name: { type: String, required: true },
          score: { type: Number, required: true },
          maxScore: { type: Number, required: true },
          comments: { type: String }
        }
      ],
      providedAt: { type: Date }
    },
    status: {
      type: String,
      enum: ['ai_generated', 'planner_reviewed', 'sent_to_student'],
      default: 'ai_generated'
    },
    studentViewed: { type: Boolean, default: false },
    studentViewedAt: { type: Date }
  },
  { timestamps: true }
);

// Indexes for performance
FeedbackSchema.index({ submissionId: 1 }, { unique: true });
FeedbackSchema.index({ studentId: 1, createdAt: -1 });
FeedbackSchema.index({ plannerId: 1, createdAt: -1 });
FeedbackSchema.index({ homeworkId: 1 });
FeedbackSchema.index({ status: 1 });

const Feedback = mongoose.model<FeedbackDocument>('Feedback', FeedbackSchema);

export default Feedback;