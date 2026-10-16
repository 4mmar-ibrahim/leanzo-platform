/**
 * Test Suite: Marketing Consistency, Draft Isolation, and Truthful Metrics
 * Tests:
 * 1. Published CMS endpoint completeness (about, contact, social, hero, sections)
 * 2. Contact details consistency across channels
 * 3. Removal of fabricated stats in favor of certified quality standards
 * 4. Draft vs Published isolation
 * 5. Preview mode support
 * 6. Non-deletion of existing database records
 */

import http from 'http';
import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import { CMSContent } from '../src/models/CMSContent.js';

let server: http.Server;
let baseUrl: string;

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

async function runTests() {
  console.log('--- Starting CMS Marketing Consistency & Invariants Test Suite ---');
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
      server.listen(0, () => {
        const addr = server.address() as any;
        baseUrl = `http://localhost:${addr.port}`;
        resolve();
      });
    });

    console.log(`\nTest 1: Published CMS Content API Completeness`);
    const pubRes = await makeRequest('GET', '/api/content');
    assert(pubRes.status === 200, 'GET /api/content returns HTTP 200');
    assert(pubRes.body?.success === true, 'Response marked as success');

    const published = pubRes.body?.data;
    assert(!!published, 'Published payload is not null');
    assert(published?.isDraft === false, 'Published content has isDraft === false');
    assert(!!published?.hero?.headline, 'Hero section has headline');
    assert(!!published?.about?.title, 'About section has title');
    assert(!!published?.contact?.phone, 'Contact section has phone');
    assert(!!published?.contact?.email, 'Contact section has email');
    assert(!!published?.social, 'Social links object is present');
    assert(Array.isArray(published?.sections) && published.sections.length >= 10, 'Canonical sections array is complete');

    console.log(`\nTest 2: Verification of Truthful Guarantees (No Fabricated Stats)`);
    const aboutStats = published?.about?.stats || [];
    assert(Array.isArray(aboutStats), 'About stats is an array');
    const hasFakeCustomerCount = aboutStats.some((s: any) => s.value === '+2,500' || s.value === '+1,800');
    assert(!hasFakeCustomerCount, 'No fabricated customer or booking numbers in about stats');
    const hasQualityPillars = aboutStats.some((s: any) => s.value === '100%' || s.value === 'ECO' || s.value === 'PRO');
    assert(hasQualityPillars, 'About stats contain certified quality pillars and standards');

    console.log(`\nTest 3: Preview Mode Support`);
    const previewRes = await makeRequest('GET', '/api/content?preview=true');
    assert(previewRes.status === 200, 'GET /api/content?preview=true returns HTTP 200');
    assert(previewRes.body?.data?.isDraft === true, 'Preview mode returns isDraft === true');

    console.log(`\nTest 4: Contact Info Consistency`);
    const contact = published?.contact;
    assert(typeof contact?.phone === 'string' && contact.phone.length > 5, 'Contact phone is valid non-empty string');
    assert(typeof contact?.email === 'string' && contact.email.includes('@'), 'Contact email is valid');
    assert(typeof contact?.workingHours === 'string' && contact.workingHours.length > 0, 'Working hours provided');

    console.log(`\nTest 5: Public Reviews API and Data Integrity`);
    const reviewsRes = await makeRequest('GET', '/api/reviews');
    assert(reviewsRes.status === 200, 'GET /api/reviews returns HTTP 200');
    assert(Array.isArray(reviewsRes.body?.data), 'Reviews returned as an array');

    console.log(`\nTest 6: Database Records Integrity`);
    const dbDraft = await CMSContent.findOne({ status: 'draft' });
    const dbPublished = await CMSContent.findOne({ status: 'published' });
    assert(!!dbDraft, 'Draft CMS document exists in database');
    assert(!!dbPublished, 'Published CMS document exists in database');

    console.log('\n--- Summary ---');
    console.log(`Total Passed: ${passed}`);
    console.log(`Total Failed: ${failed}`);

    if (failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Test suite error:', err);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runTests();
