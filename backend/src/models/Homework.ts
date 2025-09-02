import mongoose, { Schema, Document } from 'mongoose';
import { Homework as HomeworkType } from '../../../shared/types';

export interface HomeworkDocument extends Document, Omit<HomeworkType, '_id'> {
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

const HomeworkQuestionSchema = new Schema({
  id: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['audio_recording', 'text_input', 'multiple_choice']
  },
  question: { type: String, required: true },
  options: [{ type: String }],
  targetAnswer: { type: String }
});

const HomeworkContentSchema = new Schema({
  instructions: { type: String, required: true },
  attachments: [FileReferenceSchema],
  questions: [HomeworkQuestionSchema],
  expectedDuration: { type: Number }
});

const HomeworkSchema = new Schema({
  plannerId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  studentIds: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }],
  title: { type: String, required: true },
  description: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    enum: ['audio', 'text', 'mixed']
  },
  content: { 
    type: HomeworkContentSchema, 
    required: true 
  },
  dueDate: { type: Date, required: true },
  scheduledSendTime: { type: Date },
  isPersonalized: { type: Boolean, default: false },
  basedOnLessonId: { type: Schema.Types.ObjectId, ref: 'Lesson' },
  status: { 
    type: String, 
    required: true,
    enum: ['draft', 'scheduled', 'sent', 'completed'],
    default: 'draft'
  },
  // Additional fields for personalized homework
  personalizedData: {
    studentSpecificSummary: { type: String },
    improvementRecommendations: [{ type: String }],
    vocabularyList: [{ 
      word: { type: String },
      translation: { type: String },
      context: { type: String },
      priority: { type: Number, default: 1 }
    }],
    expressionList: [{ 
      expression: { type: String },
      translation: { type: String },
      context: { type: String },
      priority: { type: Number, default: 1 }
    }]
  },
  // For template functionality
  isTemplate: { type: Boolean, default: false },
  templateName: { type: String },
  templateCategory: { type: String }
}, {
  timestamps: true
});

// Indexes for performance
HomeworkSchema.index({ plannerId: 1, createdAt: -1 });
HomeworkSchema.index({ studentIds: 1, dueDate: 1 });
HomeworkSchema.index({ status: 1, scheduledSendTime: 1 });
HomeworkSchema.index({ isTemplate: 1, plannerId: 1 });

const Homework = mongoose.model<HomeworkDocument>('Homework', HomeworkSchema);

export default Homework;