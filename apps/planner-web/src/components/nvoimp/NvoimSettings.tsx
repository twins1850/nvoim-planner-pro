'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

const supabase = createClient()

interface SyncLog {
  id: string
  sync_type: string
  sync_date: string
  records_synced: number
  feedback_translated: number
  error_message: string | null
  duration_ms: number
  created_at: string
}

interface NvoimStudent {
  nvoimp_student_id: string
  name: string
  status?: string            // nvoimp 상태: '수강회원' | '중지회원'
  app_connected: boolean
  invite_pending: boolean
  invite_code?: string
  invite_expires_at?: string | null
  invite_days_left?: number | null
  is_managed?: boolean       // students.status = 'active' 여부
  invite_expired?: boolean   // 초대 코드가 있지만 만료됨
}

interface LicenseStatus {
  max_students: number
  current_students: number
  remaining_slots: number
  has_license: boolean
  active_license_expires_at?: string | null
}

interface ImportResult {
  nvoimp_student_id: string
  name: string
  invite_code: string
  expires_at: string
  status: 'new' | 'already_managed' | 'already_connected' | 'invite_refreshed'
}

interface StudentLinkResult {
  auto_linked: number
  mappings: Array<{ planner_name: string; nvoimp_name: string; nvoimp_id: string }>
  skipped: Array<{ nvoimp_name: string; reason: string }>
  total_nvoimp: number
}

