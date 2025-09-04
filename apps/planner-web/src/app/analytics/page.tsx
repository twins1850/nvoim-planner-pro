import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AnalyticsContent from './AnalyticsContent'

export default async function AnalyticsPage() {
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

  // 통계 데이터 수집
  const [studentsStats, lessonsStats, homeworkStats] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('id, created_at')
      .eq('planner_id', user.id),
    supabase
      .from('lessons')
      .select('id, status, scheduled_at')
      .eq('planner_id', user.id),
    supabase
      .from('homework')
      .select(`
        id,
        created_at,
        homework_submissions!inner(
          status,
          submitted_at
        )
      `)
      .eq('created_by', user.id)
  ])

  return (
    <AnalyticsContent 
      user={user}
      profile={profile}
      studentsStats={studentsStats.data || []}
      lessonsStats={lessonsStats.data || []}
      homeworkStats={homeworkStats.data || []}
    />
  )
}