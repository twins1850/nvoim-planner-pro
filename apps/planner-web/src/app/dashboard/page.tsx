import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardContent from './DashboardContent'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/auth/login')
  }

  // 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 플래너 추가 정보 가져오기
  const { data: plannerProfile } = await supabase
    .from('planner_profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 학생 수 가져오기
  const { count: studentCount } = await supabase
    .from('student_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('planner_id', user.id)

  // 오늘의 수업 가져오기
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const { data: todayLessons } = await supabase
    .from('lessons')
    .select('*')
    .eq('planner_id', user.id)
    .gte('scheduled_at', today.toISOString())
    .lt('scheduled_at', tomorrow.toISOString())
    .order('scheduled_at', { ascending: true })

  // 미완료 숙제 수 가져오기
  const { data: pendingHomework } = await supabase
    .from('homework_assignments')
    .select('*, homework!inner(*)')
    .eq('homework.planner_id', user.id)
    .eq('status', 'pending')

  return (
    <DashboardContent 
      user={user}
      profile={profile}
      plannerProfile={plannerProfile}
      studentCount={studentCount || 0}
      todayLessons={todayLessons || []}
      pendingHomeworkCount={pendingHomework?.length || 0}
    />
  )
}