"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Calendar,
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  CreditCard,
  Package,
  Award,
  BarChart3,
  MoreVertical,
  GraduationCap
} from "lucide-react";
import AddSubscriptionForm from "@/components/AddSubscriptionForm";
import StudentCalendar, { StudentCalendarRef } from "@/components/StudentCalendar";
import PostponeModal from "@/components/PostponeModal";

interface Student {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  level?: string;
  status?: 'active' | 'inactive' | 'paused';
  created_at: string;
  last_lesson_date?: string;
  total_lessons?: number;
  completion_rate?: number;
  invite_code?: string;
  is_connected?: boolean;
  birth_date?: string;
  address?: string;
  parent_name?: string;
  parent_phone?: string;
  native_teacher_name?: string;
  teacher_contact?: string;
  teacher_notes?: string;
  notes?: string;
  planner_id?: string;
  // 레벨테스트 & 학습 목표 필드
  level_test_image_url?: string | null;
  level_test_date?: string | null;
  goal_description?: string | null;
  goal_target_date?: string | null;
  goal_category?: string | null;
}

interface Subscription {
  id: string;
  subscription_name: string;
  frequency: '주2회' | '주3회' | '주5회' | '주6회' | '자율수강';
  duration: '25분' | '50분';
  payment_period: '1개월' | '3개월' | '6개월' | '12개월';
  flexible_lessons_per_month?: number;
  start_date: string;
  end_date: string;
  total_lessons: number;
  completed_lessons: number;
  remaining_lessons: number;
  postponements_used: number;
  max_postponements: number;
  total_amount?: number;
  payment_amount?: number;
  pricing_type?: 'managed' | 'regular' | 'base';
  payment_method?: 'cash' | 'card';
  per_lesson_price?: number;
  per_month_price?: number;
  status: 'active' | 'paused' | 'expired' | 'cancelled';
  notes?: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  level: string;
  duration: string;
  start_date: string;
  end_date?: string;
  progress: number;
  status: 'not_started' | 'in_progress' | 'completed';
  topics: string[];
  notes?: string; // 플래너 메모
}

interface CourseHistory {
  id: string;
  course_name: string;
  category: string;
  level: string;
  start_date: string;
  end_date?: string;
  completion_status: 'completed' | 'switched' | 'dropped';
  notes?: string;
  duration_weeks?: number;
}

interface CourseRecommendation {
  id: string;
  recommended_course_name: string;
  course_category: string;
  course_level: string;
  course_duration: string;
  match_percentage: number;
  recommendation_reason: string;
  priority_rank: number;
  strength_analysis: string;
  improvement_areas: string;
  learning_direction: string;
  is_active: boolean;
}

interface StudentDetailContentProps {
  studentId: string;
}

