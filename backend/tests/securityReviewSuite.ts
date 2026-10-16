import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { AdminUser } from '../src/models/AdminUser.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload: string | undefined;
    if (body !== undefined) {
      payload = JSON.stringify(body);
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { raw };
          }
          resolve({ status: res.statusCode || 500, body: parsed });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runSecurityReviewSuite() {
  console.log('\n🔒 STARTING SECURITY REVIEW AUTOMATED TEST SUITE\n' + '='.repeat(60));

  await connectDB();

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  try {
    // 1. Setup / identify owner and manager admin users
    let owner = await AdminUser.findOne({ role: 'owner' });
    if (!owner) {
      owner = await AdminUser.create({
        name: 'Platform Owner',
        username: 'owner_test_' + Date.now(),
        email: `owner_${Date.now()}@cleanzo.app`,
        phone: '01000000001',
        password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'owner',
        status: 'active',
      });
    }

    let manager = await AdminUser.findOne({ role: 'manager' });
    if (!manager) {
      manager = await AdminUser.create({
        name: 'General Manager',
        username: 'manager_test_' + Date.now(),
        email: `manager_${Date.now()}@cleanzo.app`,
        phone: '01000000002',
        password: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF',
        role: 'manager',
        status: 'active',
      });
    }

    const ownerToken = generateAdminToken({
      id: owner._id.toString(),
      username: owner.username,
      role: owner.role as any,
    });

    const managerToken = generateAdminToken({
      id: manager._id.toString(),
      username: manager.username,
      role: manager.role as any,
    });

    // TEST 1: Password exclusion in GET /api/users
    console.log('\n[1] Testing Admin Users API: Password Security & Permission Resolution');
    const usersRes = await makeRequest('GET', '/users', undefined, ownerToken);
    assert(usersRes.status === 200, 'GET /api/users returns 200 OK');
    const usersList: any[] = usersRes.body.data || usersRes.body;
    assert(Array.isArray(usersList) && usersList.length > 0, 'Users list is returned as array');

    for (const u of usersList) {
      assert(u.password === undefined, `User ${u.username} does not expose password field`);
      if (u.role === 'owner') {
        assert(u.permissions !== undefined, `Owner ${u.username} has full permissions`);
      }
      if (u.lastLogin) {
        const d = new Date(u.lastLogin);
        assert(!isNaN(d.getTime()), `User ${u.username} lastLogin is a valid date string: ${u.lastLogin}`);
      }
    }

    // TEST 2: Non-owner blocked from POST /api/settings/admin/wipe-all-data (403 OWNER_ONLY_REQUIRED)
    console.log('\n[2] Testing Wipe All Data Endpoint: Non-Owner Blocked');
    const nonOwnerWipeRes = await makeRequest(
      'POST',
      '/settings/admin/wipe-all-data',
      { confirmation: 'مسح' },
      managerToken
    );
    assert(
      nonOwnerWipeRes.status === 403,
      `Non-owner receives 403 Forbidden on wipe-all-data (received ${nonOwnerWipeRes.status})`
    );

    // TEST 3: Non-owner blocked from DELETE /api/reviews/admin/all (403 OWNER_ONLY_REQUIRED)
    console.log('\n[3] Testing Clear All Reviews Endpoint: Non-Owner Blocked');
    const nonOwnerReviewsRes = await makeRequest(
      'DELETE',
      '/reviews/admin/all',
      { confirmation: 'مسح التقييمات' },
      managerToken
    );
    assert(
      nonOwnerReviewsRes.status === 403,
      `Non-owner receives 403 Forbidden on clear all reviews (received ${nonOwnerReviewsRes.status})`
    );

    // TEST 4: Owner blocked without valid typed confirmation for wipe-all-data
    console.log('\n[4] Testing Wipe All Data: Typed Confirmation Requirement');
    const ownerWipeNoConfirm = await makeRequest(
      'POST',
      '/settings/admin/wipe-all-data',
      { confirmation: 'invalid_code' },
      ownerToken
    );
    assert(
      ownerWipeNoConfirm.status === 400,
      `Owner wipe without correct confirmation returns 400 Bad Request (received ${ownerWipeNoConfirm.status})`
    );

    const ownerWipeEmpty = await makeRequest(
      'POST',
      '/settings/admin/wipe-all-data',
      {},
      ownerToken
    );
    assert(
      ownerWipeEmpty.status === 400,
      `Owner wipe with empty payload returns 400 Bad Request (received ${ownerWipeEmpty.status})`
    );

    // TEST 5: Owner blocked without valid typed confirmation for clear all reviews
    console.log('\n[5] Testing Clear All Reviews: Typed Confirmation Requirement');
    const ownerReviewsNoConfirm = await makeRequest(
      'DELETE',
      '/reviews/admin/all',
      { confirmation: 'wrong_code' },
      ownerToken
    );
    assert(
      ownerReviewsNoConfirm.status === 400,
      `Owner review clear without correct confirmation returns 400 Bad Request (received ${ownerReviewsNoConfirm.status})`
    );

    const ownerReviewsEmpty = await makeRequest(
      'DELETE',
      '/reviews/admin/all',
      {},
      ownerToken
    );
    assert(
      ownerReviewsEmpty.status === 400,
      `Owner review clear with empty payload returns 400 Bad Request (received ${ownerReviewsEmpty.status})`
    );

    // TEST 6: Encryption status check returns AES-256-GCM metadata
    console.log('\n[6] Testing Encryption Status API');
    const encStatusRes = await makeRequest(
      'GET',
      '/settings/admin/encryption-status',
      undefined,
      ownerToken
    );
    assert(encStatusRes.status === 200, 'GET /api/settings/admin/encryption-status returns 200 OK');
    const encData = encStatusRes.body.data || encStatusRes.body;
    assert(encData.algorithm?.toUpperCase() === 'AES-256-GCM', 'Encryption algorithm is AES-256-GCM');
    assert(typeof encData.isEncrypted === 'boolean', 'isEncrypted is boolean');

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL SECURITY REVIEW TESTS PASSED (6/6)');
    console.log('='.repeat(60) + '\n');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runSecurityReviewSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
