import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// 8자리 고유 초대 코드 생성
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

// POST: 선택된 nvoimp 학생들에 대해 초대 코드 일괄 생성
// Body: { students: [{ nvoimp_student_id: string, name: string }] }
//
// 처리 흐름:
//   1. is_connected = true → 'already_connected' (skip)
//   2. status = 'active' + 유효한 초대 코드 → 'already_managed' (skip, 슬롯 소비 없음)
//   3. status = 'active' + 만료된/없는 초대 코드 → 'invite_refreshed' (새 코드 발급, 슬롯 소비 없음)
//   4. status != 'active' (신규/비활성) → 슬롯 확인 후 'new' (upsert + status='active' + 코드 생성)
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
    const students: Array<{ nvoimp_student_id: string; name: string }> = body.students || []

    if (!students.length) {
      return NextResponse.json({ error: '가져올 학생을 선택하세요' }, { status: 400 })
    }

    // 이미 import된 학생 확인 (status 컬럼 추가)
    const nvoimp_ids = students.map(s => s.nvoimp_student_id)
    const { data: existingStudents } = await adminSupabase
      .from('students')
      .select('nvoimp_student_id, invite_code, is_connected, status')
      .eq('teacher_id', plannerId)
      .in('nvoimp_student_id', nvoimp_ids)

    const existingMap = new Map(
      (existingStudents || []).map(s => [s.nvoimp_student_id, s])
    )

    // 슬롯이 필요한 신규 학생 수 사전 계산 (case 4만 해당)
    const newStudentCount = students.filter(s => {
      const existing = existingMap.get(s.nvoimp_student_id)
      if (!existing) return true                          // 신규
      if (existing.is_connected) return false             // already_connected
      if (existing.status === 'active') return false      // already_managed or invite_refreshed
      return true                                         // 비활성 → 재활성화 (슬롯 필요)
    }).length

    // 라이선스 슬롯 확인 (신규 학생 수에 대해서만)
    const { data: licenseStatus } = await adminSupabase
      .rpc('get_license_student_status', { p_planner_id: plannerId })
      .single() as {
        data: {
          max_students: number
          current_students: number
          remaining_slots: number
          has_license: boolean
          active_license_expires_at: string | null
        } | null
      }

    if (licenseStatus?.has_license && newStudentCount > licenseStatus.remaining_slots) {
      return NextResponse.json({
        error: `라이선스 슬롯 부족: ${licenseStatus.remaining_slots}슬롯 남았으나 신규 ${newStudentCount}명 필요`,
        remaining_slots: licenseStatus.remaining_slots,
        requested_new: newStudentCount,
      }, { status: 400 })
    }

    const results: Array<{
      nvoimp_student_id: string
      name: string
      invite_code: string
      expires_at: string
      status: 'new' | 'already_managed' | 'already_connected' | 'invite_refreshed'
    }> = []

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

    for (const student of students) {
      const existing = existingMap.get(student.nvoimp_student_id)

      // Case 1: 이미 앱에 연결됨 → skip
      if (existing?.is_connected) {
        results.push({
          nvoimp_student_id: student.nvoimp_student_id,
          name: student.name,
          invite_code: existing.invite_code || '',
          expires_at: '',
          status: 'already_connected',
        })
        continue
      }

      // Case 2 & 3: 이미 관리 중 (status = 'active')
      if (existing?.status === 'active') {
        // 유효한 초대 코드 확인
        const { data: existingCode } = existing.invite_code
          ? await adminSupabase
              .from('invite_codes')
              .select('code, expires_at')
              .eq('code', existing.invite_code)
              .is('student_id', null)
              .gt('expires_at', new Date().toISOString())
              .maybeSingle()
          : { data: null }

        if (existingCode) {
          // Case 2: 유효한 초대 코드 있음 → already_managed (skip)
          results.push({
            nvoimp_student_id: student.nvoimp_student_id,
            name: student.name,
            invite_code: existingCode.code,
            expires_at: existingCode.expires_at,
            status: 'already_managed',
          })
          continue
        }

        // Case 3: 만료된/없는 초대 코드 → invite_refreshed (새 코드 발급, 슬롯 소비 없음)
        const newCode = await generateUniqueCode(adminSupabase)
        if (!newCode) continue

        const { error: codeError } = await adminSupabase
          .from('invite_codes')
          .insert({ teacher_id: plannerId, code: newCode, expires_at: expiresAt })

        if (codeError) {
          console.error('invite_codes insert error (refresh):', codeError)
          continue
        }

        // 학생 레코드: 새 코드 + 발송 시각만 업데이트 (status는 그대로 'active')
        await adminSupabase
          .from('students')
          .update({
            invite_code: newCode,
            invite_sent_at: new Date().toISOString(),
          })
          .eq('teacher_id', plannerId)
          .eq('nvoimp_student_id', student.nvoimp_student_id)

        results.push({
          nvoimp_student_id: student.nvoimp_student_id,
          name: student.name,
          invite_code: newCode,
          expires_at: expiresAt,
          status: 'invite_refreshed',
        })
        continue
      }

      // Case 4: 신규 또는 비활성 → 새 초대 코드 생성 + status = 'active' (슬롯 소비)
      const code = await generateUniqueCode(adminSupabase)
      if (!code) continue

      const { error: codeError } = await adminSupabase
        .from('invite_codes')
        .insert({ teacher_id: plannerId, code, expires_at: expiresAt })

      if (codeError) {
        console.error('invite_codes insert error:', codeError)
        continue
      }

      // students 테이블 삽입 또는 업데이트 (status = 'active')
      const { error: studentError } = await adminSupabase
        .from('students')
        .upsert({
          teacher_id: plannerId,
          name: student.name,
          invite_code: code,
          nvoimp_student_id: student.nvoimp_student_id,
          is_connected: false,
          invite_sent_at: new Date().toISOString(),
          status: 'active',
        }, {
          onConflict: 'teacher_id,nvoimp_student_id',
          ignoreDuplicates: false,
        })

      if (studentError) {
        // upsert 실패 시 insert 시도
        await adminSupabase
          .from('students')
          .insert({
            teacher_id: plannerId,
            name: student.name,
            invite_code: code,
            nvoimp_student_id: student.nvoimp_student_id,
            is_connected: false,
            invite_sent_at: new Date().toISOString(),
            status: 'active',
          })
      }

      results.push({
        nvoimp_student_id: student.nvoimp_student_id,
        name: student.name,
        invite_code: code,
        expires_at: expiresAt,
        status: 'new',
      })
    }

    const newCount = results.filter(r => r.status === 'new').length
    const refreshedCount = results.filter(r => r.status === 'invite_refreshed').length

    return NextResponse.json({
      success: true,
      results,
      new_codes: newCount + refreshedCount,
      new_managed: newCount,
      refreshed: refreshedCount,
      total: results.length,
    })
  } catch (error) {
    console.error('import-students error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

// 중복 없는 초대 코드 생성
async function generateUniqueCode(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  adminSupabase: any
): Promise<string | null> {
  let code = generateCode()
  let attempts = 0
  while (attempts < 10) {
    const { data: conflict } = await adminSupabase
      .from('invite_codes')
      .select('code')
      .eq('code', code)
      .maybeSingle()
    if (!conflict) return code
    code = generateCode()
    attempts++
  }
  return null
}
