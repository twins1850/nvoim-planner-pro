import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LessonsContent from './LessonsContent'

export default async function LessonsPage() {
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

  // 수업 목록 가져오기
  const { data: lessons } = await supabase
    .from('lessons')
    .select(`
      *,
      student_profiles:student_id (
        profiles:id (
          full_name,
          avatar_url
        )
      )
    `)
    .eq('planner_id', user.id)
    .order('scheduled_at', { ascending: true })

  return (
    <LessonsContent 
      user={user}
      profile={profile}
      lessons={lessons || []}
    />
  )
}