/**
 * Check function permissions in Supabase
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function checkPermissions() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('🔍 Checking create_invite_code function...\n');

  // Test 1: Call RPC with anon client (simulating frontend)
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  console.log('📞 Test 1: Calling RPC with anon key (no auth)...');
  const { data: anonData, error: anonError } = await supabaseAnon.rpc('create_invite_code');

  if (anonError) {
    console.log('❌ Anon RPC failed (expected):', anonError.message);
    console.log('   Code:', anonError.code);
    console.log('   Status:', anonError.status);
  } else {
    console.log('✅ Anon RPC succeeded:', anonData);
  }

  // Test 2: Sign in as a planner and try
  console.log('\n📞 Test 2: Signing in as planner and calling RPC...');

  const plannerEmail = 'testplanner-1770025511657@example.com';
  const plannerPassword = 'TestPassword123!';

  const { data: authData, error: signInError } = await supabaseAnon.auth.signInWithPassword({
    email: plannerEmail,
    password: plannerPassword
  });

  if (signInError) {
    console.log('❌ Sign in failed:', signInError.message);
  } else {
    console.log('✅ Signed in as:', authData.user.email);

    // Now try RPC call
    const { data: authedData, error: authedError } = await supabaseAnon.rpc('create_invite_code');

    if (authedError) {
      console.log('❌ Authenticated RPC failed:', authedError.message);
      console.log('   Code:', authedError.code);
      console.log('   Status:', authedError.status);
      console.log('   Details:', authedError.details);
      console.log('   Hint:', authedError.hint);
    } else {
      console.log('✅ Authenticated RPC succeeded:', JSON.stringify(authedData, null, 2));
    }
  }

  // Test 3: Check function definition using service role
  console.log('\n📞 Test 3: Checking function definition...');

  // Use raw SQL to check function
  const checkSQL = `
    SELECT
      p.proname as function_name,
      pg_get_function_identity_arguments(p.oid) as arguments,
      pg_get_functiondef(p.oid) as definition,
      p.proacl as permissions
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE p.proname = 'create_invite_code'
      AND n.nspname = 'public';
  `;

  // Since Supabase client doesn't support raw SQL, we'll document this
  console.log('ℹ️  To manually check permissions, run this SQL in Supabase Dashboard:');
  console.log(checkSQL);
}

checkPermissions().catch(console.error);
