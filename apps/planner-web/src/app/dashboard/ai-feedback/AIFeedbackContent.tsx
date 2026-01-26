"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, Search, Filter, User, TrendingUp, AlertCircle, ChevronRight } from "lucide-react";

interface AIFeedback {
  id: string;
  submission_id: string;
  transcript: string;
  score: number;
  corrections: string[];
  better_expressions: string[];
  positive_feedback: string;
  areas_for_improvement: string;
  created_at: string;
  homework_submissions?: {
    id: string;
    homework_id: string;
    student_id: string;
    homework?: {
      title: string;
      description: string;
    };
    students?: {
      name: string;
      email: string;
      avatar_url?: string;
    };
  };
}

export default function AIFeedbackContent() {
  const [feedbacks, setFeedbacks] = useState<AIFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterScore, setFilterScore] = useState<number | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedFeedback, setSelectedFeedback] = useState<AIFeedback | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchFeedbacks();
    fetchStudents();
    subscribeToFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    try {
      // 먼저 피드백 데이터를 가져옴
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbackError) throw feedbackError;

      // 각 피드백에 대해 관련 데이터를 가져옴
      const feedbacksWithDetails = await Promise.all(
        (feedbackData || []).map(async (feedback) => {
          if (feedback.submission_id) {
            // homework_submissions 데이터 가져오기
            const { data: submission } = await supabase
              .from('homework_submissions')
              .select('id, homework_id, student_id')
              .eq('id', feedback.submission_id)
              .single();

            if (submission) {
              // 학생 정보 가져오기
              const { data: student } = await supabase
                .from('students')
                .select('name, email, avatar_url')
                .eq('id', submission.student_id)
                .single();

              // 숙제 정보 가져오기
              const { data: homework } = await supabase
                .from('homework')
                .select('title, description')
                .eq('id', submission.homework_id)
                .single();

              return {
                ...feedback,
                homework_submissions: {
                  ...submission,
                  students: student,
                  homework: homework
                }
              };
            }
          }
          return feedback;
        })
      );

      setFeedbacks(feedbacksWithDetails);

      // 위에서 이미 처리됨
    } catch (error) {
      console.error('Error fetching AI feedbacks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('students')
        .select('id, name, email')
        .eq('teacher_id', user.id);
      
      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const subscribeToFeedbacks = () => {
    const supabase = createClient();
    const subscription = supabase
      .channel('feedback_changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'feedback' },
        () => {
          fetchFeedbacks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  };

  const getScoreColor = (score: number) => {
    if (score >= 85) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreGrade = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Needs Improvement';
  };

  const filteredFeedbacks = feedbacks.filter(feedback => {
    const matchesSearch = searchTerm === "" || 
      feedback.transcript.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.homework_submissions?.students?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      feedback.homework_submissions?.homework?.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesScore = filterScore === null || feedback.score >= filterScore;
    
    const matchesStudent = selectedStudent === null || 
      feedback.homework_submissions?.student_id === selectedStudent;
    
    return matchesSearch && matchesScore && matchesStudent;
  });

  const averageScore = feedbacks.length > 0
    ? Math.round(feedbacks.reduce((sum, f) => sum + f.score, 0) / feedbacks.length)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">AI 피드백 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI 피드백 관리</h1>
          <p className="text-gray-600 mt-2">학생들의 발음 평가와 AI 피드백을 관리합니다</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4 inline mr-2" />
            필터
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            리포트 생성
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 피드백</p>
              <p className="text-2xl font-bold text-gray-900">{feedbacks.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">평균 점수</p>
              <p className="text-2xl font-bold text-gray-900">{averageScore}점</p>
            </div>
            <div className={`p-3 rounded-lg ${averageScore >= 70 ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <TrendingUp className={`w-6 h-6 ${averageScore >= 70 ? 'text-green-600' : 'text-yellow-600'}`} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">오늘의 피드백</p>
              <p className="text-2xl font-bold text-gray-900">
                {feedbacks.filter(f => 
                  new Date(f.created_at).toDateString() === new Date().toDateString()
                ).length}
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">개선 필요</p>
              <p className="text-2xl font-bold text-gray-900">
                {feedbacks.filter(f => f.score < 70).length}
              </p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="학생 이름, 숙제 제목, 또는 내용으로 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={selectedStudent || ""}
            onChange={(e) => setSelectedStudent(e.target.value || null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 학생</option>
            {students.map(student => (
              <option key={student.id} value={student.id}>
                {student.name}
              </option>
            ))}
          </select>
          <select
            value={filterScore || ""}
            onChange={(e) => setFilterScore(e.target.value ? Number(e.target.value) : null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 점수</option>
            <option value="90">90점 이상</option>
            <option value="80">80점 이상</option>
            <option value="70">70점 이상</option>
            <option value="60">60점 이상</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold">AI 피드백 목록</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {filteredFeedbacks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              조건에 맞는 AI 피드백이 없습니다.
            </div>
          ) : (
            filteredFeedbacks.map((feedback) => (
              <div
                key={feedback.id}
                onClick={() => setSelectedFeedback(feedback)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {feedback.homework_submissions?.students?.name || '알 수 없는 학생'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">•</span>
                      <span className="text-sm text-gray-600">
                        {feedback.homework_submissions?.homework?.title || '숙제 정보 없음'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                      "{feedback.transcript}"
                    </p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={`px-2 py-1 rounded-full font-medium ${getScoreColor(feedback.score)}`}>
                        {feedback.score}점 - {getScoreGrade(feedback.score)}
                      </span>
                      <div className="flex items-center text-gray-500">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(feedback.created_at).toLocaleDateString('ko-KR', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 mt-1" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Selected Feedback Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-bold text-gray-900">AI 피드백 상세</h3>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-gray-600">
                      {selectedFeedback.homework_submissions?.students?.name}
                    </span>
                    <span className="text-sm text-gray-500">•</span>
                    <span className="text-gray-600">
                      {selectedFeedback.homework_submissions?.homework?.title}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Score */}
              <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-lg ${getScoreColor(selectedFeedback.score)}`}>
                  <span className="text-2xl font-bold">{selectedFeedback.score}점</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{getScoreGrade(selectedFeedback.score)}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(selectedFeedback.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Transcript */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">학생의 발화</h4>
                <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <p className="text-gray-800">"{selectedFeedback.transcript}"</p>
                </div>
              </div>

              {/* Positive Feedback */}
              {selectedFeedback.positive_feedback && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">잘한 점</h4>
                  <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded">
                    <p className="text-gray-800">{selectedFeedback.positive_feedback}</p>
                  </div>
                </div>
              )}

              {/* Corrections */}
              {selectedFeedback.corrections && selectedFeedback.corrections.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">교정 사항</h4>
                  <ul className="space-y-2">
                    {selectedFeedback.corrections.map((correction, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-red-500 mr-2">•</span>
                        <span className="text-gray-700">{correction}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Better Expressions */}
              {selectedFeedback.better_expressions && selectedFeedback.better_expressions.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">더 나은 표현</h4>
                  <div className="space-y-2">
                    {selectedFeedback.better_expressions.map((expression, index) => (
                      <div key={index} className="p-3 bg-blue-50 rounded-lg">
                        <span className="text-gray-700">{expression}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Areas for Improvement */}
              {selectedFeedback.areas_for_improvement && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">개선 영역</h4>
                  <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p className="text-gray-800">{selectedFeedback.areas_for_improvement}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200">
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  닫기
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  학생에게 추가 피드백 전송
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}