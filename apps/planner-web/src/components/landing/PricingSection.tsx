'use client';

import { useState } from 'react';
import PriceCalculator from './PriceCalculator';

/**
 * Pricing Section Component
 *
 * Displays pricing information and opens the price calculator modal.
 * Shows example pricing tiers and key features.
 */
export default function PricingSection() {
  const [showCalculator, setShowCalculator] = useState(false);

  // Example pricing tiers
  const pricingExamples = [
    {
      name: '소규모',
      students: 10,
      days: 30,
      price: 50000,
      description: '개인 과외 선생님',
      features: ['10명 관리', '30일 사용', 'AI 피드백', '실시간 메시지']
    },
    {
      name: '중규모',
      students: 20,
      days: 90,
      price: 300000,
      description: '학원 강사',
      popular: true,
      features: ['20명 관리', '90일 사용', 'AI 피드백', '실시간 메시지', '우선 지원']
    },
    {
      name: '대규모',
      students: 50,
      days: 180,
      price: 1500000,
      description: '교육 기관',
      features: ['50명 관리', '180일 사용', 'AI 피드백', '실시간 메시지', '전담 지원']
    }
  ];

  return (
    <section id="pricing" className="py-20 px-4 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50">
      <div className="max-w-7xl mx-auto">

        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            간단하고 투명한 가격
          </h2>
          <p className="text-xl text-gray-600 mb-6">
            필요한 만큼만 결제하세요. 숨겨진 비용은 없습니다.
          </p>
          <div className="inline-block bg-purple-100 text-purple-700 px-4 py-2 rounded-full text-sm font-semibold">
            💰 학생 1명당 월 ₩5,000 (기준: 30일)
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          {pricingExamples.map((tier, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden transition-all hover:shadow-2xl hover:scale-105 ${
                tier.popular ? 'border-4 border-purple-500' : 'border border-gray-200'
              }`}
            >
              {/* Popular Badge */}
              {tier.popular && (
                <div className="absolute top-0 right-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-4 py-1 rounded-bl-lg text-sm font-bold">
                  인기 ⭐
                </div>
              )}

              <div className="p-8">
                {/* Tier Name */}
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <p className="text-gray-600 mb-6">{tier.description}</p>

                {/* Price */}
                <div className="mb-6">
                  <div className="text-4xl font-bold text-gray-900 mb-1">
                    ₩{tier.price.toLocaleString()}
                  </div>
                  <div className="text-gray-500">
                    {tier.students}명 × {tier.days}일
                  </div>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-8">
                  {tier.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2 text-gray-700">
                      <svg className="w-5 h-5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <button
                  onClick={() => setShowCalculator(true)}
                  className={`w-full py-3 px-6 rounded-xl font-bold transition-all ${
                    tier.popular
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-blue-700'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  시작하기
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Pricing CTA */}
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            정확한 가격이 궁금하신가요?
          </h3>
          <p className="text-gray-600 mb-6">
            학생 수와 기간을 선택하여 맞춤 가격을 확인하세요
          </p>
          <button
            onClick={() => setShowCalculator(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            가격 계산기 열기
          </button>
        </div>

        {/* Key Benefits */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="text-4xl mb-3">💳</div>
            <h4 className="font-bold text-gray-900 mb-2">온라인 수수료 0원</h4>
            <p className="text-gray-600 text-sm">계좌이체로 결제하여 수수료 절감</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">⚡</div>
            <h4 className="font-bold text-gray-900 mb-2">자동 발급</h4>
            <p className="text-gray-600 text-sm">입금 확인 후 5분 이내 라이선스 발급</p>
          </div>
          <div className="text-center">
            <div className="text-4xl mb-3">🔒</div>
            <h4 className="font-bold text-gray-900 mb-2">안전한 결제</h4>
            <p className="text-gray-600 text-sm">은행 계좌이체로 안전하게 결제</p>
          </div>
        </div>

      </div>

      {/* Price Calculator Modal */}
      <PriceCalculator
        isOpen={showCalculator}
        onClose={() => setShowCalculator(false)}
      />
    </section>
  );
}
