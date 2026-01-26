import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const {
      to,
      orderId,
      licenseKey,
      customerName,
      studentCount,
      durationDays,
      amount,
      expiryDate
    } = await req.json();

    if (!to || !orderId || !licenseKey || !customerName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('[License Email] Gmail credentials not configured');
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      );
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    const formattedExpiry = expiryDate 
      ? new Date(expiryDate).toLocaleDateString('ko-KR')
      : '';
    const activationUrl = process.env.NEXT_PUBLIC_APP_URL + '/license-activate';
    const formattedAmount = amount.toLocaleString();

    const emailHTML = '<!DOCTYPE html><html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', sans-serif;"><div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;"><div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;"><h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎉 라이선스 발급 완료!</h1></div><div style="padding: 30px 20px; background-color: #f9fafb; border-radius: 0 0 12px 12px;"><p style="font-size: 16px; color: #374151; margin-bottom: 20px;">안녕하세요, <strong>' + customerName + '</strong>님!</p><p style="font-size: 16px; color: #374151; margin-bottom: 30px;">입금이 확인되어 <strong>엔보임 플래너 프로</strong> 라이선스가 발급되었습니다.</p><div style="background: #ffffff; border: 2px dashed #667eea; border-radius: 8px; padding: 25px; margin-bottom: 30px; text-align: center;"><p style="font-size: 14px; color: #6b7280; margin: 0 0 10px 0;">라이선스 키</p><p style="font-size: 28px; font-weight: bold; color: #667eea; margin: 0; letter-spacing: 2px; word-break: break-all;">' + licenseKey + '</p></div><div style="background: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 30px;"><h3 style="font-size: 18px; color: #111827; margin: 0 0 15px 0;">📋 구매 정보</h3><table style="width: 100%; border-collapse: collapse;"><tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">주문번호</td><td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;"><strong>' + orderId + '</strong></td></tr><tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">학생 수</td><td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;"><strong>' + studentCount + '명</strong></td></tr><tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">사용 기간</td><td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;"><strong>' + durationDays + '일</strong></td></tr><tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">결제 금액</td><td style="padding: 8px 0; color: #111827; font-size: 14px; text-align: right;"><strong>' + formattedAmount + '원</strong></td></tr>' + (formattedExpiry ? '<tr><td style="padding: 8px 0; color: #6b7280; font-size: 14px;">만료일</td><td style="padding: 8px 0; color: #dc2626; font-size: 14px; text-align: right;"><strong>' + formattedExpiry + '</strong></td></tr>' : '') + '</table></div><div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;"><h3 style="font-size: 18px; color: #92400e; margin: 0 0 15px 0;">🚀 다음 단계</h3><ol style="margin: 0; padding-left: 20px; color: #78350f; font-size: 14px;"><li style="margin-bottom: 8px;"><a href="' + activationUrl + '" style="color: #667eea; text-decoration: none; font-weight: bold;">라이선스 활성화 페이지</a>에 접속하세요.</li><li style="margin-bottom: 8px;">위의 라이선스 키를 입력하세요.</li><li style="margin-bottom: 8px;">디바이스 등록 후 회원가입을 완료하세요.</li><li>플래너 앱을 시작하세요!</li></ol></div><div style="text-align: center; margin-bottom: 30px;"><a href="' + activationUrl + '" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">지금 활성화하기 →</a></div><div style="background: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 20px;"><h3 style="font-size: 18px; color: #111827; margin: 0 0 15px 0;">💬 고객 지원</h3><p style="font-size: 14px; color: #6b7280; margin: 0;">문의사항이 있으시면 언제든 연락주세요:<br><br>📧 이메일: <a href="mailto:support@nvoim.com" style="color: #667eea; text-decoration: none;">support@nvoim.com</a><br>💬 카카오톡: <a href="http://pf.kakao.com/_nvoim_planner" style="color: #667eea; text-decoration: none;">@nvoim_planner</a></p></div></div><div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;"><p style="margin: 0;">이 이메일은 엔보임 플래너 프로 라이선스 구매 시 자동으로 발송됩니다.</p><p style="margin: 10px 0 0 0;">© 2026 엔보임 플래너 프로. All rights reserved.</p></div></div></body></html>';

    await transporter.sendMail({
      from: '엔보임 플래너 프로 <' + process.env.GMAIL_USER + '>',
      to: to,
      subject: '🎉 [엔보임 플래너 프로] 라이선스 발급 완료 - ' + orderId,
      html: emailHTML
    });

    console.log('[License Email] Sent successfully to:', to);
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('[License Email] Send error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error.message },
      { status: 500 }
    );
  }
}
