import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { ServicePackage } from '../src/models/ServicePackage.js';
import { ServiceAddon } from '../src/models/ServiceAddon.js';
import { Service } from '../src/models/Service.js';
import { Booking } from '../src/models/Booking.js';
import { Coupon } from '../src/models/Coupon.js';
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
  console.log('🧪 CLEANZO — SERVICE PACKAGES & ADD-ONS E2E VERIFICATION TEST');
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
  const testCarServiceId = `serv-car-test-${testSuffix}`;
  const testHomeServiceId = `serv-home-test-${testSuffix}`;
  const testCouponCode = `PKGTEST${testSuffix}`;

  try {
    // 0. Setup Admin Token & Services
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

    // Create 2 test services: Car Service & Home Service
    const carService = await Service.create({
      id: testCarServiceId,
      title: 'غسيل سيارات تجريبي',
      titleEn: 'Test Car Wash',
      category: 'car',
      price: 100,
      duration: 60,
      active: true,
      image: '/images/services/car.jpg',
    });

    const homeService = await Service.create({
      id: testHomeServiceId,
      title: 'تنظيف منزلي تجريبي',
      titleEn: 'Test Home Cleaning',
      category: 'home',
      price: 250,
      duration: 120,
      active: true,
      image: '/images/services/home.jpg',
    });

    // Create test coupon: 10% discount
    await Coupon.create({
      code: testCouponCode,
      name: 'كوبون تجريبي 10%',
      discountType: 'percentage',
      discountValue: 10,
      totalUsageLimit: 100,
      currentUsageCount: 0,
      perCustomerLimit: 5,
      status: 'active',
      isArchived: false,
      startDate: new Date(Date.now() - 7 * 24 * 3600000).toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
    });

    console.log('--- TEST 1 & 2: Create Packages for Car Service ---');
    // Package 1: One Car (100 EGP, 60 min)
    const pkg1Res = await makeRequest(
      'POST',
      `/api/services/admin/${testCarServiceId}/packages`,
      {
        name: 'غسيل سيارة واحدة',
        nameEn: 'One Car Wash',
        description: 'غسيل كامل لسيارة واحدة',
        price: 100,
        originalPrice: 100,
        durationMinutes: 60,
        isActive: true,
        sortOrder: 1,
      },
      adminToken
    );
    assert(pkg1Res.status === 201, 'Package 1 created successfully via Admin API');
    const pkg1Id = pkg1Res.body.data.id;
    assert(Boolean(pkg1Id), 'Package 1 has valid ID');

    // Package 2: Two Cars (150 EGP, original 200, 90 min)
    const pkg2Res = await makeRequest(
      'POST',
      `/api/services/admin/${testCarServiceId}/packages`,
      {
        name: 'غسيل عربيتين',
        nameEn: 'Two Cars Wash',
        description: 'غسيل لسيارتين مع خصم مميز',
        price: 150,
        originalPrice: 200,
        durationMinutes: 90,
        isActive: true,
        sortOrder: 2,
      },
      adminToken
    );
    assert(pkg2Res.status === 201, 'Package 2 (Two Cars) created successfully');
    const pkg2Id = pkg2Res.body.data.id;

    // Package 3: Three Cars (210 EGP, original 300, 120 min)
    const pkg3Res = await makeRequest(
      'POST',
      `/api/services/admin/${testCarServiceId}/packages`,
      {
        name: 'غسيل 3 سيارات',
        nameEn: 'Three Cars Wash',
        price: 210,
        originalPrice: 300,
        durationMinutes: 120,
        isActive: true,
        sortOrder: 3,
      },
      adminToken
    );
    assert(pkg3Res.status === 201, 'Package 3 (Three Cars) created successfully');
    const pkg3Id = pkg3Res.body.data.id;

    console.log('\n--- TEST 3: Create Add-ons for Car Service ---');
    // Addon 1: Drying (+50 EGP, +15 min)
    const addon1Res = await makeRequest(
      'POST',
      `/api/services/admin/${testCarServiceId}/addons`,
      {
        name: 'تنشيف احترافي',
        nameEn: 'Pro Drying',
        description: 'تنشيف كامل للسيارة بأقمشة مايكروفايبر',
        price: 50,
        durationMinutes: 15,
        isActive: true,
        sortOrder: 1,
      },
      adminToken
    );
    assert(addon1Res.status === 201, 'Add-on 1 (Drying) created successfully');
    const addon1Id = addon1Res.body.data.id;

    // Addon 2: Polish (+80 EGP, +20 min)
    const addon2Res = await makeRequest(
      'POST',
      `/api/services/admin/${testCarServiceId}/addons`,
      {
        name: 'تلميع داخلي',
        nameEn: 'Interior Polish',
        price: 80,
        durationMinutes: 20,
        isActive: true,
        sortOrder: 2,
      },
      adminToken
    );
    assert(addon2Res.status === 201, 'Add-on 2 (Interior Polish) created successfully');
    const addon2Id = addon2Res.body.data.id;

    // Addon for HOME service (for isolation testing)
    const homeAddonRes = await makeRequest(
      'POST',
      `/api/services/admin/${testHomeServiceId}/addons`,
      {
        name: 'تعقيم إضافي للغرف',
        nameEn: 'Extra Room Sanitization',
        price: 120,
        durationMinutes: 30,
        isActive: true,
      },
      adminToken
    );
    const homeAddonId = homeAddonRes.body.data.id;
    assert(Boolean(homeAddonId), 'Home service Add-on created successfully');

    console.log('\n--- TEST 4: Edit Package & Add-on Details ---');
    const updatePkgRes = await makeRequest(
      'PATCH',
      `/api/services/admin/packages/${pkg2Id}`,
      {
        price: 150,
        description: 'تحديث وصف باقة غسيل عربيتين',
      },
      adminToken
    );
    assert(updatePkgRes.status === 200, 'Package updated successfully via PATCH');

    const updateAddonRes = await makeRequest(
      'PATCH',
      `/api/services/admin/addons/${addon1Id}`,
      {
        price: 50,
        description: 'تحديث وصف التنشيف الاحترافي',
      },
      adminToken
    );
    assert(updateAddonRes.status === 200, 'Add-on updated successfully via PATCH');

    console.log('\n--- TEST 5: Customer Views Service with Packages & Add-ons ---');
    const pubServiceRes = await makeRequest('GET', `/api/services/${testCarServiceId}`);
    assert(pubServiceRes.status === 200, 'Public service fetched successfully');
    const svcData = pubServiceRes.body.data;
    assert(svcData.packages && svcData.packages.length === 3, 'Service returns 3 active packages');
    assert(svcData.addons && svcData.addons.length === 2, 'Service returns 2 active add-ons');

    console.log('\n--- TEST 6: Authoritative Price Calculation (Package + Add-ons + Coupon) ---');
    // Calculate price: Package 2 (150) + Add-on 1 (50) + Add-on 2 (80) = Subtotal 280
    // With 10% coupon: Discount = 28, Final = 252
    // Duration: 90 min (pkg 2) + 15 min (addon 1) + 20 min (addon 2) = 125 min
    const calcRes = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: testCarServiceId,
      packageId: pkg2Id,
      addonIds: [addon1Id, addon2Id],
      promoCode: testCouponCode,
      customerPhone: '01123456789',
    });
    if (calcRes.status !== 200) {
      console.log('calcRes failed:', JSON.stringify(calcRes.body));
    }
    assert(calcRes.status === 200, 'Price calculation API returned 200');
    const pData = calcRes.body.data;
    assert(pData.packagePrice === 150, `Package price is 150 (got ${pData.packagePrice})`);
    assert(pData.addonsTotal === 130, `Add-ons total is 130 (got ${pData.addonsTotal})`);
    assert(pData.subtotal === 280, `Subtotal is 280 (got ${pData.subtotal})`);
    assert(pData.discount === 28, `Coupon discount is 28 (got ${pData.discount})`);
    assert(pData.finalPrice === 252, `Final total is 252 (got ${pData.finalPrice})`);
    assert(pData.totalServiceDuration === 125, `Total duration is 125 minutes (got ${pData.totalServiceDuration})`);

    console.log('\n--- TEST 7: Security: Client Price Manipulation is Ignored ---');
    // Client tries to inject fake price: basePrice = 1, packagePrice = 1, addonsTotal = 0
    const fakePriceCalc = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: testCarServiceId,
      packageId: pkg2Id,
      addonIds: [addon1Id, addon2Id],
      basePrice: 1,
      packagePrice: 1,
      subtotal: 1,
      finalPrice: 1,
      promoCode: testCouponCode,
    });
    assert(fakePriceCalc.body.data.finalPrice === 252, 'Server completely ignored fake client prices and returned real DB price (252)');

    console.log('\n--- TEST 8: Security: Cross-Service Isolation (Invalid Package or Add-on) ---');
    // Try to calculate price with an add-on from HOME service on a CAR service
    const crossAddonRes = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: testCarServiceId,
      addonIds: [homeAddonId],
    });
    assert(crossAddonRes.status === 400 || crossAddonRes.status === 422, 'Server rejected add-on belonging to another service (status 400/422)');

    // Try to calculate price with a package from another service
    const crossPkgRes = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: testHomeServiceId,
      packageId: pkg1Id,
    });
    assert(crossPkgRes.status === 400 || crossPkgRes.status === 422, 'Server rejected package belonging to another service (status 400/422)');

    console.log('\n--- TEST 9: Security: Duplicate Add-on IDs are Deduplicated ---');
    const dupAddonRes = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: testCarServiceId,
      packageId: pkg1Id,
      addonIds: [addon1Id, addon1Id, addon1Id], // 3 copies of 50 EGP
    });
    assert(dupAddonRes.status === 200, 'Request with duplicate add-ons succeeded');
    assert(dupAddonRes.body.data.addonsTotal === 50, 'Duplicate add-on was charged exactly once (50 EGP, not 150)');

    console.log('\n--- TEST 10: Security: Inactive Package/Add-on Rejection ---');
    // Deactivate package 3
    await makeRequest('PATCH', `/api/services/admin/packages/${pkg3Id}`, { isActive: false }, adminToken);
    const inactivePkgRes = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: testCarServiceId,
      packageId: pkg3Id,
    });
    assert(inactivePkgRes.status === 400 || inactivePkgRes.status === 422, 'Server rejected booking with inactive package (400/422)');

    console.log('\n--- TEST 11: End-to-End Booking Creation with Package & Addons ---');
    const bookingRes = await makeRequest('POST', '/api/bookings', {
      serviceId: testCarServiceId,
      category: 'car',
      packageId: pkg2Id,
      addonIds: [addon1Id, addon2Id],
      promoCode: testCouponCode,
      customerName: 'أحمد محمود التجريبي',
      customerPhone: '01123456789',
      date: '2026-10-15',
      time: '14:00',
      address: {
        governorate: gov.name,
        city: gov.cities[0].name,
        area: 'المعادي دجلة',
        details: 'شارع 250 عمارة 12',
      },
    });

    assert(bookingRes.status === 201, `Booking created successfully with status 201 (got ${bookingRes.status})`);
    const createdBooking = bookingRes.body.data.booking || bookingRes.body.data;
    const orderNumber = createdBooking.id;

    assert(createdBooking.packageSnapshot && createdBooking.packageSnapshot.name === 'غسيل عربيتين', 'Booking has immutable packageSnapshot with name "غسيل عربيتين"');
    assert(createdBooking.packageSnapshot.price === 150, 'Booking has packageSnapshot price 150');
    assert(createdBooking.addons && createdBooking.addons.length === 2, 'Booking has 2 saved add-ons in snapshot');
    assert(createdBooking.finalPrice === 252, `Booking has finalPrice 252 (got ${createdBooking.finalPrice})`);
    assert(createdBooking.duration === 125, `Booking duration is 125 minutes (got ${createdBooking.duration})`);

    console.log('\n--- TEST 12: Historical Snapshot Immutability ---');
    // Now simulate an Admin changing package 2 price to 300 EGP and addon 1 to 100 EGP
    await makeRequest('PATCH', `/api/services/admin/packages/${pkg2Id}`, { price: 300 }, adminToken);
    await makeRequest('PATCH', `/api/services/admin/addons/${addon1Id}`, { price: 100 }, adminToken);

    // Re-fetch the historical booking
    const fetchBookingRes = await makeRequest('GET', `/api/bookings/admin/${orderNumber}`, undefined, adminToken);
    assert(fetchBookingRes.status === 200, 'Fetched historical booking');
    const histBooking = fetchBookingRes.body.data;
    assert(histBooking.packageSnapshot.price === 150, 'Historical booking package price remains 150 EGP after DB price increase to 300 EGP');
    assert(histBooking.addons[0].price === 50, 'Historical booking add-on price remains 50 EGP after DB price increase to 100 EGP');
    assert(histBooking.finalPrice === 252, 'Historical booking finalPrice remains exactly 252 EGP');

    console.log('\n--- TEST 13: Safe Package & Add-on Deletion (Referential Protection) ---');
    // Attempt to delete package 2 which is referenced in the booking
    const delPkgRes = await makeRequest('DELETE', `/api/services/admin/packages/${pkg2Id}`, undefined, adminToken);
    assert(delPkgRes.status === 200, 'Delete package endpoint returned 200');
    assert(delPkgRes.body.data.deactivated === true, 'Package was safely deactivated (soft-deleted) because existing bookings reference it');

    const delAddonRes = await makeRequest('DELETE', `/api/services/admin/addons/${addon1Id}`, undefined, adminToken);
    assert(delAddonRes.status === 200, 'Delete add-on endpoint returned 200');
    assert(delAddonRes.body.data.deactivated === true, 'Add-on was safely deactivated because existing bookings reference it');

    console.log('\n--- TEST 14: Reports Integration ---');
    const reportsRes = await makeRequest('GET', '/api/reports/services', undefined, adminToken);
    assert(reportsRes.status === 200, 'Reports API returned 200');
    const rData = reportsRes.body.data;
    assert(Array.isArray(rData.mostPopularPackages), 'Reports contains mostPopularPackages list');
    assert(Array.isArray(rData.mostPopularAddons), 'Reports contains mostPopularAddons list');
    assert(typeof rData.addonAttachmentRate === 'number', 'Reports contains numeric addonAttachmentRate');

    console.log('\n--- TEST 15: Backward Compatibility: Legacy Service without Packages ---');
    // Legacy booking on Home Service without any packages or add-ons selected
    const legacyCalc = await makeRequest('POST', '/api/bookings/calculate-price', {
      serviceId: testHomeServiceId,
    });
    assert(legacyCalc.status === 200, 'Legacy service price calculated successfully');
    assert(legacyCalc.body.data.subtotal === 250, 'Legacy service price equals base price (250)');
    assert(legacyCalc.body.data.packagePrice === 250, 'Fallback packagePrice equals base price');
    assert(legacyCalc.body.data.addonsTotal === 0, 'Add-ons total is 0');

    console.log('\n=============================================================');
    console.log('🎉 ALL 15 INTEGRATION & SECURITY TESTS PASSED SUCCESSFULLY!');
    console.log('=============================================================\n');
  } finally {
    // Cleanup test data
    console.log('Cleaning up test data...');
    try {
      await Booking.deleteMany({ serviceId: { $in: [testCarServiceId, testHomeServiceId] } });
      await ServicePackage.deleteMany({ serviceId: { $in: [testCarServiceId, testHomeServiceId] } });
      await ServiceAddon.deleteMany({ serviceId: { $in: [testCarServiceId, testHomeServiceId] } });
      await Service.deleteMany({ id: { $in: [testCarServiceId, testHomeServiceId] } });
      await Coupon.deleteMany({ code: testCouponCode });
    } catch (cleanErr) {
      console.warn('Cleanup error (ignored):', cleanErr);
    }

    server.close();
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('\n💥 TEST EXECUTION FAILED:', err);
  process.exit(1);
});
