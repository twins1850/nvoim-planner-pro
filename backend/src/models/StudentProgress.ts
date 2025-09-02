import mongoose, { Document, Schema } from 'mongoose';

// Achievement interface
export interface IAchievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: Date;
}

// Weekly progress interface
export interface IWeeklyProgress {
  week: string;
  score: number;
  homeworkCount: number;
}

// Goal interface
export interface IGoal {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  currentValue: number;
  deadline?: Date;
  isCompleted: boolean;
  createdAt: Date;
}

// Student progress interface
export interface IStudentProgress extends Document {
  studentId: mongoose.Types.ObjectId;
  overallScore: number;
  completedHomework: number;
  totalHomework: number;
  streakDays: number;
  lastActivityDate: Date;
  achievements: IAchievement[];
  weeklyProgress: IWeeklyProgress[];
  goals: IGoal[];
  sharedWith: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Achievement schema
const AchievementSchema = new Schema<IAchievement>({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  unlockedAt: {
    type: Date,
    default: Date.now
  }
});

// Weekly progress schema
const WeeklyProgressSchema = new Schema<IWeeklyProgress>({
  week: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true
  },
  homeworkCount: {
    type: Number,
    required: true
  }
});

// Goal schema
const GoalSchema = new Schema<IGoal>({
  id: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  targetValue: {
    type: Number,
    required: true
  },
  currentValue: {
    type: Number,
    default: 0
  },
  deadline: {
    type: Date
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Student progress schema
const StudentProgressSchema = new Schema<IStudentProgress>({
  studentId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  overallScore: {
    type: Number,
    default: 0
  },
  completedHomework: {
    type: Number,
    default: 0
  },
  totalHomework: {
    type: Number,
    default: 0
  },
  streakDays: {
    type: Number,
    default: 0
  },
  lastActivityDate: {
    type: Date,
    default: Date.now
  },
  achievements: [AchievementSchema],
  weeklyProgress: [WeeklyProgressSchema],
  goals: [GoalSchema],
  sharedWith: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Indexes
StudentProgressSchema.index({ studentId: 1 });
StudentProgressSchema.index({ sharedWith: 1 });

export const StudentProgress = mongoose.model<IStudentProgress>('StudentProgress', StudentProgressSchema);