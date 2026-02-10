import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import nodemailer from 'nodemailer';
import { NextRequest, NextResponse } from 'next/server';
import {
  sendSMS,
  getSMSTemplate,
  sendKakaoAlimtalk,
  getKakaoAlimtalkVariables,
  getKakaoTemplateId,
} from '@/lib/send-sms';

/**
 * 체험 만료 알림 이메일 발송 API
 *
 * Cron Job으로 매일 실행되어 만료 3일 전 사용자에게 알림 이메일 발송
 * Vercel Cron 또는 외부 Cron 서비스에서 호출
 *
 * @param req - GET 또는 POST 요청
 * @returns 발송 결과
 */
export async function GET(req: NextRequest) {
  return handleTrialExpiryReminder(req);
}

export async function POST(req: NextRequest) {
  return handleTrialExpiryReminder(req);
}

async function handleTrialExpiryReminder(req: NextRequest) {
  try {
    // Cron Secret 검증 (보안)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'default-secret';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Service Role 클라이언트 생성 (RLS 우회)
    const supabaseAdmin = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // 만료 3일 전 라이선스 조회
    const threeDaysLater = new Date();
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    threeDaysLater.setHours(23, 59, 59, 999);

    const twoDaysLater = new Date();
    twoDaysLater.setDate(twoDaysLater.getDate() + 2);
    twoDaysLater.setHours(0, 0, 0, 0);

    // 만료 2-3일 전 체험 라이선스 조회 (알림 미발송)
    const { data: licenses, error } = await supabaseAdmin
      .from('licenses')
      .select(
        `
        id,
        license_key,
        trial_expires_at,
        max_students,
        trial_notification_sent,
        planner_id,
        profiles:planner_id (
          full_name,
          email,
          phone_number
        )
      `
      )
      .eq('is_trial', true)
      .eq('status', 'trial')
      .gte('trial_expires_at', twoDaysLater.toISOString())
      .lte('trial_expires_at', threeDaysLater.toISOString())
      .eq('trial_notification_sent', false);

    if (error) {
      console.error('[Trial Expiry Reminder] Database error:', error);
      return NextResponse.json({ error: 'Database error', details: error.message }, { status: 500 });
    }

    if (!licenses || licenses.length === 0) {
      console.log('[Trial Expiry Reminder] No licenses to notify');
      return NextResponse.json({ success: true, notified: 0 });
    }

    // Gmail SMTP 설정
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      console.error('[Trial Expiry Reminder] Gmail credentials not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    let notifiedCount = 0;
    const errors: string[] = [];

    // 각 라이선스에 대해 이메일 발송
    for (const license of licenses) {
      try {
        const profile = (license as any).profiles;
        if (!profile || !profile.email) {
          console.warn(`[Trial Expiry Reminder] No email for license ${license.id}`);
          continue;
        }

        const expiresAt = new Date(license.trial_expires_at);
        const daysLeft = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        // 이메일 HTML 템플릿
        const emailHTML = `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; background-color: #ffffff;">

    <!-- 헤더 -->
    <div style="background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); padding: 30px 20px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">⏰ 체험 기간 만료 예정</h1>
    </div>

    <!-- 본문 -->
    <div style="padding: 30px 20px; background-color: #f9fafb; border-radius: 0 0 12px 12px;">

      <p style="font-size: 16px; color: #374151; margin-bottom: 20px;">
        안녕하세요, <strong>${profile.full_name || '선생님'}</strong>님!
      </p>

      <p style="font-size: 16px; color: #374151; margin-bottom: 30px;">
        <strong>엔보임 플래너 프로</strong> 무료 체험 기간이 <strong style="color: #dc2626;">${daysLeft}일</strong> 남았습니다.
      </p>

      <!-- 만료 정보 박스 -->
      <div style="background: #fff7ed; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="font-size: 18px; color: #92400e; margin: 0 0 15px 0;">📋 체험 라이선스 정보</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #78350f; font-size: 14px;">학생 수</td>
            <td style="padding: 8px 0; color: #92400e; font-size: 14px; text-align: right;"><strong>${license.max_students}명</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #78350f; font-size: 14px;">만료일</td>
            <td style="padding: 8px 0; color: #dc2626; font-size: 14px; text-align: right;"><strong>${expiresAt.toLocaleDateString('ko-KR')}</strong></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #78350f; font-size: 14px;">남은 기간</td>
            <td style="padding: 8px 0; color: #dc2626; font-size: 14px; text-align: right;"><strong>${daysLeft}일</strong></td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="background: #fef2f2; border-left: 4px solid #dc2626; border-radius: 8px; padding: 20px; margin-bottom: 30px;">
        <h3 style="font-size: 18px; color: #991b1b; margin: 0 0 15px 0;">💡 계속 사용하시려면?</h3>
        <p style="margin: 0 0 15px 0; color: #7f1d1d; font-size: 14px;">
          체험이 만료되기 전에 정식 라이선스로 업그레이드하세요!
        </p>
        <div style="text-align: center; margin-top: 20px;">
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/upgrade" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 8px; font-size: 16px; font-weight: bold;">
            지금 업그레이드하기 →
          </a>
        </div>
      </div>

      <!-- 혜택 안내 -->
      <div style="background: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
        <h3 style="font-size: 18px; color: #111827; margin: 0 0 15px 0;">✨ 정식 라이선스 혜택</h3>
        <ul style="margin: 0; padding-left: 20px; color: #374151; font-size: 14px;">
          <li style="margin-bottom: 8px;">무제한 학생 관리 (플랜별)</li>
          <li style="margin-bottom: 8px;">AI 피드백 무제한 사용</li>
          <li style="margin-bottom: 8px;">숙제 및 과제 관리</li>
          <li style="margin-bottom: 8px;">학습 진도 추적</li>
          <li style="margin-bottom: 8px;">성적 분석 리포트</li>
          <li style="margin-bottom: 8px;">우선 기술 지원</li>
        </ul>
      </div>

      <!-- 고객 지원 -->
      <div style="background: #ffffff; border-radius: 8px; padding: 20px;">
        <h3 style="font-size: 18px; color: #111827; margin: 0 0 15px 0;">💬 문의하기</h3>
        <p style="font-size: 14px; color: #6b7280; margin: 0;">
          궁금한 점이 있으시면 언제든 연락주세요:<br><br>
          📧 이메일: <a href="mailto:support@nplannerpro.com" style="color: #667eea; text-decoration: none;">support@nplannerpro.com</a><br>
          📞 전화: <a href="tel:010-1234-5678" style="color: #667eea; text-decoration: none;">010-1234-5678</a><br>
          💬 카카오톡: <a href="http://pf.kakao.com/_nvoim_planner" style="color: #667eea; text-decoration: none;">@nvoim_planner</a>
        </p>
      </div>

    </div>

    <!-- 푸터 -->
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">이 이메일은 체험 기간 만료 알림입니다.</p>
      <p style="margin: 10px 0 0 0;">© 2026 엔보임 플래너 프로. All rights reserved.</p>
    </div>

  </div>
</body>
</html>`;

        // 알림 타입 결정 (daysLeft 기준)
        let notificationType: '7days' | '3days' | '1day' | 'expired';
        if (daysLeft >= 7) {
          notificationType = '7days';
        } else if (daysLeft >= 3) {
          notificationType = '3days';
        } else if (daysLeft >= 1) {
          notificationType = '1day';
        } else {
          notificationType = 'expired';
        }

        // 이메일 발송
        let emailSent = false;
        let emailError: string | null = null;
        try {
          await transporter.sendMail({
            from: `엔보임 플래너 프로 <${process.env.GMAIL_USER}>`,
            to: profile.email,
            subject: `⏰ [엔보임 플래너 프로] 체험 기간 만료 ${daysLeft}일 전 안내`,
            html: emailHTML,
          });
          emailSent = true;
          console.log(`[Trial Expiry Reminder] Email sent to ${profile.email}`);
        } catch (err: any) {
          emailError = err.message;
          console.error(`[Trial Expiry Reminder] Email failed:`, err);
        }

        // SMS 발송
        let smsSent = false;
        let smsError: string | null = null;
        if (profile.phone_number) {
          try {
            const smsMessage = getSMSTemplate(notificationType, {
              userName: profile.full_name || '선생님',
              daysRemaining: daysLeft,
              expiresAt: expiresAt.toISOString(),
            });

            const smsResult = await sendSMS({
              to: profile.phone_number,
              message: smsMessage,
            });

            smsSent = smsResult.success;
            smsError = smsResult.error || null;

            if (smsResult.success) {
              console.log(`[Trial Expiry Reminder] SMS sent to ${profile.phone_number}`);
            } else {
              console.error(`[Trial Expiry Reminder] SMS failed:`, smsResult.error);
            }
          } catch (err: any) {
            smsError = err.message;
            console.error(`[Trial Expiry Reminder] SMS error:`, err);
          }
        } else {
          console.log(`[Trial Expiry Reminder] No phone number for ${profile.email}`);
        }

        // 카카오톡 알림톡 발송 (SMS보다 우선 순위 높음, 비용 절감)
        let kakaoSent = false;
        let kakaoError: string | null = null;
        if (profile.phone_number) {
          try {
            const templateId = getKakaoTemplateId(notificationType);

            if (templateId) {
              const variables = getKakaoAlimtalkVariables(notificationType, {
                userName: profile.full_name || '선생님',
                daysRemaining: daysLeft,
                expiresAt: expiresAt.toLocaleDateString('ko-KR'),
              });

              const kakaoResult = await sendKakaoAlimtalk({
                to: profile.phone_number,
                templateId,
                variables,
              });

              kakaoSent = kakaoResult.success;
              kakaoError = kakaoResult.error || null;

              if (kakaoResult.success) {
                console.log(
                  `[Trial Expiry Reminder] KakaoTalk sent to ${profile.phone_number}`
                );
                // 카카오톡 발송 성공 시 SMS 발송 스킵 (비용 절감)
                // smsSent = false;
              } else {
                console.error(
                  `[Trial Expiry Reminder] KakaoTalk failed:`,
                  kakaoResult.error
                );
              }
            } else {
              console.log(
                `[Trial Expiry Reminder] No KakaoTalk template ID configured for ${notificationType}`
              );
              // 템플릿 ID가 없으면 SMS 발송으로 대체 (위에서 이미 발송됨)
            }
          } catch (err: any) {
            kakaoError = err.message;
            console.error(`[Trial Expiry Reminder] KakaoTalk error:`, err);
          }
        }

        // trial_notifications 테이블에 로그 저장
        await supabaseAdmin.from('trial_notifications').insert({
          license_id: license.id,
          planner_id: license.planner_id,
          notification_type: notificationType,
          email: profile.email,
          phone_number: profile.phone_number || null,
          email_sent: emailSent,
          sms_sent: smsSent,
          kakao_sent: kakaoSent,
          sent_at: new Date().toISOString(),
          error_message: emailError,
          sms_error_message: smsError,
          kakao_error_message: kakaoError,
        });

        // 알림 발송 플래그 업데이트
        await supabaseAdmin
          .from('licenses')
          .update({
            trial_notification_sent: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', license.id);

        notifiedCount++;
        console.log(`[Trial Expiry Reminder] Notification sent (${daysLeft} days left)`);
      } catch (emailError: any) {
        console.error(`[Trial Expiry Reminder] Failed to send email for license ${license.id}:`, emailError);
        errors.push(`License ${license.id}: ${emailError.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      notified: notifiedCount,
      total: licenses.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Trial Expiry Reminder] Error:', error);
    return NextResponse.json(
      { error: 'Failed to send trial expiry reminders', details: error.message },
      { status: 500 }
    );
  }
}
