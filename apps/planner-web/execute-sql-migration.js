/**
 * Execute SQL migration using postgres client
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function executeMigration() {
  console.log('📦 SQL migration 실행 시작...\n');

  // Read migration file
  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/021_create_invite_code_function.sql');
  const sql = readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration 파일:', migrationPath);
  console.log('📝 SQL 길이:', sql.length, 'characters\n');

  // Parse Supabase URL to get postgres connection details
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

  if (!projectRef) {
    console.log('❌ Supabase URL 파싱 실패');
    console.log('   URL:', supabaseUrl);
    console.log('\n💡 대신 Supabase Dashboard에서 직접 실행해주세요:');
    console.log('   1. https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('   2. 아래 SQL을 복사해서 붙여넣기:\n');
    console.log(sql);
    return;
  }

  // Note: Direct postgres connection requires database password
  // which is not available in env vars (only service role key)
  console.log('ℹ️  Postgres 직접 연결은 DB 비밀번호가 필요합니다.\n');
  console.log('💡 Supabase Dashboard SQL Editor를 사용하세요:\n');
  console.log('   1. https://supabase.com/dashboard 로그인');
  console.log('   2. 프로젝트 선택');
  console.log('   3. SQL Editor 메뉴 클릭');
  console.log('   4. "New query" 클릭');
  console.log('   5. 아래 SQL을 복사해서 붙여넣고 "Run" 클릭:\n');
  console.log('=' .repeat(80));
  console.log(sql);
  console.log('=' .repeat(80));
  console.log('\n✅ SQL을 실행하면 create_invite_code 함수가 생성됩니다!\n');
}

executeMigration().catch(console.error);
