const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNjE1NzQzMCwiZXhwIjoyMDUxNzMzNDMwfQ.Lmx2Dj1kIglmE-GZQzH-YI5k_y-YNUG8JqUTOOPIDrM'
);

async function checkSchema() {
  // planner_profiles 테이블의 실제 컬럼 확인
  const { data, error } = await supabase
    .from('planner_profiles')
    .select('*')
    .limit(1);

  if (error) {
    console.log('Error:', error.message);
  } else {
    console.log('planner_profiles 테이블 샘플 데이터:', data);
    if (data && data.length > 0) {
      console.log('컬럼 목록:', Object.keys(data[0]));
    }
  }
  
  process.exit(0);
}

checkSchema();
