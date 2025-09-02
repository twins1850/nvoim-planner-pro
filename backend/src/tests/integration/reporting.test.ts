import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server';
import { User } from '../../models/User';
import { StudentProgress } from '../../models/StudentProgress';
import { Lesson } from '../../models/Lesson';
import HomeworkSubmission from '../../models/HomeworkSubmission';
import { ReportTemplate } from '../../models/ReportTemplate';
import { generateToken } from '../../utils/jwt';

describe('Reporting API Integration Tests', () => {
  let plannerToken: string;
  let plannerId: string;
  let studentIds: string[] = [];
  let templateId: string;

  // Setup test data before running tests
  beforeAll(async () => {
    // Clear relevant collections
    await User.deleteMany({});
    await StudentProgress.deleteMany({});
    await Lesson.deleteMany({});
    await HomeworkSubmission.deleteMany({});
    await ReportTemplate.deleteMany({});

    // Create a planner user
    const planner = await User.create({
      email: 'planner@test.com',
      password: 'password123',
      role: 'planner',
      profile: {
        name: '테스트 플래너',
        preferences: {
          language: 'ko',
          notifications: true,
          timezone: 'Asia/Seoul'
        }
      }
    });
    plannerId = planner._id.toString();
    plannerToken = generateToken(planner);

    // Create student users
    const students = await User.create([
      {
        email: 'student1@test.com',
        password: 'password123',
        role: 'student',
        profile: {
          name: '학생 1',
          assignedPlanner: planner._id,
          learningLevel: 'intermediate',
          preferences: {
            language: 'ko',
            notifications: true,
            timezone: 'Asia/Seoul'
          }
        },
        lastLoginAt: new Date()
      },
      {
        email: 'student2@test.com',
        password: 'password123',
        role: 'student',
        profile: {
          name: '학생 2',
          assignedPlanner: planner._id,
          learningLevel: 'beginner',
          preferences: {
            language: 'ko',
            notifications: true,
            timezone: 'Asia/Seoul'
          }
        },
        lastLoginAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
      },
      {
        email: 'student3@test.com',
        password: 'password123',
        role: 'student',
        profile: {
          name: '학생 3',
          assignedPlanner: planner._id,
          learningLevel: 'advanced',
          preferences: {
            language: 'ko',
            notifications: true,
            timezone: 'Asia/Seoul'
          }
        },
        lastLoginAt: new Date()
      }
    ]);

    studentIds = students.map(student => student._id.toString());

    // Update planner with managed students
    await User.findByIdAndUpdate(plannerId, {
      'profile.managedStudents': studentIds
    });

    // Create student progress records
    await StudentProgress.create([
      {
        studentId: studentIds[0],
        overallScore: 85,
        completedHomework: 8,
        totalHomework: 10,
        streakDays: 5,
        lastActivityDate: new Date(),
        weeklyProgress: [
          { week: '2023-W01', score: 80, homeworkCount: 2 },
          { week: '2023-W02', score: 85, homeworkCount: 3 },
          { week: '2023-W03', score: 90, homeworkCount: 3 }
        ]
      },
      {
        studentId: studentIds[1],
        overallScore: 65,
        completedHomework: 4,
        totalHomework: 10,
        streakDays: 0,
        lastActivityDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
        weeklyProgress: [
          { week: '2023-W01', score: 70, homeworkCount: 2 },
          { week: '2023-W02', score: 65, homeworkCount: 2 },
          { week: '2023-W03', score: 60, homeworkCount: 0 }
        ]
      },
      {
        studentId: studentIds[2],
        overallScore: 95,
        completedHomework: 10,
        totalHomework: 10,
        streakDays: 10,
        lastActivityDate: new Date(),
        weeklyProgress: [
          { week: '2023-W01', score: 90, homeworkCount: 3 },
          { week: '2023-W02', score: 95, homeworkCount: 4 },
          { week: '2023-W03', score: 100, homeworkCount: 3 }
        ]
      }
    ]);

    // Create lessons
    const fileReference = {
      filename: 'test.mp3',
      originalName: 'original.mp3',
      size: 1000000,
      mimeType: 'audio/mp3',
      s3Key: 'test-key',
      s3Url: 'https://example.com/test.mp3',
      uploadedAt: new Date()
    };

    const lessonAnalysis = {
      speakerSegments: [
        {
          speaker: 'teacher' as const,
          startTime: 0,
          endTime: 30,
          transcript: 'Hello, how are you today?',
          confidence: 0.9
        },
        {
          speaker: 'student' as const,
          startTime: 31,
          endTime: 40,
          transcript: 'I am fine, thank you.',
          confidence: 0.8
        }
      ],
      studentMetrics: {
        speakingTime: 60,
        pronunciationAccuracy: 85,
        fluencyScore: 80,
        vocabularyUsage: [
          { word: 'hello', frequency: 2, correctUsage: true },
          { word: 'fine', frequency: 1, correctUsage: true }
        ],
        grammarAccuracy: 90
      },
      pronunciationScores: [
        { word: 'hello', score: 90, feedback: 'Good pronunciation' },
        { word: 'fine', score: 85, feedback: 'Slightly unclear' }
      ],
      participationLevel: 75,
      improvementAreas: ['Pronunciation of "r" sounds', 'Past tense usage'],
      lessonInsights: ['Good vocabulary usage', 'Needs work on fluency'],
      generatedNotes: 'Student performed well but needs to practice more.',
      analysisCompletedAt: new Date()
    };

    await Lesson.create([
      {
        plannerId,
        studentId: studentIds[0],
        originalVideoFile: fileReference,
        extractedAudioFile: fileReference,
        analysisResult: lessonAnalysis,
        lessonDate: new Date(),
        duration: 1800,
        status: 'completed',
        metadata: {
          studentName: '학생 1',
          extractedFromFilename: true,
          originalFileSize: 90000000,
          extractedFileSize: 5000000,
          compressionRatio: 0.055
        }
      },
      {
        plannerId,
        studentId: studentIds[1],
        originalVideoFile: fileReference,
        extractedAudioFile: fileReference,
        analysisResult: {
          ...lessonAnalysis,
          participationLevel: 50,
          studentMetrics: {
            ...lessonAnalysis.studentMetrics,
            pronunciationAccuracy: 65,
            fluencyScore: 60,
            grammarAccuracy: 70
          }
        },
        lessonDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        duration: 1800,
        status: 'completed',
        metadata: {
          studentName: '학생 2',
          extractedFromFilename: true,
          originalFileSize: 90000000,
          extractedFileSize: 5000000,
          compressionRatio: 0.055
        }
      },
      {
        plannerId,
        studentId: studentIds[2],
        originalVideoFile: fileReference,
        extractedAudioFile: fileReference,
        analysisResult: {
          ...lessonAnalysis,
          participationLevel: 95,
          studentMetrics: {
            ...lessonAnalysis.studentMetrics,
            pronunciationAccuracy: 95,
            fluencyScore: 90,
            grammarAccuracy: 95
          }
        },
        lessonDate: new Date(),
        duration: 1800,
        status: 'completed',
        metadata: {
          studentName: '학생 3',
          extractedFromFilename: true,
          originalFileSize: 90000000,
          extractedFileSize: 5000000,
          compressionRatio: 0.055
        }
      }
    ]);

    // Create homework submissions
    const submissionAnswer = {
      questionId: 'q1',
      type: 'text' as const,
      content: 'This is my answer',
      metadata: {
        recordingDuration: 0,
        wordCount: 5,
        submittedAt: new Date()
      }
    };

    const aiEvaluation = {
      pronunciationScore: {
        overallScore: 85,
        wordScores: [
          { word: 'hello', score: 90 },
          { word: 'world', score: 80 }
        ],
        feedback: 'Good pronunciation overall'
      },
      grammarCorrections: [
        {
          original: 'I goes to school',
          corrected: 'I go to school',
          explanation: 'Use the base form of the verb with "I"'
        }
      ],
      vocabularyFeedback: {
        usedWords: ['hello', 'world'],
        suggestions: ['greetings', 'earth'],
        level: 'intermediate' as const
      },
      overallScore: 85,
      strengths: ['Good vocabulary', 'Clear structure'],
      improvementAreas: ['Grammar usage', 'Sentence variety'],
      generatedAt: new Date()
    };

    const plannerFeedback = {
      score: 90,
      comments: 'Well done! Keep practicing.',
      reviewedAt: new Date()
    };

    await HomeworkSubmission.create([
      {
        homeworkId: new mongoose.Types.ObjectId(),
        studentId: studentIds[0],
        answers: [submissionAnswer],
        submittedAt: new Date(),
        aiEvaluation,
        plannerFeedback,
        finalScore: 90,
        status: 'completed'
      },
      {
        homeworkId: new mongoose.Types.ObjectId(),
        studentId: studentIds[0],
        answers: [submissionAnswer],
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        aiEvaluation,
        plannerFeedback,
        finalScore: 85,
        status: 'completed'
      },
      {
        homeworkId: new mongoose.Types.ObjectId(),
        studentId: studentIds[1],
        answers: [submissionAnswer],
        submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        aiEvaluation: {
          ...aiEvaluation,
          overallScore: 65,
          strengths: ['Effort shown'],
          improvementAreas: ['Grammar', 'Vocabulary', 'Pronunciation']
        },
        plannerFeedback: {
          ...plannerFeedback,
          score: 60,
          comments: 'Needs more practice.'
        },
        finalScore: 60,
        status: 'completed'
      },
      {
        homeworkId: new mongoose.Types.ObjectId(),
        studentId: studentIds[2],
        answers: [submissionAnswer],
        submittedAt: new Date(),
        aiEvaluation: {
          ...aiEvaluation,
          overallScore: 95,
          strengths: ['Excellent vocabulary', 'Perfect grammar', 'Natural fluency'],
          improvementAreas: []
        },
        plannerFeedback: {
          ...plannerFeedback,
          score: 95,
          comments: 'Outstanding work!'
        },
        finalScore: 95,
        status: 'completed'
      }
    ]);

    // Create report template
    const template = await ReportTemplate.create({
      name: '기본 학생 성과 보고서',
      description: '학생의 성과와 진도를 보여주는 기본 보고서 템플릿입니다.',
      sections: [
        {
          type: 'performance',
          title: '전체 성과',
          dataFields: ['overallScore', 'completionRate', 'streakDays'],
          chartType: 'radar'
        },
        {
          type: 'lessons',
          title: '최근 수업 분석',
          dataFields: ['participationLevel', 'pronunciationAccuracy', 'fluencyScore', 'grammarAccuracy'],
          chartType: 'bar'
        },
        {
          type: 'homework',
          title: '숙제 제출 현황',
          dataFields: ['submittedAt', 'score', 'isLate'],
          chartType: 'line'
        }
      ],
      createdBy: new mongoose.Types.ObjectId(plannerId),
      isDefault: true
    });

    templateId = template._id.toString();
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('Dashboard Data API', () => {
    it('should return dashboard data for a planner', async () => {
      const response = await request(app)
        .get('/api/reporting/dashboard')
        .set('Authorization', `Bearer ${plannerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      
      // Check student overviews
      expect(response.body.data.studentOverviews).toHaveLength(3);
      expect(response.body.data.studentOverviews[0]).toHaveProperty('name');
      expect(response.body.data.studentOverviews[0]).toHaveProperty('completedHomework');
      expect(response.body.data.studentOverviews[0]).toHaveProperty('totalHomework');
      expect(response.body.data.studentOverviews[0]).toHaveProperty('completionRate');
      expect(response.body.data.studentOverviews[0]).toHaveProperty('averageScore');
      expect(response.body.data.studentOverviews[0]).toHaveProperty('requiresAttention');
      
      // Check class statistics
      expect(response.body.data.classStatistics).toBeDefined();
      expect(response.body.data.classStatistics).toHaveProperty('totalStudents', 3);
      expect(response.body.data.classStatistics).toHaveProperty('activeStudents');
      expect(response.body.data.classStatistics).toHaveProperty('averageCompletionRate');
      expect(response.body.data.classStatistics).toHaveProperty('averageScore');
      expect(response.body.data.classStatistics).toHaveProperty('topPerformingStudents');
      expect(response.body.data.classStatistics).toHaveProperty('studentsRequiringAttention');
    });

    it('should return 401 if not authenticated', async () => {
      const response = await request(app)
        .get('/api/reporting/dashboard');

      expect(response.status).toBe(401);
    });
  });

  describe('Performance Trends API', () => {
    it('should return performance trends for a planner', async () => {
      const response = await request(app)
        .get('/api/reporting/trends')
        .set('Authorization', `Bearer ${plannerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should filter trends by period', async () => {
      const response = await request(app)
        .get('/api/reporting/trends?period=monthly')
        .set('Authorization', `Bearer ${plannerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Student Performance Detail API', () => {
    it('should return detailed performance data for a student', async () => {
      const response = await request(app)
        .get(`/api/reporting/students/${studentIds[0]}`)
        .set('Authorization', `Bearer ${plannerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.studentId).toBe(studentIds[0]);
      expect(response.body.data).toHaveProperty('studentName');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('learningLevel');
      expect(response.body.data).toHaveProperty('overallScore');
      expect(response.body.data).toHaveProperty('completionRate');
      expect(response.body.data).toHaveProperty('weeklyProgress');
      expect(response.body.data).toHaveProperty('recentLessons');
      expect(response.body.data).toHaveProperty('recentSubmissions');
    });

    it('should return 400 for invalid student ID', async () => {
      const response = await request(app)
        .get('/api/reporting/students/invalid-id')
        .set('Authorization', `Bearer ${plannerToken}`);

      expect(response.status).toBe(400);
    });
  });

  describe('Students Requiring Attention API', () => {
    it('should return students requiring attention', async () => {
      const response = await request(app)
        .get('/api/reporting/attention')
        .set('Authorization', `Bearer ${plannerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      if (response.body.data.length > 0) {
        expect(response.body.data[0]).toHaveProperty('_id');
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('reason');
        expect(response.body.data[0]).toHaveProperty('priority');
      }
    });
  });

  describe('Bulk Operations API', () => {
    it('should perform bulk operations on students', async () => {
      const response = await request(app)
        .post('/api/reporting/bulk')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          studentIds: [studentIds[0], studentIds[1]],
          operation: 'export_data',
          operationData: {
            format: 'csv'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toContain('학생 데이터를 내보냈습니다');
    });

    it('should return 400 for invalid operation', async () => {
      const response = await request(app)
        .post('/api/reporting/bulk')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          studentIds: [studentIds[0]],
          operation: 'invalid_operation'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Report Generation API', () => {
    it('should generate a report based on a template', async () => {
      const response = await request(app)
        .post('/api/reporting/generate')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          templateId,
          studentIds: [studentIds[0]],
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          format: {
            format: 'pdf'
          }
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('reportUrl');
      expect(response.body.data.reportUrl).toContain('https://example.com/reports/');
    });

    it('should return 400 for missing template ID', async () => {
      const response = await request(app)
        .post('/api/reporting/generate')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          studentIds: [studentIds[0]],
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString()
        });

      expect(response.status).toBe(400);
    });
  });

  describe('Report Scheduling API', () => {
    it('should schedule a report for automatic generation', async () => {
      const nextRunDate = new Date();
      nextRunDate.setDate(nextRunDate.getDate() + 7); // 7 days from now
      
      const response = await request(app)
        .post('/api/reporting/schedule')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          templateId,
          name: '주간 학생 성과 보고서',
          recipients: ['admin@example.com', 'teacher@example.com'],
          frequency: 'weekly',
          nextRunDate: nextRunDate.toISOString()
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data).toHaveProperty('_id');
      expect(response.body.data).toHaveProperty('templateId', templateId);
      expect(response.body.data).toHaveProperty('name', '주간 학생 성과 보고서');
      expect(response.body.data).toHaveProperty('frequency', 'weekly');
      expect(response.body.data).toHaveProperty('status', 'active');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/reporting/schedule')
        .set('Authorization', `Bearer ${plannerToken}`)
        .send({
          templateId,
          name: '주간 학생 성과 보고서'
          // Missing recipients, frequency, nextRunDate
        });

      expect(response.status).toBe(400);
    });
  });
});