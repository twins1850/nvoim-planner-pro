import { Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

/**
 * Test Helper Functions for E2E Tests
 */

// Supabase Admin Client for test data manipulation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Generate unique test email
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

/**
 * Clean up test user and associated data
 */
export async function cleanupTestUser(email: string) {
  // Get user ID
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  const user = users?.users.find(u => u.email === email);

  if (user) {
    // Delete licenses
    await supabaseAdmin
      .from('licenses')
      .delete()
      .eq('planner_id', user.id);

    // Delete profile
    await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', user.id);

    // Delete user
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
}

/**
 * Clean up trial device fingerprint
 */
export async function cleanupDeviceFingerprint(fingerprint: string) {
  await supabaseAdmin
    .from('trial_device_fingerprints')
    .delete()
    .eq('device_fingerprint', fingerprint);
}

/**
 * Get device fingerprint from browser cookies
 */
export async function getDeviceFingerprint(page: Page): Promise<string | null> {
  const cookies = await page.context().cookies();
  const fpCookie = cookies.find(c => c.name === 'device_fingerprint');
  return fpCookie?.value || null;
}

/**
 * Create a test license in database
 */
export async function createTestLicense(options: {
  licenseKey: string;
  durationDays: number;
  maxStudents: number;
  plannerId?: string;
  status?: 'pending' | 'active' | 'expired' | 'trial';
  isTrial?: boolean;
  deviceTokens?: string[];
}) {
  const {
    licenseKey,
    durationDays,
    maxStudents,
    plannerId,
    status = 'pending',
    isTrial = false,
    deviceTokens = []
  } = options;

  const { data, error } = await supabaseAdmin
    .from('licenses')
    .insert({
      license_key: licenseKey,
      duration_days: durationDays,
      max_students: maxStudents,
      planner_id: plannerId,
      status,
      is_trial: isTrial,
      device_tokens: deviceTokens,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update license expiry date for testing expiration
 */
export async function setLicenseExpired(licenseId: string) {
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1); // Yesterday

  await supabaseAdmin
    .from('licenses')
    .update({
      trial_expires_at: pastDate.toISOString(),
      expires_at: pastDate.toISOString(),
      status: 'expired',
      updated_at: new Date().toISOString()
    })
    .eq('id', licenseId);
}

/**
 * Fill signup form
 */
export async function fillSignupForm(
  page: Page,
  data: {
    fullName: string;
    email: string;
    password: string;
  }
) {
  await page.fill('input[type="text"]', data.fullName);
  await page.fill('input[type="email"]', data.email);
  const passwordFields = await page.locator('input[type="password"]').all();
  await passwordFields[0].fill(data.password);
  await passwordFields[1].fill(data.password);
}

/**
 * Wait for navigation and verify URL
 */
export async function waitForNavigation(page: Page, expectedPath: string) {
  await page.waitForURL(`**${expectedPath}`, { timeout: 10000 });
}

/**
 * Get license from database by key
 */
export async function getLicenseByKey(licenseKey: string) {
  const { data, error } = await supabaseAdmin
    .from('licenses')
    .select('*')
    .eq('license_key', licenseKey)
    .single();

  if (error) return null;
  return data;
}

/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const { data: users } = await supabaseAdmin.auth.admin.listUsers();
  return users?.users.find(u => u.email === email) || null;
}
