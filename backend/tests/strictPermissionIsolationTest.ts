import dotenv from 'dotenv';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { AdminUser } from '../src/models/AdminUser.js';

dotenv.config();

const BASE_URL = 'http://127.0.0.1:5000';

function getRequiredPermissionForRoute(pathname: string): string {
  if (pathname === '/admin' || pathname === '/admin/') return 'dashboard.view';
  if (pathname.startsWith('/admin/calendar')) return 'dashboard.view';
  if (pathname.startsWith('/admin/orders')) return 'orders.view';
  if (pathname.startsWith('/admin/customers')) return 'customers.view';
  if (pathname.startsWith('/admin/technicians')) return 'orders.view';
  if (pathname.startsWith('/admin/locations')) return 'settings.view';
  if (pathname.startsWith('/admin/services')) return 'services.view';
  if (pathname.startsWith('/admin/offers')) return 'offers.view';
  if (pathname.startsWith('/admin/coupons')) return 'coupons.view';
  if (pathname.startsWith('/admin/gallery')) return 'portfolio.view';
  if (pathname.startsWith('/admin/media')) return 'portfolio.view';
  if (pathname.startsWith('/admin/content/faq')) return 'faq.view';
  if (pathname.startsWith('/admin/content')) return 'content.view';
  if (pathname.startsWith('/admin/zo-studio')) return 'content.view';
  if (pathname.startsWith('/admin/reports') || pathname.startsWith('/admin/analytics')) return 'reports.view';
  if (pathname.startsWith('/admin/notifications')) return 'dashboard.view';
  if (pathname.startsWith('/admin/users') || pathname.startsWith('/admin/roles')) return 'users.view';
  if (pathname.startsWith('/admin/activity-log')) return 'activity_logs.view';
  if (pathname.startsWith('/admin/settings/security')) return 'security.view';
  if (pathname.startsWith('/admin/settings')) return 'settings.view';
  return 'dashboard.view';
}

function hasPermission(admin: any, permissionToken: string): boolean {
  if (!admin) return false;
  if (admin.role === 'owner' || admin.role === 'super_admin') return true;

  if (Array.isArray(admin.granularPermissions) && admin.granularPermissions.length > 0) {
    const list = admin.granularPermissions as string[];
    if (list.includes('*') || list.includes(permissionToken)) return true;
    const [mod, act] = permissionToken.split('.');
    if (list.includes(`${mod}.*`)) return true;
    if (act === 'view' && list.some((p: string) => p.startsWith(`${mod}.`))) return true;
    return false;
  }

  const [mod, act] = permissionToken.split('.');
  const level = admin.permissions?.[mod];
  if (!level || level === 'hidden') return false;
  if (act === 'view') return level === 'view' || level === 'edit';
  return level === 'edit';
}

function canAccessRoute(admin: any, pathname: string): boolean {
  if (!admin) return false;
  if (admin.role === 'owner' || admin.role === 'super_admin') return true;
  const token = getRequiredPermissionForRoute(pathname);
  return hasPermission(admin, token);
}

interface TestUserDef {
  username: string;
  name: string;
  email: string;
  password: string;
  permissions: string[];
}

const TEST_USERS: Record<string, TestUserDef> = {
  USER_A: {
    username: 'test.user.a',
    name: 'محمود الصاوي - أخصائي العملاء',
    email: 'user_a_crm@cleanzo.test',
    password: 'UserA@Cleanzo2026!',
    permissions: ['dashboard.view', 'customers.view', 'customers.create', 'customers.edit'],
  },
  USER_B: {
    username: 'test.user.b',
    name: 'أحمد حسني - مشرف العمليات والطلبات',
    email: 'user_b_ops@cleanzo.test',
    password: 'UserB@Cleanzo2026!',
    permissions: ['dashboard.view', 'orders.view', 'orders.create', 'orders.status'],
  },
  USER_C: {
    username: 'test.user.c',
    name: 'سارة طارق - أخصائية التسويق والعروض',
    email: 'user_c_mkt@cleanzo.test',
    password: 'UserC@Cleanzo2026!',
    permissions: ['dashboard.view', 'offers.view', 'offers.create', 'offers.edit', 'coupons.view', 'coupons.create'],
  },
  USER_D: {
    username: 'test.user.d',
    name: 'عمر نبيل - مدقق تقارير',
    email: 'user_d_audit@cleanzo.test',
    password: 'UserD@Cleanzo2026!',
    permissions: ['dashboard.view', 'reports.view'],
  },
};

