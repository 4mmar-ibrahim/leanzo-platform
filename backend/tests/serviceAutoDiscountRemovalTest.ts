import { prisma } from '../src/config/prisma.js';
import { calculateBookingPrice, calculateMultiServiceBookingPrice } from '../src/services/bookingPriceService.js';
import { getServiceDisplayPrice, calculateItemizedPricing } from '../src/utils/pricingCalculator.js';
import { Coupon } from '../src/models/Coupon.js';

let failedAssertions = 0;

function assert(condition: boolean, testName: string, details?: any) {
  if (condition) {
    console.log(`  \x1b[32mPASS:\x1b[0m ${testName}`);
  } else {
    failedAssertions++;
    console.error(`  \x1b[31mFAIL:\x1b[0m ${testName}`, details ? details : '');
  }
}

async function runTest() {
  console.log('\n======================================================');
  console.log('🧪 CLEANZO — SERVICE AUTO-DISCOUNT REMOVAL AUDIT');
  console.log('======================================================\n');

  const testServiceId = `audit_test_srv_${Date.now()}`;
  const testCouponCode = `TESTCOUPON10_${Date.now()}`;

  try {
    // -------------------------------------------------------------------------
    // Scenario 1: Direct pricingCalculator utility verification
    // -------------------------------------------------------------------------
    console.log('--- Step 1: Utility getServiceDisplayPrice Verification ---');
    const display100 = getServiceDisplayPrice({ price: 100, discount: 15, originalPrice: 200 } as any);
    assert(display100.sellingPrice === 100, 'Display sellingPrice is exactly 100 EGP');
    assert(display100.originalPrice === 100, 'Display originalPrice matches sellingPrice (no crossed-out price)');
    assert(display100.discountAmount === 0, 'Discount amount is 0');
    assert(display100.discountPercent === 0, 'Discount percent is 0');
    assert(display100.hasDiscount === false, 'hasDiscount is false');

    const display220 = getServiceDisplayPrice({ price: 220, discount: 20, originalPrice: 300 } as any);
    assert(display220.sellingPrice === 220, 'Display sellingPrice is exactly 220 EGP');
    assert(display220.originalPrice === 220, 'Display originalPrice matches 220 EGP');
    assert(display220.discountAmount === 0, 'Discount amount is 0');
    assert(display220.hasDiscount === false, 'hasDiscount is false');

    const display500 = getServiceDisplayPrice({ price: 500 } as any);
    assert(display500.sellingPrice === 500, 'Display sellingPrice is exactly 500 EGP');
    assert(display500.originalPrice === 500, 'Display originalPrice matches 500 EGP');
    assert(display500.discountAmount === 0, 'Discount amount is 0');
    assert(display500.hasDiscount === false, 'hasDiscount is false');

    // -------------------------------------------------------------------------
    // Scenario 2: Create Service in Database with Price = 100
    // -------------------------------------------------------------------------
    console.log('\n--- Step 2: Database Service Price = 100 EGP ---');
    const createdService = await prisma.service.create({
      data: {
        id: testServiceId,
        title: 'خدمة تجريبية للتدقيق',
        titleEn: 'Audit Test Service',
        category: 'car',
        description: 'وصف الخدمة التجريبية',
        price: 100,
        originalPrice: null,
        discount: 0,
        duration: 45,
        available: true,
        image: '/images/test.jpg',
      },
    });

    const priceCalc100 = await calculateBookingPrice({
      serviceId: testServiceId,
    });

    assert(priceCalc100.subtotal === 100, 'Customer subtotal is 100 EGP');
    assert(priceCalc100.catalogDiscount === 0, 'Customer catalogDiscount is 0 EGP');
    assert(priceCalc100.totalDiscount === 0, 'Customer totalDiscount is 0 EGP');
    assert(priceCalc100.finalPrice === 100, 'Customer pays exactly 100 EGP');

    // -------------------------------------------------------------------------
    // Scenario 3: Update Service to Price = 220
    // -------------------------------------------------------------------------
    console.log('\n--- Step 3: Admin Updates Service to Price = 220 EGP ---');
    await prisma.service.update({
      where: { id: testServiceId },
      data: {
        price: 220,
        originalPrice: null,
        discount: 0,
      },
    });

    const priceCalc220 = await calculateBookingPrice({
      serviceId: testServiceId,
    });

    assert(priceCalc220.subtotal === 220, 'Customer subtotal is 220 EGP');
    assert(priceCalc220.catalogDiscount === 0, 'Customer catalogDiscount is 0 EGP');
    assert(priceCalc220.totalDiscount === 0, 'Customer totalDiscount is 0 EGP');
    assert(priceCalc220.finalPrice === 220, 'Customer pays exactly 220 EGP');

    // -------------------------------------------------------------------------
    // Scenario 4: Update Service to Price = 500
    // -------------------------------------------------------------------------
    console.log('\n--- Step 4: Admin Updates Service to Price = 500 EGP ---');
    await prisma.service.update({
      where: { id: testServiceId },
      data: {
        price: 500,
        originalPrice: null,
        discount: 0,
      },
    });

    const priceCalc500 = await calculateBookingPrice({
      serviceId: testServiceId,
    });

    assert(priceCalc500.subtotal === 500, 'Customer subtotal is 500 EGP');
    assert(priceCalc500.catalogDiscount === 0, 'Customer catalogDiscount is 0 EGP');
    assert(priceCalc500.totalDiscount === 0, 'Customer totalDiscount is 0 EGP');
    assert(priceCalc500.finalPrice === 500, 'Customer pays exactly 500 EGP');

    // -------------------------------------------------------------------------
    // Scenario 5: Coupon Application (10% discount)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 5: Independent Coupon Application Test ---');
    const createdCoupon = await Coupon.create({
      code: testCouponCode,
      discountType: 'percentage',
      discountValue: 10,
      minOrderAmount: 50,
      status: 'active',
      active: true,
      startDate: '2026-01-01',
      endDate: '2030-01-01',
      totalUsageLimit: 1000,
      perCustomerLimit: 10,
      applicableServiceIds: [],
      currentUsageCount: 0,
    });

    const priceCalcWithCoupon = await calculateBookingPrice({
      serviceId: testServiceId,
      promoCode: testCouponCode,
      customerPhone: '01012345678',
    });

    assert(priceCalcWithCoupon.subtotal === 500, 'Base subtotal remains 500 EGP');
    assert(priceCalcWithCoupon.catalogDiscount === 0, 'Catalog discount remains 0 EGP');
    assert(priceCalcWithCoupon.couponDiscount === 50, 'Coupon applies 10% (= 50 EGP)');
    assert(priceCalcWithCoupon.finalPrice === 450, 'Final customer price is 450 EGP (500 - 50)');

    // Invalid coupon test
    try {
      await calculateBookingPrice({
        serviceId: testServiceId,
        promoCode: 'INVALID_COUPON_CODE_999',
        customerPhone: '01012345678',
      });
      assert(false, 'Expected invalid coupon to reject');
    } catch (err: any) {
      assert(
        err.message.includes('غير صحيح') || err.code === 'COUPON_NOT_FOUND',
        'Invalid coupon is rejected with coupon error and leaves service price unmodified'
      );
    }

    // -------------------------------------------------------------------------
    // Scenario 6: Multi-Service Booking (100 + 150 + 200 = 450 EGP)
    // -------------------------------------------------------------------------
    console.log('\n--- Step 6: Multi-Service Booking Calculation Test ---');
    const srvAId = `audit_ms_a_${Date.now()}`;
    const srvBId = `audit_ms_b_${Date.now()}`;
    const srvCId = `audit_ms_c_${Date.now()}`;

    await prisma.service.createMany({
      data: [
        {
          id: srvAId,
          title: 'خدمة أ',
          titleEn: 'Service A',
          category: 'car',
          description: 'A',
          price: 100,
          originalPrice: null,
          discount: 0,
          duration: 30,
          available: true,
          image: '/images/test.jpg',
        },
        {
          id: srvBId,
          title: 'خدمة ب',
          titleEn: 'Service B',
          category: 'car',
          description: 'B',
          price: 150,
          originalPrice: null,
          discount: 0,
          duration: 30,
          available: true,
          image: '/images/test.jpg',
        },
        {
          id: srvCId,
          title: 'خدمة ج',
          titleEn: 'Service C',
          category: 'car',
          description: 'C',
          price: 200,
          originalPrice: null,
          discount: 0,
          duration: 30,
          available: true,
          image: '/images/test.jpg',
        },
      ],
    });

    const multiCalc = await calculateMultiServiceBookingPrice([
      { serviceId: srvAId },
      { serviceId: srvBId },
      { serviceId: srvCId },
    ]);

    assert(multiCalc.subtotal === 450, 'Multi-service subtotal is 450 EGP (100 + 150 + 200)');
    assert(multiCalc.catalogDiscount === 0, 'Multi-service catalogDiscount is 0 EGP');
    assert(multiCalc.totalDiscount === 0, 'Multi-service totalDiscount is 0 EGP');
    assert(multiCalc.finalPrice === 450, 'Multi-service finalPrice is 450 EGP');

    // Clean up test multi services
    await prisma.service.deleteMany({
      where: { id: { in: [srvAId, srvBId, srvCId] } },
    });

    // -------------------------------------------------------------------------
    // Scenario 7: Packages and Add-ons Independence
    // -------------------------------------------------------------------------
    console.log('\n--- Step 7: Packages and Add-ons Independence Test ---');
    const pkgId = `audit_pkg_${Date.now()}`;
    const addonId = `audit_addon_${Date.now()}`;

    await prisma.servicePackage.create({
      data: {
        id: pkgId,
        serviceId: testServiceId,
        name: 'باقة مميزة مستقلة',
        nameEn: 'Independent Premium Package',
        price: 350,
        originalPrice: 400,
        durationMinutes: 60,
        active: true,
      },
    });

    await prisma.serviceAddon.create({
      data: {
        id: addonId,
        serviceId: testServiceId,
        name: 'إضافة تعطير فاخر',
        nameEn: 'Luxury Scent Add-on',
        price: 75,
        durationMinutes: 10,
        active: true,
      },
    });

    const packageAndAddonCalc = await calculateBookingPrice({
      serviceId: testServiceId,
      packageId: pkgId,
      addonIds: [addonId],
    });

    // Package price = 350 (with package originalPrice = 400, savings = 50)
    // Addon price = 75
    // Subtotal = 350 + 75 = 425
    assert(packageAndAddonCalc.packagePrice === 350, 'Package price is 350 EGP');
    assert(packageAndAddonCalc.addonsTotal === 75, 'Add-on total is 75 EGP');
    assert(packageAndAddonCalc.subtotal === 425, 'Total subtotal is 425 EGP (350 + 75)');
    assert(packageAndAddonCalc.catalogDiscount === 50, 'Package catalog discount is 50 EGP (400 - 350)');
    assert(packageAndAddonCalc.finalPrice === 425, 'Final price is 425 EGP');

  } catch (error) {
    console.error('Unhandled test error:', error);
    failedAssertions++;
  } finally {
    // Ensure all test artifacts are cleaned up
    try {
      await prisma.serviceAddon.deleteMany({ where: { serviceId: testServiceId } });
      await prisma.servicePackage.deleteMany({ where: { serviceId: testServiceId } });
      await prisma.service.deleteMany({ where: { id: testServiceId } });
      await Coupon.deleteOne({ code: testCouponCode });
    } catch (e) {}
  }

  console.log('\n======================================================');
  if (failedAssertions === 0) {
    console.log('✅ ALL TESTS PASSED! SERVICE AUTO-DISCOUNT COMPLETELY REMOVED.');
    console.log('======================================================\n');
    process.exit(0);
  } else {
    console.error(`❌ ${failedAssertions} TEST ASSERTION(S) FAILED.`);
    console.log('======================================================\n');
    process.exit(1);
  }
}

runTest();
