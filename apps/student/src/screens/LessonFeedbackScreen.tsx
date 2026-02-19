import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '../navigation/types';
import { supabase } from '../lib/supabase';

type LessonFeedbackScreenRouteProp = RouteProp<RootStackParamList, 'LessonFeedback'>;
type LessonFeedbackScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface LessonFeedback {
  id: string;
  lesson_date: string;
  attendance_status: string;
  attendance_rate: number | null;
  homework_status: string;
  attitude: string;
  special_note: string;
  feedback_sentence_en: string;
  feedback_pronunciation_en: string;
  feedback_teacher_en: string;
  feedback_teacher_ko: string;
  feedback_summary_ko: string;
  lesson_content: string;
  next_lesson_content: string;
  teacher_name: string;
  translated_at: string | null;
}

const ATTENDANCE_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  attended: { label: '출석', color: '#15803d', bg: '#dcfce7', icon: 'checkmark-circle' },
  출석: { label: '출석', color: '#15803d', bg: '#dcfce7', icon: 'checkmark-circle' },
  no_show: { label: '결석', color: '#b91c1c', bg: '#fee2e2', icon: 'close-circle' },
  결석: { label: '결석', color: '#b91c1c', bg: '#fee2e2', icon: 'close-circle' },
  late: { label: '지각', color: '#92400e', bg: '#fef3c7', icon: 'time' },
  지각: { label: '지각', color: '#92400e', bg: '#fef3c7', icon: 'time' },
  postponed: { label: '연기', color: '#4b5563', bg: '#f3f4f6', icon: 'calendar' },
};

