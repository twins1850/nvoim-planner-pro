import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudentsContent from './StudentsContent'

export default async function StudentsPage() {
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

  // 학생 목록 가져오기 (플래너의 학생들만)
  const { data: students } = await supabase
    .from('student_profiles')
    .select(`
      *,
      profiles:id (
        id,
        full_name,
        email,
        phone,
        avatar_url,
        is_active,
        created_at
      )
    `)
    .eq('planner_id', user.id)

  return (
    <StudentsContent 
      user={user}
      profile={profile}
      students={students || []}
    />
  )
}