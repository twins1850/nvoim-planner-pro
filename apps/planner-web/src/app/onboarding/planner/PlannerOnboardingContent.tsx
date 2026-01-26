'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface PlannerOnboardingContentProps {
  userId: string
  userEmail: string
  existingProfile: any
}

export default function PlannerOnboardingContent({
  userId,
  userEmail,
  existingProfile
}: PlannerOnboardingContentProps) {
  const [fullName, setFullName] = useState(existingProfile?.full_name || '')
  const [phone, setPhone] = useState(existingProfile?.phone || '')
  const [bio, setBio] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!fullName.trim()) {
      setError('이름을 입력해주세요.')
      return
    }

    setIsSubmitting(true)

    try {
      // 서버 사이드 API를 통해 플래너 프로필 생성 (RLS 우회)
      const response = await fetch('/api/onboarding/planner', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phone: phone.trim() || null,
          bio: bio.trim() || null
        })
      })

      const result = await response.json()

      if (!response.ok) {
        setError(result.error || '플래너 프로필 생성 중 오류가 발생했습니다.')
        setIsSubmitting(false)
        return
      }

      // 대시보드로 리다이렉트
      router.push('/dashboard')
      router.refresh()

    } catch (err: any) {
      setError('플래너 프로필 생성 중 오류가 발생했습니다: ' + err.message)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            환영합니다! 🎉
          </h1>
          <p className="text-gray-600">
            플래너 프로필을 완성하고 시작하세요
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 이메일 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-600"
            />
            <p className="mt-1 text-xs text-gray-500">
              회원가입 시 등록된 이메일입니다. 변경이 필요한 경우 설정에서 변경할 수 있습니다.
            </p>
          </div>

          {/* 이름 */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="홍길동"
              required
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* 전화번호 (선택) */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
              전화번호 (선택)
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="010-1234-5678"
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* 소개 (선택) */}
          <div>
            <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-2">
              간단한 소개 (선택)
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="예: 5년 경력의 수학 전문 강사입니다."
              rows={3}
              disabled={isSubmitting}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {isSubmitting ? '처리 중...' : '시작하기'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-800">
            💡 프로필은 나중에 설정에서 언제든지 수정할 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
