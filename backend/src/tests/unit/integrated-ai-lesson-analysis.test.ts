import { LessonAnalysisService } from '../../services/lessonAnalysisService';
import { IntegratedAIService } from '../../services/integratedAIService';
import { Lesson } from '../../models/Lesson';
import { SocketService } from '../../services/socketService';

// Mock dependencies
jest.mock('../../services/integratedAIService');
jest.mock('../../models/Lesson');
jest.mock('../../services/socketService');
jest.mock('../../utils/logger');

const mockIntegratedAIService = IntegratedAIService as jest.Mocked<typeof IntegratedAIService>;
const mockLesson = {
  _id: 'lesson123',
  plannerId: 'planner123',
  studentIds: ['student123', 'student456'],
  extractedAudioFile: { _id: 'file123' },
  status: 'pending',
  save: jest.fn(),
  lessonDate: new Date(),
  analysisResult: undefined,
  metadata: {}
};

describe('LessonAnalysisService - IntegratedAI Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Lesson.findById
    (Lesson.findById as jest.Mock).mockResolvedValue(mockLesson);
    
    // Mock comprehensive analysis result
    mockIntegratedAIService.analyzeLesson.mockResolvedValue({
      transcript: 'Test transcript',
      speakerSegments: [
        {
          speaker: 'teacher',
          startTime: 0,
          endTime: 5,
          transcript: 'Hello, how are you?',
          confidence: 0.9
        },
        {
          speaker: 'student', 
          startTime: 5,
          endTime: 10,
          transcript: 'I am fine, thank you.',
          confidence: 0.8
        }
      ],
      pronunciationAssessment: {
        wordLevelScores: [
          { word: 'fine', score: 85, feedback: 'good' }
        ]
      },
      conversationAnalysis: {
        lessonInsights: ['Student shows good comprehension'],
        improvementAreas: ['Pronunciation of certain vowels'],
        generatedNotes: 'Great lesson today'
      },
      studentMetrics: {
        speakingTime: 10,
        pronunciationAccuracy: 85,
        fluencyScore: 78,
        vocabularyUsage: [],
        grammarAccuracy: 82
      },
      structuredSummary: {
        keyExpressions: ['How are you', 'I am fine'],
        pronunciationPoints: ['Work on vowel sounds'],
        homeworkSuggestions: ['Practice common greetings']
      },
      teacherFeedback: {
        corrections: [
          {
            original: 'I am fine',
            corrected: 'I am doing well',
            explanation: 'More natural expression'
          }
        ],
        suggestions: ['Try speaking a bit slower'],
        praises: ['Good pronunciation overall']
      },
      contentCategorization: {
        topics: ['Greetings', 'Basic conversation'],
        vocabulary: [
          {
            word: 'fine',
            meaning: '좋은, 괜찮은',
            example: 'I am fine'
          }
        ],
        grammar: [
          {
            pattern: 'I am + adjective',
            explanation: 'Basic state description',
            example: 'I am fine'
          }
        ],
        culturalNotes: ['English greetings are important']
      },
      metadata: {
        processingTime: 15000,
        totalCost: 150,
        analysisTimestamp: new Date(),
        qualityScore: 92
      }
    });
  });

  it('should successfully integrate with IntegratedAIService for lesson analysis', async () => {
    const result = await LessonAnalysisService.analyzeLessonAudio('lesson123');

    // Verify IntegratedAIService was called correctly
    expect(mockIntegratedAIService.analyzeLesson).toHaveBeenCalledWith(
      'file123',
      {
        plannerId: 'planner123',
        studentId: 'student123',
        lessonId: 'lesson123',
        analysisType: 'comprehensive',
        realTimeUpdates: true
      }
    );

    // Verify lesson was updated with comprehensive results
    expect(result.analysisResult).toBeDefined();
    expect(result.analysisResult!.speakerSegments).toHaveLength(2);
    expect(result.analysisResult!.studentMetrics.pronunciationAccuracy).toBe(85);
    expect(result.analysisResult!.lessonInsights).toContain('Student shows good comprehension');
    expect(result.analysisResult!.improvementAreas).toContain('Pronunciation of certain vowels');

    // Verify metadata was properly structured
    expect(result.metadata.analysisMetadata).toBeDefined();
    expect(result.metadata.analysisMetadata!.keyExpressions).toContain('How are you');
    expect(result.metadata.analysisMetadata!.teacherCorrections).toHaveLength(1);
    expect(result.metadata.analysisMetadata!.topics).toContain('Greetings');

    // Verify lesson status was updated
    expect(result.status).toBe('analyzed');
    expect(mockLesson.save).toHaveBeenCalled();
  });

  it('should handle analysis failure gracefully', async () => {
    // Mock analysis failure
    const analysisError = new Error('Analysis failed');
    mockIntegratedAIService.analyzeLesson.mockRejectedValue(analysisError);

    await expect(LessonAnalysisService.analyzeLessonAudio('lesson123'))
      .rejects
      .toThrow('수업 분석 중 오류가 발생했습니다.');

    // Verify lesson status was updated to failed
    expect(mockLesson.status).toBe('failed');
    expect(mockLesson.save).toHaveBeenCalled();
  });

  it('should calculate participation level correctly', async () => {
    await LessonAnalysisService.analyzeLessonAudio('lesson123');

    const result = mockLesson.save.mock.calls[0][0] || mockLesson;
    
    // The participation level should be calculated based on speaker segments
    // In our mock: teacher speaks for 5 seconds, student speaks for 5 seconds
    // Student ratio = 5/10 = 0.5 = 50%
    // This should result in a good participation score (50-100 range)
    expect(result.analysisResult!.participationLevel).toBeGreaterThan(70);
    expect(result.analysisResult!.participationLevel).toBeLessThanOrEqual(100);
  });

  it('should generate enhanced notes with comprehensive data', async () => {
    await LessonAnalysisService.analyzeLessonAudio('lesson123');

    const result = mockLesson.save.mock.calls[0][0] || mockLesson;
    const generatedNotes = result.analysisResult!.generatedNotes;

    // Verify enhanced notes include all sections
    expect(generatedNotes).toContain('## 오늘 배운 주요 표현');
    expect(generatedNotes).toContain('## 발음 교정 포인트');
    expect(generatedNotes).toContain('## 숙제 연결 내용');
    expect(generatedNotes).toContain('## 교사 피드백');
    expect(generatedNotes).toContain('## 수업 내용 분류');
    
    // Verify specific content from our mock data
    expect(generatedNotes).toContain('How are you');
    expect(generatedNotes).toContain('Work on vowel sounds');
    expect(generatedNotes).toContain('Practice common greetings');
    expect(generatedNotes).toContain('I am fine');
    expect(generatedNotes).toContain('좋은, 괜찮은');
  });
});