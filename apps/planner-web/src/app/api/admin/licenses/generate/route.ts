import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { generateLicenseKey } from '@/lib/licenseGenerator'
import { NextResponse } from 'next/server'

// Service Role 클라이언트 (RLS 우회)
const createServiceRoleClient = () => {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

export async function POST(request: Request) {
  try {
    // 두 가지 인증 방식 지원:
    // 1. X-Admin-Password 헤더 (간단한 비밀번호 프롬프트)
    // 2. Supabase 인증 (기존 방식)

    const adminPassword = request.headers.get('X-Admin-Password')
    let usePasswordAuth = false

    if (adminPassword) {
      // 비밀번호 인증 방식
      if (adminPassword !== process.env.ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Invalid admin password' }, { status: 401 })
      }
      usePasswordAuth = true
    } else {
      // Supabase 인증 방식
      const supabase = await createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
      }

      // 관리자 권한 확인
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (!profile || profile.role !== 'admin') {
        return NextResponse.json(
          { error: '관리자 권한이 필요합니다.' },
          { status: 403 }
        )
      }
    }

    // 요청 본문 파싱
    const body = await request.json()
    const {
      durationDays,
      maxStudents,
      purchaserEmail,
      customerName,
      customerEmail,
      notes,
      sendEmail
    } = body

    // 입력값 검증 (License-First: plannerId 불필요)
    if (!durationDays || !maxStudents) {
      return NextResponse.json(
        { error: '필수 입력값이 누락되었습니다. (durationDays, maxStudents)' },
        { status: 400 }
      )
    }

    if (durationDays <= 0 || maxStudents <= 0) {
      return NextResponse.json(
        { error: '기간과 학생 수는 0보다 커야 합니다.' },
        { status: 400 }
      )
    }

    // 이메일 발송 시 customerEmail 필수
    if (sendEmail && !customerEmail) {
      return NextResponse.json(
        { error: '이메일 발송 시 customerEmail이 필요합니다.' },
        { status: 400 }
      )
    }

    // 라이선스 키 생성
    const licenseKey = generateLicenseKey(durationDays, maxStudents)

    // Service Role 클라이언트 사용 (비밀번호 인증 시 RLS 우회)
    const supabaseAdmin = usePasswordAuth ? createServiceRoleClient() : await createClient()

    // 라이선스 데이터베이스에 저장 (License-First: planner_id = NULL)
    const { data: license, error: insertError } = await supabaseAdmin
      .from('licenses')
      .insert({
        planner_id: null, // License-First: 활성화 전까지 NULL
        license_key: licenseKey,
        duration_days: durationDays,
        max_students: maxStudents,
        status: 'pending',
      })
      .select()
      .single()

    if (insertError) {
      console.error('라이선스 생성 오류:', insertError)
      return NextResponse.json(
        { error: '라이선스 생성 중 오류가 발생했습니다.', details: insertError.message },
        { status: 500 }
      )
    }

    // 이메일 발송 (선택 사항)
    let emailSent = false
    if (sendEmail && customerEmail) {
      try {
        const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-admin-license`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: customerEmail,
            licenseKey: licenseKey,
            customerName: customerName || '고객님',
            durationDays: durationDays,
            maxStudents: maxStudents,
            notes: notes || ''
          })
        })

        if (emailResponse.ok) {
          emailSent = true
          console.log('관리자 라이선스 이메일 발송 성공:', customerEmail)
        } else {
          console.error('이메일 발송 실패:', await emailResponse.text())
        }
      } catch (emailError) {
        console.error('이메일 발송 오류:', emailError)
        // 이메일 실패해도 라이선스는 발급됨
      }
    }

    return NextResponse.json({
      success: true,
      license: {
        id: license.id,
        license_key: license.license_key,
        durationDays: license.duration_days,
        maxStudents: license.max_students,
        status: license.status,
        createdAt: license.created_at,
      },
      emailSent: emailSent
    })
  } catch (error: any) {
    console.error('라이선스 발급 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    )
  }
}
