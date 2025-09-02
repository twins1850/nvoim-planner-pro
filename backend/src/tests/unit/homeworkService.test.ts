import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { homeworkService } from '../../services/homeworkService';
import Homework from '../../models/Homework';
import Lesson from '../../models/Lesson';
import { openaiService } from '../../services/openaiService';
import { NotFoundError } from '../../utils/errors';

// Mock dependencies
jest.mock('../../services/openaiService', () => ({
  openaiService: {
    generateText: jest.fn()
  }
}));

// Mock cron functions
jest.mock('../../config/cron', () => ({
  scheduleCronJob: jest.fn(),
  cancelCronJob: jest.fn()
}));

describe('HomeworkService', () => {
  let mongoServer: MongoMemoryServer;
  
  // Test data
  const mockPlannerId = new mongoose.Types.ObjectId().toString();
  const mockStudentId = new mongoose.Types.ObjectId().toString();
  const mockLessonId = new mongoose.Types.ObjectId().toString();
  
  // Sample homework data
  const sampleHomework = {
    plannerId: mockPlannerId,
    studentIds: [mockStudentId],
    title: 'Test Homework',
    description: 'This is a test homework',
    type: 'mixed',
    content: {
      instructions: 'Please complete the following tasks',
      attachments: [],
      questions: [
        {
          id: new mongoose.Types.ObjectId().toString(),
          type: 'text_input',
          question: 'Write a paragraph about your day'
        }
      ]
    },
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
    status: 'draft'
  };
  
  // Sample lesson data with analysis
  const sampleLesson = {
    _id: mockLessonId,
    plannerId: mockPlannerId,
    studentId: mockStudentId,
    lessonDate: new Date(),
    duration: 30,
    status: 'analyzed',
    metadata: {
      studentName: 'Test Student'
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
          startTime: 10,
          endTime: 15,
          transcript: 'I am fine, thank you.',
          confidence: 0.8
        }
      ],
      studentMetrics: {
        speakingTime: 15,
        pronunciationAccuracy: 0.8,
        fluencyScore: 0.7,
        vocabularyUsage: [
          { word: 'fine', frequency: 1, correctUsage: true }
        ],
        grammarAccuracy: 0.9
      },
      pronunciationScores: [
        { word: 'fine', score: 0.9, feedback: 'Good pronunciation' }
      ],
      participationLevel: 0.6,
      improvementAreas: ['Fluency', 'Vocabulary'],
      lessonInsights: ['Student is making progress', 'Needs more practice with questions'],
      generatedNotes: 'The student performed well but needs more practice.'
    }
  };

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear collections before each test
    await Homework.deleteMany({});
    await Lesson.deleteMany({});
    
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock OpenAI responses
    (openaiService.generateText as jest.Mock).mockImplementation((prompt) => {
      if (prompt.includes('personalized lesson summary')) {
        return Promise.resolve('This is a personalized summary for the student.');
      }
      if (prompt.includes('improvement recommendations')) {
        return Promise.resolve('Recommendation 1\nRecommendation 2\nRecommendation 3');
      }
      if (prompt.includes('vocabulary')) {
        return Promise.resolve(JSON.stringify([
          { word: 'fine', translation: '좋은', context: 'I am fine', priority: 1 }
        ]));
      }
      if (prompt.includes('expressions')) {
        return Promise.resolve(JSON.stringify([
          { expression: 'How are you', translation: '어떻게 지내세요', context: 'How are you today?', priority: 1 }
        ]));
      }
      return Promise.resolve('Generated text');
    });
  });

  describe('createHomework', () => {
    it('should create a new homework assignment', async () => {
      const result = await homeworkService.createHomework(sampleHomework);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(sampleHomework.title);
      expect(result.plannerId.toString()).toBe(mockPlannerId);
      expect(result.studentIds[0].toString()).toBe(mockStudentId);
      expect(result.status).toBe('draft');
    });
    
    it('should schedule delivery if scheduledSendTime is provided', async () => {
      const scheduledHomework = {
        ...sampleHomework,
        scheduledSendTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
        status: 'scheduled'
      };
      
      const result = await homeworkService.createHomework(scheduledHomework);
      
      expect(result).toBeDefined();
      expect(result.status).toBe('scheduled');
      // Check if scheduleCronJob was called
      const { scheduleCronJob } = require('../../config/cron');
      expect(scheduleCronJob).toHaveBeenCalled();
    });
  });

  describe('getHomeworkById', () => {
    it('should retrieve homework by ID', async () => {
      // Create a homework first
      const created = await homeworkService.createHomework(sampleHomework);
      
      // Retrieve it
      const result = await homeworkService.getHomeworkById(created._id.toString());
      
      expect(result).toBeDefined();
      expect(result._id.toString()).toBe(created._id.toString());
      expect(result.title).toBe(sampleHomework.title);
    });
    
    it('should throw NotFoundError if homework does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await expect(homeworkService.getHomeworkById(nonExistentId))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('getHomeworkByPlannerId', () => {
    it('should retrieve all homework for a planner', async () => {
      // Create multiple homework assignments
      await homeworkService.createHomework(sampleHomework);
      await homeworkService.createHomework({
        ...sampleHomework,
        title: 'Another Homework'
      });
      
      const result = await homeworkService.getHomeworkByPlannerId(mockPlannerId);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].plannerId.toString()).toBe(mockPlannerId);
    });
    
    it('should filter homework by status', async () => {
      // Create homework with different statuses
      await homeworkService.createHomework(sampleHomework);
      await homeworkService.createHomework({
        ...sampleHomework,
        status: 'sent'
      });
      
      const result = await homeworkService.getHomeworkByPlannerId(mockPlannerId, { status: 'sent' });
      
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('sent');
    });
  });

  describe('getHomeworkByStudentId', () => {
    it('should retrieve all homework for a student', async () => {
      // Create homework assigned to the student
      await homeworkService.createHomework({
        ...sampleHomework,
        status: 'sent'
      });
      
      const result = await homeworkService.getHomeworkByStudentId(mockStudentId);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].studentIds[0].toString()).toBe(mockStudentId);
    });
    
    it('should only return sent or completed homework', async () => {
      // Create homework with different statuses
      await homeworkService.createHomework(sampleHomework); // draft
      await homeworkService.createHomework({
        ...sampleHomework,
        status: 'sent'
      });
      
      const result = await homeworkService.getHomeworkByStudentId(mockStudentId);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].status).toBe('sent');
    });
  });

  describe('updateHomework', () => {
    it('should update homework properties', async () => {
      // Create homework
      const created = await homeworkService.createHomework(sampleHomework);
      
      // Update it
      const updates = {
        title: 'Updated Title',
        description: 'Updated Description'
      };
      
      const result = await homeworkService.updateHomework(created._id.toString(), updates);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(updates.title);
      expect(result.description).toBe(updates.description);
    });
    
    it('should throw NotFoundError if homework does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await expect(homeworkService.updateHomework(nonExistentId, { title: 'New Title' }))
        .rejects.toThrow(NotFoundError);
    });
    
    it('should update scheduled time and reschedule job', async () => {
      // Create scheduled homework
      const created = await homeworkService.createHomework({
        ...sampleHomework,
        scheduledSendTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'scheduled'
      });
      
      // Reset mock to check new calls
      const { scheduleCronJob, cancelCronJob } = require('../../config/cron');
      jest.clearAllMocks();
      
      // Update scheduled time
      const newScheduledTime = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const result = await homeworkService.updateHomework(created._id.toString(), {
        scheduledSendTime: newScheduledTime
      });
      
      expect(result).toBeDefined();
      expect(result.scheduledSendTime).toEqual(newScheduledTime);
      expect(cancelCronJob).toHaveBeenCalled();
      expect(scheduleCronJob).toHaveBeenCalled();
    });
  });

  describe('deleteHomework', () => {
    it('should delete homework', async () => {
      // Create homework
      const created = await homeworkService.createHomework(sampleHomework);
      
      // Delete it
      await homeworkService.deleteHomework(created._id.toString());
      
      // Try to retrieve it
      await expect(homeworkService.getHomeworkById(created._id.toString()))
        .rejects.toThrow(NotFoundError);
    });
    
    it('should cancel scheduled job if homework was scheduled', async () => {
      // Create scheduled homework
      const created = await homeworkService.createHomework({
        ...sampleHomework,
        scheduledSendTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'scheduled'
      });
      
      // Reset mock to check new calls
      const { cancelCronJob } = require('../../config/cron');
      jest.clearAllMocks();
      
      // Delete it
      await homeworkService.deleteHomework(created._id.toString());
      
      expect(cancelCronJob).toHaveBeenCalled();
    });
  });

  describe('generatePersonalizedHomework', () => {
    it('should generate personalized homework based on lesson analysis', async () => {
      // Create a lesson with analysis
      await Lesson.create(sampleLesson);
      
      // Generate personalized homework
      const result = await homeworkService.generatePersonalizedHomework(
        mockLessonId,
        mockPlannerId,
        mockStudentId
      );
      
      expect(result).toBeDefined();
      expect(result.isPersonalized).toBe(true);
      expect(result.basedOnLessonId.toString()).toBe(mockLessonId);
      expect(result.personalizedData).toBeDefined();
      expect(result.personalizedData.studentSpecificSummary).toBeDefined();
      expect(result.personalizedData.improvementRecommendations).toBeDefined();
      expect(result.personalizedData.vocabularyList).toBeDefined();
      expect(result.personalizedData.expressionList).toBeDefined();
    });
    
    it('should throw NotFoundError if lesson does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await expect(homeworkService.generatePersonalizedHomework(
        nonExistentId,
        mockPlannerId,
        mockStudentId
      )).rejects.toThrow(NotFoundError);
    });
    
    it('should use base template if provided', async () => {
      // Create a lesson with analysis
      await Lesson.create(sampleLesson);
      
      // Base template
      const baseTemplate = {
        title: 'Template Title',
        description: 'Template Description',
        type: 'audio',
        content: {
          instructions: 'Template Instructions',
          attachments: [],
          questions: [
            {
              id: new mongoose.Types.ObjectId().toString(),
              type: 'audio_recording',
              question: 'Record yourself saying these phrases'
            }
          ]
        }
      };
      
      // Generate personalized homework with template
      const result = await homeworkService.generatePersonalizedHomework(
        mockLessonId,
        mockPlannerId,
        mockStudentId,
        baseTemplate
      );
      
      expect(result).toBeDefined();
      expect(result.title).toBe(baseTemplate.title);
      expect(result.description).toBe(baseTemplate.description);
      expect(result.type).toBe(baseTemplate.type);
      expect(result.content.instructions).toBe(baseTemplate.content.instructions);
      expect(result.content.questions[0].type).toBe('audio_recording');
    });
  });

  describe('createHomeworkFromTemplate', () => {
    it('should create homework from a template', async () => {
      // Create a template
      const template = await homeworkService.createHomework({
        ...sampleHomework,
        isTemplate: true,
        templateName: 'Test Template',
        studentIds: []
      });
      
      // Create homework from template
      const studentIds = [mockStudentId, new mongoose.Types.ObjectId().toString()];
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
      const result = await homeworkService.createHomeworkFromTemplate(
        template._id.toString(),
        studentIds,
        dueDate
      );
      
      expect(result).toBeDefined();
      expect(result.isTemplate).toBe(false);
      expect(result.title).toBe(template.title);
      expect(result.studentIds.length).toBe(2);
      expect(result.dueDate).toEqual(dueDate);
    });
    
    it('should throw NotFoundError if template does not exist', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      
      await expect(homeworkService.createHomeworkFromTemplate(
        nonExistentId,
        [mockStudentId],
        new Date()
      )).rejects.toThrow(NotFoundError);
    });
  });

  describe('saveAsTemplate', () => {
    it('should save homework as a template', async () => {
      // Create homework
      const homework = await homeworkService.createHomework(sampleHomework);
      
      // Save as template
      const templateName = 'My Template';
      const templateCategory = 'Grammar';
      
      const result = await homeworkService.saveAsTemplate(
        homework._id.toString(),
        templateName,
        templateCategory
      );
      
      expect(result).toBeDefined();
      expect(result.isTemplate).toBe(true);
      expect(result.templateName).toBe(templateName);
      expect(result.templateCategory).toBe(templateCategory);
      expect(result.studentIds.length).toBe(0); // Templates don't have assigned students
    });
  });

  describe('getHomeworkTemplates', () => {
    it('should retrieve all templates for a planner', async () => {
      // Create multiple templates
      await homeworkService.createHomework({
        ...sampleHomework,
        isTemplate: true,
        templateName: 'Template 1',
        templateCategory: 'Grammar',
        studentIds: []
      });
      
      await homeworkService.createHomework({
        ...sampleHomework,
        isTemplate: true,
        templateName: 'Template 2',
        templateCategory: 'Vocabulary',
        studentIds: []
      });
      
      const result = await homeworkService.getHomeworkTemplates(mockPlannerId);
      
      expect(result).toBeDefined();
      expect(result.length).toBe(2);
      expect(result[0].isTemplate).toBe(true);
    });
    
    it('should filter templates by category', async () => {
      // Create templates with different categories
      await homeworkService.createHomework({
        ...sampleHomework,
        isTemplate: true,
        templateName: 'Template 1',
        templateCategory: 'Grammar',
        studentIds: []
      });
      
      await homeworkService.createHomework({
        ...sampleHomework,
        isTemplate: true,
        templateName: 'Template 2',
        templateCategory: 'Vocabulary',
        studentIds: []
      });
      
      const result = await homeworkService.getHomeworkTemplates(mockPlannerId, 'Grammar');
      
      expect(result).toBeDefined();
      expect(result.length).toBe(1);
      expect(result[0].templateCategory).toBe('Grammar');
    });
  });

  describe('assignHomeworkToMultipleStudents', () => {
    it('should assign homework to multiple students', async () => {
      // Student IDs
      const studentIds = [
        mockStudentId,
        new mongoose.Types.ObjectId().toString(),
        new mongoose.Types.ObjectId().toString()
      ];
      
      // Create homework for multiple students
      const result = await homeworkService.assignHomeworkToMultipleStudents(
        sampleHomework,
        studentIds
      );
      
      expect(result).toBeDefined();
      expect(result.studentIds.length).toBe(3);
      expect(result.studentIds.map(id => id.toString())).toEqual(expect.arrayContaining(studentIds));
    });
  });
});