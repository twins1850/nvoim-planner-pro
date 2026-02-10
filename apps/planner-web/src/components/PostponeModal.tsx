"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { format, addDays } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, Clock, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import ToastContainer from "./ToastContainer";

interface PostponeModalProps {
  isOpen: boolean;
  lessonId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PostponeModal({ isOpen, lessonId, onClose, onSuccess }: PostponeModalProps) {
  const { toasts, success, error, hideToast } = useToast();
  const [lesson, setLesson] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [reason, setReason] = useState<'sick' | 'emergency' | 'schedule_conflict' | 'other'>('sick');
  const [reasonDetail, setReasonDetail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setError] = useState('');

  useEffect(() => {
    if (isOpen && lessonId) {
      fetchLesson();
    }
  }, [isOpen, lessonId]);

  const fetchLesson = async () => {
    const supabase = createClient();
    const { data, error: fetchError } = await supabase
      .from('lessons')
      .select(`
        *,
        subscriptions (
          subscription_name,
          postponements_used,
          max_postponements
        )
      `)
      .eq('id', lessonId)
      .single();

    if (!fetchError && data) {
      setLesson(data);
      // 기본값: 원래 날짜 + 7일
      setRescheduleDate(format(addDays(new Date(data.scheduled_date), 7), 'yyyy-MM-dd'));
      setRescheduleTime(data.scheduled_start_time);
    }
  };

  const handlePostpone = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      setError('재수강 날짜와 시간을 선택해주세요.');
      return;
    }

    setLoading(true);
    setError('');

    const supabase = createClient();
    const { data, error: rpcError } = await supabase.rpc('postpone_lesson', {
      p_lesson_id: lessonId,
      p_reason: reason,
      p_reason_detail: reasonDetail || null,
      p_rescheduled_date: rescheduleDate,
      p_rescheduled_start_time: rescheduleTime
    });

    setLoading(false);

    if (rpcError) {
      const msg = rpcError.message;
      setError(msg);
      error('연기 신청 실패: ' + msg);
    } else if (data?.success) {
      success('수업이 성공적으로 연기되었습니다.');
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 500);
    } else {
      const errorMsg = data?.message || '연기 처리 중 오류가 발생했습니다.';
      setError(errorMsg);
      error(errorMsg);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">수업 연기</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {lesson && (
            <>
              {/* Current Lesson Info */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium mb-2 text-gray-900">현재 수업</h4>
                <p className="text-sm text-gray-700">
                  {format(new Date(lesson.scheduled_date), 'yyyy년 MM월 dd일 (E)', { locale: ko })}
                </p>
                <p className="text-sm text-gray-700">
                  {lesson.scheduled_start_time} ~ {lesson.scheduled_end_time}
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  {lesson.subscriptions.subscription_name}
                </p>
              </div>

              {/* Postponement Info */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium">연기권 사용</p>
                    <p>
                      사용: {lesson.subscriptions.postponements_used} /
                      최대: {lesson.subscriptions.max_postponements}회
                    </p>
                    <p className="mt-1">
                      남은 연기권: <strong>
                        {lesson.subscriptions.max_postponements - lesson.subscriptions.postponements_used}회
                      </strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* Reschedule Date & Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  재수강 날짜
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  재수강 시간
                </label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  연기 사유
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sick">아픔</option>
                  <option value="emergency">긴급 상황</option>
                  <option value="schedule_conflict">일정 충돌</option>
                  <option value="other">기타</option>
                </select>
              </div>

              {reason === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상세 사유
                  </label>
                  <textarea
                    value={reasonDetail}
                    onChange={(e) => setReasonDetail(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="연기 사유를 입력해주세요"
                  />
                </div>
              )}

              {/* Error */}
              {errorMessage && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <span className="text-red-700 text-sm">{errorMessage}</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
          >
            취소
          </button>
          <button
            onClick={handlePostpone}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? '처리 중...' : '연기 확정'}
          </button>
        </div>
      </div>
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </div>
  );
}
