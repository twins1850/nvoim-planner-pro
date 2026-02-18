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

  // 모든 활성 라이선스 조회 (만료되지 않은 것만) → max_students 합산
  const { data: activeLicenses } = await supabase
    .from('licenses')
    .select('*')
    .eq('planner_id', user.id)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })

  const totalMaxStudents = (activeLicenses || []).reduce(
    (sum, l) => sum + (l.max_students || 0),
    0
  )
  // 가장 최근 활성 라이선스 (만료일 표시용 대표 라이선스)
  const primaryLicense = activeLicenses && activeLicenses.length > 0 ? activeLicenses[0] : null

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
        activeLicense={primaryLicense}
        activeLicenseCount={(activeLicenses || []).length}
        totalMaxStudents={totalMaxStudents}
        allLicenses={allLicenses || []}
        currentStudentCount={studentCount || 0}
        userId={user.id}
        hasPlannerProfile={!!plannerProfile}
      />
    </DashboardLayout>
  )
}
