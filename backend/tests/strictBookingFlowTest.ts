import { getPublicServices } from '../src/controllers/serviceController.js';
import { createBooking } from '../src/controllers/bookingController.js';
import { Service } from '../src/models/Service.js';
import { Booking } from '../src/models/Booking.js';
import { prisma } from '../src/config/prisma.js';

interface MockResponse {
  statusCode: number;
  data: any;
  status(code: number): MockResponse;
  json(body: any): MockResponse;
}

function createMockRes(): MockResponse {
  const res: MockResponse = {
    statusCode: 200,
    data: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: any) {
      this.data = body;
      return this;
    },
  };
  return res;
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 CLEANZO STRICT BOOKING FLOW & CATEGORY TEST SUITE');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`, details || '');
      failed++;
    }
  }

  // Create temporary car & home test services in PostgreSQL to test full mismatch & booking flow
  const testCarServiceId = `test-car-${Date.now()}`;
  const testHomeServiceId = `test-home-${Date.now()}`;

  try {
    await prisma.service.create({
      data: {
        id: testCarServiceId,
        title: 'غسيل واكس متكامل تجريبي',
        titleEn: 'Test Car Wax Service',
        category: 'car',
        price: 250,
        duration: 45,
        serviceDurationMinutes: 45,
        available: true,
        active: true,
        isArchived: false,
        shortDescription: 'وصف تجريبي لخدمة السيارات',
        shortDescriptionEn: 'Test description for car service',
        image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f',
        order: 1,
      },
    });

    await prisma.service.create({
      data: {
        id: testHomeServiceId,
        title: 'تنظيف كنب ومفروشات تجريبي',
        titleEn: 'Test Home Sofa Cleaning',
        category: 'home',
        price: 400,
        duration: 60,
        serviceDurationMinutes: 60,
        available: true,
        active: true,
        isArchived: false,
        shortDescription: 'وصف تجريبي لخدمة المنازل',
        shortDescriptionEn: 'Test description for home service',
        image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f',
        order: 1,
      },
    });

    console.log('📦 Created isolated test services in PostgreSQL for Car and Home.\n');

    // TEST 1: Strict Category Isolation on getPublicServices(?category=car)
    {
      const req: any = { query: { category: 'car' } };
      const res = createMockRes();
      await getPublicServices(req, res as any);

      const returnedServices = res.data?.data || [];
      const allAreCar = returnedServices.length > 0 && returnedServices.every((s: any) => s.category === 'car');
      assert(
        res.statusCode === 200 && allAreCar,
        'GET /services?category=car returns ONLY car services'
      );
    }

    // TEST 2: Strict Category Isolation on getPublicServices(?category=home)
    {
      const req: any = { query: { category: 'home' } };
      const res = createMockRes();
      await getPublicServices(req, res as any);

      const returnedServices = res.data?.data || [];
      const allAreHome = returnedServices.length > 0 && returnedServices.every((s: any) => s.category === 'home');
      assert(
        res.statusCode === 200 && allAreHome,
        'GET /services?category=home returns ONLY home services'
      );
    }

    // TEST 3: Reject booking when serviceId is missing
    {
      const req: any = {
        body: {
          category: 'car',
          date: '2026-09-30',
          time: '10:00',
          address: { city: 'المنيا', area: 'المنيا' },
        },
      };
      const res = createMockRes();
      await createBooking(req, res as any);

      assert(
        res.statusCode === 400 && res.data?.code === 'MISSING_SERVICE',
        'createBooking rejects missing serviceId with 400 MISSING_SERVICE',
        res.data
      );
    }

    // TEST 4: Reject booking when category is missing
    {
      const req: any = {
        body: {
          serviceId: testCarServiceId,
          date: '2026-09-30',
          time: '10:00',
          address: { city: 'المنيا', area: 'المنيا' },
        },
      };
      const res = createMockRes();
      await createBooking(req, res as any);

      assert(
        res.statusCode === 400 && res.data?.code === 'MISSING_CATEGORY',
        'createBooking rejects missing category with 400 MISSING_CATEGORY',
        res.data
      );
    }

    // TEST 5: Reject booking with invalid category
    {
      const req: any = {
        body: {
          serviceId: testCarServiceId,
          category: 'yacht',
          date: '2026-09-30',
          time: '10:00',
          address: { city: 'المنيا', area: 'المنيا' },
        },
      };
      const res = createMockRes();
      await createBooking(req, res as any);

      assert(
        res.statusCode === 400 && res.data?.code === 'INVALID_CATEGORY',
        'createBooking rejects invalid category with 400 INVALID_CATEGORY',
        res.data
      );
    }

    // TEST 6: Reject booking when service does not exist
    {
      const req: any = {
        body: {
          serviceId: 'non-existent-service-uuid',
          category: 'car',
          date: '2026-09-30',
          time: '10:00',
          address: { city: 'المنيا', area: 'المنيا' },
        },
      };
      const res = createMockRes();
      await createBooking(req, res as any);

      assert(
        res.statusCode === 404 && res.data?.code === 'SERVICE_NOT_FOUND',
        'createBooking rejects non-existent service with 404 SERVICE_NOT_FOUND',
        res.data
      );
    }

    // TEST 7: Strict Category Mismatch Prevention (category=car with home service)
    {
      const req: any = {
        body: {
          serviceId: testHomeServiceId,
          category: 'car', // Tampered category!
          date: '2026-09-30',
          time: '10:00',
          address: { city: 'المنيا', area: 'المنيا' },
          customerPhone: '01000000001',
        },
      };
      const res = createMockRes();
      await createBooking(req, res as any);

      assert(
        res.statusCode === 400 && res.data?.code === 'SERVICE_CATEGORY_MISMATCH',
        'createBooking rejects category mismatch (car category + home service) with 400 SERVICE_CATEGORY_MISMATCH',
        res.data
      );
    }

    // TEST 8: Strict Category Mismatch Prevention (category=home with car service)
    {
      const req: any = {
        body: {
          serviceId: testCarServiceId,
          category: 'home', // Tampered category!
          date: '2026-09-30',
          time: '10:00',
          address: { city: 'المنيا', area: 'المنيا' },
          customerPhone: '01000000002',
        },
      };
      const res = createMockRes();
      await createBooking(req, res as any);

      assert(
        res.statusCode === 400 && res.data?.code === 'SERVICE_CATEGORY_MISMATCH',
        'createBooking rejects category mismatch (home category + car service) with 400 SERVICE_CATEGORY_MISMATCH',
        res.data
      );
    }

    // TEST 9: Inactive service rejection
    {
      await prisma.service.update({
        where: { id: testCarServiceId },
        data: { active: false },
      });

      const req: any = {
        body: {
          serviceId: testCarServiceId,
          category: 'car',
          date: '2026-09-30',
          time: '10:00',
          address: { city: 'المنيا', area: 'المنيا' },
          customerPhone: '01000000003',
        },
      };
      const res = createMockRes();
      await createBooking(req, res as any);

      assert(
        res.statusCode === 400 && res.data?.code === 'SERVICE_UNAVAILABLE',
        'createBooking rejects inactive/disabled service with 400 SERVICE_UNAVAILABLE',
        res.data
      );

      // Reactivate for subsequent tests
      await prisma.service.update({
        where: { id: testCarServiceId },
        data: { active: true },
      });
    }

    // TEST 10: Valid Booking Creation
    {
      const { LocationGovernorate } = await import('../src/models/Location.js');
      let gov = await LocationGovernorate.findOne({ active: true });
      if (!gov) {
        gov = await LocationGovernorate.create({
          id: 'test-gov-minya',
          name: 'المنيا',
          nameEn: 'Minya',
          active: true,
          cities: [{ id: 'test-city-new-minya', name: 'المنيا الجديدة', nameEn: 'New Minya', active: true }],
        });
      }
      const city = gov.cities?.[0];

      const req: any = {
        body: {
          serviceId: testCarServiceId,
          category: 'car',
          date: '2026-09-30',
          time: '11:00',
          address: {
            governorateId: gov.id,
            cityId: city?.id || 'test-city-new-minya',
            area: 'الحي الرابع',
            building: '12',
            floor: '3',
            customerPhone: '01001234567',
          },
          guestName: 'أحمد محمود',
          guestPhone: '01001234567',
        },
      };
      const res = createMockRes();
      await createBooking(req, res as any);

      assert(
        (res.statusCode === 200 || res.statusCode === 201) && res.data?.success === true,
        'createBooking successfully creates booking when category and service match validly',
        res.data
      );

      // Clean up booking record
      if (res.data?.data?.id) {
        await prisma.booking.deleteMany({ where: { id: res.data.data.id } });
      }
    }

    console.log('\n====================================================');
    console.log(`📊 SUMMARY: Passed: ${passed}, Failed: ${failed}`);
    console.log('====================================================');

    if (failed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  } finally {
    // Clean up test services
    try {
      await prisma.service.deleteMany({
        where: { id: { in: [testCarServiceId, testHomeServiceId] } },
      });
    } catch {
      // Ignore
    }
  }
}

runTests();
