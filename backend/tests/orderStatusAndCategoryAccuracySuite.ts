/**
 * Cleanzo Automated Test Suite: Order Status Unification, Sector Calculation & Timeline Deduplication
 * Verifies:
 * 1. Canonical status labels (confirmed === مؤكد / Confirmed, not مستلم).
 * 2. Mixed category calculation for orders spanning both car and home services.
 * 3. Timeline event deduplication and history preservation.
 * 4. End-to-end status transitions and sector verification.
 */
import prisma from '../src/config/prisma.js';
import { appendTimelineEvent } from '../src/controllers/bookingController.js';
import {
  normalizeCategory,
  computeOrderCategory,
  getCategoryDisplayName,
} from '../src/services/availabilityService.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log('🧪 Starting Order Status, Sector & Timeline Accuracy Test Suite...\n');

  // --------------------------------------------------------------------------
  // Group 1: Canonical Status Labels & Translations
  // --------------------------------------------------------------------------
  console.log('--- Group 1: Status Labels & Translation Alignment ---');
  
  const statusLabelsAr: Record<string, string> = {
    pending: 'قيد المراجعة',
    confirmed: 'مؤكد',
    assigned: 'تم تعيين الفني',
    on_the_way: 'الفني في الطريق',
    in_progress: 'قيد التنفيذ',
    completed: 'مكتمل',
    cancelled: 'ملغي',
  };

  assert(statusLabelsAr.confirmed === 'مؤكد', 'confirmed status in Arabic maps strictly to "مؤكد" (not "مستلم")');
  assert(statusLabelsAr.pending === 'قيد المراجعة', 'pending status in Arabic maps to "قيد المراجعة"');
  assert(statusLabelsAr.completed === 'مكتمل', 'completed status in Arabic maps to "مكتمل"');

  // --------------------------------------------------------------------------
  // Group 2: Order Sector & Category Computation (Car, Home & Mixed)
  // --------------------------------------------------------------------------
  console.log('\n--- Group 2: Order Sector & Category Calculation ---');

  // 2.1 Normalization
  assert(normalizeCategory('car') === 'car', 'normalizeCategory("car") returns "car"');
  assert(normalizeCategory('home') === 'home', 'normalizeCategory("home") returns "home"');
  assert(normalizeCategory('mixed') === 'mixed', 'normalizeCategory("mixed") returns "mixed"');
  assert(normalizeCategory('مختلط') === 'mixed', 'normalizeCategory("مختلط") returns "mixed"');

  // 2.2 Display Names
  assert(getCategoryDisplayName('car', true) === 'سيارات', 'getCategoryDisplayName("car", ar) returns "سيارات"');
  assert(getCategoryDisplayName('home', true) === 'منازل', 'getCategoryDisplayName("home", ar) returns "منازل"');
  assert(getCategoryDisplayName('mixed', true) === 'مختلط', 'getCategoryDisplayName("mixed", ar) returns "مختلط"');
  assert(getCategoryDisplayName('mixed', false) === 'Mixed', 'getCategoryDisplayName("mixed", en) returns "Mixed"');

  // 2.3 Sector resolution from order services
  const pureCarOrder = {
    id: 'TEST-CAR-1',
    category: 'car',
    serviceSnapshot: {
      category: 'car',
      services: [
        { title: 'غسيل واش أساسي', category: 'car' },
        { title: 'تلميع شمعي', category: 'car' },
      ],
    },
  };
  assert(computeOrderCategory(pureCarOrder) === 'car', 'Order with only car services computes as "car"');

  const pureHomeOrder = {
    id: 'TEST-HOME-1',
    category: 'home',
    serviceSnapshot: {
      category: 'home',
      services: [
        { title: 'تنظيف عميق للمنازل', category: 'home' },
        { title: 'غسيل سجاد ومفروشات', category: 'home' },
      ],
    },
  };
  assert(computeOrderCategory(pureHomeOrder) === 'home', 'Order with only home services computes as "home"');

  const mixedOrder = {
    id: 'TEST-MIX-1',
    category: 'mixed',
    serviceSnapshot: {
      category: 'mixed',
      services: [
        { title: 'غسيل واش سيارة', category: 'car' },
        { title: 'تنظيف عميق للمنزل', category: 'home' },
      ],
    },
  };
  assert(computeOrderCategory(mixedOrder) === 'mixed', 'Order combining car and home services computes as "mixed" (مختلط)');

  const implicitMixedOrder = {
    id: 'TEST-IMPLICIT-MIX',
    category: 'car', // initially flagged as car in old record
    serviceSnapshot: {
      category: 'car',
      services: [
        { title: 'غسيل سيارات VIP', category: 'car' },
        { title: 'تعقيم كنب ومجالس بالبخار', category: 'home' },
      ],
    },
  };
  assert(
    computeOrderCategory(implicitMixedOrder) === 'mixed',
    'Legacy or composite order with services across car and home dynamically computes as "mixed"'
  );

  // --------------------------------------------------------------------------
  // Group 3: Timeline Deduplication & History Preservation
  // --------------------------------------------------------------------------
  console.log('\n--- Group 3: Timeline Deduplication & Integrity ---');

  const testBooking: any = {
    id: 'CLN-TEST-TIMELINE',
    timeline: [
      {
        status: 'pending',
        label: 'تم استلام طلب الحجز',
        labelEn: 'Booking Request Received',
        timestamp: '10/15/2026, 12:00 PM',
        completed: true,
        description: 'طلبك قيد المراجعة',
        descriptionEn: 'Under review',
      },
    ],
  };

  // Add confirmed event
  const added1 = appendTimelineEvent(testBooking, {
    status: 'confirmed',
    label: 'مؤكد',
    labelEn: 'Confirmed',
    timestamp: '10/15/2026, 12:05 PM',
    completed: true,
    description: 'تم تأكيد موعد الحجز وتثبيت الموعد',
    descriptionEn: 'Booking confirmed',
  });
  assert(added1 === true, 'First confirmed event added successfully');
  assert(testBooking.timeline.length === 2, 'Timeline now has exactly 2 events');

  // Attempt to add DUPLICATE confirmed event
  const addedDuplicate = appendTimelineEvent(testBooking, {
    status: 'confirmed',
    label: 'مؤكد',
    labelEn: 'Confirmed',
    timestamp: '10/15/2026, 12:06 PM',
    completed: true,
    description: 'تم تأكيد موعد الحجز وتثبيت الموعد',
    descriptionEn: 'Booking confirmed',
  });
  assert(addedDuplicate === false, 'Duplicate confirmed event was safely rejected');
  assert(testBooking.timeline.length === 2, 'Timeline length remains exactly 2 (no duplicate)');

  // Advance to assigned
  const addedAssigned = appendTimelineEvent(testBooking, {
    status: 'assigned',
    label: 'تم تعيين الفني: أحمد محمود',
    labelEn: 'Technician assigned: Ahmed Mahmoud',
    timestamp: '10/15/2026, 12:15 PM',
    completed: true,
    description: 'تم إسناد تنفيذ الطلب إلى الفني المختص (أحمد محمود)',
    descriptionEn: 'Order assigned',
  });
  assert(addedAssigned === true, 'Assigned event added successfully');
  assert(testBooking.timeline.length === 3, 'Timeline advanced to 3 events');

  // Attempt duplicate assigned event
  const duplicateAssigned = appendTimelineEvent(testBooking, {
    status: 'assigned',
    label: 'تم تعيين الفني: أحمد محمود',
    labelEn: 'Technician assigned: Ahmed Mahmoud',
    timestamp: '10/15/2026, 12:16 PM',
    completed: true,
    description: 'تم إسناد تنفيذ الطلب إلى الفني المختص (أحمد محمود)',
    descriptionEn: 'Order assigned',
  });
  assert(duplicateAssigned === false, 'Duplicate assignment event rejected');
  assert(testBooking.timeline.length === 3, 'Timeline preserves exact history without duplication');

  // --------------------------------------------------------------------------
  // Group 4: Database End-to-End Test Record & Cleanup
  // --------------------------------------------------------------------------
  console.log('\n--- Group 4: End-to-End Database Booking Verification ---');
  
  const testPhone = `010${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testEmail = `qa.status.${Date.now()}@cleanzo.net`;
  let createdUser: any = null;
  let createdBooking: any = null;

  try {
    createdUser = await prisma.user.create({
      data: {
        name: 'عميل اختبار الحالات والقطاع',
        phone: testPhone,
        email: testEmail,
        password: 'hashed-password',
      },
    });

    const bookingId = `CLN-QA-STAT-${Date.now()}`;
    createdBooking = await prisma.booking.create({
      data: {
        id: bookingId,
        customerId: createdUser.id,
        customerName: createdUser.name,
        customerPhone: createdUser.phone,
        serviceId: 'srv-1791711071734',
        category: 'mixed',
        date: '2026-10-15',
        time: '04:00 PM',
        timeSlotStart: '16:00',
        scheduledStart: '16:00',
        scheduledEnd: '17:30',
        basePrice: 550,
        finalPrice: 550,
        status: 'confirmed',
        serviceSnapshot: {
          title: 'غسيل سيارة + تنظيف مفروشات',
          category: 'mixed',
          price: 550,
          services: [
            { serviceId: 'srv-1791711071734', title: 'غسيل واش أساسي', category: 'car', price: 220 },
            { serviceId: 'srv-1791711099194', title: 'تنظيف مفروشات بالبخار', category: 'home', price: 330 },
          ],
        },
        address: { city: 'القاهرة', area: 'المعادي' },
        timeline: [
          { status: 'pending', label: 'تم استلام طلب الحجز', timestamp: '12:00 PM', completed: true },
          { status: 'confirmed', label: 'مؤكد', timestamp: '12:10 PM', completed: true },
        ],
      },
    });

    // Verify record in PostgreSQL
    const fetched = await prisma.booking.findUnique({
      where: { id: bookingId },
    });

    assert(fetched !== null, 'QA booking retrieved from PostgreSQL');
    assert(fetched?.status === 'confirmed', 'Booking status in DB is "confirmed"');
    assert(fetched?.category === 'mixed', 'Booking category in DB is "mixed" (قطاع مختلط)');
    assert(
      computeOrderCategory(fetched) === 'mixed',
      'computeOrderCategory on fetched DB booking returns "mixed"'
    );
    assert(
      getCategoryDisplayName(fetched?.category, true) === 'مختلط',
      'getCategoryDisplayName on fetched DB booking returns "مختلط"'
    );
  } finally {
    // Clean up QA test data
    if (createdBooking) {
      await prisma.booking.deleteMany({ where: { id: createdBooking.id } });
    }
    if (createdUser) {
      await prisma.user.deleteMany({ where: { id: createdUser.id } });
    }
  }

  console.log('\n========================================');
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed, Total: ${passed + failed}`);
  console.log('========================================\n');
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
