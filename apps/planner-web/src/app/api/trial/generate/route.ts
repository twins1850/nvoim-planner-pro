import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 체험 라이선스 설정
const TRIAL_DURATION_DAYS = 7
const TRIAL_MAX_STUDENTS = 5

/**
 * 체험 라이선스 키 생성 (7D-5P-XXXXXX)
 */
function generateTrialLicenseKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 혼동되기 쉬운 문자 제외 (I,O,0,1)
  let key = ''
  for (let i = 0; i < 6; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `${TRIAL_DURATION_DAYS}D-${TRIAL_MAX_STUDENTS}P-${key}`
}

export async function POST(req: NextRequest) {
  try {
    const {
      device_fingerprint,
      user_email,
      ip_address,
      user_agent,
    } = await req.json()

    if (!device_fingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint is required' },
        { status: 400 }
      )
    }

    // Service Role 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 1. 자격 확인 - 이미 체험 라이선스를 사용했는지 확인
    const { data: existingDevice, error: checkError } = await supabase
      .from('trial_device_fingerprints')
      .select('id, first_trial_at')
      .eq('device_fingerprint', device_fingerprint)
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking trial eligibility:', checkError)
      return NextResponse.json(
        { error: 'Failed to check trial eligibility' },
        { status: 500 }
      )
    }

    if (existingDevice) {
      return NextResponse.json(
        {
          error: 'Trial already used',
          reason: 'already_used',
          first_trial_at: existingDevice.first_trial_at,
        },
        { status: 403 }
      )
    }

    // 2. 체험 라이선스 생성
    const licenseKey = generateTrialLicenseKey()
    const now = new Date()
    const expiresAt = new Date(now)
    expiresAt.setDate(expiresAt.getDate() + TRIAL_DURATION_DAYS)

    const { data: license, error: licenseError } = await supabase
      .from('licenses')
      .insert({
        license_key: licenseKey,
        max_students: TRIAL_MAX_STUDENTS,
        duration_days: TRIAL_DURATION_DAYS,
        status: 'trial',
        is_trial: true,
        trial_started_at: now.toISOString(),
        trial_expires_at: expiresAt.toISOString(),
        device_tokens: [device_fingerprint], // 디바이스 바인딩
      })
      .select()
      .single()

    if (licenseError) {
      console.error('Error creating trial license:', licenseError)
      return NextResponse.json(
        { error: 'Failed to create trial license' },
        { status: 500 }
      )
    }

    // 3. 디바이스 핑거프린트 기록 (중복 방지)
    const { error: fingerprintError } = await supabase
      .from('trial_device_fingerprints')
      .insert({
        device_fingerprint,
        first_trial_at: now.toISOString(),
        trial_user_email: user_email || null,
        trial_license_id: license.id,
        ip_address: ip_address || null,
        user_agent: user_agent || null,
      })

    if (fingerprintError) {
      console.error('Error recording device fingerprint:', fingerprintError)
      // 라이선스는 이미 생성되었으므로 롤백하지 않고 계속 진행
      // (디바이스 핑거프린트 기록 실패는 치명적이지 않음)
    }

    // 4. 성공 응답
    return NextResponse.json({
      success: true,
      license: {
        license_key: license.license_key,
        max_students: license.max_students,
        duration_days: license.duration_days,
        status: license.status,
        trial_expires_at: license.trial_expires_at,
      },
    })
  } catch (error) {
    console.error('Error generating trial license:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
