import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import HomeworkContent from './HomeworkContent'

export default async function HomeworkPage() {
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

  // 숙제 목록 가져오기 (최근 생성 순)
  console.log("📚 homework 목록 가져오기 시작...");
  const { data: homework, error: homeworkFetchError } = await supabase
    .from('homework')
    .select(`
      *,
      homework_assignments (
        id,
        student_id,
        status,
        assigned_at
      )
    `)
    .eq('planner_id', user.id)
    .order('created_at', { ascending: false })
  
  console.log("homework 목록 결과:", { homework, homeworkFetchError });
  if (homeworkFetchError) {
    console.error("homework 목록 가져오기 실패:", homeworkFetchError);
  }

  // 통계 데이터
  const totalHomework = homework?.length || 0
  const pendingSubmissions = homework?.reduce((count, hw) => 
    count + (hw.homework_assignments?.filter((a: any) => a.status === 'pending').length || 0), 0
  ) || 0
  const completedSubmissions = homework?.reduce((count, hw) => 
    count + (hw.homework_assignments?.filter((a: any) => a.status === 'completed').length || 0), 0
  ) || 0

  return (
    <DashboardLayout title="숙제 관리">
      <HomeworkContent 
        user={user}
        profile={profile}
        homework={homework || []}
        stats={{
          total: totalHomework,
          pending: pendingSubmissions,
          completed: completedSubmissions
        }}
      />
    </DashboardLayout>
  )
}