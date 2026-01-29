import { NextRequest, NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

/**
 * 테스트 데이터 삭제 API (개발 환경 전용)
 * Service Role Key를 사용하여 RLS를 우회하고 테스트 데이터를 삭제합니다.
 *
 * IMPORTANT: 이 API는 개발 환경에서만 사용해야 합니다!
 */
export async function POST(request: NextRequest) {
  try {
    // 개발 환경 체크
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, error: 'This API is only available in development' },
        { status: 403 }
      );
    }

    console.log('🧹 [CLEAR-TEST-DATA] Starting test data cleanup...');

    // Service Role 클라이언트 생성 (RLS 우회)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ [CLEAR-TEST-DATA] Missing Supabase credentials');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey);

    // 1. trial_device_fingerprints 삭제
    console.log('🗑️  [CLEAR-TEST-DATA] Deleting trial_device_fingerprints...');

    const { data: deletedFingerprints, error: fingerprintError } = await supabase
      .from('trial_device_fingerprints')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (workaround for "delete all" syntax)
      .select();

    if (fingerprintError && fingerprintError.code !== 'PGRST116') {
      console.error('❌ [CLEAR-TEST-DATA] Fingerprint deletion error:', fingerprintError);
    } else {
      const count = deletedFingerprints?.length || 0;
      console.log(`✅ [CLEAR-TEST-DATA] Deleted ${count} fingerprints`);
    }

    // 2. testuser로 시작하는 사용자 확인
    console.log('🔍 [CLEAR-TEST-DATA] Finding test users...');

    const { data: testUsers, error: userError } = await supabase
      .from('profiles')
      .select('id, email')
      .like('email', 'testuser%')
      .or('email.like.finaltest%,email.like.localtest%');

    if (userError) {
      console.log('⚠️  [CLEAR-TEST-DATA] User lookup error:', userError.code);
    } else {
      console.log(`📋 [CLEAR-TEST-DATA] Found ${testUsers?.length || 0} test users`);
    }

    // 3. trial 라이선스에서 device_tokens 초기화
    console.log('🔄 [CLEAR-TEST-DATA] Resetting trial license device_tokens...');

    const { data: updatedLicenses, error: licenseError } = await supabase
      .from('licenses')
      .update({ device_tokens: '[]' })
      .eq('is_trial', true)
      .select('id');

    if (licenseError) {
      console.error('❌ [CLEAR-TEST-DATA] License update error:', licenseError);
    } else {
      const count = updatedLicenses?.length || 0;
      console.log(`✅ [CLEAR-TEST-DATA] Reset ${count} trial licenses`);
    }

    // 4. 최종 확인
    console.log('🔍 [CLEAR-TEST-DATA] Verifying cleanup...');

    const { count: remainingFingerprints, error: countError } = await supabase
      .from('trial_device_fingerprints')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ [CLEAR-TEST-DATA] Count error:', countError);
    } else {
      console.log(`📊 [CLEAR-TEST-DATA] Remaining fingerprints: ${remainingFingerprints || 0}`);
    }

    console.log('✅✅✅ [CLEAR-TEST-DATA] Cleanup complete!\n');

    return NextResponse.json({
      success: true,
      deleted: {
        fingerprints: deletedFingerprints?.length || 0,
        licenses_reset: updatedLicenses?.length || 0,
      },
      remaining: {
        fingerprints: remainingFingerprints || 0,
      },
      test_users: testUsers?.map(u => u.email) || [],
    });

  } catch (error: any) {
    console.error('❌ [CLEAR-TEST-DATA] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
