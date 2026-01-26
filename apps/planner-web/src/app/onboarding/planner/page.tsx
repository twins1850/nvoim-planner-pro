import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PlannerOnboardingContent from './PlannerOnboardingContent'

export default async function PlannerOnboardingPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 이미 플래너 프로필이 있는지 확인
  const { data: plannerProfile } = await supabase
    .from('planner_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 이미 플래너 프로필이 있으면 대시보드로
  if (plannerProfile) {
    redirect('/dashboard')
  }

  // profiles 테이블에서 기본 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-50">
      <PlannerOnboardingContent
        userId={user.id}
        userEmail={user.email || ''}
        existingProfile={profile}
      />
    </div>
  )
}
