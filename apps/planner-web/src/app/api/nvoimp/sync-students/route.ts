import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

async function loginNvoimp(userId: string, passwd: string): Promise<string> {
  const res = await fetch('https://www.nvoimp.com/Member/Process/loginProc.asp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.nvoimp.com/Member/Login.asp',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: `UserID=${encodeURIComponent(userId)}&Passwd=${encodeURIComponent(passwd)}`,
    redirect: 'manual',
  })

  const setCookieRaw = res.headers.getSetCookie?.() ?? []
  const setCookieHeader = res.headers.get('set-cookie') || ''
  const cookies = setCookieRaw.length > 0 ? setCookieRaw.join('; ') : setCookieHeader

  if (!cookies) throw new Error('nvoimp 로그인 실패')
  return cookies
}

// StudentManage.asp HTML에서 학생 로그인ID + 이름 추출
// nvoimp는 <select id="SearchID">에 전체 학생 목록을 포함 (페이지네이션 무관)
// 학생 ID는 숫자(F_STDT_ID)가 아닌 로그인 ID 문자열 (예: jacob2012, kzo1002)
function parseStudentListHtml(html: string): Array<{ nvoimp_student_id: string; name: string; status?: string }> {
  const results: Array<{ nvoimp_student_id: string; name: string; status?: string }> = []
  const seen = new Set<string>()

  // 1차: <select id="SearchID"> 블록에서 전체 학생 목록 추출 (가장 안정적)
  const selectBlockMatch = html.match(/<select[^>]*id="SearchID"[^>]*>([\s\S]*?)<\/select>/)
  if (selectBlockMatch) {
    const selectHtml = selectBlockMatch[1]
    const optionPattern = /<option[^>]*value="([^"]+)"[^>]*>([\s\S]*?)<\/option>/gi
    for (const match of selectHtml.matchAll(optionPattern)) {
      const loginId = match[1].trim()
      if (!loginId || seen.has(loginId)) continue

      const rawText = match[2].replace(/<[^>]+>/g, '').trim()
      // (수강회원), (종료회원), (중지회원) 등 상태 추출
      const statusMatch = rawText.match(/\(([^)]+)\)/)
      const status = statusMatch ? statusMatch[1] : undefined
      const name = rawText.replace(/\s*\([^)]*\)\s*/g, '').replace(/\s+/g, ' ').trim()

      if (!name || !/[가-힣]/.test(name)) continue
      // 수강회원 + 중지회원만 포함 (종료회원 및 status 없는 항목 제외)
      // 중지회원: 수강권이 남아있어 재수강 관리 대상
      if (status !== '수강회원' && status !== '중지회원') continue

      seen.add(loginId)
      results.push({ nvoimp_student_id: loginId, name, status })
    }
    if (results.length > 0) return results
  }

  // 2차 fallback: 테이블의 .ViewMyStudent 버튼 value 속성에서 추출 (현재 페이지만)
  const buttonPattern = /<tr[^>]*>[\s\S]*?<button[^>]*class="[^"]*ViewMyStudent[^"]*"[^>]*value="([^"]+)"[\s\S]*?<\/tr>/gi
  for (const rowMatch of html.matchAll(buttonPattern)) {
    const loginId = rowMatch[1].trim()
    if (!loginId || seen.has(loginId)) continue

    // 같은 tr에서 이름(한글) 찾기
    const tds = [...rowMatch[0].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(m => m[1].replace(/<[^>]+>/g, '').trim())
    const name = tds.find(td => td && /^[가-힣\s]{2,6}$/.test(td)) || ''
    if (!name) continue

    seen.add(loginId)
    results.push({ nvoimp_student_id: loginId, name })
  }

  return results
}

async function getAdminAndCreds(plannerId: string) {
  const adminSupabase = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: creds } = await adminSupabase
    .from('nvoimp_credentials')
    .select('nvoimp_user_id')
    .eq('planner_id', plannerId)
    .maybeSingle()

  if (!creds) throw new Error('자격증명 없음')

  const { data: decryptedPasswd } = await adminSupabase
    .rpc('get_nvoimp_passwd_decrypted', { p_planner_id: plannerId })

  if (!decryptedPasswd) throw new Error('비밀번호 복호화 실패')

  return { adminSupabase, nvoimp_user_id: creds.nvoimp_user_id, passwd: decryptedPasswd }
}

