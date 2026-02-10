/**
 * Test invite code generation in UI using Playwright MCP
 */

import { chromium } from 'playwright';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

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

async function testUIInviteCode() {
  console.log('🧪 Testing invite code generation in UI...\n');

  // Find or create a test planner
  let plannerEmail = 'testplanner-1770025511657@example.com';
  let plannerPassword = 'TestPassword123!';

  const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
  const testUser = existingUser.users.find(u => u.email === plannerEmail);

  if (!testUser) {
    console.log('❌ Test planner not found');
    return;
  }

  console.log('✅ Found test planner:', plannerEmail);
  console.log('   ID:', testUser.id);

  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen to ALL console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    // Log all messages except Next.js dev messages
    if (!text.includes('[HMR]') && !text.includes('[Fast Refresh]')) {
      console.log(`🔍 [${type.toUpperCase()}]`, text);
    }
  });

  try {
    // Navigate to login page
    await page.goto('http://localhost:3000/auth/login');
    console.log('\n📄 Navigated to login page');

    // Login
    await page.fill('input[type="email"]', plannerEmail);
    await page.fill('input[type="password"]', plannerPassword);
    await page.click('button[type="submit"]');
    console.log('🔑 Logged in');

    // Wait for dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    console.log('📊 Reached dashboard');

    // Navigate to students page
    await page.goto('http://localhost:3000/dashboard/students');
    await page.waitForLoadState('networkidle');
    console.log('👥 Navigated to students page');

    // Click generate invite code button
    await page.click('button:has-text("초대 코드 생성")');
    console.log('🖱️ Clicked generate invite code button');

    // Wait for modal
    await page.waitForSelector('.text-2xl.font-mono', { state: 'visible', timeout: 10000 });
    const inviteCode = await page.locator('.text-2xl.font-mono').textContent();
    console.log('\n✅ Generated invite code:', inviteCode);

    // Check database
    const { data: plannerProfile } = await supabaseAdmin
      .from('planner_profiles')
      .select('invite_code')
      .eq('id', testUser.id)
      .single();

    console.log('📊 Database invite code:', plannerProfile?.invite_code);

    if (plannerProfile?.invite_code === inviteCode) {
      console.log('\n✅ SUCCESS! Invite code was saved to database!');
    } else {
      console.log('\n❌ FAILED! Invite code was NOT saved to database');
      console.log('   UI Code:', inviteCode);
      console.log('   DB Code:', plannerProfile?.invite_code);
    }

    // Keep browser open for inspection
    console.log('\n⏸️  Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

testUIInviteCode().catch(console.error);
