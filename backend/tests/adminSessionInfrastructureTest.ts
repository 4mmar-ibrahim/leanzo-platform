/**
 * Cleanzo Admin Session & Authentication Infrastructure Comprehensive Test Suite
 * Validates:
 * 1. Admin login & token generation (Bearer header + Cookie).
 * 2. Token expiration handling (401 TOKEN_EXPIRED).
 * 3. Self-healing token refresh & session continuity.
 * 4. Save/Create/Update mutations across all major admin sections (Coupons, Services, Offers, Locations, Technicians, Settings, CMS).
 * 5. Token isolation (Customer token blocked from admin endpoints, Admin token granted staff view on customer endpoints).
 * 6. RBAC separation (view-only blocked from mutations with 403, edit allowed).
 */

import jwt from 'jsonwebtoken';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { Role } from '../src/models/Role.js';
import { Coupon } from '../src/models/Coupon.js';
import { Service } from '../src/models/Service.js';
import { Offer } from '../src/models/Offer.js';
import { Technician } from '../src/models/Technician.js';
import { Booking } from '../src/models/Booking.js';
import { User } from '../src/models/User.js';
import { ENV } from '../src/config/env.js';
import { generateAdminToken, generateCustomerToken } from '../src/utils/jwt.js';

let server: any;
let baseUrl: string;

async function request(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
  const { method = 'GET', headers = {}, body } = options;
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const json = await res.json().catch(() => null);
  const cookieHeader = res.headers.get('set-cookie');
  return { status: res.status, ok: res.ok, body: json, cookie: cookieHeader };
}

