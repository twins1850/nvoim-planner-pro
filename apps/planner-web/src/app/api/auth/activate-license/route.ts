import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { licenseKey } = await request.json();
    const deviceFingerprint = request.headers.get('x-device-fingerprint');

    if (!deviceFingerprint) {
      return NextResponse.json(
        { error: '디바이스 정보가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. 라이선스 키 검증
    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .select('*')
      .eq('license_key', licenseKey)
      .single();

    if (licenseError || !license) {
      return NextResponse.json(
        { error: '유효하지 않은 라이선스 키입니다.' },
        { status: 404 }
      );
    }

    // 2. 상태 확인
    if (license.status === 'expired') {
      return NextResponse.json(
        { error: '만료된 라이선스입니다.' },
        { status: 403 }
      );
    }

    if (license.status === 'active' && license.planner_id) {
      return NextResponse.json(
        { error: '이미 다른 사용자가 사용 중인 라이선스입니다.' },
        { status: 403 }
      );
    }

    // 3. 디바이스 등록
    const deviceTokens = license.device_tokens || [];
    const existingDevice = deviceTokens.find(
      (d: any) => d.fingerprint === deviceFingerprint
    );

    if (!existingDevice) {
      // 최대 디바이스 수 확인
      if (deviceTokens.length >= (license.max_devices || 2)) {
        return NextResponse.json({
          error: `최대 ${license.max_devices}개의 디바이스만 등록할 수 있습니다.`,
          devices: deviceTokens
        }, { status: 403 });
      }

      // 새 디바이스 추가
      deviceTokens.push({
        fingerprint: deviceFingerprint,
        registered_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
        user_agent: request.headers.get('user-agent') || '',
        description: ''
      });

      await supabase
        .from('licenses')
        .update({ device_tokens: deviceTokens })
        .eq('id', license.id);
    } else {
      // 기존 디바이스 last_seen 업데이트
      existingDevice.last_seen = new Date().toISOString();

      await supabase
        .from('licenses')
        .update({ device_tokens: deviceTokens })
        .eq('id', license.id);
    }

    // 4. 임시 활성화 토큰 생성 (5분 유효)
    const activationToken = crypto.randomUUID();

    // 임시 세션 저장 (Supabase에 임시 테이블 또는 Redis 사용)
    // 여기서는 간단히 JWT 형태로 생성
    const tokenData = {
      token: activationToken,
      licenseId: license.id,
      licenseKey: license.license_key,
      deviceFingerprint,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5분
    };

    // 실제로는 암호화하여 저장해야 함
    const encodedToken = Buffer.from(JSON.stringify(tokenData)).toString('base64');

    return NextResponse.json({
      success: true,
      activationToken: encodedToken,
      license: {
        durationDays: license.duration_days,
        maxStudents: license.max_students
      }
    });

  } catch (error: any) {
    console.error('License activation error:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.', details: error.message },
      { status: 500 }
    );
  }
}
