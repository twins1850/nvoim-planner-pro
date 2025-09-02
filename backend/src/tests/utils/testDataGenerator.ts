import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../../models/User';
import { Homework } from '../../models/Homework';
import { HomeworkSubmission } from '../../models/HomeworkSubmission';
import { Lesson } from '../../models/Lesson';
import { Feedback } from '../../models/Feedback';
import { Notification } from '../../models/Notification';
import { DeviceToken } from '../../models/DeviceToken';
import { StudentProgress } from '../../models/StudentProgress';
import { ApiUsage } from '../../models/ApiUsage';
import { BudgetSetting } from '../../models/BudgetSetting';

/**
 * Generate a test user with specified role
 */
export const createTestUser = async (role: 'planner' | 'student', overrides = {}) => {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);
  
  const defaultUser = {
    email: `test${Math.random().toString(36).substring(7)}@example.com`,
    password: hashedPassword,
    role,
    profile: {
      name: `Test ${role === 'planner' ? 'Planner' : 'Student'}`,
      phone: '010-1234-5678',
      preferences: {
        notifications: true,
        language: 'ko',
        theme: 'light'
      }
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const userData = { ...defaultUser, ...overrides };
  const user = await User.create(userData);
  
  return user;
};

/**
 * Generate a JWT token for a user
 */
export const generateTestToken = (userId: string) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1d' }
  );
};

/**
 * Create a test lesson
 */
export const createTestLesson = async (plannerId: string, studentId: string, overrides = {}) => {
  const defaultLesson = {
    plannerId: new mongoose.Types.ObjectId(plannerId),
    studentId: new mongoose.Types.ObjectId(studentId),
    originalVideoFile: {
      filename: 'test-video.mp4',
      path: '/uploads/test-video.mp4',
      size: 90000000,
      mimetype: 'video/mp4'
    },
    extractedAudioFile: {
      filename: 'test-audio.mp3',
      path: '/uploads/test-audio.mp3',
      size: 5000000,
      mimetype: 'audio/mp3'
    },
    analysisResult: {
      speakerSegments: [
        {
          speaker: 'teacher',
          startTime: 0,
          endTime: 10,
          transcript: 'How are you today?',
          confidence: 0.9
        },
        {
          speaker: 'student',
          startTime: 11,
          endTime: 15,
          transcript: 'I am fine, thank you.',
          confidence: 0.8
        }
      ],
      studentMetrics: {
        speakingTime: 120,
        pronunciationAccuracy: 0.75,
        fluencyScore: 0.8,
        vocabularyUsage: [
          { word: 'fine', count: 1, difficulty: 'basic' }
        ],
        grammarAccuracy: 0.85
      },
      pronunciationScores: [
        { word: 'fine', score: 0.9, feedback: 'Good pronunciation' }
      ],
      participationLevel: 70,
      improvementAreas: ['Practice more complex sentences'],
      lessonInsights: ['Good basic conversation skills'],
      generatedNotes: 'Student performed well in basic conversation.'
    },
    lessonDate: new Date(),
    duration: 600,
    status: 'analyzed',
    createdAt: new Date()
  };
  
  const lessonData = { ...defaultLesson, ...overrides };
  const lesson = await Lesson.create(lessonData);
  
  return lesson;
};

/**
 * Create a test homework
 */
export const createTestHomework = async (plannerId: string, studentIds: string[], overrides = {}) => {
  const defaultHomework = {
    plannerId: new mongoose.Types.ObjectId(plannerId),
    studentIds: studentIds.map(id => new mongoose.Types.ObjectId(id)),
    title: 'Test Homework',
    description: 'This is a test homework assignment',
    type: 'mixed',
    content: {
      instructions: 'Please complete the following exercises',
      attachments: [
        {
          filename: 'test-attachment.pdf',
          path: '/uploads/test-attachment.pdf',
          size: 1000000,
          mimetype: 'application/pdf'
        }
      ],
      questions: [
        {
          id: '1',
          type: 'audio_recording',
          question: 'Read the following passage aloud'
        },
        {
          id: '2',
          type: 'text_input',
          question: 'Write a short paragraph about your day'
        }
      ],
      expectedDuration: 30
    },
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    isPersonalized: false,
    status: 'sent',
    createdAt: new Date()
  };
  
  const homeworkData = { ...defaultHomework, ...overrides };
  const homework = await Homework.create(homeworkData);
  
  return homework;
};

/**
 * Create a test homework submission
 */
export const createTestSubmission = async (homeworkId: string, studentId: string, overrides = {}) => {
  const defaultSubmission = {
    homeworkId: new mongoose.Types.ObjectId(homeworkId),
    studentId: new mongoose.Types.ObjectId(studentId),
    answers: [
      {
        questionId: '1',
        type: 'audio',
        content: {
          filename: 'test-recording.mp3',
          path: '/uploads/test-recording.mp3',
          size: 2000000,
          mimetype: 'audio/mp3'
        }
      },
      {
        questionId: '2',
        type: 'text',
        content: 'This is my test answer.'
      }
    ],
    submittedAt: new Date(),
    aiEvaluation: {
      pronunciationScore: {
        overallScore: 0.8,
        detailedScores: [
          { word: 'test', score: 0.9 }
        ]
      },
      grammarCorrections: [
        { original: 'is', corrected: 'was', explanation: 'Use past tense' }
      ],
      vocabularyFeedback: {
        uniqueWords: 5,
        advancedWords: 1,
        suggestions: ['Consider using more varied vocabulary']
      },
      overallScore: 85,
      strengths: ['Good pronunciation', 'Clear communication'],
      improvementAreas: ['Use more complex sentence structures'],
      generatedAt: new Date()
    },
    status: 'ai_evaluated'
  };
  
  const submissionData = { ...defaultSubmission, ...overrides };
  const submission = await HomeworkSubmission.create(submissionData);
  
  return submission;
};

/**
 * Create test API usage data
 */
export const createTestApiUsage = async (userId: string, overrides = {}) => {
  const defaultApiUsage = {
    userId: new mongoose.Types.ObjectId(userId),
    service: 'openai',
    endpoint: 'chat/completions',
    model: 'gpt-4o',
    tokensUsed: 1500,
    estimatedCost: 0.03,
    timestamp: new Date()
  };
  
  const apiUsageData = { ...defaultApiUsage, ...overrides };
  const apiUsage = await ApiUsage.create(apiUsageData);
  
  return apiUsage;
};

/**
 * Create test budget setting
 */
export const createTestBudgetSetting = async (userId: string, overrides = {}) => {
  const defaultBudgetSetting = {
    userId: new mongoose.Types.ObjectId(userId),
    monthlyBudget: 50000,
    alertThreshold: 80,
    services: {
      openai: {
        enabled: true,
        budgetLimit: 30000
      },
      azure: {
        enabled: true,
        budgetLimit: 20000
      }
    },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const budgetSettingData = { ...defaultBudgetSetting, ...overrides };
  const budgetSetting = await BudgetSetting.create(budgetSettingData);
  
  return budgetSetting;
};

/**
 * Clean up test data
 */
export const cleanupTestData = async () => {
  await User.deleteMany({});
  await Lesson.deleteMany({});
  await Homework.deleteMany({});
  await HomeworkSubmission.deleteMany({});
  await Feedback.deleteMany({});
  await Notification.deleteMany({});
  await DeviceToken.deleteMany({});
  await StudentProgress.deleteMany({});
  await ApiUsage.deleteMany({});
  await BudgetSetting.deleteMany({});
};