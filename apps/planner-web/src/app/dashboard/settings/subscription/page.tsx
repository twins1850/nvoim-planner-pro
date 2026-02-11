'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, CreditCard, Users, Copy } from 'lucide-react';

interface SubscriptionData {
  plan_type: 'free' | 'basic' | 'pro';
  status: string;
  max_students: number;
  current_period_end: string;
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [studentCount, setStudentCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // 1. Fetch Subscription Info
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        // 2. Fetch Invite Code from Planner Profile
        const { data: profileData } = await supabase
          .from('planner_profiles')
          .select('invite_code')
          .eq('id', user.id)
          .single();

        // 3. Count Current Students
        const { count } = await supabase
          .from('student_profiles')
          .select('*', { count: 'exact', head: true })
          .eq('planner_id', user.id);

        setSubscription(subData);
        setInviteCode(profileData?.invite_code || null);
        setStudentCount(count || 0);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const generateInviteCode = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Simple random code generator (6 chars)
    const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    const { error } = await supabase
      .from('planner_profiles')
      .update({ invite_code: newCode })
      .eq('id', user.id);

    if (!error) setInviteCode(newCode);
  };

  const copyToClipboard = () => {
    if (inviteCode) {
      navigator.clipboard.writeText(inviteCode);
      alert('초대 코드가 클립보드에 복사되었습니다!');
    }
  };

  if (loading) return <div>구독 정보를 불러오는 중...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">구독 및 플랜</h1>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Connection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              학생 연결
            </CardTitle>
            <CardDescription>
              학생들과 이 코드를 공유하여 계정에 연결하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">초대 코드</p>
                <p className="text-2xl font-mono font-bold tracking-wider">
                  {inviteCode || '생성되지 않음'}
                </p>
              </div>
              {inviteCode ? (
                 <Button variant="outline" size="icon" onClick={copyToClipboard}>
                   <Copy className="h-4 w-4" />
                 </Button>
              ) : (
                <Button onClick={generateInviteCode}>코드 생성</Button>
              )}
            </div>
            <div className="text-sm text-gray-500">
              현재 학생: <span className="font-bold text-black">{studentCount}</span> / {subscription?.max_students || 10}
            </div>
          </CardContent>
        </Card>

        {/* Current Plan Card */}
        <Card className={subscription?.plan_type === 'basic' ? 'border-blue-500 border-2' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              현재 플랜: {subscription?.plan_type?.toUpperCase() || 'FREE'}
            </CardTitle>
            <CardDescription>
              요금제 및 학생 수를 관리하세요.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span>월 요금</span>
              <span className="font-bold">₩30,000 / 월</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>학생 10명 포함</span>
              <span>(추가 학생당 ₩4,000)</span>
            </div>
            <hr className="my-2"/>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">무제한 숙제 제출</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">AI 기반 분석 (출시 예정)</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">구독 관리</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
