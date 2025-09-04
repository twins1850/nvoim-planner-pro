'use client'

import { User } from '@supabase/supabase-js'
import MainLayout from '@/components/layout/MainLayout'
import { 
  TrendingUp,
  Users,
  BookOpen,
  CheckCircle,
  Clock,
  Calendar,
  Award,
  BarChart3
} from 'lucide-react'

interface AnalyticsContentProps {
  user: User
  profile: any
  studentsStats: any[]
  lessonsStats: any[]
  homeworkStats: any[]
}

export default function AnalyticsContent({ 
  user, 
  profile, 
  studentsStats, 
  lessonsStats, 
  homeworkStats 
}: AnalyticsContentProps) {
  
  // 통계 계산
  const totalStudents = studentsStats.length
  const totalLessons = lessonsStats.length
  const completedLessons = lessonsStats.filter(l => l.status === 'completed').length
  const totalHomework = homeworkStats.length
  const completedHomework = homeworkStats.filter(h => 
    h.homework_submissions?.some((s: any) => s.status === 'completed')
  ).length
  
  const lessonCompletionRate = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0
  const homeworkCompletionRate = totalHomework > 0 ? Math.round((completedHomework / totalHomework) * 100) : 0

  // 월별 학생 등록 데이터
  const getMonthlyStudentData = () => {
    const monthlyData = new Array(12).fill(0)
    studentsStats.forEach(student => {
      const month = new Date(student.created_at).getMonth()
      monthlyData[month]++
    })
    return monthlyData
  }

  const monthlyStudentData = getMonthlyStudentData()
  const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

  return (
    <MainLayout user={user} profile={profile}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">진도 분석</h1>
          <p className="mt-1 text-sm text-gray-600">
            학생들의 학습 진도와 성과를 분석하세요.
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-100 rounded-md flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">전체 학생</p>
                <p className="text-2xl font-bold text-gray-900">{totalStudents}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-green-100 rounded-md flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">수업 완료율</p>
                <p className="text-2xl font-bold text-gray-900">{lessonCompletionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-yellow-100 rounded-md flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-yellow-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">숙제 완료율</p>
                <p className="text-2xl font-bold text-gray-900">{homeworkCompletionRate}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-purple-100 rounded-md flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">평균 점수</p>
                <p className="text-2xl font-bold text-gray-900">85점</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Student Registration */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">월별 학생 등록 현황</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {months.map((month, index) => (
                  <div key={month} className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{month}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-indigo-600 h-2 rounded-full" 
                          style={{ width: `${Math.min((monthlyStudentData[index] / Math.max(...monthlyStudentData, 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-medium text-gray-900 w-6">{monthlyStudentData[index]}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Performance Summary */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">성과 요약</h3>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">수업 참여도</span>
                    <span className="text-sm text-gray-900">{lessonCompletionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: `${lessonCompletionRate}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">숙제 제출률</span>
                    <span className="text-sm text-gray-900">{homeworkCompletionRate}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${homeworkCompletionRate}%` }}></div>
                  </div>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">만족도</span>
                    <span className="text-sm text-gray-900">92%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="text-sm font-medium text-gray-900 mb-3">주요 성과</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">평균 수업 시간</span>
                    <span className="font-medium text-gray-900">60분</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">월 평균 수업</span>
                    <span className="font-medium text-gray-900">12회</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">학생 유지율</span>
                    <span className="font-medium text-gray-900">95%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}