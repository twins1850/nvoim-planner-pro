"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval,
         addMonths, subMonths } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle } from "lucide-react";

interface StudentCalendarProps {
  studentId: string;
  onPostpone?: (lessonId: string) => void;
}

export interface StudentCalendarRef {
  refresh: () => Promise<void>;
}

interface Lesson {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: string;
  subscription_id: string;
  lesson_content?: string;
  teacher_notes?: string;
  homework_assigned?: string;
}

interface Subscription {
  id: string;
  subscription_name: string;
  start_date: string;
  end_date: string;
  postponements_used: number;
  max_postponements: number;
  remaining_postponements: number;
  total_lessons: number;
  completed_lessons: number;
  remaining_lessons: number;
  status: string;
}

const StudentCalendar = forwardRef<StudentCalendarRef, StudentCalendarProps>(
  ({ studentId, onPostpone }, ref) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      fetchLessons();
    }, [currentMonth, studentId]);

    const fetchLessons = async () => {
    setLoading(true);
    const supabase = createClient();

    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);

    const { data, error } = await supabase.rpc('get_student_lesson_calendar', {
      p_student_id: studentId,
      p_start_date: format(start, 'yyyy-MM-dd'),
      p_end_date: format(end, 'yyyy-MM-dd')
    });

    if (!error && data?.success) {
      setLessons(data.lessons);
      setSubscription(data.subscription);
    }
    setLoading(false);
  };

  // Expose refresh function to parent component
  useImperativeHandle(ref, () => ({
    refresh: async () => {
      await fetchLessons();
    }
  }));

  const getLessonsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return lessons.filter(l => l.date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'scheduled': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'postponed': return 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200';
      case 'cancelled': return 'bg-red-100 text-red-700 hover:bg-red-200';
      case 'no_show': return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
      default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'scheduled': return <Clock className="w-3 h-3" />;
      case 'postponed': return <AlertCircle className="w-3 h-3" />;
      default: return <Clock className="w-3 h-3" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return '완료';
      case 'scheduled': return '예정';
      case 'postponed': return '연기';
      case 'cancelled': return '취소';
      case 'no_show': return '노쇼';
      default: return status;
    }
  };

  const days = eachDayOfInterval({
    start: startOfMonth(currentMonth),
    end: endOfMonth(currentMonth)
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-500">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Subscription Info */}
      {subscription && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-blue-900">{subscription.subscription_name}</h4>
              <p className="text-sm text-blue-700">
                {format(new Date(subscription.start_date), 'yyyy.MM.dd', { locale: ko })} ~
                {' '}{format(new Date(subscription.end_date), 'yyyy.MM.dd', { locale: ko })}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                상태: <span className="font-medium">{getStatusText(subscription.status)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-blue-600">
                남은 연기권: <span className="font-bold">{subscription.remaining_postponements}회</span>
              </p>
              <p className="text-sm text-blue-600">
                남은 수업: <span className="font-bold">{subscription.remaining_lessons}회</span>
              </p>
              <p className="text-xs text-blue-500 mt-1">
                {subscription.completed_lessons}/{subscription.total_lessons} 완료
              </p>
            </div>
          </div>
        </div>
      )}

      {!subscription && (
        <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-gray-600 text-center">활성 수강권이 없습니다.</p>
        </div>
      )}

      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-semibold">
            {format(currentMonth, 'yyyy년 MM월', { locale: ko })}
          </h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Day Headers */}
        {['일', '월', '화', '수', '목', '금', '토'].map((day, i) => (
          <div
            key={day}
            className={`text-center text-xs font-medium py-2 ${
              i === 0 ? 'text-red-600' : i === 6 ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            {day}
          </div>
        ))}

        {/* Date Cells */}
        {days.map((day, i) => {
          const dayLessons = getLessonsForDate(day);

          return (
            <div
              key={i}
              className="min-h-[100px] p-2 border rounded-lg bg-white border-gray-200 hover:border-gray-300 transition-colors"
            >
              <div className={`text-sm font-medium mb-1 ${
                i % 7 === 0 ? 'text-red-600' : i % 7 === 6 ? 'text-blue-600' : 'text-gray-700'
              }`}>
                {format(day, 'd')}
              </div>

              {/* Lessons */}
              <div className="space-y-1">
                {dayLessons.map(lesson => (
                  <button
                    key={lesson.id}
                    onClick={() => setSelectedLesson(lesson)}
                    className={`w-full text-xs px-2 py-1 rounded flex items-center gap-1 transition-colors ${
                      getStatusColor(lesson.status)
                    }`}
                  >
                    {getStatusIcon(lesson.status)}
                    <span>{lesson.start_time.slice(0, 5)}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-600">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-blue-100 rounded"></div>
          <span>예정</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-green-100 rounded"></div>
          <span>완료</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-yellow-100 rounded"></div>
          <span>연기</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-red-100 rounded"></div>
          <span>취소</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 bg-gray-100 rounded"></div>
          <span>노쇼</span>
        </div>
      </div>

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setSelectedLesson(null)}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
            onClick={e => e.stopPropagation()}
          >
            <h4 className="text-lg font-semibold mb-4">수업 상세</h4>
            <div className="space-y-3 text-sm">
              <div>
                <strong className="text-gray-700">날짜:</strong>
                <p className="text-gray-900 mt-1">
                  {format(new Date(selectedLesson.date), 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                </p>
              </div>
              <div>
                <strong className="text-gray-700">시간:</strong>
                <p className="text-gray-900 mt-1">
                  {selectedLesson.start_time} ~ {selectedLesson.end_time}
                </p>
              </div>
              <div>
                <strong className="text-gray-700">상태:</strong>
                <p className="mt-1">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${getStatusColor(selectedLesson.status)}`}>
                    {getStatusIcon(selectedLesson.status)}
                    {getStatusText(selectedLesson.status)}
                  </span>
                </p>
              </div>
              {selectedLesson.lesson_content && (
                <div>
                  <strong className="text-gray-700">수업 내용:</strong>
                  <p className="text-gray-900 mt-1">{selectedLesson.lesson_content}</p>
                </div>
              )}
              {selectedLesson.homework_assigned && (
                <div>
                  <strong className="text-gray-700">숙제:</strong>
                  <p className="text-gray-900 mt-1">{selectedLesson.homework_assigned}</p>
                </div>
              )}
              {selectedLesson.teacher_notes && (
                <div>
                  <strong className="text-gray-700">선생님 메모:</strong>
                  <p className="text-gray-900 mt-1">{selectedLesson.teacher_notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              {selectedLesson.status === 'scheduled' && subscription && subscription.remaining_postponements > 0 && (
                <button
                  onClick={() => {
                    onPostpone?.(selectedLesson.id);
                    setSelectedLesson(null);
                  }}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                >
                  연기 신청
                </button>
              )}
              <button
                onClick={() => setSelectedLesson(null)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

StudentCalendar.displayName = 'StudentCalendar';

export default StudentCalendar;
