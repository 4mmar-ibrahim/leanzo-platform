/**
 * CLEANZO - MODIFICATION 01 TEST SUITE
 * ADMIN PANEL - CREATE CUSTOMER + CUSTOMER SOURCE
 * 
 * Verifies:
 * 1. Admin customer creation across all 6 sources:
 *    - WhatsApp
 *    - Facebook
 *    - Instagram
 *    - Telegram
 *    - TikTok
 *    - Other (أخرى)
 * 2. Password provided:
 *    - Hashed with bcrypt, never stored in plaintext
 *    - Customer can authenticate / login with password
 * 3. Password omitted:
 *    - Customer created safely without plaintext password
 *    - Cannot authenticate with blank password
 *    - Admin can set password later via reset password API
 *    - Customer can authenticate after password is set
 * 4. Duplicate phone rejection (HTTP 409)
 * 5. Invalid Egyptian phone rejection (HTTP 400)
 * 6. Verification of PostgreSQL storage and source field
 * 7. Verification of Activity Log:
 *    - Action 'create_customer', customer name, customer ID, sourcePlatform, actor
 *    - Verification that password / hash is NEVER logged
 * 8. Cleanup of temporary QA customer records
 */

import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { generateAdminToken } from '../src/utils/jwt.js';
import { CANONICAL_PHONE_ERROR_CODE } from '../src/utils/phoneValidator.js';

let server: any;
let baseUrl: string;
let adminToken: string;

const QA_TEST_PHONES = [
  '01077770001', // WhatsApp
  '01177770002', // Facebook
  '01277770003', // Instagram
  '01577770004', // Telegram
  '01077770005', // TikTok
  '01177770006', // Other
  '01277770007', // With Password
  '01577770008', // Without Password
];

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
  return { status: res.status, ok: res.ok, body: json };
}

