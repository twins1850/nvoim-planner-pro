/**
 * Check invite code in database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function checkInviteCode() {
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

  console.log('🔍 Checking invite codes in database...\n');

  // Check planner_profiles with invite codes
  const { data: profiles, error } = await supabaseAdmin
    .from('planner_profiles')
    .select('id, invite_code, updated_at')
    .not('invite_code', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('❌ Error:', error.message);
    return;
  }

  console.log(`Found ${profiles.length} planner(s) with invite codes:\n`);

  for (const profile of profiles) {
    // Get planner email
    const { data: plannerData } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('id', profile.id)
      .single();

    console.log(`📧 ${plannerData?.email || 'Unknown'}`);
    console.log(`   ID: ${profile.id}`);
    console.log(`   Invite Code: ${profile.invite_code}`);
    console.log(`   Updated: ${profile.updated_at}`);
    console.log();
  }

  // Check all planner_profiles
  const { data: allProfiles, error: allError } = await supabaseAdmin
    .from('planner_profiles')
    .select('id, invite_code')
    .order('created_at', { ascending: false })
    .limit(10);

  if (!allError) {
    console.log(`\nTotal ${allProfiles.length} recent planner_profiles entries:`);
    for (const profile of allProfiles) {
      const { data: plannerData } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', profile.id)
        .single();

      console.log(`   ${plannerData?.email || 'Unknown'}: ${profile.invite_code || 'NULL'}`);
    }
  }
}

checkInviteCode().catch(console.error);
