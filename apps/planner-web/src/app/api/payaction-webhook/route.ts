import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateLicenseKey } from '@/lib/licenseGenerator';

/**
 * PayAction Webhook Handler
 *
 * This API endpoint receives webhook notifications from PayAction when payment is confirmed.
 * It automatically generates a license key and sends it to the customer via email.
 *
 * Webhook Flow:
 * 1. PayAction detects deposit → Sends POST request to this endpoint
 * 2. Verify webhook authenticity (X-Payaction-Webhook-Key header)
 * 3. Find order by orderId
 * 4. Generate license key
 * 5. Save license to licenses table
 * 6. Update orders table (payment_status='라이선스발급완료')
 * 7. Send license email to customer
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Webhook 검증
    const webhookKey = req.headers.get('X-Payaction-Webhook-Key');
    const traceId = req.headers.get('X-Payaction-Trace-Id');
    const mallId = req.headers.get('X-Payaction-Mall-Id');

    console.log('Webhook received:', { webhookKey, traceId, mallId });

    if (webhookKey !== process.env.PAYACTION_WEBHOOK_KEY) {
      console.error('Invalid webhook key');
      return NextResponse.json(
        { error: 'Invalid webhook key' },
        { status: 401 }
      );
    }

    // 2. Webhook 데이터 파싱
    const data = await req.json();
    console.log('Webhook data:', data);

    const {
      orderId,        // PLANNER202601211510
      status,         // 매칭완료
      amount,         // 150000
      depositorName,  // 김형원PLANNER202601211510
      depositTime     // 2026-01-21T10:30:00Z
    } = data;

    // 3. "매칭완료" 상태만 처리
    if (status !== '매칭완료') {
      console.log('Status not matched:', status);
      return NextResponse.json({
        message: 'Status not matched',
        status: status
      });
    }

    // 4. 주문 정보 조회
    const supabase = createServiceRoleClient();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('order_id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderId);
      return NextResponse.json(
        { error: 'Order not found', orderId },
        { status: 404 }
      );
    }

    // 중복 처리 방지
    if (order.payment_status === '라이선스발급완료') {
      console.log('License already issued for order:', orderId);
      return NextResponse.json({
        message: 'License already issued',
        licenseKey: order.license_key
      });
    }

    // 5. 라이선스 키 생성
    const licenseKey = generateLicenseKey(
      order.duration_days,
      order.student_count
    );
    console.log('Generated license:', licenseKey);

    // 6. licenses 테이블에 저장
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + order.duration_days);

    const { error: licenseError } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        duration_days: order.duration_days,
        max_students: order.student_count,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (licenseError) {
      console.error('License insert error:', licenseError);
      throw licenseError;
    }

    // 7. orders 테이블 업데이트
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: '라이선스발급완료',
        license_key: licenseKey,
        deposit_time: depositTime,
        updated_at: new Date().toISOString()
      })
      .eq('order_id', orderId);

    if (updateError) {
      console.error('Order update error:', updateError);
      throw updateError;
    }

    // 8. 라이선스 발급 이메일 발송
    try {
      const emailResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-license`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: order.customer_email,
          orderId: orderId,
          licenseKey: licenseKey,
          customerName: order.customer_name,
          studentCount: order.student_count,
          durationDays: order.duration_days,
          amount: order.total_amount,
          expiryDate: expiryDate.toISOString()
        })
      });

      if (!emailResponse.ok) {
        console.error('Email send failed:', await emailResponse.text());
      } else {
        console.log('License email sent successfully');
      }
    } catch (emailError) {
      console.error('Email send error:', emailError);
      // 이메일 실패해도 라이선스는 발급됨 (비즈니스 로직 우선)
    }

    return NextResponse.json({
      success: true,
      orderId: orderId,
      licenseKey: licenseKey,
      message: 'License issued successfully'
    });

  } catch (error: any) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
