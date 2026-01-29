import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * Trial 라이선스 활성화 API
 * Service Role Key를 사용하여 RLS를 우회하고 라이선스를 활성화합니다.
 */
export async function POST(request: NextRequest) {
  try {
    const { license_key, planner_id } = await request.json();

    console.log('🔐 [ACTIVATE-LICENSE] Activating license:', {
      license_key: license_key?.substring(0, 10) + '...',
      planner_id: planner_id?.substring(0, 8) + '...',
    });

    // 입력 검증
    if (!license_key || !planner_id) {
      console.log('❌ [ACTIVATE-LICENSE] Missing required fields');
      return NextResponse.json(
        { success: false, error: 'license_key and planner_id are required' },
        { status: 400 }
      );
    }

    // Service Role 클라이언트 생성 (RLS 우회)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [ACTIVATE-LICENSE] Missing Supabase credentials');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    console.log('🔍 [ACTIVATE-LICENSE] Finding license...');

    // 1. 라이선스 존재 여부 확인
    const { data: license, error: findError } = await supabase
      .from('licenses')
      .select('id, planner_id, status, is_trial')
      .eq('license_key', license_key)
      .single();

    if (findError || !license) {
      console.log('❌ [ACTIVATE-LICENSE] License not found:', findError);
      return NextResponse.json(
        { success: false, error: 'License not found' },
        { status: 404 }
      );
    }

    console.log('✅ [ACTIVATE-LICENSE] License found:', {
      id: license.id,
      current_planner_id: license.planner_id,
      status: license.status,
      is_trial: license.is_trial,
    });

    // 2. 이미 다른 사용자가 활성화한 경우 체크
    if (license.planner_id && license.planner_id !== planner_id) {
      console.log('⚠️  [ACTIVATE-LICENSE] License already activated by another user');
      return NextResponse.json(
        { success: false, error: 'License already activated by another user' },
        { status: 409 }
      );
    }

    // 3. 기존 활성 라이선스 비활성화 (optional - business logic)
    console.log('🔄 [ACTIVATE-LICENSE] Deactivating old licenses...');

    const { error: deactivateError } = await supabase
      .from('licenses')
      .update({
        status: 'superseded',
        updated_at: new Date().toISOString(),
      })
      .eq('planner_id', planner_id)
      .eq('status', 'active');

    if (deactivateError) {
      console.log('⚠️  [ACTIVATE-LICENSE] Failed to deactivate old licenses:', deactivateError);
      // Continue anyway
    }

    // 4. 라이선스 활성화
    console.log('⚡ [ACTIVATE-LICENSE] Activating license...');

    const { data: updated, error: updateError } = await supabase
      .from('licenses')
      .update({
        planner_id: planner_id,
        status: license.is_trial ? 'trial' : 'active',
        activated_at: new Date().toISOString(),
        activated_by_user_id: planner_id,
      })
      .eq('id', license.id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ [ACTIVATE-LICENSE] Update failed:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to activate license: ' + updateError.message },
        { status: 500 }
      );
    }

    console.log('✅✅✅ [ACTIVATE-LICENSE] License activated successfully!');
    console.log('   License ID:', updated.id);
    console.log('   Planner ID:', updated.planner_id);
    console.log('   Status:', updated.status);
    console.log('   Activated at:', updated.activated_at);

    return NextResponse.json({
      success: true,
      license: {
        id: updated.id,
        license_key: updated.license_key,
        status: updated.status,
        activated_at: updated.activated_at,
      },
    });

  } catch (error: any) {
    console.error('❌ [ACTIVATE-LICENSE] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
