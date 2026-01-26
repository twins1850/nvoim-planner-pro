"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Calendar, Clock, Users, DollarSign, Info, Plus, Trash2, AlertCircle } from "lucide-react";

interface WeeklySchedule {
  day: number;
  start_time: string;
  end_time: string;
}

interface AddSubscriptionFormProps {
  studentId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubscriptionForm({ studentId, onClose, onSuccess }: AddSubscriptionFormProps) {
  // Form state
  const [frequency, setFrequency] = useState<'주2회' | '주3회' | '주5회' | '주6회' | '자율수강'>('주2회');
  const [duration, setDuration] = useState<'25분' | '50분'>('25분');
  const [paymentPeriod, setPaymentPeriod] = useState<'1개월' | '3개월' | '6개월' | '12개월'>('1개월');
  const [startDate, setStartDate] = useState('');
  const [flexibleLessons, setFlexibleLessons] = useState<8 | 12>(8);
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [previewData, setPreviewData] = useState<any>(null);

  const dayNames = ['월', '화', '수', '목', '금', '토', '일'];
  const dayValues = [1, 2, 3, 4, 5, 6, 7]; // 1=월요일, 7=일요일

  // 수강권 빈도에 따른 기본 스케줄 설정
  useEffect(() => {
    if (frequency === '자율수강') {
      setWeeklySchedule([]);
      return;
    }

    const defaultSchedules: { [key: string]: WeeklySchedule[] } = {
      '주2회': [
        { day: 2, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 4, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' }
      ],
      '주3회': [
        { day: 1, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 3, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 5, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' }
      ],
      '주5회': [
        { day: 1, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 2, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 3, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 4, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 5, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' }
      ],
      '주6회': [
        { day: 1, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 2, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 3, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 4, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 5, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' },
        { day: 6, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' }
      ]
    };

    setWeeklySchedule(defaultSchedules[frequency] || []);
  }, [frequency, duration]);

  // 수강권 미리보기 데이터 계산
  useEffect(() => {
    if (startDate) {
      calculatePreview();
    }
  }, [frequency, duration, paymentPeriod, startDate, flexibleLessons]);

  const calculatePreview = () => {
    if (!startDate) return;

    const start = new Date(startDate);
    const months = parseInt(paymentPeriod.replace('개월', ''));
    const end = new Date(start.getFullYear(), start.getMonth() + months, start.getDate() - 1);
    
    let totalLessons = 0;
    let subscriptionName = '';

    if (frequency === '자율수강') {
      totalLessons = flexibleLessons * months;
      subscriptionName = `자율수강 ${duration} 월${flexibleLessons}회 ${paymentPeriod}권`;
    } else {
      const lessonsPerWeek = parseInt(frequency.replace('주', '').replace('회', ''));
      const totalWeeks = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7));
      totalLessons = totalWeeks * lessonsPerWeek;
      subscriptionName = `${frequency} ${duration} ${paymentPeriod}권`;
    }

    setPreviewData({
      subscriptionName,
      startDate: start.toLocaleDateString('ko-KR'),
      endDate: end.toLocaleDateString('ko-KR'),
      totalLessons,
      maxPostponements: Math.floor(totalLessons / 6) // 12회당 2회 기준으로 계산
    });
  };

  const addScheduleSlot = () => {
    setWeeklySchedule([...weeklySchedule, { day: 1, start_time: '09:00', end_time: duration === '25분' ? '09:25' : '09:50' }]);
  };

  const removeScheduleSlot = (index: number) => {
    setWeeklySchedule(weeklySchedule.filter((_, i) => i !== index));
  };

  const updateScheduleSlot = (index: number, field: keyof WeeklySchedule, value: number | string) => {
    const updated = [...weeklySchedule];
    if (field === 'start_time') {
      updated[index].start_time = value as string;
      // 종료 시간 자동 계산
      const startTime = new Date(`2000-01-01 ${value}`);
      const endTime = new Date(startTime.getTime() + (duration === '25분' ? 25 : 50) * 60000);
      updated[index].end_time = endTime.toTimeString().slice(0, 5);
    } else if (field === 'day') {
      updated[index].day = value as number;
    }
    setWeeklySchedule(updated);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      if (!startDate) {
        throw new Error('수강 시작일을 선택해주세요.');
      }

      if (frequency !== '자율수강' && weeklySchedule.length === 0) {
        throw new Error('주별 스케줄을 설정해주세요.');
      }

      const supabase = createClient();
      
      // 수강권 생성 RPC 함수 호출
      const { data, error: rpcError } = await supabase.rpc('create_subscription', {
        p_student_id: studentId,
        p_frequency: frequency,
        p_duration: duration,
        p_payment_period: paymentPeriod,
        p_start_date: startDate,
        p_flexible_lessons_per_month: frequency === '자율수강' ? flexibleLessons : null,
        p_weekly_schedule: frequency !== '자율수강' ? JSON.stringify(weeklySchedule) : null,
        p_total_amount: totalAmount || null,
        p_payment_amount: paymentAmount || null,
        p_notes: notes || null
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      if (!data.success) {
        throw new Error(data.message);
      }

      // 고정 스케줄의 경우 수업 일정 자동 생성
      if (frequency !== '자율수강') {
        const { error: scheduleError } = await supabase.rpc('generate_lesson_schedule', {
          p_subscription_id: data.subscription_id,
          p_exclude_holidays: true
        });

        if (scheduleError) {
          console.error('수업 스케줄 생성 오류:', scheduleError);
          // 수강권은 생성되었으니 경고만 표시
        }
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || '수강권 추가 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* 수강 빈도 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          수강 빈도
        </label>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {(['주2회', '주3회', '주5회', '주6회', '자율수강'] as const).map((freq) => (
            <button
              key={freq}
              onClick={() => setFrequency(freq)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                frequency === freq 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {freq}
            </button>
          ))}
        </div>
        {frequency === '자율수강' && (
          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">월 수업 횟수</label>
            <div className="flex gap-3">
              <button
                onClick={() => setFlexibleLessons(8)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  flexibleLessons === 8 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                월 8회
              </button>
              <button
                onClick={() => setFlexibleLessons(12)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  flexibleLessons === 12 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                월 12회
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 수업 시간 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Clock className="w-4 h-4 inline mr-1" />
          수업 시간
        </label>
        <div className="flex gap-3">
          {(['25분', '50분'] as const).map((dur) => (
            <button
              key={dur}
              onClick={() => setDuration(dur)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                duration === dur 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {dur}
            </button>
          ))}
        </div>
      </div>

      {/* 결제 기간 선택 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          결제 기간
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(['1개월', '3개월', '6개월', '12개월'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setPaymentPeriod(period)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                paymentPeriod === period 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* 수강 시작일 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Calendar className="w-4 h-4 inline mr-1" />
          수강 시작일
        </label>
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          min={new Date().toISOString().split('T')[0]}
        />
      </div>

      {/* 주별 스케줄 설정 (자율수강이 아닌 경우) */}
      {frequency !== '자율수강' && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              <Clock className="w-4 h-4 inline mr-1" />
              주별 스케줄
            </label>
            <button
              onClick={addScheduleSlot}
              className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </div>
          <div className="space-y-3">
            {weeklySchedule.map((schedule, index) => (
              <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <select
                  value={schedule.day}
                  onChange={(e) => updateScheduleSlot(index, 'day', parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {dayValues.map((day, dayIndex) => (
                    <option key={day} value={day}>
                      {dayNames[dayIndex]}요일
                    </option>
                  ))}
                </select>
                <input
                  type="time"
                  value={schedule.start_time}
                  onChange={(e) => updateScheduleSlot(index, 'start_time', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-gray-500">~</span>
                <input
                  type="time"
                  value={schedule.end_time}
                  disabled
                  className="px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
                <button
                  onClick={() => removeScheduleSlot(index)}
                  className="px-2 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {weeklySchedule.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                스케줄을 추가해주세요.
              </p>
            )}
          </div>
        </div>
      )}

      {/* 금액 설정 */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DollarSign className="w-4 h-4 inline mr-1" />
            정가 (원)
          </label>
          <input
            type="number"
            value={totalAmount || ''}
            onChange={(e) => setTotalAmount(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 200000"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            결제 금액 (원)
          </label>
          <input
            type="number"
            value={paymentAmount || ''}
            onChange={(e) => setPaymentAmount(parseInt(e.target.value) || 0)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="예: 180000"
          />
        </div>
      </div>

      {/* 메모 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Info className="w-4 h-4 inline mr-1" />
          메모
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="특이사항이나 참고사항을 입력해주세요."
        />
      </div>

      {/* 수강권 미리보기 */}
      {previewData && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">수강권 미리보기</h4>
          <div className="space-y-1 text-sm text-blue-800">
            <p><strong>수강권명:</strong> {previewData.subscriptionName}</p>
            <p><strong>수강 기간:</strong> {previewData.startDate} ~ {previewData.endDate}</p>
            <p><strong>총 수업 횟수:</strong> {previewData.totalLessons}회</p>
            <p><strong>최대 연기 횟수:</strong> {previewData.maxPostponements}회</p>
          </div>
        </div>
      )}

      {/* 버튼들 */}
      <div className="flex gap-3 pt-4 border-t">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !startDate || (!previewData)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? '추가 중...' : '수강권 추가'}
        </button>
      </div>
    </div>
  );
}