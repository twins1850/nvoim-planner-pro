import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import DashboardContent from './DashboardContent'

// Type for dashboard statistics
interface DashboardStats {
  total_students: number
  active_students: number
  pending_homework: number
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // ✅ 최적화: 한 번의 함수 호출로 모든 통계 가져오기
  const { data: dashboardStats } = await supabase
    .rpc('get_planner_dashboard_stats', { planner_uuid: user.id })
    .single() as { data: DashboardStats | null }

  // 프로필 정보 가져오기 (필요한 컬럼만 선택)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single()

  // 플래너 추가 정보 가져오기 (필요한 컬럼만 선택)
  const { data: plannerProfile } = await supabase
    .from('planner_profiles')
    .select('id, organization, bio, invite_code')
    .eq('id', user.id)
    .single()

  // ✅ 최적화: 오늘의 수업을 함수로 가져오기
  const { data: todayLessons } = await supabase
    .rpc('get_today_lessons', {
      planner_uuid: user.id,
      lesson_date: new Date().toISOString().split('T')[0]
    })

  return (
    <DashboardLayout title="대시보드">
      <DashboardContent
        user={user}
        profile={profile}
        plannerProfile={plannerProfile}
        studentCount={dashboardStats?.total_students || 0}
        todayLessons={todayLessons || []}
        pendingHomeworkCount={dashboardStats?.pending_homework || 0}
      />
    </DashboardLayout>
  )
}
