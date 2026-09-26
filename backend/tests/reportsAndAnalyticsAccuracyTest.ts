/**
 * Cleanzo Automated Test Suite: Complete Reports Center, Analytics & KPI Data Accuracy
 * Validates Single Source of Truth, Zero Data Mismatch, Financial Accounting, Period Filtering, and Live Freshness.
 */
import http from 'http';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { ENV } from '../src/config/env.js';
import { User } from '../src/models/User.js';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { Coupon } from '../src/models/Coupon.js';
import { CouponUsage } from '../src/models/CouponUsage.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { Role } from '../src/models/Role.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;

let adminReportsToken: string;
let adminViewerNoReportsToken: string;

let seededCustomerIds: string[] = [];
let seededBookingIds: string[] = [];

async function api(path: string, options: RequestInit = {}): Promise<{ status: number; body: any; headers: Headers }> {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, options);
  let body: any = null;
  const text = await res.text();
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  return { status: res.status, body, headers: res.headers };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ [PASS] ${message}`);
}

async function run() {
  console.log('\n🚀 Starting Cleanzo Reports, Analytics & KPI Accuracy Test Suite...\n');

  // 1. Connect Database & Start Server
  await connectDB();

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`✅ Test Server running at: ${baseUrl}\n`);
      resolve();
    });
  });

  try {
    // ----------------------------------------------------
    // Test Group 1: Setup Test Accounts & Roles
    // ----------------------------------------------------
    console.log('--- Test Group 1: Setup Roles & Test Admin Tokens ---');
    const roleReports = await Role.findOneAndUpdate(
      { id: 'role-reports-test' },
      {
        id: 'role-reports-test',
        name: 'Reports Manager',
        nameAr: 'مدير التقارير',
        permissions: {
          dashboard: 'view',
          reports: 'view',
          analytics: 'view',
          orders: 'edit',
          customers: 'view',
        },
      },
      { upsert: true, new: true }
    );

    const roleNoReports = await Role.findOneAndUpdate(
      { id: 'role-no-reports-test' },
      {
        id: 'role-no-reports-test',
        name: 'Restricted Staff',
        nameAr: 'موظف مقيد',
        permissions: {
          dashboard: 'view',
          reports: 'hidden',
          analytics: 'hidden',
        },
      },
      { upsert: true, new: true }
    );

    const adminWithReports = await AdminUser.findOneAndUpdate(
      { username: 'admin_reports_audit' },
      {
        username: 'admin_reports_audit',
        name: 'Audit Reports Admin',
        email: 'reports_audit@cleanzo.local',
        password: 'Password123!',
        role: 'manager',
        permissions: {
          reports: 'view',
          analytics: 'view',
          dashboard: 'view',
          orders: 'edit',
          customers: 'view',
        },
        status: 'active',
      },
      { upsert: true, new: true }
    );

    const adminWithoutReports = await AdminUser.findOneAndUpdate(
      { username: 'admin_no_reports_audit' },
      {
        username: 'admin_no_reports_audit',
        name: 'No Reports Admin',
        email: 'no_reports_audit@cleanzo.local',
        password: 'Password123!',
        role: 'manager',
        permissions: {
          reports: 'hidden',
          analytics: 'hidden',
          dashboard: 'view',
        },
        status: 'active',
      },
      { upsert: true, new: true }
    );


    adminReportsToken = generateAdminToken({
      id: adminWithReports._id.toString(),
      username: adminWithReports.username,
      role: 'reports_admin',
    });

    adminViewerNoReportsToken = generateAdminToken({
      id: adminWithoutReports._id.toString(),
      username: adminWithoutReports.username,
      role: 'staff',
    });

    assert(Boolean(adminReportsToken), 'Reports admin token issued successfully');
    assert(Boolean(adminViewerNoReportsToken), 'Restricted admin token issued successfully');


    // ----------------------------------------------------
    // Test Group 2: Seed Clean Controlled Data for Accuracy Testing
    // ----------------------------------------------------
    console.log('\n--- Test Group 2: Controlled Data Seeding ---');
    // Wipe test bookings & customers with unique prefix
    const testPrefix = `testacc-${Date.now()}`;

    // 1. Create 5 Customers
    const createdCustomers = await User.create([
      {
        name: `${testPrefix} Customer 1`,
        phone: `+20100${Date.now().toString().slice(-6)}1`,
        password: 'Password123!',
        status: 'active',
        addresses: [{ label: 'المنزل', governorate: 'القاهرة', city: 'المعادي', area: 'دجلة' }],
      },
      {
        name: `${testPrefix} Customer 2`,
        phone: `+20100${Date.now().toString().slice(-6)}2`,
        password: 'Password123!',
        status: 'active',
        addresses: [{ label: 'المنزل', governorate: 'الجيزة', city: 'الدقي', area: 'مصدق' }],
      },
      {
        name: `${testPrefix} Customer 3`,
        phone: `+20100${Date.now().toString().slice(-6)}3`,
        password: 'Password123!',
        status: 'active',
        addresses: [{ label: 'العمل', governorate: 'الإسكندرية', city: 'سموحة', area: 'فيكتوريا' }],
      },
      {
        name: `${testPrefix} Customer 4`,
        phone: `+20100${Date.now().toString().slice(-6)}4`,
        password: 'Password123!',
        status: 'active',
        addresses: [{ label: 'المنزل', governorate: 'القاهرة', city: 'التجمع', area: 'الياسمين' }],
      },
      {
        name: `${testPrefix} Customer 5`,
        phone: `+20100${Date.now().toString().slice(-6)}5`,
        password: 'Password123!',
        status: 'active',
        addresses: [{ label: 'المنزل', governorate: 'القاهرة', city: 'مدينة نصر', area: 'مكرم عبيد' }],
      },
    ]);
    seededCustomerIds = createdCustomers.map((c) => c._id.toString());
    assert(createdCustomers.length === 5, '5 Controlled test customers created in database');

    // 2. Create 10 Bookings with strictly known amounts:
    // 4 Completed: 200, 300, 400, 500 = 1,400 EGP total completed revenue!
    // 2 Cancelled: 250, 350 (Must NOT be in completed revenue)
    // 2 Pending: 150, 180
    // 2 Confirmed: 220, 280
    const todayStr = new Date().toISOString().split('T')[0];

    const bookingsToCreate = [
      // Completed 1
      {
        id: `CLN-${testPrefix}-101`,
        customerId: createdCustomers[0]._id,
        customerName: createdCustomers[0].name,
        customerPhone: createdCustomers[0].phone,
        serviceId: 'srv-steam-wash',
        serviceSnapshot: { id: 'srv-steam-wash', title: 'غسيل بخار VIP', titleEn: 'Steam Wash', category: 'car', image: 'img1', price: 200, duration: 45 },
        category: 'car',
        date: todayStr,
        time: '10:00 AM',
        timeSlotStart: '10:00',
        scheduledStart: '10:00',
        scheduledEnd: '11:00',
        address: createdCustomers[0].addresses[0],
        basePrice: 200,
        discount: 0,
        finalPrice: 200,
        status: 'completed',
      },
      // Completed 2
      {
        id: `CLN-${testPrefix}-102`,
        customerId: createdCustomers[1]._id,
        customerName: createdCustomers[1].name,
        customerPhone: createdCustomers[1].phone,
        serviceId: 'srv-home-deep',
        serviceSnapshot: { id: 'srv-home-deep', title: 'تنظيف منازل شامل', titleEn: 'Deep Clean', category: 'home', image: 'img2', price: 300, duration: 90 },
        category: 'home',
        date: todayStr,
        time: '11:00 AM',
        timeSlotStart: '11:00',
        scheduledStart: '11:00',
        scheduledEnd: '12:30',
        address: createdCustomers[1].addresses[0],
        basePrice: 300,
        discount: 0,
        finalPrice: 300,
        status: 'completed',
      },
      // Completed 3
      {
        id: `CLN-${testPrefix}-103`,
        customerId: createdCustomers[2]._id,
        customerName: createdCustomers[2].name,
        customerPhone: createdCustomers[2].phone,
        serviceId: 'srv-steam-wash',
        serviceSnapshot: { id: 'srv-steam-wash', title: 'غسيل بخار VIP', titleEn: 'Steam Wash', category: 'car', image: 'img1', price: 400, duration: 45 },
        category: 'car',
        date: todayStr,
        time: '01:00 PM',
        timeSlotStart: '13:00',
        scheduledStart: '13:00',
        scheduledEnd: '14:00',
        address: createdCustomers[2].addresses[0],
        basePrice: 400,
        discount: 0,
        finalPrice: 400,
        status: 'completed',
      },
      // Completed 4
      {
        id: `CLN-${testPrefix}-104`,
        customerId: createdCustomers[3]._id,
        customerName: createdCustomers[3].name,
        customerPhone: createdCustomers[3].phone,
        serviceId: 'srv-home-deep',
        serviceSnapshot: { id: 'srv-home-deep', title: 'تنظيف منازل شامل', titleEn: 'Deep Clean', category: 'home', image: 'img2', price: 550, duration: 90 },
        category: 'home',
        date: todayStr,
        time: '02:00 PM',
        timeSlotStart: '14:00',
        scheduledStart: '14:00',
        scheduledEnd: '15:30',
        address: createdCustomers[3].addresses[0],
        basePrice: 550,
        discount: 50,
        finalPrice: 500,
        promoCode: 'TESTCOUPON50',
        couponSnapshot: {
          couponId: 'coup-1',
          couponCode: 'TESTCOUPON50',
          discountType: 'fixed',
          discountValue: 50,
          discountAmount: 50,
          actualDiscountAmount: 50,
          originalPrice: 550,
          finalPrice: 500,
        },
        status: 'completed',
      },
      // Cancelled 1
      {
        id: `CLN-${testPrefix}-105`,
        customerId: createdCustomers[0]._id,
        customerName: createdCustomers[0].name,
        customerPhone: createdCustomers[0].phone,
        serviceId: 'srv-steam-wash',
        serviceSnapshot: { id: 'srv-steam-wash', title: 'غسيل بخار VIP', titleEn: 'Steam Wash', category: 'car', image: 'img1', price: 250, duration: 45 },
        category: 'car',
        date: todayStr,
        time: '03:00 PM',
        timeSlotStart: '15:00',
        scheduledStart: '15:00',
        scheduledEnd: '16:00',
        address: createdCustomers[0].addresses[0],
        basePrice: 250,
        discount: 0,
        finalPrice: 250,
        status: 'cancelled',
      },
      // Cancelled 2
      {
        id: `CLN-${testPrefix}-106`,
        customerId: createdCustomers[4]._id,
        customerName: createdCustomers[4].name,
        customerPhone: createdCustomers[4].phone,
        serviceId: 'srv-home-deep',
        serviceSnapshot: { id: 'srv-home-deep', title: 'تنظيف منازل شامل', titleEn: 'Deep Clean', category: 'home', image: 'img2', price: 350, duration: 90 },
        category: 'home',
        date: todayStr,
        time: '04:00 PM',
        timeSlotStart: '16:00',
        scheduledStart: '16:00',
        scheduledEnd: '17:30',
        address: createdCustomers[4].addresses[0],
        basePrice: 350,
        discount: 0,
        finalPrice: 350,
        status: 'cancelled',
      },
      // Pending 1
      {
        id: `CLN-${testPrefix}-107`,
        customerId: createdCustomers[1]._id,
        customerName: createdCustomers[1].name,
        customerPhone: createdCustomers[1].phone,
        serviceId: 'srv-steam-wash',
        serviceSnapshot: { id: 'srv-steam-wash', title: 'غسيل بخار VIP', titleEn: 'Steam Wash', category: 'car', image: 'img1', price: 150, duration: 45 },
        category: 'car',
        date: todayStr,
        time: '05:00 PM',
        timeSlotStart: '17:00',
        scheduledStart: '17:00',
        scheduledEnd: '18:00',
        address: createdCustomers[1].addresses[0],
        basePrice: 150,
        discount: 0,
        finalPrice: 150,
        status: 'pending',
      },
      // Pending 2
      {
        id: `CLN-${testPrefix}-108`,
        customerId: createdCustomers[2]._id,
        customerName: createdCustomers[2].name,
        customerPhone: createdCustomers[2].phone,
        serviceId: 'srv-home-deep',
        serviceSnapshot: { id: 'srv-home-deep', title: 'تنظيف منازل شامل', titleEn: 'Deep Clean', category: 'home', image: 'img2', price: 180, duration: 90 },
        category: 'home',
        date: todayStr,
        time: '06:00 PM',
        timeSlotStart: '18:00',
        scheduledStart: '18:00',
        scheduledEnd: '19:30',
        address: createdCustomers[2].addresses[0],
        basePrice: 180,
        discount: 0,
        finalPrice: 180,
        status: 'pending',
      },
      // Confirmed 1
      {
        id: `CLN-${testPrefix}-109`,
        customerId: createdCustomers[3]._id,
        customerName: createdCustomers[3].name,
        customerPhone: createdCustomers[3].phone,
        serviceId: 'srv-steam-wash',
        serviceSnapshot: { id: 'srv-steam-wash', title: 'غسيل بخار VIP', titleEn: 'Steam Wash', category: 'car', image: 'img1', price: 220, duration: 45 },
        category: 'car',
        date: todayStr,
        time: '07:00 PM',
        timeSlotStart: '19:00',
        scheduledStart: '19:00',
        scheduledEnd: '20:00',
        address: createdCustomers[3].addresses[0],
        basePrice: 220,
        discount: 0,
        finalPrice: 220,
        status: 'confirmed',
      },
      // Confirmed 2
      {
        id: `CLN-${testPrefix}-110`,
        customerId: createdCustomers[4]._id,
        customerName: createdCustomers[4].name,
        customerPhone: createdCustomers[4].phone,
        serviceId: 'srv-home-deep',
        serviceSnapshot: { id: 'srv-home-deep', title: 'تنظيف منازل شامل', titleEn: 'Deep Clean', category: 'home', image: 'img2', price: 280, duration: 90 },
        category: 'home',
        date: todayStr,
        time: '08:00 PM',
        timeSlotStart: '20:00',
        scheduledStart: '20:00',
        scheduledEnd: '21:30',
        address: createdCustomers[4].addresses[0],
        basePrice: 280,
        discount: 0,
        finalPrice: 280,
        status: 'confirmed',
      },
    ];

    // Capture baseline values before seeding
    const baselineReportsRes = await api('/api/reports/overview?period=today', {
      headers: { Authorization: `Bearer ${adminReportsToken}` },
    });
    const baselineOrders = baselineReportsRes.body?.data?.kpis?.totalOrders || 0;
    const baselineCompletedRev = baselineReportsRes.body?.data?.kpis?.completedRevenue || 0;

    const createdBookings = await Booking.create(bookingsToCreate);
    seededBookingIds = createdBookings.map((b) => b.id);
    assert(createdBookings.length === 10, '10 Controlled test bookings created in database');

    // ----------------------------------------------------
    // Test Group 3: Single Source of Truth & Zero Data Mismatch
    // ----------------------------------------------------
    console.log('\n--- Test Group 3: Single Source of Truth Across Endpoints ---');

    // Fetch from all 3 endpoint groups with period=today
    const [reportsOverviewRes, ordersReportRes, analyticsOverviewRes, dashboardKpisRes] = await Promise.all([
      api('/api/reports/overview?period=today', {
        headers: { Authorization: `Bearer ${adminReportsToken}` },
      }),
      api('/api/reports/orders?period=today', {
        headers: { Authorization: `Bearer ${adminReportsToken}` },
      }),
      api('/api/analytics?period=today', {
        headers: { Authorization: `Bearer ${adminReportsToken}` },
      }),
      api('/api/dashboard/kpis?period=today', {
        headers: { Authorization: `Bearer ${adminReportsToken}` },
      }),
    ]);

    assert(reportsOverviewRes.status === 200, 'GET /api/reports/overview returned HTTP 200');
    assert(ordersReportRes.status === 200, 'GET /api/reports/orders returned HTTP 200');
    assert(analyticsOverviewRes.status === 200, 'GET /api/analytics returned HTTP 200');
    assert(dashboardKpisRes.status === 200, 'GET /api/dashboard/kpis returned HTTP 200');

    const repTotalOrders = reportsOverviewRes.body.data.kpis.totalOrders;
    const ordReportTotal = ordersReportRes.body.data.summary.totalOrders;
    const analyticsTotal = analyticsOverviewRes.body.data.comparisons.orders.current;
    const dashKpiTotal = dashboardKpisRes.body.data.totalOrders;

    assert(
      repTotalOrders === baselineOrders + 10,
      `Total orders incremented by exactly 10 in database (Baseline: ${baselineOrders}, Current: ${repTotalOrders})`
    );

    assert(
      repTotalOrders === ordReportTotal &&
      ordReportTotal === analyticsTotal &&
      analyticsTotal === dashKpiTotal,
      `Zero mismatch in Total Orders count across all 4 endpoints (Reports=${repTotalOrders}, Orders=${ordReportTotal}, Analytics=${analyticsTotal}, Dashboard=${dashKpiTotal})`
    );

    // ----------------------------------------------------
    // Test Group 4: Financial Accounting Accuracy
    // ----------------------------------------------------
    console.log('\n--- Test Group 4: Financial Accounting Accuracy ---');

    const revenueReportRes = await api('/api/reports/revenue?period=today', {
      headers: { Authorization: `Bearer ${adminReportsToken}` },
    });
    assert(revenueReportRes.status === 200, 'GET /api/reports/revenue returned HTTP 200');

    const completedRevReports = reportsOverviewRes.body.data.kpis.completedRevenue;
    const completedRevRevenueTab = revenueReportRes.body.data.summary.completedRevenue;
    const completedRevAnalytics = analyticsOverviewRes.body.data.comparisons.revenue.current;
    const completedRevDashboard = dashboardKpisRes.body.data.totalRevenue;

    assert(
      completedRevReports === baselineCompletedRev + 1400,
      `Completed revenue strictly incremented by 1,400 EGP in reports overview (Baseline: ${baselineCompletedRev}, Received: ${completedRevReports})`
    );
    assert(
      completedRevRevenueTab === completedRevReports &&
      completedRevAnalytics === completedRevReports &&
      completedRevDashboard === completedRevReports,
      `Completed revenue is 100% identical across all 4 endpoints (Reports=${completedRevReports}, RevenueTab=${completedRevRevenueTab}, Analytics=${completedRevAnalytics}, Dashboard=${completedRevDashboard})`
    );

    // Verify cancelled orders (250 + 350 = 600) are NOT in completed revenue
    assert(
      completedRevReports !== baselineCompletedRev + 1400 + 600,
      'Cancelled orders are strictly excluded from completed revenue'
    );


    // ----------------------------------------------------
    // Test Group 5: Detailed Reports Endpoints
    // ----------------------------------------------------
    console.log('\n--- Test Group 5: Customers, Services, Areas, Coupons & Bookings Reports ---');

    const [custRes, servRes, areaRes, coupRes, bookRes] = await Promise.all([
      api('/api/reports/customers?period=today', {
        headers: { Authorization: `Bearer ${adminReportsToken}` },
      }),
      api('/api/reports/services?period=today', {
        headers: { Authorization: `Bearer ${adminReportsToken}` },
      }),
      api('/api/reports/areas?period=today', {
        headers: { Authorization: `Bearer ${adminReportsToken}` },
      }),
      api('/api/reports/coupons?period=today', {
        headers: { Authorization: `Bearer ${adminReportsToken}` },
      }),
      api('/api/reports/bookings?period=today', {
        headers: { Authorization: `Bearer ${adminReportsToken}` },
      }),
    ]);

    assert(custRes.status === 200, 'GET /api/reports/customers returned HTTP 200');
    assert(custRes.body.data.customersList.length >= 5, 'Customers list returns seeded customers');
    assert(custRes.body.data.customersByGovernorate.length > 0, 'Customers grouped by governorate returned');

    assert(servRes.status === 200, 'GET /api/reports/services returned HTTP 200');
    assert(servRes.body.data.allServices.length > 0, 'All services statistics returned');
    assert(servRes.body.data.mostRequested.length > 0, 'Most requested services calculated');

    assert(areaRes.status === 200, 'GET /api/reports/areas returned HTTP 200');
    assert(areaRes.body.data.areasList.length > 0, 'Areas report returned with orders per area');

    assert(coupRes.status === 200, 'GET /api/reports/coupons returned HTTP 200');
    assert(typeof coupRes.body.data.summary.totalCoupons === 'number', 'Coupons summary returned');

    assert(bookRes.status === 200, 'GET /api/reports/bookings returned HTTP 200');
    assert(bookRes.body.data.bookingsByDay.length === 7, 'Bookings by day of week returned 7 days');
    assert(bookRes.body.data.busySlots.length > 0, 'Peak busy slots identified');

    // ----------------------------------------------------
    // Test Group 6: Live Freshness & Mutation Sensitivity
    // ----------------------------------------------------
    console.log('\n--- Test Group 6: Live Freshness on Mutation ---');

    // Add a new completed order of 700 EGP
    const liveOrder = await Booking.create({
      id: `CLN-${testPrefix}-LIVE999`,
      customerId: createdCustomers[0]._id,
      customerName: createdCustomers[0].name,
      customerPhone: createdCustomers[0].phone,
      serviceId: 'srv-steam-wash',
      serviceSnapshot: { id: 'srv-steam-wash', title: 'غسيل بخار VIP', titleEn: 'Steam Wash', category: 'car', image: 'img1', price: 700, duration: 45 },
      category: 'car',
      date: todayStr,
      time: '09:00 PM',
      timeSlotStart: '21:00',
      scheduledStart: '21:00',
      scheduledEnd: '22:00',
      address: createdCustomers[0].addresses[0],
      basePrice: 700,
      discount: 0,
      finalPrice: 700,
      status: 'completed',
    });
    seededBookingIds.push(liveOrder.id);

    // Immediately re-query Dashboard KPIs
    const freshKpiRes = await api('/api/dashboard/kpis?period=today', {
      headers: { Authorization: `Bearer ${adminReportsToken}` },
    });

    assert(freshKpiRes.status === 200, 'Fresh Dashboard KPIs query succeeded');
    assert(
      freshKpiRes.body.data.totalOrders === repTotalOrders + 1,
      `Total orders immediately incremented by 1 (New total: ${freshKpiRes.body.data.totalOrders})`
    );
    assert(
      freshKpiRes.body.data.totalRevenue === completedRevReports + 700,
      `Total completed revenue immediately updated by +700 EGP (Expected: ${completedRevReports + 700}, Received: ${freshKpiRes.body.data.totalRevenue})`
    );

    const prevCancelled = reportsOverviewRes.body.data.kpis.cancelledOrders;

    // Cancel an existing pending booking and verify cancellation stats update
    await Booking.findOneAndUpdate(
      { id: `CLN-${testPrefix}-107` },
      { status: 'cancelled' }
    );

    const freshReportsRes = await api('/api/reports/overview?period=today', {
      headers: { Authorization: `Bearer ${adminReportsToken}` },
    });
    assert(
      freshReportsRes.body.data.kpis.cancelledOrders === prevCancelled + 1,
      `Cancelled count immediately updated in Reports overview (Previous: ${prevCancelled}, Now: ${freshReportsRes.body.data.kpis.cancelledOrders})`
    );


    // ----------------------------------------------------
    // Test Group 7: Permissions & Security Isolation
    // ----------------------------------------------------
    console.log('\n--- Test Group 7: RBAC Permission Enforcement ---');

    // Attempt to access reports with viewer token lacking reports.view
    const restrictedReportsRes = await api('/api/reports/overview', {
      headers: { Authorization: `Bearer ${adminViewerNoReportsToken}` },
    });
    assert(
      restrictedReportsRes.status === 403,
      `Admin without reports.view receives HTTP 403 Forbidden (Received: ${restrictedReportsRes.status})`
    );

    const restrictedOrdersReportRes = await api('/api/reports/orders', {
      headers: { Authorization: `Bearer ${adminViewerNoReportsToken}` },
    });
    assert(
      restrictedOrdersReportRes.status === 403,
      `Admin without reports.view receives HTTP 403 on /api/reports/orders (Received: ${restrictedOrdersReportRes.status})`
    );

    console.log('\n====================================================');
    console.log('🎉 ALL REPORTS & ANALYTICS TESTS PASSED WITH 100% SUCCESS!');
    console.log('====================================================\n');
  } finally {
    // Cleanup seeded test records
    console.log('🧹 Cleaning up test records...');
    if (seededCustomerIds.length > 0) {
      await User.deleteMany({ _id: { $in: seededCustomerIds } });
    }
    if (seededBookingIds.length > 0) {
      await Booking.deleteMany({ id: { $in: seededBookingIds } });
    }
    await Role.deleteMany({ id: { $in: ['role-reports-test', 'role-no-reports-test'] } });
    await AdminUser.deleteMany({ username: { $in: ['admin_reports_audit', 'admin_no_reports_audit'] } });

    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

run().catch((err) => {
  console.error('\n❌ Test suite failed with error:', err);
  process.exit(1);
});