// GET: nvoimp 학생 목록 + 앱 연결 상태 조회
export async function GET(_req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }
    const plannerId = user.id

    const { adminSupabase, nvoimp_user_id, passwd } = await getAdminAndCreds(plannerId)
    const cookies = await loginNvoimp(nvoimp_user_id, passwd)

    const studentRes = await fetch('https://www.nvoimp.com/Lecture/StudentManage.asp', {
      headers: {
        Cookie: cookies,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: 'https://www.nvoimp.com/',
      },
    })
    const html = await studentRes.text()
    const nvoimp_students = parseStudentListHtml(html)
    const nvoimp_ids = nvoimp_students.map(s => s.nvoimp_student_id)

    // students 테이블에서 import/연결 현황 조회 (status 컬럼 추가)
    const { data: localStudents } = await adminSupabase
      .from('students')
      .select('nvoimp_student_id, invite_code, is_connected, invite_sent_at, user_id, status')
      .eq('teacher_id', plannerId)
      .in('nvoimp_student_id', nvoimp_ids.length > 0 ? nvoimp_ids : ['__none__'])

    const localMap = new Map(
      (localStudents || []).map(s => [s.nvoimp_student_id, s])
    )

    // 유효한 초대 코드 만료일 조회
    const activeCodes = (localStudents || [])
      .filter(s => s.invite_code)
      .map(s => s.invite_code)

    const { data: inviteCodes } = activeCodes.length > 0
      ? await adminSupabase
          .from('invite_codes')
          .select('code, expires_at')
          .in('code', activeCodes)
          .is('student_id', null)
          .gt('expires_at', new Date().toISOString())
      : { data: [] }

    const codeExpiryMap = new Map(
      (inviteCodes || []).map(ic => [ic.code, ic.expires_at])
    )

    // 라이선스 슬롯 현황
    const { data: licenseStatus } = await adminSupabase
      .rpc('get_license_student_status', { p_planner_id: plannerId })
      .single()

    // nvoimp 학생 목록에 상태 정보 추가
    const enrichedStudents = nvoimp_students.map(student => {
      const local = localMap.get(student.nvoimp_student_id)
      const inviteExpiry = local?.invite_code
        ? codeExpiryMap.get(local.invite_code) || null
        : null

      let daysLeft: number | null = null
      if (inviteExpiry) {
        daysLeft = Math.ceil(
          (new Date(inviteExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        )
      }

      return {
        ...student,
        app_connected: local?.is_connected === true,
        invite_pending: !local?.is_connected && !!local?.invite_code && !!inviteExpiry,
        invite_code: (!local?.is_connected && local?.invite_code) ? local.invite_code : undefined,
        invite_expires_at: inviteExpiry,
        invite_days_left: daysLeft,
        planner_student_id: local?.user_id || undefined,
        is_managed: local?.status === 'active',
        invite_expired: !!local?.invite_code && !local?.is_connected && !inviteExpiry,
      }
    })

    // 기존 호환성 유지: planner_students, matched_count 등
    const { data: profiles } = await adminSupabase
      .from('student_profiles')
      .select('id, full_name, nvoimp_student_id')
      .eq('planner_id', plannerId)

    const planner_students = profiles || []
    const mappedIds = new Set(planner_students.map(p => p.nvoimp_student_id).filter(Boolean))
    const matchedCount = planner_students.filter(p => p.nvoimp_student_id).length
    const unmatchedPlanner = planner_students.filter(p => !p.nvoimp_student_id && p.full_name)
    const unmatchedNvoimp = nvoimp_students.filter(n => !mappedIds.has(n.nvoimp_student_id))

    return NextResponse.json({
      nvoimp_students: enrichedStudents,
      planner_students,
      matched_count: matchedCount,
      unmatched_planner: unmatchedPlanner,
      unmatched_nvoimp: unmatchedNvoimp,
      license_status: licenseStatus || null,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// POST: 자동 이름 매핑 또는 수동 매핑 저장
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }
    const plannerId = user.id

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const body = await req.json().catch(() => ({}))

    // 수동 매핑: { mappings: [{student_profile_id, nvoimp_student_id}] }
    if (body.mappings) {
      let linked = 0
      for (const { student_profile_id, nvoimp_student_id } of body.mappings) {
        const { error } = await adminSupabase
          .from('student_profiles')
          .update({ nvoimp_student_id })
          .eq('id', student_profile_id)
          .eq('planner_id', plannerId)
        if (!error) linked++
      }
      return NextResponse.json({ success: true, linked })
    }

    // 자동 이름 매핑
    const { nvoimp_user_id, passwd } = await getAdminAndCreds(plannerId)
    const cookies = await loginNvoimp(nvoimp_user_id, passwd)

    const studentRes = await fetch('https://www.nvoimp.com/Lecture/StudentManage.asp', {
      headers: {
        Cookie: cookies,
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Referer: 'https://www.nvoimp.com/',
      },
    })
    const html = await studentRes.text()
    const nvoimp_students = parseStudentListHtml(html)

    const { data: profiles } = await adminSupabase
      .from('student_profiles')
      .select('id, name, nvoimp_student_id')
      .eq('planner_id', plannerId)

    const planner_students = profiles || []
    let autoLinked = 0
    const autoMappings: Array<{ planner_name: string; nvoimp_name: string; nvoimp_id: string }> = []
    const skipped: Array<{ nvoimp_name: string; reason: string }> = []

    for (const nvoimp of nvoimp_students) {
      const normalizedNvoimp = nvoimp.name.replace(/\s/g, '')

      const match = planner_students.find(p => {
        if (!p.name || p.nvoimp_student_id) return false
        return p.name.replace(/\s/g, '') === normalizedNvoimp
      })

      if (match) {
        const { error } = await adminSupabase
          .from('student_profiles')
          .update({ nvoimp_student_id: nvoimp.nvoimp_student_id })
          .eq('id', match.id)
          .eq('planner_id', plannerId)

        if (!error) {
          autoLinked++
          autoMappings.push({
            planner_name: match.name,
            nvoimp_name: nvoimp.name,
            nvoimp_id: nvoimp.nvoimp_student_id,
          })
        }
      } else {
        const alreadyLinked = planner_students.find(p => p.nvoimp_student_id && p.name?.replace(/\s/g, '') === normalizedNvoimp)
        if (!alreadyLinked) {
          skipped.push({ nvoimp_name: nvoimp.name, reason: '플래너에 동일 이름 학생 없음' })
        }
      }
    }

    return NextResponse.json({
      success: true,
      auto_linked: autoLinked,
      mappings: autoMappings,
      skipped,
      total_nvoimp: nvoimp_students.length,
    })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
