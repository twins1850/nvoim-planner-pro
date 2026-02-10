/**
 * Test create_invite_code RPC function
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function testInviteCodeRPC() {
  console.log('🧪 Testing create_invite_code RPC function...\n');

  // Create planner client (anon key)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  // Create admin client
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

  try {
    // Find a test planner
    const { data: planners, error: plannerError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, role')
      .eq('role', 'planner')
      .limit(1);

    if (plannerError || !planners || planners.length === 0) {
      console.log('❌ No planner found. Creating test planner...\n');

      // Create test planner
      const testEmail = `test-planner-${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: testEmail,
        password: testPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'Test Planner',
          role: 'planner'
        }
      });

      if (authError) {
        console.error('❌ Error creating test planner:', authError.message);
        return;
      }

      console.log('✅ Test planner created:', testEmail);
      console.log('   ID:', authData.user.id);

      // Create profile
      await supabaseAdmin.from('profiles').insert({
        id: authData.user.id,
        full_name: 'Test Planner',
        role: 'planner',
        email: testEmail
      });

      // Create planner_profiles entry
      await supabaseAdmin.from('planner_profiles').insert({
        id: authData.user.id,
        invite_code: null,
        total_students: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      console.log('✅ Planner profile created\n');

      // Now sign in as the planner
      const { data: sessionData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });

      if (signInError) {
        console.error('❌ Error signing in:', signInError.message);
        return;
      }

      console.log('✅ Signed in as planner\n');

    } else {
      console.log('✅ Found existing planner:', planners[0].email);
      console.log('   ID:', planners[0].id);

      // Sign in as this planner (we need password, so we'll use service role to test directly)
      console.log('\n⚠️  Using service role to test RPC directly...\n');
    }

    // Test 1: Call RPC with service role (simulate authenticated user)
    console.log('📞 Test 1: Calling create_invite_code with service role...\n');

    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('create_invite_code');

    if (rpcError) {
      console.error('❌ RPC Error:', rpcError);
      console.error('   Code:', rpcError.code);
      console.error('   Message:', rpcError.message);
      console.error('   Details:', rpcError.details);
      console.error('   Hint:', rpcError.hint);
    } else {
      console.log('✅ RPC Success:', JSON.stringify(rpcData, null, 2));
    }

    // Test 2: Check if function exists in database
    console.log('\n📞 Test 2: Verifying function exists in database...\n');

    const { data: functionCheck, error: functionError } = await supabaseAdmin
      .rpc('sql', {
        query: `SELECT proname FROM pg_proc WHERE proname = 'create_invite_code'`
      })
      .catch(async () => {
        // Fallback: use a simple select query
        return await supabaseAdmin
          .from('pg_proc')
          .select('proname')
          .eq('proname', 'create_invite_code')
          .limit(1);
      });

    console.log('Function exists check:', functionCheck ? 'Found' : 'Not found');
    if (functionError) {
      console.log('   (Could not verify - this is normal)');
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
  }
}

testInviteCodeRPC().catch(console.error);
