'use client'

import { useState } from 'react'
import { X, Calendar, Clock, Users, Send } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface CreateScheduledHomeworkModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateScheduledHomeworkModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: CreateScheduledHomeworkModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    estimatedTimeMinutes: '',
    dueDate: '',
    scheduledFor: '', // 언제 자동 배정될지
    targetStudents: [] as { id: string; name: string }[]
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    
    try {
      // 예약 숙제 생성 API 호출
      const response = await fetch('/api/scheduled-homework', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          instructions: formData.instructions,
          estimated_time_minutes: formData.estimatedTimeMinutes ? parseInt(formData.estimatedTimeMinutes) : null,
          due_date: formData.dueDate ? new Date(formData.dueDate).toISOString() : null,
          scheduled_for: new Date(formData.scheduledFor).toISOString(),
          target_students: formData.targetStudents
        }),
      })

      if (!response.ok) {
        throw new Error('예약 숙제 생성에 실패했습니다')
      }

      // 성공 처리
      setFormData({
        title: '',
        description: '',
        instructions: '',
        estimatedTimeMinutes: '',
        dueDate: '',
        scheduledFor: '',
        targetStudents: []
      })
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating scheduled homework:', error)
      alert('예약 숙제 생성 중 오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addStudent = (student: { id: string; name: string }) => {
    if (!formData.targetStudents.find(s => s.id === student.id)) {
      setFormData(prev => ({
        ...prev,
        targetStudents: [...prev.targetStudents, student]
      }))
    }
  }

  const removeStudent = (studentId: string) => {
    setFormData(prev => ({
      ...prev,
      targetStudents: prev.targetStudents.filter(s => s.id !== studentId)
    }))
  }

  if (!isOpen) return null

  // 현재 시간보다 미래의 시간만 설정 가능하도록
  const minDateTime = new Date()
  minDateTime.setMinutes(minDateTime.getMinutes() + 30) // 최소 30분 후
  const minDateTimeString = minDateTime.toISOString().slice(0, 16)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">예약 숙제 생성</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              숙제 제목 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="숙제 제목을 입력하세요"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              숙제 설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="숙제에 대한 간단한 설명을 입력하세요"
            />
          </div>

          {/* 과제 지시사항 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              과제 지시사항
            </label>
            <textarea
              value={formData.instructions}
              onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="학생들이 수행해야 할 구체적인 지시사항을 입력하세요"
            />
          </div>

          {/* 예상 소요 시간과 마감일 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="h-4 w-4 inline mr-1" />
                예상 소요 시간 (분)
              </label>
              <input
                type="number"
                value={formData.estimatedTimeMinutes}
                onChange={(e) => setFormData(prev => ({ ...prev, estimatedTimeMinutes: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="30"
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="h-4 w-4 inline mr-1" />
                마감일
              </label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* 예약 전송 시간 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Send className="h-4 w-4 inline mr-1" />
              예약 전송 시간 <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledFor}
              onChange={(e) => setFormData(prev => ({ ...prev, scheduledFor: e.target.value }))}
              min={minDateTimeString}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              숙제가 자동으로 학생들에게 배정될 시간을 설정하세요 (최소 30분 후)
            </p>
          </div>

          {/* 대상 학생 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="h-4 w-4 inline mr-1" />
              대상 학생 <span className="text-red-500">*</span>
            </label>
            
            {/* 선택된 학생들 */}
            {formData.targetStudents.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {formData.targetStudents.map((student) => (
                  <span
                    key={student.id}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-indigo-100 text-indigo-800"
                  >
                    {student.name}
                    <button
                      type="button"
                      onClick={() => removeStudent(student.id)}
                      className="ml-2 text-indigo-600 hover:text-indigo-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            
            {/* 학생 추가 버튼 - 실제로는 학생 목록을 불러와서 선택할 수 있도록 구현 */}
            <div className="border border-gray-300 rounded-md p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-2">학생을 선택하세요:</p>
              <button
                type="button"
                onClick={() => addStudent({ id: 'demo-1', name: '김학생' })}
                className="mr-2 mb-2 px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                + 김학생
              </button>
              <button
                type="button"
                onClick={() => addStudent({ id: 'demo-2', name: '이학생' })}
                className="mr-2 mb-2 px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                + 이학생
              </button>
              <button
                type="button"
                onClick={() => addStudent({ id: 'demo-3', name: '박학생' })}
                className="mr-2 mb-2 px-3 py-1 bg-white border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                + 박학생
              </button>
            </div>
            
            {formData.targetStudents.length === 0 && (
              <p className="text-sm text-red-500 mt-1">
                최소 한 명의 학생을 선택해야 합니다
              </p>
            )}
          </div>

          {/* 예약 정보 요약 */}
          {formData.scheduledFor && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-900 mb-2">예약 정보</h4>
              <p className="text-sm text-blue-700">
                📅 전송 예정: {format(new Date(formData.scheduledFor), 'yyyy년 MM월 dd일 HH:mm', { locale: ko })}
              </p>
              {formData.targetStudents.length > 0 && (
                <p className="text-sm text-blue-700">
                  👥 대상: {formData.targetStudents.map(s => s.name).join(', ')} ({formData.targetStudents.length}명)
                </p>
              )}
            </div>
          )}

          {/* 버튼들 */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.title || !formData.scheduledFor || formData.targetStudents.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '생성 중...' : '예약 숙제 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}