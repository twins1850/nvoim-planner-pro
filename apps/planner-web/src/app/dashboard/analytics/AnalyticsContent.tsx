"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  TrendingUp,
  TrendingDown,
  Users,
  BookOpen,
  Clock,
  Target,
  Award,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw,
  Eye,
  Star,
  MessageSquare,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface StudentAnalytics {
  id: string;
  name: string;
  level: string;
  total_lessons: number;
  completed_lessons: number;
  total_homework: number;
  submitted_homework: number;
  avg_score: number;
  improvement_rate: number;
  last_activity: string;
  status: 'excellent' | 'good' | 'needs_improvement' | 'at_risk';
  strengths: string[];
  weaknesses: string[];
}

interface OverviewStats {
  total_students: number;
  active_students: number;
  total_lessons_this_month: number;
  avg_completion_rate: number;
  total_homework_assigned: number;
  homework_completion_rate: number;
  avg_student_score: number;
  improvement_trend: number;
}

interface LessonAnalytics {
  month: string;
  lessons_completed: number;
  homework_submitted: number;
  avg_score: number;
}

interface SubjectPerformance {
  subject: string;
  avg_score: number;
  student_count: number;
  improvement: number;
}

export default function AnalyticsContent() {
  const [students, setStudents] = useState<StudentAnalytics[]>([]);
  const [overviewStats, setOverviewStats] = useState<OverviewStats | null>(null);
  const [lessonAnalytics, setLessonAnalytics] = useState<LessonAnalytics[]>([]);
  const [subjectPerformance, setSubjectPerformance] = useState<SubjectPerformance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedStudent, setSelectedStudent] = useState<string>('all');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [selectedPeriod, selectedStudent]);

  const fetchAnalytics = async () => {
    setRefreshing(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 더미 분석 데이터 (실제로는 DB에서 복잡한 쿼리로 계산)
      const dummyOverviewStats: OverviewStats = {
        total_students: 24,
        active_students: 22,
        total_lessons_this_month: 156,
        avg_completion_rate: 87.5,
        total_homework_assigned: 89,
        homework_completion_rate: 92.1,
        avg_student_score: 78.4,
        improvement_trend: 12.3
      };

      const dummyStudents: StudentAnalytics[] = [
        {
          id: '1',
          name: '김영희',
          level: 'Intermediate',
          total_lessons: 24,
          completed_lessons: 22,
          total_homework: 18,
          submitted_homework: 17,
          avg_score: 85.2,
          improvement_rate: 15.8,
          last_activity: '2026-01-05T10:30:00Z',
          status: 'excellent',
          strengths: ['발음', '어휘', '문법'],
          weaknesses: ['듣기']
        },
        {
          id: '2',
          name: '박민수',
          level: 'Beginner',
          total_lessons: 20,
          completed_lessons: 18,
          total_homework: 16,
          submitted_homework: 14,
          avg_score: 72.8,
          improvement_rate: 8.9,
          last_activity: '2026-01-04T16:45:00Z',
          status: 'good',
          strengths: ['문법', '어휘'],
          weaknesses: ['발음', '회화']
        },
        {
          id: '3',
          name: '이지은',
          level: 'Advanced',
          total_lessons: 28,
          completed_lessons: 26,
          total_homework: 22,
          submitted_homework: 21,
          avg_score: 91.7,
          improvement_rate: 7.2,
          last_activity: '2026-01-05T14:20:00Z',
          status: 'excellent',
          strengths: ['문법', '독해', '회화'],
          weaknesses: ['어휘']
        },
        {
          id: '4',
          name: '최성민',
          level: 'Intermediate',
          total_lessons: 18,
          completed_lessons: 14,
          total_homework: 15,
          submitted_homework: 10,
          avg_score: 63.4,
          improvement_rate: -2.1,
          last_activity: '2026-01-02T09:15:00Z',
          status: 'needs_improvement',
          strengths: ['듣기'],
          weaknesses: ['문법', '어휘', '회화']
        },
        {
          id: '5',
          name: '정수아',
          level: 'Beginner',
          total_lessons: 12,
          completed_lessons: 8,
          total_homework: 10,
          submitted_homework: 5,
          avg_score: 45.6,
          improvement_rate: -8.5,
          last_activity: '2025-12-28T11:30:00Z',
          status: 'at_risk',
          strengths: [],
          weaknesses: ['문법', '어휘', '발음', '회화']
        }
      ];

      const dummyLessonAnalytics: LessonAnalytics[] = [
        { month: '2025-08', lessons_completed: 98, homework_submitted: 76, avg_score: 74.2 },
        { month: '2025-09', lessons_completed: 112, homework_submitted: 89, avg_score: 76.8 },
        { month: '2025-10', lessons_completed: 134, homework_submitted: 102, avg_score: 78.1 },
        { month: '2025-11', lessons_completed: 145, homework_submitted: 118, avg_score: 79.5 },
        { month: '2025-12', lessons_completed: 156, homework_submitted: 125, avg_score: 80.2 },
        { month: '2026-01', lessons_completed: 42, homework_submitted: 38, avg_score: 81.7 }
      ];

      const dummySubjectPerformance: SubjectPerformance[] = [
        { subject: '문법', avg_score: 82.4, student_count: 24, improvement: 8.7 },
        { subject: '어휘', avg_score: 79.1, student_count: 24, improvement: 12.3 },
        { subject: '발음', avg_score: 75.8, student_count: 22, improvement: 15.2 },
        { subject: '회화', avg_score: 73.2, student_count: 20, improvement: 9.8 },
        { subject: '듣기', avg_score: 77.9, student_count: 24, improvement: 6.4 },
        { subject: '독해', avg_score: 81.6, student_count: 18, improvement: 11.1 }
      ];

      setOverviewStats(dummyOverviewStats);
      setStudents(dummyStudents);
      setLessonAnalytics(dummyLessonAnalytics);
      setSubjectPerformance(dummySubjectPerformance);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusColor = (status: StudentAnalytics['status']) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'needs_improvement': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'at_risk': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: StudentAnalytics['status']) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="w-4 h-4" />;
      case 'good': return <CheckCircle className="w-4 h-4" />;
      case 'needs_improvement': return <AlertCircle className="w-4 h-4" />;
      case 'at_risk': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getStatusText = (status: StudentAnalytics['status']) => {
    switch (status) {
      case 'excellent': return '우수';
      case 'good': return '양호';
      case 'needs_improvement': return '개선필요';
      case 'at_risk': return '주의필요';
      default: return '알 수 없음';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const exportReport = () => {
    console.log('Exporting analytics report...');
    // 실제로는 PDF나 Excel 파일 생성
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">분석 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const filteredStudents = selectedStudent === 'all' 
    ? students 
    : students.filter(student => student.id === selectedStudent);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">진도 분석</h1>
          <p className="text-gray-600 mt-2">학생들의 학습 진도와 성과를 분석하고 관리하세요</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={fetchAnalytics}
            disabled={refreshing}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            새로고침
          </button>
          <button 
            onClick={exportReport}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            보고서 내보내기
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">최근 1주</option>
              <option value="month">최근 1개월</option>
              <option value="quarter">최근 3개월</option>
              <option value="year">최근 1년</option>
            </select>
          </div>
          
          <select
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">모든 학생</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>{student.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Stats */}
      {overviewStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">총 학생 수</p>
                <p className="text-2xl font-bold text-gray-900">{overviewStats.total_students}</p>
                <p className="text-sm text-green-600">활성 {overviewStats.active_students}명</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">이번 달 수업</p>
                <p className="text-2xl font-bold text-gray-900">{overviewStats.total_lessons_this_month}</p>
                <p className="text-sm text-gray-600">평균 {overviewStats.avg_completion_rate}% 완료</p>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <BookOpen className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">숙제 완료율</p>
                <p className="text-2xl font-bold text-gray-900">{overviewStats.homework_completion_rate}%</p>
                <p className="text-sm text-gray-600">{overviewStats.total_homework_assigned}개 배정</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">평균 점수</p>
                <p className="text-2xl font-bold text-gray-900">{overviewStats.avg_student_score}</p>
                <div className="flex items-center gap-1">
                  {overviewStats.improvement_trend >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-600" />
                  )}
                  <p className={`text-sm ${overviewStats.improvement_trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {overviewStats.improvement_trend >= 0 ? '+' : ''}{overviewStats.improvement_trend}%
                  </p>
                </div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lesson Progress Chart */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">월별 학습 진도</h3>
            <LineChart className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {lessonAnalytics.slice(-4).map((data, index) => (
              <div key={data.month} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">
                  {new Date(data.month + '-01').toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                </span>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">수업 {data.lessons_completed}회</p>
                    <p className="text-xs text-gray-500">평균 {data.avg_score}점</p>
                  </div>
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(data.lessons_completed / 180) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Performance */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">과목별 성과</h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {subjectPerformance.map((subject) => (
              <div key={subject.subject} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{subject.subject}</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{subject.avg_score}점</span>
                  <div className="flex items-center gap-1">
                    {subject.improvement >= 0 ? (
                      <TrendingUp className="w-3 h-3 text-green-600" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-600" />
                    )}
                    <span className={`text-xs ${subject.improvement >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {subject.improvement >= 0 ? '+' : ''}{subject.improvement}%
                    </span>
                  </div>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(subject.avg_score / 100) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Student Performance Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">학생별 상세 분석</h3>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-500">{filteredStudents.length}명</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">학생</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">레벨</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">수업 진도</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">숙제 완료</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">평균 점수</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">개선도</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">상태</th>
                <th className="text-left py-3 px-4 font-medium text-gray-900">마지막 활동</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {student.name.charAt(0)}
                      </div>
                      <span className="font-medium text-gray-900">{student.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-gray-600">{student.level}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{student.completed_lessons}/{student.total_lessons}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${(student.completed_lessons / student.total_lessons) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-900">{student.submitted_homework}/{student.total_homework}</span>
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${(student.submitted_homework / student.total_homework) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="font-medium text-gray-900">{student.avg_score}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1">
                      {student.improvement_rate >= 0 ? (
                        <TrendingUp className="w-4 h-4 text-green-600" />
                      ) : (
                        <TrendingDown className="w-4 h-4 text-red-600" />
                      )}
                      <span className={`text-sm font-medium ${student.improvement_rate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {student.improvement_rate >= 0 ? '+' : ''}{student.improvement_rate}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(student.status)}`}>
                      {getStatusIcon(student.status)}
                      {getStatusText(student.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-gray-600">
                    {formatDate(student.last_activity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Student Analysis */}
      {selectedStudent !== 'all' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {students.find(s => s.id === selectedStudent)?.name} 상세 분석
          </h3>
          
          {(() => {
            const student = students.find(s => s.id === selectedStudent);
            if (!student) return null;
            
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">강점</h4>
                  <div className="space-y-2">
                    {student.strengths.length > 0 ? (
                      student.strengths.map((strength, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Star className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm text-gray-700">{strength}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">강점 분석 데이터가 부족합니다.</p>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 mb-3">개선 필요 영역</h4>
                  <div className="space-y-2">
                    {student.weaknesses.length > 0 ? (
                      student.weaknesses.map((weakness, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-orange-500" />
                          <span className="text-sm text-gray-700">{weakness}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">개선이 필요한 영역이 없습니다.</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}