const LessonFeedbackScreen = () => {
  const navigation = useNavigation<LessonFeedbackScreenNavigationProp>();
  const route = useRoute<LessonFeedbackScreenRouteProp>();
  const { feedbackDate } = route.params;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<LessonFeedback | null>(null);
  const [showEnglish, setShowEnglish] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadFeedback();
  }, [feedbackDate]);

  const loadFeedback = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('로그인 필요');

      // 학생 프로필 조회
      const { data: profile } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (!profile) throw new Error('학생 프로필 없음');

      const { data, error: fetchError } = await supabase
        .from('lesson_feedback')
        .select('*')
        .eq('student_id', profile.id)
        .eq('lesson_date', feedbackDate)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (fetchError) throw fetchError;
      setFeedback(data);
    } catch (e: any) {
      setError(e.message || '피드백을 불러올 수 없습니다.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getAttendanceConfig = (status: string) => {
    return ATTENDANCE_CONFIG[status] ?? {
      label: status,
      color: '#4b5563',
      bg: '#f3f4f6',
      icon: 'help-circle',
    };
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>수업 피드백</Text>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#f97316" />
          <Text style={styles.loadingText}>피드백을 불러오는 중...</Text>
        </View>
      </View>
    );
  }

  if (error || !feedback) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>수업 피드백</Text>
        </View>
        <View style={styles.centerContainer}>
          <Ionicons name="document-text-outline" size={48} color="#d1d5db" />
          <Text style={styles.errorText}>{error || '피드백이 없습니다.'}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => loadFeedback()}>
            <Text style={styles.retryBtnText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const attCfg = getAttendanceConfig(feedback.attendance_status);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>수업 피드백</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadFeedback(true)}
            tintColor="#f97316"
          />
        }
      >
        {/* 날짜 및 출결 */}
        <View style={styles.dateCard}>
          <Text style={styles.dateText}>{formatDate(feedback.lesson_date)}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusBadge, { backgroundColor: attCfg.bg }]}>
              <Ionicons name={attCfg.icon as any} size={14} color={attCfg.color} />
              <Text style={[styles.statusText, { color: attCfg.color }]}>{attCfg.label}</Text>
            </View>
            {feedback.attendance_rate !== null && (
              <View style={styles.rateBadge}>
                <Text style={styles.rateText}>참여도 {feedback.attendance_rate}%</Text>
              </View>
            )}
            {feedback.teacher_name && (
              <View style={styles.teacherBadge}>
                <Ionicons name="person" size={12} color="#6b7280" />
                <Text style={styles.teacherText}>{feedback.teacher_name}</Text>
              </View>
            )}
          </View>
        </View>

        {/* 진도 정보 */}
        {(feedback.lesson_content || feedback.next_lesson_content) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📖 수업 진도</Text>
            {feedback.lesson_content && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>오늘 수업</Text>
                <Text style={styles.infoValue}>{feedback.lesson_content}</Text>
              </View>
            )}
            {feedback.next_lesson_content && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>다음 수업</Text>
                <Text style={styles.infoValue}>{feedback.next_lesson_content}</Text>
              </View>
            )}
          </View>
        )}

        {/* 기타 정보 */}
        {(feedback.homework_status || feedback.attitude || feedback.special_note) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📋 수업 평가</Text>
            {feedback.homework_status && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>숙제</Text>
                <Text style={styles.infoValue}>{feedback.homework_status}</Text>
              </View>
            )}
            {feedback.attitude && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>태도</Text>
                <Text style={styles.infoValue}>{feedback.attitude}</Text>
              </View>
            )}
            {feedback.special_note && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>특이사항</Text>
                <Text style={styles.infoValue}>{feedback.special_note}</Text>
              </View>
            )}
          </View>
        )}

        {/* 한글 피드백 요약 */}
        {feedback.feedback_summary_ko && (
          <View style={[styles.card, styles.feedbackCard]}>
            <View style={styles.feedbackHeader}>
              <Text style={styles.cardTitle}>✏️ 이번 수업 총평</Text>
              {feedback.translated_at && (
                <View style={styles.aiBadge}>
                  <Ionicons name="sparkles" size={12} color="#7c3aed" />
                  <Text style={styles.aiText}>AI 번역</Text>
                </View>
              )}
            </View>
            <Text style={styles.feedbackText}>{feedback.feedback_summary_ko}</Text>
          </View>
        )}

        {/* 강사 한마디 (한글) */}
        {feedback.feedback_teacher_ko && (
          <View style={[styles.card, styles.teacherCommentCard]}>
            <Text style={styles.cardTitle}>💬 강사 한마디</Text>
            <Text style={styles.feedbackText}>{feedback.feedback_teacher_ko}</Text>
          </View>
        )}

        {/* 발음 교정 단어 */}
        {feedback.feedback_pronunciation_en && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔤 발음 연습 단어</Text>
            <View style={styles.wordContainer}>
              {feedback.feedback_pronunciation_en.split(/[,\s]+/).filter(Boolean).map((word, idx) => (
                <View key={idx} style={styles.wordChip}>
                  <Text style={styles.wordText}>{word.trim()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 영어 원문 (접기/펼치기) */}
        {(feedback.feedback_teacher_en || feedback.feedback_sentence_en) && (
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.englishToggle}
              onPress={() => setShowEnglish(!showEnglish)}
            >
              <Text style={styles.cardTitle}>🌐 영어 원문</Text>
              <Ionicons
                name={showEnglish ? 'chevron-up' : 'chevron-down'}
                size={18}
                color="#9ca3af"
              />
            </TouchableOpacity>

            {showEnglish && (
              <View style={styles.englishContent}>
                {feedback.feedback_teacher_en && (
                  <View style={styles.englishSection}>
                    <Text style={styles.englishLabel}>강사 코멘트</Text>
                    <Text style={styles.englishText}>{feedback.feedback_teacher_en}</Text>
                  </View>
                )}
                {feedback.feedback_sentence_en && (
                  <View style={styles.englishSection}>
                    <Text style={styles.englishLabel}>문장 교정</Text>
                    <Text style={styles.englishText}>{feedback.feedback_sentence_en}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
  },
  headerRight: {
    width: 32,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    padding: 24,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  errorText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f97316',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  dateCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  rateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  rateText: {
    fontSize: 12,
    color: '#4b5563',
    fontWeight: '500',
  },
  teacherBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
  },
  teacherText: {
    fontSize: 12,
    color: '#6b7280',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 10,
  },
  feedbackCard: {
    borderColor: '#fed7aa',
    backgroundColor: '#fff7ed',
  },
  teacherCommentCard: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#ede9fe',
    borderRadius: 20,
  },
  aiText: {
    fontSize: 11,
    color: '#7c3aed',
    fontWeight: '500',
  },
  feedbackText: {
    fontSize: 15,
    color: '#1f2937',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    gap: 12,
  },
  infoLabel: {
    width: 72,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
    flexShrink: 0,
  },
  infoValue: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  wordContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  wordChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dbeafe',
    borderRadius: 20,
  },
  wordText: {
    fontSize: 14,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  englishToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  englishContent: {
    gap: 12,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  englishSection: {
    gap: 4,
  },
  englishLabel: {
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: '500',
  },
  englishText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 22,
    fontStyle: 'italic',
  },
});

export default LessonFeedbackScreen;
