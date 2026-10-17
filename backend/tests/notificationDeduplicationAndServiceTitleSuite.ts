import assert from 'node:assert';
import prisma from '../src/config/prisma.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { Notification } from '../src/models/Notification.js';
import {
  getCanonicalBookingServiceTitle,
  getCustomerNotificationContentForStatus,
} from '../src/controllers/bookingController.js';
import {
  getCustomerNotifications,
  cleanupDuplicateNotifications,
} from '../src/controllers/notificationController.js';

async function runNotificationDeduplicationAndServiceTitleSuite() {
  console.log('\n====================================================================');
  console.log('🧪 NOTIFICATION DEDUPLICATION & CANONICAL SERVICE TITLE TEST SUITE');
  console.log('====================================================================\n');

  await connectDB();

  const testSuffix = `test_${Date.now()}`;
  const testOrderId1 = `CLN-NOTIF-${Date.now()}-1`;
  const testOrderId2 = `CLN-NOTIF-${Date.now()}-2`;
  const testUserId1 = `u_notif_${Date.now()}_1`;
  const testUserId2 = `u_notif_${Date.now()}_2`;

  try {
    // --------------------------------------------------------------------------
    // Test 1: Event Idempotency & Retry (Zero Duplicate Insertion)
    // --------------------------------------------------------------------------
    console.log('▶ Test 1: Event Idempotency & Retry');
    const eventId1 = `order:created:admin:${testOrderId1}`;

    const firstCreation = await Notification.create({
      target: 'admin',
      eventId: eventId1,
      title: 'طلب حجز جديد',
      titleEn: 'New Booking Created',
      message: `طلب جديد برقم #${testOrderId1} لخدمة غسيل متكامل للعميل أحمد`,
      messageEn: `New booking #${testOrderId1}`,
      type: 'order',
      read: false,
    });

    assert(firstCreation, 'First notification created successfully');
    assert(firstCreation.eventId === eventId1, 'Returned doc has matching eventId');

    // Attempt second creation with EXACT same eventId (Simulating retry/duplicate dispatch)
    const secondCreation = await Notification.create({
      target: 'admin',
      eventId: eventId1,
      title: 'طلب حجز جديد',
      titleEn: 'New Booking Created',
      message: `طلب جديد برقم #${testOrderId1} لخدمة غسيل متكامل للعميل أحمد`,
      messageEn: `New booking #${testOrderId1}`,
      type: 'order',
      read: false,
    });

    assert(secondCreation, 'Second attempt returned a notification doc');
    assert(
      (secondCreation.id || secondCreation._id) === (firstCreation.id || firstCreation._id),
      'Idempotent call returned the EXACT same existing notification instance'
    );

    // Verify in PostgreSQL table directly
    const dbCount = await prisma.notification.count({
      where: { eventId: eventId1 },
    });
    assert(dbCount === 1, `DB count for eventId is strictly 1 (got ${dbCount})`);
    console.log('  ✓ Idempotent retry resulted in zero duplicate rows in PostgreSQL');

    // --------------------------------------------------------------------------
    // Test 2: Legitimate Different Orders Preservation
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 2: Distinct Legitimate Events Preservation');
    const eventId2 = `order:created:admin:${testOrderId2}`;

    await Notification.create({
      target: 'admin',
      eventId: eventId2,
      title: 'طلب حجز جديد',
      titleEn: 'New Booking Created',
      message: `طلب جديد برقم #${testOrderId2} لخدمة غسيل متكامل للعميل أحمد`, // Identical text
      messageEn: `New booking #${testOrderId2}`,
      type: 'order',
      read: false,
    });

    const totalOrdersNotifs = await prisma.notification.count({
      where: {
        eventId: { in: [eventId1, eventId2] },
      },
    });
    assert(totalOrdersNotifs === 2, `Both legitimate order notifications preserved (got ${totalOrdersNotifs})`);
    console.log('  ✓ Legitimate distinct orders with identical text were both preserved without suppression');

    // --------------------------------------------------------------------------
    // Test 3: Canonical Title for Multi-Service Composite Order
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 3: Multi-Service Composite Canonical Title Formatting');
    const compositeBooking = {
      id: 'BK-COMPOSITE-TITLE',
      serviceSnapshot: {
        category: 'mixed',
        services: [
          { id: 's1', title: 'غسيل سيارات بالبخار', titleEn: 'Steam Car Wash' },
          { id: 's2', title: 'تنظيف سجاد منزلي', titleEn: 'Carpet Deep Clean' },
        ],
      },
    };

    const compTitleAr = getCanonicalBookingServiceTitle(compositeBooking, 'ar');
    const compTitleEn = getCanonicalBookingServiceTitle(compositeBooking, 'en');

    assert(compTitleAr === 'غسيل سيارات بالبخار + تنظيف سجاد منزلي', `Arabic title formatted correctly: "${compTitleAr}"`);
    assert(compTitleEn === 'Steam Car Wash + Carpet Deep Clean', `English title formatted correctly: "${compTitleEn}"`);
    console.log('  ✓ Composite order service names accurately composed and unified');

    // --------------------------------------------------------------------------
    // Test 4: Package and Single Service Titles
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 4: Package & Single Service Title Authority');
    const packageBooking = {
      id: 'BK-PKG-TITLE',
      packageSnapshot: {
        name: 'باقة كلينزو VIP المتكاملة',
        nameEn: 'Cleanzo VIP Full Package',
      },
    };
    assert(
      getCanonicalBookingServiceTitle(packageBooking, 'ar') === 'باقة كلينزو VIP المتكاملة',
      'Package snapshot name used with priority'
    );

    const singleBooking = {
      id: 'BK-SINGLE-TITLE',
      serviceSnapshot: {
        title: 'غسيل مقاعد بالنانو',
        titleEn: 'Nano Seat Wash',
      },
    };
    assert(
      getCanonicalBookingServiceTitle(singleBooking, 'ar') === 'غسيل مقاعد بالنانو',
      'Single service snapshot title used'
    );
    console.log('  ✓ Package and single service snapshot titles resolved with authoritative precision');

    // --------------------------------------------------------------------------
    // Test 5: Notification Content Generation for Order Lifecycle Events
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 5: Lifecycle Notification Content Formatting');
    const sampleOrder = {
      id: 'CLN-2026-999',
      customerName: 'سارة خالد',
      serviceSnapshot: {
        services: [
          { title: 'غسيل داخلي', titleEn: 'Interior Wash' },
          { title: 'تلميع ساطع', titleEn: 'Gloss Polish' },
        ],
      },
      date: '2026-11-01',
      time: '14:00 – 15:00',
    };

    const pendingNotif = getCustomerNotificationContentForStatus('pending', sampleOrder);
    assert(pendingNotif.message.includes('غسيل داخلي + تلميع ساطع'), 'Pending notification contains composite title');
    assert(!pendingNotif.message.includes('خدمة كلينزو'), 'Pending notification does NOT fall back to generic service name');

    const confirmedNotif = getCustomerNotificationContentForStatus('confirmed', sampleOrder);
    assert(confirmedNotif.message.includes('غسيل داخلي + تلميع ساطع'), 'Confirmed notification contains composite title');

    console.log('  ✓ Customer lifecycle notifications use canonical titles without generic fallbacks');

    // --------------------------------------------------------------------------
    // Test 6: Customer Notification Scoping & Deduplication
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 6: Customer Notification Scoping & Privacy Isolation');
    await Notification.create({
      target: 'customer',
      userId: testUserId1,
      eventId: `order:created:cust:${testOrderId1}`,
      title: 'طلبك قيد المراجعة',
      titleEn: 'Order under review',
      message: `تم استلام طلبك #${testOrderId1}`,
      messageEn: `Order #${testOrderId1} received`,
      type: 'order',
      read: false,
    });

    await Notification.create({
      target: 'customer',
      userId: testUserId2,
      eventId: `order:created:cust:${testOrderId2}`,
      title: 'طلبك قيد المراجعة',
      titleEn: 'Order under review',
      message: `تم استلام طلبك #${testOrderId2}`,
      messageEn: `Order #${testOrderId2} received`,
      type: 'order',
      read: false,
    });

    // Mock Express Request for Customer 1
    let cust1Result: any = null;
    const req1: any = { user: { _id: testUserId1, id: testUserId1 } };
    const res1: any = {
      status(code: number) { return this; },
      json(data: any) { cust1Result = data; return this; },
    };

    await getCustomerNotifications(req1, res1);
    assert(cust1Result && cust1Result.success, 'getCustomerNotifications returned success');
    const cust1Items = cust1Result.data;
    assert(cust1Items.some((n: any) => n.eventId === `order:created:cust:${testOrderId1}`), 'Customer 1 receives their own notification');
    assert(!cust1Items.some((n: any) => n.eventId === `order:created:cust:${testOrderId2}`), 'Customer 1 NEVER sees Customer 2 notification');

    console.log('  ✓ Customer notifications are strictly scoped to the authorized tenant/user');

    // --------------------------------------------------------------------------
    // Test 7: Cleanup Historical Duplicate Notifications Endpoint
    // --------------------------------------------------------------------------
    console.log('\n▶ Test 7: Historical Duplicate Cleanup Verification');
    // Force insert duplicate notifications with raw DB insert to simulate pre-fix historical records
    const dupTitle = `تنبيه قديم مكرر ${testSuffix}`;
    const dupMsg = `رسالة اختبار مكررة ${testSuffix}`;

    await prisma.notification.createMany({
      data: [
        {
          target: 'admin',
          title: dupTitle,
          message: dupMsg,
          type: 'system',
          read: false,
        },
        {
          target: 'admin',
          title: dupTitle,
          message: dupMsg,
          type: 'system',
          read: false,
        },
      ],
    });

    let cleanupRes: any = null;
    const reqClean: any = {};
    const resClean: any = {
      status(code: number) { return this; },
      json(data: any) { cleanupRes = data; return this; },
    };

    await cleanupDuplicateNotifications(reqClean, resClean);
    assert(cleanupRes && cleanupRes.success, 'cleanupDuplicateNotifications succeeded');
    assert(cleanupRes.data.removedCount >= 1, `Cleaned up at least 1 duplicate (removed ${cleanupRes.data.removedCount})`);

    // Verify only 1 remains in DB
    const remainingCount = await prisma.notification.count({
      where: { title: dupTitle, message: dupMsg },
    });
    assert(remainingCount === 1, `Exactly 1 copy retained after cleanup (got ${remainingCount})`);
    console.log('  ✓ Historical duplicates safely pruned while retaining earliest original');

    console.log('\n====================================================================');
    console.log('✅ ALL NOTIFICATION DEDUPLICATION & SERVICE TITLE TESTS PASSED 100%!');
    console.log('====================================================================\n');
  } finally {
    // Cleanup test records
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { eventId: { in: [`order:created:admin:${testOrderId1}`, `order:created:admin:${testOrderId2}`, `order:created:cust:${testOrderId1}`, `order:created:cust:${testOrderId2}`] } },
          { title: { contains: testSuffix } },
        ],
      },
    });
    await disconnectDB();
  }
}

runNotificationDeduplicationAndServiceTitleSuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Test suite failed:', err);
    process.exit(1);
  });
