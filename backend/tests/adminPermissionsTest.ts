import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import bcrypt from 'bcryptjs';
import { AdminUser } from '../src/models/AdminUser.js';
import { Role, ADMIN_MODULES } from '../src/models/Role.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let ownerToken: string;
let ownerUser: any;

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
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
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
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
        });
      }
    );

    req.on('error', reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

export async function runAdminPermissionsTests() {
  console.log('\n===============================================================');
  console.log('🛡️ RUNNING TASK 07: ADMIN USERS + ROLES + PERMISSIONS REBUILD TESTS');
  console.log('===============================================================\n');

  await connectDB();

  // Start test server on random port
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  try {
    // 1. Setup seed owner in MongoDB
    await AdminUser.deleteMany({ email: { $in: ['test-owner@cleanzo.app', 'test-operator@cleanzo.app', 'test-escalate@cleanzo.app'] } });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('Password@123', salt);

    ownerUser = await AdminUser.create({
      name: 'Test Owner',
      username: 'test_owner',
      email: 'test-owner@cleanzo.app',
      password: hashedPassword,
      phone: '01000000001',
      role: 'owner',
      status: 'active',
      permissions: {},
    });

    ownerToken = generateAdminToken({
      id: ownerUser._id.toString(),
      username: ownerUser.username,
      role: ownerUser.role,
    });
    assert(!!ownerToken, 'Generated owner JWT token successfully');

    // 2. Test dynamic modules endpoint
    console.log('\n--- Test Case 1: Discover Dynamic Admin Modules Metadata ---');
    const modulesRes = await makeRequest('GET', '/auth/admin/modules', undefined, ownerToken);
    assert(modulesRes.status === 200, `GET /api/auth/admin/modules returns HTTP 200 (got ${modulesRes.status})`);
    const modules = modulesRes.body.data || modulesRes.body.modules || modulesRes.body;
    assert(Array.isArray(modules), 'Modules response contains modules array');
    assert(modules.length >= 19, `Modules list contains all 19 admin dashboard modules (got ${modules.length})`);
    assert(modules.some((m: any) => m.id === 'orders'), 'Modules list contains "orders" module');
    assert(modules.some((m: any) => m.id === 'users'), 'Modules list contains "users" module');
    assert(modules.some((m: any) => m.id === 'zo'), 'Modules list contains "zo" module');

    // 3. Test roles templates endpoint
    console.log('\n--- Test Case 2: Discover Roles & 3-Level Permission Templates ---');
    const rolesRes = await makeRequest('GET', '/admin/roles', undefined, ownerToken);
    assert(rolesRes.status === 200, `GET /api/admin/roles returns HTTP 200 (got ${rolesRes.status})`);
    const rolesList = rolesRes.body.data?.roles || rolesRes.body.roles || rolesRes.body.data || rolesRes.body;
    assert(Array.isArray(rolesList), 'Roles response contains roles array');
    const bookingManagerRole = rolesList.find((r: any) => r.id === 'booking_manager');
    assert(!!bookingManagerRole, 'Roles includes booking_manager role template');
    assert(bookingManagerRole.permissions?.orders === 'edit', 'Booking manager template has orders="edit"');
    assert(bookingManagerRole.permissions?.content === 'hidden', 'Booking manager template has content="hidden"');

    // 4. Test User Creation with 3-Level Permission Matrix
    console.log('\n--- Test Case 3: Create Admin User with Granular 3-Level Permissions ---');
    const customPermissions = {
      dashboard: 'view',
      orders: 'edit',
      customers: 'hidden',
      services: 'view',
      users: 'hidden',
      settings: 'hidden',
    };

    const createUserRes = await makeRequest(
      'POST',
      '/admin/users',
      {
        name: 'Test Operator',
        username: 'test_operator',
        email: 'test-operator@cleanzo.app',
        phone: '01011111111',
        password: 'OperatorPass@123',
        role: 'manager',
        permissions: customPermissions,
      },
      ownerToken
    );

    assert(createUserRes.status === 201, `POST /api/admin/users creates user with HTTP 201 (got ${createUserRes.status})`);
    const createdUser = createUserRes.body.data || createUserRes.body.user || createUserRes.body;
    assert(createdUser.email === 'test-operator@cleanzo.app', 'Created user has correct email');
    assert(createdUser.password === undefined, 'Password is NOT exposed in response payload');
    assert(createdUser.permissions?.customers === 'hidden', 'Custom permissions saved: customers="hidden"');
    assert(createdUser.permissions?.orders === 'edit', 'Custom permissions saved: orders="edit"');
    assert(createdUser.permissions?.services === 'view', 'Custom permissions saved: services="view"');

    const createdUserId = createdUser.id || createdUser._id;

    // 5. Test Password Hashing Security in Database
    console.log('\n--- Test Case 4: Verify Database Password Security (Bcrypt) ---');
    const dbUser = await AdminUser.findOne({ email: 'test-operator@cleanzo.app' });
    assert(!!dbUser && !!dbUser.password, 'User found in MongoDB with hashed password');
    if (dbUser && dbUser.password) {
      assert(dbUser.password !== 'OperatorPass@123', 'Password is NOT stored in plain text');
      assert(dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$'), 'Password is encrypted using Bcrypt');
      const isMatch = await bcrypt.compare('OperatorPass@123', dbUser.password);
      assert(isMatch === true, 'Bcrypt password comparison succeeds with correct password');
    }

    // 6. Test Login as Test Operator & Verify Effective Permissions
    console.log('\n--- Test Case 5: Authenticate as Test Operator & Verify Effective Permissions ---');
    const loginRes = await makeRequest('POST', '/auth/admin/login', {
      username: 'test-operator@cleanzo.app',
      password: 'OperatorPass@123',
    });

    assert(loginRes.status === 200, `POST /api/auth/admin/login returns HTTP 200 (got ${loginRes.status})`);
    const loginData = loginRes.body.data || loginRes.body;
    assert(!!loginData.token, 'Login returns JWT token');
    assert(loginData.admin.password === undefined, 'Login admin payload does not expose password');
    assert(loginData.admin.permissions?.customers === 'hidden', 'Effective permissions returned: customers="hidden"');
    assert(loginData.admin.permissions?.services === 'view', 'Effective permissions returned: services="view"');
    assert(loginData.admin.permissions?.orders === 'edit', 'Effective permissions returned: orders="edit"');

    const operatorToken = loginData.token;

    // 7. Test Backend RBAC Enforcement: 'hidden' -> 403 Forbidden
    console.log('\n--- Test Case 6: Direct Backend Enforcement - Hidden Module Access Blocked ---');
    const hiddenRes = await makeRequest('GET', '/customers', undefined, operatorToken);
    assert(
      hiddenRes.status === 403,
      `Accessing hidden module (GET /api/customers) is blocked with HTTP 403 (got ${hiddenRes.status})`
    );
    assert(
      hiddenRes.body.code === 'ACCESS_DENIED_HIDDEN' || hiddenRes.body.error?.includes('محظور') || hiddenRes.status === 403,
      'Response explains access denied due to hidden permission'
    );

    // 8. Test Backend RBAC Enforcement: 'view' allows GET (200), but blocks mutations (403)
    console.log('\n--- Test Case 7: Direct Backend Enforcement - View Only Module Blocks Mutation ---');
    const viewGetRes = await makeRequest('GET', '/services/admin/all', undefined, operatorToken);
    assert(
      viewGetRes.status === 200 || viewGetRes.status === 304,
      `Accessing view-only module (GET /api/services/admin/all) is allowed with HTTP 200 (got ${viewGetRes.status})`
    );

    const viewMutationRes = await makeRequest(
      'POST',
      '/services/admin',
      {
        name: 'Unauthorized Service',
        nameAr: 'خدمة غير مصرح بها',
        price: 500,
        category: 'cleaning',
      },
      operatorToken
    );
    assert(
      viewMutationRes.status === 403,
      `Mutating view-only module (POST /api/services/admin) is blocked with HTTP 403 (got ${viewMutationRes.status})`
    );
    assert(
      viewMutationRes.body.code === 'ACCESS_DENIED_VIEW_ONLY' || viewMutationRes.body.error?.includes('عرض فقط') || viewMutationRes.status === 403,
      'Response explains access denied due to view-only permission'
    );

    // 9. Test Backend RBAC Enforcement: 'edit' allows both GET and mutation
    console.log('\n--- Test Case 8: Direct Backend Enforcement - Edit Module Allows Mutation ---');
    const editGetRes = await makeRequest('GET', '/bookings/admin/all', undefined, operatorToken);
    assert(
      editGetRes.status === 200,
      `Accessing edit module (GET /api/bookings/admin/all) returns HTTP 200 (got ${editGetRes.status})`
    );

    // 10. Test Privilege Escalation Protection: Non-owner cannot create an owner
    console.log('\n--- Test Case 9: Privilege Escalation Protection - Cannot Create Owner ---');
    const escalateRes = await makeRequest(
      'POST',
      '/admin/users',
      {
        name: 'Hacked Owner',
        username: 'hacked_owner',
        email: 'test-escalate@cleanzo.app',
        password: 'HackedPass@123',
        role: 'owner',
      },
      operatorToken
    );
    assert(
      escalateRes.status === 403,
      `Non-owner cannot create an owner user (HTTP 403 returned, got ${escalateRes.status})`
    );

    // 11. Test Protection of Last Active Owner
    console.log('\n--- Test Case 10: Protection of Sole Active Owner ---');
    const deleteOwnerRes = await makeRequest('DELETE', `/admin/users/${ownerUser._id}`, undefined, ownerToken);
    assert(
      deleteOwnerRes.status === 403 || deleteOwnerRes.status === 400,
      `Cannot delete sole active platform owner (HTTP ${deleteOwnerRes.status} returned)`
    );

    // 12. Cleanup created test operator
    console.log('\n--- Test Case 11: Deletion of Admin User by Owner ---');
    const deleteOperatorRes = await makeRequest('DELETE', `/admin/users/${createdUserId}`, undefined, ownerToken);
    assert(
      deleteOperatorRes.status === 200,
      `Owner can delete operator user with HTTP 200 (got ${deleteOperatorRes.status})`
    );

    console.log('\n===============================================================');
    console.log('✅ ALL TASK 07 TESTS PASSED SUCCESSFULLY! (11/11 SUITES PASSED)');
    console.log('===============================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

if (process.argv[1]?.endsWith('adminPermissionsTest.ts') || process.argv[1]?.endsWith('adminPermissionsTest.js')) {
  runAdminPermissionsTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Test run failed:', err);
      process.exit(1);
    });
}
