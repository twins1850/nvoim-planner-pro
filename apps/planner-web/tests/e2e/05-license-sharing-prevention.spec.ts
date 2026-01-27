import { test, expect } from '@playwright/test';
import {
  generateTestEmail,
  cleanupTestUser,
  createTestLicense,
  supabaseAdmin
} from './helpers';

/**
 * Test Scenario 5: License Sharing Prevention
 *
 * Tests that paid licenses cannot be shared among multiple planners:
 * 1. Create a paid license (not trial)
 * 2. User A activates the license
 * 3. User B tries to activate the same license
 * 4. Should be blocked with "already in use" error
 * 5. Verify planner_id prevents duplicate activation
 */

test.describe('License Sharing Prevention', () => {
  let userAEmail: string;
  let userBEmail: string;
  let testLicenseKey: string;

  test.beforeEach(async () => {
    userAEmail = generateTestEmail();
    userBEmail = generateTestEmail();
    testLicenseKey = `30D-10P-TEST${Date.now()}`;
  });

  test.afterEach(async () => {
    // Cleanup test data
    await cleanupTestUser(userAEmail);
    await cleanupTestUser(userBEmail);

    // Delete test license
    await supabaseAdmin
      .from('licenses')
      .delete()
      .eq('license_key', testLicenseKey);
  });

  test('should prevent license sharing between users', async ({ browser }) => {
    // Step 1: Create a paid license (not trial)
    await createTestLicense({
      licenseKey: testLicenseKey,
      durationDays: 30,
      maxStudents: 10,
      status: 'pending',
      isTrial: false
    });

    // Step 2: User A creates account and activates license
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    // User A signup (with activation token - NOT trial mode)
    // For this test, we'll create the user manually and go directly to license activation
    const { data: { user: userA } } = await supabaseAdmin.auth.admin.createUser({
      email: userAEmail,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'User A',
        role: 'planner'
      }
    });

    expect(userA).toBeTruthy();

    // Create profile for User A
    await supabaseAdmin.from('profiles').insert({
      id: userA!.id,
      email: userAEmail,
      full_name: 'User A',
      role: 'planner'
    });

    // User A activates license via API
    const activateResponseA = await pageA.request.post('/api/licenses/activate', {
      data: {
        licenseKey: testLicenseKey
      }
    });

    const resultA = await activateResponseA.json();

    // Should succeed for User A
    expect(activateResponseA.ok()).toBe(true);
    expect(resultA.license).toBeTruthy();

    // Verify license is now activated by User A
    const { data: licenseA } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', testLicenseKey)
      .single();

    expect(licenseA.planner_id).toBe(userA!.id);
    expect(licenseA.status).toBe('active');

    await contextA.close();

    // Step 3: User B tries to activate the SAME license
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    // Create User B
    const { data: { user: userB } } = await supabaseAdmin.auth.admin.createUser({
      email: userBEmail,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'User B',
        role: 'planner'
      }
    });

    expect(userB).toBeTruthy();

    // Create profile for User B
    await supabaseAdmin.from('profiles').insert({
      id: userB!.id,
      email: userBEmail,
      full_name: 'User B',
      role: 'planner'
    });

    // User B tries to activate the same license
    const activateResponseB = await pageB.request.post('/api/licenses/activate', {
      data: {
        licenseKey: testLicenseKey
      }
    });

    const resultB = await activateResponseB.json();

    // Should fail for User B
    expect(activateResponseB.ok()).toBe(false);
    expect(resultB.error).toContain('이미 다른 플래너가 사용 중인 라이선스 키입니다');

    // Verify license is still owned by User A
    const { data: licenseB } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('license_key', testLicenseKey)
      .single();

    expect(licenseB.planner_id).toBe(userA!.id); // Still User A
    expect(licenseB.status).toBe('active');

    await contextB.close();
  });

  test('should allow license reactivation by same user', async ({ browser }) => {
    // Create license
    await createTestLicense({
      licenseKey: testLicenseKey,
      durationDays: 30,
      maxStudents: 10,
      status: 'pending',
      isTrial: false
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    // Create user
    const { data: { user } } = await supabaseAdmin.auth.admin.createUser({
      email: userAEmail,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'User A',
        role: 'planner'
      }
    });

    await supabaseAdmin.from('profiles').insert({
      id: user!.id,
      email: userAEmail,
      full_name: 'User A',
      role: 'planner'
    });

    // First activation
    const response1 = await page.request.post('/api/licenses/activate', {
      data: {
        licenseKey: testLicenseKey
      }
    });

    expect(response1.ok()).toBe(true);

    // Try to activate again (same user, same license)
    const response2 = await page.request.post('/api/licenses/activate', {
      data: {
        licenseKey: testLicenseKey
      }
    });

    const result2 = await response2.json();

    // Should succeed (same user can reactivate their own license)
    // Note: This depends on implementation - might need to adjust logic
    // Current implementation might block this, in which case test should expect error
    // For now, let's expect it to succeed or give a specific message
    expect(response2.ok()).toBe(true);

    await context.close();
  });

  test('should check planner_id in database', async () => {
    // Create license
    const license = await createTestLicense({
      licenseKey: testLicenseKey,
      durationDays: 30,
      maxStudents: 10,
      status: 'pending',
      isTrial: false
    });

    // Initially planner_id should be null
    expect(license.planner_id).toBeNull();

    // Create user
    const { data: { user } } = await supabaseAdmin.auth.admin.createUser({
      email: userAEmail,
      password: 'Password123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'User A',
        role: 'planner'
      }
    });

    // Manually activate license
    await supabaseAdmin
      .from('licenses')
      .update({
        planner_id: user!.id,
        status: 'active',
        activated_at: new Date().toISOString(),
        activated_by_user_id: user!.id
      })
      .eq('id', license.id);

    // Verify planner_id is set
    const { data: updatedLicense } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('id', license.id)
      .single();

    expect(updatedLicense.planner_id).toBe(user!.id);
    expect(updatedLicense.status).toBe('active');
  });
});
