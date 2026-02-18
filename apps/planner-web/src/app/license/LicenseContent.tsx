'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { parseLicenseKey } from '@/lib/licenseUtils'

interface License {
  id: string
  planner_id: string
  license_key: string
  duration_days: number
  max_students: number
  activated_at: string | null
  expires_at: string | null
  remaining_days: number | null
  status: 'pending' | 'active' | 'expired'
  created_at: string
  updated_at: string
}

interface LicenseContentProps {
  activeLicense: License | null
  activeLicenseCount: number
  totalMaxStudents: number
  allLicenses: License[]
  currentStudentCount: number
  userId: string
  hasPlannerProfile: boolean
}

function LicenseContentInner({
  activeLicense,
  activeLicenseCount,
  totalMaxStudents,
  allLicenses,
  currentStudentCount,
  hasPlannerProfile
}: LicenseContentProps) {
  const [licenseKey, setLicenseKey] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()

  // Set page title
  useEffect(() => {
    document.title = '라이선스 관리 | 엔보임 플래너 프로';
  }, []);

  // 미들웨어에서 전달된 리다이렉트 이유 확인
  const redirectReason = searchParams.get('reason')
  const currentCount = searchParams.get('current')
  const limitCount = searchParams.get('limit')

  // 리다이렉트 이유별 경고 메시지
  useEffect(() => {
    if (redirectReason === 'no_license') {
      setError('활성화된 라이선스가 없습니다. 새 라이선스를 입력하고 활성화해주세요.')
    } else if (redirectReason === 'expired') {
      setError('라이선스가 만료되었습니다. 새 라이선스를 구매하고 활성화해주세요.')
    } else if (redirectReason === 'trial_expired') {
      setError(
        '🎉 7일 무료 체험 기간이 종료되었습니다! 계속 사용하시려면 관리자(support@nplannerpro.com)에게 문의하여 정식 라이선스를 발급받아주세요.'
      )
    } else if (redirectReason === 'device_mismatch') {
      setError(
        '⚠️ 체험 라이선스는 등록된 기기에서만 사용 가능합니다. 이 기기는 라이선스에 등록되지 않았습니다. 정식 라이선스를 구매하시려면 관리자(support@nplannerpro.com)에게 문의해주세요.'
      )
    } else if (redirectReason === 'student_limit_exceeded') {
      setError(
        `학생 수 제한을 초과했습니다. 현재 ${currentCount}명이 등록되어 있으나, 라이선스 제한은 ${limitCount}명입니다. 라이선스를 업그레이드해주세요.`
      )
    }
  }, [redirectReason, currentCount, limitCount])

  // 라이선스 활성화 처리
  const handleActivateLicense = async () => {
    setError('')
    setSuccess('')

    if (!licenseKey.trim()) {
      setError('라이선스 키를 입력해주세요.')
      return
    }

    // 라이선스 키 형식 검증
    const parsed = parseLicenseKey(licenseKey)
    if (!parsed) {
      setError('잘못된 라이선스 키 형식입니다. (예: 30D-15P-XXXXXXXXXXXXX)')
      return
    }

    setIsSubmitting(true)

    try {
      // 서버 사이드 API를 통해 라이선스 활성화 (RLS 우회)
      const response = await fetch('/api/licenses/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          licenseKey: licenseKey.trim()
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || '라이선스 활성화 중 오류가 발생했습니다.')
        setIsSubmitting(false)
        return
      }

      if (result.is_addon && result.aligned_to) {
        // 추가 라이선스(Add-on): 기존 만료일에 맞춤
        const alignedDate = new Date(result.aligned_to).toLocaleDateString('ko-KR')
        setSuccess(
          `추가 라이선스가 기존 라이선스 만료일(~${alignedDate})에 맞춰 설정되었습니다! (+${result.license.max_students}명)`
        )
        setLicenseKey('')
        // Add-on은 이미 활성 라이선스가 있으므로 라이선스 페이지 새로고침
        setTimeout(() => {
          router.refresh()
        }, 1500)
      } else {
        // 신규 라이선스
        setSuccess(`라이선스가 성공적으로 활성화되었습니다! (기간: ${result.license.duration_days}일, 최대 학생 수: ${result.license.max_students}명)`)
        setLicenseKey('')
        // 플래너 프로필 생성 페이지로 리다이렉트
        setTimeout(() => {
          if (hasPlannerProfile) {
            router.refresh()
          } else {
            router.push('/onboarding/planner')
          }
        }, 1500)
      }

    } catch (err: unknown) {
      setError('라이선스 처리 중 오류가 발생했습니다: ' + (err instanceof Error ? err.message : String(err)))
    } finally {
      setIsSubmitting(false)
    }
  }

  // 만료일까지 남은 일수 계산
  const getRemainingDays = (expiresAt: string | null): number => {
    if (!expiresAt) return 0
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  // 상태 표시 색상
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'trial':
        return 'bg-blue-100 text-blue-800'
      case 'expired':
        return 'bg-red-100 text-red-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // 상태 한글 표시
  const getStatusText = (status: string): string => {
    switch (status) {
      case 'active':
        return '활성'
      case 'trial':
        return '체험'
      case 'expired':
        return '만료'
      case 'pending':
        return '대기'
      default:
        return status
    }
  }

  // 합산 최대 학생 수 (복수 라이선스 지원)
  const effectiveMaxStudents = totalMaxStudents > 0 ? totalMaxStudents : (activeLicense?.max_students || 0)

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* 현재 활성 라이선스 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">현재 라이선스 상태</h2>

        {activeLicense ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">상태</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activeLicense.status)}`}>
                {getStatusText(activeLicense.status)}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">남은 기간</span>
              <span className="text-sm font-medium text-gray-900">
                {getRemainingDays(activeLicense.expires_at)}일
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">만료일</span>
              <span className="text-sm font-medium text-gray-900">
                {activeLicense.expires_at ? new Date(activeLicense.expires_at).toLocaleDateString('ko-KR') : '-'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">최대 학생 수</span>
              <span className="text-sm font-medium text-gray-900">
                {activeLicenseCount > 1 ? (
                  <span>
                    {effectiveMaxStudents}명
                    <span className="ml-2 text-xs text-blue-600 font-normal">
                      (라이선스 {activeLicenseCount}개 합산)
                    </span>
                  </span>
                ) : (
                  `${effectiveMaxStudents}명`
                )}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">현재 학생 수</span>
              <span className={`text-sm font-medium ${currentStudentCount > effectiveMaxStudents ? 'text-red-600' : 'text-gray-900'}`}>
                {currentStudentCount}명
                {currentStudentCount > effectiveMaxStudents && (
                  <span className="ml-2 text-xs text-red-600">(제한 초과)</span>
                )}
              </span>
            </div>

            {activeLicenseCount > 1 && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  ℹ️ 활성 라이선스 {activeLicenseCount}개의 학생 수를 합산합니다.
                  모든 라이선스는 {activeLicense.expires_at ? new Date(activeLicense.expires_at).toLocaleDateString('ko-KR') : '-'}까지 유효합니다.
                </p>
              </div>
            )}

            {currentStudentCount > effectiveMaxStudents && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  ⚠️ 현재 학생 수가 라이선스 제한을 초과했습니다. 라이선스를 업그레이드해주세요.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-2">활성화된 라이선스가 없습니다.</p>
            <p className="text-sm text-gray-400">아래에서 새 라이선스를 입력하고 활성화해주세요.</p>
          </div>
        )}
      </div>

      {/* 라이선스 키 입력 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          {activeLicense ? '추가 라이선스 활성화' : '새 라이선스 활성화'}
        </h2>

        {activeLicense && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 추가 라이선스 활성화 시 만료일이 기존 라이선스(~{activeLicense.expires_at ? new Date(activeLicense.expires_at).toLocaleDateString('ko-KR') : '-'})에 자동으로 맞춰집니다.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="licenseKey" className="block text-sm font-medium text-gray-700 mb-2">
              라이선스 키
            </label>
            <input
              type="text"
              id="licenseKey"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="예: 30D-15P-XXXXXXXXXXXXX"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSubmitting}
            />
            <p className="mt-1 text-xs text-gray-500">
              형식: [기간(일)]D-[최대 학생 수]P-[암호화 키]
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-800">{success}</p>
            </div>
          )}

          <button
            onClick={handleActivateLicense}
            disabled={isSubmitting}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '처리 중...' : '라이선스 활성화'}
          </button>
        </div>

        {/* 라이선스 구매 안내 */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 라이선스 구매 안내</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 기본 요금: 50,000원 (10명 학생, 30일)</li>
            <li>• 추가 학생: 1명당 5,000원</li>
            <li>• 문의: support@example.com</li>
          </ul>
        </div>
      </div>

      {/* 라이선스 이력 - 플래너 프로필이 생성된 후에만 표시 */}
      {hasPlannerProfile && allLicenses.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">라이선스 이력</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">상태</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">기간</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">최대 학생</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">생성일</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">만료일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {allLicenses.map((license) => (
                  <tr key={license.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(license.status)}`}>
                        {getStatusText(license.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-900">{license.duration_days}일</td>
                    <td className="px-4 py-3 text-gray-900">{license.max_students}명</td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(license.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {license.expires_at ? new Date(license.expires_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LicenseContent(props: LicenseContentProps) {
  return (
    <Suspense fallback={
      <div className="p-4 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <LicenseContentInner {...props} />
    </Suspense>
  )
}
