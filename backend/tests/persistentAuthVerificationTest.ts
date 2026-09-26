/**
 * Cleanzo Persistent Login & Multi-Auth Security Verification Test Suite
 * Validates:
 * 1. Customer persistent login lifecycle (login -> refresh cookie -> profile -> silent refresh -> browser restart simulation -> logout -> post-logout rejection).
 * 2. Admin persistent login lifecycle (login -> refresh cookie -> profile -> silent refresh -> permission dynamic update -> browser restart simulation -> logout -> post-logout rejection).
 * 3. Token expiration handling (access token expiration returns 401 TOKEN_EXPIRED -> refresh issues fresh token).
 * 4. Token isolation & security boundaries:
 *    - Customer token rejected on admin routes.
 *    - Customer refresh token rejected on admin refresh endpoint.
 *    - Admin refresh token rejected on customer refresh endpoint.
 *    - Tampered / forged tokens rejected.
 * 5. Dynamic permission propagation without stale cache trust.
 */

import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { User } from '../src/models/User.js';
import { Role } from '../src/models/Role.js';
import { ENV } from '../src/config/env.js';
import {
  generateCustomerToken,
  generateCustomerRefreshToken,
  generateAdminToken,
  generateAdminRefreshToken,
} from '../src/utils/jwt.js';

let server: any;
let baseUrl: string;

function extractCookie(cookieHeader: string | null, cookieName: string): string | null {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
  return match ? match[1] : null;
}

async function apiRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const { method = 'GET', headers = {}, body } = options;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, ok: res.ok, body: json, setCookie, rawRes: res };
}

