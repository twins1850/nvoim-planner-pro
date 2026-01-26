'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

interface PriceCalculatorProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Price Calculator Component
 *
 * Interactive price calculator for NVOIM Planner Pro licenses.
 *
 * Pricing Formula:
 * Total = Student Count × (Duration Days ÷ 30) × ₩5,000
 *
 * Features:
 * - Student count slider (10-100 students)
 * - Duration selection buttons (30/60/90/180/365 days)
 * - Real-time price calculation
 * - Responsive design
 * - Modal overlay
 */
export default function PriceCalculator({ isOpen, onClose }: PriceCalculatorProps) {
  const router = useRouter();

  // Pricing state
  const [studentCount, setStudentCount] = useState(15);
  const [durationDays, setDurationDays] = useState(30);

  // Duration options
  const durationOptions = [
    { days: 30, label: '1개월' },
    { days: 60, label: '2개월' },
    { days: 90, label: '3개월' },
    { days: 180, label: '6개월' },
    { days: 365, label: '1년' }
  ];

  /**
   * Calculate total price
   * Formula: studentCount × (durationDays ÷ 30) × 5000
   */
  const calculatePrice = (): number => {
    return studentCount * (durationDays / 30) * 5000;
  };

  const totalPrice = calculatePrice();

  /**
   * Calculate per-student price
   */
  const perStudentPrice = (durationDays / 30) * 5000;

  /**
   * Handle order button click
   */
  const handleOrder = () => {
    const params = new URLSearchParams({
      students: studentCount.toString(),
      days: durationDays.toString(),
      price: totalPrice.toString()
    });

    router.push(`/order?${params.toString()}`);
  };

  /**
   * Handle escape key
   */
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  /**
   * Prevent body scroll when modal is open
   */
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fadeIn">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slideUp">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors z-10"
          aria-label="닫기"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 text-white rounded-t-2xl">
          <h2 className="text-3xl font-bold mb-2">가격 계산기</h2>
          <p className="text-purple-100">학생 수와 기간을 선택하여 가격을 확인하세요</p>
        </div>

        {/* Body */}
        <div className="p-8 space-y-8">

          {/* Student Count Slider */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <label className="text-lg font-semibold text-gray-900">
                학생 수
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={studentCount}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 10;
                    setStudentCount(Math.min(Math.max(value, 10), 100));
                  }}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-purple-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min="10"
                  max="100"
                />
                <span className="text-gray-600 font-medium">명</span>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={studentCount}
              onChange={(e) => setStudentCount(parseInt(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-purple"
            />

            {/* Slider Labels */}
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>10명</span>
              <span>50명</span>
              <span>100명</span>
            </div>
          </div>

          {/* Duration Selection */}
          <div>
            <label className="text-lg font-semibold text-gray-900 mb-4 block">
              사용 기간
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {durationOptions.map((option) => (
                <button
                  key={option.days}
                  onClick={() => setDurationDays(option.days)}
                  className={`py-4 px-6 rounded-xl font-semibold transition-all ${
                    durationDays === option.days
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg scale-105'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <div className="text-lg">{option.label}</div>
                  <div className="text-sm opacity-80 mt-1">{option.days}일</div>
                </button>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">가격 계산</h3>

            {/* Calculation Details */}
            <div className="space-y-2 text-gray-700">
              <div className="flex justify-between items-center">
                <span>학생당 가격 ({durationDays}일)</span>
                <span className="font-medium">{perStudentPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span>학생 수</span>
                <span className="font-medium">× {studentCount}명</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2"></div>
            </div>

            {/* Total Price */}
            <div className="flex justify-between items-center pt-2">
              <span className="text-xl font-bold text-gray-900">총 금액</span>
              <div className="text-right">
                <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600">
                  {totalPrice.toLocaleString()}원
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  월 {(totalPrice / (durationDays / 30)).toLocaleString()}원
                </div>
              </div>
            </div>
          </div>

          {/* Plan Summary */}
          <div className="bg-white border-2 border-purple-200 rounded-xl p-6">
            <h3 className="font-semibold text-gray-900 mb-3">📋 선택한 플랜</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                <span><strong>{studentCount}명</strong>의 학생 관리</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                <span><strong>{durationDays}일</strong> 동안 사용</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                <span>AI 피드백 무제한</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                <span>실시간 메시지 기능</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                <span>최대 2개 디바이스 등록</span>
              </li>
            </ul>
          </div>

          {/* Order Button */}
          <button
            onClick={handleOrder}
            className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-lg font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            계좌이체로 결제하기 →
          </button>

          {/* Payment Info */}
          <div className="text-center text-sm text-gray-500 space-y-1">
            <p>💳 계좌이체 결제 (온라인 결제 수수료 0원)</p>
            <p>⚡ 입금 확인 후 자동으로 라이선스 발급</p>
            <p>✉️ 라이선스 키는 이메일로 발송됩니다</p>
          </div>

        </div>

      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out;
        }

        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }

        /* Custom slider styles */
        .slider-purple::-webkit-slider-thumb {
          appearance: none;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.4);
          transition: transform 0.2s;
        }

        .slider-purple::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }

        .slider-purple::-webkit-slider-thumb:active {
          transform: scale(0.95);
        }

        .slider-purple::-moz-range-thumb {
          width: 24px;
          height: 24px;
          border: none;
          border-radius: 50%;
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(124, 58, 237, 0.4);
          transition: transform 0.2s;
        }

        .slider-purple::-moz-range-thumb:hover {
          transform: scale(1.1);
        }

        .slider-purple::-moz-range-thumb:active {
          transform: scale(0.95);
        }

        .slider-purple::-webkit-slider-runnable-track {
          background: linear-gradient(
            to right,
            #7c3aed 0%,
            #7c3aed ${((studentCount - 10) / 90) * 100}%,
            #e5e7eb ${((studentCount - 10) / 90) * 100}%,
            #e5e7eb 100%
          );
          height: 12px;
          border-radius: 6px;
        }

        .slider-purple::-moz-range-track {
          background: #e5e7eb;
          height: 12px;
          border-radius: 6px;
        }

        .slider-purple::-moz-range-progress {
          background: linear-gradient(135deg, #7c3aed 0%, #2563eb 100%);
          height: 12px;
          border-radius: 6px;
        }
      `}</style>
    </div>
  );
}
