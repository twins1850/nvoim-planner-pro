import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { parseLicenseKey } from '@/lib/licenseUtils'

export async function POST(req: NextRequest) {
  try {
    // 1. 사용자 인증 확인
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: '로그인이 필요합니다.' },
        { status: 401 }
      )
    }

    // 2. 요청 본문에서 라이선스 키 가져오기
    const body = await req.json()
    const { licenseKey } = body

    if (!licenseKey || !licenseKey.trim()) {
      return NextResponse.json(
        { error: '라이선스 키를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 3. 라이선스 키 형식 검증
    const parsed = parseLicenseKey(licenseKey)
    if (!parsed) {
      return NextResponse.json(
        { error: '잘못된 라이선스 키 형식입니다. (예: 30D-15P-XXXXXXXXXXXXX)' },
        { status: 400 }
      )
    }

    // 4. Service Role 클라이언트 사용 (RLS 우회)
    const supabaseAdmin = createServiceRoleClient()

    // 5. 라이선스 조회
    const { data: existingLicense, error: fetchError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey.trim().toUpperCase())
      .maybeSingle()

    if (fetchError) {
      console.error('License fetch error:', fetchError)
      return NextResponse.json(
        { error: '라이선스 조회 중 오류가 발생했습니다: ' + fetchError.message },
        { status: 500 }
      )
    }

    if (!existingLicense) {
      return NextResponse.json(
        { error: '유효하지 않은 라이선스 키입니다. 라이선스 키를 다시 확인해주세요.' },
        { status: 404 }
      )
    }

    // 6. 라이선스 상태 검증
    // 관리자가 발급한 pending 라이선스 (planner_id = NULL)
    if (existingLicense.status === 'pending' && !existingLicense.planner_id) {
      // 사용자에게 라이선스 할당 및 활성화
      const { error: activateError } = await supabaseAdmin
        .from('licenses')
        .update({
          planner_id: user.id,
          status: 'active',
          activated_at: new Date().toISOString()
        })
        .eq('license_key', licenseKey.trim().toUpperCase())

      if (activateError) {
        console.error('License activation error:', activateError)
        return NextResponse.json(
          { error: '라이선스 활성화 중 오류가 발생했습니다: ' + activateError.message },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        message: `라이선스가 성공적으로 활성화되었습니다!`,
        license: {
          duration_days: existingLicense.duration_days,
          max_students: existingLicense.max_students
        }
      })
    }

    // 이미 다른 사용자가 활성화한 경우
    if (existingLicense.planner_id && existingLicense.planner_id !== user.id) {
      return NextResponse.json(
        { error: '이미 다른 플래너가 사용 중인 라이선스 키입니다.' },
        { status: 409 }
      )
    }

    // 현재 사용자의 라이선스이지만 이미 활성화된 경우
    if (existingLicense.planner_id === user.id && existingLicense.status === 'active') {
      return NextResponse.json(
        { error: '이미 활성화된 라이선스입니다.' },
        { status: 409 }
      )
    }

    // 만료된 라이선스
    if (existingLicense.status === 'expired') {
      return NextResponse.json(
        { error: '만료된 라이선스 키입니다.' },
        { status: 410 }
      )
    }

    // 기타 상태 (superseded 등)
    return NextResponse.json(
      { error: `이 라이선스는 ${existingLicense.status} 상태입니다.` },
      { status: 409 }
    )

  } catch (error: any) {
    console.error('License activation API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    )
  }
}
