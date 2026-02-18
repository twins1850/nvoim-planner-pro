import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// PATCH: 학생 관리 해제 (students.status = 'inactive')
// 슬롯 즉시 반환, 미사용 초대 코드 만료 처리
// Body: { nvoimp_student_id: string }
export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: '인증 필요' }, { status: 401 })
    }
    const plannerId = user.id

    const body = await req.json().catch(() => ({}))
    const { nvoimp_student_id } = body

    if (!nvoimp_student_id) {
      return NextResponse.json({ error: 'nvoimp_student_id 필요' }, { status: 400 })
    }

    const adminSupabase = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 본인 학생인지 확인 + 현재 상태 조회
    const { data: student, error: fetchError } = await adminSupabase
      .from('students')
      .select('id, name, status, invite_code')
      .eq('teacher_id', plannerId)
      .eq('nvoimp_student_id', nvoimp_student_id)
      .maybeSingle()

    if (fetchError) {
      return NextResponse.json({ error: '조회 오류: ' + fetchError.message }, { status: 500 })
    }

    if (!student) {
      return NextResponse.json({ error: '학생을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (student.status !== 'active') {
      return NextResponse.json({ error: '이미 관리 해제된 학생입니다.' }, { status: 409 })
    }

    // 관리 해제: status → 'inactive' (슬롯 즉시 반환)
    const { error: updateError } = await adminSupabase
      .from('students')
      .update({ status: 'inactive' })
      .eq('id', student.id)

    if (updateError) {
      return NextResponse.json({ error: '관리 해제 실패: ' + updateError.message }, { status: 500 })
    }

    // 미사용 초대 코드 즉시 만료 처리 (student_id가 NULL = 아직 앱 미연결)
    if (student.invite_code) {
      await adminSupabase
        .from('invite_codes')
        .update({ expires_at: new Date().toISOString() })
        .eq('code', student.invite_code)
        .is('student_id', null)
    }

    return NextResponse.json({
      success: true,
      freed_slot: true,
      student_name: student.name,
    })
  } catch (error) {
    console.error('unmanage-student error:', error)
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
