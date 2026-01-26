import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardLayout from '@/components/DashboardLayout'
import LicenseGeneratorForm from './LicenseGeneratorForm'
import OrderManagement from './OrderManagement'

export default async function AdminLicensesPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 관리자 권한 확인 (middleware에서 1차 검증, 여기서 2차 검증)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || profile.role !== 'admin') {
    redirect('/dashboard')
  }

  // 모든 플래너 목록 조회
  const { data: planners } = await supabase
    .from('profiles')
    .select('id, full_name, email, created_at')
    .eq('role', 'planner')
    .order('created_at', { ascending: false })

  // 모든 라이선스 조회 (최근 100개)
  const { data: recentLicenses } = await supabase
    .from('licenses')
    .select(
      `
      *,
      profiles:planner_id (
        full_name,
        email
      )
    `
    )
    .order('created_at', { ascending: false })
    .limit(100)

  // 주문 목록 조회 (최근 50개)
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <DashboardLayout title="라이선스 관리 (관리자)">
      <div className="max-w-7xl mx-auto">
        {/* 주문 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            주문 목록 (최근 50개)
          </h2>
          <OrderManagement orders={orders || []} />
        </div>

        {/* 라이선스 발급 폼 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">새 라이선스 발급</h2>
          <LicenseGeneratorForm planners={planners || []} />
        </div>

        {/* 최근 발급된 라이선스 목록 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            최근 발급된 라이선스 (최근 100개)
          </h2>

          {recentLicenses && recentLicenses.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                      플래너
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                      라이선스 키
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                      기간
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                      최대 학생
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                      상태
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-700 uppercase">
                      생성일
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {recentLicenses.map((license: any) => (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">
                            {license.profiles?.full_name || '알 수 없음'}
                          </p>
                          <p className="text-xs text-gray-500">{license.profiles?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {license.license_key}
                      </td>
                      <td className="px-4 py-3 text-gray-900">{license.duration_days}일</td>
                      <td className="px-4 py-3 text-gray-900">{license.max_students}명</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            license.status === 'active'
                              ? 'bg-green-100 text-green-800'
                              : license.status === 'expired'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {license.status === 'active'
                            ? '활성'
                            : license.status === 'expired'
                            ? '만료'
                            : '대기'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(license.created_at).toLocaleDateString('ko-KR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">발급된 라이선스가 없습니다.</div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
