import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Service } from '../src/models/Service.js';
import { Offer } from '../src/models/Offer.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { FAQ } from '../src/models/FAQ.js';
import { Technician } from '../src/models/Technician.js';
import { PortfolioItem } from '../src/models/PortfolioItem.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { generateAdminToken } from '../src/utils/jwt.js';

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

async function runSingleSourceOfTruthTests() {
  console.log('\n===============================================================');
  console.log(' CLEANZO — MODIFICATION 07: SINGLE SOURCE OF TRUTH TEST SUITE');
  console.log(' DATABASE -> BACKEND -> ADMIN -> CUSTOMER FRONTEND SYNC');
  console.log('===============================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  // 1. Setup Admin credentials
  let owner = await AdminUser.findOne({ role: 'owner' });
  if (!owner) {
    owner = await AdminUser.create({
      id: `owner-${Date.now()}`,
      name: 'System Owner',
      username: 'test_owner',
      email: 'owner_ssot@cleanzo.com',
      password: 'password123',
      role: 'owner',
      status: 'active',
    });
  }
  ownerToken = generateAdminToken({
    id: owner._id.toString(),
    username: owner.username,
    role: 'owner',
  });

  try {
    // =========================================================================
    // TEST 1: Service Creation, Price Update, & Visibility In Customer Frontend
    // =========================================================================
    console.log('\n--- TEST 1: Service Lifecycle (Database = Single Source of Truth) ---');
    const testServiceId = `srv-ssot-${Date.now()}`;
    const initialPrice = 500;
    const updatedPrice = 650;

    // 1a. Admin creates service
    const createSrvRes = await makeRequest('POST', '/services/admin', {
      id: testServiceId,
      title: 'باقة التلميع الداخلي الملكي',
      titleEn: 'Royal Interior Detailing Package',
      category: 'car',
      price: initialPrice,
      duration: 90,
      description: 'تنظيف بالبخار عالي الضغط وتعقيم أوزون كامل',
      descriptionEn: 'High-pressure steam cleaning and full ozone sterilization',
      available: true,
      popular: true,
    }, ownerToken);
    assert(createSrvRes.status === 201, 'Admin creates service successfully (201)');

    // 1b. Customer gets service from public API
    const custSrvRes = await makeRequest('GET', `/services/${testServiceId}`);
    assert(custSrvRes.status === 200, 'Customer fetches new service directly from DB via public API');
    assert(custSrvRes.body.data.price === initialPrice, `Customer sees exact price from DB: ${initialPrice} EGP`);
    assert(custSrvRes.body.data.category === 'car', 'Customer sees matching category');

    // 1c. Admin updates price to 650
    const updateSrvRes = await makeRequest('PUT', `/services/admin/${testServiceId}`, {
      price: updatedPrice,
    }, ownerToken);
    assert(updateSrvRes.status === 200, 'Admin updates service price in DB');

    // 1d. Customer fetches again -> must immediately see updated price 650
    const custSrvUpdated = await makeRequest('GET', `/services/${testServiceId}`);
    assert(custSrvUpdated.status === 200, 'Customer fetches updated service');
    assert(custSrvUpdated.body.data.price === updatedPrice, `Customer immediately sees updated price: ${updatedPrice} EGP (Strict consistency)`);

    // 1e. Admin sets service to unavailable
    await makeRequest('PUT', `/services/admin/${testServiceId}`, { available: false }, ownerToken);

    // 1f. Customer public list query must NOT return this unavailable service
    const publicList = await makeRequest('GET', '/services?category=car');
    const hasUnavailable = publicList.body.data.some((s: any) => s.id === testServiceId);
    assert(!hasUnavailable, 'Customer public services list excludes unavailable service according to business logic');

    // 1g. Admin list query STILL sees the service
    const adminList = await makeRequest('GET', '/services/admin/all', undefined, ownerToken);
    const adminHasSrv = adminList.body.data.some((s: any) => s.id === testServiceId);
    assert(adminHasSrv, 'Admin dashboard retains complete visibility of all services (both available and disabled)');

    // =========================================================================
    // TEST 2: Coverage Areas & City Management Consistency
    // =========================================================================
    console.log('\n--- TEST 2: Coverage Areas & Cities (Admin -> Database -> Customer) ---');
    const testGovId = `gov-ssot-${Date.now()}`;
    const testCityId = `city-ssot-${Date.now()}`;

    // 2a. Admin creates new Governorate with active city
    const createGovRes = await makeRequest('POST', '/locations/admin', {
      id: testGovId,
      name: 'محافظة العاصمة الإدارية',
      nameEn: 'New Administrative Capital',
      order: 10,
      cities: [
        {
          id: testCityId,
          name: 'حي السفارات',
          nameEn: 'Embassies District',
          active: true,
          order: 1,
        },
        {
          id: `${testCityId}-inactive`,
          name: 'حي غير مغطى حالياً',
          nameEn: 'Uncovered District',
          active: false,
          order: 2,
        },
      ],
    }, ownerToken);
    assert(createGovRes.status === 201, 'Admin creates new Governorate with cities in database');

    // 2b. Customer fetches active locations for Booking Address step
    const activeLocations = await makeRequest('GET', '/locations/active');
    assert(activeLocations.status === 200, 'Customer fetches active locations (200)');
    const customerGov = activeLocations.body.data.find((g: any) => g.id === testGovId);
    assert(!!customerGov, 'Customer immediately sees newly created governorate');
    assert(customerGov.cities.length === 1, 'Customer only sees the active city (filtered at DB/API layer)');
    assert(customerGov.cities[0].id === testCityId, 'Customer sees correct active city "حي السفارات"');

    // 2c. Admin deactivates the city
    await makeRequest('PUT', `/locations/admin/${testGovId}/cities/${testCityId}`, {
      active: false,
    }, ownerToken);

    // 2d. Customer fetches again -> no cities appear under this governorate
    const activeLocationsAfter = await makeRequest('GET', '/locations/active');
    const customerGovAfter = activeLocationsAfter.body.data.find((g: any) => g.id === testGovId);
    assert(customerGovAfter.cities.length === 0, 'Customer view immediately excludes deactivated city');

    // =========================================================================
    // TEST 3: Promotional Offers Consistency
    // =========================================================================
    console.log('\n--- TEST 3: Promotional Offers Sync ---');
    const testOfferId = `off-ssot-${Date.now()}`;
    const testCode = `CLEANZO_${Date.now().toString().slice(-4)}`;

    // 3a. Admin creates offer
    const createOffRes = await makeRequest('POST', '/offers/admin', {
      id: testOfferId,
      title: 'خصم الافتتاح الكبير',
      titleEn: 'Grand Opening Discount',
      code: testCode,
      discountType: 'percentage',
      discountPercentage: 25,
      discountPercent: 25,
      expiresAt: '2028-12-31',
      serviceId: testServiceId,
      serviceCategory: 'car',
      active: true,
      featured: true,
    }, ownerToken);
    assert(createOffRes.status === 201, 'Admin creates promotional offer');

    // 3b. Customer fetches public offers
    const custOffers = await makeRequest('GET', '/offers');
    assert(custOffers.status === 200, 'Customer fetches public offers');
    const foundOffer = custOffers.body.data.find((o: any) => o.code === testCode);
    assert(!!foundOffer, 'Customer immediately sees new offer from database');
    assert((foundOffer.discountPercentage || foundOffer.discountPercent) === 25, 'Customer gets exact discount percentage');

    // 3c. Admin archives offer
    await makeRequest('DELETE', `/offers/admin/${testOfferId}`, undefined, ownerToken);

    // 3d. Customer no longer sees offer
    const custOffersAfter = await makeRequest('GET', '/offers');
    const hasOfferAfter = custOffersAfter.body.data.some((o: any) => o.code === testCode);
    assert(!hasOfferAfter, 'Customer public offers view immediately excludes archived offer');

    // =========================================================================
    // TEST 4: FAQ (Frequently Asked Questions) Sync
    // =========================================================================
    console.log('\n--- TEST 4: FAQs Database Synchronization ---');
    const testFaqId = `faq-ssot-${Date.now()}`;

    // 4a. Admin creates FAQ
    const createFaqRes = await makeRequest('POST', '/faq/admin', {
      id: testFaqId,
      question: 'ما هي مدة تنظيف الصالون بالبخار؟',
      questionEn: 'How long does steam interior detailing take?',
      answer: 'تستغرق الجلسة من 60 إلى 90 دقيقة حسب حجم السيارة.',
      answerEn: 'It takes 60 to 90 minutes depending on vehicle size.',
      category: 'car',
      visible: true,
      order: 1,
    }, ownerToken);
    assert(createFaqRes.status === 201, 'Admin creates FAQ entry');

    // 4b. Customer fetches public FAQs
    const custFaqRes = await makeRequest('GET', '/faq');
    assert(custFaqRes.status === 200, 'Customer fetches public FAQs');
    const foundFaq = custFaqRes.body.data.find((f: any) => f.id === testFaqId);
    assert(!!foundFaq, 'Customer immediately receives newly added FAQ');

    // 4c. Admin edits FAQ answer
    await makeRequest('PUT', `/faq/admin/${testFaqId}`, {
      answer: 'تستغرق الجلسة 75 دقيقة بالضبط مع التعقيم.',
    }, ownerToken);

    // 4d. Customer sees updated answer
    const custFaqUpdated = await makeRequest('GET', '/faq');
    const updatedFaq = custFaqUpdated.body.data.find((f: any) => f.id === testFaqId);
    assert(updatedFaq.answer.includes('75 دقيقة'), 'Customer immediately receives updated FAQ answer from DB');

    // 4e. Admin deletes FAQ
    await makeRequest('DELETE', `/faq/admin/${testFaqId}`, undefined, ownerToken);
    const custFaqDeleted = await makeRequest('GET', '/faq');
    const hasDeletedFaq = custFaqDeleted.body.data.some((f: any) => f.id === testFaqId);
    assert(!hasDeletedFaq, 'Customer public FAQs view immediately removes deleted FAQ');

    // =========================================================================
    // TEST 5: Public Technicians / Team Showcase Sync
    // =========================================================================
    console.log('\n--- TEST 5: Technicians Team Showcase (Public Route Live DB Sync) ---');
    const testTechId = `tech-ssot-${Date.now()}`;

    let createdTechId = '';
    // 5a. Admin creates technician
    const createTechRes = await makeRequest('POST', '/technicians', {
      id: testTechId,
      name: 'محمود عبد السلام',
      nameEn: 'Mahmoud Abdelsalam',
      phone: '01012349988',
      specialty: 'أخصائي ديتيلينج بخار وحماية نانو',
      specialtyEn: 'Steam Detailing & Nano Protection Specialist',
      rating: 4.95,
      completedOrders: 180,
      active: true,
      status: 'available',
    }, ownerToken);
    assert(createTechRes.status === 201 || createTechRes.status === 200, 'Admin creates technician in DB');
    createdTechId = createTechRes.body.data.id;

    // 5b. Customer fetches public team roster via new /api/technicians/public
    const pubTechRes = await makeRequest('GET', '/technicians/public');
    assert(pubTechRes.status === 200, 'Public customer endpoint /api/technicians/public responds (200)');
    const foundTech = pubTechRes.body.data.find((t: any) => t.id === createdTechId);
    assert(!!foundTech, 'Customer /team page receives live technician from database');
    assert(foundTech.name === 'محمود عبد السلام', 'Technician name matches database truth');

    // 5c. Admin deactivates technician
    await makeRequest('PUT', `/technicians/${createdTechId}`, { active: false }, ownerToken);

    // 5d. Customer public endpoint excludes deactivated technician
    const pubTechAfter = await makeRequest('GET', '/technicians/public');
    const hasInactiveTech = pubTechAfter.body.data.some((t: any) => t.id === createdTechId);
    assert(!hasInactiveTech, 'Customer team page immediately removes deactivated technician from public view');

    // =========================================================================
    // TEST 6: Portfolio / Gallery Sync
    // =========================================================================
    console.log('\n--- TEST 6: Portfolio / Gallery Synchronization ---');
    const testGalId = `gal-ssot-${Date.now()}`;

    // 6a. Admin creates portfolio work
    const createGalRes = await makeRequest('POST', '/portfolio/admin', {
      id: testGalId,
      title: 'تلميع سيراميك مرسيدس C200',
      titleEn: 'Mercedes C200 Ceramic Detailing',
      category: 'car',
      image: '/images/mercedes-after.jpg',
      beforeImage: '/images/mercedes-before.jpg',
      afterImage: '/images/mercedes-after.jpg',
      visible: true,
    }, ownerToken);
    assert(createGalRes.status === 201, 'Admin creates portfolio work in MongoDB');

    // 6b. Customer fetches public portfolio
    const pubGalRes = await makeRequest('GET', '/portfolio');
    assert(pubGalRes.status === 200, 'Customer fetches public portfolio (200)');
    const foundGal = pubGalRes.body.data.find((g: any) => g.id === testGalId);
    assert(!!foundGal, 'Customer gallery immediately shows new work from database');

    // 6c. Admin deletes portfolio item
    await makeRequest('DELETE', `/portfolio/admin/${testGalId}`, undefined, ownerToken);
    const pubGalAfter = await makeRequest('GET', '/portfolio');
    const hasGalAfter = pubGalAfter.body.data.some((g: any) => g.id === testGalId);
    assert(!hasGalAfter, 'Customer gallery immediately excludes deleted work');

    // =========================================================================
    // Clean up temporary test entries
    // =========================================================================
    await Service.deleteOne({ id: testServiceId });
    await LocationGovernorate.deleteOne({ id: testGovId });
    await Offer.deleteOne({ id: testOfferId });
    await FAQ.deleteOne({ id: testFaqId });
    if (createdTechId) await Technician.deleteOne({ id: createdTechId });
    await Technician.deleteOne({ id: testTechId });
    await PortfolioItem.deleteOne({ id: testGalId });

    console.log('\n===============================================================');
    console.log(' ✅ ALL TESTS PASSED: SINGLE SOURCE OF TRUTH VERIFIED 100%');
    console.log(' DATABASE = SOURCE OF TRUTH | ZERO SILENT FALLBACKS');
    console.log('===============================================================\n');
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runSingleSourceOfTruthTests().catch((err) => {
  console.error('\n❌ Single Source of Truth Test Suite encountered an error:\n', err);
  process.exit(1);
});
