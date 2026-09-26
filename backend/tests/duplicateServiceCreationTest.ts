import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Service } from '../src/models/Service.js';
import { ServicePackage } from '../src/models/ServicePackage.js';
import { ServiceAddon } from '../src/models/ServiceAddon.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string,
  extraHeaders?: Record<string, string>
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed: any = {};
          try {
            parsed = JSON.parse(rawData);
          } catch (e) {
            parsed = { raw: rawData };
          }
          resolve({ status: res.statusCode || 500, body: parsed });
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

export async function runDuplicateServiceCreationTest() {
  console.log('\n======================================================');
  console.log('🧪 CLEANZO MODIFICATION 04 — DUPLICATE SERVICE CREATION TEST');
  console.log('======================================================');

  await connectDB();

  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const testAdmin = await AdminUser.findOne({ role: 'owner' });
  if (testAdmin) {
    adminToken = generateAdminToken(testAdmin);
  } else {
    adminToken = generateAdminToken({
      id: 'owner-test',
      email: 'owner@cleanzo.com',
      role: 'owner',
      name: 'Owner Admin',
    } as any);
  }

  const testSuffix = Date.now().toString().slice(-6);

  try {
    // ---------------------------------------------------------
    // TEST 1: Single Click Service Creation
    // ---------------------------------------------------------
    console.log('\n--- 1. Testing Single Click (1 Normal Request) ---');
    const singleTitle = `خدمة اختبار فردية ${testSuffix}`;
    const singlePayload = {
      category: 'car',
      title: singleTitle,
      titleEn: `Single Test Service ${testSuffix}`,
      shortDescription: 'وصف تجريبي قصير',
      description: 'وصف تفصيلي للخدمة',
      price: 250,
      originalPrice: 300,
      duration: 50,
      packages: [
        { name: 'باقة 1', price: 200, durationMinutes: 40 },
        { name: 'باقة 2', price: 350, durationMinutes: 70 },
      ],
      addons: [
        { name: 'إضافة تلميع', price: 50, durationMinutes: 15 },
      ],
    };

    const res1 = await makeRequest('POST', '/api/services/admin', singlePayload, adminToken);
    assert(res1.status === 201 || res1.status === 200, `Single request returned HTTP ${res1.status}`);
    assert(res1.body.success === true, 'Single request was successful');
    const createdServiceId1 = res1.body.data.id;

    // Verify DB count in PostgreSQL
    const dbServices1 = await Service.find({ title: singleTitle });
    assert(dbServices1.length === 1, `Single request created exactly 1 row in DB (found: ${dbServices1.length})`);

    const packages1 = await ServicePackage.find({ serviceId: createdServiceId1 });
    assert(packages1.length === 2, `Single request created exactly 2 packages (found: ${packages1.length})`);

    const addons1 = await ServiceAddon.find({ serviceId: createdServiceId1 });
    assert(addons1.length === 1, `Single request created exactly 1 addon (found: ${addons1.length})`);

    // ---------------------------------------------------------
    // TEST 2: Double Click Rapid Concurrent Requests
    // ---------------------------------------------------------
    console.log('\n--- 2. Testing Rapid Double Click (2 Concurrent Identical Requests) ---');
    const concurrentTitle = `خدمة فحص التزامن السريع ${testSuffix}`;
    const concurrentPayload = {
      category: 'home',
      title: concurrentTitle,
      titleEn: `Concurrent Test Service ${testSuffix}`,
      shortDescription: 'فحص الحماية من النقر المزدوج',
      description: 'وصف تجريبي لفحص التزامن المزدوج',
      price: 450,
      packages: [
        { name: 'باقة منزلية', price: 400, durationMinutes: 60 },
      ],
      addons: [
        { name: 'إضافة تعقيم إضافي', price: 80, durationMinutes: 20 },
      ],
    };

    // Send 2 requests concurrently at the exact same millisecond
    const [concurrentResA, concurrentResB] = await Promise.all([
      makeRequest('POST', '/api/services/admin', concurrentPayload, adminToken),
      makeRequest('POST', '/api/services/admin', concurrentPayload, adminToken),
    ]);

    assert(
      (concurrentResA.status === 201 || concurrentResA.status === 200) &&
      (concurrentResB.status === 201 || concurrentResB.status === 200),
      `Both concurrent requests responded with 200/201 (Status A: ${concurrentResA.status}, Status B: ${concurrentResB.status})`
    );

    // Both should point to the SAME service ID
    const sIdA = concurrentResA.body.data.id;
    const sIdB = concurrentResB.body.data.id;
    assert(sIdA === sIdB, `Both concurrent requests resolved to identical service ID: ${sIdA}`);

    // Verify DB count in PostgreSQL: Must be EXACTLY 1 row
    const dbConcurrentServices = await Service.find({ title: concurrentTitle });
    assert(
      dbConcurrentServices.length === 1,
      `Double-click concurrent requests created EXACTLY 1 row in DB (found: ${dbConcurrentServices.length})`
    );

    const concurrentPackages = await ServicePackage.find({ serviceId: sIdA });
    assert(concurrentPackages.length === 1, `Only 1 package created in DB (found: ${concurrentPackages.length})`);

    // ---------------------------------------------------------
    // TEST 3: Repeated Rapid Request within Debounce Window (1-2s delay)
    // ---------------------------------------------------------
    console.log('\n--- 3. Testing Rapid Resubmission within Debounce Window (1-2s delay) ---');
    const debounceTitle = `خدمة فحص التكرار خلال المهلة ${testSuffix}`;
    const debouncePayload = {
      category: 'car',
      title: debounceTitle,
      titleEn: `Debounce Test Service ${testSuffix}`,
      shortDescription: 'فحص التكرار خلال 10 ثوان',
      price: 320,
    };

    const debRes1 = await makeRequest('POST', '/api/services/admin', debouncePayload, adminToken);
    assert(debRes1.status === 201, `Initial create returned 201`);

    // Wait 500ms and resubmit identical request
    await new Promise((r) => setTimeout(r, 500));
    const debRes2 = await makeRequest('POST', '/api/services/admin', debouncePayload, adminToken);
    assert(debRes2.status === 200 || debRes2.status === 201, `Resubmitted request returned 200/201`);
    assert(debRes1.body.data.id === debRes2.body.data.id, 'Resubmitted request returned identical service ID');

    const dbDebounceServices = await Service.find({ title: debounceTitle });
    assert(
      dbDebounceServices.length === 1,
      `Repeated request created EXACTLY 1 row in DB (found: ${dbDebounceServices.length})`
    );

    // ---------------------------------------------------------
    // TEST 4: Idempotency-Key Header Protection
    // ---------------------------------------------------------
    console.log('\n--- 4. Testing Idempotency-Key Header Protection ---');
    const idempKey = `test-idemp-${Date.now()}`;
    const idempTitle = `خدمة مفتاح الأمان المتكرر ${testSuffix}`;
    const idempPayload = {
      category: 'car',
      title: idempTitle,
      titleEn: `Idempotent Service ${testSuffix}`,
      price: 500,
    };

    const idempRes1 = await makeRequest('POST', '/api/services/admin', idempPayload, adminToken, {
      'Idempotency-Key': idempKey,
    });
    assert(idempRes1.status === 201, `First idempotent request returned 201`);

    const idempRes2 = await makeRequest('POST', '/api/services/admin', idempPayload, adminToken, {
      'Idempotency-Key': idempKey,
    });
    assert(idempRes2.status === 200, `Second idempotent request returned 200 (idempotent cache hit)`);
    assert(idempRes1.body.data.id === idempRes2.body.data.id, 'Both returned identical service');

    const dbIdempServices = await Service.find({ title: idempTitle });
    assert(
      dbIdempServices.length === 1,
      `Idempotent requests created EXACTLY 1 row in DB (found: ${dbIdempServices.length})`
    );

    // ---------------------------------------------------------
    // TEST 5: Regression Tests (Edit, Visibility, Public API)
    // ---------------------------------------------------------
    console.log('\n--- 5. Regression Testing: Edit, Query, Public Services ---');
    const updateRes = await makeRequest(
      'PUT',
      `/api/services/admin/${createdServiceId1}`,
      { price: 299, description: 'تم تحديث الوصف بنجاح' },
      adminToken
    );
    assert(updateRes.status === 200, 'Service update succeeded');
    assert(updateRes.body.data.price === 299, 'Updated price is 299');

    // Query public services
    const publicRes = await makeRequest('GET', '/api/services?category=car');
    assert(publicRes.status === 200, 'Public services GET returned 200');
    assert(Array.isArray(publicRes.body.data), 'Public services is array');

    // Cleanup created test services
    await Service.deleteMany({
      title: { in: [singleTitle, concurrentTitle, debounceTitle, idempTitle] },
    });
    await ServicePackage.deleteMany({
      serviceId: { in: [createdServiceId1, sIdA] },
    });
    await ServiceAddon.deleteMany({
      serviceId: { in: [createdServiceId1, sIdA] },
    });

    console.log('\n🎉 ALL DUPLICATE SERVICE CREATION TESTS PASSED!');
    console.log('✅ Guaranteed: One User Action = Exactly One Service Creation\n');
  } finally {
    if (server) {
      await new Promise<void>((res) => server.close(() => res()));
    }
    await disconnectDB();
  }
}

if (process.argv[1]?.includes('duplicateServiceCreationTest.ts')) {
  runDuplicateServiceCreationTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
