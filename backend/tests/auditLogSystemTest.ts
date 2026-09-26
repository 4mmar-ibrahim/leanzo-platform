import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import bcrypt from 'bcryptjs';
import { AdminUser } from '../src/models/AdminUser.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Service } from '../src/models/Service.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let ownerToken: string;
let ownerUser: any;
let operatorToken: string;
let operatorUser: any;

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
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders; rawText: string }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'CleanzoAuditTestRunner/1.0',
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
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers, rawText: raw });
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

// Small helper to wait for non-blocking audit logging event loop ticks
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function runAuditLogSystemTest() {
  console.log('===============================================================');
  console.log('🚀 CLEANZO — TASK 08: AUDIT & ACTIVITY LOG FULL SYSTEM TEST');
  console.log('===============================================================');

  try {
    await connectDB();

    // 1. Setup test server
    const port = 5092;
    baseUrl = `http://127.0.0.1:${port}`;
    server = http.createServer(app);
    await new Promise<void>((resolve) => server.listen(port, resolve));
    console.log(`\n✓ Test server listening at ${baseUrl}`);

    // 2. Setup Test Owner & Operator Admin
    console.log('\n--- Setup Test Actors ---');
    ownerUser = await AdminUser.findOne({ role: 'owner' });
    if (!ownerUser) {
      ownerUser = await AdminUser.create({
        name: 'م. أحمد الشريف',
        username: 'owner@cleanzo.app',
        email: 'owner@cleanzo.app',
        phone: '01011112222',
        password: 'OwnerPass@123',
        role: 'owner',
        status: 'active',
      });
    } else {
      ownerUser.password = 'OwnerPass@123';
      await ownerUser.save();
    }
    ownerToken = generateAdminToken({
      id: ownerUser._id.toString(),
      username: ownerUser.username,
      role: ownerUser.role,
    });
    assert(!!ownerToken, 'Owner token generated successfully');

    // Create an operator user for non-owner permission tests
    await AdminUser.deleteOne({ email: 'operator-audit@cleanzo.app' });
    operatorUser = await AdminUser.create({
      name: 'كابتن محمود علي',
      username: 'operator-audit@cleanzo.app',
      email: 'operator-audit@cleanzo.app',
      phone: '01099998888',
      password: 'OperatorPass@123',
      role: 'booking_manager',
      status: 'active',
    });
    operatorToken = generateAdminToken({
      id: operatorUser._id.toString(),
      username: operatorUser.username,
      role: operatorUser.role,
    });
    assert(!!operatorToken, 'Operator token generated successfully');

    // -------------------------------------------------------------
    // Test 1: Authentication Auditing (login_success & login_failed)
    // -------------------------------------------------------------
    console.log('\n--- Test Case 1: Login Success & Failed Audit Tracking ---');
    
    // 1.1 Login success
    const ownerLoginIdent = ownerUser.email || ownerUser.username || 'owner@cleanzo.app';
    const loginSuccessRes = await makeRequest('POST', '/auth/admin/login', {
      username: ownerLoginIdent,
      password: 'OwnerPass@123',
    });
    assert(loginSuccessRes.status === 200, `POST /auth/admin/login with correct pass returned 200 (got ${loginSuccessRes.status})`);
    await wait(200);

    const successLog = await AuditLog.findOne({
      action: 'login_success',
      entityId: ownerUser._id.toString(),
    }).sort({ createdAt: -1 });

    assert(!!successLog, 'Audit log created for login_success');
    assert(successLog?.status === 'success', 'login_success status is "success"');
    assert(successLog?.module === 'auth', 'login_success module is "auth"');
    assert(Boolean(successLog?.description && successLog.description.includes('تسجيل دخول ناجح للمسؤول')), 'Description is human readable Arabic');
    assert(!!successLog?.userAgent, 'Captured User-Agent string');

    // 1.2 Login failed (wrong password)
    const badPasswordSecret = 'SuperSecretWrongPass123!';
    const loginFailedRes = await makeRequest('POST', '/auth/admin/login', {
      username: ownerLoginIdent,
      password: badPasswordSecret,
    });
    assert(loginFailedRes.status === 401, `POST /auth/admin/login with wrong pass returned 401 (got ${loginFailedRes.status})`);
    await wait(200);

    const failedLog = await AuditLog.findOne({
      action: 'login_failed',
      entityId: ownerUser._id.toString(),
    }).sort({ createdAt: -1 });

    assert(!!failedLog, 'Audit log created for login_failed');
    assert(failedLog?.status === 'failed' || failedLog?.status === 'warning', 'login_failed status is "failed" or "warning"');
    assert(Boolean(failedLog?.description && failedLog.description.includes('محاولة تسجيل دخول فاشلة')), 'Description is human readable Arabic');
    
    // CRITICAL: Ensure bad password did NOT leak anywhere into database
    const failedLogStr = JSON.stringify(failedLog?.toObject() || {});
    assert(!failedLogStr.includes(badPasswordSecret), 'CRITICAL: Plain text password was NOT leaked into failed audit log');

    // -------------------------------------------------------------
    // Test 2: Entity Operations & Field-Level Diffing (Services)
    // -------------------------------------------------------------
    console.log('\n--- Test Case 2: Entity Lifecycle & Field-Level Diff Engine ---');
    
    // 2.1 Create Service
    const createServiceRes = await makeRequest(
      'POST',
      '/services/admin',
      {
        title: 'خدمة تدقيق النشاطات التجريبية',
        titleEn: 'Audit Test Service',
        description: 'وصف تجريبي لفحص نظام التدقيق',
        descriptionEn: 'Test description for audit system',
        image: '/images/services/audit-test.jpg',
        price: 500,
        duration: 45,
        category: 'car',
        features: ['ميزة 1', 'ميزة 2'],
      },
      ownerToken
    );
    assert(createServiceRes.status === 201, `POST /services/admin returned 201 (got ${createServiceRes.status} - ${JSON.stringify(createServiceRes.body)})`);
    const serviceId = createServiceRes.body.data.id || createServiceRes.body.data._id;
    await wait(200);

    const createServiceLog = await AuditLog.findOne({
      action: 'create_service',
      entityId: serviceId,
    }).sort({ createdAt: -1 });

    assert(!!createServiceLog, 'Audit log created for create_service');
    assert(createServiceLog?.module === 'services', 'Module is "services"');
    assert(createServiceLog?.status === 'success', 'Status is "success"');
    assert(createServiceLog?.after?.price === 500, 'Snapshot of created service price is 500');

    // 2.2 Update Service with price and duration change (Diff engine test)
    const updateServiceRes = await makeRequest(
      'PUT',
      `/services/admin/${serviceId}`,
      {
        price: 650,
        duration: 60,
      },
      ownerToken
    );
    assert(updateServiceRes.status === 200, `PUT /services/admin/${serviceId} returned 200 (got ${updateServiceRes.status})`);
    await wait(200);

    const updateServiceLog = await AuditLog.findOne({
      action: 'update_service',
      entityId: serviceId,
    }).sort({ createdAt: -1 });

    assert(!!updateServiceLog, 'Audit log created for update_service');
    assert(Array.isArray(updateServiceLog?.diff) && updateServiceLog!.diff.length >= 2, 'Diff array has calculated field changes');
    
    const priceDiff = updateServiceLog?.diff?.find((d) => d.field === 'price');
    assert(!!priceDiff, 'Diff contains "price" field change');
    assert(priceDiff?.before === 500, `Price before was 500 (got ${priceDiff?.before})`);
    assert(priceDiff?.after === 650, `Price after is 650 (got ${priceDiff?.after})`);
    assert(priceDiff?.fieldLabelAr === 'السعر' || priceDiff?.fieldLabelAr === 'السعر الأساسي', `Arabic label for price is valid (got ${priceDiff?.fieldLabelAr})`);

    const durationDiff = updateServiceLog?.diff?.find((d) => d.field === 'duration');
    assert(!!durationDiff, 'Diff contains "duration" field change');
    assert(durationDiff?.before === 45 && durationDiff?.after === 60, 'Duration diff correctly calculated (45 -> 60)');

    // 2.3 Delete Service
    const deleteServiceRes = await makeRequest('DELETE', `/services/admin/${serviceId}`, undefined, ownerToken);
    assert(deleteServiceRes.status === 200, `DELETE /services/admin/${serviceId} returned 200 (got ${deleteServiceRes.status})`);
    await wait(200);

    const deleteServiceLog = await AuditLog.findOne({
      action: 'delete_service',
      entityId: serviceId,
    }).sort({ createdAt: -1 });
    assert(!!deleteServiceLog, 'Audit log created for delete_service');
    assert(deleteServiceLog?.before?.price === 650, 'Delete log preserved previous snapshot state');

    // -------------------------------------------------------------
    // Test 3: Password Change Zero-Leakage Guarantee
    // -------------------------------------------------------------
    console.log('\n--- Test Case 3: Zero Sensitive Data Leakage on User Password Update ---');
    const secretPasswordUpdate = 'NewSuperSecretPass@2026';
    const updateUserRes = await makeRequest(
      'PUT',
      `/auth/admin/users/${operatorUser._id}`,
      {
        name: 'كابتن محمود علي المحدث',
        password: secretPasswordUpdate,
      },
      ownerToken
    );
    assert(updateUserRes.status === 200, `PUT /auth/admin/users/${operatorUser._id} returned 200 (got ${updateUserRes.status})`);
    await wait(200);

    const userUpdateLog = await AuditLog.findOne({
      action: { $in: ['password_change', 'update_admin_user'] },
      entityId: operatorUser._id.toString(),
    }).sort({ createdAt: -1 });

    assert(!!userUpdateLog, 'Audit log created for password_change / update_admin_user');
    const userLogStr = JSON.stringify(userUpdateLog?.toObject() || {});
    assert(!userLogStr.includes(secretPasswordUpdate), 'CRITICAL: Plain text updated password NOT leaked in log');
    assert(!userLogStr.includes('$2a$') && !userLogStr.includes('$2b$'), 'CRITICAL: Hashed password NOT leaked in log');
    assert(userUpdateLog?.details?.includes('كلمة المرور') || userUpdateLog?.action === 'password_change', 'Audit log specifically tracked password change without credential leakage');

    // -------------------------------------------------------------
    // Test 4: Query, Filter & Server-Side Pagination Engine
    // -------------------------------------------------------------
    console.log('\n--- Test Case 4: Query, Filter & Server-Side Pagination ---');
    const getLogsRes = await makeRequest('GET', '/audit-logs?page=1&limit=5', undefined, ownerToken);
    assert(getLogsRes.status === 200, `GET /api/audit-logs returned 200 (got ${getLogsRes.status})`);
    
    const logData = getLogsRes.body.data;
    assert(Array.isArray(logData.logs), 'Returns logs array');
    assert(logData.logs.length <= 5, `Paginated to limit: 5 (got ${logData.logs.length})`);
    assert(typeof logData.pagination?.total === 'number' && logData.pagination.total > 0, 'Pagination total count returned');
    assert(logData.pagination.page === 1, 'Pagination page is 1');
    assert(logData.pagination.limit === 5, 'Pagination limit is 5');
    assert(typeof logData.summary?.total === 'number', 'Summary total KPI returned');
    assert(typeof logData.summary?.success === 'number', 'Summary success KPI returned');
    assert(typeof logData.summary?.warning === 'number', 'Summary warning KPI returned');

    // 4.1 Filter by module
    const filterModuleRes = await makeRequest('GET', '/audit-logs?module=services', undefined, ownerToken);
    assert(filterModuleRes.status === 200, 'GET /audit-logs?module=services returned 200');
    const serviceLogs = filterModuleRes.body.data.logs;
    assert(serviceLogs.every((l: any) => l.module === 'services'), 'All returned logs have module="services"');

    // 4.2 Filter by status
    const filterStatusRes = await makeRequest('GET', '/audit-logs?status=warning', undefined, ownerToken);
    assert(filterStatusRes.status === 200, 'GET /audit-logs?status=warning returned 200');
    const warningLogs = filterStatusRes.body.data.logs;
    assert(warningLogs.every((l: any) => l.status === 'warning'), 'All returned logs have status="warning"');

    // 4.3 Filter by search query
    const searchRes = await makeRequest('GET', '/audit-logs?search=تسجيل', undefined, ownerToken);
    assert(searchRes.status === 200, 'GET /audit-logs?search=تسجيل returned 200');
    assert(searchRes.body.data.logs.length > 0, 'Search returned matching Arabic records');

    // -------------------------------------------------------------
    // Test 5: CSV Export with UTF-8 BOM
    // -------------------------------------------------------------
    console.log('\n--- Test Case 5: CSV Export with UTF-8 BOM ---');
    const exportRes = await makeRequest('GET', '/audit-logs/export', undefined, ownerToken);
    assert(exportRes.status === 200, `GET /api/audit-logs/export returned 200 (got ${exportRes.status})`);
    const contentType = (exportRes.headers['content-type'] as string) || '';
    assert(contentType.includes('text/csv'), `Content-Type is text/csv (got ${contentType})`);
    
    // Check UTF-8 BOM (\uFEFF) at first position
    assert(exportRes.rawText.charCodeAt(0) === 0xfeff, 'CSV begins with UTF-8 BOM (0xFEFF) for Arabic Excel compatibility');
    assert(exportRes.rawText.includes('المسؤول'), 'CSV includes Arabic header "المسؤول"');
    assert(exportRes.rawText.includes('الإجراء'), 'CSV includes Arabic header "الإجراء"');

    // -------------------------------------------------------------
    // Test 6: Immutability & Purge Authorization Security
    // -------------------------------------------------------------
    console.log('\n--- Test Case 6: Immutability & Owner Purge Control ---');
    
    // 6.1 Non-owner attempt to purge logs -> MUST return 403 Forbidden
    operatorUser.permissions = { activity_logs: 'edit' };
    await operatorUser.save();
    const unauthPurgeRes = await makeRequest('DELETE', '/audit-logs/purge?retentionDays=30', undefined, operatorToken);
    assert(unauthPurgeRes.status === 403, `DELETE /audit-logs/purge by non-owner returned 403 Forbidden (got ${unauthPurgeRes.status})`);
    assert(
      unauthPurgeRes.body.code === 'OWNER_REQUIRED' || unauthPurgeRes.body.code?.startsWith('ACCESS_DENIED'),
      `Error code indicates forbidden non-owner action (got ${unauthPurgeRes.body.code})`
    );

    // 6.2 Owner purge with retention -> MUST succeed
    const ownerPurgeRes = await makeRequest('DELETE', '/audit-logs/purge?retentionDays=365', undefined, ownerToken);
    assert(ownerPurgeRes.status === 200, `DELETE /audit-logs/purge by owner returned 200 (got ${ownerPurgeRes.status})`);
    assert(typeof ownerPurgeRes.body.data?.deletedCount === 'number', 'Returns deletedCount');
    await wait(200);

    // 6.3 Self-auditing: verify that the purge itself created a critical/warning audit log!
    const purgeAuditLog = await AuditLog.findOne({ action: 'purge_audit_logs' }).sort({ createdAt: -1 });
    assert(!!purgeAuditLog, 'Purge action itself is recorded in audit logs (Self-Auditing Accountability)');
    assert(purgeAuditLog?.actorId === ownerUser._id.toString(), 'Recorded owner actorId on purge');
    assert(purgeAuditLog?.status === 'critical' || purgeAuditLog?.status === 'warning', 'Purge log marked with status="critical"');

    console.log('\n===============================================================');
    console.log('🎉 ALL AUDIT LOG SYSTEM TEST SUITES PASSED SUCCESSFULLY!');
    console.log('===============================================================');

  } catch (err: any) {
    console.error('\n❌ TEST SUITE FAILED WITH ERROR:', err);
    process.exit(1);
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runAuditLogSystemTest();