export default function NvoimSettings() {
  const [userId, setUserId] = useState('')
  const [passwd, setPasswd] = useState('')
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [testLoading, setTestLoading] = useState(false)
  const [syncLoading, setSyncLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [hasCredentials, setHasCredentials] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const [syncLogs, setSyncLogs] = useState<SyncLog[]>([])
  const [linkLoading, setLinkLoading] = useState(false)
  const [linkResult, setLinkResult] = useState<StudentLinkResult | null>(null)

  // 학생 임포트 관련 상태
  const [studentListLoading, setStudentListLoading] = useState(false)
  const [nvoimStudents, setNvoimStudents] = useState<NvoimStudent[]>([])
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus | null>(null)
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set())
  const [importLoading, setImportLoading] = useState(false)
  const [importResults, setImportResults] = useState<ImportResult[]>([])
  const [copiedCode, setCopiedCode] = useState<string | null>(null)
  const [unmanageLoading, setUnmanageLoading] = useState<string | null>(null)
  const [refreshLoading, setRefreshLoading] = useState<string | null>(null)

  useEffect(() => {
    loadCredentials()
    loadSyncLogs()
  }, [])

  async function loadCredentials() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('nvoimp_credentials')
        .select('nvoimp_user_id, sync_enabled, last_sync_at')
        .eq('planner_id', user.id)
        .maybeSingle()

      if (data) {
        setUserId(data.nvoimp_user_id)
        setSyncEnabled(data.sync_enabled)
        setLastSyncAt(data.last_sync_at)
        setHasCredentials(true)
      }
    } catch {
      // 자격증명 없음 - 정상
    } finally {
      setLoading(false)
    }
  }

  async function loadSyncLogs() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('nvoimp_sync_log')
        .select('*')
        .eq('planner_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      if (data) setSyncLogs(data)
    } catch {
      // 무시
    }
  }

  async function handleSave() {
    if (!userId.trim() || !passwd.trim()) {
      setMessage({ type: 'error', text: '아이디와 비밀번호를 입력해주세요.' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('로그인 필요')

      const { error } = await supabase.rpc('save_nvoimp_credentials', {
        p_nvoimp_user_id: userId.trim(),
        p_passwd: passwd,
        p_sync_enabled: syncEnabled,
      })

      if (error) throw error

      setHasCredentials(true)
      setPasswd('')
      setMessage({ type: 'success', text: '앤보임 연동 정보가 암호화되어 저장되었습니다.' })
    } catch (e: unknown) {
      setMessage({ type: 'error', text: (e instanceof Error ? e.message : String(e)) || '저장 실패' })
    } finally {
      setLoading(false)
    }
  }

  async function handleTest() {
    if (!userId.trim()) {
      setMessage({ type: 'error', text: '먼저 자격증명을 저장해주세요.' })
      return
    }

    setTestLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/nvoimp/sync-onestop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_date: new Date().toISOString().slice(0, 10) }),
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setMessage({
        type: 'success',
        text: `연동 성공! 오늘 ${result.students_found}명 조회, ${result.records_synced}건 동기화`,
      })
      await loadSyncLogs()
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `연동 실패: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setTestLoading(false)
    }
  }

  async function handleLinkStudents() {
    setLinkLoading(true)
    setLinkResult(null)
    setMessage(null)

    try {
      const response = await fetch('/api/nvoimp/sync-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto: true }),
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setLinkResult(result)
      if (result.auto_linked > 0) {
        setMessage({
          type: 'success',
          text: `${result.auto_linked}명 자동 연결 완료! 이제 출결 동기화가 정상 작동합니다.`,
        })
      } else {
        setMessage({
          type: 'error',
          text: `자동 매칭된 학생이 없습니다. 플래너 앱 학생 이름과 앤보임 학생 이름이 일치해야 합니다.`,
        })
      }
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `학생 연결 실패: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setLinkLoading(false)
    }
  }

  async function handleSyncFeedback() {
    setSyncLoading(true)
    setMessage(null)

    try {
      const response = await fetch('/api/nvoimp/sync-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sync_date: new Date().toISOString().slice(0, 10) }),
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setMessage({
        type: 'success',
        text: `피드백 동기화 완료! ${result.records_synced}건 수집, ${result.feedback_translated}건 한글 번역`,
      })
      await loadSyncLogs()
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `피드백 동기화 실패: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSyncLoading(false)
    }
  }

  // ─── 학생 임포트 기능 ───────────────────────────────────────────────────────

  async function handleLoadStudentList() {
    setStudentListLoading(true)
    setMessage(null)
    setImportResults([])
    setSelectedStudents(new Set())

    try {
      const response = await fetch('/api/nvoimp/sync-students')
      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setNvoimStudents(result.nvoimp_students || [])
      setLicenseStatus(result.license_status || null)
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `학생 목록 조회 실패: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setStudentListLoading(false)
    }
  }

  function toggleStudentSelection(nvoimp_student_id: string) {
    setSelectedStudents(prev => {
      const next = new Set(prev)
      if (next.has(nvoimp_student_id)) {
        next.delete(nvoimp_student_id)
      } else {
        next.add(nvoimp_student_id)
      }
      return next
    })
  }

  // 관리 중이 아닌 학생 전체 선택/해제
  function toggleAllSelectable() {
    const selectable = nvoimStudents.filter(s => !s.is_managed)
    const allSelected = selectable.length > 0 && selectable.every(s => selectedStudents.has(s.nvoimp_student_id))
    if (allSelected) {
      setSelectedStudents(new Set())
    } else {
      setSelectedStudents(new Set(selectable.map(s => s.nvoimp_student_id)))
    }
  }

  async function handleImportStudents() {
    if (selectedStudents.size === 0) {
      setMessage({ type: 'error', text: '초대할 학생을 선택하세요.' })
      return
    }

    setImportLoading(true)
    setMessage(null)

    try {
      const studentsToImport = nvoimStudents
        .filter(s => selectedStudents.has(s.nvoimp_student_id))
        .map(s => ({ nvoimp_student_id: s.nvoimp_student_id, name: s.name }))

      const response = await fetch('/api/nvoimp/import-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ students: studentsToImport }),
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setImportResults(result.results || [])
      setSelectedStudents(new Set())
      setMessage({
        type: 'success',
        text: `${result.new_codes}개 초대 코드 생성 완료! 학생에게 코드를 전달하세요.`,
      })

      // 목록 새로고침
      await handleLoadStudentList()
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `초대 코드 생성 실패: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setImportLoading(false)
    }
  }

  // 관리 해제 (슬롯 반환)
  async function handleUnmanage(nvoimp_student_id: string, studentName: string) {
    if (!confirm(`${studentName} 학생의 관리를 해제하시겠습니까?\n슬롯 1개가 즉시 반환됩니다.`)) return

    setUnmanageLoading(nvoimp_student_id)
    setMessage(null)

    try {
      const response = await fetch('/api/nvoimp/unmanage-student', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nvoimp_student_id }),
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      setMessage({
        type: 'success',
        text: `${result.student_name} 관리 해제 완료. 슬롯 1개 반환됨.`,
      })
      await handleLoadStudentList()
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `관리 해제 실패: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setUnmanageLoading(null)
    }
  }

  // 초대 코드 재발급 (만료된 코드 갱신, 슬롯 소비 없음)
  async function handleRefreshInvite(student: NvoimStudent) {
    setRefreshLoading(student.nvoimp_student_id)
    setMessage(null)

    try {
      const response = await fetch('/api/nvoimp/import-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          students: [{ nvoimp_student_id: student.nvoimp_student_id, name: student.name }],
        }),
      })

      const result = await response.json()
      if (result.error) throw new Error(result.error)

      const refreshed = (result.results || []).find(
        (r: ImportResult) => r.status === 'invite_refreshed'
      )
      if (refreshed) {
        setMessage({
          type: 'success',
          text: `${student.name} 초대 코드 재발급 완료: ${refreshed.invite_code} (슬롯 변화 없음)`,
        })
      }
      await handleLoadStudentList()
    } catch (e: unknown) {
      setMessage({ type: 'error', text: `재발급 실패: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setRefreshLoading(null)
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedCode(text)
      setTimeout(() => setCopiedCode(null), 2000)
    } catch {
      // fallback
    }
  }

  // 앱 연결 상태 배지 (nvoimp 상태 배지와 분리)
  function getAppStatusBadge(student: NvoimStudent) {
    if (student.app_connected) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          ✅ 앱 연결됨
        </span>
      )
    }
    if (student.invite_expired) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          🔴 초대 만료
        </span>
      )
    }
    if (student.invite_pending && student.invite_days_left !== null && student.invite_days_left !== undefined) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          🟡 초대 중 (D-{student.invite_days_left}일)
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        ⬜ 미등록
      </span>
    )
  }

  function formatDateTime(iso: string) {
    return new Date(iso).toLocaleString('ko-KR', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // 관리 중이 아닌 (선택 가능한) 학생 목록
  const selectableStudents = nvoimStudents.filter(s => !s.is_managed)

  return (
    <div className="space-y-6">
      {/* 연동 헤더 */}
      <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">앤보임(nvoimp.com) 자동 연동</h3>
            <p className="text-sm text-gray-600 mt-1">
              출결처리·잔여수강권을 자동으로 동기화하고, 원어민 강사 영어 피드백을 한글로 번역하여
              학생/학부모에게 전달합니다.
            </p>
            {hasCredentials && lastSyncAt && (
              <p className="text-xs text-orange-600 mt-2">
                마지막 동기화: {formatDateTime(lastSyncAt)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 자격증명 입력 */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h4 className="font-medium text-gray-900 mb-4">앤보임 로그인 정보</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              앤보임 아이디 (UserID)
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="nvoimp.com 로그인 아이디"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              비밀번호
            </label>
            <input
              type="password"
              value={passwd}
              onChange={(e) => setPasswd(e.target.value)}
              placeholder={hasCredentials ? '변경 시에만 입력' : 'nvoimp.com 비밀번호'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
            {hasCredentials && (
              <p className="text-xs text-gray-500 mt-1">비밀번호를 변경할 때만 입력하세요.</p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={syncEnabled}
                onChange={(e) => setSyncEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-500"></div>
            </label>
            <span className="text-sm text-gray-700">자동 동기화 활성화</span>
          </div>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-md text-sm ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? '저장 중...' : '저장'}
          </button>

          {hasCredentials && (
            <>
              <button
                onClick={handleTest}
                disabled={testLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {testLoading ? '테스트 중...' : '연동 테스트 (출결 동기화)'}
              </button>

              <button
                onClick={handleSyncFeedback}
                disabled={syncLoading}
                className="px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {syncLoading ? '번역 중...' : '피드백 수집 + 한글 번역'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── 앤보임 학생 가져오기 (핵심 신규 기능) ── */}
      {hasCredentials && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-gray-900">앤보임 학생 가져오기</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                nvoimp 학생을 선택하면 초대 코드를 자동 생성합니다. 코드를 복사해 카카오톡/문자로 전달하세요.
              </p>
            </div>
            <button
              onClick={handleLoadStudentList}
              disabled={studentListLoading}
              className="px-4 py-2 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {studentListLoading ? '불러오는 중...' : '학생 목록 불러오기'}
            </button>
          </div>

          {/* 라이선스 현황 */}
          {licenseStatus && (
            <div className={`mb-4 p-3 rounded-lg flex items-center justify-between text-sm ${
              licenseStatus.remaining_slots === 0
                ? 'bg-red-50 border border-red-200'
                : licenseStatus.remaining_slots <= 2
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-blue-50 border border-blue-200'
            }`}>
              <span className={`font-medium ${
                licenseStatus.remaining_slots === 0 ? 'text-red-700' :
                licenseStatus.remaining_slots <= 2 ? 'text-yellow-700' : 'text-blue-700'
              }`}>
                {licenseStatus.has_license
                  ? `라이선스: ${licenseStatus.current_students}/${licenseStatus.max_students}명 관리 중 (${licenseStatus.remaining_slots}슬롯 남음)`
                  : '라이선스 없음 - 무제한 임포트 가능'}
              </span>
              {licenseStatus.remaining_slots === 0 && licenseStatus.has_license && (
                <a
                  href="/license"
                  className="text-xs text-red-600 underline hover:text-red-800"
                >
                  업그레이드 →
                </a>
              )}
            </div>
          )}

          {/* 학생 목록 */}
          {nvoimStudents.length > 0 && (
            <>
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
                {/* 테이블 헤더 */}
                <div className="bg-gray-50 px-4 py-2 flex items-center gap-3 border-b border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectableStudents.length > 0 &&
                      selectableStudents.every(s => selectedStudents.has(s.nvoimp_student_id))}
                    onChange={toggleAllSelectable}
                    disabled={selectableStudents.length === 0}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-xs font-medium text-gray-600">
                    미관리 전체 선택 ({selectableStudents.length}명)
                  </span>
                  <span className="ml-auto text-xs text-gray-400">
                    관리 중: {nvoimStudents.filter(s => s.is_managed).length}명
                  </span>
                </div>

                {/* 학생 목록 */}
                <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                  {nvoimStudents.map(student => {
                    const isSelectable = !student.is_managed
                    const isSelected = selectedStudents.has(student.nvoimp_student_id)
                    const isUnmanaging = unmanageLoading === student.nvoimp_student_id
                    const isRefreshing = refreshLoading === student.nvoimp_student_id

                    return (
                      <div
                        key={student.nvoimp_student_id}
                        className={`px-4 py-3 flex items-center gap-3 ${
                          isSelectable ? 'hover:bg-gray-50 cursor-pointer' : 'bg-white'
                        } ${isSelected ? 'bg-orange-50' : ''}`}
                        onClick={() => isSelectable && toggleStudentSelection(student.nvoimp_student_id)}
                      >
                        {/* 체크박스 (미관리 학생만) */}
                        {isSelectable ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudentSelection(student.nvoimp_student_id)}
                            className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500 flex-shrink-0"
                            onClick={e => e.stopPropagation()}
                          />
                        ) : (
                          <div className="w-4 h-4 flex-shrink-0" />
                        )}

                        {/* 학생 이름 + ID */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{student.name}</p>
                          <p className="text-xs text-gray-400">ID: {student.nvoimp_student_id}</p>
                        </div>

                        {/* nvoimp 상태 배지 (수강/중지) */}
                        {student.status && (
                          <span className={`flex-shrink-0 text-xs px-1.5 py-0.5 rounded font-medium ${
                            student.status === '수강회원'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {student.status === '수강회원' ? '수강' : '중지'}
                          </span>
                        )}

                        {/* 앱 연결 상태 배지 */}
                        <div className="flex-shrink-0">
                          {getAppStatusBadge(student)}
                        </div>

                        {/* 액션 버튼 (관리 중인 학생만) */}
                        {student.is_managed && (
                          <div className="flex-shrink-0 flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            {/* 유효한 초대 코드 복사 버튼 */}
                            {student.invite_pending && student.invite_code && (
                              <button
                                onClick={() => copyToClipboard(student.invite_code!)}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded-md hover:bg-yellow-200 transition-colors"
                              >
                                {copiedCode === student.invite_code ? '✓ 복사됨' : `📋 ${student.invite_code}`}
                              </button>
                            )}

                            {/* 초대 코드 재발급 버튼 (만료된 경우) */}
                            {student.invite_expired && (
                              <button
                                onClick={() => handleRefreshInvite(student)}
                                disabled={isRefreshing}
                                className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 disabled:opacity-50 transition-colors"
                              >
                                {isRefreshing ? '처리 중...' : '재발급'}
                              </button>
                            )}

                            {/* 관리 해제 버튼 */}
                            <button
                              onClick={() => handleUnmanage(student.nvoimp_student_id, student.name)}
                              disabled={isUnmanaging}
                              className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded-md hover:bg-red-100 disabled:opacity-50 transition-colors border border-red-200"
                            >
                              {isUnmanaging ? '...' : '관리 해제'}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 선택된 학생 수 + 임포트 버튼 */}
              {selectedStudents.size > 0 && (
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <span className="text-sm text-orange-700 font-medium">
                    {selectedStudents.size}명 선택됨
                    {licenseStatus?.has_license && (
                      <span className="ml-2 text-orange-500 font-normal">
                        (슬롯 {licenseStatus.remaining_slots}개 남음)
                      </span>
                    )}
                  </span>
                  <button
                    onClick={handleImportStudents}
                    disabled={importLoading || (licenseStatus?.has_license === true && licenseStatus.remaining_slots < selectedStudents.size)}
                    className="px-4 py-2 bg-orange-500 text-white text-sm rounded-md hover:bg-orange-600 disabled:opacity-50 transition-colors"
                  >
                    {importLoading ? '생성 중...' : `초대 코드 생성 (${selectedStudents.size}명)`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* 임포트 결과 - 새로 생성된 초대 코드 */}
          {importResults.filter(r => r.status === 'new' || r.status === 'invite_refreshed').length > 0 && (
            <div className="mt-4 border border-green-200 rounded-lg overflow-hidden">
              <div className="bg-green-50 px-4 py-2 border-b border-green-200">
                <p className="text-sm font-medium text-green-800">
                  ✅ 초대 코드 생성 완료 - 아래 코드를 카카오톡/문자로 전달하세요
                </p>
              </div>
              <div className="divide-y divide-green-100">
                {importResults
                  .filter(r => r.status === 'new' || r.status === 'invite_refreshed')
                  .map(result => (
                    <div key={result.nvoimp_student_id} className="px-4 py-3 flex items-center justify-between bg-white">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {result.name}
                          {result.status === 'invite_refreshed' && (
                            <span className="ml-2 text-xs text-orange-600">(재발급)</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400">
                          만료: {result.expires_at ? new Date(result.expires_at).toLocaleDateString('ko-KR') : '7일 후'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <code className="px-3 py-1.5 bg-gray-100 text-gray-800 font-mono text-sm font-bold rounded-md">
                          {result.invite_code}
                        </code>
                        <button
                          onClick={() => copyToClipboard(result.invite_code)}
                          className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 transition-colors"
                        >
                          {copiedCode === result.invite_code ? '✓ 복사됨' : '복사'}
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 기존 학생 연결 (이름 자동 매핑) */}
      {hasCredentials && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="font-medium text-gray-900">기존 학생 연결 (이름 매핑)</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                이미 플래너 앱에 등록된 학생과 앤보임 학생을 이름으로 자동 연결합니다
              </p>
            </div>
            <button
              onClick={handleLinkStudents}
              disabled={linkLoading}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 transition-colors flex-shrink-0"
            >
              {linkLoading ? '연결 중...' : '이름으로 자동 연결'}
            </button>
          </div>

          {linkResult && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-4 text-sm">
                <span className="text-green-700 font-medium">✅ 연결됨: {linkResult.auto_linked}명</span>
                <span className="text-gray-500">앤보임 전체: {linkResult.total_nvoimp}명</span>
                <span className="text-orange-600">미연결: {linkResult.skipped.length}명</span>
              </div>

              {linkResult.mappings.length > 0 && (
                <div className="bg-green-50 rounded p-3">
                  <p className="text-xs font-medium text-green-800 mb-1">연결된 학생</p>
                  <div className="space-y-0.5">
                    {linkResult.mappings.map((m, i) => (
                      <p key={i} className="text-xs text-green-700">
                        {m.planner_name} ↔ {m.nvoimp_name} (ID: {m.nvoimp_id})
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {linkResult.skipped.length > 0 && (
                <div className="bg-orange-50 rounded p-3">
                  <p className="text-xs font-medium text-orange-800 mb-1">
                    미연결 앤보임 학생 (플래너에 같은 이름 없음)
                  </p>
                  <div className="space-y-0.5">
                    {linkResult.skipped.map((s, i) => (
                      <p key={i} className="text-xs text-orange-700">{s.nvoimp_name}</p>
                    ))}
                  </div>
                  <p className="text-xs text-orange-600 mt-2">
                    💡 위 "앤보임 학생 가져오기"를 통해 초대 코드를 생성해 전달하세요.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 기능 설명 */}
      <div className="bg-white border border-gray-200 rounded-lg p-5">
        <h4 className="font-medium text-gray-900 mb-3">자동화 기능</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              icon: '📋',
              title: '출결 자동화',
              desc: '매 30분마다 원스톱 관리 페이지에서 출석/결석/지각 상태를 자동 동기화',
            },
            {
              icon: '🎫',
              title: '수강권 관리',
              desc: '잔여 수강권 횟수를 실시간으로 업데이트하여 정확한 수강 현황 유지',
            },
            {
              icon: '🌐',
              title: '피드백 번역',
              desc: '원어민 강사 영어 피드백을 AI가 한글로 번역, 학생 앱에 즉시 전달',
            },
          ].map((item) => (
            <div key={item.title} className="bg-gray-50 rounded-lg p-4">
              <div className="text-2xl mb-2">{item.icon}</div>
              <h5 className="font-medium text-gray-900 text-sm mb-1">{item.title}</h5>
              <p className="text-xs text-gray-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 동기화 로그 */}
      {syncLogs.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <h4 className="font-medium text-gray-900 mb-3">최근 동기화 내역</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">시간</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">타입</th>
                  <th className="text-left py-2 pr-4 font-medium text-gray-600">날짜</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-600">동기화</th>
                  <th className="text-right py-2 pr-4 font-medium text-gray-600">번역</th>
                  <th className="text-right py-2 font-medium text-gray-600">소요</th>
                </tr>
              </thead>
              <tbody>
                {syncLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 pr-4 text-gray-600">{formatDateTime(log.created_at)}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        log.sync_type === 'onestop'
                          ? 'bg-blue-100 text-blue-700'
                          : log.sync_type === 'feedback'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {log.sync_type}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-gray-600">{log.sync_date}</td>
                    <td className="py-2 pr-4 text-right text-gray-900">{log.records_synced}건</td>
                    <td className="py-2 pr-4 text-right text-gray-900">
                      {log.feedback_translated > 0 ? `${log.feedback_translated}건` : '-'}
                    </td>
                    <td className="py-2 text-right text-gray-600">
                      {log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
