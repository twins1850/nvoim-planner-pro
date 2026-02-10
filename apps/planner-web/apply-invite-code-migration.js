/**
 * Apply invite code function migration to Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyMigration() {
  console.log('📦 Applying create_invite_code function migration...\n');

  const migrationPath = path.resolve(__dirname, '../../supabase/migrations/021_create_invite_code_function.sql');
  const sql = readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration file:', migrationPath);
  console.log('📝 SQL length:', sql.length, 'characters\n');

  try {
    // Execute SQL using Supabase REST API
    // Note: We need to use the pg client or manual execution
    console.log('ℹ️  Supabase client cannot execute raw SQL directly.');
    console.log('💡 Using PostgreSQL connection string instead...\n');

    // Try using pg client if available
    try {
      const { default: pg } = await import('pg');
      const { Client } = pg;

      // Parse Supabase URL to get connection details
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

      if (!projectRef) {
        throw new Error('Could not parse project reference from Supabase URL');
      }

      // Note: Database password is not in env vars
      console.log('❌ Cannot connect directly to PostgreSQL without database password.');
      console.log('\n💡 Please use one of these methods:\n');
      console.log('1. Supabase Dashboard SQL Editor:');
      console.log('   https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
      console.log('\n2. Supabase CLI:');
      console.log('   supabase db push\n');
      console.log('\n3. Copy and paste this SQL:\n');
      console.log('=' .repeat(80));
      console.log(sql);
      console.log('=' .repeat(80));
      console.log('\n✅ After executing the SQL, the create_invite_code function will be available!\n');

      return { success: false, method: 'manual' };
    } catch (pgError) {
      console.log('❌ pg module not installed:', pgError.message);
      console.log('\n💡 Manual execution required. Please use Supabase Dashboard:\n');
      console.log('https://supabase.com/dashboard/project/' + process.env.NEXT_PUBLIC_SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] + '/sql/new');
      console.log('\nSQL to execute:\n');
      console.log('=' .repeat(80));
      console.log(sql);
      console.log('=' .repeat(80));

      return { success: false, method: 'manual' };
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

applyMigration().catch(console.error);
