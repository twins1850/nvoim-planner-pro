import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/send-email';
import { sendSMS, getSMSTemplate } from '@/lib/send-sms';
import {
  getTrialReminder7Days,
  getTrialReminder3Days,
  getTrialReminder1Day,
  getTrialExpired,
} from '@/lib/email-templates';

/**
 * POST /api/admin/email-logs/resend
 * 이메일 재발송
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 관리자 권한 확인
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 요청 바디
    const body = await request.json();
    const { notificationId } = body;

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    // 알림 정보 조회
    const { data: notification, error: notificationError } = await supabase
      .from('trial_notifications')
      .select(
        `
        id,
        license_id,
        planner_id,
        notification_type,
        email,
        phone_number,
        licenses:license_id (
          trial_expires_at
        ),
        profiles:planner_id (
          full_name,
          phone_number
        )
      `
      )
      .eq('id', notificationId)
      .single();

    if (notificationError || !notification) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    // 이메일 템플릿 데이터 준비
    const license = Array.isArray(notification.licenses)
      ? notification.licenses[0]
      : notification.licenses;
    const notifProfile = Array.isArray(notification.profiles)
      ? notification.profiles[0]
      : notification.profiles;

    const expiresAt = new Date(license.trial_expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const emailData = {
      userName: notifProfile?.full_name || 'NVOIM Planner 사용자',
      daysRemaining: Math.max(0, daysRemaining),
      expiresAt: expiresAt.toISOString(),
      dashboardUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.nplannerpro.com'}/dashboard`,
      upgradeUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'https://www.nplannerpro.com'}/upgrade`,
    };

    // 이메일 템플릿 선택
    let emailTemplate;
    switch (notification.notification_type) {
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
      default:
        return NextResponse.json(
          { error: 'Invalid notification type' },
          { status: 400 }
        );
    }

    // 이메일 발송
    const emailResult = await sendEmail({
      to: notification.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text,
    });

    // SMS 발송 (전화번호가 있는 경우)
    let smsResult: { success: boolean; messageId?: string; error?: string } = { success: false };
    const phoneNumber = notification.phone_number || notifProfile?.phone_number;

    if (phoneNumber) {
      const smsMessage = getSMSTemplate(notification.notification_type as any, emailData);
      smsResult = await sendSMS({
        to: phoneNumber,
        message: smsMessage,
      });
    }

    // 발송 결과 업데이트
    const updateData: any = {
      sent_at: new Date().toISOString(),
      email_sent: emailResult.success,
      error_message: emailResult.error || null,
    };

    if (phoneNumber) {
      updateData.sms_sent = smsResult.success;
      updateData.sms_sent_at = smsResult.success ? new Date().toISOString() : null;
      updateData.sms_error_message = smsResult.error || null;
    }

    const { error: updateError } = await supabase
      .from('trial_notifications')
      .update(updateData)
      .eq('id', notificationId);

    if (updateError) {
      console.error('[API] Failed to update notification:', updateError);
    }

    if (!emailResult.success && (!phoneNumber || !smsResult.success)) {
      return NextResponse.json(
        {
          success: false,
          error: emailResult.error || smsResult.error || 'Failed to send notification',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Notification resent successfully (Email: ${emailResult.success ? '✅' : '❌'}, SMS: ${smsResult.success ? '✅' : '❌'})`,
      emailMessageId: emailResult.messageId,
      smsSuccess: smsResult.success,
    });
  } catch (error: any) {
    console.error('[API] Email resend error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to resend email' },
      { status: 500 }
    );
  }
}