export default function StudentDetailContent({ studentId }: StudentDetailContentProps) {
  const router = useRouter();
  const [student, setStudent] = useState<Student | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseHistory, setCourseHistory] = useState<CourseHistory[]>([]);
  const [recommendations, setRecommendations] = useState<CourseRecommendation[]>([]);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'subscription' | 'schedule' | 'course' | 'history'>('info');
  const [editMode, setEditMode] = useState(false);
  const [editedStudent, setEditedStudent] = useState<Student | null>(null);
  const [showAddSubscription, setShowAddSubscription] = useState(false);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [postponeModal, setPostponeModal] = useState({ open: false, lessonId: '' });
  const calendarRef = useRef<StudentCalendarRef>(null);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('User not authenticated');
        return;
      }

      // 실제 데이터베이스에서 학생 정보 가져오기
      const { data: studentData, error: studentError } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('id', studentId)
        .eq('planner_id', user.id)
        .single();

      if (studentError) {
        console.error('Error fetching student data:', studentError);
        return;
      }

      if (studentData) {
        setStudent(studentData);
        setEditedStudent(studentData);
      }

      // 실제 수강권 데이터 가져오기
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (subscriptionsError) {
        console.error('Error fetching subscriptions:', subscriptionsError);
        setSubscriptions([]);
      } else {
        setSubscriptions(subscriptionsData || []);
      }

      // 현재 수강 중인 과정 가져오기
      const { data: coursesData, error: coursesError } = await supabase
        .from('student_courses')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'in_progress')
        .order('start_date', { ascending: false });

      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
        setCourses([]);
      } else if (coursesData) {
        setCourses(coursesData.map(c => ({
          id: c.id,
          name: c.course_name,
          description: c.course_description || '',
          level: c.course_level,
          duration: c.course_duration || '',
          start_date: c.start_date,
          end_date: c.end_date,
          progress: c.progress_percentage || 0,
          status: c.status === 'in_progress' ? 'in_progress' : 'not_started',
          topics: [],
          notes: c.planner_notes
        })));
      }

      // 과거 수강 이력 가져오기
      const { data: historyData, error: historyError } = await supabase
        .from('course_history')
        .select('*')
        .eq('student_id', studentId)
        .order('end_date', { ascending: false });

      if (historyError) {
        console.error('Error fetching course history:', historyError);
        setCourseHistory([]);
      } else {
        setCourseHistory(historyData || []);
      }

      // AI 추천 과정 가져오기
      const { data: recommendationsData, error: recommendationsError } = await supabase
        .from('course_recommendations')
        .select('*')
        .eq('student_id', studentId)
        .eq('is_active', true)
        .order('priority_rank', { ascending: true });

      if (recommendationsError) {
        console.error('Error fetching recommendations:', recommendationsError);
        setRecommendations([]);
      } else {
        setRecommendations(recommendationsData || []);
      }

    } catch (error) {
      console.error('Error fetching student data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStudent = async () => {
    if (editedStudent) {
      try {
        const supabase = createClient();

        const { error } = await supabase
          .from('student_profiles')
          .update({
            email: editedStudent.email,
            phone: editedStudent.phone,
            birth_date: editedStudent.birth_date,
            address: editedStudent.address,
            parent_name: editedStudent.parent_name,
            parent_phone: editedStudent.parent_phone,
            level: editedStudent.level,
            notes: editedStudent.notes,
            level_test_image_url: editedStudent.level_test_image_url,
            level_test_date: editedStudent.level_test_date,
            goal_description: editedStudent.goal_description,
            goal_target_date: editedStudent.goal_target_date,
            goal_category: editedStudent.goal_category
          })
          .eq('id', studentId);

        if (error) {
          console.error('Error saving student:', error);
          alert('학생 정보 저장 중 오류가 발생했습니다.');
          return;
        }

        setStudent(editedStudent);
        setEditMode(false);
        alert('학생 정보가 성공적으로 저장되었습니다.');
      } catch (error) {
        console.error('Error saving student:', error);
        alert('학생 정보 저장 중 오류가 발생했습니다.');
      }
    }
  };

  const handleGenerateAIRecommendations = async () => {
    setLoadingRecommendations(true);
    try {
      const response = await fetch('/api/courses/analyze-and-recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: student?.id })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      const result = await response.json();

      // 추천 갱신
      await fetchStudentData();

      // 성공 메시지
      alert('AI 추천이 성공적으로 생성되었습니다!');
    } catch (error: any) {
      alert('AI 추천 생성 실패: ' + error.message);
    } finally {
      setLoadingRecommendations(false);
    }
  };

  const handleAddCourse = (newCourse: Partial<Course>) => {
    const course: Course = {
      id: Date.now().toString(),
      name: newCourse.name || '',
      description: newCourse.description || '',
      level: newCourse.level || student?.level || 'Intermediate',
      duration: newCourse.duration || '',
      start_date: new Date().toISOString().split('T')[0],
      progress: 0,
      status: 'not_started',
      topics: newCourse.topics || [],
      notes: newCourse.notes || '' // 플래너 메모 추가
    };
    setCourses([...courses, course]);
    setShowAddCourse(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCourseStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'in_progress': return 'text-blue-600';
      case 'not_started': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">학생 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/dashboard/students')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {student.full_name.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{student.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(student.status || 'inactive')}`}>
                  {student.status === 'active' ? '활성' : student.status === 'paused' ? '일시정지' : '비활성'}
                </span>
                <span className="text-sm text-gray-500">레벨: {student.level}</span>
                {student.is_connected && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                    앱 연결됨
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('info')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'info' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          기본 정보
        </button>
        <button
          onClick={() => setActiveTab('subscription')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'subscription'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          수강권 현황
        </button>
        <button
          onClick={() => setActiveTab('schedule')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'schedule'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          수업 일정
        </button>
        <button
          onClick={() => setActiveTab('course')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'course'
              ? 'bg-white text-blue-600 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          수강 과정
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-4 py-2 rounded-md font-medium transition-colors ${
            activeTab === 'history' 
              ? 'bg-white text-blue-600 shadow-sm' 
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          학습 기록
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200">
        {activeTab === 'info' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">기본 정보</h2>
              {!editMode ? (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  수정
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditMode(false);
                      setEditedStudent(student);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    취소
                  </button>
                  <button
                    onClick={handleSaveStudent}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    저장
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                  {editMode ? (
                    <input
                      type="email"
                      value={editedStudent?.email || ''}
                      onChange={(e) => setEditedStudent(prev => prev ? {...prev, email: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{student.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={editedStudent?.phone || ''}
                      onChange={(e) => setEditedStudent(prev => prev ? {...prev, phone: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{student.phone || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">생년월일</label>
                  {editMode ? (
                    <input
                      type="date"
                      value={editedStudent?.birth_date || ''}
                      onChange={(e) => setEditedStudent(prev => prev ? {...prev, birth_date: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{student.birth_date || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">주소</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedStudent?.address || ''}
                      onChange={(e) => setEditedStudent(prev => prev ? {...prev, address: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{student.address || '-'}</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">보호자 이름</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedStudent?.parent_name || ''}
                      onChange={(e) => setEditedStudent(prev => prev ? {...prev, parent_name: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{student.parent_name || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">보호자 연락처</label>
                  {editMode ? (
                    <input
                      type="tel"
                      value={editedStudent?.parent_phone || ''}
                      onChange={(e) => setEditedStudent(prev => prev ? {...prev, parent_phone: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{student.parent_phone || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">레벨</label>
                  {editMode ? (
                    <select
                      value={editedStudent?.level || ''}
                      onChange={(e) => setEditedStudent(prev => prev ? {...prev, level: e.target.value} : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="1">1</option>
                      <option value="1-2">1-2</option>
                      <option value="2">2</option>
                      <option value="3">3</option>
                      <option value="4">4</option>
                      <option value="5">5</option>
                      <option value="6">6</option>
                      <option value="7">7</option>
                      <option value="8">8</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{student.level}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">원어민 담임선생님</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={editedStudent?.native_teacher_name || ''}
                      onChange={(e) => setEditedStudent(prev => prev ? {...prev, native_teacher_name: e.target.value} : null)}
                      placeholder="예: John Smith"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{student.native_teacher_name || '-'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                  {editMode ? (
                    <textarea
                      value={editedStudent?.notes || ''}
                      onChange={(e) => setEditedStudent(prev => prev ? {...prev, notes: e.target.value} : null)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900">{student.notes || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            {/* 레벨테스트 정보 섹션 */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">레벨테스트 정보</h3>

              <div className="grid grid-cols-1 gap-4">
                {/* 레벨테스트 이미지 업로드 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    레벨테스트 결과표 이미지
                  </label>
                  {editedStudent?.level_test_image_url ? (
                    <div className="relative inline-block">
                      <img
                        src={editedStudent.level_test_image_url}
                        alt="레벨테스트 결과표"
                        className="max-w-md border border-gray-300 rounded-lg"
                      />
                      {editMode && (
                        <button
                          onClick={() => {
                            if (editedStudent) {
                              setEditedStudent({
                                ...editedStudent,
                                level_test_image_url: null,
                                level_test_date: null
                              });
                            }
                          }}
                          className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ) : editMode ? (
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const supabase = createClient();
                            const { data: { user } } = await supabase.auth.getUser();
                            if (!user) throw new Error('User not authenticated');

                            const fileName = `${studentId}_level_test_${Date.now()}`;
                            const { data, error } = await supabase.storage
                              .from('level-test-images')
                              .upload(`${user.id}/${fileName}`, file);

                            if (error) throw error;

                            const { data: { publicUrl } } = supabase.storage
                              .from('level-test-images')
                              .getPublicUrl(data.path);

                            if (editedStudent) {
                              setEditedStudent({
                                ...editedStudent,
                                level_test_image_url: publicUrl,
                                level_test_date: new Date().toISOString().split('T')[0]
                              });
                            }
                          } catch (error) {
                            console.error('Error uploading image:', error);
                            alert('이미지 업로드 중 오류가 발생했습니다.');
                          }
                        }
                      }}
                      className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-lg file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100"
                    />
                  ) : (
                    <p className="text-sm text-gray-500">레벨테스트 결과표가 업로드되지 않았습니다.</p>
                  )}
                </div>

                {/* 테스트 날짜 */}
                {editedStudent?.level_test_date && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      테스트 날짜
                    </label>
                    <input
                      type="date"
                      value={editedStudent?.level_test_date || ''}
                      onChange={(e) => {
                        if (editedStudent) {
                          setEditedStudent({
                            ...editedStudent,
                            level_test_date: e.target.value
                          });
                        }
                      }}
                      disabled={!editMode}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg disabled:bg-gray-100"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* 학습 목표 섹션 */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">학습 목표</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 목표 카테고리 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    목표 카테고리
                  </label>
                  {editMode ? (
                    <select
                      value={editedStudent?.goal_category || ''}
                      onChange={(e) => {
                        if (editedStudent) {
                          setEditedStudent({
                            ...editedStudent,
                            goal_category: e.target.value
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">선택하세요</option>
                      <option value="토익스피킹">토익스피킹</option>
                      <option value="해외여행">해외여행</option>
                      <option value="일상영어">일상영어</option>
                      <option value="워킹홀리데이">워킹홀리데이</option>
                      <option value="비즈니스영어">비즈니스영어</option>
                      <option value="유학준비">유학준비</option>
                      <option value="기타">기타</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{editedStudent?.goal_category || '-'}</p>
                  )}
                </div>

                {/* 목표 달성 희망 날짜 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    목표 달성 희망 날짜
                  </label>
                  {editMode ? (
                    <input
                      type="date"
                      value={editedStudent?.goal_target_date || ''}
                      onChange={(e) => {
                        if (editedStudent) {
                          setEditedStudent({
                            ...editedStudent,
                            goal_target_date: e.target.value
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  ) : (
                    <p className="text-gray-900">
                      {editedStudent?.goal_target_date ? new Date(editedStudent.goal_target_date).toLocaleDateString('ko-KR') : '-'}
                    </p>
                  )}
                </div>

                {/* 목표 상세 설명 */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    목표 상세 설명
                  </label>
                  {editMode ? (
                    <textarea
                      value={editedStudent?.goal_description || ''}
                      onChange={(e) => {
                        if (editedStudent) {
                          setEditedStudent({
                            ...editedStudent,
                            goal_description: e.target.value
                          });
                        }
                      }}
                      rows={4}
                      placeholder="예: 6개월 후 토익스피킹 Level 6 달성, 해외 비즈니스 미팅 대응 능력 향상"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-gray-900 whitespace-pre-wrap">{editedStudent?.goal_description || '-'}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">총 수업 횟수</p>
                  <p className="text-2xl font-bold text-gray-900">{student.total_lessons}회</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">완료율</p>
                  <p className="text-2xl font-bold text-blue-600">{student.completion_rate}%</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">마지막 수업</p>
                  <p className="text-lg font-medium text-gray-900">
                    {student.last_lesson_date ? new Date(student.last_lesson_date).toLocaleDateString('ko-KR') : '-'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'subscription' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">수강권 현황</h2>
              <button
                onClick={() => setShowAddSubscription(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                수강권 추가
              </button>
            </div>

            <div className="space-y-4">
              {subscriptions.map((subscription) => (
                <div key={subscription.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{subscription.subscription_name}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(subscription.status)}`}>
                          {subscription.status === 'active' ? '활성' : 
                           subscription.status === 'expired' ? '만료' : 
                           subscription.status === 'paused' ? '일시정지' : '취소'}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">수강 빈도</p>
                          <p className="font-medium">{subscription.frequency}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">수업 시간</p>
                          <p className="font-medium">{subscription.duration}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">수강 기간</p>
                          <p className="font-medium">
                            {new Date(subscription.start_date).toLocaleDateString('ko-KR')} ~ {new Date(subscription.end_date).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">잔여 횟수</p>
                          <p className="font-medium">
                            {subscription.remaining_lessons}/{subscription.total_lessons}회
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-600">진행률</p>
                          <p className="font-medium">
                            {Math.round((subscription.completed_lessons / subscription.total_lessons) * 100)}%
                          </p>
                        </div>

                        {/* 가격 타입 */}
                        {subscription.pricing_type && (
                          <div>
                            <p className="text-gray-600">가격 타입</p>
                            <p className="font-medium">
                              {subscription.pricing_type === 'managed' ? '관리수강' :
                               subscription.pricing_type === 'regular' ? '일반수강' : '원단가'}
                            </p>
                          </div>
                        )}

                        {/* 결제 수단 */}
                        {subscription.payment_method && (
                          <div>
                            <p className="text-gray-600">결제 수단</p>
                            <p className="font-medium">
                              {subscription.payment_method === 'cash' ? '현금' : '카드'}
                            </p>
                          </div>
                        )}

                        {/* 회당 단가 */}
                        {subscription.per_lesson_price && (
                          <div>
                            <p className="text-gray-600">회당 단가</p>
                            <p className="font-medium text-blue-600">
                              {subscription.per_lesson_price.toLocaleString()}원
                            </p>
                          </div>
                        )}

                        {/* 월 단가 */}
                        {subscription.per_month_price && (
                          <div>
                            <p className="text-gray-600">월 단가</p>
                            <p className="font-medium text-blue-600">
                              {subscription.per_month_price.toLocaleString()}원
                            </p>
                          </div>
                        )}

                        {/* 결제 금액 */}
                        {subscription.payment_amount && (
                          <div>
                            <p className="text-gray-600">결제 금액</p>
                            <p className="font-medium text-green-600">
                              {subscription.payment_amount.toLocaleString()}원
                            </p>
                          </div>
                        )}
                      </div>

                      {/* 연기권 프로그레스 바 */}
                      <div className="mt-4">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600 flex items-center gap-1">
                            연기권 사용 현황
                            {subscription.postponements_used >= subscription.max_postponements && (
                              <AlertCircle className="w-4 h-4 text-red-500" />
                            )}
                          </span>
                          <span className={`font-medium ${
                            subscription.postponements_used >= subscription.max_postponements
                              ? 'text-red-600'
                              : 'text-gray-900'
                          }`}>
                            {subscription.postponements_used}/{subscription.max_postponements}회
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              subscription.postponements_used >= subscription.max_postponements
                                ? 'bg-red-500'
                                : subscription.postponements_used / subscription.max_postponements > 0.7
                                ? 'bg-yellow-500'
                                : 'bg-green-500'
                            }`}
                            style={{ width: `${(subscription.postponements_used / subscription.max_postponements) * 100}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          남은 연기권: {subscription.max_postponements - subscription.postponements_used}회
                        </p>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">진행률</span>
                          <span className="font-medium">
                            {Math.round((subscription.completed_lessons / subscription.total_lessons) * 100)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${(subscription.completed_lessons / subscription.total_lessons) * 100}%` }}
                          />
                        </div>
                      </div>
                      {subscription.notes && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            {subscription.notes}
                          </p>
                        </div>
                      )}
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 ml-4">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {subscriptions.length === 0 && (
                <div className="text-center py-8">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-600">등록된 수강권이 없습니다</p>
                  <button
                    onClick={() => setShowAddSubscription(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    수강권 추가
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'schedule' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">수업 일정</h2>
            {student && (
              <StudentCalendar
                ref={calendarRef}
                studentId={student.id}
                onPostpone={(lessonId) => {
                  setPostponeModal({ open: true, lessonId });
                }}
              />
            )}
          </div>
        )}

        {activeTab === 'course' && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">수강 과정</h2>
              <button
                onClick={() => setShowAddCourse(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                과정 추가
              </button>
            </div>

            <div className="space-y-4">
              {courses.map((course) => (
                <div key={course.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{course.name}</h3>
                        <span className={`text-sm font-medium ${getCourseStatusColor(course.status)}`}>
                          {course.status === 'completed' ? '완료' : course.status === 'in_progress' ? '진행중' : '시작전'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{course.description}</p>
                      
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">레벨</p>
                          <p className="font-medium">{course.level}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">기간</p>
                          <p className="font-medium">{course.duration}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">시작일</p>
                          <p className="font-medium">{course.start_date}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">종료일</p>
                          <p className="font-medium">{course.end_date || '진행중'}</p>
                        </div>
                      </div>

                      <div className="mt-3">
                        <p className="text-sm text-gray-600 mb-2">학습 주제</p>
                        <div className="flex flex-wrap gap-2">
                          {course.topics.map((topic, index) => (
                            <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">진행률</span>
                          <span className="font-medium">{course.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              course.status === 'completed' ? 'bg-green-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${course.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* 플래너 메모 */}
                      {course.notes && (
                        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-start gap-2">
                            <div className="flex-shrink-0">
                              <svg className="w-4 h-4 text-amber-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-amber-800 mb-1">플래너 메모</p>
                              <p className="text-sm text-amber-700">{course.notes}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <button className="text-gray-400 hover:text-gray-600 ml-4">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {courses.length === 0 && (
                <div className="text-center py-8">
                  <BookOpen className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-gray-600">등록된 수강 과정이 없습니다</p>
                  <button
                    onClick={() => setShowAddCourse(true)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    과정 추가
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">학습 기록</h2>
            
            {/* 수강 과정 이력 섹션 */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                수강 과정 이력
              </h3>
              <div className="bg-gray-50 rounded-lg p-6">
                {/* 현재 수강 중인 과정 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-900 mb-3">현재 수강 과정</h4>
                  <div className="space-y-3">
                    {courses?.map((course) => (
                      <div key={course.id} className="bg-white rounded-lg border-2 border-green-200 p-4 relative">
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            진행 중
                          </span>
                        </div>
                        <div className="pr-16">
                          <div className="flex items-center gap-2 mb-2">
                            <h5 className="font-semibold text-gray-900">{course.name}</h5>
                            <span className="text-sm text-gray-600">- {course.level}</span>
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            시작일: {new Date(course.start_date).toLocaleDateString('ko-KR')}
                            {course.description && ` | ${course.description}`}
                          </div>
                          {course.notes && (
                            <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                              <span className="font-medium text-amber-800">플래너 메모: </span>
                              <span className="text-amber-700">{course.notes}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-8 text-gray-500">
                        현재 수강 중인 과정이 없습니다.
                      </div>
                    )}
                  </div>
                </div>

                {/* 과거 수강 이력 타임라인 */}
                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-3">과정 이수 이력</h4>
                  <div className="relative">
                    {/* 타임라인 라인 */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-300"></div>

                    {/* 실제 이력 데이터 렌더링 */}
                    <div className="space-y-6">
                      {courseHistory.length > 0 ? (
                        courseHistory.map((history) => (
                          <div key={history.id} className="relative pl-12">
                            <div className={`absolute left-4 w-4 h-4 rounded-full border-2 border-white shadow ${
                              history.completion_status === 'completed' ? 'bg-green-500' :
                              history.completion_status === 'switched' ? 'bg-blue-500' :
                              'bg-orange-500'
                            }`}></div>
                            <div className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h5 className="font-semibold text-gray-900">{history.course_name}</h5>
                                  <p className="text-sm text-gray-600">{history.category}</p>
                                </div>
                                <div className="text-right">
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                    history.completion_status === 'completed' ? 'bg-green-100 text-green-800' :
                                    history.completion_status === 'switched' ? 'bg-blue-100 text-blue-800' :
                                    'bg-orange-100 text-orange-800'
                                  }`}>
                                    {history.completion_status === 'completed' ? '완료' :
                                     history.completion_status === 'switched' ? '전환' : '중단'}
                                  </span>
                                  {history.duration_weeks && (
                                    <p className="text-xs text-gray-500 mt-1">{history.duration_weeks}주 과정</p>
                                  )}
                                </div>
                              </div>
                              <div className="text-sm text-gray-600">
                                {new Date(history.start_date).toLocaleDateString('ko-KR')} - {history.end_date ? new Date(history.end_date).toLocaleDateString('ko-KR') : '진행 중'}
                              </div>
                              {history.notes && (
                                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                                  <span className="font-medium text-amber-800">플래너 메모: </span>
                                  <span className="text-amber-700">{history.notes}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8 text-gray-500">
                          과거 수강 이력이 없습니다.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* AI 추천 과정 섹션 */}
            <div className="mb-8 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-600 rounded-lg">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">AI 추천 과정</h3>
                </div>
                <button
                  onClick={handleGenerateAIRecommendations}
                  disabled={loadingRecommendations || !student?.level_test_image_url}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {loadingRecommendations ? (
                    <>
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                      분석 중...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4" />
                      AI 추천 생성
                    </>
                  )}
                </button>
              </div>

              {!student?.level_test_image_url && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ AI 추천을 생성하려면 먼저 '기본 정보' 탭에서 레벨테스트 결과표를 업로드해주세요.
                  </p>
                </div>
              )}

              {/* 추천 카드 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, index) => (
                    <div key={rec.id} className="bg-white rounded-lg p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            index === 0 ? 'bg-yellow-100 text-yellow-700' :
                            index === 1 ? 'bg-gray-100 text-gray-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            {rec.priority_rank}
                          </div>
                          <span className="text-xs text-gray-500">추천</span>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-600">{rec.match_percentage}%</div>
                          <div className="text-xs text-gray-500">매칭</div>
                        </div>
                      </div>

                      <h4 className="font-semibold text-gray-900 mb-1">{rec.recommended_course_name}</h4>
                      <p className="text-sm text-gray-600 mb-2">{rec.course_category} · {rec.course_level}</p>
                      <p className="text-xs text-gray-500 mb-3">{rec.course_duration}</p>

                      <div className="mb-3 p-2 bg-purple-50 rounded">
                        <p className="text-xs text-gray-700">{rec.recommendation_reason}</p>
                      </div>

                      <button className="w-full px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors">
                        과정 추가
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="col-span-3 text-center py-8 text-gray-500">
                    <p className="mb-2">아직 AI 추천이 생성되지 않았습니다.</p>
                    <p className="text-sm">레벨테스트 결과표를 업로드하고 'AI 추천 생성' 버튼을 클릭하세요.</p>
                  </div>
                )}
              </div>

              {/* AI 분석 인사이트 */}
              {recommendations.length > 0 && recommendations[0].strength_analysis && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-4 border border-green-200">
                    <h5 className="font-semibold text-green-700 mb-2 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      강점
                    </h5>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {recommendations[0].strength_analysis.split(', ').map((s, i) => (
                        <li key={i}>• {s}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-yellow-200">
                    <h5 className="font-semibold text-yellow-700 mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      개선 영역
                    </h5>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {recommendations[0].improvement_areas.split(', ').map((a, i) => (
                        <li key={i}>• {a}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-blue-200">
                    <h5 className="font-semibold text-blue-700 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      학습 방향
                    </h5>
                    <p className="text-sm text-gray-700">
                      {recommendations[0].learning_direction}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">이번 달 수업</p>
                    <p className="text-2xl font-bold text-gray-900">8회</p>
                  </div>
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">평균 점수</p>
                    <p className="text-2xl font-bold text-blue-600">85점</p>
                  </div>
                  <BarChart3 className="w-8 h-8 text-gray-400" />
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">향상도</p>
                    <p className="text-2xl font-bold text-green-600">+12%</p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-gray-400" />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Business English - Lesson 24</p>
                    <p className="text-sm text-gray-600">2026년 1월 5일 10:00 AM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">출석</p>
                    <p className="text-sm text-blue-600">점수: 88/100</p>
                  </div>
                </div>
              </div>
              <div className="border-l-4 border-blue-500 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">TOEIC Speaking - Lesson 12</p>
                    <p className="text-sm text-gray-600">2026년 1월 3일 2:00 PM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">출석</p>
                    <p className="text-sm text-blue-600">점수: 82/100</p>
                  </div>
                </div>
              </div>
              <div className="border-l-4 border-gray-300 pl-4 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Business English - Lesson 23</p>
                    <p className="text-sm text-gray-600">2026년 1월 2일 10:00 AM</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-red-600">결석</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Subscription Modal */}
      {showAddSubscription && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold text-gray-900 mb-4">수강권 추가</h3>
            <AddSubscriptionForm 
              studentId={studentId}
              onClose={() => setShowAddSubscription(false)}
              onSuccess={() => {
                setShowAddSubscription(false);
                fetchStudentData(); // 수강권 목록 새로고침
              }}
            />
          </div>
        </div>
      )}

      {/* Postpone Modal */}
      <PostponeModal
        isOpen={postponeModal.open}
        lessonId={postponeModal.lessonId}
        onClose={() => setPostponeModal({ open: false, lessonId: '' })}
        onSuccess={async () => {
          setPostponeModal({ open: false, lessonId: '' });
          // 학생 캘린더 자동 갱신
          await calendarRef.current?.refresh();
        }}
      />

      {/* Add Course Modal */}
      {showAddCourse && <AddCourseModal />}
    </div>
  );

  function AddCourseModal() {
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [customName, setCustomName] = useState<string>('');
    const [customDescription, setCustomDescription] = useState<string>('');
    const [customLevel, setCustomLevel] = useState<string>('1');
    const [customDuration, setCustomDuration] = useState<string>('');
    const [courseNotes, setCourseNotes] = useState<string>(''); // 플래너 메모

    // 뉴잉글리쉬 실제 커리큘럼 데이터 (27개 과정)
    const curriculumData = {
      '정규통합과정': [
        { name: '레귤러 (Regular)', description: '영어를 처음 시작하는 학습자들을 위한 통합적 영어능력 향상 과정', level: '전 레벨', duration: '레벨당 3-4개월', emoji: '📚' },
        { name: '이머전 (Immersion)', description: '영어 몰입 환경을 통한 단계별 실력 향상 과정', level: '전 레벨', duration: '레벨당 3-4개월', emoji: '🌊' },
        { name: '앤시니어 (N-Senior)', description: '성인 학습자를 위한 맞춤형 영어 과정', level: '전 레벨', duration: '레벨당 4-5개월', emoji: '👨‍💼' },
        { name: '행아웃 (Hangout)', description: '재미있는 이야기와 노래를 통한 종합 영어 학습', level: '초급자용', duration: '레벨당 3-4개월', emoji: '🎵' },
      ],
      '회화': [
        { name: '토픽톡 (Topic Talk)', description: '일상의 다양한 주제에 대한 풍부한 표현력 습득 과정', level: '전 레벨', duration: '레벨당 2-3개월', emoji: '💬' },
        { name: '모멘텀 A (Momentum A)', description: '상황별 실전 회화 능력 향상 과정', level: '중급자용', duration: '레벨당 3-4개월', emoji: '⚡' },
        { name: '앤라이프 (N-Life)', description: '실생활 회화 과정 - 상황별 패턴과 관용구 학습', level: '고급자용', duration: '레벨당 4-5개월', emoji: '🏠' },
        { name: '아이캔톡 (I Can Talk)', description: '왕초보 성인을 위한 쉬운 일상회화 과정', level: '초급자용', duration: '레벨당 4-6개월', emoji: '🗣️' },
        { name: '데일리 앤보임 (Daily NVOIM)', description: '앤보임 영어광장의 다양한 패턴 활용 회화 과정', level: '중급자용', duration: '레벨당 3-4개월', emoji: '📅' },
        { name: 'EEA (English for Everyday Activities)', description: '일상생활 영어 활동을 위한 종합 학습 과정', level: '전 레벨', duration: '편당 2-3개월', emoji: '🏃‍♂️' },
      ],
      '비즈니스': [
        { name: '모멘텀 C (Momentum C)', description: '비즈니스 영어와 영어 면접을 위한 전문 과정', level: '중급자용', duration: '3-4개월', emoji: '💼' },
        { name: 'CBE (Communicating in Business English)', description: '빠르게 변화하는 국제 비즈니스 상황에 맞는 의사소통 능력 향상 과정', level: '중급자용', duration: '3-4개월', emoji: '🌐' },
      ],
      '시험준비': [
        { name: '토익스피킹 비기너 (TOEIC Speaking Beginner)', description: '시험의 각 문항에 대해 점층적 학습이 가능하도록 구성된 TOEIC Speaking 기초 과정', level: '초급자용', duration: '3-4개월 (40개 Unit)', emoji: '📝' },
        { name: '토익스피킹 (TOEIC Speaking)', description: '2021년 개정 토익스피킹시험 최신 경향 완벽 반영 교재', level: '중급자용', duration: '2-3개월', emoji: '🎯' },
        { name: '오픽 (OPIc)', description: '실제 출제되는 문제로만 구성된 교재로 OPIc 시험 대비', level: '중급자용', duration: '2-3개월', emoji: '🎤' },
        { name: '모멘텀 B (Momentum B)', description: '질의 응답을 바탕으로 논리적 말하기 시험 준비 과정', level: '중급자용', duration: '3-4개월', emoji: '⚡' },
      ],
      '시사&역사': [
        { name: '앤타임즈 (N-Times)', description: '사회, 경제, 문화 전반에 걸친 다양한 주제의 토론 수업을 통한 시사 영어 학습', level: '중급자용', duration: '3-4개월', emoji: '📰' },
        { name: '케이히스토리 (K-History)', description: '한국사를 다양한 사건들과 인물들을 중심으로 재미있는 이야기로 풀어낸 과정', level: '중급자용', duration: '4-5개월', emoji: '🏛️' },
      ],
      '문법': [
        { name: '그래머앤 (Grammar N)', description: '패턴 형식으로 구성된 문장 속에서 자연스럽게 문법을 학습하도록 구성', level: '전 레벨', duration: '24-30주', emoji: '📖' },
        { name: '그래머포인츠 (Grammar Points)', description: '기초 문법에 대한 개념 정리 및 반복 연습을 통한 이해도 상승과 기본 문장 영작 실력 향상 과정', level: '초급자용', duration: '8-12주', emoji: '✏️' },
      ],
      '어휘': [
        { name: '앤보카 (NVoca)', description: '단계별 어휘 학습을 통한 어휘력 향상 과정', level: '전 레벨', duration: '9-18개월', emoji: '📚' },
      ],
      '여행영어': [
        { name: '펀펀트립 (FunFunTrip)', description: '여행지에서 바로 사용 가능한 실전 영어로 현지에서 상호교류 할 수 있는 영어 구사 과정', level: '초급자용', duration: '2-3개월', emoji: '✈️' },
      ],
      '프리미엄앤보임': [
        { name: '말하기 (Speaking)', description: '체계적인 단계별 스피킹 학습 프로그램으로 파닉스부터 고급 토론까지 완성', level: '초급자용', duration: '6개월', emoji: '🗣️' },
        { name: '읽기 (Reading)', description: '체계적인 독해 학습 프로그램으로 픽션과 논픽션을 통한 종합적 영어 실력 향상', level: '전 레벨', duration: '16개월', emoji: '📖' },
        { name: '문법 (Grammar)', description: '패턴 형식으로 구성된 문장 속에서 자연스럽게 문법을 학습하는 체계적 과정', level: '전 레벨', duration: '12개월', emoji: '📝' },
        { name: '교과과목 (Academic Subjects)', description: '다양한 교과목을 영어로 학습하며 학문적 영어 실력을 기르는 통합 과정', level: '중급자용', duration: '16개월', emoji: '🎓' },
        { name: '쓰기 (Writing)', description: '체계적인 단계별 쓰기 학습으로 문장부터 에세이까지 완성하는 종합 과정', level: '전 레벨', duration: '18개월', emoji: '✍️' },
      ]
    };

    const categories = Object.keys(curriculumData);
    const availableCourses = selectedCategory ? curriculumData[selectedCategory as keyof typeof curriculumData] : [];
    const selectedCourseData = availableCourses.find(course => course.name === selectedCourse);

    // 카테고리 선택시 과정 초기화
    const handleCategoryChange = (category: string) => {
      setSelectedCategory(category);
      setSelectedCourse('');
      setCustomName('');
      setCustomDescription('');
      setCustomLevel('1');
      setCustomDuration('');
      setCourseNotes('');
    };

    // 과정 선택시 자동 채우기
    const handleCourseChange = (courseName: string) => {
      setSelectedCourse(courseName);
      const course = availableCourses.find(c => c.name === courseName);
      if (course) {
        setCustomName(course.name);
        setCustomDescription(course.description);
        setCustomLevel(course.level);
        setCustomDuration(course.duration);
      }
    };

    const handleSubmit = () => {
      if (!customName || !customDescription) {
        alert('과정명과 설명을 입력해주세요.');
        return;
      }

      const newCourse = {
        name: customName,
        description: customDescription,
        level: customLevel,
        duration: customDuration,
        topics: selectedCourseData ? [selectedCategory] : [],
        notes: courseNotes // 플래너 메모 추가
      };

      handleAddCourse(newCourse);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className="text-xl font-bold text-gray-900 mb-4">수강 과정 추가</h3>
          <div className="space-y-4">
            {/* 카테고리 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">카테고리 선택</label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">카테고리를 선택하세요</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* 과정 선택 */}
            {selectedCategory && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">과정 선택</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => handleCourseChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">과정을 선택하세요</option>
                  {availableCourses.map((course) => (
                    <option key={course.name} value={course.name}>
                      {course.emoji} {course.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 과정명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">과정명</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: Business English Conversation"
              />
            </div>

            {/* 설명 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">설명</label>
              <textarea
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="과정에 대한 간단한 설명"
              />
            </div>

            {/* 레벨 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">레벨</label>
              <select
                value={customLevel}
                onChange={(e) => setCustomLevel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="1">1</option>
                <option value="1-2">1-2</option>
                <option value="2">2</option>
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
                <option value="7">7</option>
                <option value="8">8</option>
                <option value="초급">초급</option>
                <option value="중급">중급</option>
                <option value="고급">고급</option>
                <option value="전체">전체</option>
              </select>
            </div>

            {/* 기간 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">기간</label>
              <input
                type="text"
                value={customDuration}
                onChange={(e) => setCustomDuration(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="예: 3개월"
              />
            </div>

            {/* 플래너 메모 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">플래너 메모</label>
              <textarea
                value={courseNotes}
                onChange={(e) => setCourseNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="학생의 특이점, 학습 상황, 목표 등을 기록하세요..."
              />
              <p className="text-xs text-gray-500 mt-1">
                * 수강 과정에 대한 특별한 사항이나 학습 목표를 자유롭게 기록할 수 있습니다.
              </p>
            </div>

            {/* 선택된 과정 정보 미리보기 */}
            {selectedCourseData && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{selectedCourseData.emoji}</span>
                  <h4 className="font-medium text-gray-900">{selectedCourseData.name}</h4>
                </div>
                <p className="text-sm text-gray-600 mb-2">{selectedCourseData.description}</p>
                <div className="flex gap-4 text-xs text-gray-500">
                  <span>레벨: {selectedCourseData.level}</span>
                  <span>기간: {selectedCourseData.duration}</span>
                </div>
              </div>
            )}
          </div>

          {/* 버튼 */}
          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setShowAddCourse(false)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              추가
            </button>
          </div>
        </div>
      </div>
    );
  }
}