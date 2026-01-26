import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '../../components/DashboardLayout'
import LicenseContent from './LicenseContent'

export default async function LicensePage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 현재 활성화된 라이선스 정보 가져오기 (가장 최근 생성된 활성 라이선스)
  const { data: licenses } = await supabase
    .from('licenses')
    .select('*')
    .eq('planner_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)

  const activeLicense = licenses && licenses.length > 0 ? licenses[0] : null

  // 모든 라이선스 이력 가져오기
  const { data: allLicenses } = await supabase
    .from('licenses')
    .select('*')
    .eq('planner_id', user.id)
    .order('created_at', { ascending: false })

  // 현재 학생 수 가져오기
  const { count: studentCount } = await supabase
    .from('student_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('planner_id', user.id)

  // 플래너 프로필 존재 여부 확인
  const { data: plannerProfile } = await supabase
    .from('planner_profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  return (
    <DashboardLayout title="라이선스 관리">
      <LicenseContent
        activeLicense={activeLicense}
        allLicenses={allLicenses || []}
        currentStudentCount={studentCount || 0}
        userId={user.id}
        hasPlannerProfile={!!plannerProfile}
      />
    </DashboardLayout>
  )
}
