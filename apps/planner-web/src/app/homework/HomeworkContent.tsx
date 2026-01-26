'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import CreateHomeworkModal from '@/components/homework/CreateHomeworkModal'
import { 
  Plus, 
  Search, 
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Eye,
  Edit,
  Trash2,
  ClipboardList
} from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface HomeworkContentProps {
  user: User
  profile: any
  homework: any[]
  stats: {
    total: number
    pending: number
    completed: number
  }
}

export default function HomeworkContent({ user, profile, homework, stats }: HomeworkContentProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100'
      case 'submitted': return 'text-blue-600 bg-blue-100'
      case 'reviewed': return 'text-purple-600 bg-purple-100'
      case 'completed': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'submitted': return <AlertCircle className="h-4 w-4" />
      case 'reviewed': return <Eye className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      default: return <XCircle className="h-4 w-4" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기 중'
      case 'submitted': return '제출됨'
      case 'reviewed': return '검토됨'
      case 'completed': return '완료'
      default: return '알 수 없음'
    }
  }

  return (
    <>
      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">숙제 관리</h1>
            <p className="mt-1 text-sm text-gray-600">
              학생들의 숙제를 생성하고 관리하세요.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <a
              href="/homework/scheduled"
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-sm font-medium rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Calendar className="h-4 w-4 mr-2" />
              예약 숙제
            </a>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              <Plus className="h-4 w-4 mr-2" />
              숙제 생성
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <ClipboardList className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">전체 숙제</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">미제출</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <CheckCircle className="h-6 w-6 text-white" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-gray-500">완료</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.completed}</p>
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
            <option value="pending">대기 중</option>
            <option value="submitted">제출됨</option>
            <option value="reviewed">검토됨</option>
            <option value="completed">완료</option>
          </select>
        </div>

        {/* Homework List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">숙제 목록</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {homework.map((hw) => (
              <div key={hw.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center mb-2">
                      <h4 className="text-lg font-medium text-gray-900 truncate">
                        {hw.title}
                      </h4>
                      {hw.lessons?.classes && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {hw.lessons.classes.name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {hw.description}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        마감: {hw.due_date ? format(new Date(hw.due_date), 'MM월 dd일 HH:mm', { locale: ko }) : '미설정'}
                      </div>
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        예상 시간: {hw.estimated_time_minutes || 0}분
                      </div>
                      <div className="flex items-center">
                        <Users className="h-4 w-4 mr-1" />
                        배정: {hw.homework_assignments?.length || 0}명
                      </div>
                    </div>

                    {/* Assignment Status Summary */}
                    {hw.homework_assignments && hw.homework_assignments.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {['pending', 'submitted', 'reviewed', 'completed'].map((status) => {
                          const count = hw.homework_assignments.filter((a: any) => a.status === status).length
                          if (count === 0) return null
                          
                          return (
                            <span
                              key={status}
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}
                            >
                              {getStatusIcon(status)}
                              <span className="ml-1">{getStatusText(status)} {count}</span>
                            </span>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      <Eye className="h-4 w-4 mr-1" />
                      보기
                    </button>
                    <button className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                      <Edit className="h-4 w-4 mr-1" />
                      편집
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {homework.length === 0 && (
            <div className="text-center py-12">
              <ClipboardList className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                생성된 숙제가 없습니다
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                첫 번째 숙제를 생성해보세요!
              </p>
              <div className="mt-6">
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700">
                  <Plus className="h-4 w-4 mr-2" />
                  숙제 생성
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 숙제 생성 모달 */}
      <CreateHomeworkModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          // 성공 시 숙제 목록 새로고침
          window.location.reload();
        }}
      />
    </>
  )
}