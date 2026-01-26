'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { generateDeviceFingerprint } from '@/lib/deviceFingerprint';

export default function LicenseActivatePage() {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function handleActivate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 디바이스 핑거프린트 생성
      const deviceFingerprint = await generateDeviceFingerprint();

      // 라이선스 검증 및 디바이스 등록
      const response = await fetch('/api/auth/activate-license', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Fingerprint': deviceFingerprint
        },
        body: JSON.stringify({ licenseKey: licenseKey.trim() })
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.devices) {
          // 디바이스 제한 초과
          setError(
            `${result.error}\n\n등록된 디바이스:\n` +
            result.devices.map((d: any, i: number) =>
              `${i + 1}. ${d.description || '이름 없음'} (${new Date(d.registered_at).toLocaleDateString()})`
            ).join('\n')
          );
        } else {
          setError(result.error || '라이선스 활성화에 실패했습니다.');
        }
        return;
      }

      // 활성화 성공 → 가입 페이지로 이동 (토큰 전달)
      router.push(`/auth/signup?token=${result.activationToken}`);

    } catch (err) {
      setError('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <div className="flex items-center justify-center mb-6">
          <Key className="w-12 h-12 text-blue-600" />
        </div>

        <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
          NVOIM Planner Pro
        </h1>
        <p className="text-center text-gray-600 mb-6">
          라이선스 키를 입력하여 시작하세요
        </p>

        <form onSubmit={handleActivate} className="space-y-4">
          <div>
            <label htmlFor="license-key" className="block text-sm font-medium text-gray-700 mb-2">
              라이선스 키
            </label>
            <input
              type="text"
              id="license-key"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="30D-15P-XXXXXXXXXXXXX"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800 whitespace-pre-line">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !licenseKey.trim()}
            className="w-full px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                확인 중...
              </>
            ) : (
              <>
                <CheckCircle className="w-5 h-5" />
                라이선스 활성화
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            라이선스 키는 관리자로부터 받을 수 있습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
