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
      // 6a. 기존 활성 라이선스 만료일 조회 (Add-on 정렬 판단)
      const { data: currentActive } = await supabaseAdmin
        .from('licenses')
        .select('expires_at')
        .eq('planner_id', user.id)
        .eq('status', 'active')
        .gt('expires_at', new Date().toISOString())
        .order('expires_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Add-on 정렬: 기존 활성 라이선스가 있으면 만료일 맞춤
      const isAddon = !!currentActive?.expires_at
      const alignedExpiresAt = currentActive?.expires_at || null

      // 6b. 사용자에게 라이선스 할당 및 활성화
      const updatePayload: Record<string, string> = {
        planner_id: user.id,
        status: 'active',
        activated_at: new Date().toISOString(),
      }

      // Add-on 만료일 정렬: 기존 라이선스가 있으면 expires_at 명시적 설정
      // (DB 트리거는 expires_at이 NULL인 경우만 duration_days 기반 계산)
      if (alignedExpiresAt) {
        updatePayload.expires_at = alignedExpiresAt
      }

      const { error: activateError } = await supabaseAdmin
        .from('licenses')
        .update(updatePayload)
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
        is_addon: isAddon,
        aligned_to: alignedExpiresAt,
        message: isAddon
          ? `추가 라이선스가 기존 라이선스 만료일에 맞춰 활성화되었습니다.`
          : `라이선스가 성공적으로 활성화되었습니다!`,
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

  } catch (error: unknown) {
    console.error('License activation API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
