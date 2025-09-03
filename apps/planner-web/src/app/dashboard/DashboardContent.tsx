'use client'

import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import MainLayout from '@/components/layout/MainLayout'
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  Calendar,
  Bell,
  TrendingUp,
  Clock
} from 'lucide-react'

interface DashboardContentProps {
  user: User
  profile: any
  plannerProfile: any
  studentCount: number
  todayLessons: any[]
  pendingHomeworkCount: number
}

export default function DashboardContent({
  user,
  profile,
  plannerProfile,
  studentCount,
  todayLessons,
  pendingHomeworkCount,
}: DashboardContentProps) {
  const router = useRouter()

  return (
    <MainLayout user={user} profile={profile}>
      <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900">
            안녕하세요, {profile?.full_name}님!
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            오늘도 열심히 학생들과 함께 성장하세요.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">전체 학생</p>
                <p className="text-2xl font-semibold text-gray-900">{studentCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">오늘의 수업</p>
                <p className="text-2xl font-semibold text-gray-900">{todayLessons.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">미완료 숙제</p>
                <p className="text-2xl font-semibold text-gray-900">{pendingHomeworkCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
                <Bell className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">새 알림</p>
                <p className="text-2xl font-semibold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Today's Lessons */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">오늘의 수업</h3>
            </div>
            <div className="px-6 py-4">
              {todayLessons.length > 0 ? (
                <ul className="space-y-3">
                  {todayLessons.map((lesson) => (
                    <li key={lesson.id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{lesson.title}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(lesson.scheduled_at).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <button className="text-sm text-indigo-600 hover:text-indigo-500">
                        상세보기
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">오늘 예정된 수업이 없습니다.</p>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">빠른 메뉴</h3>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => router.push('/students')}
                  className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Users className="h-8 w-8 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">학생 관리</span>
                </button>
                <button
                  onClick={() => router.push('/homework')}
                  className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ClipboardList className="h-8 w-8 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">숙제 관리</span>
                </button>
                <button
                  onClick={() => router.push('/lessons')}
                  className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <BookOpen className="h-8 w-8 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">수업 관리</span>
                </button>
                <button
                  onClick={() => router.push('/messages')}
                  className="flex flex-col items-center p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Bell className="h-8 w-8 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-gray-900">메시지</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}