// Check conversations table schema
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY environment variable not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('\n📋 Conversations 테이블 스키마 확인\n');

  // Try to query conversations table
  const { data, error } = await supabase
    .from('conversations')
    .select('*')
    .limit(5);

  if (error) {
    console.error('❌ 에러:', error);
    console.log('\n테이블이 존재하지 않거나 접근 권한이 없습니다.');
  } else {
    console.log('✅ Conversations 테이블 존재');
    console.log(`   레코드 수: ${data.length}`);

    if (data.length > 0) {
      console.log('\n첫 번째 레코드의 컬럼:');
      const columns = Object.keys(data[0]);
      columns.forEach(col => {
        console.log(`  - ${col}: ${typeof data[0][col]}`);
      });
    } else {
      console.log('\n테이블이 비어있습니다.');
    }
  }

  // Check if planner_id or teacher_id column exists
  console.log('\n컬럼 확인 (planner_id vs teacher_id):');

  const { data: withPlanner, error: plannerError } = await supabase
    .from('conversations')
    .select('planner_id')
    .limit(1);

  const { data: withTeacher, error: teacherError } = await supabase
    .from('conversations')
    .select('teacher_id')
    .limit(1);

  if (!plannerError) {
    console.log('✅ planner_id 컬럼 존재');
  } else {
    console.log('❌ planner_id 컬럼 없음:', plannerError.message);
  }

  if (!teacherError) {
    console.log('✅ teacher_id 컬럼 존재');
  } else {
    console.log('❌ teacher_id 컬럼 없음:', teacherError.message);
  }
}

main();
