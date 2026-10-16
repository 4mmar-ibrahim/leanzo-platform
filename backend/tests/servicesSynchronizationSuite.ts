import prisma from '../src/config/prisma.js';
import { getPublicServices, getServiceById } from '../src/controllers/serviceController.js';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

function assert(condition: boolean, name: string, message?: string) {
  if (condition) {
    results.push({ name, passed: true });
    console.log(`  ✅ PASS: ${name}`);
  } else {
    results.push({ name, passed: false, error: message || 'Assertion failed' });
    console.error(`  ❌ FAIL: ${name} - ${message || 'Assertion failed'}`);
  }
}

// Mock Express req/res
function createMockContext(query: any = {}, params: any = {}) {
  let responseData: any = null;
  let statusCode = 200;

  const req = { query, params } as any;
  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      responseData = data;
      return res;
    },
  } as any;

  return { req, res, getData: () => responseData, getStatus: () => statusCode };
}

async function runTests() {
  console.log('🧪 Starting Services Synchronization & Integrity Test Suite...\n');

  try {
    // ----------------------------------------------------
    // Test 1: Exactly 10 canonical services in Database
    // ----------------------------------------------------
    const totalServices = await prisma.service.count({
      where: { isArchived: false },
    });
    assert(totalServices === 10, 'Total canonical active services count is exactly 10', `Expected 10, got ${totalServices}`);

    // ----------------------------------------------------
    // Test 2: Exactly 5 Car and 5 Home services
    // ----------------------------------------------------
    const carServicesInDb = await prisma.service.count({
      where: {
        category: { in: ['car', 'cat-mv2vgjo7', 'cat-car'] },
        isArchived: false,
      },
    });
    assert(carServicesInDb === 5, 'Exactly 5 car services in database', `Expected 5, got ${carServicesInDb}`);

    const homeServicesInDb = await prisma.service.count({
      where: {
        category: { in: ['home', 'cat-mv2vh6ty', 'cat-home'] },
        isArchived: false,
      },
    });
    assert(homeServicesInDb === 5, 'Exactly 5 home services in database', `Expected 5, got ${homeServicesInDb}`);

    // ----------------------------------------------------
    // Test 3: QA Test Addon "تست 1" and Package "هختى" are Deleted
    // ----------------------------------------------------
    const testAddonCount = await prisma.serviceAddon.count({
      where: {
        OR: [
          { name: { contains: 'تست' } },
          { id: '05e8f7e6-91f7-459e-95ab-5098cb020b37' },
        ],
      },
    });
    assert(testAddonCount === 0, 'QA test addon "تست 1" is deleted', `Found ${testAddonCount} test addons`);

    const testPackageCount = await prisma.servicePackage.count({
      where: {
        OR: [
          { name: { contains: 'هختى' } },
          { id: '37c322a0-42c1-46ea-98d3-202ceaaf6278' },
        ],
      },
    });
    assert(testPackageCount === 0, 'QA test package "هختى" is deleted', `Found ${testPackageCount} test packages`);

    // ----------------------------------------------------
    // Test 4: Image and Description quality for Home Rug Wash
    // ----------------------------------------------------
    const rugWash = await prisma.service.findUnique({
      where: { id: 'srv-1791711099194' },
    });
    assert(!!rugWash, 'Rug wash service (srv-1791711099194) exists in DB');
    if (rugWash) {
      assert(
        !rugWash.image.includes('photo-1520340356584-f9917d1eea6f'),
        'Rug wash image is NOT the generic car wash wheel photo',
        `Current image: ${rugWash.image}`
      );
      assert(
        rugWash.description.length > 20 && !['.', '..', '0'].includes(rugWash.description.trim()),
        'Rug wash description is professional and descriptive (not "." or "0")',
        `Current description: "${rugWash.description}"`
      );
    }

    // ----------------------------------------------------
    // Test 5: Service duration accuracy
    // ----------------------------------------------------
    const basicWash = await prisma.service.findUnique({
      where: { id: 'srv-1791711071734' },
    });
    assert(!!basicWash, 'Basic wash service (srv-1791711071734) exists in DB');
    if (basicWash) {
      assert(
        basicWash.duration === 45 && basicWash.serviceDurationMinutes === 45,
        'Basic wash serviceDurationMinutes is 45m (not 60m)',
        `duration: ${basicWash.duration}, serviceDurationMinutes: ${basicWash.serviceDurationMinutes}`
      );
    }

    // ----------------------------------------------------
    // Test 6: Controller getPublicServices returns 10 services
    // ----------------------------------------------------
    const ctxAll = createMockContext();
    await getPublicServices(ctxAll.req, ctxAll.res);
    const dataAll = ctxAll.getData();
    assert(dataAll?.success === true, 'getPublicServices executes successfully');
    assert(dataAll?.data?.length === 10, 'getPublicServices returns all 10 services', `Got ${dataAll?.data?.length}`);

    // ----------------------------------------------------
    // Test 7: Controller filtering by slug ?category=car and ?category=home
    // ----------------------------------------------------
    const ctxCar = createMockContext({ category: 'car' });
    await getPublicServices(ctxCar.req, ctxCar.res);
    const dataCar = ctxCar.getData();
    assert(dataCar?.data?.length === 5, 'getPublicServices(?category=car) returns 5 car services', `Got ${dataCar?.data?.length}`);

    const ctxHome = createMockContext({ category: 'home' });
    await getPublicServices(ctxHome.req, ctxHome.res);
    const dataHome = ctxHome.getData();
    assert(dataHome?.data?.length === 5, 'getPublicServices(?category=home) returns 5 home services', `Got ${dataHome?.data?.length}`);

    // ----------------------------------------------------
    // Test 8: Controller filtering by DB ID ?category=cat-mv2vgjo7
    // ----------------------------------------------------
    const ctxCarId = createMockContext({ category: 'cat-mv2vgjo7' });
    await getPublicServices(ctxCarId.req, ctxCarId.res);
    const dataCarId = ctxCarId.getData();
    assert(dataCarId?.data?.length === 5, 'getPublicServices(?category=cat-mv2vgjo7) returns 5 car services', `Got ${dataCarId?.data?.length}`);

    const ctxHomeId = createMockContext({ category: 'cat-mv2vh6ty' });
    await getPublicServices(ctxHomeId.req, ctxHomeId.res);
    const dataHomeId = ctxHomeId.getData();
    assert(dataHomeId?.data?.length === 5, 'getPublicServices(?category=cat-mv2vh6ty) returns 5 home services', `Got ${dataHomeId?.data?.length}`);

    // ----------------------------------------------------
    // Test 9: Draft / Archived services isolation
    // ----------------------------------------------------
    const tempDraftId = `srv-draft-test-${Date.now()}`;
    await prisma.service.create({
      data: {
        id: tempDraftId,
        category: 'cat-mv2vgjo7',
        title: 'Draft QA Service',
        titleEn: 'Draft QA Service',
        description: 'Test draft service',
        image: 'https://example.com/draft.jpg',
        price: 999,
        available: false, // Draft!
        active: false,
        isArchived: false,
      },
    });

    const ctxAfterDraft = createMockContext({ category: 'car' });
    await getPublicServices(ctxAfterDraft.req, ctxAfterDraft.res);
    const dataAfterDraft = ctxAfterDraft.getData();
    const draftFound = dataAfterDraft?.data?.some((s: any) => s.id === tempDraftId);
    assert(!draftFound, 'Draft service (available: false) is excluded from public services');

    // Clean up draft test service
    await prisma.service.delete({ where: { id: tempDraftId } });

    // ----------------------------------------------------
    // Test 10: Historical bookings remain queryable and intact
    // ----------------------------------------------------
    const bookingsCount = await prisma.booking.count();
    assert(bookingsCount >= 5, 'All historical bookings preserved in database', `Found ${bookingsCount} bookings`);

    const targetBooking = await prisma.booking.findUnique({
      where: { id: 'CLN-2026-000105' },
    });
    assert(!!targetBooking, 'Booking CLN-2026-000105 found in DB');
    if (targetBooking) {
      assert(
        targetBooking.serviceId === 'srv-1791711071734',
        'Booking CLN-2026-000105 accurately maintains reference to srv-1791711071734'
      );
    }

  } catch (err: any) {
    console.error('Fatal test error:', err);
    results.push({ name: 'Suite execution', passed: false, error: err.message });
  }

  // Summary
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`\n========================================`);
  console.log(`🏁 Test Summary: ${passed} Passed, ${failed} Failed, Total: ${results.length}`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
