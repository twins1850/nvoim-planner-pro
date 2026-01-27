'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

/**
 * Order Creation Page
 *
 * Collects customer information and creates an order in the database.
 * After order creation, sends payment info email and redirects to pending page.
 *
 * URL Parameters:
 * - students: Number of students (from price calculator)
 * - days: Duration in days (from price calculator)
 * - price: Total amount (from price calculator)
 */
function OrderPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get order details from URL parameters
  const studentCount = parseInt(searchParams.get('students') || '10');
  const durationDays = parseInt(searchParams.get('days') || '30');
  const totalAmount = parseInt(searchParams.get('price') || '50000');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    agreeTerms: false,
    agreePrivacy: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validate order parameters
  useEffect(() => {
    if (studentCount < 1 || durationDays < 1 || totalAmount < 1) {
      alert('잘못된 주문 정보입니다. 가격 계산기로 돌아갑니다.');
      router.push('/');
    }
  }, [studentCount, durationDays, totalAmount, router]);

  /**
   * Generate unique order ID
   * Format: PLANNER + YYYYMMDDHHMM
   * Example: PLANNER202601201545
   */
  const generateOrderId = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const minute = String(now.getMinutes()).padStart(2, '0');
    return `PLANNER${year}${month}${day}${hour}${minute}`;
  };

  /**
   * Validate form data
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = '이름은 최소 2자 이상이어야 합니다';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = '올바른 이메일 형식이 아닙니다';
    }

    // Phone validation (Korean format: 010-XXXX-XXXX)
    const phoneRegex = /^01[0-9]-?[0-9]{4}-?[0-9]{4}$/;
    if (!formData.phone.trim()) {
      newErrors.phone = '전화번호를 입력해주세요';
    } else if (!phoneRegex.test(formData.phone.replace(/-/g, ''))) {
      newErrors.phone = '올바른 전화번호 형식이 아닙니다 (예: 010-1234-5678)';
    }

    // Terms agreement validation
    if (!formData.agreeTerms) {
      newErrors.agreeTerms = '이용약관에 동의해주세요';
    }

    if (!formData.agreePrivacy) {
      newErrors.agreePrivacy = '개인정보처리방침에 동의해주세요';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate order ID
      const orderId = generateOrderId();

      // Format phone number
      const formattedPhone = formData.phone.replace(/-/g, '').replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');

      // Create order via API route (server-side with RLS bypass)
      const orderResponse = await fetch('/api/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderId,
          customer_name: formData.name.trim(),
          customer_email: formData.email.trim().toLowerCase(),
          customer_phone: formattedPhone,
          student_count: studentCount,
          duration_days: durationDays,
          total_amount: totalAmount
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        console.error('Order creation error:', errorData);
        throw new Error(errorData.error || '주문 생성에 실패했습니다');
      }

      const { order } = await orderResponse.json();
      console.log('Order created successfully:', order);

      // Send payment info email
      try {
        const emailResponse = await fetch('/api/send-payment-info', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: formData.email.trim().toLowerCase(),
            orderId: orderId,
            amount: totalAmount,
            customerName: formData.name.trim()
          })
        });

        if (!emailResponse.ok) {
          console.error('Email send failed:', await emailResponse.text());
          // Continue anyway - order is created, email can be resent manually
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Continue anyway - order is created
      }

      // Redirect to pending page
      router.push(`/order/pending?orderId=${orderId}`);

    } catch (error: any) {
      console.error('Order submission error:', error);
      alert('주문 처리 중 오류가 발생했습니다: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle input change
   */
  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">주문하기</h1>
          <p className="text-gray-600">구매 정보를 입력해주세요</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg overflow-hidden">

          {/* Order Summary */}
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
            <h2 className="text-xl font-bold mb-4">주문 요약</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>학생 수</span>
                <span className="font-bold">{studentCount}명</span>
              </div>
              <div className="flex justify-between">
                <span>사용 기간</span>
                <span className="font-bold">{durationDays}일</span>
              </div>
              <div className="border-t border-white/20 pt-2 mt-2 flex justify-between text-lg">
                <span>총 금액</span>
                <span className="font-bold">{totalAmount.toLocaleString()}원</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="홍길동"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                이메일 <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="example@email.com"
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">라이선스 키가 이 이메일로 발송됩니다</p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전화번호 <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="010-1234-5678"
                disabled={isSubmitting}
              />
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Agreements */}
            <div className="space-y-3 border-t pt-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={(e) => handleChange('agreeTerms', e.target.checked)}
                  className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="agreeTerms" className="ml-2 block text-sm text-gray-700">
                  <span className="text-red-500">*</span> 이용약관에 동의합니다{' '}
                  <a href="/terms" target="_blank" className="text-purple-600 underline">
                    (보기)
                  </a>
                </label>
              </div>
              {errors.agreeTerms && (
                <p className="ml-6 text-sm text-red-500">{errors.agreeTerms}</p>
              )}

              <div className="flex items-start">
                <input
                  type="checkbox"
                  id="agreePrivacy"
                  checked={formData.agreePrivacy}
                  onChange={(e) => handleChange('agreePrivacy', e.target.checked)}
                  className="mt-1 h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label htmlFor="agreePrivacy" className="ml-2 block text-sm text-gray-700">
                  <span className="text-red-500">*</span> 개인정보처리방침에 동의합니다{' '}
                  <a href="/privacy" target="_blank" className="text-purple-600 underline">
                    (보기)
                  </a>
                </label>
              </div>
              {errors.agreePrivacy && (
                <p className="ml-6 text-sm text-red-500">{errors.agreePrivacy}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-all ${
                isSubmitting
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl'
              }`}
            >
              {isSubmitting ? '처리 중...' : '주문하기'}
            </button>

            {/* Info Text */}
            <p className="text-center text-sm text-gray-500">
              주문 후 입금 안내 이메일이 발송됩니다.<br />
              입금 확인 시 자동으로 라이선스가 발급됩니다.
            </p>

          </form>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.back()}
            className="text-purple-600 hover:text-purple-700 underline"
          >
            ← 뒤로 가기
          </button>
        </div>

      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 py-12 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 rounded w-1/2 mx-auto mb-8"></div>
            <div className="bg-white rounded-2xl shadow-lg p-8 space-y-4">
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    }>
      <OrderPageContent />
    </Suspense>
  );
}
