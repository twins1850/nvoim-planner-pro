import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface AIFeedbackData {
  id: string;
  transcript: string;
  score: number;
  corrections: string[];
  better_expressions: string[];
  positive_feedback: string;
  areas_for_improvement: string;
  created_at: string;
}

interface AIFeedbackCardProps {
  feedback: AIFeedbackData;
  onPlayAudio?: () => void;
  showFullDetails?: boolean;
}

const AIFeedbackCard: React.FC<AIFeedbackCardProps> = ({ 
  feedback, 
  onPlayAudio,
  showFullDetails = true 
}) => {
  // 점수에 따른 색상 결정
  const getScoreColor = (score: number) => {
    if (score >= 85) return '#4CAF50'; // 녹색
    if (score >= 70) return '#FF9800'; // 주황색
    return '#F44336'; // 빨간색
  };

  // 점수에 따른 등급 결정
  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Improvement';
  };

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <ScrollView style={styles.container}>
      {/* 헤더 - 점수와 등급 */}
      <View style={styles.header}>
        <View style={styles.scoreContainer}>
          <View style={[styles.scoreCircle, { borderColor: getScoreColor(feedback.score) }]}>
            <Text style={[styles.scoreText, { color: getScoreColor(feedback.score) }]}>
              {feedback.score}
            </Text>
          </View>
          <View style={styles.scoreInfo}>
            <Text style={[styles.gradeText, { color: getScoreColor(feedback.score) }]}>
              {getScoreGrade(feedback.score)}
            </Text>
            <Text style={styles.dateText}>
              {formatDate(feedback.created_at)}
            </Text>
          </View>
        </View>
        
        {onPlayAudio && (
          <TouchableOpacity style={styles.playButton} onPress={onPlayAudio}>
            <Ionicons name="play-circle" size={32} color="#4F6CFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* 전사 텍스트 */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🎤 Your Speech</Text>
        <View style={styles.transcriptContainer}>
          <Text style={styles.transcriptText}>"{feedback.transcript}"</Text>
        </View>
      </View>

      {showFullDetails && (
        <>
          {/* 긍정적 피드백 */}
          {feedback.positive_feedback && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>✨ What You Did Well</Text>
              <View style={styles.positiveContainer}>
                <Text style={styles.feedbackText}>{feedback.positive_feedback}</Text>
              </View>
            </View>
          )}

          {/* 교정 사항 */}
          {feedback.corrections && feedback.corrections.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🔧 Corrections</Text>
              {feedback.corrections.map((correction, index) => (
                <View key={index} style={styles.correctionItem}>
                  <View style={styles.correctionBullet}>
                    <Text style={styles.bulletText}>•</Text>
                  </View>
                  <Text style={styles.correctionText}>{correction}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 더 나은 표현 */}
          {feedback.better_expressions && feedback.better_expressions.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>🚀 Better Expressions</Text>
              {feedback.better_expressions.map((expression, index) => (
                <View key={index} style={styles.expressionItem}>
                  <View style={styles.expressionIcon}>
                    <Ionicons name="arrow-up-circle" size={16} color="#4F6CFF" />
                  </View>
                  <Text style={styles.expressionText}>{expression}</Text>
                </View>
              ))}
            </View>
          )}

          {/* 개선 영역 */}
          {feedback.areas_for_improvement && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>📈 Areas for Improvement</Text>
              <View style={styles.improvementContainer}>
                <Text style={styles.feedbackText}>{feedback.areas_for_improvement}</Text>
              </View>
            </View>
          )}
        </>
      )}

      {/* 요약 정보 (간단 모드) */}
      {!showFullDetails && (
        <View style={styles.summarySection}>
          <Text style={styles.summaryText}>
            {feedback.positive_feedback ? 
              feedback.positive_feedback.substring(0, 100) + '...' : 
              'AI 피드백을 확인하려면 터치하세요.'
            }
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  scoreText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  scoreInfo: {
    marginLeft: 12,
  },
  gradeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  playButton: {
    padding: 8,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  transcriptContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4F6CFF',
  },
  transcriptText: {
    fontSize: 16,
    color: '#424242',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  positiveContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  feedbackText: {
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  correctionItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 8,
  },
  correctionBullet: {
    width: 20,
    alignItems: 'center',
  },
  bulletText: {
    fontSize: 16,
    color: '#FF5722',
    fontWeight: 'bold',
  },
  correctionText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  expressionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    backgroundColor: '#F3F4FF',
    borderRadius: 8,
    padding: 12,
  },
  expressionIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  expressionText: {
    flex: 1,
    fontSize: 14,
    color: '#424242',
    lineHeight: 20,
  },
  improvementContainer: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  summarySection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 18,
  },
});

export default AIFeedbackCard;