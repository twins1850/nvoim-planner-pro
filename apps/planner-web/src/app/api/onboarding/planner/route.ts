import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// Service Role client for bypassing RLS
function createServiceRoleClient() {
  const { createClient } = require('@supabase/supabase-js')
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

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

    // 2. 요청 본문에서 플래너 정보 가져오기
    const body = await req.json()
    const { fullName, phone, bio } = body

    if (!fullName || !fullName.trim()) {
      return NextResponse.json(
        { error: '이름을 입력해주세요.' },
        { status: 400 }
      )
    }

    // 3. Service Role client 사용 (RLS 우회)
    const supabaseAdmin = createServiceRoleClient()

    // 4. profiles 테이블 업데이트
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone?.trim() || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      console.error('Profile update error:', profileError)
      return NextResponse.json(
        { error: '프로필 업데이트 중 오류가 발생했습니다: ' + profileError.message },
        { status: 500 }
      )
    }

    // 5. 기존 planner_profile 확인
    const { data: existingProfile } = await supabaseAdmin
      .from('planner_profiles')
      .select('invite_code')
      .eq('id', user.id)
      .maybeSingle()

    // 6. invite_code는 기존 것을 유지하거나 새로 생성
    const inviteCode = existingProfile?.invite_code ||
      Math.random().toString(36).substring(2, 8).toUpperCase()

    // 7. planner_profiles 테이블 upsert (RLS 우회)
    const { error: plannerProfileError } = await supabaseAdmin
      .from('planner_profiles')
      .upsert({
        id: user.id,
        bio: bio?.trim() || null,
        invite_code: inviteCode
      })

    if (plannerProfileError) {
      console.error('Planner profile upsert error:', plannerProfileError)
      return NextResponse.json(
        { error: '플래너 프로필 생성 중 오류가 발생했습니다: ' + plannerProfileError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '플래너 프로필이 성공적으로 생성되었습니다!',
      inviteCode: inviteCode
    })

  } catch (error: any) {
    console.error('Planner onboarding API error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다: ' + error.message },
      { status: 500 }
    )
  }
}
