import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Technician } from '../src/models/Technician.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { generateAdminToken } from '../src/utils/jwt.js';
import prisma from '../src/config/prisma.js';
import {
  validateEgyptianPhone,
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
  CANONICAL_PHONE_ERROR_MESSAGE,
} from '../src/utils/phoneValidator.js';

let server: http.Server;
let baseUrl: string;
let ownerToken: string;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion Failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {};

    let payload = '';
    if (body !== undefined && body !== null) {
      payload = JSON.stringify(body);
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload).toString();
    }

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
        res.on('data', (chunk) => {
          rawData += chunk;
        });
        res.on('end', () => {
          try {
            const parsed = rawData ? JSON.parse(rawData) : {};
            resolve({ status: res.statusCode || 500, body: parsed });
          } catch {
            resolve({ status: res.statusCode || 500, body: rawData });
          }
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runWorkerPhoneValidationTest() {
  console.log('\n============================================================');
  console.log('🧪 CLEANZO BUG 10 FIX TEST: WORKER PHONE NUMBER VALIDATION');
  console.log('============================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address && typeof address !== 'string') {
        baseUrl = `http://127.0.0.1:${address.port}`;
        console.log(`[Test Server] running at ${baseUrl}`);
      }
      resolve();
    });
  });

  const testSuffix = Date.now().toString().slice(-6);
  const createdTechIds: string[] = [];

  try {
    let admin = await AdminUser.findOne({ role: 'owner' });
    if (!admin) {
      admin = await AdminUser.create({
        name: 'Owner Admin',
        username: `owner_${testSuffix}`,
        password: 'password123',
        role: 'owner',
        permissions: ['*'],
        isActive: true,
      });
    }
    ownerToken = generateAdminToken({
      id: admin._id ? admin._id.toString() : admin.id,
      username: admin.username,
      role: admin.role,
    });

    console.log('\n--- TEST PHASE 1: UNIT VALIDATION RULES (TEST MATRIX) ---');
    const rejectCases = [
      '011223',         // The exact bug from screenshot: 6 digits
      '1234567890',     // 10 digits without leading 0
      '123456789012',   // 12 digits
      '0101234567',     // 10 digits
      '01612345678',    // Invalid prefix 016
      'ABC12345678',    // Letters
      '',               // Empty
      '   ',            // Whitespace
    ];

    for (const invalidPhone of rejectCases) {
      const val = validateEgyptianPhone(invalidPhone);
      assert(!val.isValid, `Unit test correctly rejects invalid phone "${invalidPhone}"`);
      assert(isValidEgyptianPhone(invalidPhone) === false, `isValidEgyptianPhone returns false for "${invalidPhone}"`);
    }

    const acceptCases = [
      '01012345678',
      '01112345678',
      '01212345678',
      '01512345678',
    ];

    for (const validPhone of acceptCases) {
      const val = validateEgyptianPhone(validPhone);
      assert(val.isValid, `Unit test correctly accepts valid phone "${validPhone}"`);
      assert(isValidEgyptianPhone(validPhone) === true, `isValidEgyptianPhone returns true for "${validPhone}"`);
    }

    console.log('\n--- TEST PHASE 2: BACKEND API REJECTION OF INVALID PHONES ON CREATION ---');
    for (const invalidPhone of rejectCases) {
      const res = await makeRequest(
        'POST',
        '/technicians',
        {
          name: `فني اختبار ${testSuffix}`,
          phone: invalidPhone,
          specialty: 'غسيل وتلميع',
        },
        ownerToken
      );

      assert(
        res.status === 400 || res.status === 422,
        `Backend POST /technicians strictly rejects invalid phone "${invalidPhone}" (status: ${res.status})`
      );
      assert(
        res.body.success === false,
        `Backend response indicates failure for invalid phone "${invalidPhone}"`
      );
    }

    console.log('\n--- TEST PHASE 3: BACKEND API ACCEPTANCE OF VALID PHONES ON CREATION ---');
    let firstCreatedTechId = '';
    for (let i = 0; i < acceptCases.length; i++) {
      const validPhone = acceptCases[i];
      const res = await makeRequest(
        'POST',
        '/technicians',
        {
          name: `كابتن اختبار ${i + 1} - ${testSuffix}`,
          phone: validPhone,
          specialty: 'تلميع سيارات متنقل',
        },
        ownerToken
      );

      assert(res.status === 201, `Backend POST /technicians accepts valid phone "${validPhone}" with 201`);
      assert(res.body.success === true, 'Response body success is true');
      assert(res.body.data.phone === validPhone, `Leading zero preserved exactly: "${res.body.data.phone}"`);
      createdTechIds.push(res.body.data.id);
      if (i === 0) firstCreatedTechId = res.body.data.id;
    }

    console.log('\n--- TEST PHASE 4: BACKEND API REJECTION ON EDITING ---');
    // Try updating existing technician with invalid phone "011223"
    const editInvalidRes = await makeRequest(
      'PUT',
      `/technicians/${firstCreatedTechId}`,
      { phone: '011223' },
      ownerToken
    );
    assert(
      editInvalidRes.status === 400 || editInvalidRes.status === 422,
      'Backend PUT /technicians/:id strictly rejects updating phone to "011223"'
    );
    assert(editInvalidRes.body.success === false, 'Update response indicates failure');

    // Verify phone was NOT changed in DB
    const checkTech = await Technician.findOne({ id: firstCreatedTechId });
    assert(
      checkTech.phone === acceptCases[0],
      `Phone remains unchanged in database ("${checkTech.phone}")`
    );

    console.log('\n--- TEST PHASE 5: BACKEND API ACCEPTANCE ON EDITING ---');
    const newValidPhone = '01299887766';
    const editValidRes = await makeRequest(
      'PUT',
      `/technicians/${firstCreatedTechId}`,
      { phone: newValidPhone },
      ownerToken
    );
    assert(editValidRes.status === 200, 'Backend PUT /technicians/:id accepts valid new phone with 200');
    assert(editValidRes.body.data.phone === newValidPhone, `Phone updated to "${newValidPhone}"`);

    const checkTechAfter = await Technician.findOne({ id: firstCreatedTechId });
    assert(checkTechAfter.phone === newValidPhone, 'Updated phone persisted in DB with leading zero');

    console.log('\n--- TEST PHASE 6: DUPLICATE PHONE REJECTION ---');
    // Try creating another technician with the same phone
    const duplicateRes = await makeRequest(
      'POST',
      '/technicians',
      {
        name: `فني مكرر ${testSuffix}`,
        phone: newValidPhone,
        specialty: 'غسيل',
      },
      ownerToken
    );
    assert(duplicateRes.status === 409, 'Duplicate technician phone rejected with 409 Conflict');

    console.log('\n--- TEST PHASE 7: DATA AUDIT INTEGRITY ---');
    const allTechsRes = await makeRequest('GET', '/technicians', undefined, ownerToken);
    assert(allTechsRes.status === 200, 'GET /technicians returns 200');
    const techsList = allTechsRes.body.data;
    assert(Array.isArray(techsList), 'Response data is array of technicians');
    for (const t of techsList) {
      if (isValidEgyptianPhone(t.phone)) {
        assert(t.isPhoneValid === true, `Valid phone flagged as isPhoneValid=true for ${t.name}`);
      }
    }

    console.log('\n============================================================');
    console.log('✅ ALL BUG 10 WORKER PHONE VALIDATION TESTS PASSED!');
    console.log('============================================================\n');
  } finally {
    if (createdTechIds.length > 0) {
      await prisma.technician.deleteMany({
        where: { id: { in: createdTechIds } },
      });
      console.log(`Cleaned up ${createdTechIds.length} test technicians.`);
    }
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runWorkerPhoneValidationTest().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
