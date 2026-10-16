import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { ServicePackage } from '../src/models/ServicePackage.js';
import { ServiceAddon } from '../src/models/ServiceAddon.js';
import { Coupon } from '../src/models/Coupon.js';
import { User } from '../src/models/User.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { generateCustomerToken } from '../src/utils/jwt.js';

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

    req.on('error', (err) => {
      reject(err);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('🚀 Starting Cleanzo Booking Success & Composite Summary Test Suite...\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const testSuffix = Date.now().toString().slice(-6);

  try {
    // 0. Seed test locations
    let gov = await LocationGovernorate.findOne({ active: true });
    if (!gov || !gov.cities || gov.cities.length === 0) {
      gov = await LocationGovernorate.create({
        id: `gov-${testSuffix}`,
        name: 'القاهرة',
        nameEn: 'Cairo',
        active: true,
        cities: [
          {
            id: `city-${testSuffix}`,
            name: 'التجمع الخامس',
            nameEn: 'Fifth Settlement',
            active: true,
            areas: [
              { id: `area-${testSuffix}`, name: 'المستثمرين', nameEn: 'Investors', active: true },
            ],
          },
        ],
      });
    }

    const city = gov.cities.find((c: any) => c.active !== false) || gov.cities[0];

    const testAddress = {
      governorate: gov.name,
      governorateId: gov.id,
      city: city.name,
      cityId: city.id,
      area: 'منطقة المستثمرين',
      street: 'شارع التسعين الشمالي',
      building: '24',
      apartment: '4B',
      label: 'المنزل',
    };

    // 1. Seed Customer Users for Authentication
    const phone1 = `010${Date.now().toString().slice(-8)}`;
    const phone2 = `011${(Date.now() + 1).toString().slice(-8)}`;

    const cust1 = await User.create({
      name: 'أحمد محمود',
      phone: phone1,
      password: 'password123',
      email: `cust1_${testSuffix}@test.cleanzo`,
      status: 'active',
    });
    const token1 = generateCustomerToken({
      id: cust1._id.toString(),
      phone: cust1.phone,
    });

    const cust2 = await User.create({
      name: 'سارة عبد الله',
      phone: phone2,
      password: 'password123',
      email: `cust2_${testSuffix}@test.cleanzo`,
      status: 'active',
    });
    const token2 = generateCustomerToken({
      id: cust2._id.toString(),
      phone: cust2.phone,
    });

    // 2. Seed 5 Services across 2 Categories (Cars & Homes)
    console.log('--- 1. Setting up 5 Services Across 2 Categories ---');
    const s1 = await Service.create({
      id: `srv-car-wash-${testSuffix}`,
      title: 'غسيل وتلميع سيارات متنقل',
      titleEn: 'Mobile Car Wash & Detailing',
      category: 'car',
      price: 250,
      duration: 45,
      image: '/images/services/car-wash.jpg',
      available: true,
      active: true,
    });

    const s2 = await Service.create({
      id: `srv-car-polish-${testSuffix}`,
      title: 'نانو سيراميك وتلميع عميق',
      titleEn: 'Nano Ceramic & Deep Polish',
      category: 'car',
      price: 600,
      duration: 60,
      image: '/images/services/car-polish.jpg',
      available: true,
      active: true,
    });

    const s3 = await Service.create({
      id: `srv-home-deep-${testSuffix}`,
      title: 'تنظيف منازل عميق',
      titleEn: 'Deep Home Cleaning',
      category: 'home',
      price: 500,
      duration: 90,
      image: '/images/services/home-deep.jpg',
      available: true,
      active: true,
    });

    const s4 = await Service.create({
      id: `srv-home-sofa-${testSuffix}`,
      title: 'غسيل وتعقيم كنب ومجالس',
      titleEn: 'Sofa & Upholstery Steam Cleaning',
      category: 'home',
      price: 350,
      duration: 45,
      image: '/images/services/home-sofa.jpg',
      available: true,
      active: true,
    });

    const s5 = await Service.create({
      id: `srv-home-ac-${testSuffix}`,
      title: 'صيانة وتنظيف مكيفات',
      titleEn: 'AC Cleaning & Service',
      category: 'home',
      price: 300,
      duration: 30,
      image: '/images/services/home-ac.jpg',
      available: true,
      active: true,
    });

    // Seed Package for Service 1
    const pkg1 = await ServicePackage.create({
      id: `pkg-vip-${testSuffix}`,
      serviceId: s1.id,
      name: 'باقة VIP مع معطر وتلميع إطارات',
      nameEn: 'VIP Package with Tire Dressing',
      price: 320,
      originalPrice: 380,
      durationMinutes: 55,
      active: true,
    });

    // Seed Add-on for Service 3
    const addon1 = await ServiceAddon.create({
      id: `addon-steam-${testSuffix}`,
      serviceId: s3.id,
      name: 'تعقيم كامل بالبخار الساخن',
      nameEn: 'Full Hot Steam Sanitation',
      price: 120,
      durationMinutes: 20,
      active: true,
    });

    // Seed Coupon
    const testCouponCode = `TESTSAVE${testSuffix}`;
    const coupon1 = await Coupon.create({
      id: `cpn-${testSuffix}`,
      code: testCouponCode,
      discountType: 'percentage',
      discountValue: 10, // 10%
      maxDiscount: 200,
      minOrderAmount: 200,
      status: 'active',
      isArchived: false,
      startDate: '2026-10-01',
      endDate: '2026-12-31',
      totalUsageLimit: 100,
      currentUsageCount: 0,
    });

    console.log('  ✓ Services, Package, Addon, and Coupon seeded successfully');

    const testDay1 = `2026-11-${String((Date.now() % 10) + 10).padStart(2, '0')}`;
    const testDay2 = `2026-12-${String((Date.now() % 10) + 10).padStart(2, '0')}`;

    // 3. Test Single Service Booking Creation & Status Fidelity
    console.log('\n--- 2. Single Service Booking Creation & Status Fidelity ---');
    const singleBookingRes = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId: s1.id,
        category: 'car',
        date: testDay1,
        time: '10:00 AM',
        address: testAddress,
        guestName: 'أحمد محمود',
        guestPhone: phone1,
      },
      token1
    );

    if (singleBookingRes.status !== 201) {
      console.log('❌ singleBookingRes error body:', singleBookingRes.body);
    }
    assert(singleBookingRes.status === 201, `Single booking creation should return 201 (got ${singleBookingRes.status})`);
    const singleBooking = singleBookingRes.body?.data || singleBookingRes.body;
    assert(Boolean(singleBooking?.id), 'Single booking must have a valid authoritative ID');
    assert(singleBooking.status === 'pending', `Initial booking status MUST be 'pending' (got '${singleBooking.status}')`);
    assert(singleBooking.totalPrice === s1.price, `Single booking price matches service price (${s1.price})`);

    // 4. Test Composite Booking with 5 Services across 2 Categories
    console.log('\n--- 3. Composite Booking (5 Services, 2 Categories, Package, Add-on, Coupon) ---');
    const compositePayload = {
      category: 'car',
      services: [
        { serviceId: s1.id, packageId: pkg1.id },
        { serviceId: s2.id },
        { serviceId: s3.id, addonIds: [addon1.id] },
        { serviceId: s4.id },
        { serviceId: s5.id },
      ],
      date: testDay2,
      time: '11:00 AM',
      address: testAddress,
      promoCode: testCouponCode,
      guestName: 'سارة عبد الله',
      guestPhone: phone2,
    };

    const compositeRes = await makeRequest('POST', '/bookings', compositePayload, token2);
    if (compositeRes.status !== 201) {
      console.log('❌ compositeRes error body:', compositeRes.body);
    }
    assert(compositeRes.status === 201, `Composite booking creation returns 201 (got ${compositeRes.status})`);
    const compositeBooking = compositeRes.body?.data || compositeRes.body;
    assert(Boolean(compositeBooking?.id), 'Composite booking has valid ID');
    assert(compositeBooking.status === 'pending', 'Composite booking status is authoritative pending');

    // Expected pricing:
    // s1 with pkg1: 320 EGP (original catalog price: 380 EGP, package discount: 60 EGP)
    // s2: 600 EGP
    // s3 with addon1: 500 + 120 = 620 EGP
    // s4: 350 EGP
    // s5: 300 EGP
    // Combined Original Base Price = 380 + 600 + 620 + 350 + 300 = 2250 EGP
    // Combined Package Subtotal = 320 + 600 + 620 + 350 + 300 = 2190 EGP
    // Package Discount = 60 EGP
    // Coupon Discount (10% of 2190 = 219, capped at max 200) = 200 EGP
    // Total Discount = 60 + 200 = 260 EGP
    // Final Total = 2250 - 260 = 1990 EGP
    const expectedBasePrice = 380 + 600 + 620 + 350 + 300; // 2250
    const expectedDiscount = 60 + 200; // 260
    const expectedFinal = 1990;

    assert(compositeBooking.basePrice === expectedBasePrice, `Expected basePrice ${expectedBasePrice} (got ${compositeBooking.basePrice})`);
    assert(compositeBooking.discount === expectedDiscount, `Expected discount ${expectedDiscount} (got ${compositeBooking.discount})`);
    assert(compositeBooking.finalPrice === expectedFinal, `Expected finalPrice ${expectedFinal} (got ${compositeBooking.finalPrice})`);
    assert(compositeBooking.basePrice - compositeBooking.discount === compositeBooking.finalPrice, 'Financial equation holds: basePrice - discount === finalPrice');

    // Verify all 5 services are itemized in serviceSnapshot
    const snapshotServices = compositeBooking.serviceSnapshot?.services || [];
    assert(snapshotServices.length === 5, `serviceSnapshot MUST contain all 5 services (got ${snapshotServices.length})`);

    // Verify metadata also has all 5 services for dual compatibility
    const metaServices = (compositeBooking.metadata as any)?.services || [];
    assert(metaServices.length === 5, `metadata.services MUST contain all 5 services (got ${metaServices.length})`);

    // Verify items detail preservation
    const s1Item = snapshotServices.find((s: any) => s.serviceId === s1.id);
    assert(Boolean(s1Item), 'Service 1 exists in composite items');
    assert(s1Item.packageSnapshot?.id === pkg1.id, 'Service 1 has package snapshot');
    assert(s1Item.itemTotal === pkg1.price, `Service 1 item total matches package price ${pkg1.price}`);

    const s3Item = snapshotServices.find((s: any) => s.serviceId === s3.id);
    assert(Boolean(s3Item), 'Service 3 exists in composite items');
    assert(s3Item.addons && s3Item.addons.length === 1, 'Service 3 has 1 addon');
    assert(s3Item.addons[0].id === addon1.id, 'Service 3 addon ID matches seeded addon');
    assert(s3Item.itemTotal === 500 + 120, `Service 3 total matches 500 + 120 = 620`);

    // 5. Test Public Tracking Endpoint (Used by Success Page fallback)
    console.log('\n--- 4. Public Order Tracking & ID Parity ---');
    const trackRes = await makeRequest('GET', `/bookings/track/${compositeBooking.id}?phone=${phone2}`);
    assert(trackRes.status === 200, `Track order returns 200 (got ${trackRes.status})`);
    const tracked = trackRes.body?.data || trackRes.body;
    assert(tracked.id === compositeBooking.id, 'Tracked booking ID matches authoritative ID');
    assert(tracked.status === 'pending', `Tracked status is 'pending' (got ${tracked.status})`);
    assert(Array.isArray(tracked.serviceSnapshot?.services), 'Tracked serviceSnapshot retains composite services array');
    assert(tracked.serviceSnapshot.services.length === 5, 'Tracked serviceSnapshot has all 5 services');

    // Test Security Anti-Tampering (Phone mismatch protection)
    const badPhoneRes = await makeRequest('GET', `/bookings/track/${compositeBooking.id}?phone=01000000000`);
    assert(badPhoneRes.status === 403, `Mismatched phone should be rejected with 403 (got ${badPhoneRes.status})`);

    // 6. Test Non-Existent Order (No dummy data)
    console.log('\n--- 5. Error Handling for Non-Existent Order ---');
    const fakeOrderRes = await makeRequest('GET', `/bookings/track/CLZ-NON-EXISTENT-999?phone=${phone2}`);
    assert(fakeOrderRes.status === 404, `Non-existent order should return 404 (got ${fakeOrderRes.status})`);

    // Cleanup test artifacts
    await Booking.deleteMany({ id: { $in: [singleBooking.id, compositeBooking.id] } });
    await Service.deleteMany({ id: { $in: [s1.id, s2.id, s3.id, s4.id, s5.id] } });
    await ServicePackage.deleteMany({ id: pkg1.id });
    await ServiceAddon.deleteMany({ id: addon1.id });
    await Coupon.deleteMany({ id: coupon1.id });
    await User.deleteMany({ _id: { $in: [cust1._id, cust2._id] } });

    console.log('\n✅ ALL BOOKING SUCCESS & COMPOSITE SUMMARY TESTS PASSED SUCCESSFULLY!');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runTestSuite().catch((err) => {
  console.error('\n❌ Test Suite Failed with Error:', err);
  process.exit(1);
});
