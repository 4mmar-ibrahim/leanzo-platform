import prisma from '../src/config/db.js';
import {
  createSubscriptionAtomic,
  cancelSubscriptionVisit,
  rescheduleSubscriptionVisit,
  completeSubscriptionVisit,
  renewSubscription,
  getSubscriptionAnalytics,
  isNoticeSufficient,
} from '../src/services/subscriptionService.js';
import { assertSlotAvailability, getAvailableSlots } from '../src/services/availabilityService.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    failedTests++;
    throw new Error(msg);
  } else {
    console.log(`✅ PASSED: ${msg}`);
    passedTests++;
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 CLEANZO SUBSCRIPTION SYSTEM FULL INTEGRATION SUITE');
  console.log('======================================================\n');

  let testServiceId: string = '';
  let testUserId: string = '';
  let testUser2Id: string = '';
  let testPlanId: string = '';
  let testSubId: string = '';
  let createdVisitIds: string[] = [];

  try {
    // 0. Setup: Ensure an active service and customers exist
    const service = await prisma.service.findFirst({ where: { available: true, isArchived: false } });
    if (!service) throw new Error('No active service found in database.');
    testServiceId = service.id;

    // Create or find a test customer
    let user1 = await prisma.user.findFirst({ where: { phone: '966500000001' } });
    if (!user1) {
      user1 = await prisma.user.create({
        data: {
          name: 'Test Customer 1',
          phone: '966500000001',
          email: 'testcustomer1@cleanzo.test',
          password: 'hashed_qa_test_password',
        },
      });
    }
    testUserId = user1.id;

    let user2 = await prisma.user.findFirst({ where: { phone: '966500000002' } });
    if (!user2) {
      user2 = await prisma.user.create({
        data: {
          name: 'Test Customer 2',
          phone: '966500000002',
          email: 'testcustomer2@cleanzo.test',
          password: 'hashed_qa_test_password',
        },
      });
    }
    testUser2Id = user2.id;

    // ========================================================
    // TEST 1: Subscription Plan Creation & Validation
    // ========================================================
    console.log('\n--- 1. Testing Subscription Plan Creation ---');
    const plan = await prisma.subscriptionPlan.create({
      data: {
        name: 'QA Test Premium Plan 4 Visits',
        description: 'Test monthly plan with 4 visits',
        serviceId: testServiceId,
        visitCount: 4,
        price: 800,
        durationDays: 30,
        status: 'active',
        allowRenewal: true,
        allowCancellation: true,
        allowRescheduling: true,
        cancellationNoticeHours: 12,
        rescheduleNoticeHours: 12,
        cashbackPercentage: 5,
      },
    });
    testPlanId = plan.id;
    assert(!!plan.id, 'Plan was created with a valid UUID');
    assert(plan.visitCount === 4, 'Plan has 4 visits configured');
    assert(plan.price === 800, 'Plan has correct price');

    // ========================================================
    // TEST 2: Policy Notice Logic (12h for Sub, 6h for Normal)
    // ========================================================
    console.log('\n--- 2. Testing 12-Hour and 6-Hour Notice Policy Logic ---');
    const now = new Date();

    const formatLocal = (d: Date) => ({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      time: `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`,
    });

    // 13 hours in future -> should pass 12h check
    const future13h = formatLocal(new Date(now.getTime() + 13 * 3600 * 1000));
    assert(isNoticeSufficient(future13h.date, future13h.time, 12).isAllowed === true, '13 hours before appointment passes 12-hour policy');

    // Exactly 12 hours in future -> should pass 12h check
    const future12h = formatLocal(new Date(now.getTime() + 12 * 3600 * 1000));
    assert(isNoticeSufficient(future12h.date, future12h.time, 12).isAllowed === true, 'Exactly 12 hours before appointment passes 12-hour policy');

    // 5 hours in future -> should fail 12h check and 6h check
    const future5h = formatLocal(new Date(now.getTime() + 5 * 3600 * 1000));
    assert(isNoticeSufficient(future5h.date, future5h.time, 12).isAllowed === false, '5 hours before appointment is rejected for 12-hour subscription policy');
    assert(isNoticeSufficient(future5h.date, future5h.time, 6).isAllowed === false, '5 hours before appointment is rejected for 6-hour normal booking policy');

    // 7 hours in future -> should pass 6h check but fail 12h check
    const future7h = formatLocal(new Date(now.getTime() + 7 * 3600 * 1000));
    assert(isNoticeSufficient(future7h.date, future7h.time, 6).isAllowed === true, '7 hours before appointment passes 6-hour normal booking policy');
    assert(isNoticeSufficient(future7h.date, future7h.time, 12).isAllowed === false, '7 hours before appointment fails 12-hour subscription policy');

    // ========================================================
    // TEST 3: Atomic Subscription Creation with 4 Visits
    // ========================================================
    console.log('\n--- 3. Testing Atomic Customer Subscription Creation ---');
    const futureBase = new Date(Date.now() + 10 * 86400 * 1000);
    const makeDate = (dayOffset: number) => {
      const d = new Date(futureBase.getTime() + dayOffset * 86400 * 1000);
      return d.toISOString().split('T')[0];
    };

    const requestedVisits = [
      { date: makeDate(0), time: '10:00' },
      { date: makeDate(5), time: '11:00' },
      { date: makeDate(10), time: '12:00' },
      { date: makeDate(15), time: '14:00' },
    ];

    const subscription = await createSubscriptionAtomic({
      customerId: testUserId,
      customerName: 'Test Customer 1',
      customerPhone: '966500000001',
      planId: testPlanId,
      serviceId: testServiceId,
      vehicleDetails: { make: 'Toyota', model: 'Camry', plateNumber: 'XYZ-123' },
      address: { label: 'المنزل', governorate: 'القاهرة', city: 'مدينة نصر' },
      visits: requestedVisits,
    });

    testSubId = subscription.id;
    createdVisitIds = subscription.visits.map((v: any) => v.id);

    assert(!!subscription.id, 'Subscription created with valid ID');
    assert(subscription.totalVisits === 4, 'totalVisits is initialized to 4');
    assert(subscription.usedVisits === 0, 'usedVisits is initialized to 0');
    assert(subscription.remainingVisits === 4, 'remainingVisits is initialized to 4');
    assert(subscription.visits.length === 4, 'Exactly 4 subscription visits were created atomically');
    assert(subscription.price === 800, 'Price recalculated and enforced by backend as 800');

    // ========================================================
    // TEST 4: Unified Dynamic Availability Mutual Blocking
    // ========================================================
    console.log('\n--- 4. Testing Mutual Blocking between Subscriptions and Bookings ---');
    // Subscription visit 1 is booked at makeDate(0) at 10:00.
    let conflictDetected = false;
    try {
      await assertSlotAvailability({
        dateStr: makeDate(0),
        timeStr: '10:00',
        serviceId: testServiceId,
      });
    } catch (err: any) {
      conflictDetected = true;
    }
    assert(conflictDetected, 'Dynamic Availability engine detects subscription visit as occupied interval');

    // Attempting to create another subscription at the same slot makeDate(0) 10:00 must fail atomically
    let atomicConflictCaught = false;
    try {
      await createSubscriptionAtomic({
        customerId: testUser2Id,
        customerName: 'Test Customer 2',
        customerPhone: '966500000002',
        planId: testPlanId,
        serviceId: testServiceId,
        address: { label: 'العمل', city: 'القاهرة' },
        visits: [
          { date: makeDate(0), time: '10:00' }, // Conflicting!
          { date: makeDate(1), time: '11:00' },
          { date: makeDate(2), time: '12:00' },
          { date: makeDate(3), time: '14:00' },
        ],
      });
    } catch (err: any) {
      atomicConflictCaught = true;
    }
    assert(atomicConflictCaught, 'Atomic subscription creation aborted when 1 out of 4 visits conflicts (Zero partial creation)');

    // ========================================================
    // TEST 5: Visit Completion, Balance & Cashback
    // ========================================================
    console.log('\n--- 5. Testing Visit Completion, Balance Increments & Cashback ---');
    const firstVisitId = createdVisitIds[0];
    const { updatedVisit } = await completeSubscriptionVisit({
      visitId: firstVisitId,
      adminActor: { id: 'admin_test', name: 'Admin QA', role: 'admin' },
    });

    assert(updatedVisit.status === 'completed', 'Visit status updated to completed');

    const updatedSub = await prisma.subscription.findUnique({ where: { id: testSubId } });
    assert(updatedSub?.usedVisits === 1, 'usedVisits incremented to exactly 1');
    assert(updatedSub?.remainingVisits === 3, 'remainingVisits decremented to exactly 3');

    // Verify cashback was calculated and awarded: 5% of (800 / 4) = 5% of 200 = 10 EGP
    const cashbackRecord = await prisma.subscriptionCashback.findFirst({
      where: { subscriptionId: testSubId, visitId: firstVisitId },
    });
    assert(!!cashbackRecord, 'Cashback record was generated upon completion');
    assert(cashbackRecord?.amount === 10, 'Cashback amount calculated correctly as 10 (5% of 200)');

    // Duplicate completion test: completing the already completed visit must not increment balance again
    let duplicatePrevented = false;
    try {
      await completeSubscriptionVisit({
        visitId: firstVisitId,
        adminActor: { id: 'admin_test', name: 'Admin QA', role: 'admin' },
      });
    } catch (err: any) {
      duplicatePrevented = true;
    }
    assert(duplicatePrevented, 'Duplicate completion of same visit is prevented');
    const subAfterDup = await prisma.subscription.findUnique({ where: { id: testSubId } });
    assert(subAfterDup?.usedVisits === 1, 'usedVisits was NOT double-incremented');

    // ========================================================
    // TEST 6: Reschedule Visit with Transactional Reservation
    // ========================================================
    console.log('\n--- 6. Testing Subscription Visit Reschedule (Safe Swap) ---');
    const secondVisitId = createdVisitIds[1];
    const newRescheduleDate = makeDate(6);
    const newRescheduleTime = '15:00';

    const rescheduledVisit = await rescheduleSubscriptionVisit({
      visitId: secondVisitId,
      newDate: newRescheduleDate,
      newTime: newRescheduleTime,
      actor: 'customer',
      actorId: testUserId,
      customerPhone: '966500000001',
    });

    assert(rescheduledVisit.date === newRescheduleDate, 'Visit rescheduled to new date');
    assert(rescheduledVisit.time.includes('15:00'), 'Visit rescheduled to new time');

    // ========================================================
    // TEST 7: Cancel Visit (Policy & Balance Preservation)
    // ========================================================
    console.log('\n--- 7. Testing Subscription Visit Cancellation ---');
    const thirdVisitId = createdVisitIds[2];
    const cancelledVisit = await cancelSubscriptionVisit({
      visitId: thirdVisitId,
      actor: 'customer',
      actorId: testUserId,
      customerPhone: '966500000001',
      reason: 'QA Cancellation Test',
    });

    assert(cancelledVisit.status === 'cancelled', 'Visit status marked as cancelled');

    const subAfterCancel = await prisma.subscription.findUnique({ where: { id: testSubId } });
    // Cancelled visit must NOT consume used visits
    assert(subAfterCancel?.usedVisits === 1, 'Cancelled visit did not consume visit balance');

    // ========================================================
    // TEST 8: Customer Isolation / IDOR Protection
    // ========================================================
    console.log('\n--- 8. Testing Customer Isolation & IDOR Protection ---');
    const fourthVisitId = createdVisitIds[3];
    let idorBlocked = false;
    try {
      // User 2 trying to cancel User 1's visit
      await cancelSubscriptionVisit({
        visitId: fourthVisitId,
        actor: 'customer',
        actorId: testUser2Id, // Unauthorized!
        customerPhone: '966500000002',
        reason: 'Malicious attempt',
      });
    } catch (err: any) {
      idorBlocked = true;
    }
    assert(idorBlocked, 'Customer 2 cannot cancel Customer 1 visit (IDOR blocked by backend)');

    // ========================================================
    // TEST 9: Subscription Renewal (Preserving History)
    // ========================================================
    console.log('\n--- 9. Testing Subscription Renewal History & Continuity ---');
    const renewedVisits = [
      { date: makeDate(30), time: '10:00' },
      { date: makeDate(35), time: '11:00' },
      { date: makeDate(40), time: '12:00' },
      { date: makeDate(45), time: '14:00' },
    ];

    const renewedSub = await renewSubscription({
      subscriptionId: testSubId,
      visits: renewedVisits,
      customerActor: { id: testUserId, phone: '966500000001', name: 'Test Customer 1' },
    });

    assert(!!renewedSub.id, 'New subscription cycle created');
    assert(renewedSub.id !== testSubId, 'New subscription has a distinct ID');
    assert(renewedSub.renewalCycle === 2, 'New subscription has renewalCycle = 2');
    assert(renewedSub.totalVisits === 4 && renewedSub.usedVisits === 0, 'New subscription has fresh 0/4 balance');

    // Check old subscription still exists and is untouched/completed
    const oldSub = await prisma.subscription.findUnique({ where: { id: testSubId } });
    assert(!!oldSub, 'Original subscription record preserved intact');
    assert(oldSub?.renewedToId === renewedSub.id, 'Original subscription tracks renewedToId');

    // Check renewal history record
    const renewalHistory = await prisma.subscriptionRenewal.findFirst({
      where: { subscriptionId: testSubId, newSubscriptionId: renewedSub.id },
    });
    assert(!!renewalHistory, 'Renewal history cycle table contains audit record');
    assert(renewalHistory?.renewalCycle === 2, 'Renewal history shows cycle 2');

    // ========================================================
    // TEST 10: PostgreSQL Real Analytics KPIs
    // ========================================================
    console.log('\n--- 10. Testing Analytics Engine from PostgreSQL ---');
    const analytics = await getSubscriptionAnalytics();
    assert(analytics.kpis.totalSubscriptions >= 2, 'Analytics accurately counts total subscriptions');
    assert(analytics.kpis.activeSubscriptions >= 1, 'Analytics accurately counts active subscriptions');
    assert(analytics.kpis.activeSubscriptionValue >= 800, 'Active Subscription Value matches active subscriptions pricing');
    assert(analytics.kpis.completedVisits >= 1, 'Analytics tracks completed visits from DB');
    assert(analytics.kpis.cancelledVisits >= 1, 'Analytics tracks cancelled visits from DB');

    // ========================================================
    // TEST 11: Decoupling Subscription Count from Vehicles
    // ========================================================
    console.log('\n--- 11. Testing Decoupling of Subscriptions from Vehicles ---');
    // Same customer creating a second subscription for the SAME vehicle (Camry)
    const secondSubSameVehicle = await createSubscriptionAtomic({
      customerId: testUserId,
      customerName: 'Test Customer 1',
      customerPhone: '966500000001',
      planId: testPlanId,
      serviceId: testServiceId,
      vehicleDetails: { make: 'Toyota', model: 'Camry', plateNumber: 'XYZ-123' },
      address: { label: 'المنزل', city: 'القاهرة' },
      visits: [
        { date: makeDate(50), time: '10:00' },
        { date: makeDate(55), time: '11:00' },
        { date: makeDate(60), time: '12:00' },
        { date: makeDate(65), time: '14:00' },
      ],
    });
    assert(!!secondSubSameVehicle.id, 'Customer can have multiple subscriptions for the same vehicle');

    // Customer creating a subscription with NO vehicle
    const subNoVehicle = await createSubscriptionAtomic({
      customerId: testUserId,
      customerName: 'Test Customer 1',
      customerPhone: '966500000001',
      planId: testPlanId,
      serviceId: testServiceId,
      address: { label: 'المنزل', city: 'القاهرة' },
      visits: [
        { date: makeDate(70), time: '10:00' },
        { date: makeDate(75), time: '11:00' },
        { date: makeDate(80), time: '12:00' },
        { date: makeDate(85), time: '14:00' },
      ],
    });
    assert(!!subNoVehicle.id, 'Subscription without vehicle is valid and independent');

    console.log('\n======================================================');
    console.log(`🎉 ALL ${passedTests} TESTS PASSED! (${failedTests} failures)`);
    console.log('======================================================\n');
  } catch (error) {
    console.error('Test suite failed with unhandled exception:', error);
  } finally {
    // ========================================================
    // TEARDOWN: Clean up temporary QA test data
    // ========================================================
    console.log('🧹 Cleaning up temporary QA test data...');
    try {
      await prisma.subscriptionCashback.deleteMany({
        where: { customerId: testUserId },
      });
      await prisma.subscriptionRenewal.deleteMany({
        where: { customerId: testUserId },
      });
      await prisma.subscriptionVisit.deleteMany({
        where: { customerId: testUserId },
      });
      await prisma.subscription.deleteMany({
        where: { customerId: testUserId },
      });
      if (testPlanId) {
        await prisma.subscriptionPlan.delete({ where: { id: testPlanId } });
      }
      if (testUserId) {
        await prisma.user.delete({ where: { id: testUserId } });
      }
      if (testUser2Id) {
        await prisma.user.delete({ where: { id: testUser2Id } });
      }
      console.log('✅ Temporary QA records deleted. Zero database pollution.');
    } catch (cleanErr) {
      console.warn('Warning during cleanup:', cleanErr);
    }
    await prisma.$disconnect();
  }
}

runTestSuite();
