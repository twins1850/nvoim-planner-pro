import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 보호된 경로 확인
  const protectedPaths = ['/dashboard', '/homework', '/lessons', '/messages']
  const isProtectedPath = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  )

  // 인증 경로 확인 (signup 제거 - 토큰 필요)
  const authPaths = ['/auth/login', '/auth/forgot-password']
  const isAuthPath = authPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  // 보호된 경로에 비로그인 사용자가 접근하려는 경우
  if (!user && isProtectedPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/auth/login'
    return NextResponse.redirect(redirectUrl)
  }

  // 로그인한 사용자가 인증 페이지에 접근하려는 경우
  if (user && isAuthPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // license-activate 페이지는 비로그인 상태에서만 접근 가능
  if (request.nextUrl.pathname === '/license-activate' && user) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  // signup 페이지는 토큰 없이도 접근 가능 (체험 모드 지원)
  if (request.nextUrl.pathname === '/auth/signup') {
    const token = request.nextUrl.searchParams.get('token')

    // 토큰이 있으면 유효성 검증
    if (token) {
      try {
        const decoded = JSON.parse(Buffer.from(token, 'base64').toString())
        if (decoded.expiresAt < Date.now()) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/license-activate'
          return NextResponse.redirect(redirectUrl)
        }
      } catch {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/license-activate'
        return NextResponse.redirect(redirectUrl)
      }
    }
    // 토큰이 없으면 체험 모드로 진행 (페이지에서 처리)
  }

  // Public paths that don't require authentication
  const publicPaths = ['/', '/order', '/api/payaction-webhook', '/api/send-payment-info', '/api/send-license']
  const isPublicPath = publicPaths.some(path =>
    request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path)
  )

  // Allow access to public paths without authentication
  if (isPublicPath && !user) {
    return supabaseResponse
  }

  // ============================================================================
  // 관리자 권한 검증 로직 (Phase 6)
  // ============================================================================
  // /admin/* 경로는 관리자만 접근 가능
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // /admin/login 페이지는 인증 없이 접근 가능
    if (request.nextUrl.pathname === '/admin/login') {
      // 이미 로그인한 관리자가 로그인 페이지 접근 시
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        // 관리자면 라이선스 페이지로 리다이렉트
        if (profile && profile.role === 'admin') {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/admin/licenses'
          return NextResponse.redirect(redirectUrl)
        }
      }
      // 비로그인 사용자는 로그인 페이지 접근 허용
      return supabaseResponse
    }

    // /admin/login 외의 관리자 페이지는 인증 필요
    if (!user) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/admin/login'
      return NextResponse.redirect(redirectUrl)
    }

    // 로그인한 사용자의 관리자 권한 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    // admin 역할이 아니면 플래너 대시보드로 리다이렉트
    if (!profile || profile.role !== 'admin') {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/dashboard'
      return NextResponse.redirect(redirectUrl)
    }
  }

  // ============================================================================
  // 라이선스 검증 로직 (Phase 5-7)
  // ============================================================================
  // 로그인한 플래너가 보호된 경로에 접근할 때만 라이선스 검증
  // /license 페이지 자체는 검증 제외 (무한 리다이렉트 방지)
  // 관리자는 라이선스 검증 제외
  if (user && isProtectedPath && !request.nextUrl.pathname.startsWith('/license') && !request.nextUrl.pathname.startsWith('/admin')) {
    try {
      // 현재 활성화된 라이선스 조회 (active 또는 trial 상태)
      const { data: licenses, error: licenseError } = await supabase
        .from('licenses')
        .select('*')
        .eq('planner_id', user.id)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)

      const activeLicense = licenses && licenses.length > 0 ? licenses[0] : null

      // 라이선스가 없는 경우
      if (!activeLicense || licenseError) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/license'
        redirectUrl.searchParams.set('reason', 'no_license')
        return NextResponse.redirect(redirectUrl)
      }

      // 만료일 확인
      const now = new Date()
      let expiryDate: Date | null = null

      // 체험 라이선스는 trial_expires_at 확인
      if (activeLicense.is_trial && activeLicense.trial_expires_at) {
        expiryDate = new Date(activeLicense.trial_expires_at)
      } else if (activeLicense.expires_at) {
        expiryDate = new Date(activeLicense.expires_at)
      }

      if (expiryDate && now > expiryDate) {
        // 만료된 라이선스 → status를 'expired'로 업데이트
        await supabase
          .from('licenses')
          .update({ status: 'expired' })
          .eq('id', activeLicense.id)

        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/license'
        redirectUrl.searchParams.set('reason', activeLicense.is_trial ? 'trial_expired' : 'expired')
        return NextResponse.redirect(redirectUrl)
      }

      // 체험 만료 임박 시 헤더에 경고 추가 (3일 이내)
      if (activeLicense.is_trial && expiryDate) {
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        if (daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
          supabaseResponse.headers.set('X-Trial-Expiring', 'true')
          supabaseResponse.headers.set('X-Trial-Days-Left', daysUntilExpiry.toString())
        }
      }

      // 학생 수 제한 확인
      const { count: studentCount } = await supabase
        .from('student_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('planner_id', user.id)

      if (studentCount && studentCount > activeLicense.max_students) {
        const redirectUrl = request.nextUrl.clone()
        redirectUrl.pathname = '/license'
        redirectUrl.searchParams.set('reason', 'student_limit_exceeded')
        redirectUrl.searchParams.set('current', studentCount.toString())
        redirectUrl.searchParams.set('limit', activeLicense.max_students.toString())
        return NextResponse.redirect(redirectUrl)
      }

      // 체험 라이선스 디바이스 바인딩 검증
      if (activeLicense.is_trial && activeLicense.device_tokens && activeLicense.device_tokens.length > 0) {
        // 현재 디바이스의 핑거프린트 생성은 클라이언트에서만 가능
        // 미들웨어는 서버에서 실행되므로 쿠키에 저장된 핑거프린트를 확인
        const deviceFingerprint = request.cookies.get('device_fingerprint')?.value

        if (!deviceFingerprint) {
          // 디바이스 핑거프린트가 없으면 클라이언트에서 생성하도록 리다이렉트
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/device-verify'
          redirectUrl.searchParams.set('returnTo', request.nextUrl.pathname)
          return NextResponse.redirect(redirectUrl)
        }

        // 등록된 디바이스인지 확인
        if (!activeLicense.device_tokens.includes(deviceFingerprint)) {
          const redirectUrl = request.nextUrl.clone()
          redirectUrl.pathname = '/license'
          redirectUrl.searchParams.set('reason', 'device_mismatch')
          return NextResponse.redirect(redirectUrl)
        }
      }

      // 라이선스 검증 통과 → 계속 진행
    } catch (error) {
      // 라이선스 검증 중 오류 발생 시 로그만 남기고 계속 진행
      // (서비스 중단을 방지하기 위해)
      console.error('License validation error:', error)
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - .html files (standalone pages with their own auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|html)$).*)',
  ],
}