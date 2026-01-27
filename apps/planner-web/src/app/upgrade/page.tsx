'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Check, Sparkles, Mail, Phone, MessageCircle } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';

interface TrialLicense {
  id: string;
  license_key: string;
  trial_expires_at: string;
  max_students: number;
  daysLeft: number;
}

const PRICING_TIERS = [
  {
    students: 10,
    price: 50000,
    popular: false,
  },
  {
    students: 15,
    price: 75000,
    popular: true,
  },
  {
    students: 20,
    price: 100000,
    popular: false,
  },
  {
    students: 30,
    price: 150000,
    popular: false,
  },
];

const DURATION_OPTIONS = [
  { days: 30, label: '1개월', discount: 0 },
  { days: 90, label: '3개월', discount: 10 },
  { days: 180, label: '6개월', discount: 15 },
  { days: 365, label: '1년', discount: 20 },
];

export default function UpgradePage() {
  const router = useRouter();
  const [trialLicense, setTrialLicense] = useState<TrialLicense | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedStudents, setSelectedStudents] = useState(15);
  const [selectedDuration, setSelectedDuration] = useState(30);

  useEffect(() => {
    async function fetchTrialLicense() {
      try {
        const supabase = createClient();

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push('/auth/login');
          return;
        }

        // 체험 라이선스 조회
        const { data: licenses, error } = await supabase
          .from('licenses')
          .select('*')
          .eq('planner_id', user.id)
          .eq('status', 'trial')
          .eq('is_trial', true)
          .single();

        if (error || !licenses) {
          // 체험 라이선스가 없으면 대시보드로 리다이렉트
          router.push('/dashboard');
          return;
        }

        // 남은 일수 계산
        const now = new Date();
        const expiresAt = new Date(licenses.trial_expires_at);
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        setTrialLicense({
          id: licenses.id,
          license_key: licenses.license_key,
          trial_expires_at: licenses.trial_expires_at,
          max_students: licenses.max_students,
          daysLeft,
        });
      } catch (err) {
        console.error('Failed to fetch trial license:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTrialLicense();
  }, [router]);

  const calculatePrice = () => {
    const tier = PRICING_TIERS.find((t) => t.students === selectedStudents);
    if (!tier) return 0;

    const basePrice = tier.price;
    const durationMultiplier = selectedDuration / 30;
    const subtotal = basePrice * durationMultiplier;

    const durationOption = DURATION_OPTIONS.find((d) => d.days === selectedDuration);
    const discount = durationOption?.discount || 0;

    return Math.floor(subtotal * (1 - discount / 100));
  };

  if (loading) {
    return (
      <DashboardLayout title="업그레이드">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">로딩 중...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!trialLicense) {
    return (
      <DashboardLayout title="업그레이드">
        <div className="text-center py-20">
          <p className="text-gray-600">체험 라이선스를 찾을 수 없습니다.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="정식 라이선스로 업그레이드">
      <div className="max-w-5xl mx-auto">
        {/* 헤더 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            체험이 마음에 드셨나요?
          </h1>
          <p className="text-lg text-gray-600">
            정식 라이선스로 업그레이드하고 제한 없이 사용하세요
          </p>
        </div>

        {/* 체험 정보 */}
        <div
          className={`rounded-lg p-6 mb-8 ${
            trialLicense.daysLeft <= 3
              ? 'bg-red-50 border border-red-200'
              : 'bg-blue-50 border border-blue-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3
                className={`font-semibold mb-1 ${
                  trialLicense.daysLeft <= 3 ? 'text-red-800' : 'text-blue-800'
                }`}
              >
                현재 체험 라이선스 정보
              </h3>
              <p
                className={`text-sm ${
                  trialLicense.daysLeft <= 3 ? 'text-red-700' : 'text-blue-700'
                }`}
              >
                최대 {trialLicense.max_students}명 | 남은 기간: {trialLicense.daysLeft}일
              </p>
            </div>
            {trialLicense.daysLeft <= 3 && (
              <div className="text-right">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                  ⚠️ 곧 만료됩니다
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 요금제 선택 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">요금제 선택</h2>

          {/* 학생 수 선택 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">학생 수</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {PRICING_TIERS.map((tier) => (
                <button
                  key={tier.students}
                  onClick={() => setSelectedStudents(tier.students)}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    selectedStudents === tier.students
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {tier.popular && (
                    <span className="absolute -top-2 right-2 px-2 py-0.5 bg-blue-600 text-white text-xs font-medium rounded-full">
                      인기
                    </span>
                  )}
                  <div className="text-center">
                    <p className="text-2xl font-bold text-gray-900">{tier.students}명</p>
                    <p className="text-sm text-gray-600 mt-1">
                      ₩{tier.price.toLocaleString()}/월
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 사용 기간 선택 */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-4">사용 기간</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {DURATION_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  onClick={() => setSelectedDuration(option.days)}
                  className={`relative p-4 rounded-lg border-2 transition-all ${
                    selectedDuration === option.days
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {option.discount > 0 && (
                    <span className="absolute -top-2 right-2 px-2 py-0.5 bg-green-600 text-white text-xs font-medium rounded-full">
                      {option.discount}% 할인
                    </span>
                  )}
                  <div className="text-center">
                    <p className="text-lg font-bold text-gray-900">{option.label}</p>
                    <p className="text-xs text-gray-600 mt-1">{option.days}일</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 가격 요약 */}
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-gray-700">선택한 플랜</span>
              <span className="font-medium text-gray-900">
                {selectedStudents}명 × {DURATION_OPTIONS.find((d) => d.days === selectedDuration)?.label}
              </span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <span className="text-lg font-semibold text-gray-900">총 금액</span>
              <span className="text-2xl font-bold text-blue-600">
                ₩{calculatePrice().toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* 혜택 안내 */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-8 mb-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">정식 라이선스 혜택</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              '무제한 학생 관리 (플랜별)',
              'AI 피드백 무제한 사용',
              '숙제 및 과제 관리',
              '학습 진도 추적',
              '성적 분석 리포트',
              '우선 기술 지원',
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-2">
                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                <span className="text-gray-700">{benefit}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 연락처 안내 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-4">구매 방법</h3>
          <p className="text-gray-600 mb-6">
            아래 연락처로 문의하시면 결제 안내를 드립니다.
            <br />
            선택하신 플랜 정보를 함께 알려주세요.
          </p>

          <div className="space-y-4">
            <a
              href={`mailto:support@nplannerpro.com?subject=라이선스 구매 문의: ${selectedStudents}명 × ${DURATION_OPTIONS.find((d) => d.days === selectedDuration)?.label}&body=안녕하세요,\n\n아래 플랜으로 라이선스 구매를 원합니다.\n\n- 학생 수: ${selectedStudents}명\n- 사용 기간: ${DURATION_OPTIONS.find((d) => d.days === selectedDuration)?.label}\n- 총 금액: ₩${calculatePrice().toLocaleString()}\n\n감사합니다.`}
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all"
            >
              <Mail className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">이메일 문의</p>
                <p className="text-sm text-gray-600">support@nplannerpro.com</p>
              </div>
            </a>

            <a
              href="tel:010-1234-5678"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all"
            >
              <Phone className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">전화 문의</p>
                <p className="text-sm text-gray-600">010-1234-5678</p>
              </div>
            </a>

            <a
              href="http://pf.kakao.com/_nvoim_planner"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-600 hover:bg-blue-50 transition-all"
            >
              <MessageCircle className="w-6 h-6 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">카카오톡 문의</p>
                <p className="text-sm text-gray-600">@nvoim_planner</p>
              </div>
            </a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
