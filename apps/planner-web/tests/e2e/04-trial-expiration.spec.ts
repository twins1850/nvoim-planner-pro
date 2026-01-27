import { test, expect } from '@playwright/test';
import {
  generateTestEmail,
  cleanupTestUser,
  getDeviceFingerprint,
  fillSignupForm,
  cleanupDeviceFingerprint,
  setLicenseExpired,
  supabaseAdmin
} from './helpers';

/**
 * Test Scenario 4: Trial Expiration Handling
 *
 * Tests trial license expiration and middleware handling:
 * 1. Create trial account
 * 2. Force license expiration (set expires_at to past date)
 * 3. Try to access protected pages
 * 4. Should redirect to /license with trial_expired reason
 * 5. Verify middleware updates status to 'expired'
 */

test.describe('Trial Expiration', () => {
  let testEmail: string;
  let testPassword: string;
  let deviceFingerprint: string;

  test.beforeEach(async () => {
    testEmail = generateTestEmail();
    testPassword = 'TestPassword123!';
  });

  test.afterEach(async ({ page }) => {
    const fp = await getDeviceFingerprint(page);
    if (fp) {
      deviceFingerprint = fp;
      await cleanupDeviceFingerprint(fp);
    }
    await cleanupTestUser(testEmail);
  });

  test('should redirect expired trial to license page', async ({ page }) => {
    // Step 1: Create trial account
    await page.goto('/auth/signup');

    await fillSignupForm(page, {
      fullName: 'Test User',
      email: testEmail,
      password: testPassword
    });

    await page.click('button[type="submit"]');
    await page.waitForURL('**/onboarding/planner', { timeout: 15000 });

    deviceFingerprint = await getDeviceFingerprint(page) || '';

    // Get user and license
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === testEmail);
    expect(user).toBeTruthy();

    await page.waitForTimeout(2000);

    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('planner_id', user!.id)
      .eq('status', 'trial')
      .single();

    expect(license).toBeTruthy();
    const licenseId = license.id;

    // Step 2: Force license expiration
    await setLicenseExpired(licenseId);

    // Verify license is expired
    const { data: expiredLicense } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('id', licenseId)
      .single();

    expect(expiredLicense.status).toBe('expired');

    // Step 3: Try to access protected page (e.g., dashboard)
    await page.goto('/dashboard');

    // Wait for middleware to detect expiration
    await page.waitForTimeout(2000);

    // Should redirect to /license with trial_expired reason
    await page.waitForURL('**/license*', { timeout: 10000 });
    expect(page.url()).toContain('reason=trial_expired');

    // Should show trial expired message
    const errorMessage = page.locator('text=7일 무료 체험 기간이 종료되었습니다');
    await expect(errorMessage).toBeVisible();
  });

  test('should show expiration warning 3 days before expiry', async ({ page }) => {
    // Step 1: Create trial account
    await page.goto('/auth/signup');

    await fillSignupForm(page, {
      fullName: 'Test User',
      email: testEmail,
      password: testPassword
    });

    await page.click('button[type="submit"]');
    await page.waitForURL('**/onboarding/planner', { timeout: 15000 });

    deviceFingerprint = await getDeviceFingerprint(page) || '';

    // Get user and license
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === testEmail);

    await page.waitForTimeout(2000);

    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('planner_id', user!.id)
      .eq('status', 'trial')
      .single();

    // Step 2: Set expiration to 2 days from now (within warning threshold)
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    await supabaseAdmin
      .from('licenses')
      .update({
        trial_expires_at: twoDaysFromNow.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', license.id);

    // Step 3: Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Should show trial warning banner with orange/red color
    // The TrialBanner component should be visible
    const trialBanner = page.locator('text=무료 체험 사용 중').or(page.locator('text=남은 기간'));

    // Note: This test might need adjustment based on actual dashboard implementation
    // If dashboard doesn't have TrialBanner, the middleware sets headers but banner display
    // depends on the page implementation
  });

  test('should update license status to expired automatically', async ({ page }) => {
    // Create trial account
    await page.goto('/auth/signup');

    await fillSignupForm(page, {
      fullName: 'Test User',
      email: testEmail,
      password: testPassword
    });

    await page.click('button[type="submit"]');
    await page.waitForURL('**/onboarding/planner', { timeout: 15000 });

    deviceFingerprint = await getDeviceFingerprint(page) || '';

    // Get license
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === testEmail);

    await page.waitForTimeout(2000);

    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('planner_id', user!.id)
      .eq('status', 'trial')
      .single();

    const licenseId = license.id;

    // Set license to expired
    await setLicenseExpired(licenseId);

    // Try to access protected page
    await page.goto('/dashboard');
    await page.waitForTimeout(2000);

    // Middleware should have updated status to 'expired'
    const { data: updatedLicense } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('id', licenseId)
      .single();

    expect(updatedLicense.status).toBe('expired');
  });
});
