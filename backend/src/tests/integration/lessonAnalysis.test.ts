import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { Lesson } from '../../models/Lesson';
import { File } from '../../models/File';
import { User } from '../../models/User';
import { LessonAnalysisService } from '../../services/lessonAnalysisService';
import { AzureSpeechService } from '../../services/azureSpeechService';
import { OpenAIService } from '../../services/openaiService';

// Mock the Azure Speech Service
jest.mock('../../services/azureSpeechService');
// Mock the OpenAI Service
jest.mock('../../services/openaiService');

describe('Lesson Analysis Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let plannerId: mongoose.Types.ObjectId;
  let studentId: mongoose.Types.ObjectId;
  let audioFileId: mongoose.Types.ObjectId;
  let lessonId: mongoose.Types.ObjectId;

  // Sample data for tests
  const sampleSpeakerSegments = [
    {
      speaker: 'teacher' as const,
      startTime: 0,
      endTime: 10,
      transcript: 'Hello, how are you today?',
      confidence: 0.9
    },
    {
      speaker: 'student' as const,
      startTime: 11,
      endTime: 15,
      transcript: 'I am fine, thank you.',
      confidence: 0.8
    },
    {
      speaker: 'teacher' as const,
      startTime: 16,
      endTime: 25,
      transcript: 'Great! Let\'s talk about your weekend. What did you do?',
      confidence: 0.95
    },
    {
      speaker: 'student' as const,
      startTime: 26,
      endTime: 40,
      transcript: 'I went to the park with my friends. We played soccer and had a picnic.',
      confidence: 0.85
    }
  ];

  const sampleStudentMetrics = {
    speakingTime: 18,
    pronunciationAccuracy: 85,
    fluencyScore: 75,
    vocabularyUsage: [
      { word: 'park', frequency: 1, correctUsage: true },
      { word: 'friends', frequency: 1, correctUsage: true },
      { word: 'soccer', frequency: 1, correctUsage: true },
      { word: 'picnic', frequency: 1, correctUsage: true }
    ],
    grammarAccuracy: 80
  };

  const sampleConversationAnalysis = {
    lessonInsights: [
      'Student demonstrates good basic vocabulary',
      'Student can form complete sentences',
      'Student responds appropriately to questions'
    ],
    improvementAreas: [
      'Work on longer responses',
      'Practice more complex sentence structures',
      'Improve pronunciation of specific sounds'
    ],
    generatedNotes: 'This lesson focused on casual conversation about weekend activities. The student showed good basic communication skills but needs to work on expanding responses and using more varied vocabulary.'
  };

  const sampleStructuredSummary = {
    keyExpressions: [
      'went to the park (공원에 갔다)',
      'played soccer (축구를 했다)',
      'had a picnic (피크닉을 했다)'
    ],
    pronunciationPoints: [
      'Practice the "r" sound in "park"',
      'Work on the "c" sound in "picnic"'
    ],
    homeworkSuggestions: [
      'Write a longer paragraph about weekend activities',
      'Practice describing outdoor activities with more detail',
      'Learn 5 new vocabulary words related to hobbies'
    ]
  };

  const sampleTeacherFeedback = {
    corrections: [
      {
        original: 'I went park',
        corrected: 'I went to the park',
        explanation: 'Need to use the preposition "to" and the article "the" before "park"'
      }
    ],
    suggestions: [
      'Try to use more adjectives to describe the picnic',
      'Practice using past continuous tense'
    ],
    praises: [
      'Good job using past tense correctly',
      'Nice vocabulary about outdoor activities'
    ]
  };

  const sampleContentCategories = {
    topics: ['Weekend activities', 'Outdoor recreation', 'Social interactions'],
    vocabulary: [
      {
        word: 'park',
        meaning: '공원',
        example: 'I went to the park with my friends.'
      },
      {
        word: 'soccer',
        meaning: '축구',
        example: 'We played soccer in the park.'
      },
      {
        word: 'picnic',
        meaning: '피크닉',
        example: 'We had a picnic after playing soccer.'
      }
    ],
    grammar: [
      {
        pattern: 'Past Simple Tense',
        explanation: '과거에 완료된 행동을 표현할 때 사용',
        example: 'I went to the park. We played soccer.'
      }
    ],
    culturalNotes: [
      'Picnics are a common social activity in Western cultures, especially during weekends.'
    ]
  };

  beforeAll(async () => {
    // Start in-memory MongoDB server
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // Mock Azure Speech Service methods
    (AzureSpeechService.separateSpeakers as jest.Mock).mockResolvedValue(sampleSpeakerSegments);

    // Mock OpenAI Service methods
    (OpenAIService.analyzeConversation as jest.Mock).mockResolvedValue(sampleConversationAnalysis);
    (OpenAIService.calculateStudentMetrics as jest.Mock).mockResolvedValue(sampleStudentMetrics);
    (OpenAIService.generateStructuredSummary as jest.Mock).mockResolvedValue(sampleStructuredSummary);
    (OpenAIService.extractTeacherFeedback as jest.Mock).mockResolvedValue(sampleTeacherFeedback);
    (OpenAIService.categorizeContent as jest.Mock).mockResolvedValue(sampleContentCategories);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Create test users
    const planner = new User({
      email: 'planner@test.com',
      password: 'hashedpassword',
      role: 'planner',
      profile: {
        name: 'Test Planner',
        preferences: {
          language: 'ko',
          notifications: true,
          timezone: 'Asia/Seoul'
        }
      }
    });
    await planner.save();
    plannerId = planner._id;

    const student = new User({
      email: 'student@test.com',
      password: 'hashedpassword',
      role: 'student',
      profile: {
        name: 'Test Student',
        preferences: {
          language: 'ko',
          notifications: true,
          timezone: 'Asia/Seoul'
        },
        assignedPlanner: plannerId,
        learningLevel: 'intermediate'
      }
    });
    await student.save();
    studentId = student._id;

    // Create test audio file
    const audioFile = new File({
      originalName: 'test_audio.mp3',
      filename: 'test_audio_123456.mp3',
      mimeType: 'audio/mpeg',
      size: 5000000,
      path: '/tmp/test_audio_123456.mp3',
      type: 'audio',
      status: 'processed',
      s3Key: 'extracted-audio/test_audio_123456.mp3',
      s3Url: 'https://bucket.s3.region.amazonaws.com/extracted-audio/test_audio_123456.mp3',
      uploadedBy: plannerId
    });
    await audioFile.save();
    audioFileId = audioFile._id;

    // Create test lesson
    const lesson = new Lesson({
      plannerId,
      studentId,
      originalVideoFile: {
        filename: 'test_video.mp4',
        originalName: 'test_video.mp4',
        size: 90000000,
        mimeType: 'video/mp4',
        s3Key: 'original-videos/test_video.mp4',
        s3Url: 'https://bucket.s3.region.amazonaws.com/original-videos/test_video.mp4',
        uploadedAt: new Date()
      },
      extractedAudioFile: {
        filename: 'test_audio_123456.mp3',
        originalName: 'test_audio.mp3',
        size: 5000000,
        mimeType: 'audio/mpeg',
        s3Key: 'extracted-audio/test_audio_123456.mp3',
        s3Url: 'https://bucket.s3.region.amazonaws.com/extracted-audio/test_audio_123456.mp3',
        uploadedAt: new Date()
      },
      lessonDate: new Date(),
      duration: 1800, // 30 minutes
      status: 'extracted',
      metadata: {
        studentName: 'Test Student',
        extractedFromFilename: true,
        originalFileSize: 90000000,
        extractedFileSize: 5000000,
        compressionRatio: 0.055
      }
    });
    await lesson.save();
    lessonId = lesson._id;
  });

  afterEach(async () => {
    // Clean up after each test
    await User.deleteMany({});
    await File.deleteMany({});
    await Lesson.deleteMany({});
  });

  test('should successfully analyze a lesson', async () => {
    // Run the analysis
    const analyzedLesson = await LessonAnalysisService.analyzeLessonAudio(lessonId.toString());

    // Verify the lesson was updated correctly
    expect(analyzedLesson).toBeDefined();
    expect(analyzedLesson.status).toBe('analyzed');
    expect(analyzedLesson.analysisResult).toBeDefined();
    
    // Check speaker segments
    expect(analyzedLesson.analysisResult?.speakerSegments).toEqual(sampleSpeakerSegments);
    
    // Check student metrics
    expect(analyzedLesson.analysisResult?.studentMetrics).toEqual(sampleStudentMetrics);
    
    // Check lesson insights and improvement areas
    expect(analyzedLesson.analysisResult?.lessonInsights).toEqual(sampleConversationAnalysis.lessonInsights);
    expect(analyzedLesson.analysisResult?.improvementAreas).toEqual(sampleConversationAnalysis.improvementAreas);
    
    // Check that metadata contains the structured summary
    expect(analyzedLesson.metadata.analysisMetadata).toBeDefined();
    expect(analyzedLesson.metadata.analysisMetadata?.keyExpressions).toEqual(sampleStructuredSummary.keyExpressions);
    expect(analyzedLesson.metadata.analysisMetadata?.pronunciationPoints).toEqual(sampleStructuredSummary.pronunciationPoints);
    expect(analyzedLesson.metadata.analysisMetadata?.homeworkSuggestions).toEqual(sampleStructuredSummary.homeworkSuggestions);
    
    // Check teacher feedback
    expect(analyzedLesson.metadata.analysisMetadata?.teacherCorrections).toEqual(sampleTeacherFeedback.corrections);
    expect(analyzedLesson.metadata.analysisMetadata?.teacherSuggestions).toEqual(sampleTeacherFeedback.suggestions);
    expect(analyzedLesson.metadata.analysisMetadata?.teacherPraises).toEqual(sampleTeacherFeedback.praises);
    
    // Check content categories
    expect(analyzedLesson.metadata.analysisMetadata?.topics).toEqual(sampleContentCategories.topics);
    expect(analyzedLesson.metadata.analysisMetadata?.vocabulary).toEqual(sampleContentCategories.vocabulary);
    expect(analyzedLesson.metadata.analysisMetadata?.grammar).toEqual(sampleContentCategories.grammar);
    expect(analyzedLesson.metadata.analysisMetadata?.culturalNotes).toEqual(sampleContentCategories.culturalNotes);
  });

  test('should handle errors during analysis', async () => {
    // Mock Azure Speech Service to throw an error
    (AzureSpeechService.separateSpeakers as jest.Mock).mockRejectedValueOnce(new Error('Azure API error'));
    
    // Run the analysis and expect it to fail
    try {
      await LessonAnalysisService.analyzeLessonAudio(lessonId.toString());
      fail('Expected analysis to throw an error');
    } catch (error) {
      // Verify the lesson status was updated to failed
      const failedLesson = await Lesson.findById(lessonId);
      expect(failedLesson).toBeDefined();
      expect(failedLesson?.status).toBe('failed');
      expect(failedLesson?.errorMessage).toBeDefined();
    }
  });

  test('should calculate participation level correctly', async () => {
    // Run the analysis
    const analyzedLesson = await LessonAnalysisService.analyzeLessonAudio(lessonId.toString());
    
    // Verify participation level was calculated
    expect(analyzedLesson.analysisResult?.participationLevel).toBeDefined();
    expect(typeof analyzedLesson.analysisResult?.participationLevel).toBe('number');
    expect(analyzedLesson.analysisResult?.participationLevel).toBeGreaterThanOrEqual(0);
    expect(analyzedLesson.analysisResult?.participationLevel).toBeLessThanOrEqual(100);
  });

  test('should generate enhanced notes with all sections', async () => {
    // Run the analysis
    const analyzedLesson = await LessonAnalysisService.analyzeLessonAudio(lessonId.toString());
    
    // Verify generated notes
    expect(analyzedLesson.analysisResult?.generatedNotes).toBeDefined();
    
    const notes = analyzedLesson.analysisResult?.generatedNotes || '';
    
    // Check that notes contain all required sections
    expect(notes).toContain('오늘 배운 주요 표현');
    expect(notes).toContain('발음 교정 포인트');
    expect(notes).toContain('숙제 연결 내용');
    expect(notes).toContain('교사 피드백');
    expect(notes).toContain('수업 내용 분류');
  });
});