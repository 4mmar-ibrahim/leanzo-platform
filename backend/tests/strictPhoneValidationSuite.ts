/**
 * CLEANZO - STRICT EGYPTIAN CUSTOMER PHONE NUMBER VALIDATION SUITE
 * 
 * Verifies:
 * 1. Canonical validation regex /^(010|011|012|015)[0-9]{8}$/
 * 2. Prefix matrix (010, 011, 012, 015 ALLOWED; 013, 014, 016, 017, 018, 019, 020, etc. REJECTED)
 * 3. Length matrix (exactly 11 digits; 10 and 12 digits REJECTED)
 * 4. Character matrix (digits only; letters, spaces, hyphens, +, 0020 REJECTED)
 * 5. Direct API tests:
 *    - Customer Registration (valid, invalid format, duplicate rejection)
 *    - Customer Login (valid, invalid format rejection, credential check)
 *    - Customer Profile Phone Update (valid, invalid format rejection)
 *    - Public Booking & Tracking (strict format enforcement)
 *    - Admin Customer Management (creation and edit format enforcement)
 * 6. Non-regression of Persistent Login / JWT sessions
 * 7. Verification that existing real customer accounts remain intact
 */

import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { Role } from '../src/models/Role.js';
import { generateAdminToken } from '../src/utils/jwt.js';
import {
  EGYPTIAN_PHONE_REGEX,
  isValidEgyptianPhone,
  validateEgyptianPhone,
  CANONICAL_PHONE_ERROR_CODE,
} from '../src/utils/phoneValidator.js';

let server: any;
let baseUrl: string;
let adminToken: string;

const QA_TEST_PHONES = [
  '01099990001',
  '01199990002',
  '01299990003',
  '01599990004',
];