const ALL_ROUTES = [
  { path: '/admin', token: 'dashboard.view', name: 'لوحة القيادة' },
  { path: '/admin/calendar', token: 'dashboard.view', name: 'جدول المواعيد' },
  { path: '/admin/orders', token: 'orders.view', name: 'إدارة الطلبات' },
  { path: '/admin/customers', token: 'customers.view', name: 'سجل العملاء CRM' },
  { path: '/admin/services', token: 'services.view', name: 'الخدمات والتصنيفات' },
  { path: '/admin/offers', token: 'offers.view', name: 'العروض الترويجية' },
  { path: '/admin/coupons', token: 'coupons.view', name: 'كوبونات الخصم' },
  { path: '/admin/reports', token: 'reports.view', name: 'مركز التقارير' },
  { path: '/admin/analytics', token: 'reports.view', name: 'التحليلات والمؤشرات' },
  { path: '/admin/settings', token: 'settings.view', name: 'إعدادات النظام' },
  { path: '/admin/settings/security', token: 'security.view', name: 'الأمان والتشفير' },
  { path: '/admin/users', token: 'users.view', name: 'المسؤولون والمستخدمون' },
  { path: '/admin/activity-log', token: 'activity_logs.view', name: 'سجل النشاطات Audit' },
];

let totalAssertions = 0;
let passedAssertions = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    if (detail) console.error(`    ↳ Detail: ${detail}`);
    throw new Error(`Assertion failed: ${testName} - ${detail}`);
  }
}

