import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isToday, addMonths, subMonths, isSameMonth } from 'date-fns';
import { ko } from 'date-fns/locale';

import { RootStackParamList } from '../navigation/types';
import { homeworkAPI } from '../services/supabaseApi';
import { supabase } from '../lib/supabase';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

const HomeScreen = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const currentMonthRef = useRef(new Date());
  const lessonSubscription = useRef<any>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userName, setUserName] = useState('학생');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [lessonStatusByDate, setLessonStatusByDate] = useState<Record<string, 'scheduled' | 'completed' | 'no_show' | 'past_unprocessed'>>({});
  const [homeworkStatusByDate, setHomeworkStatusByDate] = useState<Record<string, 'pending' | 'completed'>>({});
  const [feedbackDateSet, setFeedbackDateSet] = useState<Set<string>>(new Set());
  const [lessonsDetail, setLessonsDetail] = useState<any[]>([]);
  const [homeworksDetail, setHomeworksDetail] = useState<any[]>([]);

  useEffect(() => {
    loadUserInfo();
    loadCalendarData(currentMonth);

    // 플래너앱 출결/수업 처리 시 실시간 반영
    const setupLessonSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      lessonSubscription.current = supabase
        .channel('student_home_lessons')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'lessons',
            filter: `student_id=eq.${user.id}`,
          },
          () => {
            // 플래너가 수업 상태 변경 시 달력 자동 갱신
            loadCalendarData(currentMonthRef.current);
          }
        )
        .subscribe();
    };
    setupLessonSubscription();

    const unsubscribe = navigation.addListener('focus', () => {
      loadCalendarData(currentMonthRef.current);
    });

    return () => {
      if (lessonSubscription.current) {
        lessonSubscription.current.unsubscribe();
        lessonSubscription.current = null;
      }
      unsubscribe();
    };
  }, [navigation]);

  useEffect(() => {
    currentMonthRef.current = currentMonth;
    loadCalendarData(currentMonth);
  }, [currentMonth]);

  const loadUserInfo = async () => {
    try {
      const userInfo = await AsyncStorage.getItem('userInfo');
      if (userInfo && userInfo !== 'undefined' && userInfo !== 'null') {
        const parsed = JSON.parse(userInfo);
        if (parsed?.profile?.name) {
          setUserName(parsed.profile.name);
          return;
        }
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        if (profile?.full_name) {
          setUserName(profile.full_name);
          await AsyncStorage.setItem('userInfo', JSON.stringify({ profile: { name: profile.full_name } }));
        }
      }
    } catch (error) {
      console.error('Failed to load user info', error);
    }
  };

  const loadCalendarData = async (month: Date) => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const startDate = format(startOfMonth(month), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(month), 'yyyy-MM-dd');

      // 수업 데이터 조회 (모든 상태 포함)
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, scheduled_date, scheduled_start_time, scheduled_end_time, status, lesson_status, is_makeup, teacher_notes')
        .eq('student_id', user.id)
        .gte('scheduled_date', startDate)
        .lte('scheduled_date', endDate)
        .order('scheduled_date');

      // 수업 날짜별 상태 맵 구성 (status 컬럼 기준, 연기 제외)
      // 우선순위: no_show > completed > past_unprocessed > scheduled > postponed
      const today = format(new Date(), 'yyyy-MM-dd');
      const STATUS_PRIORITY: Record<string, number> = { no_show: 4, completed: 3, past_unprocessed: 2, scheduled: 1 };
      const lStatusMap: Record<string, 'scheduled' | 'completed' | 'no_show' | 'past_unprocessed'> = {};
      (lessonsData || []).forEach((l: any) => {
        const date = l.scheduled_date;
        const raw = l.status || 'scheduled'; // lesson_status 무시, status만 신뢰
        if (raw === 'postponed') return; // 연기된 수업은 달력 표시 안 함

        const s: 'scheduled' | 'completed' | 'no_show' | 'past_unprocessed' =
          raw === 'no_show' ? 'no_show'
          : raw === 'completed' ? 'completed'
          : (date < today) ? 'past_unprocessed' // 지난 날짜 미처리
          : 'scheduled';

        if (!lStatusMap[date] || (STATUS_PRIORITY[s] || 0) > (STATUS_PRIORITY[lStatusMap[date]] || 0)) {
          lStatusMap[date] = s;
        }
      });

      // 숙제 데이터 조회 (완료 포함 전체)
      const homeworkResponse = await homeworkAPI.getHomeworks();
      const allHomeworks = homeworkResponse.success ? (homeworkResponse.data?.homeworks || []) : [];

      // 숙제 날짜별 상태 맵 구성 (pending 우선)
      const hStatusMap: Record<string, 'pending' | 'completed'> = {};
      allHomeworks
        .filter((h: any) => {
          const d = h.due_date?.split('T')[0];
          return d && d >= startDate && d <= endDate;
        })
        .forEach((h: any) => {
          const date = h.due_date?.split('T')[0];
          if (!date) return;
          if (hStatusMap[date] !== 'pending') {
            hStatusMap[date] = h.status === 'completed' ? 'completed' : 'pending';
          }
        });

      // 피드백 날짜 조회
      const { data: feedbackData } = await supabase
        .from('lesson_feedback')
        .select('lesson_date')
        .eq('student_id', user.id)
        .gte('lesson_date', startDate)
        .lte('lesson_date', endDate);
      const fDateSet = new Set<string>((feedbackData || []).map((f: any) => f.lesson_date));

      setLessonStatusByDate(lStatusMap);
      setHomeworkStatusByDate(hStatusMap);
      setFeedbackDateSet(fDateSet);
      setLessonsDetail(lessonsData || []);
      setHomeworksDetail(allHomeworks);
    } catch (error) {
      console.error('Failed to load calendar data', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCalendarData(currentMonth);
  };

  // 선택된 날짜의 수업/숙제 필터링 (연기된 수업 제외, status 컬럼만 신뢰)
  const selectedLessons = lessonsDetail.filter(
    (l) => l.scheduled_date === selectedDate && l.status !== 'postponed'
  );
  const selectedHomeworks = homeworksDetail.filter(
    (h) => h.due_date?.split('T')[0] === selectedDate
  );

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDow = getDay(monthStart);
  const emptyDays = Array(startDow).fill(null);

  const LESSON_DOT_COLOR: Record<string, string> = {
    scheduled:        '#3B82F6',  // 파랑 - 예정
    completed:        '#10B981',  // 초록 - 완료
    no_show:          '#EF4444',  // 빨강 - 결석
    past_unprocessed: '#D1D5DB',  // 연회색 - 지난 날짜 미처리
  };
  const HOMEWORK_DOT_COLOR: Record<string, string> = {
    pending:   '#F59E0B',  // 주황 - 미완료
    completed: '#8B5CF6',  // 보라 - 완료
  };

  const renderDay = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const lessonStatus = lessonStatusByDate[dateStr];
    const homeworkStatus = homeworkStatusByDate[dateStr];
    const hasFeedback = feedbackDateSet.has(dateStr);
    const isSelected = selectedDate === dateStr;
    const today = isToday(day);
    const dow = getDay(day);

    return (
      <TouchableOpacity
        key={dateStr}
        style={[styles.dayCell, isSelected && styles.dayCellSelected]}
        onPress={() => setSelectedDate(dateStr)}
      >
        <Text style={[
          styles.dayNumber,
          today && styles.dayNumberToday,
          isSelected && styles.dayNumberSelected,
          dow === 0 && styles.daySunday,
          dow === 6 && styles.daySaturday,
        ]}>
          {format(day, 'd')}
        </Text>
        <View style={styles.dotRow}>
          {lessonStatus && (
            <View style={[styles.dot, { backgroundColor: LESSON_DOT_COLOR[lessonStatus] }]} />
          )}
          {homeworkStatus && (
            <View style={[styles.dot, { backgroundColor: HOMEWORK_DOT_COLOR[homeworkStatus] }]} />
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top + 8 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* 달력 */}
      <View style={styles.calendarCard}>
        {/* 월 네비게이션 */}
        <View style={styles.monthNav}>
          <TouchableOpacity onPress={() => setCurrentMonth(subMonths(currentMonth, 1))} style={styles.navBtn}>
            <Ionicons name="chevron-back" size={20} color="#374151" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {format(currentMonth, 'yyyy년 M월', { locale: ko })}
          </Text>
          <TouchableOpacity onPress={() => setCurrentMonth(addMonths(currentMonth, 1))} style={styles.navBtn}>
            <Ionicons name="chevron-forward" size={20} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* 요일 헤더 */}
        <View style={styles.weekHeader}>
          {DAY_LABELS.map((label, i) => (
            <Text key={label} style={[
              styles.weekLabel,
              i === 0 && styles.daySunday,
              i === 6 && styles.daySaturday,
            ]}>
              {label}
            </Text>
          ))}
        </View>

        {/* 날짜 그리드 */}
        {loading ? (
          <ActivityIndicator style={{ paddingVertical: 30 }} color="#3B82F6" />
        ) : (
          <View style={styles.daysGrid}>
            {emptyDays.map((_, i) => (
              <View key={`empty-${i}`} style={styles.dayCell} />
            ))}
            {daysInMonth.map(renderDay)}
          </View>
        )}

        {/* 범례 */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#3B82F6' }]} />
            <Text style={styles.legendText}>수업예정</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#10B981' }]} />
            <Text style={styles.legendText}>수업완료</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#EF4444' }]} />
            <Text style={styles.legendText}>결석</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#D1D5DB' }]} />
            <Text style={styles.legendText}>미처리</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#F59E0B' }]} />
            <Text style={styles.legendText}>숙제미완</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: '#8B5CF6' }]} />
            <Text style={styles.legendText}>숙제완료</Text>
          </View>
        </View>
      </View>

      {/* 선택된 날짜 상세 */}
      <View style={styles.detailSection}>
        <Text style={styles.detailDate}>
          {format(new Date(selectedDate), 'M월 d일 (EEEE)', { locale: ko })}
        </Text>

        {/* 수업 목록 */}
        {selectedLessons.length > 0 ? (
          selectedLessons.map((lesson) => {
            const ls = lesson.status; // status 컬럼 기준
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            // 지난 날짜인데 플래너가 아직 처리 안 한 수업
            const isPastUnprocessed = ls === 'scheduled' && lesson.scheduled_date < todayStr;
            const iconColor = ls === 'completed' ? '#10B981'
              : ls === 'no_show' ? '#EF4444'
              : isPastUnprocessed ? '#9CA3AF'  // 회색 - 미처리
              : '#3B82F6';                      // 파랑 - 예정
            const iconName = ls === 'completed' ? 'checkmark-circle'
              : ls === 'no_show' ? 'close-circle'
              : isPastUnprocessed ? 'time-outline'  // 시계 아이콘 - 미처리
              : 'videocam';
            const cardBg = isPastUnprocessed ? '#F9FAFB' : '#EFF6FF';
            return (
              <View key={lesson.id} style={[styles.lessonCard, { borderLeftWidth: 3, borderLeftColor: iconColor, backgroundColor: cardBg }]}>
                <View style={[styles.lessonIcon, { backgroundColor: iconColor + '22' }]}>
                  <Ionicons
                    name={iconName as any}
                    size={18}
                    color={iconColor}
                  />
                </View>
                <View style={styles.lessonInfo}>
                  <Text style={[styles.lessonTime, { color: iconColor === '#3B82F6' ? '#1D4ED8' : iconColor }]}>
                    {lesson.scheduled_start_time?.slice(0, 5)} ~ {lesson.scheduled_end_time?.slice(0, 5)}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 4, marginTop: 2 }}>
                    {ls === 'completed' && <Text style={styles.completedBadge}>수업완료</Text>}
                    {ls === 'no_show' && <Text style={styles.absentBadge}>결석</Text>}
                    {isPastUnprocessed && <Text style={styles.unprocessedBadge}>미처리</Text>}
                    {lesson.is_makeup && <Text style={styles.makeupBadge}>보충</Text>}
                  </View>
                </View>
                {feedbackDateSet.has(lesson.scheduled_date) && (
                  <TouchableOpacity
                    style={styles.feedbackBtn}
                    onPress={() => navigation.navigate('LessonFeedback', { feedbackDate: lesson.scheduled_date })}
                  >
                    <Ionicons name="document-text" size={14} color="#f97316" />
                    <Text style={styles.feedbackBtnText}>피드백</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyText}>이 날은 수업이 없습니다</Text>
        )}

        {/* 숙제 목록 */}
        {selectedHomeworks.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>📚 숙제</Text>
            {selectedHomeworks.map((hw) => {
              const isDone = hw.status === 'completed';
              return (
                <TouchableOpacity
                  key={hw.id || hw.homework_id}
                  style={[styles.homeworkCard, isDone && styles.homeworkCardDone]}
                  onPress={() => navigation.navigate('HomeworkDetail', { homeworkId: hw.id || hw.homework_id })}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Ionicons
                      name={isDone ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={isDone ? '#8B5CF6' : '#F59E0B'}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.homeworkTitle, isDone && { color: '#6B7280', textDecorationLine: 'line-through' }]}>
                        {hw.title}
                      </Text>
                      {hw.estimated_time_minutes && !isDone && (
                        <Text style={styles.homeworkTime}>예상: {hw.estimated_time_minutes}분</Text>
                      )}
                    </View>
                    {isDone && <Text style={styles.homeworkDoneBadge}>완료</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F9FAFB' },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  greeting: { fontSize: 22, fontWeight: '700', color: '#111827' },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  navBtn: { padding: 6 },
  monthTitle: { fontSize: 17, fontWeight: '700', color: '#111827' },
  weekHeader: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    paddingVertical: 4,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: `${100 / 7}%`,
    aspectRatio: 0.85,
    alignItems: 'center',
    paddingVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  dayNumber: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    width: 28,
    height: 28,
    textAlign: 'center',
    lineHeight: 28,
    borderRadius: 14,
  },
  dayNumberToday: {
    backgroundColor: '#3B82F6',
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayNumberSelected: {
    color: '#1D4ED8',
    fontWeight: '700',
  },
  daySunday: { color: '#EF4444' },
  daySaturday: { color: '#3B82F6' },
  dotRow: { flexDirection: 'row', gap: 2, marginTop: 1, height: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendText: { fontSize: 11, color: '#6B7280' },
  detailSection: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  detailDate: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  lessonCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  lessonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#DBEAFE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lessonInfo: { flex: 1 },
  lessonTime: { fontSize: 14, color: '#1D4ED8', fontWeight: '600' },
  completedBadge: {
    fontSize: 11,
    color: '#059669',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  absentBadge: {
    fontSize: 11,
    color: '#DC2626',
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  unprocessedBadge: {
    fontSize: 11,
    color: '#6B7280',
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  makeupBadge: {
    fontSize: 11,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  emptyText: { fontSize: 13, color: '#9CA3AF', textAlign: 'center', paddingVertical: 12 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#374151', marginTop: 12, marginBottom: 8 },
  homeworkCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  homeworkCardDone: {
    backgroundColor: '#F5F3FF',
    borderLeftColor: '#8B5CF6',
  },
  homeworkTitle: { fontSize: 14, fontWeight: '600', color: '#92400E' },
  homeworkTime: { fontSize: 12, color: '#B45309', marginTop: 2 },
  homeworkDoneBadge: {
    fontSize: 11,
    color: '#7C3AED',
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 5,
    backgroundColor: '#fff7ed',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fed7aa',
    flexShrink: 0,
  },
  feedbackBtnText: {
    fontSize: 12,
    color: '#f97316',
    fontWeight: '600',
  },
});

export default HomeScreen;
