import { test, expect } from '@playwright/test';
import {
  generateTestEmail,
  cleanupTestUser,
  getDeviceFingerprint,
  fillSignupForm,
  cleanupDeviceFingerprint,
  supabaseAdmin
} from './helpers';

/**
 * Test Scenario 3: Device Binding
 *
 * Tests that trial licenses are bound to specific devices:
 * 1. Create trial account on Device A
 * 2. Try to login on Device B (different browser context)
 * 3. Should be blocked with device_mismatch error
 * 4. Verify middleware detects device mismatch
 */

test.describe('Device Binding', () => {
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

  test('should block trial license on different device', async ({ browser }) => {
    // Step 1: Create trial account on Device A (first context)
    const contextA = await browser.newContext();
    const pageA = await contextA.newPage();

    await pageA.goto('/auth/signup');

    await fillSignupForm(pageA, {
      fullName: 'Test User',
      email: testEmail,
      password: testPassword
    });

    await pageA.click('button[type="submit"]');
    await pageA.waitForURL('**/onboarding/planner', { timeout: 15000 });

    const fingerprintA = await getDeviceFingerprint(pageA) || '';
    expect(fingerprintA).toBeTruthy();

    await contextA.close();

    // Step 2: Try to login on Device B (different context = different device)
    const contextB = await browser.newContext();
    const pageB = await contextB.newPage();

    await pageB.goto('/auth/login');

    // Fill login form
    await pageB.fill('input[type="email"]', testEmail);
    await pageB.fill('input[type="password"]', testPassword);
    await pageB.click('button[type="submit"]');

    // Wait for middleware to detect device mismatch
    await pageB.waitForTimeout(3000);

    // Should redirect to /license with device_mismatch reason
    await pageB.waitForURL('**/license*', { timeout: 10000 });
    expect(pageB.url()).toContain('reason=device_mismatch');

    // Should show device mismatch error message
    const errorMessage = pageB.locator('text=체험 라이선스는 등록된 기기에서만 사용 가능합니다');
    await expect(errorMessage).toBeVisible();

    const fingerprintB = await getDeviceFingerprint(pageB) || '';

    // Fingerprints should be different
    if (fingerprintB) {
      expect(fingerprintA).not.toBe(fingerprintB);
      await cleanupDeviceFingerprint(fingerprintB);
    }

    // Cleanup first fingerprint
    await cleanupDeviceFingerprint(fingerprintA);

    await contextB.close();
  });

  test('should allow access on registered device', async ({ browser }) => {
    // Step 1: Create trial account
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('/auth/signup');

    await fillSignupForm(page1, {
      fullName: 'Test User',
      email: testEmail,
      password: testPassword
    });

    await page1.click('button[type="submit"]');
    await page1.waitForURL('**/onboarding/planner', { timeout: 15000 });

    deviceFingerprint = await getDeviceFingerprint(page1) || '';
    expect(deviceFingerprint).toBeTruthy();

    // Logout
    await page1.goto('/');

    // Step 2: Login again in SAME context (same device)
    await page1.goto('/auth/login');

    await page1.fill('input[type="email"]', testEmail);
    await page1.fill('input[type="password"]', testPassword);
    await page1.click('button[type="submit"]');

    // Wait for redirect
    await page1.waitForTimeout(3000);

    // Should NOT show device mismatch error
    // Should either redirect to dashboard or onboarding/planner
    expect(page1.url()).not.toContain('reason=device_mismatch');

    // Verify device fingerprint cookie is still the same
    const fpAfterLogin = await getDeviceFingerprint(page1) || '';
    expect(fpAfterLogin).toBe(deviceFingerprint);

    await context1.close();
  });

  test('should store device fingerprint in license', async ({ page }) => {
    await page.goto('/auth/signup');

    await fillSignupForm(page, {
      fullName: 'Test User',
      email: testEmail,
      password: testPassword
    });

    await page.click('button[type="submit"]');
    await page.waitForURL('**/onboarding/planner', { timeout: 15000 });

    deviceFingerprint = await getDeviceFingerprint(page) || '';
    expect(deviceFingerprint).toBeTruthy();

    // Get user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    const user = users?.users.find(u => u.email === testEmail);
    expect(user).toBeTruthy();

    // Wait for license creation
    await page.waitForTimeout(2000);

    // Get license
    const { data: license } = await supabaseAdmin
      .from('licenses')
      .select('*')
      .eq('planner_id', user!.id)
      .eq('status', 'trial')
      .single();

    expect(license).toBeTruthy();
    expect(license.is_trial).toBe(true);
    expect(license.device_tokens).toContain(deviceFingerprint);
  });
});
