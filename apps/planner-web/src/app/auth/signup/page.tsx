'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { AlertCircle, Loader2, UserPlus } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activationToken = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [licenseInfo, setLicenseInfo] = useState<any>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // 활성화 토큰 검증
    if (!activationToken) {
      router.push('/license-activate');
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

      // 4. 대시보드로 리다이렉트
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
          플래너 계정 생성
        </h1>

        {licenseInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              라이선스: {licenseInfo.license?.durationDays || 30}일 / 최대 {licenseInfo.license?.maxStudents || 10}명
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
