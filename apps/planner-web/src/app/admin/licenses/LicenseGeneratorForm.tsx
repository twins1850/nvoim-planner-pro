'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Planner {
  id: string
  full_name: string | null
  email: string | null
  created_at: string
}

interface LicenseGeneratorFormProps {
  planners: Planner[]
}

export default function LicenseGeneratorForm({ planners }: LicenseGeneratorFormProps) {
  const router = useRouter()
  const [selectedPlannerId, setSelectedPlannerId] = useState('')
  const [durationDays, setDurationDays] = useState('30')
  const [maxStudents, setMaxStudents] = useState('15')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [generatedLicenseKey, setGeneratedLicenseKey] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setGeneratedLicenseKey('')

    // 입력값 검증
    if (!selectedPlannerId) {
      setError('플래너를 선택해주세요.')
      return
    }

    const days = parseInt(durationDays)
    const students = parseInt(maxStudents)

    if (isNaN(days) || days <= 0) {
      setError('기간은 0보다 큰 숫자를 입력해주세요.')
      return
    }

    if (isNaN(students) || students <= 0) {
      setError('최대 학생 수는 0보다 큰 숫자를 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/admin/licenses/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plannerId: selectedPlannerId,
          durationDays: days,
          maxStudents: students,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '라이선스 발급 중 오류가 발생했습니다.')
        return
      }

      // 선택된 플래너 정보 가져오기
      const selectedPlanner = planners.find(p => p.id === selectedPlannerId)
      const plannerName = selectedPlanner?.full_name || selectedPlanner?.email || '플래너'

      setSuccess(
        `라이선스가 성공적으로 발급되었습니다! (플래너: ${plannerName})`
      )
      setGeneratedLicenseKey(data.license.license_key)

      // 폼 초기화
      setSelectedPlannerId('')
      setDurationDays('30')
      setMaxStudents('15')

      // 페이지 새로고침하여 최신 라이선스 목록 표시
      setTimeout(() => {
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError('라이선스 발급 중 오류가 발생했습니다: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* 플래너 선택 */}
      <div>
        <label htmlFor="planner" className="block text-sm font-medium text-gray-700 mb-2">
          플래너 선택 *
        </label>
        <select
          id="planner"
          value={selectedPlannerId}
          onChange={(e) => setSelectedPlannerId(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isSubmitting}
        >
          <option value="">플래너를 선택해주세요</option>
          {planners.map((planner) => (
            <option key={planner.id} value={planner.id}>
              {planner.full_name || planner.email || planner.id}
              {planner.email && ` (${planner.email})`}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* 기간 입력 */}
        <div>
          <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
            사용 기간 (일) *
          </label>
          <input
            type="number"
            id="duration"
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            기본값: 30일 (1개월), 일반적으로 30일 또는 365일 사용
          </p>
        </div>

        {/* 최대 학생 수 입력 */}
        <div>
          <label htmlFor="maxStudents" className="block text-sm font-medium text-gray-700 mb-2">
            최대 학생 수 *
          </label>
          <input
            type="number"
            id="maxStudents"
            value={maxStudents}
            onChange={(e) => setMaxStudents(e.target.value)}
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={isSubmitting}
          />
          <p className="mt-1 text-xs text-gray-500">
            기본값: 15명, 일반적으로 10~100명 범위
          </p>
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* 성공 메시지 */}
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">{success}</p>
          {generatedLicenseKey && (
            <div className="mt-3">
              <p className="text-sm font-medium text-green-900 mb-1">발급된 라이선스 키:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 bg-white border border-green-300 rounded font-mono text-sm">
                  {generatedLicenseKey}
                </code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLicenseKey)
                    alert('라이선스 키가 클립보드에 복사되었습니다!')
                  }}
                  className="px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  복사
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 발급 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? '발급 중...' : '라이선스 발급'}
      </button>

      {/* 가격 정보 안내 */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 라이선스 가격 안내</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 기본 요금: 50,000원 (10명 학생, 30일)</li>
          <li>• 추가 학생: 1명당 5,000원</li>
          <li>• 예시: 15명 학생, 30일 = 50,000원 + (5명 × 5,000원) = 75,000원</li>
        </ul>
      </div>
    </form>
  )
}
