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
 * Test Scenario 2: Duplicate Trial Prevention
 *
 * Tests that the same device cannot create multiple trial accounts:
 * 1. Create first trial account successfully
 * 2. Try to create second trial account with different email
 * 3. Should be blocked with appropriate error message
 * 4. Verify trial_device_fingerprints table prevents duplicates
 */

test.describe('Duplicate Trial Prevention', () => {
  let firstEmail: string;
  let secondEmail: string;
  let deviceFingerprint: string;

  test.beforeEach(async () => {
    firstEmail = generateTestEmail();
    secondEmail = generateTestEmail();
  });

  test.afterEach(async ({ page }) => {
    // Cleanup test data
    const fp = await getDeviceFingerprint(page);
    if (fp) {
      deviceFingerprint = fp;
      await cleanupDeviceFingerprint(fp);
    }
    await cleanupTestUser(firstEmail);
    await cleanupTestUser(secondEmail);
  });

  test('should prevent duplicate trial on same device', async ({ page, context }) => {
    // Step 1: Create first trial account
    await page.goto('/auth/signup');

    await fillSignupForm(page, {
      fullName: 'First User',
      email: firstEmail,
      password: 'Password123!'
    });

    await page.click('button[type="submit"]');

    // Wait for signup to complete
    await page.waitForURL('**/onboarding/planner', { timeout: 15000 });

    // Get device fingerprint
    deviceFingerprint = await getDeviceFingerprint(page) || '';
    expect(deviceFingerprint).toBeTruthy();

    // Verify fingerprint was recorded in database
    const { data: fpRecord } = await supabaseAdmin
      .from('trial_device_fingerprints')
      .select('*')
      .eq('device_fingerprint', deviceFingerprint)
      .single();

    expect(fpRecord).toBeTruthy();
    expect(fpRecord.trial_user_email).toBe(firstEmail);

    // Step 2: Try to create second trial account with SAME device
    // Navigate back to signup (in same browser context = same device fingerprint)
    await page.goto('/auth/signup');

    // Wait for eligibility check
    await page.waitForTimeout(2000);

    // Should show error message about device already used
    const errorMessage = page.locator('text=이 기기에서는 이미 체험 라이선스를 사용하셨습니다');
    await expect(errorMessage).toBeVisible({ timeout: 10000 });

    // Should redirect to home page
    await page.waitForURL('**/', { timeout: 5000 });
    expect(page.url()).toMatch(/\/$/);
  });

  test('should allow trial on different device', async ({ browser }) => {
    // Step 1: Create first trial account in first browser context
    const context1 = await browser.newContext();
    const page1 = await context1.newPage();

    await page1.goto('/auth/signup');

    await fillSignupForm(page1, {
      fullName: 'First User',
      email: firstEmail,
      password: 'Password123!'
    });

    await page1.click('button[type="submit"]');
    await page1.waitForURL('**/onboarding/planner', { timeout: 15000 });

    const fp1 = await getDeviceFingerprint(page1) || '';
    expect(fp1).toBeTruthy();

    await context1.close();

    // Step 2: Create second trial account in NEW browser context (different device)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    await page2.goto('/auth/signup');

    // Should NOT show error (different device)
    await page2.waitForTimeout(2000);
    const errorMessage = page2.locator('text=이 기기에서는 이미 체험 라이선스를 사용하셨습니다');
    await expect(errorMessage).not.toBeVisible();

    // Should show trial info
    await expect(page2.locator('text=🎉 7일 무료 체험 | 최대 5명')).toBeVisible();

    await fillSignupForm(page2, {
      fullName: 'Second User',
      email: secondEmail,
      password: 'Password123!'
    });

    await page2.click('button[type="submit"]');
    await page2.waitForURL('**/onboarding/planner', { timeout: 15000 });

    const fp2 = await getDeviceFingerprint(page2) || '';
    expect(fp2).toBeTruthy();

    // Fingerprints should be different
    expect(fp1).not.toBe(fp2);

    // Cleanup second fingerprint
    await cleanupDeviceFingerprint(fp1);
    await cleanupDeviceFingerprint(fp2);

    await context2.close();
  });

  test('should record device fingerprint in database', async ({ page }) => {
    await page.goto('/auth/signup');

    await fillSignupForm(page, {
      fullName: 'Test User',
      email: firstEmail,
      password: 'Password123!'
    });

    await page.click('button[type="submit"]');
    await page.waitForURL('**/onboarding/planner', { timeout: 15000 });

    deviceFingerprint = await getDeviceFingerprint(page) || '';

    // Verify record in trial_device_fingerprints
    const { data, error } = await supabaseAdmin
      .from('trial_device_fingerprints')
      .select('*')
      .eq('device_fingerprint', deviceFingerprint)
      .single();

    expect(error).toBeNull();
    expect(data).toBeTruthy();
    expect(data.trial_user_email).toBe(firstEmail);
    expect(data.device_fingerprint).toBe(deviceFingerprint);
    expect(data.first_trial_at).toBeTruthy();
  });
});
