'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Clock, Sparkles, Mail } from 'lucide-react';

interface TrialInfo {
  daysLeft: number;
  expiresAt: string;
  maxStudents: number;
}

export default function TrialBanner() {
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrialInfo() {
      try {
        const supabase = createClient();

        // 현재 사용자 확인
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
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
          setLoading(false);
          return;
        }

        // 남은 일수 계산
        const now = new Date();
        const expiresAt = new Date(licenses.trial_expires_at);
        const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        setTrialInfo({
          daysLeft,
          expiresAt: licenses.trial_expires_at,
          maxStudents: licenses.max_students,
        });
      } catch (err) {
        console.error('Failed to fetch trial info:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchTrialInfo();
  }, []);

  if (loading || !trialInfo) {
    return null;
  }

  // 남은 일수에 따라 색상 변경
  const getBgColor = () => {
    if (trialInfo.daysLeft <= 1) return 'bg-red-50 border-red-200';
    if (trialInfo.daysLeft <= 3) return 'bg-orange-50 border-orange-200';
    return 'bg-blue-50 border-blue-200';
  };

  const getTextColor = () => {
    if (trialInfo.daysLeft <= 1) return 'text-red-800';
    if (trialInfo.daysLeft <= 3) return 'text-orange-800';
    return 'text-blue-800';
  };

  const getIconColor = () => {
    if (trialInfo.daysLeft <= 1) return 'text-red-600';
    if (trialInfo.daysLeft <= 3) return 'text-orange-600';
    return 'text-blue-600';
  };

  return (
    <div className={`${getBgColor()} border rounded-lg p-4 mb-6 shadow-sm`}>
      <div className="flex items-start gap-3">
        <Sparkles className={`w-6 h-6 ${getIconColor()} flex-shrink-0 mt-0.5`} />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className={`font-semibold ${getTextColor()}`}>
              무료 체험 사용 중
            </h3>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
              trialInfo.daysLeft <= 1
                ? 'bg-red-100 text-red-700'
                : trialInfo.daysLeft <= 3
                ? 'bg-orange-100 text-orange-700'
                : 'bg-blue-100 text-blue-700'
            }`}>
              <Clock className="w-3 h-3" />
              {trialInfo.daysLeft}일 남음
            </span>
          </div>

          <p className={`text-sm ${getTextColor()} mb-3`}>
            최대 {trialInfo.maxStudents}명의 학생까지 무료로 사용하실 수 있습니다.
            {trialInfo.daysLeft <= 3 && ' 체험 기간이 곧 종료됩니다!'}
          </p>

          <div className="flex items-start sm:items-center gap-3 flex-col sm:flex-row">
            <a
              href="/upgrade"
              className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium text-white transition-all ${
                trialInfo.daysLeft <= 1
                  ? 'bg-red-600 hover:bg-red-700'
                  : trialInfo.daysLeft <= 3
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              지금 업그레이드하기
            </a>

            <div className={`flex items-center gap-2 text-sm ${getTextColor()}`}>
              <Mail className="w-4 h-4" />
              <span>
                궁금한 점이 있으신가요?{' '}
                <a
                  href="mailto:support@nplannerpro.com"
                  className="font-medium underline hover:no-underline"
                >
                  문의하기
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
