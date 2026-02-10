const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function findPlannerForStudent() {
  try {
    // Get specific planner by email
    const { data: adminPlanner, error: adminError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('email', 'nplanner-test-1770078745589-za27cq@mailinator.com')
      .single();

    if (adminError) {
      console.error('Error finding admin planner:', adminError);
      return;
    }

    console.log('\n=== Admin 플래너 정보 ===');
    console.log('ID:', adminPlanner.id);
    console.log('이메일:', adminPlanner.email);
    console.log('이름:', adminPlanner.full_name);

    // Get students connected to this planner
    const { data: students, error: studentsError } = await supabase
      .from('student_profiles')
      .select('id, full_name, planner_id, created_at')
      .eq('planner_id', adminPlanner.id);

    if (studentsError) {
      console.error('Error getting students:', studentsError);
      return;
    }

    console.log('\n=== 연결된 학생 목록 ===');
    console.log(`총 ${students.length}명`);

    if (students.length === 0) {
      console.log('\n❌ 연결된 학생이 없습니다!');
      console.log('\n모든 학생 프로필 확인 중...');

      // Check all student profiles
      const { data: allStudents } = await supabase
        .from('student_profiles')
        .select('id, full_name, planner_id, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('\n최근 5명의 학생:');
      for (const s of allStudents || []) {
        console.log(`\n학생: ${s.full_name || '(이름없음)'}`);
        console.log(`ID: ${s.id}`);
        console.log(`Planner ID: ${s.planner_id}`);
        console.log(`Match: ${s.planner_id === adminPlanner.id ? '✅' : '❌'}`);
      }
    } else {
      for (const student of students) {
        console.log(`\n학생: ${student.full_name || '(이름없음)'}`);
        console.log(`ID: ${student.id}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

findPlannerForStudent();
