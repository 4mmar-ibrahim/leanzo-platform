import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Service } from '../src/models/Service.js';
import { Booking } from '../src/models/Booking.js';
import { LocationGovernorate } from '../src/models/Location.js';

let server: http.Server;
let baseUrl: string;

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
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            resolve({ status: res.statusCode || 200, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 200, body: data });
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

async function runCategoryIsolationTest() {
  console.log('\n======================================================');
  console.log('🧪 CLEANZO — STRICT CATEGORY ISOLATION TEST SUITE');
  console.log('======================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });

  try {
    // 0. Ensure at least one car and one home service exist in database for testing
    let sampleCar = await Service.findOne({ category: 'car', isArchived: { $ne: true }, available: true });
    if (!sampleCar) {
      sampleCar = await Service.create({
        id: 'car-basic-wash',
        category: 'car',
        title: 'غسيل واش أساسي متطور',
        titleEn: 'Basic Express Wash',
        price: 220,
        duration: 45,
        available: true,
        isArchived: false,
        image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f',
      });
    }

    let sampleHome = await Service.findOne({ category: 'home', isArchived: { $ne: true }, available: true });
    if (!sampleHome) {
      sampleHome = await Service.create({
        id: 'home-standard-clean',
        category: 'home',
        title: 'التنظيف المنزلي الدوري والشامل',
        titleEn: 'Standard Home Maintenance Clean',
        price: 380,
        duration: 90,
        available: true,
        isArchived: false,
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952',
      });
    }

    // 1. Check Public API for Car Services
    console.log('\n--- 1. Testing GET /api/services?category=car ---');
    const carRes = await makeRequest('GET', '/services?category=car');
    assert(carRes.status === 200, 'GET /services?category=car returned 200');
    assert(carRes.body.success === true, 'Response success is true');
    const carList = carRes.body.data;
    assert(Array.isArray(carList) && carList.length > 0, `Returned ${carList.length} car services`);
    const anyNonCarInCar = carList.some((s: any) => s.category !== 'car');
    assert(!anyNonCarInCar, 'NO home service exists in car category response');

    // 2. Check Public API for Home Services
    console.log('\n--- 2. Testing GET /api/services?category=home ---');
    const homeRes = await makeRequest('GET', '/services?category=home');
    assert(homeRes.status === 200, 'GET /services?category=home returned 200');
    assert(homeRes.body.success === true, 'Response success is true');
    const homeList = homeRes.body.data;
    assert(Array.isArray(homeList) && homeList.length > 0, `Returned ${homeList.length} home services`);
    const anyNonHomeInHome = homeList.some((s: any) => s.category !== 'home');
    assert(!anyNonHomeInHome, 'NO car service exists in home category response');

    // 3. Check Unknown / Invalid Category Query
    console.log('\n--- 3. Testing GET /api/services?category=invalid ---');
    const invalidRes = await makeRequest('GET', '/services?category=invalid');
    assert(invalidRes.status === 200, 'GET with invalid category returned 200');
    assert(invalidRes.body.data.length === 0, 'Invalid category returned strictly empty array');

    // 4. Test Service Detail with Category Constraint
    console.log('\n--- 4. Testing GET /api/services/:id with category constraint ---');
    const sampleCarSvc = carList[0];
    const sampleHomeSvc = homeList[0];

    // Requesting car service with matching category 'car'
    const carMatch = await makeRequest('GET', `/services/${sampleCarSvc.id}?category=car`);
    assert(carMatch.status === 200, 'Car service with category=car returned 200');

    // Requesting car service with category 'home' -> MUST return 404
    const carMismatch = await makeRequest('GET', `/services/${sampleCarSvc.id}?category=home`);
    assert(carMismatch.status === 404, 'Car service with category=home returned 404 (mismatch rejected)');

    // Requesting home service with category 'car' -> MUST return 404
    const homeMismatch = await makeRequest('GET', `/services/${sampleHomeSvc.id}?category=car`);
    assert(homeMismatch.status === 404, 'Home service with category=car returned 404 (mismatch rejected)');

    // 5. Test Booking Creation with Category Isolation
    console.log('\n--- 5. Testing Booking Creation Category Validation ---');
    // Ensure active location exists for booking
    let gov = await LocationGovernorate.findOne({ active: true });
    if (!gov) {
      gov = await LocationGovernorate.create({
        id: 'gov-cairo',
        name: 'القاهرة',
        nameEn: 'Cairo',
        active: true,
        cities: [{ id: 'city-nasr', name: 'مدينة نصر', nameEn: 'Nasr City', active: true }],
      });
    }
    const city = gov.cities.find((c: any) => c.active) || gov.cities[0];

    // Attempt booking a Car service with category: 'home' -> MUST FAIL with 422
    const mismatchBookingRes = await makeRequest('POST', '/bookings', {
      serviceId: sampleCarSvc.id,
      category: 'home', // MISMATCH!
      date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      time: '10:00',
      address: {
        governorateId: gov.id,
        cityId: city.id,
        area: 'شارع عباس العقاد',
        building: '10',
        floor: '2',
      },
      guestName: 'عميل اختبار العزل',
      guestPhone: '01012345678',
    });

    assert(
      mismatchBookingRes.status === 422 || mismatchBookingRes.status === 400,
      `Mismatch category booking rejected with status 400/422 (Received: ${mismatchBookingRes.status})`
    );
    assert(
      mismatchBookingRes.body.code === 'SERVICE_CATEGORY_MISMATCH',
      'Mismatch returned error code SERVICE_CATEGORY_MISMATCH'
    );

    // Attempt booking a Car service with category: 'car' -> MUST SUCCEED
    const validBookingRes = await makeRequest('POST', '/bookings', {
      serviceId: sampleCarSvc.id,
      category: 'car',
      date: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      time: '12:00',
      address: {
        governorateId: gov.id,
        cityId: city.id,
        area: 'شارع عباس العقاد',
        building: '10',
        floor: '2',
      },
      guestName: 'عميل اختبار سيارات',
      guestPhone: '01012345678',
    });

    assert(validBookingRes.status === 201 || validBookingRes.status === 200, 'Valid matching category booking succeeded with 201');
    assert(validBookingRes.body.data.category === 'car', 'Saved booking category is strictly "car"');

    // Clean up created test booking
    if (validBookingRes.body.data?.id) {
      await Booking.deleteOne({ id: validBookingRes.body.data.id });
    }

    console.log('\n======================================================');
    console.log('🎉 ALL CATEGORY ISOLATION TESTS PASSED 100%!');
    console.log('======================================================\n');
  } finally {
    server.close();
    await disconnectDB();
  }
}

runCategoryIsolationTest().catch((err) => {
  console.error('Test execution error:', err);
  process.exit(1);
});
