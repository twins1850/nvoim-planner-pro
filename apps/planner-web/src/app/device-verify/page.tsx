'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateDeviceFingerprint } from '@/lib/deviceFingerprint';
import { Loader2 } from 'lucide-react';

function DeviceVerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo') || '/dashboard';

  useEffect(() => {
    async function verifyDevice() {
      try {
        // 디바이스 핑거프린트 생성
        const fingerprint = await generateDeviceFingerprint();

        // 쿠키에 저장 (365일)
        document.cookie = `device_fingerprint=${fingerprint}; path=/; max-age=${365 * 24 * 60 * 60}; secure; samesite=strict`;

        // 원래 페이지로 리다이렉트
        router.push(returnTo);
      } catch (error) {
        console.error('Device verification failed:', error);
        // 에러가 발생해도 계속 진행 (서비스 중단 방지)
        router.push(returnTo);
      }
    }

    verifyDevice();
  }, [returnTo, router]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-600">디바이스 확인 중...</p>
      </div>
    </div>
  );
}

export default function DeviceVerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    }>
      <DeviceVerifyPageContent />
    </Suspense>
  );
}
