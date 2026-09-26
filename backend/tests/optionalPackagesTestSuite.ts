import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { ServicePackage } from '../src/models/ServicePackage.js';
import { ServiceAddon } from '../src/models/ServiceAddon.js';
import { Service } from '../src/models/Service.js';
import { Booking } from '../src/models/Booking.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { LocationGovernorate } from '../src/models/Location.js';
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
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const url = new URL(path, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
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

async function runTests() {
  console.log('\n=============================================================');
  console.log('🧪 CLEANZO — OPTIONAL SERVICE PACKAGES 10 SCENARIO TEST SUITE');
  console.log('=============================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });

  const testSuffix = Date.now().toString().slice(-6);
  const carServiceId = `serv-car-opt-${testSuffix}`;
  const homeServiceId = `serv-home-opt-${testSuffix}`;

  try {
    // 0. Setup Admin Token
    let superAdmin = await AdminUser.findOne({ role: 'super_admin' });
    if (!superAdmin) {
      superAdmin = await AdminUser.create({
        username: `admin_${testSuffix}`,
        name: 'Super Admin Test',
        email: `admin_${testSuffix}@cleanzo.local`,
        password: 'password123',
        role: 'super_admin',
        status: 'active',
      });
    }
    adminToken = generateAdminToken(superAdmin);

    // Setup locations for booking tests
    let gov = await LocationGovernorate.findOne({ active: true });
    if (!gov) {
      gov = await LocationGovernorate.create({
        id: `gov-test-${testSuffix}`,
        name: 'القاهرة',
        nameEn: 'Cairo',
        active: true,
        cities: [
          { id: `city-test-${testSuffix}`, name: 'المعادي', nameEn: 'Maadi', active: true }
        ]
      });
    }
    const testCityId = gov.cities[0].id;

    // Create 1 Car Service: Base Price = 300, Duration = 45 min
    const carService = await Service.create({
      id: carServiceId,
      title: 'غسيل سيارات',
      titleEn: 'Car Wash',
      category: 'car',
      price: 300,
      duration: 45,
      active: true,
      image: '/images/services/car.jpg',
    });

    // Create 1 Home Service (for isolation test)
    const homeService = await Service.create({
      id: homeServiceId,
      title: 'تنظيف منزلي',
      titleEn: 'Home Cleaning',
      category: 'home',
      price: 600,
      duration: 120,
      active: true,
      image: '/images/services/home.jpg',
    });

    // Create Package A: 400 EGP, Duration: 60 min
    const pkgA = await ServicePackage.create({
      id: `pkg-a-${testSuffix}`,
      serviceId: carServiceId,
      name: 'غسيل 2 (باقة أ)',
      nameEn: 'Package A',
      price: 400,
      durationMinutes: 60,
      active: true,
      order: 1,
    });

    // Create Package B: 500 EGP, Duration: 90 min
    const pkgB = await ServicePackage.create({
      id: `pkg-b-${testSuffix}`,
      serviceId: carServiceId,
      name: 'غسيل 3 (باقة ب)',
      nameEn: 'Package B',
      price: 500,
      durationMinutes: 90,
      active: true,
      order: 2,
    });

    // Create Inactive Package: 450 EGP
    const pkgInactive = await ServicePackage.create({
      id: `pkg-inactive-${testSuffix}`,
      serviceId: carServiceId,
      name: 'باقة غير نشطة',
      nameEn: 'Inactive Package',
      price: 450,
      durationMinutes: 60,
      active: false,
      order: 3,
    });

    // Create Package for Home Service (for cross-service rejection test)
    const homePkg = await ServicePackage.create({
      id: `pkg-home-${testSuffix}`,
      serviceId: homeServiceId,
      name: 'باقة منزلية',
      nameEn: 'Home Package',
      price: 750,
      durationMinutes: 180,
      active: true,
      order: 1,
    });

    // Create Addon: 50 EGP, Duration: 15 min
    const addon = await ServiceAddon.create({
      id: `addon-polish-${testSuffix}`,
      serviceId: carServiceId,
      name: 'تلميع',
      nameEn: 'Polish',
      price: 50,
      durationMinutes: 15,
      active: true,
      order: 1,
    });

    console.log('\n--- TEST 1: Service Only (No Package, No Addon) ---');
    console.log('Service Base: 300, Package: null, Addon: none. Expected: 300');
    const res1 = await makeRequest('POST', '/api/bookings', {
      customerName: 'Customer Test 1',
      customerPhone: '01011111111',
      serviceId: carServiceId,
      category: 'car',
      // packageId omitted / null
      date: '2026-10-01',
      time: '10:00',
      address: {
        governorate: gov.name,
        city: gov.cities[0].name,
        area: 'المعادي',
        details: 'شارع النصر',
      },
    });
    if (res1.status !== 201) console.error('res1 error:', res1.body);
    assert(res1.status === 201, 'Booking 1 created successfully without package');
    const b1 = res1.body.data.booking || res1.body.data;
    assert(b1.finalPrice === 300, `Expected finalPrice 300, got ${b1.finalPrice}`);
    assert(b1.basePrice === 300, `Expected basePrice 300, got ${b1.basePrice}`);
    assert(b1.packageSnapshot === null || b1.packageSnapshot === undefined, 'packageSnapshot is null');
    assert(b1.packageId === null || b1.packageId === undefined, 'packageId is null');

    console.log('\n--- TEST 2: Service + Package A ---');
    console.log('Service Base: 300, Package A: 400. Expected: 400 (NOT 300 + 400)');
    const res2 = await makeRequest('POST', '/api/bookings', {
      customerName: 'Customer Test 2',
      customerPhone: '01022222222',
      serviceId: carServiceId,
      category: 'car',
      packageId: pkgA.id,
      date: '2026-10-01',
      time: '11:00',
      address: {
        governorate: gov.name,
        city: gov.cities[0].name,
        area: 'المعادي',
        details: 'شارع النصر',
      },
    });
    if (res2.status !== 201) console.error('res2 error:', res2.body);
    assert(res2.status === 201, 'Booking 2 created successfully with Package A');
    const b2 = res2.body.data.booking || res2.body.data;
    assert(b2.finalPrice === 400, `Expected finalPrice 400, got ${b2.finalPrice}`);
    assert(b2.basePrice === 400, `Expected basePrice 400, got ${b2.basePrice}`);
    assert(b2.packageSnapshot?.id === pkgA.id, 'packageSnapshot contains Package A');
    assert(b2.packageSnapshot?.price === 400, 'packageSnapshot price is 400');

    console.log('\n--- TEST 3: Service + Package B ---');
    console.log('Service Base: 300, Package B: 500. Expected: 500 (NOT 300 + 500)');
    const res3 = await makeRequest('POST', '/api/bookings', {
      customerName: 'Customer Test 3',
      customerPhone: '01033333333',
      serviceId: carServiceId,
      category: 'car',
      packageId: pkgB.id,
      date: '2026-10-01',
      time: '13:00',
      address: {
        governorate: gov.name,
        city: gov.cities[0].name,
        area: 'المعادي',
        details: 'شارع النصر',
      },
    });
    if (res3.status !== 201) console.error('res3 error:', res3.body);
    assert(res3.status === 201, 'Booking 3 created successfully with Package B');
    const b3 = res3.body.data.booking || res3.body.data;
    assert(b3.finalPrice === 500, `Expected finalPrice 500, got ${b3.finalPrice}`);
    assert(b3.basePrice === 500, `Expected basePrice 500, got ${b3.basePrice}`);
    assert(b3.packageSnapshot?.id === pkgB.id, 'packageSnapshot contains Package B');

    console.log('\n--- TEST 4: Service + Package A + Addon ---');
    console.log('Package A: 400, Addon: 50. Expected: 450 (NOT 300 + 400 + 50)');
    const res4 = await makeRequest('POST', '/api/bookings', {
      customerName: 'Customer Test 4',
      customerPhone: '01044444444',
      serviceId: carServiceId,
      category: 'car',
      packageId: pkgA.id,
      addonIds: [addon.id],
      date: '2026-10-01',
      time: '15:00',
      address: {
        governorate: gov.name,
        city: gov.cities[0].name,
        area: 'المعادي',
        details: 'شارع النصر',
      },
    });
    if (res4.status !== 201) console.error('res4 error:', res4.body);
    assert(res4.status === 201, 'Booking 4 created successfully with Package A + Addon');
    const b4 = res4.body.data.booking || res4.body.data;
    assert(b4.finalPrice === 450, `Expected finalPrice 450, got ${b4.finalPrice}`);
    assert(b4.basePrice === 400, `Expected basePrice 400, got ${b4.basePrice}`);
    assert(b4.addons && b4.addons.length === 1 && b4.addons[0].price === 50, 'Addons total is 50');

    console.log('\n--- TEST 5: Service + Addon without Package ---');
    console.log('Service Base: 300, Package: null, Addon: 50. Expected: 350');
    const res5 = await makeRequest('POST', '/api/bookings', {
      customerName: 'Customer Test 5',
      customerPhone: '01055555555',
      serviceId: carServiceId,
      category: 'car',
      packageId: null,
      addonIds: [addon.id],
      date: '2026-10-01',
      time: '17:00',
      address: {
        governorate: gov.name,
        city: gov.cities[0].name,
        area: 'المعادي',
        details: 'شارع النصر',
      },
    });
    if (res5.status !== 201) console.error('res5 error:', res5.body);
    assert(res5.status === 201, 'Booking 5 created successfully with Service + Addon without package');
    const b5 = res5.body.data.booking || res5.body.data;
    assert(b5.finalPrice === 350, `Expected finalPrice 350, got ${b5.finalPrice}`);
    assert(b5.basePrice === 300, `Expected basePrice 300, got ${b5.basePrice}`);
    assert(b5.addons && b5.addons.length === 1 && b5.addons[0].price === 50, 'Addons total is 50');

    console.log('\n--- TEST 6: Single-Selection Behavior / Switch Package A -> Package B ---');
    console.log('Validating price calculation endpoint with switching package');
    const calcA = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: carServiceId,
      packageId: pkgA.id,
      addonIds: [],
    });
    assert(calcA.status === 200, 'Price calc endpoint returned 200 for Package A');
    assert(calcA.body.data.finalPrice === 400, `Package A price is 400, got ${calcA.body.data.finalPrice}`);

    const calcB = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: carServiceId,
      packageId: pkgB.id,
      addonIds: [],
    });
    assert(calcB.status === 200, 'Price calc endpoint returned 200 for Package B');
    assert(calcB.body.data.finalPrice === 500, `Switching to Package B gives 500, got ${calcB.body.data.finalPrice}`);

    console.log('\n--- TEST 7: Deselect Package -> Return to Base Service ---');
    const calcNone = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: carServiceId,
      packageId: null,
      addonIds: [],
    });
    assert(calcNone.status === 200, 'Price calc endpoint returned 200 for deselected package');
    assert(calcNone.body.data.finalPrice === 300, `Deselected package returns to base service price 300, got ${calcNone.body.data.finalPrice}`);
    assert(calcNone.body.data.basePrice === 300, `basePrice is 300, got ${calcNone.body.data.basePrice}`);

    console.log('\n--- TEST 8: Invalid Package/Service Combination (Category/Service Isolation) ---');
    console.log('Requesting Car service with Home cleaning package. Expected: 4xx rejection');
    const res8 = await makeRequest('POST', '/api/bookings', {
      customerName: 'Customer Test 8',
      customerPhone: '01088888888',
      serviceId: carServiceId,
      category: 'car',
      packageId: homePkg.id, // Mismatched service package!
      date: '2026-10-02',
      time: '10:00',
      address: {
        governorate: gov.name,
        city: gov.cities[0].name,
        area: 'المعادي',
        details: 'شارع النصر',
      },
    });
    assert(res8.status >= 400 && res8.status < 500, `Expected 4xx status, got ${res8.status}`);
    console.log(`  ✓ Rejected cross-service package with status ${res8.status}: ${res8.body.message || res8.body.error}`);

    console.log('\n--- TEST 9: Tampered Frontend Price Rejected / Backend Authoritative ---');
    console.log('Sending fake client prices (price: 1, total: 1). Expected backend authoritative calculation: 400');
    const res9 = await makeRequest('POST', '/api/bookings', {
      customerName: 'Customer Test 9',
      customerPhone: '01099999999',
      serviceId: carServiceId,
      category: 'car',
      packageId: pkgA.id,
      // Attempt to tamper with price
      price: 1,
      subtotal: 1,
      total: 1,
      clientPrice: 1,
      date: '2026-10-02',
      time: '12:00',
      address: {
        governorate: gov.name,
        city: gov.cities[0].name,
        area: 'المعادي',
        details: 'شارع النصر',
      },
    });
    if (res9.status !== 201) console.error('res9 error:', res9.body);
    assert(res9.status === 201, 'Booking 9 created successfully');
    const b9 = res9.body.data.booking || res9.body.data;
    assert(b9.finalPrice === 400, `Backend ignored tampered price (1) and calculated real price 400, got ${b9.finalPrice}`);

    console.log('\n--- TEST 10: Inactive Package Rejected ---');
    console.log('Booking with inactive package. Expected: 4xx rejection');
    const res10 = await makeRequest('POST', '/api/bookings', {
      customerName: 'Customer Test 10',
      customerPhone: '01010101010',
      serviceId: carServiceId,
      category: 'car',
      packageId: pkgInactive.id,
      date: '2026-10-02',
      time: '14:00',
      address: {
        governorate: gov.name,
        city: gov.cities[0].name,
        area: 'المعادي',
        details: 'شارع النصر',
      },
    });
    assert(res10.status >= 400 && res10.status < 500, `Expected 4xx status, got ${res10.status}`);
    console.log(`  ✓ Inactive package rejected with status ${res10.status}: ${res10.body.message || res10.body.error}`);

    console.log('\n--- DURATION & AVAILABILITY VERIFICATION ---');
    // Check duration when package is selected
    // pkgA has durationMinutes = 60, carService has duration = 45
    // Addon has durationMinutes = 15
    const calcDurationPkg = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: carServiceId,
      packageId: pkgA.id,
      addonIds: [addon.id],
    });
    assert(calcDurationPkg.body.data.totalServiceDuration === 75, `Expected total duration 75 (60 pkg + 15 addon), got ${calcDurationPkg.body.data.totalServiceDuration}`);

    // Check duration when no package selected
    const calcDurationNoPkg = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: carServiceId,
      packageId: null,
      addonIds: [addon.id],
    });
    assert(calcDurationNoPkg.body.data.totalServiceDuration === 60, `Expected total duration 60 (45 base + 15 addon), got ${calcDurationNoPkg.body.data.totalServiceDuration}`);

    console.log('\n=============================================================');
    console.log('🎉 ALL 10 PACKAGE BUSINESS LOGIC SCENARIOS PASSED WITH 100% ACCURACY!');
    console.log('=============================================================\n');

  } finally {
    // Cleanup test artifacts
    await ServicePackage.deleteMany({ serviceId: { $in: [carServiceId, homeServiceId] } });
    await ServiceAddon.deleteMany({ serviceId: { $in: [carServiceId, homeServiceId] } });
    await Service.deleteMany({ id: { $in: [carServiceId, homeServiceId] } });
    await Booking.deleteMany({ serviceId: { $in: [carServiceId, homeServiceId] } });

    server.close();
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
