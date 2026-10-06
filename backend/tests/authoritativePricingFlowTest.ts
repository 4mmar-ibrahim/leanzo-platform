import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Service } from '../src/models/Service.js';
import { ServicePackage } from '../src/models/ServicePackage.js';
import { ServiceAddon } from '../src/models/ServiceAddon.js';
import { Coupon } from '../src/models/Coupon.js';
import { Offer } from '../src/models/Offer.js';
import { Booking } from '../src/models/Booking.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { calculateItemizedPricing, getServiceDisplayPrice } from '../src/utils/pricingCalculator.js';
import { calculateBookingPrice } from '../src/services/bookingPriceService.js';

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
            resolve({
              status: res.statusCode || 500,
              body: data ? JSON.parse(data) : {},
            });
          } catch {
            resolve({
              status: res.statusCode || 500,
              body: data,
            });
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

async function runAuthoritativePricingFlowTests() {
  console.log('====================================================');
  console.log('🧪 CLEANZO — BUG 04 AUTHORITATIVE PRICING TEST SUITE');
  console.log('====================================================\n');

  await connectDB();

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      console.log(`🚀 Test server listening on ${baseUrl}\n`);
      resolve();
    });
  });

  const testIds = {
    serviceNoDiscount: `srv-test-nodisc-${Date.now()}`,
    service15Disc: `srv-test-15disc-${Date.now()}`,
    serviceMsrp: `srv-test-msrp-${Date.now()}`,
    servicePkgAddons: `srv-test-pkg-${Date.now()}`,
    pkgId: `pkg-test-${Date.now()}`,
    addon1Id: `add-test-1-${Date.now()}`,
    addon2Id: `add-test-2-${Date.now()}`,
    couponCode: `TESTCOUPON${Math.floor(Math.random() * 9000 + 1000)}`,
    offerCode: `TESTOFFER${Math.floor(Math.random() * 9000 + 1000)}`,
    bookingCreatedIds: [] as string[],
  };

  try {
    // Setup test governorate for valid booking address
    let gov = await LocationGovernorate.findOne({ active: true });
    if (!gov) {
      gov = await LocationGovernorate.create({
        id: `gov-test-${Date.now()}`,
        name: 'القاهرة',
        nameEn: 'Cairo',
        active: true,
        cities: [
          {
            id: 'city-nasr',
            name: 'مدينة نصر',
            nameEn: 'Nasr City',
            active: true,
            areas: [{ id: 'area-1', name: 'الحي السابع', nameEn: '7th District', active: true }],
          },
        ],
      });
    }

    // 1. Setup Services in DB
    console.log('--- 1. Testing No Discount Service ---');
    await Service.create({
      id: testIds.serviceNoDiscount,
      category: 'car',
      title: 'خدمة بدون خصم',
      titleEn: 'No Discount Service',
      price: 200,
      originalPrice: null,
      discount: 0,
      available: true,
      image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f',
      duration: 45,
    });

    const displayNoDisc = getServiceDisplayPrice({ id: testIds.serviceNoDiscount, price: 200, originalPrice: null, discount: 0 });
    assert(displayNoDisc.sellingPrice === 200, 'Display selling price is 200');
    assert(displayNoDisc.originalPrice === 200, 'Display original price is 200');
    assert(displayNoDisc.discountAmount === 0, 'Discount amount is 0');

    const quoteNoDisc = await calculateBookingPrice(testIds.serviceNoDiscount);
    assert(quoteNoDisc.basePrice === 200, 'Quote base price is 200');
    assert(quoteNoDisc.discount === 0, 'Quote discount is 0');
    assert(quoteNoDisc.finalPrice === 200, 'Quote final price is 200');

    console.log('\n--- 2. Testing 15% Direct Discount Service ---');
    await Service.create({
      id: testIds.service15Disc,
      category: 'car',
      title: 'خدمة بخصم 15%',
      titleEn: '15% Discount Service',
      price: 220,
      originalPrice: null,
      discount: 15,
      available: true,
      image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f',
      duration: 45,
    });

    const display15 = getServiceDisplayPrice({ id: testIds.service15Disc, price: 220, originalPrice: null, discount: 15 });
    assert(display15.originalPrice === 220, 'Original price is 220');
    assert(display15.discountAmount === 33, '15% discount on 220 is 33 EGP');
    assert(display15.sellingPrice === 187, 'Display selling price is 187 EGP (220 - 33)');

    const quote15 = await calculateBookingPrice(testIds.service15Disc);
    assert(quote15.basePrice === 220, 'Quote basePrice is 220');
    assert(quote15.discount === 33, 'Quote discount is 33');
    assert(quote15.finalPrice === 187, 'Quote finalPrice is 187');

    console.log('\n--- 3. Testing Configured MSRP Price (e.g. Original: 260, Price: 220) ---');
    await Service.create({
      id: testIds.serviceMsrp,
      category: 'car',
      title: 'غسيل واش أساسي متطور (مسعر مسبقاً)',
      titleEn: 'Basic Express Wash Pre-Discounted',
      price: 220,
      originalPrice: 260,
      discount: 15,
      available: true,
      image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f',
      duration: 45,
    });

    const displayMsrp = getServiceDisplayPrice({ id: testIds.serviceMsrp, price: 220, originalPrice: 260, discount: 15 });
    assert(displayMsrp.originalPrice === 260, 'Original price is 260');
    assert(displayMsrp.sellingPrice === 220, 'Selling price is 220 (Already discounted from 260)');
    assert(displayMsrp.discountAmount === 40, 'Direct catalog discount is 40 EGP (260 - 220)');

    const quoteMsrp = await calculateBookingPrice(testIds.serviceMsrp);
    assert(quoteMsrp.basePrice === 260, 'Quote basePrice is 260 (Original pre-discount price)');
    assert(quoteMsrp.discount === 40, 'Quote discount is 40 (Catalog discount)');
    assert(quoteMsrp.finalPrice === 220, 'Quote finalPrice is 220 (NO DOUBLE DISCOUNT TO 187!)');

    console.log('\n--- 4. Testing Coupon Discount ---');
    await Coupon.create({
      code: testIds.couponCode,
      discountType: 'fixed',
      discountValue: 50,
      active: true,
      isArchived: false,
      totalUsageLimit: 100,
      currentUsageCount: 0,
      startDate: '2020-01-01',
      endDate: '2030-12-31',
    });

    const quoteCoupon = await calculateBookingPrice({
      serviceId: testIds.serviceNoDiscount,
      promoCode: testIds.couponCode,
    });
    assert(quoteCoupon.basePrice === 200, 'Subtotal is 200');
    assert(quoteCoupon.couponDiscount === 50, 'Coupon discount is 50');
    assert(quoteCoupon.finalPrice === 150, 'Final price is 150 (200 - 50)');

    console.log('\n--- 5. Testing Offer Discount ---');
    await Offer.create({
      title: 'عرض تجريبي 20%',
      titleEn: 'Test Offer 20%',
      code: testIds.offerCode,
      discountPercentage: 20,
      active: true,
      isArchived: false,
      expiresAt: '2030-12-31',
      category: 'car',
    });

    const quoteOffer = await calculateBookingPrice({
      serviceId: testIds.serviceNoDiscount,
      promoCode: testIds.offerCode,
    });
    assert(quoteOffer.basePrice === 200, 'Base is 200');
    assert(quoteOffer.couponDiscount === 40, 'Offer discount is 40 (20% of 200)');
    assert(quoteOffer.finalPrice === 160, 'Final price is 160 (200 - 40)');

    console.log('\n--- 6. Testing Catalog Discount + Coupon Combined ---');
    // Service price: 220 (discount 15% -> subtotal 187) + Coupon fixed 20 EGP -> Final: 167 EGP
    const quoteCombined = await calculateBookingPrice({
      serviceId: testIds.service15Disc,
      promoCode: testIds.couponCode, // Fixed 50 capped at subtotal, but let's test fixed
    });
    assert(quoteCombined.basePrice === 220, 'Original total is 220');
    assert(quoteCombined.catalogDiscount === 33, 'Catalog discount is 33 (15% of 220)');
    assert(quoteCombined.subtotal === 187, 'Subtotal before coupon is 187');
    assert(quoteCombined.couponDiscount === 50, 'Coupon discount of 50 applies to 187 subtotal');
    assert(quoteCombined.finalPrice === 137, 'Final total is 137 (187 - 50)');
    assert(quoteCombined.totalDiscount === 83, 'Total discount is 83 (33 catalog + 50 coupon)');
    assert(quoteCombined.basePrice - quoteCombined.totalDiscount === quoteCombined.finalPrice, 'Invariant holds: basePrice - totalDiscount === finalPrice');

    console.log('\n--- 7. Testing Package Override ---');
    await Service.create({
      id: testIds.servicePkgAddons,
      category: 'car',
      title: 'خدمة باقات وإضافات',
      titleEn: 'Packages and Addons Service',
      price: 300,
      available: true,
      image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f',
      duration: 60,
    });

    await ServicePackage.create({
      id: testIds.pkgId,
      serviceId: testIds.servicePkgAddons,
      name: 'باقة بلاتينيوم VIP',
      price: 450,
      originalPrice: 600,
      active: true,
      durationMinutes: 90,
    });

    const quotePackage = await calculateBookingPrice({
      serviceId: testIds.servicePkgAddons,
      packageId: testIds.pkgId,
    });
    assert(quotePackage.basePrice === 600, 'Original package price is 600');
    assert(quotePackage.catalogDiscount === 150, 'Package discount is 150 (600 - 450)');
    assert(quotePackage.packagePrice === 450, 'Package selling price is 450');
    assert(quotePackage.finalPrice === 450, 'Final price is 450');

    console.log('\n--- 8. Testing Add-ons Integration ---');
    await ServiceAddon.create({
      id: testIds.addon1Id,
      serviceId: testIds.servicePkgAddons,
      name: 'تعطير خاص برائحة العود',
      price: 60,
      active: true,
      durationMinutes: 10,
    });

    await ServiceAddon.create({
      id: testIds.addon2Id,
      serviceId: testIds.servicePkgAddons,
      name: 'حماية وتلميع الزجاج نانو',
      price: 90,
      active: true,
      durationMinutes: 15,
    });

    const quotePkgAddons = await calculateBookingPrice({
      serviceId: testIds.servicePkgAddons,
      packageId: testIds.pkgId,
      addonIds: [testIds.addon1Id, testIds.addon2Id],
    });
    assert(quotePkgAddons.addonsTotal === 150, 'Add-ons total is 150 (60 + 90)');
    assert(quotePkgAddons.basePrice === 750, 'Original total is 750 (600 package + 150 addons)');
    assert(quotePkgAddons.catalogDiscount === 150, 'Catalog package discount is 150');
    assert(quotePkgAddons.subtotal === 600, 'Subtotal is 600 (450 package + 150 addons)');
    assert(quotePkgAddons.finalPrice === 600, 'Final price is 600');
    assert(quotePkgAddons.totalServiceDuration === 115, 'Duration is 115 min (90 + 10 + 15)');

    console.log('\n--- 9. Testing Final Saved Order in Database via API ---');
    const validBookingPayload = {
      serviceId: testIds.service15Disc,
      category: 'car',
      date: '2026-10-25',
      time: '12:00',
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة',
        area: 'الحي السابع',
        building: '10',
        label: 'المنزل',
      },
      customerName: 'أحمد محمود',
      customerPhone: '01012345678',
    };

    const bookRes = await makeRequest('POST', '/bookings', validBookingPayload);
    assert(bookRes.status === 201, `Booking created with status 201 (Got ${bookRes.status})`);
    assert(bookRes.body?.data?.id, 'Booking has valid order number');
    const createdOrderId = bookRes.body.data.id;
    testIds.bookingCreatedIds.push(createdOrderId);

    // Verify DB record
    const savedBooking = await Booking.findOne({ id: createdOrderId });
    assert(savedBooking !== null, 'Saved booking found in DB');
    assert(savedBooking!.basePrice === 220, `Saved basePrice in DB is 220 (Got ${savedBooking!.basePrice})`);
    assert(savedBooking!.discount === 33, `Saved discount in DB is 33 (Got ${savedBooking!.discount})`);
    assert(savedBooking!.finalPrice === 187, `Saved finalPrice in DB is 187 (Got ${savedBooking!.finalPrice})`);
    console.log(`  ✓ DB record verified: basePrice=${savedBooking!.basePrice}, discount=${savedBooking!.discount}, finalPrice=${savedBooking!.finalPrice}`);

    console.log('\n--- 10. SECURITY TEST: Tampered Client-Submitted Prices ---');
    const maliciousPayload = {
      serviceId: testIds.service15Disc,
      category: 'car',
      date: '2026-10-25',
      time: '14:00',
      address: {
        governorate: 'القاهرة',
        city: 'القاهرة',
        area: 'الحي السابع',
        building: '10',
        label: 'المنزل',
      },
      customerName: 'مخترق تجريبي',
      customerPhone: '01099887766',
      // Attacker attempts to forge request body pricing
      price: 1,
      finalPrice: 1,
      totalPrice: 1,
      basePrice: 1,
      discount: 9999,
      amountToPay: 0,
    };

    const attackRes = await makeRequest('POST', '/bookings', maliciousPayload);
    assert(attackRes.status === 201, 'Tampered booking request processed');
    const attackOrderId = attackRes.body.data.id;
    testIds.bookingCreatedIds.push(attackOrderId);

    const securedBooking = await Booking.findOne({ id: attackOrderId });
    assert(securedBooking!.finalPrice === 187, `Server rejected manipulated price: finalPrice is strictly 187 (NOT 1!)`);
    assert(securedBooking!.basePrice === 220, `Server basePrice is strictly 220 (NOT 1!)`);
    assert(securedBooking!.discount === 33, `Server discount is strictly 33 (NOT 9999!)`);
    console.log('  🔒 SECURITY TEST PASSED: Backend ignored all forged client totals and computed authoritative amount!');

    console.log('\n====================================================');
    console.log('✅ ALL 10 TESTS PASSED WITH 100% MATHEMATICAL PARITY!');
    console.log('====================================================\n');
  } finally {
    // Cleanup test data
    console.log('🧹 Cleaning up test records...');
    if (testIds.bookingCreatedIds.length > 0) {
      await Booking.deleteMany({ id: { in: testIds.bookingCreatedIds } });
    }
    await Service.deleteMany({
      id: {
        in: [
          testIds.serviceNoDiscount,
          testIds.service15Disc,
          testIds.serviceMsrp,
          testIds.servicePkgAddons,
        ],
      },
    });
    await ServicePackage.deleteMany({ id: testIds.pkgId });
    await ServiceAddon.deleteMany({ id: { in: [testIds.addon1Id, testIds.addon2Id] } });
    await Coupon.deleteMany({ code: testIds.couponCode });
    await Offer.deleteMany({ code: testIds.offerCode });

    if (server) {
      await new Promise<void>((res) => server.close(() => res()));
    }
    await disconnectDB();
    console.log('🏁 Test suite complete.\n');
  }
}

runAuthoritativePricingFlowTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
