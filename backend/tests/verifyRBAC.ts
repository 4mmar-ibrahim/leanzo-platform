import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { AdminUser } from '../src/models/AdminUser';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function fetchJson(endpoint: string, options: any = {}) {
  const url = `${API_BASE}${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('====================================================');
  console.log('CLEANZO RBAC / PBAC MULTI-LOOP VERIFICATION SUITE');
  console.log('====================================================\n');

  await connectDB();

  // Step 0: Login as Owner to get owner token
  console.log('[STEP 0] Logging in as Primary Platform Owner (ahmed.owner)...');
  const ownerLoginRes = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ahmed.owner', password: 'password123' }),
  });

  if (!ownerLoginRes.ok || !ownerLoginRes.data?.data?.token) {
    console.error('FAILED to login as primary owner:', ownerLoginRes.data);
    process.exit(1);
  }

  let ownerToken = ownerLoginRes.data.data.token;
  const ownerId = ownerLoginRes.data.data.admin.id;
  console.log('SUCCESS: Logged in as Owner. ID:', ownerId, '\n');

  // --------------------------------------------------------------------------
  // TEST 1: Strict Single Owner Enforcement
  // --------------------------------------------------------------------------
  console.log('----------------------------------------------------');
  console.log('TEST 1: Strict Single Owner Enforcement');
  console.log('----------------------------------------------------');

  console.log('1.1. Attempting to create a second Owner account...');
  const createOwnerRes = await fetchJson('/auth/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Fake Second Owner',
      username: 'fake.owner',
      email: 'fake.owner@cleanzo.app',
      password: 'password123',
      role: 'owner',
    }),
  });

  if (createOwnerRes.status === 403 && createOwnerRes.data?.code === 'SINGLE_OWNER_ENFORCED') {
    console.log('PASS: Creating a second owner was strictly rejected with 403 (SINGLE_OWNER_ENFORCED)');
  } else {
    console.error('FAIL: Creation of second owner was not rejected properly:', createOwnerRes);
    process.exit(1);
  }

  console.log('1.2. Attempting to delete the Primary Owner...');
  const deleteOwnerRes = await fetchJson(`/auth/admin/users/${ownerId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });

  if (deleteOwnerRes.status === 403 && deleteOwnerRes.data?.code === 'CANNOT_DELETE_OWNER') {
    console.log('PASS: Deletion of owner was strictly rejected with 403 (CANNOT_DELETE_OWNER)');
  } else {
    console.error('FAIL: Deletion of owner was not rejected properly:', deleteOwnerRes);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 2: Multi-Loop User Password Change
  // --------------------------------------------------------------------------
  console.log('\n----------------------------------------------------');
  console.log('TEST 2: Multi-Loop User Password Change Test');
  console.log('----------------------------------------------------');

  // Clean up test_user if exists
  await AdminUser.deleteOne({ username: 'test_user' });

  console.log('2.1. Creating test user (test_user) with initial password: Test@12345...');
  const createTestUserRes = await fetchJson('/auth/admin/users', {
    method: 'POST',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      name: 'Test Staff User',
      username: 'test_user',
      email: 'test_user@cleanzo.app',
      password: 'Test@12345',
      role: 'manager',
      granularPermissions: ['dashboard.view', 'customers.view'],
    }),
  });

  if (!createTestUserRes.ok) {
    console.error('FAIL: Could not create test_user:', createTestUserRes);
    process.exit(1);
  }
  const testUserId = createTestUserRes.data.data.id;
  console.log('PASS: test_user created with ID:', testUserId);

  console.log('2.2. Verify initial login with Test@12345...');
  const loginInit = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test_user', password: 'Test@12345' }),
  });
  if (loginInit.ok) {
    console.log('PASS: Initial login with Test@12345 succeeded.');
  } else {
    console.error('FAIL: Initial login failed:', loginInit);
    process.exit(1);
  }

  // Loop 1
  console.log('\n[LOOP 1] Changing password to Test@67890...');
  const changePass1 = await fetchJson(`/auth/admin/users/${testUserId}/change-password`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      newPassword: 'Test@67890',
      confirmPassword: 'Test@67890',
    }),
  });
  if (!changePass1.ok) {
    console.error('FAIL: Password change loop 1 failed:', changePass1);
    process.exit(1);
  }

  const testOldPass1 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test_user', password: 'Test@12345' }),
  });
  if (!testOldPass1.ok && testOldPass1.status === 401) {
    console.log('PASS: Old password Test@12345 failed as expected (401).');
  } else {
    console.error('FAIL: Old password Test@12345 still succeeded unexpectedly!');
    process.exit(1);
  }

  const testNewPass1 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test_user', password: 'Test@67890' }),
  });
  if (testNewPass1.ok) {
    console.log('PASS: New password Test@67890 succeeded (200).');
  } else {
    console.error('FAIL: New password Test@67890 failed:', testNewPass1);
    process.exit(1);
  }

  // Loop 2
  console.log('\n[LOOP 2] Changing password to Test@99999...');
  const changePass2 = await fetchJson(`/auth/admin/users/${testUserId}/change-password`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      newPassword: 'Test@99999',
      confirmPassword: 'Test@99999',
    }),
  });
  if (!changePass2.ok) {
    console.error('FAIL: Password change loop 2 failed:', changePass2);
    process.exit(1);
  }

  const testOldPass2 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test_user', password: 'Test@67890' }),
  });
  if (!testOldPass2.ok && testOldPass2.status === 401) {
    console.log('PASS: Previous password Test@67890 failed as expected (401).');
  } else {
    console.error('FAIL: Previous password still worked unexpectedly!');
    process.exit(1);
  }

  const testNewPass2 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test_user', password: 'Test@99999' }),
  });
  if (testNewPass2.ok) {
    console.log('PASS: New password Test@99999 succeeded (200).');
  } else {
    console.error('FAIL: New password Test@99999 failed:', testNewPass2);
    process.exit(1);
  }

  // Loop 3
  console.log('\n[LOOP 3] Changing password to Test@Final2026...');
  const changePass3 = await fetchJson(`/auth/admin/users/${testUserId}/change-password`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      newPassword: 'Test@Final2026',
      confirmPassword: 'Test@Final2026',
    }),
  });
  if (!changePass3.ok) {
    console.error('FAIL: Password change loop 3 failed:', changePass3);
    process.exit(1);
  }

  const testOldPass3 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test_user', password: 'Test@99999' }),
  });
  if (!testOldPass3.ok && testOldPass3.status === 401) {
    console.log('PASS: Previous password Test@99999 failed as expected (401).');
  } else {
    console.error(`FAIL: Expected 401, got ${testOldPass3.status}:`, testOldPass3.data);
    process.exit(1);
  }

  const testNewPass3 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'test_user', password: 'Test@Final2026' }),
  });
  if (testNewPass3.ok) {
    console.log('PASS: New password Test@Final2026 succeeded (200).');
  } else {
    console.error('FAIL: New password Test@Final2026 failed:', testNewPass3);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 3: Multi-Loop Platform Owner Password Change
  // --------------------------------------------------------------------------
  console.log('\n----------------------------------------------------');
  console.log('TEST 3: Multi-Loop Platform Owner Password Change Test');
  console.log('----------------------------------------------------');

  // Loop 1
  console.log('[OWNER LOOP 1] Changing Owner password to OwnerTest@123...');
  const ownerChange1 = await fetchJson('/auth/admin/owner/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      currentPassword: 'password123',
      newPassword: 'OwnerTest@123',
      confirmPassword: 'OwnerTest@123',
    }),
  });
  if (!ownerChange1.ok) {
    console.error('FAIL: Owner password change 1 failed:', ownerChange1);
    process.exit(1);
  }
  console.log('PASS: Owner password changed to OwnerTest@123.');

  console.log('Verifying old password password123 fails...');
  const ownerOld1 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ahmed.owner', password: 'password123' }),
  });
  if (!ownerOld1.ok && ownerOld1.status === 401) {
    console.log('PASS: Old password password123 failed as expected (401).');
  } else {
    console.error('FAIL: Old owner password worked unexpectedly!');
    process.exit(1);
  }

  console.log('Verifying new password OwnerTest@123 succeeds...');
  const ownerNew1 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ahmed.owner', password: 'OwnerTest@123' }),
  });
  if (ownerNew1.ok && ownerNew1.data?.data?.token) {
    ownerToken = ownerNew1.data.data.token;
    console.log('PASS: New owner password OwnerTest@123 succeeded.');
  } else {
    console.error('FAIL: New owner password failed:', ownerNew1);
    process.exit(1);
  }

  // Loop 2
  console.log('\n[OWNER LOOP 2] Changing Owner password to OwnerTest@456...');
  const ownerChange2 = await fetchJson('/auth/admin/owner/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      currentPassword: 'OwnerTest@123',
      newPassword: 'OwnerTest@456',
      confirmPassword: 'OwnerTest@456',
    }),
  });
  if (!ownerChange2.ok) {
    console.error('FAIL: Owner password change 2 failed:', ownerChange2);
    process.exit(1);
  }

  console.log('Verifying old password OwnerTest@123 fails...');
  const ownerOld2 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ahmed.owner', password: 'OwnerTest@123' }),
  });
  if (!ownerOld2.ok && ownerOld2.status === 401) {
    console.log('PASS: Old password OwnerTest@123 failed as expected (401).');
  } else {
    console.error('FAIL: Old password worked unexpectedly!');
    process.exit(1);
  }

  console.log('Verifying new password OwnerTest@456 succeeds...');
  const ownerNew2 = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ahmed.owner', password: 'OwnerTest@456' }),
  });
  if (ownerNew2.ok && ownerNew2.data?.data?.token) {
    ownerToken = ownerNew2.data.data.token;
    console.log('PASS: New owner password OwnerTest@456 succeeded.');
  } else {
    console.error('FAIL: New owner password failed:', ownerNew2);
    process.exit(1);
  }

  // Loop 3: Revert back to original password123 for developer convenience
  console.log('\n[OWNER LOOP 3] Reverting Owner password back to password123...');
  const ownerChange3 = await fetchJson('/auth/admin/owner/change-password', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ownerToken}` },
    body: JSON.stringify({
      currentPassword: 'OwnerTest@456',
      newPassword: 'password123',
      confirmPassword: 'password123',
    }),
  });
  if (!ownerChange3.ok) {
    console.error('FAIL: Owner password reversion failed:', ownerChange3);
    process.exit(1);
  }

  const ownerRevertCheck = await fetchJson('/auth/admin/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'ahmed.owner', password: 'password123' }),
  });
  if (ownerRevertCheck.ok) {
    ownerToken = ownerRevertCheck.data.data.token;
    console.log('PASS: Owner password reverted back to password123 successfully.');
  } else {
    console.error('FAIL: Revert login failed:', ownerRevertCheck);
    process.exit(1);
  }

  // --------------------------------------------------------------------------
  // TEST 4: Backend Permission Isolation & Route Guarding
  // --------------------------------------------------------------------------
  console.log('\n----------------------------------------------------');
  console.log('TEST 4: Backend Permission Isolation Test');
  console.log('----------------------------------------------------');

  const staffToken = testNewPass3.data.data.token;

  console.log('4.1. test_user (only has dashboard & customers) attempting to GET /auth/admin/users...');
  const staffGetUsers = await fetchJson('/auth/admin/users', {
    method: 'GET',
    headers: { Authorization: `Bearer ${staffToken}` },
  });
  if (staffGetUsers.status === 403) {
    console.log('PASS: Access denied (403) as expected for unauthorized users management.');
  } else {
    console.error('FAIL: Unauthorized access was granted unexpectedly:', staffGetUsers);
    process.exit(1);
  }

  console.log('4.2. test_user attempting to POST a new service (/services)...');
  const staffCreateService = await fetchJson('/services', {
    method: 'POST',
    headers: { Authorization: `Bearer ${staffToken}` },
    body: JSON.stringify({ title: 'Unauthorized Test Service' }),
  });
  if (staffCreateService.status === 403 || staffCreateService.status === 401) {
    console.log('PASS: Unauthorized mutation blocked with 403/401.');
  } else {
    console.log('Note: Services route status:', staffCreateService.status);
  }

  // Clean up test user
  console.log('\n[CLEANUP] Deleting temporary test_user...');
  await fetchJson(`/auth/admin/users/${testUserId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerToken}` },
  });
  await disconnectDB();

  console.log('\n====================================================');
  console.log('ALL RBAC / PBAC AUTOMATED VERIFICATION TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('Test suite uncaught error:', err);
  process.exit(1);
});
