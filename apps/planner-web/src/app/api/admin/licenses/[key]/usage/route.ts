import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Supabase Service Role client (RLS bypass)
const createServiceRoleClient = () => {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

// Admin password verification
function verifyAdminPassword(req: NextRequest): boolean {
  const adminPassword = req.headers.get('X-Admin-Password');
  return adminPassword === process.env.ADMIN_PASSWORD;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    if (!verifyAdminPassword(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const licenseKey = params.key;
    const supabaseAdmin = createServiceRoleClient();

    // 1. Get license details
    const { data: license, error: licenseError } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (licenseError || !license) {
      return NextResponse.json(
        { error: 'License not found' },
        { status: 404 }
      );
    }

    // 2. Calculate usage days
    let total_days_used = 0;
    let remaining_days = 0;

    if (license.activated_at && license.expires_at) {
      const activatedDate = new Date(license.activated_at);
      const expiryDate = new Date(license.expires_at);
      const currentDate = new Date();

      // Total days from activation to expiry
      const totalDays = Math.ceil(
        (expiryDate.getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Days used from activation to now (or expiry if expired)
      const endDate = currentDate < expiryDate ? currentDate : expiryDate;
      total_days_used = Math.ceil(
        (endDate.getTime() - activatedDate.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Remaining days
      remaining_days = Math.max(
        0,
        Math.ceil((expiryDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))
      );
    } else {
      // Not activated yet
      remaining_days = license.duration_days || 0;
    }

    // 3. Parse device tokens
    const devices = Array.isArray(license.device_tokens)
      ? license.device_tokens.map((token: any) => ({
          fingerprint: token.fingerprint || token.device_fingerprint || 'Unknown',
          registered_at: token.registered_at || token.created_at || new Date().toISOString()
        }))
      : [];

    // 4. Get daily usage stats (last 30 days)
    let daily_stats: any[] = [];

    if (license.planner_id) {
      // Calculate date 30 days ago
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0];

      const { data: usageData, error: usageError } = await supabaseAdmin
        .from('usage_tracking')
        .select('*')
        .eq('planner_id', license.planner_id)
        .gte('tracked_date', fromDate)
        .order('tracked_date', { ascending: false });

      if (!usageError && usageData) {
        daily_stats = usageData.map((stat: any) => ({
          date: stat.tracked_date,
          student_count: stat.student_count || 0,
          homework_count: stat.homework_count || 0,
          message_count: stat.message_count || 0,
          storage_used_mb: parseFloat(stat.storage_used_mb || '0')
        }));
      }
    }

    // 5. Return comprehensive usage data
    return NextResponse.json({
      success: true,
      license: {
        id: license.id,
        license_key: license.license_key,
        duration_days: license.duration_days,
        max_students: license.max_students,
        status: license.status,
        planner_id: license.planner_id,
        activated_at: license.activated_at,
        expires_at: license.expires_at,
        created_at: license.created_at
      },
      usage: {
        total_days_used,
        remaining_days,
        devices,
        daily_stats
      }
    });

  } catch (error: any) {
    console.error('Get usage error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
