const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

// Test Planner ID
const plannerId = 'a3480c6a-4a29-4109-9f1b-dbcaddd56baa';

async function checkPlannerStudents() {
  console.log('=== Test Planner의 학생 목록 ===\n');

  const { data: students, error } = await supabase
    .from('student_profiles')
    .select('id, planner_id, created_at')
    .eq('planner_id', plannerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('조회 오류:', error);
    return;
  }

  if (students.length === 0) {
    console.log('연결된 학생이 없습니다.');
    return;
  }

  console.log(`총 ${students.length}명의 학생:\n`);

  for (const student of students) {
    // 프로필 정보 가져오기
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', student.id)
      .single();

    console.log(`학생 ID: ${student.id}`);
    console.log(`이메일: ${profile?.email || '없음'}`);
    console.log(`역할: ${profile?.role || '없음'}`);
    console.log(`연결일: ${new Date(student.created_at).toLocaleString()}`);

    // 수강권 확인
    const { data: subscriptions } = await supabase
      .from('subscriptions')
      .select('status, subscription_name, start_date, end_date, remaining_lessons, total_lessons')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (subscriptions && subscriptions.length > 0) {
      const sub = subscriptions[0];
      console.log(`수강권: ${sub.subscription_name} (${sub.status})`);
      console.log(`기간: ${new Date(sub.start_date).toLocaleDateString()} ~ ${new Date(sub.end_date).toLocaleDateString()}`);
      console.log(`남은 수업: ${sub.remaining_lessons}/${sub.total_lessons}회`);
    } else {
      console.log('수강권: 없음');
    }
    console.log('---');
  }
}

checkPlannerStudents();