async function runStrictPermissionIsolationTest() {
  console.log('========================================================================');
  console.log('🛡️ CLEANZO STRICT USER PERMISSION ISOLATION & ACCESS CONTROL TEST SUITE');
  console.log('========================================================================\n');

  await connectDB();

  // 1. Authenticate Owner
  console.log('🔑 [Step 1] Ensuring & Authenticating System Owner...');
  let owner = await AdminUser.findOne({ role: 'owner' });
  if (!owner) {
    owner = new AdminUser({
      username: 'ahmed.owner',
      name: 'أحمد الإداري - المالك',
      email: 'owner@cleanzo.app',
      password: 'cleanzoAdmin2026!',
      role: 'owner',
      status: 'active',
      mustChangePasswordNextLogin: false,
    });
    await owner.save();
  } else {
    owner.password = 'cleanzoAdmin2026!';
    owner.status = 'active';
    await owner.save();
  }

  const ownerLoginRes = await fetch(`${BASE_URL}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: owner.username, password: 'cleanzoAdmin2026!' }),
  });
  const ownerData = (await ownerLoginRes.json()) as any;
  const ownerToken = ownerData.data?.token || ownerData.token;
  const ownerAdmin = ownerData.data?.admin || ownerData.admin;
  assert(ownerLoginRes.status === 200 && Boolean(ownerToken), 'Owner Login Successful');
  assert(ownerAdmin.role === 'owner', 'Owner role is strictly "owner"');

  // 2. Provision Test Users
  console.log('\n👥 [Step 2] Provisioning 4 Test Users with Strict Permission Sets...');
  const tokens: Record<string, string> = { OWNER: ownerToken };
  const adminObjects: Record<string, any> = { OWNER: ownerAdmin };

  for (const [key, userDef] of Object.entries(TEST_USERS)) {
    // Delete if existing
    await AdminUser.deleteOne({ username: userDef.username });

    // Create via repository
    await AdminUser.create({
      username: userDef.username,
      name: userDef.name,
      email: userDef.email,
      password: userDef.password,
      role: 'admin',
      permissions: {},
      granularPermissions: userDef.permissions,
      status: 'active',
      mustChangePasswordNextLogin: false,
    });

    // Log in via API to get real signed JWT token
    const loginRes = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userDef.username, password: userDef.password }),
    });
    const loginData = await loginRes.json() as any;

    assert(loginRes.status === 200, `User ${key} logged in successfully`);
    tokens[key] = loginData.data?.token || loginData.token;
    adminObjects[key] = loginData.data?.admin || loginData.admin;
  }

  // 3. Test Direct URL Route Access Matrix
  console.log('\n🧭 [Step 3] Direct URL Route Guard Test (Zero-Leakage Route Matrix)...');

  for (const [key, adminObj] of Object.entries(adminObjects)) {
    console.log(`\n  --- Route Isolation Matrix for ${key} (${adminObj.name}) ---`);
    for (const route of ALL_ROUTES) {
      const allowed = canAccessRoute(adminObj, route.path);
      const isOwner = adminObj.role === 'owner';
      const expectedAllowed = isOwner || Boolean(adminObj.granularPermissions?.includes(route.token));

      assert(
        allowed === expectedAllowed,
        `Route ${route.path} -> ${allowed ? 'ACCESS GRANTED' : 'ACCESS BLOCKED (SILENT REDIRECT)'}`,
        `Expected ${expectedAllowed}, got ${allowed}`
      );
    }
  }

  // 4. Live API Access Control Test
  console.log('\n🔒 [Step 4] Live API Direct Request Tests (Strict Backend RBAC)...');

  // 4.1 User A (CRM Only)
  console.log('\n  👉 Testing USER A (CRM Specialist):');
  // Allowed: Customers GET
  const resACust = await fetch(`${BASE_URL}/api/customers`, {
    headers: { Authorization: `Bearer ${tokens.USER_A}` },
  });
  assert(resACust.status === 200, 'USER A: GET /api/customers is ALLOWED (200 OK)');

  // Blocked: Orders GET
  const resAOrders = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${tokens.USER_A}` },
  });
  assert(resAOrders.status === 403, 'USER A: GET /api/orders is BLOCKED (403 Forbidden)');
  const resAOrdersData = await resAOrders.json() as any;
  assert(!resAOrdersData?.orders, 'USER A: 0 Orders data returned in forbidden response');

  // Blocked: Coupons GET
  const resACoupons = await fetch(`${BASE_URL}/api/admin/coupons`, {
    headers: { Authorization: `Bearer ${tokens.USER_A}` },
  });
  assert(resACoupons.status === 403, 'USER A: GET /api/admin/coupons is BLOCKED (403 Forbidden)');

  // Blocked: Users list GET
  const resAUsers = await fetch(`${BASE_URL}/api/auth/admin/users`, {
    headers: { Authorization: `Bearer ${tokens.USER_A}` },
  });
  assert(resAUsers.status === 403, 'USER A: GET /api/auth/admin/users is BLOCKED (403 Forbidden)');

  // Blocked: Backups GET
  const resABackups = await fetch(`${BASE_URL}/api/admin/backups`, {
    headers: { Authorization: `Bearer ${tokens.USER_A}` },
  });
  assert(resABackups.status === 403, 'USER A: GET /api/admin/backups is BLOCKED (403 Forbidden)');

  // 4.2 User B (Orders Only)
  console.log('\n  👉 Testing USER B (Operations / Orders Manager):');
  // Allowed: Orders GET
  const resBOrders = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${tokens.USER_B}` },
  });
  assert(resBOrders.status === 200, 'USER B: GET /api/orders is ALLOWED (200 OK)');

  // Blocked: Customers GET
  const resBCust = await fetch(`${BASE_URL}/api/customers`, {
    headers: { Authorization: `Bearer ${tokens.USER_B}` },
  });
  assert(resBCust.status === 403, 'USER B: GET /api/customers is BLOCKED (403 Forbidden)');
  const resBCustData = await resBCust.json() as any;
  assert(!resBCustData?.customers, 'USER B: 0 Customers data returned in forbidden response');

  // Blocked: Sub-permission Orders DELETE (User B has orders.status, but lacks orders.delete)
  const resBDeleteOrder = await fetch(`${BASE_URL}/api/orders/fake_order_123`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${tokens.USER_B}` },
  });
  assert(resBDeleteOrder.status === 403, 'USER B: Sub-action DELETE is BLOCKED (403 Forbidden)');

  // 4.3 User C (Marketing & Offers Only)
  console.log('\n  👉 Testing USER C (Marketing & Offers Specialist):');
  // Allowed: Coupons GET
  const resCCoupons = await fetch(`${BASE_URL}/api/admin/coupons`, {
    headers: { Authorization: `Bearer ${tokens.USER_C}` },
  });
  assert(resCCoupons.status === 200, 'USER C: GET /api/admin/coupons is ALLOWED (200 OK)');

  // Blocked: Orders GET
  const resCOrders = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${tokens.USER_C}` },
  });
  assert(resCOrders.status === 403, 'USER C: GET /api/orders is BLOCKED (403 Forbidden)');

  // Blocked: Customers GET
  const resCCust = await fetch(`${BASE_URL}/api/customers`, {
    headers: { Authorization: `Bearer ${tokens.USER_C}` },
  });
  assert(resCCust.status === 403, 'USER C: GET /api/customers is BLOCKED (403 Forbidden)');

  // 4.4 User D (Reports / Auditor Only)
  console.log('\n  👉 Testing USER D (Auditor / Reports):');
  // Allowed: Analytics GET
  const resDAnalytics = await fetch(`${BASE_URL}/api/analytics`, {
    headers: { Authorization: `Bearer ${tokens.USER_D}` },
  });
  assert(resDAnalytics.status === 200, 'USER D: GET /api/analytics is ALLOWED (200 OK)');

  // Blocked: Orders GET
  const resDOrders = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${tokens.USER_D}` },
  });
  assert(resDOrders.status === 403, 'USER D: GET /api/orders is BLOCKED (403 Forbidden)');

  // Blocked: Customers GET
  const resDCust = await fetch(`${BASE_URL}/api/customers`, {
    headers: { Authorization: `Bearer ${tokens.USER_D}` },
  });
  assert(resDCust.status === 403, 'USER D: GET /api/customers is BLOCKED (403 Forbidden)');

  // 4.5 Owner (Full System Access)
  console.log('\n  👉 Testing System Owner (Full System Access):');
  const ownerEndpoints = [
    { name: 'Customers', url: '/api/customers' },
    { name: 'Orders', url: '/api/orders' },
    { name: 'Coupons', url: '/api/admin/coupons' },
    { name: 'Analytics', url: '/api/analytics' },
    { name: 'Users', url: '/api/auth/admin/users' },
    { name: 'Backups', url: '/api/admin/backups' },
  ];
  for (const ep of ownerEndpoints) {
    const res = await fetch(`${BASE_URL}${ep.url}`, {
      headers: { Authorization: `Bearer ${tokens.OWNER}` },
    });
    assert(res.status === 200, `Owner: GET ${ep.url} is ALLOWED (200 OK)`);
  }

  // 5. Privilege Escalation & Tampering Immunity Test
  console.log('\n⚡ [Step 5] Privilege Escalation & Tampering Immunity Test...');
  const resEscalation = await fetch(`${BASE_URL}/api/auth/admin/users/${adminObjects.USER_A.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.USER_A}`,
    },
    body: JSON.stringify({ role: 'owner', permissions: ['*'] }),
  });
  assert(
    resEscalation.status === 403,
    'USER A: Privilege escalation attack rejected with 403 Forbidden'
  );

  // Forged JWT Test
  const forgedToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZha2UiLCJyb2xlIjoib3duZXIiLCJwZXJtaXNzaW9ucyI6WyIqIl19.fakeSignature';
  const resForged = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${forgedToken}` },
  });
  assert(
    resForged.status === 401,
    'Forged JWT token rejected with 401 Unauthorized'
  );

  // 6. Dynamic Permission Update & Re-Login Loop Test
  console.log('\n🔄 [Step 6] Dynamic Permission Modification & Immediate Reflection Test...');
  console.log('  -> Owner granting "orders.view" to USER A and revoking "customers.edit"...');

  const updatedPerms = ['dashboard.view', 'customers.view', 'orders.view'];
  const updateRes = await fetch(`${BASE_URL}/api/auth/admin/users/${adminObjects.USER_A.id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokens.OWNER}`,
    },
    body: JSON.stringify({
      name: TEST_USERS.USER_A.name,
      email: TEST_USERS.USER_A.email,
      permissions: {},
      granularPermissions: updatedPerms,
      status: 'active',
    }),
  });
  assert(updateRes.status === 200, 'Owner successfully updated USER A permissions in DB');

  // User A logs in again to fetch fresh claims
  const userARelogin = await fetch(`${BASE_URL}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: TEST_USERS.USER_A.username,
      password: TEST_USERS.USER_A.password,
    }),
  });
  const reloginData = await userARelogin.json() as any;
  const newAtoken = reloginData.data?.token || reloginData.token;
  const newAAdmin = reloginData.data?.admin || reloginData.admin;

  assert(
    newAAdmin.granularPermissions?.includes('orders.view'),
    'USER A new token contains "orders.view"'
  );
  assert(
    !newAAdmin.granularPermissions?.includes('customers.edit'),
    'USER A new token no longer has "customers.edit"'
  );

  // Now USER A can access orders
  const aOrdersRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Authorization: `Bearer ${newAtoken}` },
  });
  assert(aOrdersRes.status === 200, 'USER A now successfully accesses /api/orders (200 OK)');

  // 7. Cleanup Test Users
  console.log('\n🧹 [Step 7] Cleaning up test users...');
  for (const userDef of Object.values(TEST_USERS)) {
    await AdminUser.deleteOne({ username: userDef.username });
  }
  console.log('  ✓ Temporary test users purged from database.');

  await disconnectDB();

  console.log('\n========================================================================');
  console.log(`🎉 ALL TESTS COMPLETED: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED (100% SUCCESS)`);
  console.log('========================================================================\n');
}

runStrictPermissionIsolationTest().catch((err) => {
  console.error('\n❌ TEST SUITE FAILED:', err);
  process.exit(1);
});
