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
      alert('Invite code copied to clipboard!');
    }
  };

  if (loading) return <div>Loading subscription details...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Subscription & Plan</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        {/* Student Connection Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Student Connection
            </CardTitle>
            <CardDescription>
              Share this code with your students to connect them to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 border rounded-lg bg-gray-50">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-500">Your Invite Code</p>
                <p className="text-2xl font-mono font-bold tracking-wider">
                  {inviteCode || 'NOT GENERATED'}
                </p>
              </div>
              {inviteCode ? (
                 <Button variant="outline" size="icon" onClick={copyToClipboard}>
                   <Copy className="h-4 w-4" />
                 </Button>
              ) : (
                <Button onClick={generateInviteCode}>Generate Code</Button>
              )}
            </div>
            <div className="text-sm text-gray-500">
              Current Students: <span className="font-bold text-black">{studentCount}</span> / {subscription?.max_students || 10}
            </div>
          </CardContent>
        </Card>

        {/* Current Plan Card */}
        <Card className={subscription?.plan_type === 'basic' ? 'border-blue-500 border-2' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Current Plan: {subscription?.plan_type?.toUpperCase() || 'FREE'}
            </CardTitle>
            <CardDescription>
              Manage your billing and capacity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <span>Monthly Fee</span>
              <span className="font-bold">₩30,000 / mo</span>
            </div>
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>Includes 10 students</span>
              <span>(₩4,000 per extra student)</span>
            </div>
            <hr className="my-2"/>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">Unlimited Homework Assignments</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-500" />
                <span className="text-sm">AI-Powered Analysis (Upcoming)</span>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full">Manage Subscription</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
