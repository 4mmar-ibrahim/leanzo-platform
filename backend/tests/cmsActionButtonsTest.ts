import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { AdminUser } from '../src/models/AdminUser.js';
import { CMSContent } from '../src/models/CMSContent.js';

let server: http.Server;
let baseUrl: string;
let adminToken = '';

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
    console.error(`❌ ASSERTION FAILED: ${message}`);
    throw new Error(`Test Failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
  }
}

async function runTest() {
  console.log('========================================================');
  console.log('🧪 CLEANZO CMS DYNAMIC ACTION BUTTONS & DESTINATIONS TEST');
  console.log('========================================================');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address() as any;
      baseUrl = `http://localhost:${addr.port}`;
      resolve();
    });
  });

  try {
    // 1. Setup admin account and login
    await AdminUser.deleteMany({});
    await AdminUser.create({
      username: 'ahmed.owner',
      password: 'password123',
      name: 'Ahmed Cleanzo',
      email: 'ahmed@cleanzo.app',
      role: 'owner',
      status: 'active',
    });

    const loginRes = await makeRequest('POST', '/api/auth/admin/login', {
      username: 'ahmed.owner',
      password: 'password123',
    });
    assert(loginRes.status === 200, 'Admin login succeeded');
    adminToken = loginRes.body.data?.token || loginRes.body.token;

    // 2. Fetch baseline draft content
    const draftRes = await makeRequest('GET', '/api/content/admin/draft', undefined, adminToken);
    assert(draftRes.status === 200, 'Admin fetched draft content');
    const draft = draftRes.body.data;

    // 3. Create Button A, Button B, Button C
    console.log('\n📋 Test Case 1: Create Buttons A, B, C (Booking, Services, Contact)');
    const buttonA = {
      id: 'btn-a',
      label: 'احجز الآن',
      labelEn: 'Book Now',
      enabled: true,
      destinationType: 'booking',
      destinationValue: '/booking',
      order: 0,
      variant: 'primary',
    };
    const buttonB = {
      id: 'btn-b',
      label: 'استكشف خدماتنا',
      labelEn: 'Explore Services',
      enabled: true,
      destinationType: 'services',
      destinationValue: '/services',
      order: 1,
      variant: 'secondary',
    };
    const buttonC = {
      id: 'btn-c',
      label: 'تواصل معنا',
      labelEn: 'Contact Us',
      enabled: true,
      destinationType: 'internal',
      destinationValue: '/contact',
      order: 2,
      variant: 'outline',
    };

    const updateRes = await makeRequest(
      'PUT',
      '/api/content/admin/draft',
      {
        hero: {
          ...draft.hero,
          actionButtons: [buttonA, buttonB, buttonC],
        },
      },
      adminToken
    );
    assert(updateRes.status === 200, 'Draft saved with Buttons A, B, C');

    // Publish to live site
    const pubRes = await makeRequest('POST', '/api/content/admin/publish', {}, adminToken);
    assert(pubRes.status === 200, 'CMS content published successfully');

    // Verify public customer fetch
    const customerFetch = await makeRequest('GET', '/api/content');
    assert(customerFetch.status === 200, 'Public customer website fetches CMS content');
    const pubButtons = customerFetch.body.data.hero.actionButtons;
    assert(Array.isArray(pubButtons) && pubButtons.length === 3, 'Public content contains 3 action buttons');
    assert(pubButtons[0].label === 'احجز الآن' && pubButtons[0].destinationValue === '/booking', 'Button A: "احجز الآن" -> /booking');
    assert(pubButtons[1].label === 'استكشف خدماتنا' && pubButtons[1].destinationValue === '/services', 'Button B: "استكشف خدماتنا" -> /services');
    assert(pubButtons[2].label === 'تواصل معنا' && pubButtons[2].destinationValue === '/contact', 'Button C: "تواصل معنا" -> /contact');

    // 4. Edit Button A label to "ابدأ الآن"
    console.log('\n📋 Test Case 2: Edit Button A Label to "ابدأ الآن" & Verify Live Update');
    const editedButtons = [
      { ...buttonA, label: 'ابدأ الآن' },
      buttonB,
      buttonC,
    ];
    const updateLabelRes = await makeRequest(
      'PUT',
      '/api/content/admin/draft',
      {
        hero: {
          ...draft.hero,
          actionButtons: editedButtons,
        },
      },
      adminToken
    );
    assert(updateLabelRes.status === 200, 'Draft updated with new Button A label');

    await makeRequest('POST', '/api/content/admin/publish', {}, adminToken);

    const customerFetchAfterEdit = await makeRequest('GET', '/api/content');
    const updatedButtons = customerFetchAfterEdit.body.data.hero.actionButtons;
    assert(updatedButtons[0].label === 'ابدأ الآن', 'Live customer website reflects updated label: "ابدأ الآن"');

    // 5. Test Disable Button C
    console.log('\n📋 Test Case 3: Disable Button C & Verify Flag');
    const disabledCButtons = [
      { ...buttonA, label: 'ابدأ الآن' },
      buttonB,
      { ...buttonC, enabled: false },
    ];
    await makeRequest(
      'PUT',
      '/api/content/admin/draft',
      {
        hero: {
          ...draft.hero,
          actionButtons: disabledCButtons,
        },
      },
      adminToken
    );
    await makeRequest('POST', '/api/content/admin/publish', {}, adminToken);

    const customerFetchAfterDisable = await makeRequest('GET', '/api/content');
    const disabledResult = customerFetchAfterDisable.body.data.hero.actionButtons;
    assert(disabledResult[2].enabled === false, 'Button C is marked enabled: false');

    // 6. Security Testing: Unsafe External URL
    console.log('\n📋 Test Case 4: Security Validation (Reject javascript: & unsafe schemes)');
    const maliciousButton = {
      id: 'btn-hack',
      label: 'خبيث',
      enabled: true,
      destinationType: 'external',
      destinationValue: 'javascript:alert(document.cookie)',
    };
    const xssRes = await makeRequest(
      'PUT',
      '/api/content/admin/draft',
      {
        hero: {
          ...draft.hero,
          actionButtons: [maliciousButton],
        },
      },
      adminToken
    );
    assert(xssRes.status === 400, 'Blocked malicious javascript: URL with 400 Bad Request');
    assert(xssRes.body.code === 'UNSAFE_EXTERNAL_URL', 'Error code is UNSAFE_EXTERNAL_URL');

    // 7. Validation Testing: Missing Destination on enabled button
    console.log('\n📋 Test Case 5: Validation (Reject enabled button with empty destination)');
    const emptyDestButton = {
      id: 'btn-empty',
      label: 'زر فارغ',
      enabled: true,
      destinationType: 'internal',
      destinationValue: '   ',
    };
    const emptyDestRes = await makeRequest(
      'PUT',
      '/api/content/admin/draft',
      {
        hero: {
          ...draft.hero,
          actionButtons: [emptyDestButton],
        },
      },
      adminToken
    );
    assert(emptyDestRes.status === 400, 'Blocked empty destination on enabled button with 400');
    assert(emptyDestRes.body.code === 'MISSING_BUTTON_DESTINATION', 'Error code is MISSING_BUTTON_DESTINATION');

    console.log('\n========================================================');
    console.log('🎉 ALL CMS ACTION BUTTON TESTS PASSED SUCCESSFULLY! (100%)');
    console.log('========================================================\n');
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runTest().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
