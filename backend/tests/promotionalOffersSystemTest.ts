import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import assert from 'assert';
import { AdminUser } from '../src/models/AdminUser.js';
import { Offer } from '../src/models/Offer.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string,
  contentType = 'application/json'
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {
      'User-Agent': 'CleanzoPromotionalOffersTest/1.0',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let payload: Buffer | undefined;
    if (body !== undefined) {
      if (Buffer.isBuffer(body)) {
        payload = body;
        headers['Content-Type'] = contentType;
        headers['Content-Length'] = body.length.toString();
      } else {
        const json = JSON.stringify(body);
        payload = Buffer.from(json);
        headers['Content-Type'] = contentType;
        headers['Content-Length'] = Buffer.byteLength(json).toString();
      }
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode || 0, body: parsed });
        });
      }
    );

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

// Multipart helper for real file upload
function buildMultipartBody(fieldName: string, fileName: string, mimeType: string, fileBuffer: Buffer) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${mimeType}\r\n\r\n`
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const fullBody = Buffer.concat([head, fileBuffer, tail]);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: fullBody,
  };
}

async function runPromotionalOffersSystemTests() {
  console.log('🚀 [TEST SUITE] Starting Promotional Offers & Session Security System Tests...');
  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((res) => {
    server.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      console.log(`📡 Test server running on ${baseUrl}`);
      res();
    });
  });

  const createdOfferIds: string[] = [];

  try {
    // 1. Ensure Admin User exists
    let admin = await AdminUser.findOne({ role: 'owner' });
    if (!admin) {
      admin = await AdminUser.create({
        name: 'Ahmed Owner Test',
        username: 'ahmed.owner',
        email: 'ahmed.owner@cleanzo.sa',
        phone: '+966500000001',
        password: 'password123',
        role: 'owner',
        isActive: true,
        permissions: {},
        granularPermissions: ['*'],
      });
      console.log('✅ Created owner admin user in test database');
    }

    // Pre-test cleanup of any residual test codes
    await Offer.deleteMany({
      code: { $in: ['TEST_ROYAL_ACTIVE', 'TEST_SUMMER_SCHEDULED', 'TEST_EXPIRED_PROMO', 'TEST_MANUAL_DISABLED', 'FAILBASE64'] },
    });

    // 2. Test Admin Login (Authentication Flow)
    console.log('\n--- 1. Admin Authentication & Session Generation ---');
    const loginRes = await makeRequest('POST', '/auth/admin/login', {
      username: admin.username || 'ahmed.owner',
      password: 'password123',
    });
    assert.strictEqual(loginRes.status, 200, `Admin login failed: ${JSON.stringify(loginRes.body)}`);
    assert.ok(loginRes.body?.data?.token, 'Admin login response must contain token');
    const adminToken = loginRes.body.data.token;
    console.log('✅ Admin login succeeded and generated valid JWT session token');

    // 3. Test Token Refresh Endpoint (Root cause fix verification)
    console.log('\n--- 2. Token Refresh Endpoint (/api/auth/admin/refresh) ---');
    const refreshRes = await makeRequest('POST', '/auth/admin/refresh', {}, adminToken);
    assert.strictEqual(refreshRes.status, 200, `Token refresh failed: ${JSON.stringify(refreshRes.body)}`);
    assert.ok(refreshRes.body?.data?.token, 'Refresh response must contain new token');
    const freshToken = refreshRes.body.data.token;
    console.log('✅ Token refresh successfully issued fresh JWT token for active session');

    // 4. Test Direct Device File Upload (Real Image Upload)
    console.log('\n--- 3. Direct Device File Upload (/api/media/upload) ---');
    // 1x1 transparent PNG buffer
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      'base64'
    );
    const { contentType, body: multipartPayload } = buildMultipartBody(
      'file',
      'test_promo_banner.png',
      'image/png',
      pngBuffer
    );
    const uploadRes = await makeRequest('POST', '/media/upload', multipartPayload, freshToken, contentType);
    assert.strictEqual(uploadRes.status, 201, `Image upload failed: ${JSON.stringify(uploadRes.body)}`);
    assert.ok(uploadRes.body?.data?.url, 'Upload response must contain file URL');
    const uploadedImageUrl = uploadRes.body.data.url;
    assert.ok(
      uploadedImageUrl.startsWith('/uploads/images/'),
      `Image URL must be a relative storage path (/uploads/images/...), got: ${uploadedImageUrl}`
    );
    console.log(`✅ Uploaded device image successfully: ${uploadedImageUrl}`);

    // 5. Test Base64 Rejection (Strict requirement: NO Base64 in Database)
    console.log('\n--- 4. Base64 Rejection Check (Zero Base64 in Database) ---');
    const base64Payload = {
      title: 'عرض تجربة بيس 64',
      code: 'FAILBASE64',
      discountPercentage: 15,
      expiresAt: '2026-12-31',
      image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      category: 'car',
    };
    const base64Res = await makeRequest('POST', '/offers/admin', base64Payload, freshToken);
    assert.strictEqual(
      base64Res.status,
      422,
      `Expected status 422 for Base64 image rejection, got: ${base64Res.status}`
    );
    assert.strictEqual(
      base64Res.body?.code,
      'BASE64_NOT_ALLOWED',
      'Expected error code BASE64_NOT_ALLOWED'
    );
    console.log('✅ Base64 image string was strictly rejected with 422 BASE64_NOT_ALLOWED');

    // 6. Create Offers with Different Lifecycle States
    console.log('\n--- 5. Offer Lifecycle States Creation (Active, Scheduled, Expired, Disabled) ---');
    const today = new Date().toISOString().split('T')[0];
    
    // Future date (+30 days)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Scheduled start date (+10 days)
    const scheduledStartDate = new Date();
    scheduledStartDate.setDate(scheduledStartDate.getDate() + 10);
    const scheduledStartDateStr = scheduledStartDate.toISOString().split('T')[0];

    // Expired dates (-30 days to -1 day)
    const pastStart = new Date();
    pastStart.setDate(pastStart.getDate() - 30);
    const pastStartStr = pastStart.toISOString().split('T')[0];

    const pastEnd = new Date();
    pastEnd.setDate(pastEnd.getDate() - 2);
    const pastEndStr = pastEnd.toISOString().split('T')[0];

    // A. Create ACTIVE offer
    const activeOfferPayload = {
      title: 'عرض غسيل السيارات الملكي التجريبي',
      titleEn: 'Royal Car Wash Test Offer',
      code: 'TEST_ROYAL_ACTIVE',
      discountPercentage: 25,
      startDate: today,
      expiresAt: futureDateStr,
      description: 'خصم 25% فوري على باقات الغسيل الملكي',
      category: 'car',
      image: uploadedImageUrl,
      active: true,
      badge: 'خصم 25%',
    };
    const activeCreateRes = await makeRequest('POST', '/offers/admin', activeOfferPayload, freshToken);
    assert.strictEqual(activeCreateRes.status, 201, `Failed to create active offer: ${JSON.stringify(activeCreateRes.body)}`);
    const activeOfferId = activeCreateRes.body.data.id || activeCreateRes.body.data._id;
    createdOfferIds.push(activeOfferId);
    console.log(`✅ Created Active Offer: ${activeOfferPayload.code} (ID: ${activeOfferId})`);

    // B. Create SCHEDULED offer (starts in 10 days)
    const scheduledOfferPayload = {
      title: 'عرض الصيف القادم المجدول',
      titleEn: 'Upcoming Summer Offer',
      code: 'TEST_SUMMER_SCHEDULED',
      discountPercentage: 20,
      startDate: scheduledStartDateStr,
      expiresAt: futureDateStr,
      description: 'عرض صيفي مجدول يبدأ بعد 10 أيام',
      category: 'car',
      image: uploadedImageUrl,
      active: true,
      badge: 'عرض الصيف',
    };
    const scheduledCreateRes = await makeRequest('POST', '/offers/admin', scheduledOfferPayload, freshToken);
    assert.strictEqual(scheduledCreateRes.status, 201);
    const scheduledOfferId = scheduledCreateRes.body.data.id || scheduledCreateRes.body.data._id;
    createdOfferIds.push(scheduledOfferId);
    console.log(`✅ Created Scheduled Offer: ${scheduledOfferPayload.code} (ID: ${scheduledOfferId})`);

    // C. Create EXPIRED offer (expired 2 days ago)
    const expiredOfferPayload = {
      title: 'عرض نهاية الأسبوع المنتهي',
      titleEn: 'Expired Weekend Offer',
      code: 'TEST_EXPIRED_PROMO',
      discountPercentage: 30,
      startDate: pastStartStr,
      expiresAt: pastEndStr,
      description: 'عرض انتهى تاريخ صلاحيته',
      category: 'home',
      image: uploadedImageUrl,
      active: true,
      badge: 'منتهي',
    };
    const expiredCreateRes = await makeRequest('POST', '/offers/admin', expiredOfferPayload, freshToken);
    assert.strictEqual(expiredCreateRes.status, 201);
    const expiredOfferId = expiredCreateRes.body.data.id || expiredCreateRes.body.data._id;
    createdOfferIds.push(expiredOfferId);
    console.log(`✅ Created Expired Offer: ${expiredOfferPayload.code} (ID: ${expiredOfferId})`);

    // D. Create DISABLED offer (active: false)
    const disabledOfferPayload = {
      title: 'عرض معطل يدوياً',
      titleEn: 'Manually Disabled Offer',
      code: 'TEST_MANUAL_DISABLED',
      discountPercentage: 15,
      startDate: today,
      expiresAt: futureDateStr,
      description: 'عرض تم تعطيله من الإدارة',
      category: 'car',
      image: uploadedImageUrl,
      active: false,
      badge: 'معطل',
    };
    const disabledCreateRes = await makeRequest('POST', '/offers/admin', disabledOfferPayload, freshToken);
    assert.strictEqual(disabledCreateRes.status, 201);
    const disabledOfferId = disabledCreateRes.body.data.id || disabledCreateRes.body.data._id;
    createdOfferIds.push(disabledOfferId);
    console.log(`✅ Created Disabled Offer: ${disabledOfferPayload.code} (ID: ${disabledOfferId})`);

    // 7. Test Admin Listing and Status Computations
    console.log('\n--- 6. Admin Listing & Status Badge Computation ---');
    const adminOffersRes = await makeRequest('GET', '/offers/admin', undefined, freshToken);
    assert.strictEqual(adminOffersRes.status, 200);
    const allAdminOffers = adminOffersRes.body.data as any[];
    
    const foundActive = allAdminOffers.find((o) => o.code === 'TEST_ROYAL_ACTIVE');
    const foundScheduled = allAdminOffers.find((o) => o.code === 'TEST_SUMMER_SCHEDULED');
    const foundExpired = allAdminOffers.find((o) => o.code === 'TEST_EXPIRED_PROMO');
    const foundDisabled = allAdminOffers.find((o) => o.code === 'TEST_MANUAL_DISABLED');

    assert.ok(foundActive, 'Active offer must exist in admin list');
    assert.strictEqual(foundActive.status, 'active', 'Computed status for active offer must be "active"');
    assert.strictEqual(foundActive.image, uploadedImageUrl, 'Stored image reference must match uploaded image URL');

    assert.ok(foundScheduled, 'Scheduled offer must exist in admin list');
    assert.strictEqual(foundScheduled.status, 'scheduled', 'Computed status for scheduled offer must be "scheduled"');

    assert.ok(foundExpired, 'Expired offer must exist in admin list');
    assert.strictEqual(foundExpired.status, 'expired', 'Computed status for expired offer must be "expired"');

    assert.ok(foundDisabled, 'Disabled offer must exist in admin list');
    assert.strictEqual(foundDisabled.status, 'disabled', 'Computed status for disabled offer must be "disabled"');
    console.log('✅ Admin list accurately returned all 4 offers with computed status badges');

    // 8. Test Admin Status Filtering Query Parameters
    console.log('\n--- 7. Admin Filtering Queries (?status=active / scheduled / expired / disabled) ---');
    const activeFiltered = await makeRequest('GET', '/offers/admin?status=active', undefined, freshToken);
    assert.ok(activeFiltered.body.data.some((o: any) => o.code === 'TEST_ROYAL_ACTIVE'));
    assert.ok(!activeFiltered.body.data.some((o: any) => o.code === 'TEST_EXPIRED_PROMO'));
    assert.ok(!activeFiltered.body.data.some((o: any) => o.code === 'TEST_SUMMER_SCHEDULED'));
    assert.ok(!activeFiltered.body.data.some((o: any) => o.code === 'TEST_MANUAL_DISABLED'));
    console.log('✅ ?status=active returns only active offers');

    const expiredFiltered = await makeRequest('GET', '/offers/admin?status=expired', undefined, freshToken);
    assert.ok(expiredFiltered.body.data.some((o: any) => o.code === 'TEST_EXPIRED_PROMO'));
    assert.ok(!expiredFiltered.body.data.some((o: any) => o.code === 'TEST_ROYAL_ACTIVE'));
    console.log('✅ ?status=expired returns only expired offers');

    // 9. Test Public Customer Endpoint Filtering (Strict Isolation)
    console.log('\n--- 8. Public Customer Website Isolation (/api/offers) ---');
    const publicOffersRes = await makeRequest('GET', '/offers');
    assert.strictEqual(publicOffersRes.status, 200);
    const publicOffers = publicOffersRes.body.data as any[];

    // TEST_ROYAL_ACTIVE MUST be present
    const isPublicActivePresent = publicOffers.some((o) => o.code === 'TEST_ROYAL_ACTIVE');
    assert.ok(isPublicActivePresent, 'Active offer MUST be displayed on customer website');

    // Scheduled, Expired, and Disabled MUST NOT be present
    const isScheduledPresent = publicOffers.some((o) => o.code === 'TEST_SUMMER_SCHEDULED');
    const isExpiredPresent = publicOffers.some((o) => o.code === 'TEST_EXPIRED_PROMO');
    const isDisabledPresent = publicOffers.some((o) => o.code === 'TEST_MANUAL_DISABLED');

    assert.strictEqual(isScheduledPresent, false, 'Scheduled offer must NOT appear on customer website');
    assert.strictEqual(isExpiredPresent, false, 'Expired offer must NOT appear on customer website');
    assert.strictEqual(isDisabledPresent, false, 'Disabled offer must NOT appear on customer website');
    console.log('✅ Customer endpoint (/api/offers) strictly returns ONLY active, unexpired, already-started offers');

    // 10. Test Coupon Validation Service Integration
    console.log('\n--- 9. Coupon & Checkout Validation Engine Integration ---');
    
    // A. Active offer code -> must succeed
    const validateActive = await makeRequest('POST', '/coupons/validate', {
      code: 'TEST_ROYAL_ACTIVE',
      basePrice: 200,
    });
    assert.strictEqual(validateActive.status, 200, `Active coupon should be valid: ${JSON.stringify(validateActive.body)}`);
    assert.strictEqual(validateActive.body.data.actualDiscountAmount, 50, '25% of 200 should equal 50');
    assert.strictEqual(validateActive.body.data.finalPrice, 150);
    console.log('✅ Active promo code validates and correctly calculates discount');

    // B. Scheduled offer code -> must be rejected (not started yet)
    const validateScheduled = await makeRequest('POST', '/coupons/validate', {
      code: 'TEST_SUMMER_SCHEDULED',
      basePrice: 200,
    });
    assert.strictEqual(validateScheduled.status, 400);
    assert.ok(
      validateScheduled.body.message.includes('لم يبدأ بعد'),
      `Expected message to indicate not started yet, got: ${validateScheduled.body.message}`
    );
    console.log(`✅ Scheduled promo code blocked: "${validateScheduled.body.message}"`);

    // C. Expired offer code -> must be rejected
    const validateExpired = await makeRequest('POST', '/coupons/validate', {
      code: 'TEST_EXPIRED_PROMO',
      basePrice: 200,
    });
    assert.strictEqual(validateExpired.status, 400);
    assert.ok(
      validateExpired.body.message.includes('انتهت صلاحية') || validateExpired.body.message.includes('منتهي'),
      `Expected message to indicate expired, got: ${validateExpired.body.message}`
    );
    console.log(`✅ Expired promo code blocked: "${validateExpired.body.message}"`);

    // D. Disabled offer code -> must be rejected
    const validateDisabled = await makeRequest('POST', '/coupons/validate', {
      code: 'TEST_MANUAL_DISABLED',
      basePrice: 200,
    });
    assert.strictEqual(validateDisabled.status, 400);
    assert.ok(
      validateDisabled.body.message.includes('غير مفعّل') || validateDisabled.body.message.includes('معطل'),
      `Expected message to indicate disabled, got: ${validateDisabled.body.message}`
    );
    console.log(`✅ Disabled promo code blocked: "${validateDisabled.body.message}"`);

    // 11. Test Toggle Active Endpoint
    console.log('\n--- 10. Admin Toggle Active Endpoint (/api/offers/admin/:id/toggle) ---');
    const toggleRes = await makeRequest('PATCH', `/offers/admin/${activeOfferId}/toggle`, {}, freshToken);
    assert.strictEqual(toggleRes.status, 200);
    assert.strictEqual(toggleRes.body.data.active, false, 'Offer active state should now be false');

    // Verify it is no longer returned in public customer endpoint
    const publicAfterToggle = await makeRequest('GET', '/offers');
    const isPresentAfterDisable = (publicAfterToggle.body.data as any[]).some((o) => o.code === 'TEST_ROYAL_ACTIVE');
    assert.strictEqual(isPresentAfterDisable, false, 'Toggled-off offer must disappear from customer website');
    console.log('✅ Toggle active endpoint successfully switched offer to disabled and removed it from customer website');

    // Toggle back to active
    const toggleBackRes = await makeRequest('PATCH', `/offers/admin/${activeOfferId}/toggle`, {}, freshToken);
    assert.strictEqual(toggleBackRes.status, 200);
    assert.strictEqual(toggleBackRes.body.data.active, true);
    console.log('✅ Toggle active endpoint successfully restored offer to active state');

    console.log('\n🎉 ALL PROMOTIONAL OFFERS & SESSION SECURITY TESTS PASSED SUCCESSFULLY!');
  } finally {
    // Cleanup created test records
    console.log('\n🧹 Cleaning up test offers...');
    await Offer.deleteMany({
      $or: [
        { id: { $in: createdOfferIds } },
        { code: { $in: ['TEST_ROYAL_ACTIVE', 'TEST_SUMMER_SCHEDULED', 'TEST_EXPIRED_PROMO', 'TEST_MANUAL_DISABLED'] } },
      ],
    });
    console.log(`✅ Cleaned up test offers from database`);

    if (server) {
      await new Promise<void>((res) => server.close(() => res()));
    }
    await disconnectDB();
  }
}

runPromotionalOffersSystemTests().catch((err) => {
  console.error('❌ Promotional offers test suite failed with error:', err);
  process.exit(1);
});
