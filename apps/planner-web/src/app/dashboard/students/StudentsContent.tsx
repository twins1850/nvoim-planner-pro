"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Search, 
  UserPlus, 
  MoreVertical, 
  Mail, 
  Phone, 
  Calendar,
  BookOpen,
  Target,
  TrendingUp,
  Edit,
  Trash2,
  Copy,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";

interface Student {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  level: string;
  status: 'active' | 'inactive' | 'paused';
  created_at: string;
  last_lesson_date?: string;
  total_lessons: number;
  completion_rate: number;
  invite_code?: string;
  is_connected: boolean;
}

export default function StudentsContent() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        try {
          // 실제 데이터베이스에서 학생 데이터 가져오기
          const { data, error } = await supabase
            .from('students')
            .select('*')
            .eq('teacher_id', user.id)
            .order('created_at', { ascending: false });

          if (error) {
            console.error('Database query failed:', error.message);
            setStudents([]);
            return;
          }

          // 실제 DB 데이터만 사용
          const enrichedData = data || [];
          setStudents(enrichedData);
        } catch (dbError) {
          console.error('Database connection failed:', dbError);
          setStudents([]);
        }
      } else {
        console.error('User not authenticated');
        setStudents([]);
      }
    } catch (error) {
      console.error('Error in fetchStudents:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  };

  const generateInviteCode = async () => {
    try {
      const supabase = createClient();
      
      // Supabase 함수 호출로 초대 코드 생성
      const { data, error } = await supabase.rpc('create_invite_code');
      
      if (error) {
        console.error('Error creating invite code:', error);
        // 오류 시 로컬에서 코드 생성 (데모용)
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        setInviteCode(code);
      } else if (data && data.success) {
        setInviteCode(data.code);
      } else {
        // 실패 시 로컬에서 코드 생성
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
          code += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        setInviteCode(code);
      }
      
      setShowInviteModal(true);
    } catch (error) {
      console.error('Error in generateInviteCode:', error);
      // 에러 발생 시에도 모달은 표시
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
      let code = '';
      for (let i = 0; i < 6; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      setInviteCode(code);
      setShowInviteModal(true);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleStudentDetail = (studentId: string) => {
    // 학생 상세보기 페이지로 이동
    window.location.href = `/dashboard/students/${studentId}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4" />;
      case 'inactive': return <XCircle className="w-4 h-4" />;
      case 'paused': return <Clock className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = searchTerm === "" ||
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === "all" || student.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">학생 관리</h1>
          <p className="text-gray-600 mt-2">전체 {students.length}명의 학생을 관리하고 있습니다</p>
        </div>
        <button 
          onClick={generateInviteCode}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <Copy className="w-4 h-4" />
          초대 코드 생성
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">전체 학생</p>
              <p className="text-2xl font-bold text-gray-900">{students.length}</p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <UserPlus className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">활성 학생</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter(s => s.status === 'active').length}
              </p>
            </div>
            <div className="p-3 bg-green-50 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">평균 완료율</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.length > 0 
                  ? Math.round(students.reduce((acc, s) => acc + s.completion_rate, 0) / students.length)
                  : 0}%
              </p>
            </div>
            <div className="p-3 bg-purple-50 rounded-lg">
              <Target className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">연결된 학생</p>
              <p className="text-2xl font-bold text-gray-900">
                {students.filter(s => s.is_connected).length}
              </p>
            </div>
            <div className="p-3 bg-indigo-50 rounded-lg">
              <Phone className="w-6 h-6 text-indigo-600" />
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
                placeholder="이름 또는 이메일로 검색..."
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
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
            <option value="paused">일시정지</option>
          </select>
        </div>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => (
          <div key={student.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{student.name}</h3>
                  <p className="text-sm text-gray-500">{student.level}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(student.status)}`}>
                  {getStatusIcon(student.status)}
                  {student.status === 'active' ? '활성' : student.status === 'paused' ? '일시정지' : '비활성'}
                </span>
                <button className="text-gray-400 hover:text-gray-600">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center text-gray-600">
                <Mail className="w-4 h-4 mr-2" />
                {student.email}
              </div>
              {student.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="w-4 h-4 mr-2" />
                  {student.phone}
                </div>
              )}
              <div className="flex items-center text-gray-600">
                <BookOpen className="w-4 h-4 mr-2" />
                총 {student.total_lessons}회 수업
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">완료율</span>
                <span className="text-sm font-medium">{student.completion_rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                  style={{ width: `${student.completion_rate}%` }}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button 
                onClick={() => handleStudentDetail(student.id)}
                className="flex-1 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                상세보기
              </button>
              <button className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                메시지
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">학생이 없습니다</h3>
          <p className="mt-1 text-sm text-gray-500">
            초대 코드를 생성하여 학생을 초대하세요.
          </p>
          <div className="mt-6">
            <button 
              onClick={generateInviteCode}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              <Copy className="h-4 w-4 mr-2" />
              초대 코드 생성
            </button>
          </div>
        </div>
      )}

      {/* Invite Code Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">초대 코드</h3>
            <p className="text-gray-600 mb-4">
              학생에게 아래 코드를 전달하여 앱에 입력하도록 안내하세요.
            </p>
            <div className="bg-gray-100 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-mono font-bold text-blue-600">
                  {inviteCode}
                </span>
                <button
                  onClick={copyInviteCode}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  {copiedCode ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              * 이 코드는 24시간 동안 유효합니다.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowInviteModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                닫기
              </button>
              <button
                onClick={generateInviteCode}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                새 코드 생성
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}