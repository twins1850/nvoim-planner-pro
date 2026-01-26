'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * Order Pending Page
 *
 * Displays payment instructions and monitors order status in real-time.
 * When payment is confirmed and license is issued, displays the license key.
 *
 * Real-time Strategy:
 * - Initial fetch: Load current order status on page load
 * - Supabase Realtime: Subscribe to order updates (WebSocket)
 * - Backup polling: Every 5 minutes as fallback (if Realtime fails)
 * - Auto-timeout: Stop polling after 30 minutes
 *
 * IMPORTANT: 시간 제한 없음!
 * - 페이지 열어둔 경우: 언제든 Realtime으로 즉시 업데이트
 * - 페이지 닫은 경우: PayAction Webhook은 계속 작동, 나중에 방문하면 확인 가능
 * - 입금 시간 제한 없음: 몇 분 후든, 몇 시간 후든 입금하면 자동 처리
 */
export default function OrderPendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const orderId = searchParams.get('orderId');

  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [pollingCount, setPollingCount] = useState(0);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connected' | 'disconnected' | 'error'>('connected');

  /**
   * Fetch order data via API route
   */
  const fetchOrder = async () => {
    if (!orderId) return;

    try {
      const response = await fetch(`/api/get-order?orderId=${orderId}`);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Error fetching order:', errorData);
        return;
      }

      const { order: data } = await response.json();

      setOrder(data);
      setIsLoading(false);

      // Log status change
      if (data?.payment_status === '라이선스발급완료') {
        console.log('License issued! License key:', data.license_key);
      }

    } catch (err) {
      console.error('Fetch error:', err);
    }
  };

  /**
   * Initialize Realtime subscription and backup polling
   */
  useEffect(() => {
    // Validate orderId
    if (!orderId) {
      alert('주문 정보가 없습니다.');
      router.push('/');
      return;
    }

    // Initial fetch
    fetchOrder();

    // ============================================================================
    // Supabase Realtime 구독 (실시간 업데이트)
    // ============================================================================
    const supabase = createClient();

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `order_id=eq.${orderId}`
        },
        (payload) => {
          console.log('🔔 Realtime update received:', payload.new);
          setOrder(payload.new);
          setRealtimeStatus('connected');

          // 라이선스 발급 완료 시 알림
          if (payload.new.payment_status === '라이선스발급완료') {
            console.log('🎉 License issued via Realtime!');
          }
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRealtimeStatus('error');
        }
      });

    // ============================================================================
    // 백업 폴링 (5분마다, Realtime 실패 대비)
    // ============================================================================
    const backupPolling = setInterval(() => {
      setPollingCount(prev => prev + 1);
      fetchOrder();
      console.log('📊 Backup polling executed');
    }, 5 * 60 * 1000); // 5분

    // ============================================================================
    // 자동 타임아웃 (30분 후 폴링 중단)
    // ============================================================================
    const timeout = setTimeout(() => {
      clearInterval(backupPolling);
      console.log('⏰ Polling timeout reached (30 minutes)');
    }, 30 * 60 * 1000); // 30분

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
      clearInterval(backupPolling);
      clearTimeout(timeout);
    };
  }, [orderId]);

  /**
   * Copy license key to clipboard
   */
  const copyLicenseKey = () => {
    if (order?.license_key) {
      navigator.clipboard.writeText(order.license_key);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    }
  };

  /**
   * Format Korean currency
   */
  const formatAmount = (amount: number) => {
    return amount?.toLocaleString('ko-KR') || '0';
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">주문 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Order not found
  if (!order) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">주문을 찾을 수 없습니다</h2>
          <p className="text-gray-600 mb-6">주문 번호를 확인해주세요.</p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            홈으로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // License issued - show success
  if (order.payment_status === '라이선스발급완료' && order.license_key) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
        <div className="max-w-3xl mx-auto">

          {/* Success Header */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 p-8 text-white text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h1 className="text-3xl font-bold mb-2">라이선스 발급 완료!</h1>
              <p className="text-green-100">입금이 확인되었습니다</p>
            </div>
          </div>

          {/* License Key Card */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">라이선스 키</h2>
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg p-6 mb-4">
              <p className="text-sm text-purple-100 mb-2">License Key</p>
              <p className="text-2xl font-mono font-bold text-white break-all">
                {order.license_key}
              </p>
            </div>
            <button
              onClick={copyLicenseKey}
              className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              {showCopySuccess ? '✓ 복사됨!' : '📋 라이선스 키 복사'}
            </button>
          </div>

          {/* Order Info */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">주문 정보</h2>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">주문번호</span>
                <span className="font-medium">{order.order_id}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">학생 수</span>
                <span className="font-medium">{order.student_count}명</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">사용 기간</span>
                <span className="font-medium">{order.duration_days}일</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">결제 금액</span>
                <span className="font-bold text-purple-600">{formatAmount(order.total_amount)}원</span>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">다음 단계</h2>
            <ol className="space-y-3 text-gray-700">
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">1</span>
                <span>위의 라이선스 키를 복사하세요</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">2</span>
                <span>라이선스 활성화 페이지로 이동하세요</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">3</span>
                <span>디바이스 등록 후 회원가입을 완료하세요</span>
              </li>
              <li className="flex items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-sm font-bold mr-3">4</span>
                <span>플래너 앱을 시작하세요!</span>
              </li>
            </ol>
          </div>

          {/* CTA Button */}
          <Link
            href="/license-activate"
            className="block w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-center rounded-lg font-bold shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-blue-700 transition-all"
          >
            라이선스 활성화하기 →
          </Link>

          {/* Email Notice */}
          <p className="text-center text-sm text-gray-500 mt-6">
            이메일로도 라이선스 키가 발송되었습니다.<br />
            이메일을 확인해주세요.
          </p>

        </div>
      </div>
    );
  }

  // Waiting for payment
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Waiting Header */}
        <div className="bg-white rounded-lg shadow-lg overflow-hidden mb-6">
          <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-8 text-white text-center">
            <div className="text-6xl mb-4">⏳</div>
            <h1 className="text-3xl font-bold mb-2">입금을 기다리고 있습니다</h1>
            <p className="text-yellow-100">입금 후 자동으로 라이선스가 발급됩니다</p>
          </div>
        </div>

        {/* Bank Account Info */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">입금 정보</h2>

          <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6 mb-6">
            <h3 className="font-bold text-gray-900 mb-4">입금 계좌</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">은행</span>
                <span className="font-bold">우리은행</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">계좌번호</span>
                <span className="font-bold">1002-123-456789</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">예금주</span>
                <span className="font-bold">엔보임플래너프로</span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span className="text-gray-600">입금액</span>
                <span className="font-bold text-red-600 text-xl">{formatAmount(order.total_amount)}원</span>
              </div>
            </div>
          </div>

          {/* Important Notice */}
          <div className="bg-red-50 border-2 border-red-400 rounded-lg p-6">
            <h3 className="font-bold text-red-900 mb-4">⚠️ 중요 안내</h3>
            <p className="text-red-800 font-bold mb-2">
              입금 시 입금자명에 주문번호를 반드시 포함해주세요!
            </p>
            <div className="bg-white rounded-lg p-4 my-3">
              <p className="text-sm text-gray-600 mb-2">주문번호:</p>
              <p className="text-xl font-mono font-bold text-purple-600">{order.order_id}</p>
            </div>
            <p className="text-sm text-red-700">
              예시: <strong>{order.order_id}</strong> 또는 <strong>{order.customer_name}{order.order_id.slice(-4)}</strong>
            </p>
          </div>
        </div>

        {/* Order Details */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">주문 정보</h2>
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">주문번호</span>
              <span className="font-medium">{order.order_id}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">구매자</span>
              <span className="font-medium">{order.customer_name}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">이메일</span>
              <span className="font-medium text-sm">{order.customer_email}</span>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-gray-600">학생 수</span>
              <span className="font-medium">{order.student_count}명</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-600">사용 기간</span>
              <span className="font-medium">{order.duration_days}일</span>
            </div>
          </div>
        </div>

        {/* Processing Info */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">처리 안내</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>입금 확인은 통상 <strong>5분 이내</strong>에 자동으로 처리됩니다</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>입금이 확인되면 <strong>자동으로 라이선스가 발급</strong>됩니다</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>라이선스 키는 <strong>이메일로 발송</strong>됩니다</span>
            </li>
            <li className="flex items-start">
              <span className="text-green-500 mr-2">✓</span>
              <span>이 페이지에서도 <strong>자동으로 라이선스 키가 표시</strong>됩니다</span>
            </li>
          </ul>
        </div>

        {/* Realtime Status Indicator */}
        <div className="text-center">
          <div className="inline-flex items-center bg-white rounded-full px-6 py-3 shadow-md">
            {realtimeStatus === 'connected' && (
              <>
                <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="text-gray-700 text-sm">
                  🔔 실시간 연결됨 (즉시 업데이트)
                </span>
              </>
            )}
            {realtimeStatus === 'disconnected' && (
              <>
                <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                <span className="text-gray-700 text-sm">
                  ⏰ 백업 확인 중... (5분마다)
                </span>
              </>
            )}
            {realtimeStatus === 'error' && (
              <>
                <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                <span className="text-gray-700 text-sm">
                  ⚠️ 연결 오류 (백업 모드)
                </span>
              </>
            )}
          </div>
          <p className="text-gray-500 text-xs mt-4">
            {realtimeStatus === 'connected'
              ? '입금이 확인되는 즉시 자동으로 업데이트됩니다'
              : '5분마다 자동으로 확인합니다 (백업 확인 ' + pollingCount + '회)'}
          </p>
        </div>

        {/* Support Info */}
        <div className="bg-gray-50 rounded-lg p-6 mt-6 text-center">
          <p className="text-sm text-gray-600 mb-2">문의사항이 있으신가요?</p>
          <p className="text-sm">
            <a href="mailto:support@nvoim.com" className="text-purple-600 font-medium hover:underline">
              support@nvoim.com
            </a>
            {' | '}
            <a href="http://pf.kakao.com/_nvoim_planner" target="_blank" className="text-purple-600 font-medium hover:underline">
              카카오톡 @nvoim_planner
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}
