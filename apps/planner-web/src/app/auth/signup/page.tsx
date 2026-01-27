'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { generateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { AlertCircle, Loader2, UserPlus } from 'lucide-react';

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activationToken = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [licenseInfo, setLicenseInfo] = useState<any>(null);
  const [isTrialMode, setIsTrialMode] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string>('');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    async function initSignup() {
      // 활성화 토큰이 없으면 체험 모드
      if (!activationToken) {
        setIsTrialMode(true);
        // 디바이스 핑거프린트 생성
        try {
          const fingerprint = await generateDeviceFingerprint();
          setDeviceFingerprint(fingerprint);

          // 체험 자격 확인
          const response = await fetch('/api/trial/check-eligibility', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ device_fingerprint: fingerprint }),
          });

          const data = await response.json();

          if (!data.eligible) {
            setError('이 기기에서는 이미 체험 라이선스를 사용하셨습니다.');
            setTimeout(() => router.push('/'), 3000);
            return;
          }

          // 체험 모드 정보 설정
          setLicenseInfo({
            license: {
              durationDays: 7,
              maxStudents: 5,
            },
            isTrial: true,
          });
        } catch (err) {
          console.error('Failed to initialize trial mode:', err);
          setError('체험 모드 초기화에 실패했습니다.');
        }
        return;
      }

      // 토큰 디코딩 및 검증
      try {
        const decoded = JSON.parse(Buffer.from(activationToken, 'base64').toString());

        if (decoded.expiresAt < Date.now()) {
          setError('라이선스 활성화가 만료되었습니다. 다시 시도해주세요.');
          setTimeout(() => router.push('/license-activate'), 3000);
          return;
        }

        setLicenseInfo(decoded);
      } catch (err) {
        setError('유효하지 않은 활성화 토큰입니다.');
        setTimeout(() => router.push('/license-activate'), 3000);
      }
    }

    initSignup();
  }, [activationToken, router]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // 비밀번호 확인
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (!licenseInfo) {
      setError('라이선스 정보를 찾을 수 없습니다.');
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      // 체험 모드: 체험 라이선스 생성
      let trialLicense = null;
      if (isTrialMode && deviceFingerprint) {
        const trialResponse = await fetch('/api/trial/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            device_fingerprint: deviceFingerprint,
            user_email: formData.email,
            ip_address: window.location.hostname,
            user_agent: navigator.userAgent,
          }),
        });

        const trialData = await trialResponse.json();

        if (!trialResponse.ok || !trialData.success) {
          setError(trialData.error || '체험 라이선스 생성에 실패했습니다.');
          return;
        }

        trialLicense = trialData.license;
      }

      // 1. Supabase 가입
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.fullName,
            role: 'planner'
          }
        }
      });

      if (signupError) {
        setError(signupError.message);
        return;
      }

      if (!authData.user) {
        setError('회원가입에 실패했습니다.');
        return;
      }

      // 2-1. 기존 활성 라이선스 비활성화
      const { error: deactivateError } = await supabase
        .from('licenses')
        .update({
          status: 'superseded',  // 새 라이선스로 대체됨
          updated_at: new Date().toISOString()
        })
        .eq('planner_id', authData.user.id)
        .eq('status', 'active');

      if (deactivateError) {
        console.error('Failed to deactivate old licenses:', deactivateError);
        // 에러가 발생해도 계속 진행 (비즈니스 로직 우선)
      } else {
        console.log('Old licenses deactivated for user:', authData.user.id);
      }

      // 2-2. 새 라이선스 활성화
      if (isTrialMode && trialLicense) {
        // 체험 라이선스: 이미 생성되었으므로 planner_id와 activated_at만 업데이트
        const { data: licenses, error: findError } = await supabase
          .from('licenses')
          .select('id')
          .eq('license_key', trialLicense.license_key)
          .single();

        if (findError) {
          console.error('Failed to find trial license:', findError);
          setError('체험 라이선스 활성화에 실패했습니다.');
          return;
        }

        const { error: licenseUpdateError } = await supabase
          .from('licenses')
          .update({
            planner_id: authData.user.id,
            status: 'trial',
            activated_at: new Date().toISOString(),
            activated_by_user_id: authData.user.id,
          })
          .eq('id', licenses.id);

        if (licenseUpdateError) {
          console.error('Trial license update error:', licenseUpdateError);
        } else {
          console.log('Trial license activated:', licenses.id);
        }
      } else {
        // 일반 라이선스: 기존 로직
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + (licenseInfo.license?.durationDays || 30));

        const { error: licenseUpdateError } = await supabase
          .from('licenses')
          .update({
            planner_id: authData.user.id,
            status: 'active',
            activated_at: new Date().toISOString(),
            activated_by_user_id: authData.user.id,
            expires_at: expiresAt.toISOString()
          })
          .eq('id', licenseInfo.licenseId);

        if (licenseUpdateError) {
          console.error('License update error:', licenseUpdateError);
          // 가입은 성공했지만 라이선스 연결 실패
          // 관리자에게 알림 필요
        } else {
          console.log('New license activated:', licenseInfo.licenseId);
        }
      }

      // 3. profiles 테이블 업데이트 (트리거로 자동 생성되지만 명시적으로 확인)
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: formData.email,
          full_name: formData.fullName,
          role: 'planner'
        });

      if (profileError) {
        console.error('Profile creation error:', profileError);
      }

      // 4. 체험 라이선스인 경우 디바이스 핑거프린트를 쿠키에 저장
      if (isTrialMode && deviceFingerprint) {
        document.cookie = `device_fingerprint=${deviceFingerprint}; path=/; max-age=${365 * 24 * 60 * 60}; secure; samesite=strict`;
      }

      // 5. 대시보드로 리다이렉트
      router.push('/dashboard');

    } catch (err: any) {
      setError('서버 오류가 발생했습니다: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!licenseInfo && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center mb-6">
          <UserPlus className="w-12 h-12 text-blue-600" />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          {isTrialMode ? '무료 체험 시작' : '플래너 계정 생성'}
        </h1>

        {licenseInfo && (
          <div className={`${isTrialMode ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-6`}>
            <p className={`text-sm ${isTrialMode ? 'text-green-800' : 'text-blue-800'}`}>
              {isTrialMode && '🎉 7일 무료 체험 | 최대 5명 '}
              {!isTrialMode && `라이선스: ${licenseInfo.license?.durationDays || 30}일 / 최대 ${licenseInfo.license?.maxStudents || 10}명`}
            </p>
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              이름
            </label>
            <input
              type="text"
              id="fullName"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              이메일
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              id="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
              비밀번호 확인
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                가입 중...
              </>
            ) : (
              '계정 생성'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <SignupPageContent />
    </Suspense>
  );
}
