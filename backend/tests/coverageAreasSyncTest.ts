import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { LocationGovernorate } from '../src/models/Location.js';
import { Service } from '../src/models/Service.js';
import { Booking } from '../src/models/Booking.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let ownerToken: string;

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
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {};

    let payload = '';
    if (body !== undefined && body !== null) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }

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
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : {};
            resolve({ status: res.statusCode || 500, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 500, body: rawData });
          }
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

async function runCoverageSyncTests() {
  console.log('===============================================================');
  console.log('CLEANZO — MODIFICATION 09: COVERAGE AREAS & LOCATIONS SYNC');
  console.log('Admin ➔ Backend API ➔ MongoDB ➔ Customer Website (Zero Mock)');
  console.log('===============================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`Test Express server running at: ${baseUrl}\n`);
      resolve();
    });
  });

  // Setup Admin Token
  let owner = await AdminUser.findOne({ role: 'owner' });
  if (!owner) {
    owner = await AdminUser.create({
      id: `owner-${Date.now()}`,
      name: 'Location Admin',
      username: 'loc_admin',
      email: 'loc_admin@cleanzo.com',
      password: 'password123',
      role: 'owner',
      status: 'active',
    });
  }
  ownerToken = generateAdminToken({
    id: owner._id.toString(),
    username: owner.username,
    role: owner.role || 'owner',
  });

  const cairoGovId = `cairo-sync-${Date.now()}`;
  const gizaGovId = `giza-sync-${Date.now()}`;
  const octGovId = `october-sync-${Date.now()}`;
  const alexGovId = `alex-sync-${Date.now()}`;

  try {
    // -------------------------------------------------------------
    // TEST 1: Admin Creates Cairo -> Customer Website Sees Cairo
    // -------------------------------------------------------------
    console.log('📌 [TEST 1] Admin creates Cairo -> Customer sees Cairo');
    const createCairoRes = await makeRequest(
      'POST',
      '/locations/admin',
      {
        id: cairoGovId,
        name: 'القاهرة',
        nameEn: 'Cairo',
        order: 1,
      },
      ownerToken
    );
    assert(createCairoRes.status === 201, 'Admin successfully CREATES "Cairo" in MongoDB');
    assert(
      Array.isArray(createCairoRes.body.data.cities) && createCairoRes.body.data.cities.length === 0,
      'Backend does NOT auto-provision central city zone for Cairo (cities is strictly empty)'
    );

    // Customer API verification
    const custRes1 = await makeRequest('GET', '/locations/active');
    assert(custRes1.status === 200, 'Customer fetches /locations/active');
    const cairoInCust = (custRes1.body.data || []).find((g: any) => g.id === cairoGovId);
    assert(!!cairoInCust, 'Customer Website immediately sees "Cairo" (القاهرة)');
    assert(cairoInCust.name === 'القاهرة' && cairoInCust.nameEn === 'Cairo', 'Cairo names match exactly in Customer view');

    // -------------------------------------------------------------
    // TEST 2: Admin Creates Giza -> Customer Sees Giza
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 2] Admin creates Giza -> Customer sees Giza');
    const createGizaRes = await makeRequest(
      'POST',
      '/locations/admin',
      {
        id: gizaGovId,
        name: 'الجيزة',
        nameEn: 'Giza',
        order: 2,
      },
      ownerToken
    );
    assert(createGizaRes.status === 201, 'Admin successfully CREATES "Giza" in MongoDB');

    // Customer API verification
    const custRes2 = await makeRequest('GET', '/locations/active');
    const gizaInCust = (custRes2.body.data || []).find((g: any) => g.id === gizaGovId);
    assert(!!gizaInCust, 'Customer Website immediately sees "Giza" (الجيزة)');

    // -------------------------------------------------------------
    // TEST 3: Admin Disables Cairo -> Customer Does Not See Cairo
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 3] Admin disables Cairo -> Customer no longer sees Cairo');
    const disableCairoRes = await makeRequest(
      'PATCH',
      `/locations/admin/${cairoGovId}/toggle`,
      null,
      ownerToken
    );
    assert(disableCairoRes.status === 200, 'Admin toggles Cairo active = false');
    assert(disableCairoRes.body.data.active === false, 'Database confirms Cairo is inactive');

    // Customer API verification
    const custRes3 = await makeRequest('GET', '/locations/active');
    const cairoInCustAfterDisable = (custRes3.body.data || []).find((g: any) => g.id === cairoGovId);
    assert(!cairoInCustAfterDisable, 'Customer Website active locations strictly EXCLUDES disabled Cairo');

    // Admin API verification (Admin still sees it with status inactive)
    const adminRes3 = await makeRequest('GET', '/locations/admin', null, ownerToken);
    const cairoInAdmin = (adminRes3.body.data || []).find((g: any) => g.id === cairoGovId);
    assert(cairoInAdmin && cairoInAdmin.active === false, 'Admin API retains Cairo with status = inactive');

    // -------------------------------------------------------------
    // TEST 4: Admin Re-enables Cairo -> Customer Sees Cairo
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 4] Admin re-enables Cairo -> Customer sees Cairo again');
    const enableCairoRes = await makeRequest(
      'PATCH',
      `/locations/admin/${cairoGovId}/toggle`,
      null,
      ownerToken
    );
    assert(enableCairoRes.status === 200, 'Admin toggles Cairo active = true');
    assert(enableCairoRes.body.data.active === true, 'Database confirms Cairo is active again');

    // Customer API verification
    const custRes4 = await makeRequest('GET', '/locations/active');
    const cairoInCustAfterReEnable = (custRes4.body.data || []).find((g: any) => g.id === cairoGovId);
    assert(!!cairoInCustAfterReEnable, 'Customer Website immediately sees re-enabled Cairo');

    // -------------------------------------------------------------
    // TEST 5: Admin Edits Cairo -> New Cairo -> Customer Sees Updated Name
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 5] Admin edits Cairo -> New Cairo (القاهرة الجديدة)');
    const editCairoRes = await makeRequest(
      'PUT',
      `/locations/admin/${cairoGovId}`,
      {
        name: 'القاهرة الجديدة والتجمع',
        nameEn: 'New Cairo & 5th Settlement',
      },
      ownerToken
    );
    assert(editCairoRes.status === 200, 'Admin updates Cairo name to "القاهرة الجديدة والتجمع"');

    // Database verification
    const dbCairo = await LocationGovernorate.findOne({ id: cairoGovId });
    assert(dbCairo?.name === 'القاهرة الجديدة والتجمع', 'Database reflects updated name');

    // Customer API verification
    const custRes5 = await makeRequest('GET', '/locations/active');
    const updatedCairoInCust = (custRes5.body.data || []).find((g: any) => g.id === cairoGovId);
    assert(!!updatedCairoInCust, 'Customer retrieves updated record');
    assert(
      updatedCairoInCust.name === 'القاهرة الجديدة والتجمع' && updatedCairoInCust.nameEn === 'New Cairo & 5th Settlement',
      'Customer Website sees updated name "القاهرة الجديدة والتجمع" immediately'
    );

    // -------------------------------------------------------------
    // TEST 6: Multi-Data Test (Cairo, Giza, 6 October, Alexandria)
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 6] Multi-Data Test: Cairo, Giza, 6 October, Alexandria');
    // Add 6 October
    await makeRequest(
      'POST',
      '/locations/admin',
      {
        id: octGovId,
        name: '6 أكتوبر والشيخ زايد',
        nameEn: '6th of October & Zayed',
        order: 3,
      },
      ownerToken
    );

    // Add Alexandria
    await makeRequest(
      'POST',
      '/locations/admin',
      {
        id: alexGovId,
        name: 'الإسكندرية والساحل',
        nameEn: 'Alexandria & North Coast',
        order: 4,
      },
      ownerToken
    );

    // Check Database
    const dbAll = await LocationGovernorate.find({
      id: { $in: [cairoGovId, gizaGovId, octGovId, alexGovId] },
    });
    assert(dbAll.length === 4, 'MongoDB contains all 4 regions: Cairo, Giza, 6 October, Alexandria');

    // Check Admin API
    const adminAllRes = await makeRequest('GET', '/locations/admin', null, ownerToken);
    const adminIds = (adminAllRes.body.data || []).map((g: any) => g.id);
    assert(
      [cairoGovId, gizaGovId, octGovId, alexGovId].every((id) => adminIds.includes(id)),
      'Admin API returns all 4 regions'
    );

    // Check Customer API
    const custAllRes = await makeRequest('GET', '/locations/active');
    const custIds = (custAllRes.body.data || []).map((g: any) => g.id);
    assert(
      [cairoGovId, gizaGovId, octGovId, alexGovId].every((id) => custIds.includes(id)),
      'Customer API returns all 4 active regions identically'
    );

    // -------------------------------------------------------------
    // TEST 7: Booking Area Validation (Active Allowed vs Inactive Rejected)
    // -------------------------------------------------------------
    console.log('\n📌 [TEST 7] Booking Enforcement: Validating Area Exists & Active');
    // Setup temporary service or use existing
    let testSrvId = `srv-loc-${Date.now()}`;
    const existingSrv = await Service.findOne({ available: true, isArchived: false });
    let createdTempService = false;
    if (existingSrv) {
      testSrvId = existingSrv.id;
    } else {
      createdTempService = true;
      await Service.create({
        id: testSrvId,
        title: 'خدمة فحص المناطق',
        titleEn: 'Area Check Service',
        category: 'car',
        image: '/images/test-service.jpg',
        price: 300,
        duration: 45,
        available: true,
      });
    }

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);
    if (targetDate.getDay() === 5) targetDate.setDate(targetDate.getDate() + 1);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    // Explicitly add city to October
    await makeRequest(
      'POST',
      `/locations/admin/${octGovId}/cities`,
      {
        cityId: 'october-city',
        name: 'مدينة 6 أكتوبر',
        nameEn: '6th of October City',
      },
      ownerToken
    );

    const activeGovDoc = await LocationGovernorate.findOne({ id: octGovId });
    const activeCityId = activeGovDoc?.cities[0]?.id;

    // Booking in active area (Should SUCCEED)
    const validBookingRes = await makeRequest('POST', '/bookings', {
      serviceId: testSrvId,
      category: 'car',
      date: targetDateStr,
      time: '12:00 PM',
      customerName: 'عميل أكتوبر',
      customerPhone: '01009991122',
      address: {
        governorateId: octGovId,
        cityId: activeCityId,
        area: 'الحي المتميز',
      },
    });
    assert(validBookingRes.status === 201, 'Customer successfully creates booking in ACTIVE area (6 October)');
    const createdBookingId = validBookingRes.body.data.id;

    // Now deactivate 6 October and attempt booking
    await makeRequest('PATCH', `/locations/admin/${octGovId}/toggle`, null, ownerToken);

    const invalidBookingRes = await makeRequest('POST', '/bookings', {
      serviceId: testSrvId,
      category: 'car',
      date: targetDateStr,
      time: '02:00 PM',
      customerName: 'عميل منطقة ملغاة',
      customerPhone: '01009993344',
      address: {
        governorateId: octGovId,
        cityId: activeCityId,
        area: 'الحي المتميز',
      },
    });
    assert(invalidBookingRes.status === 422, 'Backend strictly REJECTS booking in DEACTIVATED area with 422');
    assert(
      invalidBookingRes.body.code === 'LOCATION_GOVERNORATE_INVALID' ||
        invalidBookingRes.body.message?.includes('غير مفعلة'),
      'Backend returns clear error message requesting an active area'
    );

    // -------------------------------------------------------------
    // CLEANUP
    // -------------------------------------------------------------
    console.log('\n🧹 Cleaning up test artifacts from MongoDB...');
    await LocationGovernorate.deleteMany({
      id: { $in: [cairoGovId, gizaGovId, octGovId, alexGovId] },
    });
    if (createdTempService) {
      await Service.deleteOne({ id: testSrvId });
    }
    if (createdBookingId) {
      await Booking.deleteOne({ id: createdBookingId });
    }
    console.log('  ✓ Cleaned up test locations, services, and bookings.');

    console.log('\n===============================================================');
    console.log('🎉 ALL COVERAGE AREAS SYNC TESTS PASSED! (100% End-to-End)');
    console.log('===============================================================');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runCoverageSyncTests().catch((err) => {
  console.error('\n❌ COVERAGE SYNC SUITE ENCOUNTERED AN ERROR:');
  console.error(err);
  process.exit(1);
});