async function apiRequest(path: string, options: { method?: string; headers?: Record<string, string>; body?: any } = {}) {
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
  const setCookie = res.headers.get('set-cookie');
  return { status: res.status, ok: res.ok, body: json, setCookie };
}

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 CLEANZO STRICT EGYPTIAN PHONE VALIDATION TEST SUITE');
  console.log('====================================================\n');

  await connectDB();

  server = app.listen(0);
  const port = server.address().port;
  baseUrl = `http://127.0.0.1:${port}`;
  console.log('🚀 Test server active at:', baseUrl);

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string, details?: any) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      if (details) console.error('     Details:', details);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------
    // Clean up any stale QA test numbers from previous aborted runs
    // -------------------------------------------------------------
    await prisma.user.deleteMany({
      where: { phone: { in: QA_TEST_PHONES } },
    });

    // Obtain or create admin credentials for Admin Customer API test
    let admin = await AdminUser.findOne({ email: 'superadmin@cleanzo.com' });
    if (!admin) {
      admin = await AdminUser.findOne();
    }
    if (admin) {
      adminToken = generateAdminToken({
        id: admin.id,
        username: admin.username || admin.email || 'admin',
        role: admin.role,
      });
    }

    console.log('\n--- SECTION 1: CANONICAL REGEX & UNIT VALIDATION ---');

    // Valid Test Cases (Sections 19)
    const validTestCases = [
      '01012345678',
      '01000000000',
      '01112345678',
      '01100000000',
      '01212345678',
      '01200000000',
      '01512345678',
      '01500000000',
    ];
    for (const phone of validTestCases) {
      assert(
        isValidEgyptianPhone(phone) === true && validateEgyptianPhone(phone).isValid === true,
        `Valid number must pass: ${phone}`
      );
    }

    // Invalid Prefix Test Cases (Section 20)
    const invalidPrefixes = [
      '01312345678',
      '01412345678',
      '01612345678',
      '01712345678',
      '01812345678',
      '01912345678',
      '02012345678',
      '05012345678',
      '08012345678',
    ];
    for (const phone of invalidPrefixes) {
      const res = validateEgyptianPhone(phone);
      assert(
        isValidEgyptianPhone(phone) === false &&
          res.isValid === false &&
          (res.detailCode === 'INVALID_PREFIX' || res.code === CANONICAL_PHONE_ERROR_CODE),
        `Invalid prefix must fail: ${phone}`
      );
    }

    // Invalid Length Test Cases (Section 21)
    const invalidLengths = [
      '0101234567',   // 10 digits
      '0111234567',   // 10 digits
      '0121234567',   // 10 digits
      '0151234567',   // 10 digits
      '010123456789', // 12 digits
      '011123456789', // 12 digits
      '012123456789', // 12 digits
      '015123456789', // 12 digits
    ];
    for (const phone of invalidLengths) {
      const res = validateEgyptianPhone(phone);
      assert(
        isValidEgyptianPhone(phone) === false &&
          res.isValid === false &&
          (res.detailCode === 'INVALID_LENGTH' || res.code === CANONICAL_PHONE_ERROR_CODE),
        `Invalid length must fail: ${phone}`
      );
    }

    // Invalid Characters / Formats (Section 22)
    const invalidCharacters = [
      '010-12345678',
      '011-12345678',
      '012-12345678',
      '015-12345678',
      '010 12345678',
      '011 12345678',
      '012 12345678',
      '015 12345678',
      '010abc45678',
      '011abc45678',
      '+201012345678',
      '+201112345678',
      '+201212345678',
      '+201512345678',
      '00201012345678',
      '00201112345678',
      '00201212345678',
      '00201512345678',
    ];
    for (const phone of invalidCharacters) {
      const res = validateEgyptianPhone(phone);
      assert(
        isValidEgyptianPhone(phone) === false && res.isValid === false,
        `Invalid characters/format must fail: ${phone}`
      );
    }

    console.log('\n--- SECTION 2: DIRECT BACKEND REGISTRATION API TESTS ---');

    // Rejection of invalid prefix in registration
    const regInvalidPrefix = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Invalid Prefix',
        phone: '01612345678',
        password: 'Password123!',
      },
    });
    assert(
      regInvalidPrefix.status === 400 && regInvalidPrefix.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'POST /api/auth/register rejects 01612345678 with HTTP 400 & INVALID_PHONE_NUMBER',
      regInvalidPrefix.body
    );

    // Rejection of 10 digits
    const regInvalidLength10 = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Invalid Length 10',
        phone: '0111234567',
        password: 'Password123!',
      },
    });
    assert(
      regInvalidLength10.status === 400 && regInvalidLength10.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'POST /api/auth/register rejects 10 digits with HTTP 400',
      regInvalidLength10.body
    );

    // Rejection of 12 digits
    const regInvalidLength12 = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Invalid Length 12',
        phone: '011123456789',
        password: 'Password123!',
      },
    });
    assert(
      regInvalidLength12.status === 400 && regInvalidLength12.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'POST /api/auth/register rejects 12 digits with HTTP 400',
      regInvalidLength12.body
    );

    // Rejection of international +20 prefix
    const regInvalidInternational = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Invalid Int',
        phone: '+201112345678',
        password: 'Password123!',
      },
    });
    assert(
      regInvalidInternational.status === 400 && regInvalidInternational.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'POST /api/auth/register rejects +20 format with HTTP 400',
      regInvalidInternational.body
    );

    // Rejection of hyphenated phone
    const regInvalidHyphen = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Invalid Hyphen',
        phone: '011-12345678',
        password: 'Password123!',
      },
    });
    assert(
      regInvalidHyphen.status === 400 && regInvalidHyphen.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'POST /api/auth/register rejects hyphenated phone with HTTP 400',
      regInvalidHyphen.body
    );

    // Successful registration with valid phone
    const regValid = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Valid User 1',
        phone: '01099990001',
        password: 'Password123!',
      },
    });
    assert(
      regValid.status === 201 &&
        regValid.body?.success === true &&
        regValid.body?.data?.user?.phone === '01099990001',
      'POST /api/auth/register accepts valid phone 01099990001 with HTTP 201',
      regValid.body
    );
    const customerToken = regValid.body?.data?.token;

    // Duplicate Phone Test (Section 24)
    const regDuplicate = await apiRequest('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'QA Duplicate User',
        phone: '01099990001',
        password: 'Password123!',
      },
    });
    assert(
      regDuplicate.status === 409 && regDuplicate.body?.success === false,
      'Duplicate phone registration rejected with HTTP 409',
      regDuplicate.body
    );

    console.log('\n--- SECTION 3: DIRECT BACKEND LOGIN API TESTS ---');

    // Login with invalid phone format
    const loginInvalidFormat = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        phone: '01612345678',
        password: 'Password123!',
      },
    });
    assert(
      loginInvalidFormat.status === 400 && loginInvalidFormat.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'POST /api/auth/login rejects invalid format 01612345678 with HTTP 400',
      loginInvalidFormat.body
    );

    // Login with valid format but wrong password
    const loginWrongPass = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        phone: '01099990001',
        password: 'WrongPassword999!',
      },
    });
    assert(
      loginWrongPass.status === 401,
      'POST /api/auth/login with wrong password returns HTTP 401 without format leak',
      loginWrongPass.body
    );

    // Login with valid format and correct password
    const loginSuccess = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: {
        phone: '01099990001',
        password: 'Password123!',
      },
    });
    assert(
      loginSuccess.status === 200 &&
        loginSuccess.body?.success === true &&
        loginSuccess.body?.data?.user?.phone === '01099990001',
      'POST /api/auth/login succeeds with valid phone and password',
      loginSuccess.body
    );

    console.log('\n--- SECTION 4: CUSTOMER ACCOUNT PHONE UPDATE ---');

    // Customer updates phone to invalid format
    const updateInvalid = await apiRequest('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        phone: '01412345678',
      },
    });
    assert(
      updateInvalid.status === 400 && updateInvalid.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'PUT /api/auth/profile rejects invalid prefix 01412345678 with HTTP 400',
      updateInvalid.body
    );

    // Customer updates phone to valid new phone
    const updateValid = await apiRequest('/api/auth/profile', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${customerToken}` },
      body: {
        phone: '01199990002',
      },
    });
    assert(
      updateValid.status === 200 && updateValid.body?.data?.phone === '01199990002',
      'PUT /api/auth/profile successfully updates phone to 01199990002',
      updateValid.body
    );

    console.log('\n--- SECTION 5: PUBLIC BOOKING & TRACKING PHONE VALIDATION ---');

    // Order tracking with invalid phone format
    const trackInvalid = await apiRequest('/api/bookings/track/non-existent-order?phone=01612345678', {
      method: 'GET',
    });
    assert(
      trackInvalid.status === 400 && trackInvalid.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'GET /api/bookings/track/:id rejects invalid phone with HTTP 400',
      trackInvalid.body
    );

    // Price calculation with invalid phone
    const priceCalcInvalid = await apiRequest('/api/bookings/calculate-price', {
      method: 'POST',
      body: {
        serviceId: 'car-wash',
        customerPhone: '+201012345678',
      },
    });
    assert(
      priceCalcInvalid.status === 400 && priceCalcInvalid.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'POST /api/bookings/calculate-price rejects +20 phone format with HTTP 400',
      priceCalcInvalid.body
    );

    // Coupon validation with invalid phone
    const couponInvalid = await apiRequest('/api/coupons/validate', {
      method: 'POST',
      body: {
        code: 'CLEANZO10',
        customerPhone: '011-12345678',
      },
    });
    assert(
      couponInvalid.status === 400 && couponInvalid.body?.code === CANONICAL_PHONE_ERROR_CODE,
      'POST /api/coupons/validate rejects hyphenated phone with HTTP 400',
      couponInvalid.body
    );

    console.log('\n--- SECTION 6: ADMIN CUSTOMER MANAGEMENT API ---');

    if (adminToken) {
      // Admin create customer with invalid phone
      const adminCreateInvalid = await apiRequest('/api/customers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          name: 'QA Admin Invalid Cust',
          phone: '01312345678',
        },
      });
      assert(
        adminCreateInvalid.status === 400 && adminCreateInvalid.body?.code === CANONICAL_PHONE_ERROR_CODE,
        'Admin POST /api/customers rejects invalid prefix 01312345678 with HTTP 400',
        adminCreateInvalid.body
      );

      // Admin create customer with valid phone
      const adminCreateValid = await apiRequest('/api/customers', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          name: 'QA Admin Valid Cust',
          phone: '01299990003',
          email: 'qa.admin.cust@example.com',
        },
      });
      const validAdminPhone = adminCreateValid.body?.data?.phone || adminCreateValid.body?.customer?.phone;
      assert(
        adminCreateValid.status === 201 && validAdminPhone === '01299990003',
        'Admin POST /api/customers creates customer with valid phone 01299990003',
        adminCreateValid.body
      );
      const createdCustId = adminCreateValid.body?.data?._id || adminCreateValid.body?.data?.id;

      if (createdCustId) {
        // Admin edit customer with invalid phone
        const adminEditInvalid = await apiRequest(`/api/customers/${createdCustId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            phone: '01712345678',
          },
        });
        assert(
          adminEditInvalid.status === 400 && adminEditInvalid.body?.code === CANONICAL_PHONE_ERROR_CODE,
          'Admin PUT /api/customers/:id rejects invalid prefix 01712345678 with HTTP 400',
          adminEditInvalid.body
        );

        // Admin edit customer with valid phone
        const adminEditValid = await apiRequest(`/api/customers/${createdCustId}`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${adminToken}` },
          body: {
            phone: '01599990004',
          },
        });
        const updatedPhone = adminEditValid.body?.data?.phone || adminEditValid.body?.customer?.phone;
        assert(
          adminEditValid.status === 200 && updatedPhone === '01599990004',
          'Admin PUT /api/customers/:id updates phone to valid 01599990004',
          adminEditValid.body
        );
      }
    } else {
      console.log('  ⚠️ Skipping Admin API tests (No admin found in DB)');
    }

    console.log('\n--- SECTION 7: DATABASE INTEGRITY & CLEANUP ---');

    // Verify existing real data was not touched
    const realCustomers = await prisma.user.findMany({
      where: { phone: { notIn: QA_TEST_PHONES } },
    });
    assert(
      realCustomers.length >= 1,
      `Real existing customers preserved safely (Count: ${realCustomers.length})`
    );

    // Remove ONLY temporary QA customer data
    const deleted = await prisma.user.deleteMany({
      where: { phone: { in: QA_TEST_PHONES } },
    });
    console.log(`  🧹 Cleaned up ${deleted.count} temporary QA test customer records.`);

  } finally {
    if (server) server.close();
    await disconnectDB();
  }

  console.log('\n====================================================');
  console.log(`🏁 TEST RUN FINISHED: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
