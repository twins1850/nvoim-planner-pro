"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  CalendarDays, 
  Clock, 
  Users, 
  Plus, 
  Search, 
  Filter,
  BookOpen,
  FileText,
  Video,
  CheckSquare,
  User,
  Calendar,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from "lucide-react";
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  lesson_date: string;
  start_time: string;
  end_time: string;
  location?: string;
  lesson_type: 'individual' | 'group' | 'online';
  status: 'scheduled' | 'completed' | 'cancelled';
  student_count: number;
  materials?: string[];
  notes?: string;
  created_at: string;
  students?: Array<{
    id: string;
    name: string;
    attendance: 'present' | 'absent' | 'late';
  }>;
}

export default function LessonsContent() {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
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

      // 실제 데이터 대신 더미 데이터 사용
      const dummyLessons: Lesson[] = [
        {
          id: '1',
          title: '기초 회화 수업',
          description: '인사말과 자기소개 연습',
          lesson_date: selectedDate,
          start_time: '09:00',
          end_time: '10:00',
          location: '강의실 A',
          lesson_type: 'individual',
          status: 'scheduled',
          student_count: 1,
          materials: ['Unit 1 교재', '발음 연습 시트'],
          notes: '학생의 발음에 중점을 두고 수업 진행',
          created_at: new Date().toISOString(),
          students: [
            { id: '1', name: '김민수', attendance: 'present' }
          ]
        },
        {
          id: '2',
          title: '비즈니스 영어',
          description: '프레젠테이션 영어 연습',
          lesson_date: selectedDate,
          start_time: '14:00',
          end_time: '15:30',
          location: '온라인',
          lesson_type: 'online',
          status: 'completed',
          student_count: 3,
          materials: ['Business English 교재', '프레젠테이션 가이드'],
          notes: '학생들의 참여도가 높았음',
          created_at: new Date().toISOString(),
          students: [
            { id: '1', name: '이영희', attendance: 'present' },
            { id: '2', name: '박철수', attendance: 'present' },
            { id: '3', name: '최지영', attendance: 'late' }
          ]
        },
        {
          id: '3',
          title: '토익 스피킹 그룹 수업',
          description: 'Part 1-6 연습 및 피드백',
          lesson_date: selectedDate,
          start_time: '19:00',
          end_time: '20:30',
          location: '강의실 B',
          lesson_type: 'group',
          status: 'scheduled',
          student_count: 5,
          materials: ['토익 스피킹 교재', '실전 문제집'],
          created_at: new Date().toISOString()
        }
      ];

      setLessons(dummyLessons);
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
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled': return '예정됨';
      case 'completed': return '완료됨';
      case 'cancelled': return '취소됨';
      default: return '알 수 없음';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'individual': return 'bg-purple-100 text-purple-800';
      case 'group': return 'bg-orange-100 text-orange-800';
      case 'online': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'individual': return '개인';
      case 'group': return '그룹';
      case 'online': return '온라인';
      default: return '알 수 없음';
    }
  };

  const filteredLessons = lessons.filter(lesson => {
    const matchesSearch = searchTerm === "" ||
      lesson.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lesson.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || lesson.status === filterStatus;
    const matchesType = filterType === "all" || lesson.lesson_type === filterType;
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const todayStats = {
    total: lessons.length,
    completed: lessons.filter(l => l.status === 'completed').length,
    scheduled: lessons.filter(l => l.status === 'scheduled').length,
    cancelled: lessons.filter(l => l.status === 'cancelled').length
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
            {format(new Date(selectedDate), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })} 수업 현황
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
              <CalendarDays className="w-6 h-6 text-blue-600" />
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
              <p className="text-sm text-gray-600">취소됨</p>
              <p className="text-2xl font-bold text-gray-900">{todayStats.cancelled}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <CalendarDays className="w-6 h-6 text-red-600" />
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
                placeholder="수업 제목이나 내용으로 검색..."
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
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 타입</option>
            <option value="individual">개인</option>
            <option value="group">그룹</option>
            <option value="online">온라인</option>
          </select>
        </div>
      </div>

      {/* Lessons List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">수업 목록</h2>
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
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => setSelectedLesson(lesson)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(lesson.status)}`}>
                        {getStatusText(lesson.status)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(lesson.lesson_type)}`}>
                        {getTypeText(lesson.lesson_type)}
                      </span>
                    </div>
                    
                    {lesson.description && (
                      <p className="text-sm text-gray-600 mb-2">{lesson.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        {lesson.start_time} - {lesson.end_time}
                      </div>
                      {lesson.location && (
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          {lesson.location}
                        </div>
                      )}
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1" />
                        {lesson.student_count}명
                      </div>
                    </div>

                    {lesson.students && lesson.students.length > 0 && (
                      <div className="mt-2">
                        <div className="flex flex-wrap gap-1">
                          {lesson.students.map(student => (
                            <span 
                              key={student.id}
                              className={`px-2 py-1 rounded-full text-xs ${
                                student.attendance === 'present' ? 'bg-green-100 text-green-800' :
                                student.attendance === 'late' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-red-100 text-red-800'
                              }`}
                            >
                              {student.name}
                              {student.attendance === 'late' && ' (지각)'}
                              {student.attendance === 'absent' && ' (결석)'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
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
              </div>
            ))
          )}
        </div>
      </div>

      {/* Empty State */}
      {lessons.length === 0 && (
        <div className="text-center py-12">
          <CalendarDays className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">수업이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            새로운 수업을 추가하여 일정을 관리하세요.
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
                  <h3 className="text-xl font-bold text-gray-900">{selectedLesson.title}</h3>
                  <p className="text-gray-600 mt-1">{selectedLesson.description}</p>
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
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">수업 정보</h4>
                  <div className="space-y-2 text-sm">
                    <div>날짜: {format(new Date(selectedLesson.lesson_date), 'yyyy-MM-dd')}</div>
                    <div>시간: {selectedLesson.start_time} - {selectedLesson.end_time}</div>
                    <div>장소: {selectedLesson.location || '미정'}</div>
                    <div>타입: {getTypeText(selectedLesson.lesson_type)}</div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">상태</h4>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedLesson.status)}`}>
                    {getStatusText(selectedLesson.status)}
                  </span>
                </div>
              </div>

              {selectedLesson.materials && selectedLesson.materials.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">수업 자료</h4>
                  <ul className="list-disc list-inside text-sm text-gray-600">
                    {selectedLesson.materials.map((material, index) => (
                      <li key={index}>{material}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedLesson.notes && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">수업 노트</h4>
                  <p className="text-sm text-gray-600">{selectedLesson.notes}</p>
                </div>
              )}

              {selectedLesson.students && selectedLesson.students.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">참석 학생</h4>
                  <div className="space-y-2">
                    {selectedLesson.students.map(student => (
                      <div key={student.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <span>{student.name}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          student.attendance === 'present' ? 'bg-green-100 text-green-800' :
                          student.attendance === 'late' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {student.attendance === 'present' ? '출석' :
                           student.attendance === 'late' ? '지각' : '결석'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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