const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

const plannerId = 'a3480c6a-4a29-4109-9f1b-dbcaddd56baa';

async function checkStudentNames() {
  console.log('=== 학생 이름 데이터 확인 ===\n');

  // student_profiles와 profiles 조인해서 확인
  const { data: students, error } = await supabase
    .from('student_profiles')
    .select('id, created_at')
    .eq('planner_id', plannerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('조회 오류:', error);
    return;
  }

  for (const student of students) {
    console.log(`\n학생 ID: ${student.id}`);
    console.log(`연결일: ${new Date(student.created_at).toLocaleString()}`);

    // profiles 테이블에서 이름 확인
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, role')
      .eq('id', student.id)
      .single();

    console.log('profiles 테이블:');
    console.log('  - email:', profile?.email || 'NULL');
    console.log('  - full_name:', profile?.full_name || 'NULL');
    console.log('  - role:', profile?.role || 'NULL');

    // student_profiles 테이블에서 이름 확인
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('id', student.id)
      .single();

    console.log('student_profiles 테이블:');
    console.log('  - 모든 필드:', JSON.stringify(studentProfile, null, 2));

    console.log('---');
  }
}

checkStudentNames();
