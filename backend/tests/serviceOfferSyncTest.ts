import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Service } from '../src/models/Service.js';
import { Offer } from '../src/models/Offer.js';
import { Booking } from '../src/models/Booking.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { User } from '../src/models/User.js';
import { Role } from '../src/models/Role.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { generateAdminToken, generateCustomerToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let ownerToken: string;
let customerToken: string;
let customerUserId: any;

const testPhone = '01099887766';

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
            const parsed = rawData ? JSON.parse(rawData) : null;
            resolve({ status: res.statusCode || 200, body: parsed });
          } catch (e) {
            resolve({ status: res.statusCode || 200, body: rawData });
          }
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

async function runServiceOfferSyncTests() {
  console.log('\n========================================================================');
  console.log('🚀 CLEANZO - TASK 04: SERVICE & OFFER DELETION SYNCHRONIZATION TEST SUITE');
  console.log('========================================================================\n');

  try {
    await connectDB();
    console.log('Connected to Database successfully.\n');

    server = http.createServer(app);
    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr !== null) {
          baseUrl = `http://127.0.0.1:${addr.port}`;
        }
        resolve();
      });
    });

    console.log(`Test server running at ${baseUrl}\n`);

    // Clean up test data
    await Service.deleteMany({ id: { $regex: /^test-srv-/ } });
    await Offer.deleteMany({ id: { $regex: /^test-off-/ } });
    await Booking.deleteMany({ serviceId: { $regex: /^test-srv-/ } });
    await AdminUser.deleteMany({ username: 'sync_admin_test' });
    await User.deleteMany({ phone: testPhone });

    // Ensure Owner Role
    await Role.deleteMany({ id: 'owner' });
    await Role.create({
      id: 'owner',
      name: 'Owner',
      nameAr: 'المالك',
      description: 'Superadmin',
      descriptionAr: 'مالك النظام',
      permissions: {
        services: ['view', 'create', 'edit', 'delete'],
        offers: ['view', 'create', 'edit', 'delete'],
        bookings: ['view', 'create', 'edit', 'delete'],
        orders: ['view', 'create', 'edit', 'delete'],
      },
    });

    const admin = await AdminUser.create({
      name: 'Sync Admin Tester',
      username: 'sync_admin_test',
      email: 'sync_admin@cleanzo.test',
      phone: '01099998888',
      password: 'hashedpassword123',
      role: 'owner',
      status: 'active',
    });

    ownerToken = generateAdminToken({
      id: admin._id.toString(),
      username: admin.username,
      role: 'owner',
    });

    const customer = await User.create({
      name: 'Customer Sync Tester',
      phone: testPhone,
      password: 'password123',
      email: 'customer_sync@test.com',
      status: 'active',
      addresses: [],
    });
    customerUserId = customer._id;

    customerToken = generateCustomerToken({
      id: customer._id.toString(),
      phone: customer.phone,
    });

    // Ensure active location for booking
    let gov = await LocationGovernorate.findOne({ id: 'cairo' });
    if (!gov) {
      gov = await LocationGovernorate.create({
        id: 'cairo',
        name: 'القاهرة',
        nameEn: 'Cairo',
        active: true,
        order: 1,
        cities: [
          { id: 'nasr-city', name: 'مدينة نصر', nameEn: 'Nasr City', active: true, order: 1 },
        ],
      });
    }

    // =========================================================================
    // TEST 1: Service Creation & Public Sourcing
    // =========================================================================
    console.log('📌 Test 1: Service Creation & Public API Availability');
    const srv1Data = {
      id: 'test-srv-1',
      category: 'car',
      title: 'غسيل واكس سوبريم تجريبي',
      titleEn: 'Test Supreme Wax Wash',
      price: 350,
      duration: 45,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 15,
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
    };

    const createSrvRes = await makeRequest('POST', '/services/admin', srv1Data, ownerToken);
    assert(createSrvRes.status === 201, 'Admin successfully creates service (201)');
    assert(createSrvRes.body.data.id === 'test-srv-1', 'Created service returned with correct ID');

    // Public list
    const publicSrvList = await makeRequest('GET', '/services');
    assert(publicSrvList.status === 200, 'Public services returned 200');
    const foundSrv1 = (publicSrvList.body.data || []).find((s: any) => s.id === 'test-srv-1');
    assert(!!foundSrv1, 'Created service is visible in public services list');

    // Direct detail
    const directSrv1 = await makeRequest('GET', '/services/test-srv-1');
    assert(directSrv1.status === 200, 'Direct endpoint GET /services/test-srv-1 returns 200');
    assert(directSrv1.body.data.title === 'غسيل واكس سوبريم تجريبي', 'Service details match');

    // =========================================================================
    // TEST 2: Admin Deletes Service (Soft Delete / Archive Sync)
    // =========================================================================
    console.log('\n📌 Test 2: Admin Deletes Service (Database & API Synchronization)');
    const deleteSrvRes = await makeRequest('DELETE', '/services/admin/test-srv-1', undefined, ownerToken);
    assert(deleteSrvRes.status === 200, 'Admin DELETE /services/admin/test-srv-1 returns 200');

    // Check DB document state
    const srv1Doc = await Service.findOne({ id: 'test-srv-1' });
    assert(!!srv1Doc, 'Service document is safely preserved for historical records');
    assert(srv1Doc?.isArchived === true, 'Database has isArchived: true');
    assert(srv1Doc?.available === false, 'Database has available: false');

    // Check Public List
    const publicSrvAfterDelete = await makeRequest('GET', '/services');
    const srv1StillInPublic = (publicSrvAfterDelete.body.data || []).some((s: any) => s.id === 'test-srv-1');
    assert(!srv1StillInPublic, 'Deleted service is IMMEDIATELY removed from public services list');

    // Check Direct URL
    const directSrvAfterDelete = await makeRequest('GET', '/services/test-srv-1');
    assert(directSrvAfterDelete.status === 404, 'Direct URL GET /services/test-srv-1 returns 404 Not Found');
    assert(directSrvAfterDelete.body.code === 'SERVICE_NOT_FOUND', 'Returns error code SERVICE_NOT_FOUND');

    // =========================================================================
    // TEST 3: Booking Protection for Deleted/Archived Service
    // =========================================================================
    console.log('\n📌 Test 3: Backend Booking Protection (Blocks direct booking of deleted service)');
    const bookingPayloadDeletedSrv = {
      serviceId: 'test-srv-1',
      date: '2026-10-15',
      time: '11:00',
      address: {
        label: 'المنزل',
        governorate: 'القاهرة',
        governorateId: 'cairo',
        city: 'مدينة نصر',
        cityId: 'nasr-city',
        area: 'حي السفارات',
        building: '10',
        floor: '4',
        apartment: '402',
      },
      notes: 'Testing deleted service booking prevention',
    };

    const bookDeletedRes = await makeRequest('POST', '/bookings', bookingPayloadDeletedSrv, customerToken);
    assert(bookDeletedRes.status === 400, 'Direct booking of deleted service rejected with 400');
    assert(bookDeletedRes.body.code === 'SERVICE_UNAVAILABLE', 'Returns SERVICE_UNAVAILABLE error code');

    // =========================================================================
    // TEST 4: Historical Order Snapshot Preservation
    // =========================================================================
    console.log('\n📌 Test 4: Historical Order Snapshot Immutability');
    // Create service 2
    const srv2Data = {
      id: 'test-srv-2',
      category: 'car',
      title: 'تلميع ساطع بالنانو',
      titleEn: 'Nano Bright Polish',
      price: 500,
      duration: 60,
      serviceDurationMinutes: 60,
      travelTimeMinutes: 15,
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
    };
    await makeRequest('POST', '/services/admin', srv2Data, ownerToken);

    // Create a real booking with service 2
    const bookingPayloadActiveSrv = {
      serviceId: 'test-srv-2',
      date: '2026-10-16',
      time: '14:00',
      address: {
        label: 'العمل',
        governorate: 'القاهرة',
        governorateId: 'cairo',
        city: 'مدينة نصر',
        cityId: 'nasr-city',
        area: 'عباس العقاد',
        building: '25',
        floor: '2',
        apartment: '201',
      },
      notes: 'Testing snapshot immutability',
    };

    const activeBookingRes = await makeRequest('POST', '/bookings', bookingPayloadActiveSrv, customerToken);
    assert(activeBookingRes.status === 201, 'Booking created successfully for active service (201)');
    const createdBookingId = activeBookingRes.body.data.id;
    assert(!!createdBookingId, 'Order number generated');

    // Verify snapshot in created booking
    const bookingDocBeforeDelete = await Booking.findOne({ id: createdBookingId });
    assert(!!bookingDocBeforeDelete?.serviceSnapshot, 'Booking contains serviceSnapshot');
    assert(bookingDocBeforeDelete?.serviceSnapshot?.title === 'تلميع ساطع بالنانو', 'Service title correctly snapshotted');
    assert(bookingDocBeforeDelete?.serviceSnapshot?.price === 500, 'Service price correctly snapshotted');

    // Now Admin deletes service 2
    await makeRequest('DELETE', '/services/admin/test-srv-2', undefined, ownerToken);

    // Verify the historical booking remains untouched and displays full snapshot
    const bookingDocAfterDelete = await Booking.findOne({ id: createdBookingId });
    assert(!!bookingDocAfterDelete, 'Historical booking remains intact in database');
    assert(bookingDocAfterDelete?.serviceSnapshot?.title === 'تلميع ساطع بالنانو', 'Historical serviceSnapshot title unmodified');
    assert(bookingDocAfterDelete?.serviceSnapshot?.price === 500, 'Historical serviceSnapshot price unmodified');

    // Query booking via API
    const getBookingRes = await makeRequest('GET', `/bookings/${createdBookingId}`, undefined, customerToken);
    assert(getBookingRes.status === 200, 'Customer order tracking API returns 200 for historical order');
    assert(getBookingRes.body.data.serviceSnapshot.title === 'تلميع ساطع بالنانو', 'API returns snapshot data without failure');

    // =========================================================================
    // TEST 5: Offer Lifecycle & Deletion Synchronization
    // =========================================================================
    console.log('\n📌 Test 5: Offer Deletion Synchronization');
    const offerData = {
      id: 'test-off-1',
      title: 'عرض نهاية الصيف الحصري',
      titleEn: 'End of Summer Special',
      code: 'SUMMER_SYNC',
      discountPercentage: 20,
      expiresAt: '2026-12-31',
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
    };

    const createOfferRes = await makeRequest('POST', '/offers/admin', offerData, ownerToken);
    assert(createOfferRes.status === 201, 'Admin successfully creates offer (201)');

    // Public offers list
    const publicOffersBefore = await makeRequest('GET', '/offers');
    const foundOfferBefore = (publicOffersBefore.body.data || []).find((o: any) => o.code === 'SUMMER_SYNC');
    assert(!!foundOfferBefore, 'Offer is visible in public offers list');

    // Delete offer
    const deleteOfferRes = await makeRequest('DELETE', '/offers/admin/test-off-1', undefined, ownerToken);
    assert(deleteOfferRes.status === 200, 'Admin DELETE /offers/admin/test-off-1 returns 200');

    // Check DB document
    const offerDoc = await Offer.findOne({ id: 'test-off-1' });
    assert(!!offerDoc, 'Offer document preserved in database for audit');
    assert(offerDoc?.isArchived === true, 'Offer marked isArchived: true');
    assert(offerDoc?.active === false, 'Offer marked active: false');

    // Public list after deletion
    const publicOffersAfter = await makeRequest('GET', '/offers');
    const offerStillInPublic = (publicOffersAfter.body.data || []).some((o: any) => o.code === 'SUMMER_SYNC');
    assert(!offerStillInPublic, 'Deleted offer is IMMEDIATELY removed from public offers list');

    // =========================================================================
    // TEST 6: Disable / Re-enable (No Conflict with Deletion)
    // =========================================================================
    console.log('\n📌 Test 6: Disable vs Delete Distinction (Toggling available/active)');
    const srv3Data = {
      id: 'test-srv-3',
      category: 'home',
      title: 'تنظيف عميق للمفروشات',
      titleEn: 'Deep Upholstery Cleaning',
      price: 400,
      duration: 45,
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
    };
    await makeRequest('POST', '/services/admin', srv3Data, ownerToken);

    // Disable (Toggle available to false)
    const disableRes = await makeRequest('PUT', '/services/admin/test-srv-3', { available: false }, ownerToken);
    assert(disableRes.status === 200, 'PUT /services/admin/test-srv-3 returns 200');

    // Check DB state
    const srv3Disabled = await Service.findOne({ id: 'test-srv-3' });
    assert(srv3Disabled?.available === false, 'available: false');
    assert(srv3Disabled?.isArchived === false, 'isArchived remains false (not deleted!)');

    // Check public list (should be hidden)
    const listWhileDisabled = await makeRequest('GET', '/services');
    assert(!listWhileDisabled.body.data.some((s: any) => s.id === 'test-srv-3'), 'Disabled service is hidden from public list');

    // Re-enable (Toggle available back to true)
    const reEnableRes = await makeRequest('PUT', '/services/admin/test-srv-3', { available: true }, ownerToken);
    assert(reEnableRes.status === 200, 'PUT /services/admin/test-srv-3 re-enable returns 200');

    const srv3ReEnabled = await Service.findOne({ id: 'test-srv-3' });
    assert(srv3ReEnabled?.available === true, 'available: true restored');
    assert(srv3ReEnabled?.isArchived === false, 'isArchived still false');

    const listWhileReEnabled = await makeRequest('GET', '/services');
    assert(listWhileReEnabled.body.data.some((s: any) => s.id === 'test-srv-3'), 'Re-enabled service reappears in public list');

    // =========================================================================
    // TEST 7: Cascade Invalidation of Linked Offers
    // =========================================================================
    console.log('\n📌 Test 7: Cascade Invalidation of Linked Offers upon Service Deletion');
    const srv4Data = {
      id: 'test-srv-4',
      category: 'car',
      title: 'باقة غسيل المحرك المتخصصة',
      titleEn: 'Engine Bay Detailing',
      price: 250,
      duration: 30,
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
    };
    await makeRequest('POST', '/services/admin', srv4Data, ownerToken);

    const linkedOfferData = {
      id: 'test-off-linked',
      serviceId: 'test-srv-4',
      title: 'خصم خاص على غسيل المحرك',
      titleEn: 'Engine Wash Discount',
      code: 'ENGINE_DEAL',
      discountPercentage: 15,
      expiresAt: '2026-12-31',
      image: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d',
    };
    await makeRequest('POST', '/offers/admin', linkedOfferData, ownerToken);

    // Delete the parent service
    await makeRequest('DELETE', '/services/admin/test-srv-4', undefined, ownerToken);

    // Verify linked offer was automatically archived
    const linkedOfferDoc = await Offer.findOne({ id: 'test-off-linked' });
    assert(linkedOfferDoc?.isArchived === true, 'Linked offer automatically archived upon service deletion');
    assert(linkedOfferDoc?.active === false, 'Linked offer automatically deactivated');

    const publicOffersCascade = await makeRequest('GET', '/offers');
    assert(!publicOffersCascade.body.data.some((o: any) => o.code === 'ENGINE_DEAL'), 'Linked offer removed from public offers list');

    // =========================================================================
    // TEST 8: Real Database Response & Non-existent Item Handling
    // =========================================================================
    console.log('\n📌 Test 8: Real Database Responses (No Fake Success Messages)');
    const deleteNonExistent = await makeRequest('DELETE', '/services/admin/non-existent-srv-999', undefined, ownerToken);
    assert(deleteNonExistent.status === 404, 'Deleting non-existent service returns real 404 (not fake success)');

    const deleteNonExistentOffer = await makeRequest('DELETE', '/offers/admin/non-existent-off-999', undefined, ownerToken);
    assert(deleteNonExistentOffer.status === 404, 'Deleting non-existent offer returns real 404 (not fake success)');

    console.log('\n========================================================================');
    console.log('🎉 ALL 20 TEST ASSERTIONS PASSED WITH 100% SUCCESS!');
    console.log('========================================================================\n');
  } catch (err: any) {
    console.error('\n❌ TEST SUITE RUNNER ENCOUNTERED AN ERROR:');
    console.error(err);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runServiceOfferSyncTests();
