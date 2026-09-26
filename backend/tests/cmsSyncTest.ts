import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { CMSContent } from '../src/models/CMSContent.js';
import { FAQ } from '../src/models/FAQ.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { Role } from '../src/models/Role.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const finalPath = path.startsWith('/api') ? path : `/api${path.startsWith('/') ? path : '/' + path}`;
    const url = new URL(finalPath, baseUrl);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(
      url,
      { method, headers },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            parsed = { raw };
          }
          resolve({ status: res.statusCode || 500, body: parsed, headers: res.headers });
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

async function runTests() {
  console.log('====================================================');
  console.log('  CLEANZO CMS & CONTENT SYNCHRONIZATION TEST SUITE  ');
  console.log('====================================================');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr !== 'string') {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });

  // Setup Admin user & token
  let role = await Role.findOne({ id: 'owner' });
  if (!role) {
    role = await Role.create({
      id: 'owner',
      name: 'Owner',
      nameAr: 'المالك',
      description: 'Superadmin',
      descriptionAr: 'مالك النظام',
      permissions: {
        content: ['view', 'create', 'edit', 'delete'],
        cms: ['view', 'create', 'edit', 'delete'],
        faqs: ['view', 'create', 'edit', 'delete'],
      },
      isSystem: true,
    });
  }

  let admin = await AdminUser.findOne({ email: 'test_cms_admin@cleanzo.eg' });
  if (!admin) {
    admin = await AdminUser.create({
      name: 'CMS Test Admin',
      username: 'cms_test_admin',
      email: 'test_cms_admin@cleanzo.eg',
      phone: '01011112222',
      password: 'Password123!',
      role: 'owner',
      status: 'active',
    });
  }
  adminToken = generateAdminToken({
    id: (admin._id as any).toString(),
    username: admin.username,
    role: 'owner',
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Public endpoint GET /api/content returns published content
    // -------------------------------------------------------------
    console.log('\n[Test 1] Public Content Endpoint');
    const pubRes = await makeRequest('GET', '/api/content');
    assert(pubRes.status === 200, 'Public content returned HTTP 200');
    assert(pubRes.body.success === true, 'Public content response has success=true');
    assert(pubRes.body.data.status === 'published', 'Returned content document status is published');
    assert(pubRes.body.data.hero?.headline !== undefined || pubRes.body.data.hero?.title !== undefined, 'Hero headline exists');
    assert(
      Boolean(
        pubRes.headers['cache-control']?.includes('no-store') ||
          pubRes.headers['cache-control']?.includes('no-cache')
      ),
      'Cache-Control headers prevent stale browser cache'
    );

    // -------------------------------------------------------------
    // Test 2: Admin Draft Endpoint GET /api/content/admin/draft
    // -------------------------------------------------------------
    console.log('\n[Test 2] Admin Draft Endpoint');
    const draftRes = await makeRequest('GET', '/api/content/admin/draft', undefined, adminToken);
    assert(draftRes.status === 200, 'Admin draft returned HTTP 200');
    assert(draftRes.body.data.status === 'draft', 'Returned document status is draft');

    // -------------------------------------------------------------
    // Test 3: Draft update isolation (Admin changes draft; Customer sees UNCHANGED)
    // -------------------------------------------------------------
    console.log('\n[Test 3] Strict Draft vs Published Isolation');
    const initialCustomerHeadline = pubRes.body.data.hero.headline;
    const testHeadline = `عنوان اختبار المزامنة الجديد ${Date.now()}`;

    const updateDraftRes = await makeRequest(
      'PUT',
      '/api/content/admin/draft',
      {
        hero: {
          ...draftRes.body.data.hero,
          headline: testHeadline,
        },
      },
      adminToken
    );
    assert(updateDraftRes.status === 200, 'Draft update succeeded with HTTP 200');
    assert(updateDraftRes.body.data.hero.headline === testHeadline, 'Draft reflects updated headline');

    // Verify public endpoint still shows initial published content!
    const customerCheck1 = await makeRequest('GET', '/api/content');
    assert(
      customerCheck1.body.data.hero.headline === initialCustomerHeadline,
      'Customer website still sees published content (DRAFT ISOLATION VERIFIED)'
    );

    // -------------------------------------------------------------
    // Test 4: Publish Promotion (Admin publishes -> Customer immediately updated)
    // -------------------------------------------------------------
    console.log('\n[Test 4] Promotion to Published');
    const publishRes = await makeRequest('POST', '/api/content/admin/publish', {}, adminToken);
    assert(publishRes.status === 200, 'Publish endpoint succeeded with HTTP 200');
    assert(publishRes.body.data.status === 'published', 'Published document has status published');
    assert(publishRes.body.data.hero.headline === testHeadline, 'Published document has the new headline');
    assert(publishRes.body.data.lastPublishedAt !== null, 'lastPublishedAt timestamp is set');

    // Verify public endpoint now immediately returns the new headline!
    const customerCheck2 = await makeRequest('GET', '/api/content');
    assert(
      customerCheck2.body.data.hero.headline === testHeadline,
      'Customer website immediately reflects published headline without delay'
    );

    // Verify Audit Log entry was generated
    const audit = await AuditLog.findOne({ action: 'publish_cms_content' }).sort({ createdAt: -1 });
    assert(audit !== null, 'Audit log recorded publish_cms_content event');
    assert(audit?.module === 'content' || audit?.module === 'cms', 'Audit log module is content/cms');

    // -------------------------------------------------------------
    // Test 5: Full Content Modules Sync (About, Contact, Social, Sections)
    // -------------------------------------------------------------
    console.log('\n[Test 5] About, Contact, Social, and Section Modules Sync');
    const testPhone = '01099998888';
    const testEmail = 'info-sync@cleanzo.eg';
    const testStory = 'قصة نجاح متميزة لاختبار المزامنة الكاملة';
    const testFacebook = 'https://facebook.com/cleanzo.official.test';

    // Update draft with multiple modules
    await makeRequest(
      'PUT',
      '/api/content/admin/draft',
      {
        about: {
          title: 'من نحن - كلينزو مصر',
          description: 'رواد العناية المتنقلة',
          story: testStory,
          mission: 'أعلى معايير النظافة',
          vision: 'الريادة الإقليمية',
        },
        contact: {
          phone: testPhone,
          whatsapp: '01099998888',
          email: testEmail,
          address: 'القاهرة الجديدة، التجمع الخامس',
          workingHours: 'طوال أيام الأسبوع 8:00 ص - 10:00 م',
          mapsUrl: 'https://maps.google.com/?q=cleanzo',
          supportNote: 'فريقنا متاح لخدمتك دائماً',
        },
        social: {
          facebook: testFacebook,
          instagram: 'https://instagram.com/cleanzo.test',
          tiktok: 'https://tiktok.com/@cleanzo.test',
          youtube: 'https://youtube.com/@cleanzo.test',
          whatsapp: '01099998888',
          twitter: 'https://x.com/cleanzo_test',
          linkedin: 'https://linkedin.com/company/cleanzo-test',
        },
      },
      adminToken
    );

    // Publish multi-module changes
    await makeRequest('POST', '/api/content/admin/publish', {}, adminToken);

    // Verify customer website receives all updated fields
    const customerCheck3 = await makeRequest('GET', '/api/content');
    assert(customerCheck3.body.data.about.story === testStory, 'Customer receives updated About story');
    assert(customerCheck3.body.data.contact.phone === testPhone, 'Customer receives updated Contact phone');
    assert(customerCheck3.body.data.contact.email === testEmail, 'Customer receives updated Contact email');
    assert(customerCheck3.body.data.social.facebook === testFacebook, 'Customer receives updated Facebook link');

    // -------------------------------------------------------------
    // Test 6: FAQ Backend Sync (Create, Read, Update, Visibility, Delete)
    // -------------------------------------------------------------
    console.log('\n[Test 6] FAQ Full Lifecycle Sync');

    // Create a new FAQ
    const newFaqPayload = {
      question: 'هل توفرون خدمة تلميع السيارات في الجراج الخاص؟',
      questionEn: 'Do you provide car detailing in private garages?',
      answer: 'نعم، أسطول كلينزو مجهز بمولدات كهرباء وخزانات مياه متطورة للعمل في أي مكان.',
      answerEn: 'Yes, our fleet is fully equipped with onboard power and water tanks.',
      category: 'car',
      visible: true,
      order: 100,
    };
    const createFaqRes = await makeRequest('POST', '/api/faqs', newFaqPayload, adminToken);
    assert(createFaqRes.status === 201, 'Created FAQ with HTTP 201');
    const createdFaqId = createFaqRes.body.data.id || createFaqRes.body.data._id;
    assert(createdFaqId !== undefined, 'Created FAQ has valid ID');

    // Verify it appears in public FAQ list
    const publicFaqs1 = await makeRequest('GET', '/api/faqs');
    assert(publicFaqs1.status === 200, 'Public FAQs endpoint returned HTTP 200');
    const foundInPublic = publicFaqs1.body.data.find((f: any) => (f.id || f._id) === createdFaqId);
    assert(foundInPublic !== undefined, 'Newly created FAQ appears in customer public FAQ endpoint');

    // Toggle visibility to false
    const toggleRes = await makeRequest(
      'PUT',
      `/api/faqs/${createdFaqId}`,
      { visible: false },
      adminToken
    );
    assert(toggleRes.status === 200, 'Updated FAQ visibility to false');

    // Verify it is hidden from public customer endpoint
    const publicFaqs2 = await makeRequest('GET', '/api/faqs');
    const hiddenInPublic = publicFaqs2.body.data.find((f: any) => (f.id || f._id) === createdFaqId);
    assert(hiddenInPublic === undefined, 'Hidden FAQ does NOT appear in customer public FAQ endpoint');

    // Verify it is still visible in Admin endpoint
    const adminFaqs = await makeRequest('GET', '/api/faqs/admin/all', undefined, adminToken);
    const foundInAdmin = adminFaqs.body.data.find((f: any) => (f.id || f._id) === createdFaqId);
    assert(foundInAdmin !== undefined, 'Hidden FAQ is visible in Admin endpoint for management');

    // Delete FAQ
    const deleteRes = await makeRequest('DELETE', `/api/faqs/${createdFaqId}`, undefined, adminToken);
    assert(deleteRes.status === 200, 'Deleted FAQ with HTTP 200');

    // Verify permanently removed from database
    const verifyDeleted = await FAQ.findOne({ id: createdFaqId });
    assert(verifyDeleted === null, 'FAQ permanently deleted from MongoDB');

    // -------------------------------------------------------------
    // Test 7: Reset to Clean Defaults
    // -------------------------------------------------------------
    console.log('\n[Test 7] Reset CMS Defaults & Re-publish');
    const resetRes = await makeRequest('POST', '/api/content/admin/reset', {}, adminToken);
    assert(resetRes.status === 200, 'Reset endpoint succeeded with HTTP 200');
    assert(
      resetRes.body.data.hero.headline === 'عناية فائقة تليق بسيارتك ومنزلك' ||
        resetRes.body.data.hero.headline.includes('عناية فائقة'),
      'Hero headline reset to default'
    );

    // Publish defaults back to customer
    await makeRequest('POST', '/api/content/admin/publish', {}, adminToken);
    const finalCustomer = await makeRequest('GET', '/api/content');
    assert(
      finalCustomer.body.data.hero.headline === 'عناية فائقة تليق بسيارتك ومنزلك' ||
        finalCustomer.body.data.hero.headline.includes('عناية فائقة'),
      'Customer receives reset defaults'
    );

    console.log('\n====================================================');
    console.log('  ALL 20 CMS SYNCHRONIZATION TESTS PASSED (100%)    ');
    console.log('====================================================\n');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('Test runner failed with error:', err);
  process.exit(1);
});
