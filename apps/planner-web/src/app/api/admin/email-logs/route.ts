import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/admin/email-logs
 * 이메일 발송 로그 조회
 */
export async function GET(request: NextRequest) {
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

    // 쿼리 파라미터
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const status = searchParams.get('status'); // 'success' | 'failed' | null

    // 이메일 로그 조회
    let query = supabase
      .from('trial_notifications')
      .select(
        `
        id,
        license_id,
        planner_id,
        notification_type,
        sent_at,
        email,
        email_sent,
        error_message,
        phone_number,
        sms_sent,
        sms_sent_at,
        sms_error_message,
        created_at,
        licenses:license_id (
          license_key,
          trial_expires_at
        ),
        profiles:planner_id (
          full_name
        )
      `,
        { count: 'exact' }
      )
      .order('sent_at', { ascending: false });

    // 상태 필터
    if (status === 'success') {
      query = query.eq('email_sent', true);
    } else if (status === 'failed') {
      query = query.eq('email_sent', false);
    }

    // 페이지네이션
    query = query.range(offset, offset + limit - 1);

    const { data: logs, error, count } = await query;

    if (error) throw error;

    // 통계 계산
    const { data: stats } = await supabase
      .from('trial_notifications')
      .select('email_sent, sms_sent, error_message, sms_error_message');

    const totalSent = stats?.length || 0;
    const emailSuccessCount = stats?.filter((s) => s.email_sent).length || 0;
    const emailFailedCount = stats?.filter((s) => !s.email_sent).length || 0;
    const emailSuccessRate = totalSent > 0 ? (emailSuccessCount / totalSent) * 100 : 0;

    const smsSuccessCount = stats?.filter((s) => s.sms_sent).length || 0;
    const smsFailedCount = stats?.filter((s) => s.sms_sent === false).length || 0;
    const smsSuccessRate = totalSent > 0 ? (smsSuccessCount / totalSent) * 100 : 0;

    return NextResponse.json({
      logs: logs || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
      },
      stats: {
        total: totalSent,
        emailSuccess: emailSuccessCount,
        emailFailed: emailFailedCount,
        emailSuccessRate: emailSuccessRate.toFixed(1),
        smsSuccess: smsSuccessCount,
        smsFailed: smsFailedCount,
        smsSuccessRate: smsSuccessRate.toFixed(1),
      },
    });
  } catch (error: any) {
    console.error('[API] Email logs error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch email logs' },
      { status: 500 }
    );
  }
}
