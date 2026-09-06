import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Detect whether a real Firebase backend is configured. When the frontend
// uses the demo/dummy Firebase project (no real auth), authentication-dependent
// tests cannot pass and would hang waiting on a Firebase handshake. They are
// therefore skipped (reported as SKIPPED, not PASS) until real config is provided.
function isDemoProject() {
  try {
    // Resolve the repo's frontend/.env without relying on `__dirname`, which is
    // not defined when Playwright transpiles specs to ESM. process.cwd() is the
    // frontend/ dir when running `npm test` from frontend/.
    const cwdEnv = path.join(process.cwd(), '.env');
    const env = fs.existsSync(cwdEnv) ? fs.readFileSync(cwdEnv, 'utf8') : '';
    return /PROJECT_ID\s*=\s*demo-project/.test(env) || /API_KEY\s*=\s*demo-api-key/.test(env);
  } catch {
    return true;
  }
}
const AUTH_LIVE = !isDemoProject();

test.describe('YPTT TI Tracker - Browser Tests', () => {
  
  test.beforeEach(async ({ page }) => {
    // Clear cookies via Playwright context API (always works).
    await page.context().clearCookies();
    // localStorage.clear() fails with SecurityError when the page is on
    // about:blank (the initial document before any navigation). Navigate to
    // the app origin first so localStorage is accessible, then clear it.
    // The .catch() handles the case where the dev server isn't reachable
    // (CI without webServer, etc.).
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'commit' }).catch(() => {});
    await page.evaluate(() => {
      try { localStorage.clear(); } catch { /* not on app origin yet */ }
    });
  });

  test('Login page loads correctly', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    // Check page title
    await expect(page).toHaveTitle('YPTT TI Tracker');
    
    // Check login form elements
    await expect(page.locator('h1')).toContainText('YPTT TI Tracker');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    await expect(page.locator('text=Google')).toBeVisible();
  });

  test('Redirects to login when not authenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);
    
    // Should redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });

  test('Login with valid credentials', async ({ page }) => {
    test.skip(!AUTH_LIVE, 'BLOCKED — LIVE ENVIRONMENT REQUIRED: real Firebase auth not configured (demo project)');
    await page.goto(`${BASE_URL}/login`);
    
    // Fill login form (using demo credentials)
    await page.fill('input[type="email"]', 'admin@yptt.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL(`${BASE_URL}/`);
    
    // Check dashboard elements
    await expect(page.locator('h1')).toContainText('Dashboard');
    await expect(page.locator('text=Sites')).toBeVisible();
    await expect(page.locator('text=Teams')).toBeVisible();
  });

  test('Navigation between pages works', async ({ page }) => {
    test.skip(!AUTH_LIVE, 'BLOCKED — LIVE ENVIRONMENT REQUIRED: real Firebase auth not configured (demo project)');
    // First login
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@yptt.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`);
    
    // Test Sites page
    await page.click('a[href="/sites"]');
    await expect(page).toHaveURL(`${BASE_URL}/sites`);
    await expect(page.locator('h1')).toContainText('Sites');
    
    // Test Teams page
    await page.click('a[href="/teams"]');
    await expect(page).toHaveURL(`${BASE_URL}/teams`);
    await expect(page.locator('h1')).toContainText('Teams');
    
    // Test Materials page
    await page.click('a[href="/materials"]');
    await expect(page).toHaveURL(`${BASE_URL}/materials`);
    await expect(page.locator('h1')).toContainText('Materials');
    
    // Test Validations page
    await page.click('a[href="/validations"]');
    await expect(page).toHaveURL(`${BASE_URL}/validations`);
    await expect(page.locator('h1')).toContainText('Validations');
    
    // Test Upgrades page
    await page.click('a[href="/upgrades"]');
    await expect(page).toHaveURL(`${BASE_URL}/upgrades`);
    await expect(page.locator('h1')).toContainText('PLN Upgrades');
    
    // Test Settings page
    await page.click('a[href="/settings"]');
    await expect(page).toHaveURL(`${BASE_URL}/settings`);
    await expect(page.locator('h1')).toContainText('Settings');
  });

  test('Sites page - search and filter', async ({ page }) => {
    test.skip(!AUTH_LIVE, 'BLOCKED — LIVE ENVIRONMENT REQUIRED: real Firebase auth not configured (demo project)');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@yptt.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`);
    
    await page.click('a[href="/sites"]');
    await page.waitForLoadState('networkidle');
    
    // Check search input
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();
    
    // Check region filter
    const regionFilter = page.locator('select').first();
    await expect(regionFilter).toBeVisible();
    
    // Check status filter
    const statusFilter = page.locator('select').nth(1);
    await expect(statusFilter).toBeVisible();
  });

  test('Teams page - CRUD operations', async ({ page }) => {
    test.skip(!AUTH_LIVE, 'BLOCKED — LIVE ENVIRONMENT REQUIRED: real Firebase auth not configured (demo project)');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@yptt.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`);
    
    await page.click('a[href="/teams"]');
    await page.waitForLoadState('networkidle');
    
    // Check add button
    await expect(page.locator('text=Add Team Member')).toBeVisible();
    
    // Click add button to open dialog
    await page.click('text=Add Team Member');
    
    // Check dialog fields
    await expect(page.locator('input[placeholder*="Name"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Position"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Contact"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Email"]')).toBeVisible();
    await expect(page.locator('input[placeholder*="Region/City"]')).toBeVisible();
    
    // Close dialog
    await page.click('text=Cancel');
  });

  test('Responsive design - mobile sidebar', async ({ page }) => {
    test.skip(!AUTH_LIVE, 'BLOCKED — LIVE ENVIRONMENT REQUIRED: real Firebase auth not configured (demo project)');
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@yptt.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`);
    
    // Check mobile menu button
    const menuButton = page.locator('button[aria-label="Open sidebar"]');
    await expect(menuButton).toBeVisible();
    
    // Open sidebar
    await menuButton.click();
    
    // Check sidebar is visible
    await expect(page.locator('text=YPTT TI Tracker')).toBeVisible();
    await expect(page.locator('a[href="/sites"]')).toBeVisible();
  });

  test('Auth test page accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/auth-test`);
    
    // Should show auth test page
    await expect(page.locator('h1')).toContainText('Authentication & API Test');
  });

  test('Logout works', async ({ page }) => {
    test.skip(!AUTH_LIVE, 'BLOCKED — LIVE ENVIRONMENT REQUIRED: real Firebase auth not configured (demo project)');
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', 'admin@yptt.com');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL(`${BASE_URL}/`);
    
    // Go to settings
    await page.click('a[href="/settings"]');
    
    // Click logout
    await page.click('text=Sign Out');
    
    // Should redirect to login
    await expect(page).toHaveURL(`${BASE_URL}/login`);
  });
});

test.describe('API Health Check', () => {
  test('Health endpoint responds', async ({ request }) => {
    // The health check must target the backend API gateway, NOT the SPA dev
    // server (which returns index.html for any path). The Cloud Function
    // exposes an unauthenticated /health liveness check at the gateway URL.
    // Point API_BASE_URL at the deployed gateway, e.g.
    //   https://<region>-<project>.cloudfunctions.net/gateway
    // This test is BLOCKED until a gateway is deployed — it cannot pass against
    // the Vite dev server.
    const apiBase = process.env.API_BASE_URL || '';
    test.skip(!apiBase, 'BLOCKED — LIVE ENVIRONMENT REQUIRED: no deployed Cloud Function gateway (set API_BASE_URL)');

    const response = await request.get(`${apiBase}/health`);
    expect(response.ok()).toBeTruthy();
    const data = await response.json();
    expect(data.status).toBe('ok');
  });
});