import { createClient } from '@/lib/supabase/server'
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

    // 주문 상태를 "매칭완료"로 업데이트
    const { data: order, error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: '매칭완료',
        deposit_time: new Date().toISOString(),
      })
      .eq('id', orderId)
      .select()
      .single()

    if (updateError) {
      console.error('주문 상태 업데이트 오류:', updateError)
      return NextResponse.json(
        { error: '주문 상태 업데이트 중 오류가 발생했습니다.', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        order_id: order.order_id,
        payment_status: order.payment_status,
        deposit_time: order.deposit_time,
      },
    })
  } catch (error: any) {
    console.error('입금 확인 API 오류:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    )
  }
}
