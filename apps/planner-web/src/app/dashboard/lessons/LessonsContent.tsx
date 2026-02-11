"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CalendarDays,
  Clock,
  Plus,
  Search,
  Video,
  CheckSquare,
  User,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  UserCheck,
  GraduationCap,
  BookOpen,
  XCircle
} from "lucide-react";
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Student {
  id: string;
  full_name: string;
  native_teacher_name?: string;
  level?: string;
}

interface Lesson {
  id: string;
  student_id: string;
  title: string;
  description?: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  lesson_status: 'scheduled' | 'completed' | 'cancelled' | 'no_show';
  attendance_status?: 'present' | 'absent' | 'late';
  lesson_notes?: string;
  homework_assigned: boolean;
  created_at: string;
  student?: Student;
}

export default function LessonsContent() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    fetchLessons();
  }, [selectedDate]);

  const fetchLessons = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // ✅ 최적화: 데이터베이스 함수 사용
      const { data: lessonsData, error } = await supabase
        .rpc('get_today_lessons', {
          planner_uuid: user.id,
          lesson_date: selectedDate
        });

      if (error) {
        console.error('Error fetching lessons:', error);
        setLessons([]);
      } else {
        // 데이터 형식 변환
        const formattedLessons = (lessonsData || []).map((lesson: any) => ({
          id: lesson.lesson_id,
          student_id: lesson.student_id,
          title: lesson.lesson_title,
          lesson_date: selectedDate,
          start_time: lesson.start_time,
          end_time: lesson.end_time,
          lesson_status: lesson.lesson_status,
          attendance_status: lesson.attendance_status,
          homework_assigned: false,
          created_at: new Date().toISOString(),
          student: {
            id: lesson.student_id,
            full_name: lesson.student_name,
            native_teacher_name: lesson.teacher_name,
            level: lesson.student_level
          }
        }));
        setLessons(formattedLessons);
      }
    } catch (error) {
      console.error('Error fetching lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no_show': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '예정됨';
      case 'completed': return '완료됨';
      case 'cancelled': return '취소됨';
      case 'no_show': return '노쇼';
      default: return '알 수 없음';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckSquare className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
      case 'no_show': return <XCircle className="w-4 h-4" />;
      default: return <Calendar className="w-4 h-4" />;
    }
  };

  const getAttendanceColor = (attendance?: string) => {
    switch (attendance) {
      case 'present': return 'bg-green-100 text-green-800';
      case 'late': return 'bg-yellow-100 text-yellow-800';
      case 'absent': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAttendanceText = (attendance?: string) => {
    switch (attendance) {
      case 'present': return '출석';
      case 'late': return '지각';
      case 'absent': return '결석';
      default: return '미확인';
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = searchTerm === "" ||
      lesson.student?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.student?.native_teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.title?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === "all" || lesson.lesson_status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const todayStats = {
    total: lessons.length,
    completed: lessons.filter(l => l.lesson_status === 'completed').length,
    scheduled: lessons.filter(l => l.lesson_status === 'scheduled').length,
    cancelled: lessons.filter(l => l.lesson_status === 'cancelled' || l.lesson_status === 'no_show').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">수업 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">수업 관리</h1>
          <p className="text-gray-600 mt-2">
            {format(new Date(selectedDate), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })} 1:1 화상수업 현황
          </p>
        </div>
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            수업 추가
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">총 수업</p>
              <p className="text-2xl font-bold text-gray-900">{todayStats.total}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">완료됨</p>
              <p className="text-2xl font-bold text-gray-900">{todayStats.completed}</p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckSquare className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">예정됨</p>
              <p className="text-2xl font-bold text-gray-900">{todayStats.scheduled}</p>
            </div>
            <div className="p-3 bg-orange-50 rounded-lg">
              <Clock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">취소/노쇼</p>
              <p className="text-2xl font-bold text-gray-900">{todayStats.cancelled}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="학생 이름, 담임선생님, 수업 제목으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 상태</option>
            <option value="scheduled">예정됨</option>
            <option value="completed">완료됨</option>
            <option value="cancelled">취소됨</option>
            <option value="no_show">노쇼</option>
          </select>
        </div>
      </div>

      {/* Lessons List - 1:1 Video Format */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">오늘의 1:1 화상수업</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredLessons.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {selectedDate}에 예정된 수업이 없습니다.
            </div>
          ) : (
            filteredLessons.map((lesson) => (
              <div
                key={lesson.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  {/* Left Section: Student Info */}
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <User className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 text-lg">
                          {lesson.student?.full_name || '학생 정보 없음'}
                        </h3>
                        {lesson.student?.level && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full font-medium">
                            Level {lesson.student.level}
                          </span>
                        )}
                      </div>
                      {lesson.title && (
                        <p className="text-sm text-gray-600 mb-1">{lesson.title}</p>
                      )}
                      {lesson.description && (
                        <p className="text-xs text-gray-500">{lesson.description}</p>
                      )}
                    </div>
                  </div>

                  {/* Middle Section: Time */}
                  <div className="flex items-center gap-2 px-6">
                    <Clock className="w-5 h-5 text-gray-400" />
                    <div className="text-center">
                      <div className="font-semibold text-gray-900">
                        {lesson.start_time?.slice(0, 5)} - {lesson.end_time?.slice(0, 5)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(() => {
                          const start = lesson.start_time?.split(':');
                          const end = lesson.end_time?.split(':');
                          if (start && end) {
                            const startMin = parseInt(start[0]) * 60 + parseInt(start[1]);
                            const endMin = parseInt(end[0]) * 60 + parseInt(end[1]);
                            const duration = endMin - startMin;
                            return `${duration}분`;
                          }
                          return '';
                        })()}
                      </div>
                    </div>
                  </div>

                  {/* Right Section: Teacher */}
                  <div className="flex items-center gap-4 px-6">
                    <div className="text-right">
                      <div className="flex items-center gap-2 justify-end mb-1">
                        <GraduationCap className="w-4 h-4 text-blue-600" />
                        <span className="font-medium text-gray-900">
                          {lesson.student?.native_teacher_name || '담임선생님 미지정'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lesson.lesson_status)}`}>
                          {getStatusIcon(lesson.lesson_status)}
                          <span className="ml-1">{getStatusText(lesson.lesson_status)}</span>
                        </span>
                        {lesson.attendance_status && (
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getAttendanceColor(lesson.attendance_status)}`}>
                            {getAttendanceText(lesson.attendance_status)}
                          </span>
                        )}
                        {lesson.homework_assigned && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            <BookOpen className="w-3 h-3 inline mr-1" />
                            숙제
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => setSelectedLesson(lesson)}
                      className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Additional Notes */}
                {lesson.lesson_notes && (
                  <div className="mt-3 ml-16 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <span className="font-medium">메모: </span>
                      {lesson.lesson_notes}
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Empty State */}
      {lessons.length === 0 && (
        <div className="text-center py-12">
          <Video className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">수업이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            새로운 1:1 화상수업을 추가하여 일정을 관리하세요.
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              수업 추가
            </button>
          </div>
        </div>
      )}

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-bold text-gray-900">
                      {selectedLesson.student?.full_name || '학생 정보 없음'}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedLesson.lesson_status)}`}>
                      {getStatusText(selectedLesson.lesson_status)}
                    </span>
                  </div>
                  <p className="text-gray-600">{selectedLesson.title}</p>
                  {selectedLesson.description && (
                    <p className="text-sm text-gray-500 mt-1">{selectedLesson.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <User className="w-4 h-4" />
                    학생 정보
                  </h4>
                  <div className="space-y-1 text-sm">
                    <div>이름: {selectedLesson.student?.full_name}</div>
                    <div>레벨: Level {selectedLesson.student?.level || '미설정'}</div>
                  </div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    담임선생님
                  </h4>
                  <div className="text-sm">
                    {selectedLesson.student?.native_teacher_name || '미지정'}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  수업 일정
                </h4>
                <div className="space-y-1 text-sm">
                  <div>날짜: {format(new Date(selectedLesson.lesson_date), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })}</div>
                  <div>시간: {selectedLesson.start_time?.slice(0, 5)} - {selectedLesson.end_time?.slice(0, 5)}</div>
                  <div>수업 방식: 1:1 온라인 화상수업</div>
                </div>
              </div>

              {selectedLesson.attendance_status && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">출석 상태</h4>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getAttendanceColor(selectedLesson.attendance_status)}`}>
                    {getAttendanceText(selectedLesson.attendance_status)}
                  </span>
                </div>
              )}

              {selectedLesson.lesson_notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">수업 노트</h4>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedLesson.lesson_notes}</p>
                </div>
              )}

              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gray-600" />
                <span className="text-sm font-medium text-gray-700">
                  숙제 배정: {selectedLesson.homework_assigned ? '있음' : '없음'}
                </span>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  닫기
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  수업 편집
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
