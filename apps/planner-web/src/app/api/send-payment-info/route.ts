import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';

/**
 * Payment Info Email API
 *
 * Sends deposit instructions to customers after order creation.
 *
 * Email includes:
 * - Order ID (must be included in depositor name)
 * - Bank account information
 * - Payment amount
 * - Expected processing time
 *
 * Called from: Order creation page after saving to orders table
 */
export async function POST(req: NextRequest) {
  try {
    const { to, orderId, amount, customerName } = await req.json();

    // Validate required fields
    if (!to || !orderId || !amount || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields: to, orderId, amount, customerName' },
        { status: 400 }
      );
    }

    // Validate email configuration
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('[Payment Email] Gmail credentials not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    // Create nodemailer transporter with Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    // Format amount with commas
    const formattedAmount = amount.toLocaleString('ko-KR');

    // Create beautiful HTML email
    const emailHTML = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">📝 주문이 접수되었습니다</h1>
          </div>

          <!-- Body -->
          <div style="padding: 30px 20px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">

            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              안녕하세요, <strong>${customerName}</strong>님!
            </p>

            <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
              <strong>엔보임 플래너 프로</strong> 주문이 성공적으로 접수되었습니다.<br>
              아래 계좌로 입금하시면 자동으로 라이선스가 발급됩니다.
            </p>

            <!-- Order Info Box -->
            <div style="background: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h3 style="font-size: 18px; color: #111827; margin: 0 0 15px 0;">📋 주문 정보</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">주문번호</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 18px; text-align: right; font-weight: bold; letter-spacing: 1px;">
                    ${orderId}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">결제금액</td>
                  <td style="padding: 8px 0; color: #dc2626; font-size: 20px; text-align: right; font-weight: bold;">
                    ${formattedAmount}원
                  </td>
                </tr>
              </table>
            </div>

            <!-- Bank Account Box -->
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h3 style="font-size: 18px; color: #856404; margin: 0 0 15px 0;">💳 입금 계좌</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #856404; font-size: 14px;">은행</td>
                  <td style="padding: 8px 0; color: #212529; font-size: 16px; text-align: right; font-weight: bold;">하나은행</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #856404; font-size: 14px;">계좌번호</td>
                  <td style="padding: 8px 0; color: #212529; font-size: 16px; text-align: right; font-weight: bold;">535-810053-96905</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #856404; font-size: 14px;">예금주</td>
                  <td style="padding: 8px 0; color: #212529; font-size: 16px; text-align: right; font-weight: bold;">김형원</td>
                </tr>
              </table>
            </div>

            <!-- Important Notice Box -->
            <div style="background: #ffebee; border-left: 4px solid #dc2626; border-radius: 8px; padding: 25px; margin-bottom: 30px;">
              <h3 style="font-size: 18px; color: #b91c1c; margin: 0 0 15px 0;">⚠️ 중요 안내</h3>
              <div style="color: #991b1b; font-size: 14px; line-height: 1.8;">
                <p style="margin: 0 0 15px 0;">
                  <strong>입금 시 입금자명을 정확히 기재해주세요!</strong>
                </p>
                <p style="margin: 0 0 10px 0; background: #ffffff; padding: 12px; border-radius: 6px;">
                  <strong>입금자명:</strong><br>
                  • <span style="color: #dc2626; font-weight: bold; font-size: 18px;">${customerName}</span>
                </p>
                <p style="margin: 0; font-size: 13px;">
                  ※ 주문하실 때 입력한 이름(<strong>${customerName}</strong>)으로 정확히 입금해주세요.<br>
                  ※ 입금자명이 일치해야 빠른 확인이 가능합니다.
                </p>
              </div>
            </div>

            <!-- Processing Time Info -->
            <div style="background: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <h3 style="font-size: 16px; color: #0c4a6e; margin: 0 0 10px 0;">⏱️ 처리 시간</h3>
              <p style="margin: 0; color: #075985; font-size: 14px; line-height: 1.6;">
                입금 확인 후 <strong>자동으로 라이선스가 발급</strong>됩니다.<br>
                통상 <strong>5분 이내</strong>에 처리됩니다. (영업시간 기준)
              </p>
            </div>

            <!-- Next Steps -->
            <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
              <h3 style="font-size: 18px; color: #111827; margin: 0 0 15px 0;">📌 다음 단계</h3>
              <ol style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px; line-height: 1.8;">
                <li style="margin-bottom: 8px;">위의 계좌로 <strong>${formattedAmount}원</strong>을 입금하세요.</li>
                <li style="margin-bottom: 8px;"><strong>입금자명을 ${customerName}으로 정확히</strong> 기재하세요.</li>
                <li style="margin-bottom: 8px;">입금이 확인되면 관리자가 라이선스 키를 발급해드립니다.</li>
                <li style="margin-bottom: 8px;">라이선스 키를 이메일로 받으시면 활성화를 진행하세요.</li>
                <li>플래너 앱을 시작하세요! 🎉</li>
              </ol>
            </div>

            <!-- Support Info -->
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="font-size: 16px; color: #111827; margin: 0 0 10px 0;">💬 문의하기</h3>
              <p style="font-size: 14px; color: #6b7280; margin: 0; line-height: 1.6;">
                입금 확인이 지연되거나 문의사항이 있으시면 언제든 연락주세요:<br><br>
                📧 이메일: <a href="mailto:support@nvoim.com" style="color: #667eea; text-decoration: none; font-weight: bold;">support@nvoim.com</a><br>
                💬 카카오톡: <a href="http://pf.kakao.com/_nvoim_planner" style="color: #667eea; text-decoration: none; font-weight: bold;">@nvoim_planner</a>
              </p>
            </div>

          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">이 이메일은 엔보임 플래너 프로 주문 시 자동으로 발송됩니다.</p>
            <p style="margin: 10px 0 0 0;">© 2026 엔보임 플래너 프로. All rights reserved.</p>
          </div>

        </div>
      </body>
      </html>
    `;

    // Send email to customer
    await transporter.sendMail({
      from: `엔보임 플래너 프로 <${process.env.GMAIL_USER}>`,
      to: to,
      subject: `[엔보임 플래너 프로] 입금 안내 - ${orderId}`,
      html: emailHTML
    });

    console.log('[Payment Email] Sent successfully to customer:', to);

    // Send email to admin
    const adminEmail = 'twins1850@gmail.com';
    const adminEmailHTML = `
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

          <!-- Header -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🔔 새로운 주문이 접수되었습니다</h1>
          </div>

          <!-- Body -->
          <div style="padding: 30px 20px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">

            <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
              관리자님, 새로운 주문이 접수되었습니다.
            </p>

            <!-- Order Info Box -->
            <div style="background: #ffffff; border: 2px solid #e5e7eb; border-radius: 8px; padding: 25px; margin-bottom: 20px;">
              <h3 style="font-size: 18px; color: #111827; margin: 0 0 15px 0;">📋 주문 정보</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">주문번호</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 16px; text-align: right; font-weight: bold;">
                    ${orderId}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">구매자</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 16px; text-align: right; font-weight: bold;">
                    ${customerName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">이메일</td>
                  <td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;">
                    ${to}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">결제금액</td>
                  <td style="padding: 8px 0; color: #dc2626; font-size: 20px; text-align: right; font-weight: bold;">
                    ${formattedAmount}원
                  </td>
                </tr>
              </table>
            </div>

            <!-- Important Notice -->
            <div style="background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
              <h3 style="font-size: 16px; color: #856404; margin: 0 0 10px 0;">⚠️ 입금 확인 필요</h3>
              <p style="font-size: 14px; color: #856404; margin: 0; line-height: 1.6;">
                고객이 <strong>${customerName}</strong> 이름으로 <strong>${formattedAmount}원</strong>을 입금하면<br>
                관리자 대시보드에서 라이선스를 발급해주세요.
              </p>
            </div>

            <!-- Admin Dashboard Link -->
            <div style="text-align: center; margin-top: 20px;">
              <a href="https://www.nplannerpro.com/admin/licenses" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold;">
                관리자 대시보드로 이동 →
              </a>
            </div>

          </div>

          <!-- Footer -->
          <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;">주문 접수 시 자동 발송되는 관리자 알림 이메일입니다.</p>
            <p style="margin: 10px 0 0 0;">© 2026 엔보임 플래너 프로. All rights reserved.</p>
          </div>

        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: `엔보임 플래너 프로 <${process.env.GMAIL_USER}>`,
      to: adminEmail,
      subject: `[관리자 알림] 새 주문 접수 - ${orderId} (${customerName})`,
      html: adminEmailHTML
    });

    console.log('[Payment Email] Sent successfully to admin:', adminEmail);

    return NextResponse.json({
      success: true,
      message: 'Payment info emails sent successfully',
      orderId: orderId
    });

  } catch (error: any) {
    console.error('[Payment Email] Send error:', {
      error: error.message,
      stack: error.stack
    });

    return NextResponse.json(
      {
        error: 'Failed to send payment info email',
        details: error.message
      },
      { status: 500 }
    );
  }
}
