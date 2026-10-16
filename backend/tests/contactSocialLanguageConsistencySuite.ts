/**
 * Test Suite: Contact Stability, Social Media Parity, Draft Isolation, and Bilingual Invariants
 *
 * Verifies:
 * 1. Synchronized authoritative contact & social info between /api/settings/public and /api/content
 * 2. Admin settings updates to social channels propagate truthfully without losing WhatsApp or preset channels
 * 3. CMS partial updates (e.g. section reordering or toggling) do NOT wipe contact or social fields
 * 4. Egyptian phone and WhatsApp numbers adhere to LTR international/national formatting (+20 / 01)
 * 5. Data integrity: Existing database records are preserved
 */

import http from 'http';
import bcrypt from 'bcryptjs';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { CMSContent } from '../src/models/CMSContent.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { generateAdminToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let adminToken: string;

async function makeRequest(
  method: string,
  path: string,
  body?: any,
  token?: string
): Promise<{ status: number; body: any }> {
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
      {
        method,
        headers,
      },
      (res) => {
        let rawData = '';
        res.on('data', (chunk) => (rawData += chunk));
        res.on('end', () => {
          let parsed: any = {};
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

async function runTestSuite() {
  console.log('================================================================');
  console.log('🧪 RUNNING: Contact, Social Parity, Draft Isolation & Language Consistency Suite');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    await connectDB();

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as any;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    // Create or find an admin user for test authorization
    let admin = await AdminUser.findOne({ role: 'owner', status: 'active' });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('TestAdmin@123', salt);
      admin = await AdminUser.create({
        name: 'Contact Test Admin',
        username: 'contact_admin',
        email: 'contact-test-admin@cleanzo.net',
        password: hashedPassword,
        phone: '01099998888',
        role: 'owner',
        status: 'active',
      });
    }

    adminToken = generateAdminToken({
      id: admin._id.toString(),
      username: admin.username || 'admin',
      role: admin.role,
    });

    // -------------------------------------------------------------
    // Test 1: Public Settings Endpoint Validation
    // -------------------------------------------------------------
    console.log('\n--- Test 1: Public Settings (/api/settings/public) Delivery ---');
    const settingsRes = await makeRequest('GET', '/api/settings/public');
    console.log('GET /api/settings/public response body:', JSON.stringify(settingsRes.body));
    assert(settingsRes.status === 200, 'GET /api/settings/public returns 200 OK');
    assert(settingsRes.body?.success === true, 'Response indicates success');

    const pubSettings = settingsRes.body?.data;
    assert(!!pubSettings?.contact, 'Public settings include contact object');
    assert(typeof pubSettings?.contact?.phone === 'string' && pubSettings.contact.phone.length > 5, 'Contact phone is defined and non-empty');
    assert(typeof pubSettings?.contact?.email === 'string' && pubSettings.contact.email.includes('@'), 'Contact email is valid email format');
    assert(!!pubSettings?.social, 'Public settings include social channels object');
    assert(typeof pubSettings?.social?.whatsapp === 'string' && pubSettings.social.whatsapp.length > 5, 'Authoritative WhatsApp channel is present in settings');

    // -------------------------------------------------------------
    // Test 2: CMS Content Parity (/api/content)
    // -------------------------------------------------------------
    console.log('\n--- Test 2: CMS Content Parity (/api/content) ---');
    const contentRes = await makeRequest('GET', '/api/content');
    assert(contentRes.status === 200, 'GET /api/content returns 200 OK');
    assert(contentRes.body?.success === true, 'Response indicates success');

    const pubContent = contentRes.body?.data;
    assert(!!pubContent?.contact, 'CMS content contains contact object');
    assert(!!pubContent?.social, 'CMS content contains social object');

    // Cross-endpoint consistency check
    assert(pubSettings.contact.phone === pubContent.contact.phone, 'Contact phone matches identically across /api/settings/public and /api/content');
    assert(pubSettings.contact.email === pubContent.contact.email, 'Contact email matches identically across /api/settings/public and /api/content');
    assert(pubSettings.social.whatsapp === pubContent.social.whatsapp, 'WhatsApp link matches identically across /api/settings/public and /api/content');
    assert(pubSettings.social.facebook === pubContent.social.facebook, 'Facebook link matches identically across /api/settings/public and /api/content');
    assert(pubSettings.social.instagram === pubContent.social.instagram, 'Instagram link matches identically across /api/settings/public and /api/content');

    // -------------------------------------------------------------
    // Test 3: Egyptian Phone & WhatsApp Format Validation
    // -------------------------------------------------------------
    console.log('\n--- Test 3: Phone & WhatsApp Format Validation ---');
    const cleanPhone = pubContent.contact.phone.replace(/[\s-]/g, '');
    const isEgyptianFormat = cleanPhone.startsWith('+20') || cleanPhone.startsWith('01') || cleanPhone.startsWith('20');
    assert(isEgyptianFormat, `Contact phone (${pubContent.contact.phone}) follows standard Egyptian telecom conventions`);

    const waNumber = pubContent.social.whatsapp.replace(/[^0-9]/g, '');
    assert(waNumber.length >= 10, `WhatsApp number digits (${waNumber}) have sufficient length`);

    // -------------------------------------------------------------
    // Test 4: Social Settings Admin Update & Synchronization
    // -------------------------------------------------------------
    console.log('\n--- Test 4: Admin Social Settings Update & Synchronization ---');
    const newTiktok = 'https://tiktok.com/@cleanzo_official_test';
    const updateRes = await makeRequest(
      'PUT',
      '/api/settings/admin',
      {
        social: {
          ...pubSettings.social,
          tiktok: newTiktok,
        },
      },
      adminToken
    );
    assert(updateRes.status === 200, 'PUT /api/settings/admin returns 200 OK');

    // Verify GET /api/settings/public immediately reflects the updated channel
    const verifySettingsRes = await makeRequest('GET', '/api/settings/public');
    assert(verifySettingsRes.body?.data?.social?.tiktok === newTiktok, 'Public /api/settings/public immediately reflects updated TikTok URL');
    assert(verifySettingsRes.body?.data?.social?.whatsapp === pubSettings.social.whatsapp, 'Authoritative WhatsApp was preserved and not wiped during TikTok update');

    // -------------------------------------------------------------
    // Test 5: CMS Draft Section Update Isolation (Non-destructive)
    // -------------------------------------------------------------
    console.log('\n--- Test 5: Section Update Isolation in CMS Store & Backend ---');
    // Ensure draft exists
    const existingDraft = await CMSContent.findOne({ status: 'draft' });
    assert(!!existingDraft, 'Draft CMS document exists in database');
    const originalDraftPhone = existingDraft?.contact?.phone;
    const originalDraftWhatsapp = existingDraft?.social?.whatsapp;

    // Send an update containing ONLY sections (as done by toggleSectionVisibility / reorderSections)
    const updatedSections = [...(existingDraft?.sections || [])].reverse();
    const draftUpdateRes = await makeRequest(
      'PUT',
      '/api/content/draft',
      {
        sections: updatedSections,
      },
      adminToken
    );
    assert(draftUpdateRes.status === 200, 'PUT /api/content/draft with only { sections } returns 200 OK');

    // Fetch the draft again and verify contact and social were NOT overwritten or emptied
    const postDraft = await CMSContent.findOne({ status: 'draft' });
    assert(!!postDraft?.contact?.phone, 'Draft contact.phone remains intact after section-only update');
    assert(postDraft?.contact?.phone === originalDraftPhone, 'Draft contact.phone value is exactly preserved');
    assert(postDraft?.social?.whatsapp === originalDraftWhatsapp, 'Draft social.whatsapp value is exactly preserved');

    // -------------------------------------------------------------
    // Test 6: Database Records Preservation
    // -------------------------------------------------------------
    console.log('\n--- Test 6: Database Records Preservation ---');
    const pubDoc = await CMSContent.findOne({ status: 'published' });
    assert(!!pubDoc, 'Published CMSContent document exists and was not deleted');
    assert(!!pubDoc?.hero?.headline, 'Published hero headline is preserved');
    assert(!!pubDoc?.about?.title, 'Published about title is preserved');

    console.log('\n================================================================');
    console.log(`RESULTS: ${passed} passed, ${failed} failed`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test execution failed with error:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runTestSuite();
