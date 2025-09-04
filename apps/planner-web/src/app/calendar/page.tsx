import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CalendarContent from './CalendarContent'

export default async function CalendarPage() {
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

  // 일정 목록 가져오기 (수업과 이벤트 통합)
  const { data: lessons } = await supabase
    .from('lessons')
    .select(`
      *,
      student_profiles:student_id (
        profiles:id (
          full_name
        )
      )
    `)
    .eq('planner_id', user.id)
    .order('scheduled_at', { ascending: true })

  return (
    <CalendarContent 
      user={user}
      profile={profile}
      lessons={lessons || []}
    />
  )
}