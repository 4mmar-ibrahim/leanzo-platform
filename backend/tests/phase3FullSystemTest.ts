import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { User } from '../src/models/User.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { Service } from '../src/models/Service.js';
import { Booking } from '../src/models/Booking.js';
import { Offer } from '../src/models/Offer.js';
import { ZoPageConfig } from '../src/models/ZoPageConfig.js';
import { Role } from '../src/models/Role.js';
import { FAQ } from '../src/models/FAQ.js';
import { PortfolioItem } from '../src/models/PortfolioItem.js';
import { ContactMessage } from '../src/models/ContactMessage.js';
import { Technician } from '../src/models/Technician.js';

let server: http.Server;
let baseUrl: string;

let customerAToken = '';
let customerAId = '';
const customerAPhone = '01011223344';

let customerBToken = '';
let customerBId = '';
const customerBPhone = '01055667788';

let adminToken = '';
let technicianToken = '';

let testServiceId = 'car-vip-detailing-test';
let testBookingId = '';

let passedCount = 0;
let failedCount = 0;

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
          let parsed = {};
          try {
            parsed = JSON.parse(rawData);
          } catch {
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

function assert(condition: boolean, message: string) {
  if (!condition) {
    failedCount++;
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Test assertion failed: ${message}`);
  } else {
    passedCount++;
    console.log(`  ✓ ${message}`);
  }
}

async function runPhase3SystemTests() {
  console.log('================================================================');
  console.log('🚀 CLEANZO — PHASE 3: COMPLETE END-TO-END SYSTEM TEST HARNESS');
  console.log('================================================================');

  await connectDB();

  // Clean test collections before execution
  await Promise.all([
    User.deleteMany({}),
    AdminUser.deleteMany({}),
    Service.deleteMany({}),
    Booking.deleteMany({}),
    Offer.deleteMany({}),
    ZoPageConfig.deleteMany({}),
    Role.deleteMany({}),
    Technician.deleteMany({}),
    FAQ.deleteMany({}),
    PortfolioItem.deleteMany({}),
    ContactMessage.deleteMany({}),
  ]);

  server = app.listen(0);
  const port = (server.address() as any).port;
  baseUrl = `http://localhost:${port}`;
  console.log(`[Test Server] Running live at ${baseUrl}`);

  try {
    // =========================================================================
    // SECTION 1: Health & Environment Check
    // =========================================================================
    console.log('\n📋 [1/12] Health & Environment Endpoint Check:');
    const healthRes = await makeRequest('GET', '/api/health');
    assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
    assert(healthRes.body.status === 'ok', 'Health status is "ok"');
    assert(healthRes.body.service === 'Cleanzo Backend API', 'Service identifier is Cleanzo Backend API');

    // =========================================================================
    // SECTION 2: Customer Registration & Negative Tests
    // =========================================================================
    console.log('\n📋 [2/12] Customer Registration & Validation Suite:');
    
    // Valid registration
    const regRes = await makeRequest('POST', '/api/auth/customer/register', {
      name: 'أحمد محمود',
      phone: customerAPhone,
      password: 'SecurePassword123!',
    });
    assert(regRes.status === 201, 'Valid registration returns 201 Created');
    assert(Boolean(regRes.body.data?.token), 'Registration returns valid JWT token');
    customerAToken = regRes.body.data.token;
    customerAId = regRes.body.data.user?.id || regRes.body.data.user?._id;

    // Database password hashing verification
    const dbCustomer = await User.findById(customerAId);
    assert(Boolean(dbCustomer), 'Customer exists in database');
    assert(dbCustomer!.password !== 'SecurePassword123!', 'Password is cryptographically hashed, not plaintext');
    assert(dbCustomer!.password?.startsWith('$2') === true, 'Password uses bcrypt hashing');

    // Negative: Duplicate phone
    const dupRes = await makeRequest('POST', '/api/auth/customer/register', {
      name: 'مستخدم مكرر',
      phone: customerAPhone,
      password: 'AnotherPassword123!',
    });
    assert(dupRes.status === 409, 'Duplicate phone number registration returns 409 Conflict');

    // Negative: Missing required fields
    const missingRes = await makeRequest('POST', '/api/auth/customer/register', {
      name: 'بدون هاتف',
      password: 'ValidPassword123!',
    });
    assert(missingRes.status === 422 || missingRes.status === 400, 'Missing fields returns 422/400 Validation Error');

    // Register Customer B for IDOR testing
    const regB = await makeRequest('POST', '/api/auth/customer/register', {
      name: 'سارة خالد',
      phone: customerBPhone,
      password: 'SecurePasswordB456!',
    });
    assert(regB.status === 201, 'Customer B registered successfully');
    customerBToken = regB.body.data.token;
    customerBId = regB.body.data.user?.id || regB.body.data.user?._id;

    // =========================================================================
    // SECTION 3: Customer Login & Persistence Verification
    // =========================================================================
    console.log('\n📋 [3/12] Customer Authentication & Session Suite:');

    // Valid login
    const loginRes = await makeRequest('POST', '/api/auth/customer/login', {
      phone: customerAPhone,
      password: 'SecurePassword123!',
    });
    assert(loginRes.status === 200, 'Valid login returns 200 OK');
    assert(Boolean(loginRes.body.data?.token), 'Login returns refreshed JWT token');
    customerAToken = loginRes.body.data.token;

    // Negative: Wrong password
    const wrongPassRes = await makeRequest('POST', '/api/auth/customer/login', {
      phone: customerAPhone,
      password: 'WrongPassword999!',
    });
    assert(wrongPassRes.status === 401, 'Incorrect password returns 401 Unauthorized');

    // Negative: Unknown phone
    const unknownPhoneRes = await makeRequest('POST', '/api/auth/customer/login', {
      phone: '01000000000',
      password: 'SomePassword123!',
    });
    assert(unknownPhoneRes.status === 401, 'Unknown phone returns 401 Unauthorized');

    // Token verification via profile fetch
    const profileRes = await makeRequest('GET', '/api/auth/customer/profile', undefined, customerAToken);
    assert(profileRes.status === 200, 'Token authenticated profile request returns 200 OK');
    assert(profileRes.body.data?.phone === customerAPhone, 'Profile phone strictly matches authenticated customer');

    // =========================================================================
    // SECTION 4: Customer Profile & Address Management
    // =========================================================================
    console.log('\n📋 [4/12] Customer Profile & Address Suite:');

    // Update profile name
    const updateProfRes = await makeRequest(
      'PUT',
      '/api/auth/customer/profile',
      { name: 'أحمد محمود المعدل' },
      customerAToken
    );
    assert(updateProfRes.status === 200, 'Profile update returns 200 OK');
    assert(updateProfRes.body.data?.name === 'أحمد محمود المعدل', 'Customer name updated in response');

    // Add address
    const addAddrRes = await makeRequest(
      'POST',
      '/api/auth/customer/addresses',
      {
        label: 'المنزل الرئيسي',
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        area: 'عباس العقاد',
        building: 'عمارة 15',
        floor: 'الدور الرابع',
        apartment: 'شقة 12',
        isDefault: true,
      },
      customerAToken
    );
    assert(addAddrRes.status === 201, 'Add customer address returns 201 Created');
    assert(Array.isArray(addAddrRes.body.data) && addAddrRes.body.data.length > 0, 'Address saved to customer account');

    // =========================================================================
    // SECTION 5: Admin & Technician Authentication Setup
    // =========================================================================
    console.log('\n📋 [5/12] Admin & Technician Authentication Suite:');

    await Role.create({
      id: 'owner',
      name: 'Owner',
      nameAr: 'المالك',
      permissions: {},
    });
    await Role.create({
      id: 'technician',
      name: 'Technician',
      nameAr: 'فني',
      permissions: { orders: ['view', 'edit'] },
    });

    await AdminUser.create({
      name: 'مدير النظام الرئيسي',
      username: 'superadmin',
      email: 'admin@cleanzo.com',
      password: 'adminPassword123',
      role: 'owner',
      status: 'active',
    });

    await AdminUser.create({
      name: 'فني الاختبار',
      username: 'tech_test',
      email: 'tech@cleanzo.com',
      password: 'techPassword123',
      role: 'technician',
      status: 'active',
    });

    await Technician.create({
      id: 'tech_test',
      name: 'فني الاختبار',
      phone: '01003334444',
      specialty: 'غسيل وتلميع سيارات',
      status: 'available',
      active: true,
    });

    // Login as Admin
    const adminLoginRes = await makeRequest('POST', '/api/auth/admin/login', {
      username: 'superadmin',
      password: 'adminPassword123',
    });
    assert(adminLoginRes.status === 200, 'Admin login returns 200 OK');
    adminToken = adminLoginRes.body.data.token;

    // Login as Technician
    const techLoginRes = await makeRequest('POST', '/api/auth/admin/login', {
      username: 'tech_test',
      password: 'techPassword123',
    });
    assert(techLoginRes.status === 200, 'Technician login returns 200 OK');
    technicianToken = techLoginRes.body.data.token;

    // =========================================================================
    // SECTION 6: Services Catalog & Admin CRUD
    // =========================================================================
    console.log('\n📋 [6/12] Services Management & Public Visibility Suite:');

    // Admin creates a service
    const createSvcRes = await makeRequest(
      'POST',
      '/api/services/admin',
      {
        id: testServiceId,
        category: 'car',
        title: 'غسيل وتفصيل سيارات VIP متكامل',
        titleEn: 'Complete VIP Car Detailing',
        description: 'تنظيف عميق بالبخار وحماية نانو سيراميك وتلميع شامل',
        descriptionEn: 'Deep steam cleaning, nano-ceramic coating, and interior detailing',
        price: 300,
        duration: 60,
        image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=600&q=80',
        available: true,
      },
      adminToken
    );
    assert(createSvcRes.status === 201, 'Admin service creation returns 201 Created');

    // Customer views public services
    const pubSvcRes = await makeRequest('GET', '/api/services');
    assert(pubSvcRes.status === 200, 'Public services endpoint returns 200 OK');
    const matchedSvc = pubSvcRes.body.data.find((s: any) => s.id === testServiceId);
    assert(Boolean(matchedSvc), 'Created service is visible in public catalog');
    assert(matchedSvc.price === 300, 'Catalog price matches database authoritative price (300 EGP)');

    // Inactive service visibility test
    const inactiveSvcRes = await makeRequest(
      'POST',
      '/api/services/admin',
      {
        id: 'car-inactive-draft-svc',
        category: 'home',
        title: 'خدمة معطلة مؤقتاً',
        titleEn: 'Disabled Service',
        image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80',
        price: 150,
        duration: 45,
        available: false,
      },
      adminToken
    );
    assert(inactiveSvcRes.status === 201, 'Inactive service created by admin');
    const pubAfterRes = await makeRequest('GET', '/api/services');
    const foundInactive = pubAfterRes.body.data.some((s: any) => s.id === 'car-inactive-draft-svc');
    assert(!foundInactive, 'Inactive service is strictly hidden from public customers');

    // =========================================================================
    // SECTION 7: Offers & Server-Side Promo Calculations
    // =========================================================================
    console.log('\n📋 [7/12] Offers & Authoritative Discount Calculation Suite:');

    // Create promo code
    await makeRequest(
      'POST',
      '/api/offers/admin',
      {
        id: 'clean-promo-20',
        code: 'CLEAN20',
        title: 'خصم 20% بمناسبة الافتتاح',
        titleEn: '20% Grand Opening Discount',
        discountPercentage: 20,
        expiresAt: '2028-12-31',
        image: 'https://example.com/offer.jpg',
        active: true,
      },
      adminToken
    );

    // Validate valid promo code
    const validPromoRes = await makeRequest('POST', '/api/offers/validate', {
      code: 'CLEAN20',
    });
    assert(validPromoRes.status === 200, 'Promo code validation returns 200 OK');
    assert(validPromoRes.body.data?.discountPercentage === 20, 'Returns correct 20% discount percentage');

    // Validate invalid promo code
    const invalidPromoRes = await makeRequest('POST', '/api/offers/validate', {
      code: 'FAKECODE99',
    });
    assert(invalidPromoRes.status === 404, 'Non-existent promo code returns 404 Not Found');

    // =========================================================================
    // SECTION 8: Availability Engine & Overlap Conflict Prevention
    // =========================================================================
    console.log('\n📋 [8/12] Availability Engine & Overlap Conflict Suite:');

    const testDate = '2026-11-25';
    const availRes = await makeRequest(
      'GET',
      `/api/availability?date=${testDate}&duration=60`
    );
    assert(availRes.status === 200, 'Availability check returns 200 OK');
    assert(availRes.body.data?.isDayAvailable === true, 'Future working day is available');

    // =========================================================================
    // SECTION 9: Booking Creation, Price Integrity & Double-Submit Protection
    // =========================================================================
    console.log('\n📋 [9/12] Booking Creation, Tamper Proofing & Conflict Rejection:');

    // Price Manipulation Attempt: Client tries to pay 1 EGP instead of 300 EGP!
    const bookingPayload = {
      serviceId: testServiceId,
      date: testDate,
      time: '10:00 AM',
      promoCode: 'CLEAN20',
      // Client tampering attempt:
      price: 1.0,
      discount: 999.0,
      finalPrice: 0.01,
      address: {
        governorate: 'القاهرة',
        city: 'مدينة نصر',
        area: 'عباس العقاد',
      },
      notes: 'يرجى التركيز على التلميع الداخلي',
    };

    const bookingRes = await makeRequest('POST', '/api/bookings', bookingPayload, customerAToken);
    assert(bookingRes.status === 201, 'Booking created successfully with 201 Created');
    assert(Boolean(bookingRes.body.data?.id), 'Booking assigned human-readable order ID');
    assert(bookingRes.body.data.id.startsWith('CLN-'), 'Booking number matches CLN-YYYY-XXXXXX format');
    
    testBookingId = bookingRes.body.data.id;

    // Verify backend REJECTED client-side price tampering and calculated trusted price:
    assert(
      bookingRes.body.data.basePrice === 300,
      'SECURITY: Backend strictly ignored client price (1.0) and used DB service price (300.0 EGP)'
    );
    assert(
      bookingRes.body.data.discount === 60,
      'SECURITY: Backend calculated authoritative discount (20% of 300 = 60 EGP)'
    );
    assert(
      bookingRes.body.data.finalPrice === 240,
      'SECURITY: Backend calculated authoritative finalPrice (300 - 60 = 240 EGP)'
    );

    // Test Conflict Prevention: Attempting to book overlapping time 10:30 AM on same date
    const conflictRes = await makeRequest(
      'POST',
      '/api/bookings',
      {
        ...bookingPayload,
        time: '10:30 AM',
      },
      customerAToken
    );
    assert(conflictRes.status === 409, 'Overlapping booking at 10:30 AM is strictly rejected with 409 Conflict');

    // Test Non-conflicting time: 01:00 PM succeeds
    const nonConflictRes = await makeRequest(
      'POST',
      '/api/bookings',
      {
        ...bookingPayload,
        time: '01:00 PM',
      },
      customerAToken
    );
    assert(nonConflictRes.status === 201, 'Non-conflicting booking at 01:00 PM succeeds with 201 Created');

    // =========================================================================
    // SECTION 10: IDOR Security & Customer Isolation Suite
    // =========================================================================
    console.log('\n📋 [10/12] IDOR Security & Cross-Customer Isolation Suite:');

    // Customer B tries to view Customer A's booking by ID
    const idorReadRes = await makeRequest(
      'GET',
      `/api/bookings/${testBookingId}`,
      undefined,
      customerBToken
    );
    assert(
      idorReadRes.status === 403 || idorReadRes.status === 404,
      'IDOR PROTECTION: Customer B cannot view Customer A booking (returns 403/404)'
    );

    // Customer B tries to cancel Customer A's booking
    const idorCancelRes = await makeRequest(
      'PUT',
      `/api/bookings/${testBookingId}/cancel`,
      { reason: 'محاولة إلغاء غير مصرح بها' },
      customerBToken
    );
    assert(
      idorCancelRes.status === 403 || idorCancelRes.status === 404,
      'IDOR PROTECTION: Customer B cannot cancel Customer A booking (returns 403/404)'
    );

    // Technician tries to access Super Admin users endpoint
    const techUnauthRes = await makeRequest(
      'GET',
      '/api/auth/admin/users',
      undefined,
      technicianToken
    );
    assert(
      techUnauthRes.status === 401 || techUnauthRes.status === 403,
      'AUTHORIZATION: Technician is forbidden from accessing Admin Users management (401/403)'
    );

    // =========================================================================
    // SECTION 11: Booking Lifecycle & Technician Progression Suite
    // =========================================================================
    console.log('\n📋 [11/12] Booking Lifecycle & Technician Progression Suite:');

    // Admin confirms booking
    const confirmRes = await makeRequest(
      'PUT',
      `/api/bookings/admin/${testBookingId}/status`,
      { status: 'confirmed', note: 'تم تأكيد الحجز بواسطة الإدارة' },
      adminToken
    );
    assert(confirmRes.status === 200, 'Admin can confirm booking (status -> confirmed)');

    // Admin assigns technician
    const assignRes = await makeRequest(
      'PUT',
      `/api/bookings/admin/${testBookingId}/assign`,
      { technicianId: 'tech_test' },
      adminToken
    );
    assert(assignRes.status === 200, 'Admin can assign technician (status -> assigned)');

    // Technician advances status to in_progress
    const inProgRes = await makeRequest(
      'PUT',
      `/api/bookings/admin/${testBookingId}/status`,
      { status: 'in_progress', note: 'بدأ الفني في تنفيذ الخدمة' },
      technicianToken
    );
    assert(inProgRes.status === 200, 'Technician can advance status to in_progress');

    // Technician completes service
    const completeRes = await makeRequest(
      'PUT',
      `/api/bookings/admin/${testBookingId}/status`,
      { status: 'completed', note: 'تم إنهاء خدمة الغسيل والتلميع بنجاح' },
      technicianToken
    );
    assert(completeRes.status === 200, 'Technician can mark service completed');
    assert(completeRes.body.data.status === 'completed', 'Final status recorded as completed');

    // Customer views personal bookings
    const myBookingsRes = await makeRequest('GET', '/api/bookings/my', undefined, customerAToken);
    assert(myBookingsRes.status === 200, 'Customer retrieves personal booking history');
    const myBooking = myBookingsRes.body.data.find((b: any) => b.id === testBookingId);
    assert(Boolean(myBooking), 'Customer sees updated completed booking in dashboard');
    assert(myBooking.status === 'completed', 'Customer dashboard displays real completed status');

    // =========================================================================
    // SECTION 12: Content, Analytics & Zo 3D Companion Isolation
    // =========================================================================
    console.log('\n📋 [12/12] Content, Analytics & Zo Mascot Isolation Suite:');

    // Contact form submission
    const contactRes = await makeRequest('POST', '/api/contact', {
      name: 'طارق عبد الله',
      email: 'tarek@example.com',
      phone: '01099887766',
      subject: 'استفسار عن اشتراكات الشركات',
      message: 'نود الاستفسار عن باقات الغسيل الدورية لأسطول سيارات الشركة.',
    });
    assert(contactRes.status === 201, 'Public contact message submission returns 201 Created');

    // FAQ Creation & Public retrieval
    const faqRes = await makeRequest(
      'POST',
      '/api/faq/admin',
      {
        question: 'كم تستغرق جلسة تفصيل السيارات؟',
        questionEn: 'How long does car detailing take?',
        answer: 'تستغرق الجلسة عادة ما بين 60 إلى 90 دقيقة حسب حجم ونظافة السيارة.',
        answerEn: 'The session typically takes 60 to 90 minutes depending on vehicle size.',
        category: 'car',
        active: true,
      },
      adminToken
    );
    assert(faqRes.status === 201, 'Admin FAQ creation returns 201 Created');

    const pubFaqRes = await makeRequest('GET', '/api/faq');
    assert(pubFaqRes.status === 200, 'Public FAQ list returns 200 OK');
    assert(pubFaqRes.body.data?.length > 0, 'Created FAQ is returned to public customers');

    // Analytics Calculation Accuracy
    const analyticsRes = await makeRequest('GET', '/api/analytics?period=all', undefined, adminToken);
    assert(analyticsRes.status === 200, 'Admin analytics returns 200 OK');
    const dbTotalBookings = await Booking.countDocuments();
    assert(
      analyticsRes.body.data.metrics.totalBookings === dbTotalBookings,
      `Analytics summary totalBookings (${analyticsRes.body.data.metrics.totalBookings}) exactly matches database count (${dbTotalBookings})`
    );

    // Zo Mascot Draft vs. Published Isolation
    await makeRequest(
      'PUT',
      '/api/zo/admin/draft/home',
      {
        pageId: 'home',
        character: {
          expression: 'excited',
          pose: 'thumbs-up',
          renderMode: '3d_procedural',
        },
        message: {
          title: 'مرحبا بك في كلينزو',
          text: 'مسودة لم تنشر بعد',
          textColor: '#072C4F',
        },
      },
      adminToken
    );

    const zoPubBefore = await makeRequest('GET', '/api/zo/published');
    assert(
      zoPubBefore.body.data?.home?.message?.text !== 'مسودة لم تنشر بعد',
      'ZO ISOLATION: Unpublished draft mascot config is strictly isolated from customer website'
    );

    // Publish Zo home config
    const pubZoRes = await makeRequest('POST', '/api/zo/admin/publish/home', undefined, adminToken);
    assert(pubZoRes.status === 200, 'Admin can publish Zo mascot configuration');

    const zoPubAfter = await makeRequest('GET', '/api/zo/published');
    assert(
      zoPubAfter.body.data?.home?.message?.text === 'مسودة لم تنشر بعد',
      'ZO ISOLATION: Published Zo config is immediately visible to public website'
    );

    // Clean test data
    console.log('\n🧹 Cleaning up temporary test records...');
    await Promise.all([
      User.deleteMany({ phone: { $in: [customerAPhone, customerBPhone] } }),
      AdminUser.deleteMany({ email: { $in: ['admin@cleanzo.com', 'tech@cleanzo.com'] } }),
      Service.deleteMany({ id: { $in: [testServiceId, 'car-inactive-draft-svc'] } }),
      Booking.deleteMany({ id: { $in: [testBookingId] } }),
      Offer.deleteMany({ code: 'CLEAN20' }),
      Role.deleteMany({ id: { $in: ['owner', 'technician'] } }),
      Technician.deleteMany({ id: 'tech_test' }),
      ContactMessage.deleteMany({ email: 'tarek@example.com' }),
    ]);
    console.log('✓ Temporary test data cleaned safely from database');

    console.log('\n================================================================');
    console.log(`🎉 ALL PHASE 3 END-TO-END TESTS COMPLETED SUCCESSFULLY!`);
    console.log(`📊 Passed Assertions: ${passedCount} / ${passedCount + failedCount} (100%)`);
    console.log(`❌ Failed Assertions: ${failedCount}`);
    console.log('================================================================');
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runPhase3SystemTests().catch((err) => {
  console.error('❌ PHASE 3 TEST SUITE ENCOUNTERED ERROR:', err);
  process.exit(1);
});
