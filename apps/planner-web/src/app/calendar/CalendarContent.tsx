'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import MainLayout from '@/components/layout/MainLayout'
import { 
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  Users,
  MapPin
} from 'lucide-react'

interface CalendarContentProps {
  user: User
  profile: any
  lessons: any[]
}

export default function CalendarContent({ user, profile, lessons }: CalendarContentProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showAddModal, setShowAddModal] = useState(false)

  const today = new Date()
  const currentMonth = currentDate.getMonth()
  const currentYear = currentDate.getFullYear()

  // 달력 생성 로직
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    
    const days = []
    
    // 이전 달의 빈 날들
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }
    
    // 현재 달의 날들
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }

  const getLessonsForDate = (date: Date | null) => {
    if (!date) return []
    return lessons.filter(lesson => {
      const lessonDate = new Date(lesson.scheduled_at)
      return lessonDate.toDateString() === date.toDateString()
    })
  }

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  const days = getDaysInMonth(currentDate)

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate)
    if (direction === 'prev') {
      newDate.setMonth(currentMonth - 1)
    } else {
      newDate.setMonth(currentMonth + 1)
    }
    setCurrentDate(newDate)
  }

  return (
    <MainLayout user={user} profile={profile}>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">일정 관리</h1>
            <p className="mt-1 text-sm text-gray-600">
              수업 일정과 이벤트를 관리하세요.
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            일정 추가
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              {/* Calendar Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <button
                  onClick={() => navigateMonth('prev')}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                
                <h2 className="text-lg font-semibold text-gray-900">
                  {currentYear}년 {monthNames[currentMonth]}
                </h2>
                
                <button
                  onClick={() => navigateMonth('next')}
                  className="p-2 text-gray-400 hover:text-gray-500"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="p-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNames.map((day) => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
                      {day}
                    </div>
                  ))}
                </div>
                
                {/* Calendar Days */}
                <div className="grid grid-cols-7 gap-1">
                  {days.map((day, index) => {
                    const dayLessons = getLessonsForDate(day)
                    const isToday = day && day.toDateString() === today.toDateString()
                    
                    return (
                      <div key={index} className="min-h-[100px] p-1">
                        {day && (
                          <div className={`w-full h-full border rounded-md p-2 ${
                            isToday ? 'bg-indigo-50 border-indigo-200' : 'border-gray-100 hover:bg-gray-50'
                          }`}>
                            <div className={`text-sm font-medium mb-1 ${
                              isToday ? 'text-indigo-600' : 'text-gray-900'
                            }`}>
                              {day.getDate()}
                            </div>
                            
                            {/* Lessons for this day */}
                            <div className="space-y-1">
                              {dayLessons.slice(0, 2).map((lesson, idx) => (
                                <div key={idx} className="text-xs bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded truncate">
                                  {lesson.title}
                                </div>
                              ))}
                              {dayLessons.length > 2 && (
                                <div className="text-xs text-gray-500">
                                  +{dayLessons.length - 2}개 더
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Today's Schedule */}
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">오늘의 일정</h3>
              </div>
              <div className="p-4">
                {lessons.filter(lesson => {
                  const lessonDate = new Date(lesson.scheduled_at)
                  return lessonDate.toDateString() === today.toDateString()
                }).length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="mx-auto h-8 w-8 text-gray-400" />
                    <p className="mt-2 text-sm text-gray-500">오늘 예정된 수업이 없습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {lessons.filter(lesson => {
                      const lessonDate = new Date(lesson.scheduled_at)
                      return lessonDate.toDateString() === today.toDateString()
                    }).map((lesson) => (
                      <div key={lesson.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-md">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-indigo-100 rounded-full flex items-center justify-center">
                            <Clock className="h-4 w-4 text-indigo-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-gray-900">{lesson.title}</h4>
                          <p className="text-sm text-gray-500">
                            {new Date(lesson.scheduled_at).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })} • {lesson.duration_minutes || 60}분
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow">
              <div className="p-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">이번 주 통계</h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">총 수업</span>
                  <span className="text-sm font-medium text-gray-900">{lessons.length}개</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">완료된 수업</span>
                  <span className="text-sm font-medium text-gray-900">
                    {lessons.filter(l => l.status === 'completed').length}개
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">예정된 수업</span>
                  <span className="text-sm font-medium text-gray-900">
                    {lessons.filter(l => l.status === 'scheduled').length}개
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}