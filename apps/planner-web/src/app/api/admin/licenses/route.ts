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

export async function GET(req: NextRequest) {
  try {
    // 1. Admin password verification
    const adminPassword = req.headers.get('X-Admin-Password');

    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse query parameters
    const searchParams = req.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'created_at';

    // 3. Use Service Role client
    const supabaseAdmin = createServiceRoleClient();

    // 4. Build query with filters
    let query = supabaseAdmin
      .from('licenses')
      .select('*', { count: 'exact' });

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply search filter (license key or email)
    if (search) {
      query = query.or(`license_key.ilike.%${search}%`);
    }

    // 5. Apply sorting
    const sortOrder: { [key: string]: boolean } = {
      'created_at': false, // descending (newest first)
      'expires_at': true,  // ascending (earliest expiry first)
      'status': true       // ascending (alphabetical)
    };

    query = query.order(sort, { ascending: sortOrder[sort] ?? false });

    // 6. Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    // 7. Execute query
    const { data: licenses, error, count } = await query;

    if (error) {
      console.error('License query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch licenses', details: error.message },
        { status: 500 }
      );
    }

    // 8. Calculate device count for each license
    const licensesWithDeviceCount = licenses?.map(license => ({
      ...license,
      device_count: Array.isArray(license.device_tokens)
        ? license.device_tokens.length
        : 0
    })) || [];

    // 9. Return paginated results
    return NextResponse.json({
      success: true,
      licenses: licensesWithDeviceCount,
      pagination: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error: any) {
    console.error('Licenses API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
