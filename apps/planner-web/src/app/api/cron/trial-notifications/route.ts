import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/send-email';
import {
  getTrialReminder7Days,
  getTrialReminder3Days,
  getTrialReminder1Day,
  getTrialExpired,
} from '@/lib/email-templates';

/**
 * Trial 만료 알림 Cron Job
 *
 * Vercel Cron으로 매일 오전 9시에 실행
 * vercel.json에 cron 설정 필요:
 * {
 *   "crons": [{
 *     "path": "/api/cron/trial-notifications",
 *     "schedule": "0 9 * * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Cron secret 검증 (Vercel Cron에서 자동으로 전달)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (process.env.NODE_ENV === 'production' && authHeader !== expectedAuth) {
      console.error('❌ [CRON] Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🔔 [CRON] Starting trial notification check...');

    // Service Role 클라이언트 생성
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [CRON] Missing Supabase credentials');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // 현재 시간
    const now = new Date();
    console.log(`🕐 [CRON] Current time: ${now.toISOString()}`);

    // 활성화된 trial 라이선스 조회
    const { data: trialLicenses, error: fetchError } = await supabase
      .from('licenses')
      .select(`
        id,
        license_key,
        planner_id,
        trial_expires_at,
        is_trial,
        status,
        profiles:planner_id (
          id,
          email,
          full_name
        )
      `)
      .eq('is_trial', true)
      .eq('status', 'trial')
      .not('planner_id', 'is', null)
      .not('trial_expires_at', 'is', null);

    if (fetchError) {
      console.error('❌ [CRON] Failed to fetch trial licenses:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    console.log(`📋 [CRON] Found ${trialLicenses?.length || 0} active trial licenses`);

    const results = {
      checked: 0,
      sent: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[],
    };

    // 각 trial 라이선스 확인
    for (const license of trialLicenses || []) {
      results.checked++;

      const profile = Array.isArray(license.profiles) ? license.profiles[0] : license.profiles;

      if (!profile || !profile.email) {
        console.log(`⚠️  [CRON] Skipping license ${license.id}: no profile or email`);
        results.skipped++;
        continue;
      }

      const expiresAt = new Date(license.trial_expires_at);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`📊 [CRON] License ${license.id}: ${daysRemaining} days remaining`);

      // 알림 타입 결정
      let notificationType: '7days' | '3days' | '1day' | 'expired' | null = null;

      if (daysRemaining === 7) {
        notificationType = '7days';
      } else if (daysRemaining === 3) {
        notificationType = '3days';
      } else if (daysRemaining === 1) {
        notificationType = '1day';
      } else if (daysRemaining <= 0) {
        notificationType = 'expired';
      }

      if (!notificationType) {
        console.log(`⏭️  [CRON] License ${license.id}: No notification needed (${daysRemaining} days)`);
        results.skipped++;
        continue;
      }

      // 이미 발송한 알림인지 확인
      const { data: existingNotification } = await supabase
        .from('trial_notifications')
        .select('id, sent_at, email_sent')
        .eq('license_id', license.id)
        .eq('notification_type', notificationType)
        .single();

      if (existingNotification && existingNotification.email_sent) {
        console.log(`✅ [CRON] License ${license.id}: ${notificationType} already sent`);
        results.skipped++;
        continue;
      }

      // 이메일 템플릿 선택
      const emailData = {
        userName: profile.full_name || 'NVOIM Planner 사용자',
        daysRemaining,
        expiresAt: expiresAt.toISOString(),
        dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nvoim-planner-pro.vercel.app'}/dashboard`,
        upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://nvoim-planner-pro.vercel.app'}/license/upgrade`,
      };

      let emailTemplate;
      switch (notificationType) {
        case '7days':
          emailTemplate = getTrialReminder7Days(emailData);
          break;
        case '3days':
          emailTemplate = getTrialReminder3Days(emailData);
          break;
        case '1day':
          emailTemplate = getTrialReminder1Day(emailData);
          break;
        case 'expired':
          emailTemplate = getTrialExpired(emailData);
          break;
      }

      // 이메일 발송
      console.log(`📧 [CRON] Sending ${notificationType} notification to ${profile.email}`);

      const emailResult = await sendEmail({
        to: profile.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      });

      // 알림 기록 저장
      const { error: saveError } = await supabase
        .from('trial_notifications')
        .upsert({
          license_id: license.id,
          planner_id: license.planner_id,
          notification_type: notificationType,
          email: profile.email,
          email_sent: emailResult.success,
          error_message: emailResult.error || null,
          sent_at: new Date().toISOString(),
        }, {
          onConflict: 'license_id,notification_type',
        });

      if (saveError) {
        console.error(`❌ [CRON] Failed to save notification record:`, saveError);
      }

      if (emailResult.success) {
        console.log(`✅ [CRON] Notification sent successfully: ${notificationType} to ${profile.email}`);
        results.sent++;
        results.details.push({
          license_id: license.id,
          email: profile.email,
          type: notificationType,
          status: 'sent',
        });
      } else {
        console.error(`❌ [CRON] Failed to send notification:`, emailResult.error);
        results.errors++;
        results.details.push({
          license_id: license.id,
          email: profile.email,
          type: notificationType,
          status: 'failed',
          error: emailResult.error,
        });
      }
    }

    console.log(`✅ [CRON] Trial notification check completed`);
    console.log(`📊 [CRON] Stats: checked=${results.checked}, sent=${results.sent}, skipped=${results.skipped}, errors=${results.errors}`);

    return NextResponse.json({
      success: true,
      timestamp: now.toISOString(),
      stats: {
        checked: results.checked,
        sent: results.sent,
        skipped: results.skipped,
        errors: results.errors,
      },
      details: results.details,
    });

  } catch (error: any) {
    console.error('❌ [CRON] Unexpected error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
