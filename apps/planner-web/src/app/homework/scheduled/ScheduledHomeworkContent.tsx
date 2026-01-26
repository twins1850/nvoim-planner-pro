'use client'

import { useState, useEffect } from 'react'
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  Users,
  Send,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Timer
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import CreateScheduledHomeworkModal from '@/components/homework/CreateScheduledHomeworkModal'

interface ScheduledHomework {
  id: string
  title: string
  description: string
  instructions: string
  estimated_time_minutes: number
  due_date: string | null
  scheduled_for: string
  status: 'scheduled' | 'sent' | 'cancelled'
  target_students: { id: string; name: string }[]
  created_at: string
  sent_at: string | null
}

export default function ScheduledHomeworkContent() {
  const [scheduledHomework, setScheduledHomework] = useState<ScheduledHomework[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // 예약 숙제 목록 불러오기
  const fetchScheduledHomework = async () => {
    try {
      const response = await fetch('/api/scheduled-homework')
      if (response.ok) {
        const data = await response.json()
        setScheduledHomework(data)
      }
    } catch (error) {
      console.error('Error fetching scheduled homework:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchScheduledHomework()
  }, [])

  // 상태별 색상 및 아이콘
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return {
          color: 'text-blue-600 bg-blue-100',
          icon: <Timer className="h-4 w-4" />,
          text: '예약됨'
        }
      case 'sent':
        return {
          color: 'text-green-600 bg-green-100',
          icon: <CheckCircle className="h-4 w-4" />,
          text: '전송됨'
        }
      case 'cancelled':
        return {
          color: 'text-red-600 bg-red-100',
          icon: <XCircle className="h-4 w-4" />,
          text: '취소됨'
        }
      default:
        return {
          color: 'text-gray-600 bg-gray-100',
          icon: <AlertTriangle className="h-4 w-4" />,
          text: '알 수 없음'
        }
    }
  }

  // 예약 취소
  const cancelScheduledHomework = async (id: string) => {
    if (!confirm('이 예약 숙제를 취소하시겠습니까?')) return

    try {
      const response = await fetch(`/api/scheduled-homework/${id}/cancel`, {
        method: 'PATCH'
      })
      if (response.ok) {
        fetchScheduledHomework()
      }
    } catch (error) {
      console.error('Error cancelling scheduled homework:', error)
      alert('예약 취소 중 오류가 발생했습니다')
    }
  }

  // 필터링된 숙제 목록
  const filteredHomework = scheduledHomework.filter(hw => {
    const matchesSearch = hw.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         hw.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || hw.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // 통계 계산
  const stats = {
    total: scheduledHomework.length,
    scheduled: scheduledHomework.filter(hw => hw.status === 'scheduled').length,
    sent: scheduledHomework.filter(hw => hw.status === 'sent').length,
    cancelled: scheduledHomework.filter(hw => hw.status === 'cancelled').length
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">예약 숙제 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            미래에 자동으로 배정될 숙제들을 관리하세요.
          </p>
        </div>
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
          <Plus className="h-4 w-4 mr-2" />
          예약 숙제 생성
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-gray-500 rounded-md p-3">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">전체</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
              <Timer className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">예약됨</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.scheduled}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">전송됨</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.sent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-red-500 rounded-md p-3">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5">
              <p className="text-sm font-medium text-gray-500">취소됨</p>
              <p className="text-2xl font-semibold text-gray-900">{stats.cancelled}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="숙제 제목으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-full sm:w-48 px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="all">모든 상태</option>
          <option value="scheduled">예약됨</option>
          <option value="sent">전송됨</option>
          <option value="cancelled">취소됨</option>
        </select>
      </div>

      {/* Homework List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">예약 숙제 목록</h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-600">로딩 중...</p>
          </div>
        ) : filteredHomework.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {searchTerm || statusFilter !== 'all' ? '검색 결과가 없습니다' : '예약된 숙제가 없습니다'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' ? '다른 검색어나 필터를 시도해보세요.' : '첫 번째 예약 숙제를 생성해보세요!'}
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <div className="mt-6">
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  예약 숙제 생성
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredHomework.map((hw) => {
              const statusConfig = getStatusConfig(hw.status)
              const isScheduled = hw.status === 'scheduled'
              const scheduledTime = new Date(hw.scheduled_for)
              const isOverdue = isScheduled && scheduledTime < new Date()

              return (
                <div key={hw.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center mb-2">
                        <h4 className="text-lg font-medium text-gray-900 truncate">
                          {hw.title}
                        </h4>
                        <span className={`ml-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          {statusConfig.icon}
                          <span className="ml-1">{statusConfig.text}</span>
                        </span>
                        {isOverdue && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-orange-600 bg-orange-100">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            지연됨
                          </span>
                        )}
                      </div>
                      
                      {hw.description && (
                        <p className="text-sm text-gray-600 mb-3">
                          {hw.description}
                        </p>
                      )}
                      
                      <div className="flex items-center space-x-6 text-sm text-gray-500">
                        <div className="flex items-center">
                          <Send className="h-4 w-4 mr-1" />
                          예약: {format(scheduledTime, 'MM월 dd일 HH:mm', { locale: ko })}
                        </div>
                        {hw.due_date && (
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            마감: {format(new Date(hw.due_date), 'MM월 dd일 HH:mm', { locale: ko })}
                          </div>
                        )}
                        {hw.estimated_time_minutes && (
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            예상: {hw.estimated_time_minutes}분
                          </div>
                        )}
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          대상: {hw.target_students.length}명
                        </div>
                      </div>

                      {/* 대상 학생 목록 */}
                      {hw.target_students.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {hw.target_students.slice(0, 5).map((student) => (
                            <span
                              key={student.id}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700"
                            >
                              {student.name}
                            </span>
                          ))}
                          {hw.target_students.length > 5 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                              +{hw.target_students.length - 5}명 더
                            </span>
                          )}
                        </div>
                      )}

                      {/* 전송 시간 (전송된 경우) */}
                      {hw.sent_at && (
                        <div className="mt-3 text-sm text-green-600">
                          ✓ {format(new Date(hw.sent_at), 'MM월 dd일 HH:mm', { locale: ko })}에 전송됨
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2">
                      <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                        <Eye className="h-4 w-4 mr-1" />
                        보기
                      </button>
                      {isScheduled && (
                        <>
                          <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                            <Edit className="h-4 w-4 mr-1" />
                            편집
                          </button>
                          <button 
                            onClick={() => cancelScheduledHomework(hw.id)}
                            className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50">
                            <Trash2 className="h-4 w-4 mr-1" />
                            취소
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 예약 숙제 생성 모달 */}
      <CreateScheduledHomeworkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchScheduledHomework()
        }}
      />
    </div>
  )
}