async function runTests() {
  console.log('🚀 Starting Cleanzo Admin Session & Auth Infrastructure Test Suite...\n');

  // 1. Connect to Database
  await connectDB();

  // 2. Start Test Server on free port
  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log('✅ Test Server listening on:', baseUrl);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, details?: any) {
    if (condition) {
      console.log(`  ✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${desc}`, details ? details : '');
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Test Group 1: Setup Admin Users & Customer for Testing
    // -------------------------------------------------------------
    console.log('\n--- Test Group 1: User & Role Setup ---');

    await AdminUser.deleteMany({ username: { $in: ['test.owner', 'test.viewer', 'test.editor'] } });
    await User.deleteMany({ phone: '01009998877' });

    const ownerAdmin = await AdminUser.create({
      name: 'مالك الاختبار',
      username: 'test.owner',
      email: 'owner.test@cleanzo.app',
      password: 'password123',
      role: 'owner',
      status: 'active',
    });

    const viewerAdmin = await AdminUser.create({
      name: 'مشرف عرض فقط',
      username: 'test.viewer',
      email: 'viewer.test@cleanzo.app',
      password: 'password123',
      role: 'admin',
      permissions: {
        services: 'view',
        coupons: 'view',
        offers: 'view',
        locations: 'view',
        technicians: 'view',
      },
      status: 'active',
    });

    const editorAdmin = await AdminUser.create({
      name: 'مشرف تعديل',
      username: 'test.editor',
      email: 'editor.test@cleanzo.app',
      password: 'password123',
      role: 'admin',
      permissions: {
        services: 'edit',
        coupons: 'edit',
        offers: 'edit',
        locations: 'edit',
        technicians: 'edit',
      },
      status: 'active',
    });

    const customerUser = await User.create({
      name: 'عميل اختبار',
      phone: '01009998877',
      password: 'password123',
      status: 'active',
    });

    assert(!!ownerAdmin && !!viewerAdmin && !!editorAdmin, 'Test admin accounts created successfully');

    // -------------------------------------------------------------
    // Test Group 2: Login & Cookie Generation
    // -------------------------------------------------------------
    console.log('\n--- Test Group 2: Admin Login & Session Cookie ---');

    const loginRes = await request('/api/auth/admin/login', {
      method: 'POST',
      body: { username: 'test.owner', password: 'password123' },
    });

    assert(loginRes.status === 200, 'Admin login succeeds with 200');
    assert(!!loginRes.body?.data?.token, 'Admin login returns valid JWT token');
    assert(loginRes.body?.data?.admin?.username === 'test.owner', 'Admin login returns correct admin object');
    assert(!!loginRes.cookie && loginRes.cookie.includes('cleanzo_admin_token='), 'Admin login sets cleanzo_admin_token cookie in headers');

    const validOwnerToken = loginRes.body.data.token;

    // -------------------------------------------------------------
    // Test Group 3: Token Expiration & Seamless Auto-Refresh
    // -------------------------------------------------------------
    console.log('\n--- Test Group 3: Token Expiration & Refresh Mechanism ---');

    // Create an intentionally expired token
    const expiredToken = jwt.sign(
      { id: ownerAdmin._id.toString(), username: ownerAdmin.username, role: ownerAdmin.role, type: 'admin' },
      ENV.ADMIN_JWT_SECRET,
      { expiresIn: '-10s' }
    );

    // Call protected endpoint with expired token
    const expiredReq = await request('/api/settings/admin', {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    assert(expiredReq.status === 401, 'Expired token receives HTTP 401');
    assert(expiredReq.body?.code === 'TOKEN_EXPIRED', 'Expired token response contains code TOKEN_EXPIRED');
    assert(expiredReq.body?.message === 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً', 'Expired token response contains accurate session expiration message');

    // Refresh token using expired token
    const refreshRes = await request('/api/auth/admin/refresh', {
      method: 'POST',
      headers: { Authorization: `Bearer ${expiredToken}` },
    });

    assert(refreshRes.status === 200, 'Token refresh succeeds with 200 using expired token');
    assert(!!refreshRes.body?.data?.token, 'Token refresh returns new fresh token');
    assert(refreshRes.body?.data?.token !== expiredToken, 'Fresh token is distinct from expired token');
    assert(!!refreshRes.cookie && refreshRes.cookie.includes('cleanzo_admin_token='), 'Token refresh sets updated cookie');

    const renewedToken = refreshRes.body.data.token;

    // Verify renewed token can perform protected admin operations
    const renewedReq = await request('/api/settings/admin', {
      headers: { Authorization: `Bearer ${renewedToken}` },
    });
    assert(renewedReq.status === 200, 'Protected admin operation succeeds with renewed token');

    // -------------------------------------------------------------
    // Test Group 4: Save / Mutation Operations Across Admin Sections
    // -------------------------------------------------------------
    console.log('\n--- Test Group 4: Save / Mutation Across Multiple Admin Sections ---');

    // 1. Coupons Save / Create / Update
    const testCouponCode = `TEST${Date.now()}`;
    const createCouponRes = await request('/api/admin/coupons', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: {
        code: testCouponCode,
        discountType: 'percentage',
        discountValue: 15,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        totalUsageLimit: 100,
        perCustomerLimit: 2,
        status: 'active',
      },
    });

    assert(createCouponRes.status === 201, 'Coupons: Create coupon succeeds with 201', createCouponRes.body);
    const couponId = createCouponRes.body?.data?.id;

    const updateCouponRes = await request(`/api/admin/coupons/${couponId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: { discountValue: 20 },
    });
    assert(updateCouponRes.status === 200, 'Coupons: Update coupon succeeds with 200');

    // 2. Services Save / Create / Update
    const createServiceRes = await request('/api/services/admin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: {
        title: 'خدمة اختبار الجلسة',
        titleEn: 'Session Test Service',
        category: 'car',
        basePrice: 150,
        duration: 45,
        shortDescription: 'وصف قصير',
        features: ['ميزة 1', 'ميزة 2'],
      },
    });
    assert(createServiceRes.status === 201, 'Services: Create service succeeds with 201', createServiceRes.body);
    const serviceId = createServiceRes.body?.data?.id || createServiceRes.body?.data?._id;

    const updateServiceRes = await request(`/api/services/admin/${serviceId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: { basePrice: 175 },
    });
    assert(updateServiceRes.status === 200, 'Services: Update service succeeds with 200');

    // 3. Offers Save / Create / Update
    const createOfferRes = await request('/api/offers/admin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: {
        title: 'عرض باقة الاختبار',
        titleEn: 'Test Offer Package',
        category: 'car',
        badge: 'عرض خاص',
        promoCode: `OFFER${Date.now()}`,
        discountValue: 25,
        originalPrice: 200,
        finalPrice: 150,
        startDate: '2026-01-01',
        endDate: '2026-12-31',
        status: 'active',
      },
    });
    assert(createOfferRes.status === 201, 'Offers: Create offer succeeds with 201', createOfferRes.body);
    const offerId = createOfferRes.body?.data?.id || createOfferRes.body?.data?._id;

    const updateOfferRes = await request(`/api/offers/admin/${offerId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: { finalPrice: 140 },
    });
    assert(updateOfferRes.status === 200, 'Offers: Update offer succeeds with 200');

    // 4. Locations Save / Create
    const createGovRes = await request('/api/locations/admin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: {
        id: `gov-${Date.now()}`,
        name: 'محافظة تجريبية',
        nameEn: 'Test Governorate',
        order: 99,
      },
    });
    assert(createGovRes.status === 201, 'Locations: Create governorate succeeds with 201', createGovRes.body);
    const govId = createGovRes.body?.data?.id;

    const addCityRes = await request(`/api/locations/admin/${govId}/cities`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: {
        cityId: `city-${Date.now()}`,
        name: 'مدينة تجريبية',
        nameEn: 'Test City',
        order: 1,
      },
    });
    assert(addCityRes.status === 201, 'Locations: Add city to governorate succeeds with 201');

    // 5. Technicians Save / Create
    const createTechRes = await request('/api/technicians', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: {
        name: 'فني اختبار المنظومة',
        phone: '01011112222',
        specialties: ['car'],
        rating: 4.8,
        active: true,
      },
    });
    assert(createTechRes.status === 201, 'Technicians: Create technician succeeds with 201', createTechRes.body);

    // 6. System Settings Save / Update
    const updateSettingsRes = await request('/api/settings/admin', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: {
        general: {
          siteName: 'كلينزو مصر',
          supportPhone: '01000000000',
        },
      },
    });
    assert(updateSettingsRes.status === 200, 'Settings: Update system settings succeeds with 200');

    // 7. CMS Content Save Draft & Publish
    const updateCmsRes = await request('/api/content/admin/draft', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
      body: {
        hero: { title: 'نظافة فائقة لسيارتك ومنزلك' },
      },
    });
    assert(updateCmsRes.status === 200, 'CMS: Update draft content succeeds with 200');

    const publishCmsRes = await request('/api/content/admin/publish', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validOwnerToken}` },
    });
    assert(publishCmsRes.status === 200, 'CMS: Publish content succeeds with 200');

    // -------------------------------------------------------------
    // Test Group 5: Token Isolation & Cross-Role Safety
    // -------------------------------------------------------------
    console.log('\n--- Test Group 5: Token Isolation & Cross-Role Safety ---');

    const customerToken = generateCustomerToken({
      id: customerUser._id.toString(),
      phone: customerUser.phone,
    });

    // 1. Customer token attempting Admin Save operation -> MUST BE 401
    const custOnAdminRes = await request('/api/admin/coupons', {
      method: 'POST',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: { code: 'HACK', discountType: 'fixed', discountValue: 50 },
    });
    assert(custOnAdminRes.status === 401, 'Customer token cannot access admin routes (HTTP 401)');
    assert(custOnAdminRes.body?.code === 'INVALID_ADMIN_TOKEN' || custOnAdminRes.body?.code === 'ADMIN_UNAUTHORIZED', 'Customer token rejected with admin unauthorized error');

    // 2. Admin viewing customer booking via staff view
    // Create a test booking
    const bookingCode = `CLN-TEST-${Date.now()}`;
    const safeServiceId = serviceId || `srv-${Date.now()}`;
    const testBooking = await Booking.create({
      id: bookingCode,
      bookingNumber: bookingCode,
      customerId: customerUser._id,
      customerName: customerUser.name,
      customerPhone: customerUser.phone,
      serviceId: safeServiceId,
      serviceSnapshot: {
        id: safeServiceId,
        title: 'خدمة تجريبية',
        titleEn: 'Test Service',
        category: 'car',
        image: 'https://cleanzo.app/test.jpg',
        price: 150,
        duration: 45,
      },
      category: 'car',
      date: '2026-05-15',
      time: '10:00 AM',
      timeSlotStart: '10:00',
      scheduledStart: '10:00',
      scheduledEnd: '10:45',
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 15,
      totalOccupiedMinutes: 60,
      basePrice: 150,
      totalPrice: 150,
      finalPrice: 150,
      status: 'pending',
      address: {
        governorate: 'القاهرة',
        city: 'المعادي',
        area: 'المعادي دجلة',
      },
    });

    // Admin requesting booking via customer route /api/bookings/:id
    const staffBookingRes = await request(`/api/bookings/${testBooking._id}`, {
      headers: { Authorization: `Bearer ${validOwnerToken}` },
    });
    assert(staffBookingRes.status === 200, 'Admin token accessing booking endpoint is recognized as staff (HTTP 200 without session error)');

    // -------------------------------------------------------------
    // Test Group 6: RBAC Separation (Authentication vs Authorization)
    // -------------------------------------------------------------
    console.log('\n--- Test Group 6: RBAC Separation (AuthN vs AuthZ) ---');

    const viewerToken = generateAdminToken({
      id: viewerAdmin._id.toString(),
      username: viewerAdmin.username,
      role: viewerAdmin.role,
    });

    const editorToken = generateAdminToken({
      id: editorAdmin._id.toString(),
      username: editorAdmin.username,
      role: editorAdmin.role,
    });

    // 1. Viewer Admin can VIEW services
    const viewerGetServices = await request('/api/services/admin/all', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    });
    assert(viewerGetServices.status === 200, 'Viewer admin can view services (HTTP 200)');

    // 2. Viewer Admin CANNOT mutate / create services (Must receive 403, NOT 401)
    const viewerCreateService = await request('/api/services/admin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${viewerToken}` },
      body: { title: 'محاولة غير مصرحة', category: 'car', basePrice: 100 },
    });
    assert(viewerCreateService.status === 403, 'Viewer admin receives HTTP 403 Forbidden on mutation (Separate from AuthN 401)');
    assert(viewerCreateService.body?.code === 'ACCESS_DENIED_VIEW_ONLY', 'Error code clearly denotes view-only privilege restriction');

    // 3. Editor Admin CAN mutate / create services
    const editorCreateService = await request('/api/services/admin', {
      method: 'POST',
      headers: { Authorization: `Bearer ${editorToken}` },
      body: {
        title: 'خدمة المحرر المصرحة',
        titleEn: 'Editor Authorized Service',
        category: 'home',
        basePrice: 220,
        duration: 60,
        shortDescription: 'وصف',
      },
    });
    assert(editorCreateService.status === 201, 'Editor admin successfully creates service (HTTP 201)');

    // Clean up test records
    await AdminUser.deleteMany({ username: { $in: ['test.owner', 'test.viewer', 'test.editor'] } });
    await User.deleteMany({ phone: '01009998877' });
    await Booking.deleteOne({ _id: testBooking._id });
    if (serviceId) await Service.deleteOne({ id: serviceId });
    if (offerId) await Offer.deleteOne({ id: offerId });
    await Coupon.deleteOne({ code: testCouponCode });

  } catch (err) {
    console.error('Test suite error:', err);
    failed++;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
    console.log('\n=======================================');
    console.log(`Test Results: ${passed} PASSED, ${failed} FAILED`);
    console.log('=======================================\n');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runTests();
