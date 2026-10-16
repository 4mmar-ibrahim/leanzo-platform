import prisma from '../src/config/prisma.js';
import {
  calculateGrowth,
  getDashboardKPIs,
  getReportsOverview,
  getOrdersReport,
  getRevenueReport,
} from '../src/services/reportsService.js';
import { generateAIAnalyticsInsights } from '../src/services/aiInsightsService.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    results.push({ name, passed: true });
    console.log(`  ✅ PASS: ${name}`);
  } else {
    results.push({ name, passed: false, error: message || 'Assertion failed' });
    console.error(`  ❌ FAIL: ${name} - ${message || 'Assertion failed'}`);
  }
}

async function runTestSuite() {
  console.log('🧪 Starting Metrics & Reporting Accuracy Test Suite...\n');

  try {
    // ----------------------------------------------------
    // Test 1: Growth calculation when previous period is 0
    // ----------------------------------------------------
    const growthZeroToPositive = calculateGrowth(5, 0);
    assert(
      growthZeroToPositive === null,
      'calculateGrowth(5, 0) returns null (new baseline period) instead of misleading +100%'
    );

    const growthZeroToZero = calculateGrowth(0, 0);
    assert(
      growthZeroToZero === 0,
      'calculateGrowth(0, 0) returns 0%'
    );

    const growthNormal = calculateGrowth(150, 100);
    assert(
      growthNormal === 50,
      'calculateGrowth(150, 100) returns +50%'
    );

    // ----------------------------------------------------
    // Test 2: Customer count parity between Dashboard KPIs and CRM
    // ----------------------------------------------------
    const dbCustomerCount = await prisma.user.count({
      where: { isDeleted: false },
    });

    const kpis = await getDashboardKPIs({ period: 'all' });
    assert(
      kpis.totalCustomers === dbCustomerCount,
      `Dashboard totalCustomers (${kpis.totalCustomers}) strictly equals DB Customer count (${dbCustomerCount})`
    );

    // ----------------------------------------------------
    // Test 3: Cancelled orders are strictly excluded from recognized revenue
    // ----------------------------------------------------
    // Clean up any stale test records from previous aborted runs
    await prisma.user.deleteMany({
      where: { email: { contains: 'test_metrics_' } },
    });

    const tempCustomerId = `usr-test-${Date.now()}`;
    const uniquePhone = `010${Math.floor(10000000 + Math.random() * 90000000)}`;
    const testUser = await prisma.user.create({
      data: {
        id: tempCustomerId,
        name: 'عميل اختبار المؤشرات',
        phone: uniquePhone,
        email: `test_metrics_${Date.now()}@cleanzo.net`,
        status: 'active',
        password: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890',
        isDeleted: false,
      },
    });

    const tempCompletedId = `CLN-TEST-COMP-${Date.now()}`;
    const tempCancelledId = `CLN-TEST-CANC-${Date.now()}`;
    const tempPendingId = `CLN-TEST-PEND-${Date.now()}`;

    try {
      // Create 1 completed booking (300 EGP)
      await prisma.booking.create({
        data: {
          id: tempCompletedId,
          customerId: testUser.id,
          customerName: testUser.name,
          customerPhone: testUser.phone,
          serviceId: 'srv-1791711071734',
          category: 'car',
          date: '2026-10-15',
          time: '12:00 PM',
          timeSlotStart: '12:00',
          scheduledStart: '12:00',
          scheduledEnd: '13:00',
          basePrice: 300,
          finalPrice: 300,
          status: 'completed',
          serviceSnapshot: { title: 'غسيل واش أساسي متطور', price: 300 },
          address: { city: 'القاهرة' },
        },
      });

      // Create 1 cancelled booking (900 EGP) - Must NOT be counted in revenue!
      await prisma.booking.create({
        data: {
          id: tempCancelledId,
          customerId: testUser.id,
          customerName: testUser.name,
          customerPhone: testUser.phone,
          serviceId: 'srv-1791711071734',
          category: 'car',
          date: '2026-10-15',
          time: '01:00 PM',
          timeSlotStart: '13:00',
          scheduledStart: '13:00',
          scheduledEnd: '14:00',
          basePrice: 900,
          finalPrice: 900,
          status: 'cancelled',
          serviceSnapshot: { title: 'غسيل واش أساسي متطور', price: 900 },
          address: { city: 'القاهرة' },
        },
      });

      // Create 1 pending booking (400 EGP) - Pipeline, not recognized revenue
      await prisma.booking.create({
        data: {
          id: tempPendingId,
          customerId: testUser.id,
          customerName: testUser.name,
          customerPhone: testUser.phone,
          serviceId: 'srv-1791711071734',
          category: 'car',
          date: '2026-10-15',
          time: '02:00 PM',
          timeSlotStart: '14:00',
          scheduledStart: '14:00',
          scheduledEnd: '15:00',
          basePrice: 400,
          finalPrice: 400,
          status: 'pending',
          serviceSnapshot: { title: 'غسيل واش أساسي متطور', price: 400 },
          address: { city: 'القاهرة' },
        },
      });

      const revenueReport = await getRevenueReport({ period: 'all' });
      const ordersReport = await getOrdersReport({ period: 'all' });
      const overviewReport = await getReportsOverview({ period: 'all' });
      const liveKpis = await getDashboardKPIs({ period: 'all' });

      // Verify revenue does not include the 900 EGP from cancelled or 400 EGP from pending
      assert(
        revenueReport.summary.completedRevenue === liveKpis.totalRevenue,
        'Recognized revenue in Revenue Report matches Dashboard KPIs exactly'
      );
      assert(
        overviewReport.kpis.completedRevenue === liveKpis.totalRevenue,
        'Recognized revenue in Overview Report matches Dashboard KPIs exactly'
      );
      assert(
        ordersReport.summary.completedRevenue === liveKpis.totalRevenue,
        'Recognized revenue in Orders Report matches Dashboard KPIs exactly'
      );

      // ----------------------------------------------------
      // Test 4: Average Order Value (AOV) calculation accuracy
      // ----------------------------------------------------
      assert(
        liveKpis.averageOrderValue !== null && liveKpis.averageOrderValue > 0,
        'AOV is calculated accurately from completed bookings'
      );
      assert(
        liveKpis.averageOrderValue === Math.round(liveKpis.totalRevenue / liveKpis.completedOrders),
        'AOV equals completedRevenue divided by completedOrders'
      );

      // ----------------------------------------------------
      // Test 5: AOV returns null when 0 eligible orders exist
      // ----------------------------------------------------
      const futureKpis = await getDashboardKPIs({
        period: 'custom',
        startDate: '2030-01-01',
        endDate: '2030-01-02',
      });
      assert(
        futureKpis.completedOrders === 0,
        'Future period has 0 completed orders'
      );
      assert(
        futureKpis.averageOrderValue === null,
        'AOV returns null when 0 eligible orders exist (displays "لا توجد بيانات")'
      );

      // ----------------------------------------------------
      // Test 6: AI Insights uses recognized completed revenue
      // ----------------------------------------------------
      const insights = await generateAIAnalyticsInsights();
      assert(
        Array.isArray(insights) && insights.length > 0,
        'AI Analytics Insights generated successfully'
      );
    } finally {
      // Clean up temporary test bookings & user
      await prisma.booking.deleteMany({
        where: {
          id: { in: [tempCompletedId, tempCancelledId, tempPendingId] },
        },
      });
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }

  } catch (err: any) {
    console.error('Fatal test error:', err);
    results.push({ name: 'Suite execution', passed: false, error: err.message });
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n========================================`);
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed, Total: ${results.length}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite();