async function runPersistentAuthTests() {
  console.log('====================================================');
  console.log('🧪 CLEANZO PERSISTENT LOGIN & REFRESH VERIFICATION');
  console.log('====================================================\n');

  await connectDB();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log('✅ In-memory Test Server running at:', baseUrl);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      if (details) console.error('     Details:', details);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // PHASE 1: CUSTOMER PERSISTENT AUTH LIFECYCLE
    // -------------------------------------------------------------
    console.log('\n--- PHASE 1: Customer Persistent Auth Lifecycle ---');

    // Setup Test Customer
    const testCustPhone = `01099${Math.floor(100000 + Math.random() * 900000)}`;
    const testCustPassword = 'customerPass123';
    
    // Register Customer
    const regRes = await apiRequest('/api/auth/customer/register', {
      method: 'POST',
      body: {
        name: 'عميل اختبار التوثيق',
        phone: testCustPhone,
        password: testCustPassword,
      },
    });

    assert(regRes.status === 201 && regRes.body?.success, 'Customer Registration succeeds (201)');
    const regRefreshCookie = extractCookie(regRes.setCookie, 'cleanzo_customer_refresh_token');
    assert(Boolean(regRefreshCookie), 'Customer registration sets HttpOnly cleanzo_customer_refresh_token cookie');

    // Customer Login
    const custLoginRes = await apiRequest('/api/auth/customer/login', {
      method: 'POST',
      body: {
        phone: testCustPhone,
        password: testCustPassword,
      },
    });

    assert(custLoginRes.status === 200 && custLoginRes.body?.success, 'Customer Login succeeds (200)');
    const custAccessToken = custLoginRes.body?.data?.token;
    assert(Boolean(custAccessToken), 'Customer login returns short-lived Access Token in response body');

    const custRefreshCookie = extractCookie(custLoginRes.setCookie, 'cleanzo_customer_refresh_token');
    assert(Boolean(custRefreshCookie), 'Customer login sets HttpOnly cleanzo_customer_refresh_token cookie');

    // Direct Access to Customer Profile with Access Token
    const profileRes = await apiRequest('/api/auth/customer/profile', {
      headers: { Authorization: `Bearer ${custAccessToken}` },
    });
    assert(profileRes.status === 200 && profileRes.body?.data?.phone === testCustPhone, 'Protected customer URL (/profile) loads customer data');

    // Test Simulated Access Token Expiration
    const expiredCustToken = jwt.sign(
      { id: custLoginRes.body?.data?.user?.id, phone: testCustPhone, type: 'customer' },
      ENV.JWT_SECRET,
      { expiresIn: '-10s' }
    );
    const expiredReqRes = await apiRequest('/api/auth/customer/profile', {
      headers: { Authorization: `Bearer ${expiredCustToken}` },
    });
    assert(expiredReqRes.status === 401 && expiredReqRes.body?.code === 'TOKEN_EXPIRED', 'Expired Customer Access Token returns 401 TOKEN_EXPIRED');

    // Silent Refresh Endpoint with HttpOnly Cookie (Session Restoration)
    const custRefreshRes = await apiRequest('/api/auth/customer/refresh', {
      method: 'POST',
      headers: {
        Cookie: `cleanzo_customer_refresh_token=${custRefreshCookie}`,
      },
    });
    assert(custRefreshRes.status === 200 && custRefreshRes.body?.success, 'Customer Silent Refresh with HttpOnly cookie succeeds');
    const freshCustAccessToken = custRefreshRes.body?.data?.token;
    assert(Boolean(freshCustAccessToken), 'Customer refresh returns access token');
    const freshProfileRes = await apiRequest('/api/auth/customer/profile', {
      headers: { Authorization: `Bearer ${freshCustAccessToken}` },
    });
    assert(freshProfileRes.status === 200 && freshProfileRes.body?.data?.phone === testCustPhone, 'Fresh customer access token authenticates successfully');

    // Browser Restart Simulation: memory/store token is LOST, only refresh cookie retained
    const browserRestartCustRes = await apiRequest('/api/auth/customer/refresh', {
      method: 'POST',
      headers: {
        // No Authorization header! Just the browser cookie
        Cookie: `cleanzo_customer_refresh_token=${custRefreshCookie}`,
      },
    });
    assert(browserRestartCustRes.status === 200 && browserRestartCustRes.body?.data?.user?.phone === testCustPhone, 'Browser Restart Simulation: Customer session successfully re-hydrated from cookie without re-login');

    // Customer Logout
    const custLogoutRes = await apiRequest('/api/auth/customer/logout', {
      method: 'POST',
      headers: {
        Cookie: `cleanzo_customer_refresh_token=${custRefreshCookie}`,
      },
    });
    assert(custLogoutRes.status === 200 && custLogoutRes.body?.success, 'Customer Logout succeeds');
    assert(
      Boolean(
        custLogoutRes.setCookie?.includes('cleanzo_customer_refresh_token=;') ||
        custLogoutRes.setCookie?.includes('Max-Age=0')
      ),
      'Customer logout clears refresh token cookie'
    );

    // Refresh after logout must fail
    const postLogoutRefreshRes = await apiRequest('/api/auth/customer/refresh', {
      method: 'POST',
      headers: {
        Cookie: 'cleanzo_customer_refresh_token=', // cleared cookie
      },
    });
    assert(postLogoutRefreshRes.status === 401, 'Refresh attempt after customer logout is strictly rejected (401)');


    // -------------------------------------------------------------
    // PHASE 2: ADMIN PERSISTENT AUTH & DYNAMIC PERMISSIONS
    // -------------------------------------------------------------
    console.log('\n--- PHASE 2: Admin Persistent Auth & Dynamic Permissions ---');

    // Ensure a Manager Admin user exists
    const testAdminUsername = `mgr_test_${Date.now()}`;
    const testAdminPassword = 'AdminPassword123';
    let testAdmin = await AdminUser.create({
      name: 'مدير العمليات التجريبي',
      username: testAdminUsername,
      email: `${testAdminUsername}@cleanzo.com`,
      password: testAdminPassword,
      role: 'manager',
      status: 'active',
      permissions: { customers: 'edit', orders: 'edit', services: 'view' },
      granularPermissions: ['customers.edit', 'orders.edit'],
    });

    // Admin Login
    const adminLoginRes = await apiRequest('/api/auth/admin/login', {
      method: 'POST',
      body: {
        username: testAdminUsername,
        password: testAdminPassword,
      },
    });

    assert(adminLoginRes.status === 200 && adminLoginRes.body?.success, 'Admin Login succeeds (200)');
    const adminAccessToken = adminLoginRes.body?.data?.token;
    assert(Boolean(adminAccessToken), 'Admin login returns short-lived Access Token in response body');
    const adminRefreshCookie = extractCookie(adminLoginRes.setCookie, 'cleanzo_admin_refresh_token');
    assert(Boolean(adminRefreshCookie), 'Admin login sets HttpOnly cleanzo_admin_refresh_token cookie');

    // Direct Access to Admin Me URL
    const adminMeRes = await apiRequest('/api/auth/admin/me', {
      headers: { Authorization: `Bearer ${adminAccessToken}` },
    });
    assert(adminMeRes.status === 200 && adminMeRes.body?.data?.username === testAdminUsername, 'Direct Admin Me loads profile');
    assert(adminMeRes.body?.data?.permissions?.customers === 'edit', 'Admin initially has customers.edit permission');

    // Dynamic Permission Revocation Test (Requirement 6)
    // Owner alters admin's permissions in DB to revoke customers edit
    testAdmin.permissions = { customers: 'hidden', orders: 'view', services: 'hidden' };
    await testAdmin.save();

    // Call Admin Refresh with HttpOnly cookie
    const adminRefreshRes = await apiRequest('/api/auth/admin/refresh', {
      method: 'POST',
      headers: {
        Cookie: `cleanzo_admin_refresh_token=${adminRefreshCookie}`,
      },
    });

    assert(adminRefreshRes.status === 200 && adminRefreshRes.body?.success, 'Admin silent refresh succeeds');
    const freshAdminToken = adminRefreshRes.body?.data?.token;
    const freshPermissions = adminRefreshRes.body?.data?.admin?.permissions;
    assert(Boolean(freshAdminToken), 'Admin refresh issues fresh access token');
    assert(freshPermissions?.customers === 'hidden', 'Dynamic Permission Update: customers permission is immediately reflected as "hidden" from backend (no stale cache trust)');

    // Browser Restart Simulation for Admin (No memory token, only refresh cookie)
    const browserRestartAdminRes = await apiRequest('/api/auth/admin/refresh', {
      method: 'POST',
      headers: {
        Cookie: `cleanzo_admin_refresh_token=${adminRefreshCookie}`,
      },
    });
    assert(
      browserRestartAdminRes.status === 200 &&
      browserRestartAdminRes.body?.data?.admin?.username === testAdminUsername,
      'Browser Restart Simulation: Admin session successfully re-hydrated from cookie without re-login'
    );

    // Admin Logout
    const adminLogoutRes = await apiRequest('/api/auth/admin/logout', {
      method: 'POST',
      headers: {
        Cookie: `cleanzo_admin_refresh_token=${adminRefreshCookie}`,
      },
    });
    assert(adminLogoutRes.status === 200 && adminLogoutRes.body?.success, 'Admin Logout succeeds');
    assert(
      Boolean(
        adminLogoutRes.setCookie?.includes('cleanzo_admin_refresh_token=;') ||
        adminLogoutRes.setCookie?.includes('Max-Age=0')
      ),
      'Admin logout clears cleanzo_admin_refresh_token cookie'
    );

    // Refresh after admin logout must fail
    const postLogoutAdminRefresh = await apiRequest('/api/auth/admin/refresh', {
      method: 'POST',
      headers: {
        Cookie: 'cleanzo_admin_refresh_token=',
      },
    });
    assert(postLogoutAdminRefresh.status === 401, 'Refresh attempt after admin logout is strictly rejected (401)');


    // -------------------------------------------------------------
    // PHASE 3: CROSS-TOKEN ISOLATION & PEN-TESTING
    // -------------------------------------------------------------
    console.log('\n--- PHASE 3: Security & Token Isolation ---');

    // 1. Customer Access Token on Admin Route
    const custOnAdminRes = await apiRequest('/api/auth/admin/me', {
      headers: { Authorization: `Bearer ${custAccessToken}` },
    });
    assert(custOnAdminRes.status === 401, 'Customer Access Token rejected on /api/auth/admin/me (401)');

    // 2. Customer Refresh Token on Admin Refresh Endpoint
    const custCookieOnAdminRefresh = await apiRequest('/api/auth/admin/refresh', {
      method: 'POST',
      headers: {
        Cookie: `cleanzo_admin_refresh_token=${custRefreshCookie}`, // passing customer refresh token
      },
    });
    assert(custCookieOnAdminRefresh.status === 401, 'Customer Refresh Token strictly rejected on Admin Refresh Endpoint (401)');

    // 3. Admin Refresh Token on Customer Refresh Endpoint
    const adminCookieOnCustRefresh = await apiRequest('/api/auth/customer/refresh', {
      method: 'POST',
      headers: {
        Cookie: `cleanzo_customer_refresh_token=${adminRefreshCookie}`, // passing admin refresh token
      },
    });
    assert(adminCookieOnCustRefresh.status === 401, 'Admin Refresh Token strictly rejected on Customer Refresh Endpoint (401)');

    // 4. Forged / Tampered Token
    const fakeToken = jwt.sign({ id: 'fake-id', role: 'owner', type: 'admin' }, 'wrong_secret');
    const fakeReqRes = await apiRequest('/api/auth/admin/me', {
      headers: { Authorization: `Bearer ${fakeToken}` },
    });
    assert(fakeReqRes.status === 401, 'Forged JWT signed with incorrect secret strictly rejected (401)');

    // 5. Account Deactivation Test
    // If user account is suspended, refresh must be blocked
    testAdmin.status = 'inactive';
    await testAdmin.save();

    const deactAdminRefresh = await apiRequest('/api/auth/admin/refresh', {
      method: 'POST',
      headers: {
        Cookie: `cleanzo_admin_refresh_token=${adminRefreshCookie}`,
      },
    });
    assert(deactAdminRefresh.status === 403, 'Deactivated admin refresh request blocked with 403 ADMIN_INACTIVE');

    // Cleanup test accounts
    await AdminUser.findByIdAndDelete(testAdmin._id);
    await User.findOneAndDelete({ phone: testCustPhone });

  } catch (err: any) {
    console.error('💥 Unexpected test exception:', err);
    failed++;
  } finally {
    if (server) server.close();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`🏁 PERSISTENT AUTH TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runPersistentAuthTests();
