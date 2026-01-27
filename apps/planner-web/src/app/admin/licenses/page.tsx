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

  // 통계 계산
  const totalLicenses = recentLicenses?.length || 0;
  const activeLicenses = recentLicenses?.filter((l) => l.status === 'active').length || 0;
  const trialLicenses = recentLicenses?.filter((l) => l.status === 'trial').length || 0;
  const expiredLicenses = recentLicenses?.filter((l) => l.status === 'expired').length || 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayLicenses = recentLicenses?.filter((l) => new Date(l.created_at) >= today).length || 0;

  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  const weekLicenses = recentLicenses?.filter((l) => new Date(l.created_at) >= weekAgo).length || 0;

  const monthAgo = new Date();
  monthAgo.setMonth(monthAgo.getMonth() - 1);
  monthAgo.setHours(0, 0, 0, 0);
  const monthLicenses = recentLicenses?.filter((l) => new Date(l.created_at) >= monthAgo).length || 0;

  return (
    <DashboardLayout title="라이선스 관리 (관리자)">
      <div className="max-w-7xl mx-auto">
        {/* 통계 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 라이선스</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalLicenses}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">활성 라이선스</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{activeLicenses}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">체험 라이선스</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{trialLicenses}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">만료 라이선스</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{expiredLicenses}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* 발급 통계 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">발급 통계</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="border-l-4 border-blue-600 pl-4">
              <p className="text-sm text-gray-600">오늘</p>
              <p className="text-xl font-bold text-gray-900">{todayLicenses}개</p>
            </div>
            <div className="border-l-4 border-green-600 pl-4">
              <p className="text-sm text-gray-600">이번 주 (7일)</p>
              <p className="text-xl font-bold text-gray-900">{weekLicenses}개</p>
            </div>
            <div className="border-l-4 border-purple-600 pl-4">
              <p className="text-sm text-gray-600">이번 달 (30일)</p>
              <p className="text-xl font-bold text-gray-900">{monthLicenses}개</p>
            </div>
          </div>
        </div>

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
