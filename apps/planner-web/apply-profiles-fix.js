const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://ybcjkdcdruquqrdahtga.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'
);

async function applyMigration() {
  const sqlPath = path.join(__dirname, '../../supabase/migrations/999_fix_profiles_upsert.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log('마이그레이션 적용 중...\n');

  // SQL을 개별 문장으로 분리
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.match(/^DO \$\$/));

  for (const statement of statements) {
    if (statement.trim()) {
      console.log('실행 중:', statement.substring(0, 80) + '...');
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        console.error('오류:', error);
      } else {
        console.log('✅ 성공');
      }
    }
  }

  console.log('\n✅ 마이그레이션 완료!');
}

applyMigration();