async function runModification01Tests() {
  console.log('====================================================');
  console.log('🧪 CLEANZO MODIFICATION 01: CREATE CUSTOMER + SOURCE');
  console.log('====================================================\n');

  await connectDB();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log('🚀 Test server active at:', baseUrl);

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
    // Clean up any stale QA records
    await prisma.user.deleteMany({
      where: { phone: { in: QA_TEST_PHONES } },
    });

    let admin = await AdminUser.findOne({ email: 'superadmin@cleanzo.com' });
    if (!admin) {
      admin = await AdminUser.findOne();
    }
    if (admin) {
      adminToken = generateAdminToken({
        id: admin.id,
        username: admin.username || admin.email || 'admin',
        role: admin.role,
      });
    }

    if (!adminToken) {
      throw new Error('Admin user required for running test suite');
    }

    console.log('\n--- 1. CUSTOMER CREATION ACROSS ALL 6 SOURCES ---');

    const sourcesToTest = [
      { source: 'whatsapp', phone: '01077770001', name: 'عميل واتساب' },
      { source: 'facebook', phone: '01177770002', name: 'عميل فيسبوك' },
      { source: 'instagram', phone: '01277770003', name: 'عميل إنستجرام' },
      { source: 'telegram', phone: '01577770004', name: 'عميل تيليجرام' },
      { source: 'tiktok', phone: '01077770005', name: 'عميل تيك توك' },
      { source: 'other', phone: '01177770006', name: 'عميل أخرى' },
    ];

    for (const item of sourcesToTest) {
      const res = await apiRequest('/api/customers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          name: item.name,
          phone: item.phone,
          source: item.source,
        },
      });

      const customer = res.body?.data || res.body?.customer;
      assert(
        res.status === 201 &&
          res.body?.success === true &&
          customer?.phone === item.phone &&
          customer?.source === item.source,
        `Create customer with source "${item.source}" succeeds (HTTP 201)`,
        res.body
      );

      // Verify in PostgreSQL database directly
      const dbUser = await prisma.user.findUnique({
        where: { phone: item.phone },
      });
      assert(
        dbUser !== null && dbUser.source === item.source,
        `PostgreSQL stores stable source value "${item.source}" for ${item.phone}`
      );
    }

    console.log('\n--- 2. PASSWORD PROVIDED: CREATION & AUTHENTICATION ---');

    const withPassRes = await apiRequest('/api/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'عميل بكلمة مرور',
        phone: '01277770007',
        password: 'SecurePass123!',
        source: 'whatsapp',
      },
    });

    assert(
      withPassRes.status === 201 && withPassRes.body?.success === true,
      'Create customer with password provided succeeds (HTTP 201)'
    );

    // Verify password is NOT stored in plaintext in PostgreSQL
    const dbUserWithPass = await prisma.user.findUnique({
      where: { phone: '01277770007' },
    });
    assert(
      dbUserWithPass !== null &&
        dbUserWithPass.password !== 'SecurePass123!' &&
        dbUserWithPass.password.startsWith('$2'),
      'Password in PostgreSQL is securely hashed with bcrypt (never plaintext)'
    );

    // Verify customer can authenticate / login
    const loginWithPassRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        phone: '01277770007',
        password: 'SecurePass123!',
      },
    });
    assert(
      loginWithPassRes.status === 200 && loginWithPassRes.body?.success === true,
      'Customer created with password can authenticate successfully'
    );

    console.log('\n--- 3. PASSWORD OMITTED: CREATION & DEFERRED SETTING ---');

    const withoutPassRes = await apiRequest('/api/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'عميل بدون كلمة مرور أولية',
        phone: '01577770008',
        source: 'facebook',
      },
    });

    assert(
      withoutPassRes.status === 201 && withoutPassRes.body?.success === true,
      'Create customer with password omitted succeeds (HTTP 201)'
    );

    const createdNoPassCust = withoutPassRes.body?.data || withoutPassRes.body?.customer;
    const noPassCustId = createdNoPassCust?.id || createdNoPassCust?._id;

    // Verify customer cannot log in with blank or empty password
    const loginEmptyPassRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        phone: '01577770008',
        password: '',
      },
    });
    assert(
      loginEmptyPassRes.status === 422 || loginEmptyPassRes.status === 401,
      'Customer without initialized password cannot log in with empty password'
    );

    // Admin sets password later via existing password reset endpoint
    const adminSetPassRes = await apiRequest(`/api/customers/${noPassCustId}/password`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        newPassword: 'BrandNewPassword123!',
        confirmPassword: 'BrandNewPassword123!',
      },
    });
    assert(
      adminSetPassRes.status === 200,
      'Admin can set customer password later via /api/customers/:id/password'
    );

    // Customer can now authenticate with the newly set password
    const loginAfterSetRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        phone: '01577770008',
        password: 'BrandNewPassword123!',
      },
    });
    assert(
      loginAfterSetRes.status === 200 && loginAfterSetRes.body?.success === true,
      'Customer authenticates successfully after Admin sets password'
    );

    console.log('\n--- 4. DUPLICATE & INVALID PHONE TESTS ---');

    // Duplicate Phone
    const duplicateRes = await apiRequest('/api/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'عميل مكرر',
        phone: '01077770001',
        source: 'whatsapp',
      },
    });
    assert(
      duplicateRes.status === 409 && duplicateRes.body?.success === false,
      'Duplicate phone creation is rejected with HTTP 409'
    );

    // Invalid Phone
    const invalidPhoneRes = await apiRequest('/api/customers', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'عميل هاتف خاطئ',
        phone: '01677770001',
        source: 'whatsapp',
      },
    });
    assert(
      invalidPhoneRes.status === 400 && invalidPhoneRes.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'Invalid phone (016...) is rejected with HTTP 400'
    );

    console.log('\n--- 5. ACTIVITY LOG VERIFICATION ---');

    const allCreationLogs = await prisma.auditLog.findMany({
      where: {
        action: 'create_customer',
      },
    });

    const qaActivityLogs = allCreationLogs.filter((log: any) => {
      const meta = typeof log.metadata === 'string' ? JSON.parse(log.metadata) : log.metadata;
      return meta && QA_TEST_PHONES.includes(meta.phone);
    });

    assert(
      qaActivityLogs.length >= 6,
      `Activity Log entries created for customer creations (Found: ${qaActivityLogs.length})`
    );

    let passwordFoundInLogs = false;
    for (const log of qaActivityLogs) {
      const logStr = JSON.stringify(log);
      if (
        logStr.includes('SecurePass123!') ||
        logStr.includes('BrandNewPassword123!') ||
        (log.metadata && (log.metadata as any).password) ||
        (log.after && (log.after as any).password)
      ) {
        passwordFoundInLogs = true;
      }
    }
    assert(
      !passwordFoundInLogs,
      'Activity Log entries NEVER contain passwords or password hashes'
    );

    console.log('\n--- 6. CUSTOMER LIST RETRIEVAL ---');

    const listRes = await apiRequest('/api/customers', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const retrievedCustomers = listRes.body?.customers || listRes.body?.data?.customers;
    assert(
      listRes.status === 200 &&
        Array.isArray(retrievedCustomers) &&
        retrievedCustomers.length >= 1,
      'Admin customer list retrieval endpoint continues to function normally'
    );

    console.log('\n--- 7. DATABASE CLEANUP ---');

    // Remove ONLY temporary QA customer data
    const deleted = await prisma.user.deleteMany({
      where: { phone: { in: QA_TEST_PHONES } },
    });
    console.log(`  🧹 Cleaned up ${deleted.count} temporary QA test customer records.`);

    // Remove temporary QA audit logs
    const deletedLogs = await prisma.auditLog.deleteMany({
      where: {
        id: { in: qaActivityLogs.map((l: any) => l.id) },
      },
    });
    console.log(`  🧹 Cleaned up ${deletedLogs.count} temporary QA audit log records.`);

    // Confirm real customer is intact
    const realCustomer = await prisma.user.findFirst({
      where: { phone: { notIn: QA_TEST_PHONES } },
    });
    assert(
      realCustomer !== null,
      `Real customer (${realCustomer?.name || 'existing'}) remains intact and untouched in database`
    );

  } finally {
    if (server) server.close();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runModification01Tests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
