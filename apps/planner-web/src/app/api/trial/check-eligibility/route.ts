import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(req: NextRequest) {
  try {
    const { device_fingerprint } = await req.json()

    if (!device_fingerprint) {
      return NextResponse.json(
        { error: 'Device fingerprint is required' },
        { status: 400 }
      )
    }

    // Service Role 클라이언트 생성 (RLS 우회)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // 디바이스 핑거프린트가 이미 존재하는지 확인
    console.log('🔍 [CHECK-ELIGIBILITY] Checking fingerprint:', device_fingerprint.substring(0, 16) + '...')
    console.log('🔍 [CHECK-ELIGIBILITY] Supabase URL:', supabaseUrl)

    const { data: existingDevice, error: checkError } = await supabase
      .from('trial_device_fingerprints')
      .select('id, first_trial_at')
      .eq('device_fingerprint', device_fingerprint)
      .single()

    console.log('🔍 [CHECK-ELIGIBILITY] Query result:', { existingDevice, checkError: checkError?.code })

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 = 결과 없음 (정상)
      console.error('Error checking trial eligibility:', checkError)
      return NextResponse.json(
        { error: 'Failed to check trial eligibility' },
        { status: 500 }
      )
    }

    // 이미 체험 라이선스를 사용한 디바이스
    if (existingDevice) {
      console.log('❌ [CHECK-ELIGIBILITY] Device already used trial:', existingDevice)
      return NextResponse.json({
        eligible: false,
        reason: 'already_used',
        first_trial_at: existingDevice.first_trial_at,
      })
    }

    console.log('✅ [CHECK-ELIGIBILITY] Device eligible for trial')

    // 체험 자격 있음
    return NextResponse.json({
      eligible: true,
    })
  } catch (error) {
    console.error('Error in check-eligibility:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
