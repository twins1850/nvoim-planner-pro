import { createClient } from '@/lib/supabase/server'
import { generateLicenseKey } from '@/lib/licenseGenerator'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // 관리자 권한 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 })
    }

    // 요청 본문 파싱
    const { orderId } = await request.json()

    if (!orderId) {
      return NextResponse.json({ error: 'orderId가 필요합니다.' }, { status: 400 })
    }

    // 주문 정보 조회
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 })
    }

    // 이미 라이선스가 발급되었는지 확인
    if (order.license_key) {
      return NextResponse.json(
        { error: '이미 라이선스가 발급된 주문입니다.', licenseKey: order.license_key },
        { status: 400 }
      )
    }

    // 라이선스 키 생성
    const licenseKey = generateLicenseKey(order.duration_days, order.student_count)

    // 라이선스 데이터베이스에 저장 (License-First: planner_id = NULL)
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        planner_id: null,
        license_key: licenseKey,
        duration_days: order.duration_days,
        max_students: order.student_count,
        status: 'pending',
      })
      .select()
      .single()

    if (licenseError) {
      console.error('라이선스 생성 오류:', licenseError)
      return NextResponse.json(
        { error: '라이선스 생성 중 오류가 발생했습니다.', details: licenseError.message },
        { status: 500 }
      )
    }

    // 주문 테이블 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: '라이선스발급완료',
        license_key: licenseKey,
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('주문 업데이트 오류:', updateError)
      // 라이선스는 이미 생성되었으므로 에러를 반환하지만 계속 진행
    }

    // 라이선스 이메일 발송
    let emailSent = false
    try {
      const emailResponse = await fetch(
        `${process.env.NEXT_PUBLIC_APP_URL}/api/send-license`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: order.customer_email,
            licenseKey: licenseKey,
            customerName: order.customer_name,
            durationDays: order.duration_days,
            maxStudents: order.student_count,
          }),
        }
      )

      if (emailResponse.ok) {
        emailSent = true
        console.log('라이선스 이메일 발송 성공:', order.customer_email)
      } else {
        console.error('이메일 발송 실패:', await emailResponse.text())
      }
    } catch (emailError) {
      console.error('이메일 발송 오류:', emailError)
    }

    return NextResponse.json({
      success: true,
      licenseKey: licenseKey,
      emailSent: emailSent,
      license: {
        id: license.id,
        license_key: license.license_key,
        durationDays: license.duration_days,
        maxStudents: license.max_students,
      },
    })
  } catch (error: any) {
    console.error('라이선스 발급 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    )
  }
}
