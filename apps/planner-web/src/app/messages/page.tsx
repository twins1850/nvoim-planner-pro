import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import MessagesContent from './MessagesContent'

export default async function MessagesPage() {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // 사용자가 플래너인 경우 학생들 목록 가져오기
  let students = []
  if (profile?.role === 'planner') {
    const { data: studentData } = await supabase
      .from('student_profiles')
      .select(`
        *,
        profiles!inner(id, full_name, email, avatar_url)
      `)
      .eq('planner_id', user.id)
    
    students = studentData || []
  }

  return (
    <DashboardLayout title="메시지">
      <MessagesContent 
        user={user} 
        profile={profile}
        students={students}
      />
    </DashboardLayout>
  )
}