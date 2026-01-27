import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Supabase 클라이언트 생성 (Service Role)
const supabaseUrl = 'https://ybcjkdcdruquqrdahtga.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InliY2prZGNkcnVxdXFyZGFodGdhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Njc5MzgzNSwiZXhwIjoyMDcyMzY5ODM1fQ.fN-bjFoLZ534dZtEZQIOUCT-Kgt6BkKd2cq1U1dF_I8'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function executeSql(sql, migrationName) {
  console.log(`\n🔄 Executing: ${migrationName}...`)

  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      console.error(`❌ Error in ${migrationName}:`, error)
      return false
    }

    console.log(`✅ Successfully executed: ${migrationName}`)
    return true
  } catch (err) {
    console.error(`❌ Exception in ${migrationName}:`, err)
    return false
  }
}

async function main() {
  console.log('🚀 Starting trial license migrations...\n')

  // 마이그레이션 파일 읽기
  const migration1Path = join(__dirname, '../supabase/migrations/20260127_trial_device_tracking.sql')
  const migration2Path = join(__dirname, '../supabase/migrations/20260127_extend_licenses_for_trial.sql')

  const migration1 = readFileSync(migration1Path, 'utf-8')
  const migration2 = readFileSync(migration2Path, 'utf-8')

  // 마이그레이션 실행
  const result1 = await executeSql(migration1, '20260127_trial_device_tracking.sql')
  if (!result1) {
    console.error('\n⚠️  Migration 1 failed, stopping here.')
    process.exit(1)
  }

  const result2 = await executeSql(migration2, '20260127_extend_licenses_for_trial.sql')
  if (!result2) {
    console.error('\n⚠️  Migration 2 failed.')
    process.exit(1)
  }

  console.log('\n✨ All migrations completed successfully!')

  // 검증 쿼리 실행
  console.log('\n📊 Verifying migrations...')

  const { data: tables } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public')
    .eq('table_name', 'trial_device_fingerprints')

  if (tables && tables.length > 0) {
    console.log('✅ trial_device_fingerprints table created')
  }

  const { data: columns } = await supabase
    .from('information_schema.columns')
    .select('column_name')
    .eq('table_name', 'licenses')
    .in('column_name', ['is_trial', 'trial_started_at', 'trial_expires_at'])

  if (columns && columns.length > 0) {
    console.log(`✅ Trial columns added to licenses table: ${columns.map(c => c.column_name).join(', ')}`)
  }

  console.log('\n🎉 Migration verification complete!')
}

main().catch(console.error)
