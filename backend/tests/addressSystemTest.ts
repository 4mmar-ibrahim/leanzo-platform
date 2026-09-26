import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { LocationGovernorate } from '../src/models/Location.js';
import { CustomerAddress } from '../src/models/CustomerAddress.js';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { AdminUser } from '../src/models/AdminUser.js';
import { User } from '../src/models/User.js';
import { Role } from '../src/models/Role.js';
import { generateAdminToken, generateCustomerToken } from '../src/utils/jwt.js';

let server: http.Server;
let baseUrl: string;
let ownerToken: string;
let customerTokenA: string;
let customerTokenB: string;
let customerAId: any;
let customerBId: any;

const phoneCustomerA = '01011112222';
const phoneCustomerB = '01033334444';
const serviceId = 'test-car-wash';

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

    req.on('error', (err) => reject(err));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runAddressSystemTests() {
  console.log('\n===============================================================');
  console.log('🧪 CLEANZO TASK 03 — DYNAMIC ADDRESS & LOCATION SYSTEM VERIFICATION');
  console.log('===============================================================\n');

  await connectDB();

  // Start test server on random port
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, () => {
      const address = server.address() as any;
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });

  try {
    // -------------------------------------------------------------
    // Setup Test Data
    // -------------------------------------------------------------
    console.log('⚙️ Setting up clean environment and test actors...');

    await Role.deleteMany({});
    await Role.create({
      id: 'owner',
      name: 'Owner',
      nameAr: 'المالك',
      description: 'Superadmin',
      descriptionAr: 'مالك النظام',
      permissions: {
        locations: ['view', 'create', 'edit', 'delete'],
        bookings: ['view', 'create', 'edit', 'delete'],
      },
    });

    await AdminUser.deleteMany({});
    const owner = await AdminUser.create({
      name: 'Owner Test',
      username: 'owner_test',
      email: 'owner@test.com',
      phone: '01000000001',
      password: 'password123',
      role: 'owner',
      status: 'active',
    });
    ownerToken = generateAdminToken({
      id: owner._id.toString(),
      username: owner.username,
      role: 'owner',
    });

    await User.deleteMany({});
    const userA = await User.create({
      name: 'Customer Alice',
      phone: phoneCustomerA,
      password: 'password123',
      email: 'alice@test.com',
      status: 'active',
      addresses: [],
    });
    customerAId = userA._id;
    customerTokenA = generateCustomerToken({
      id: userA._id.toString(),
      phone: userA.phone,
    });

    const userB = await User.create({
      name: 'Customer Bob',
      phone: phoneCustomerB,
      password: 'password123',
      email: 'bob@test.com',
      status: 'active',
      addresses: [],
    });
    customerBId = userB._id;
    customerTokenB = generateCustomerToken({
      id: userB._id.toString(),
      phone: userB.phone,
    });

    // Create Service for booking tests
    await Service.deleteMany({ id: serviceId });
    await Service.create({
      id: serviceId,
      category: 'car',
      title: 'غسيل سيارات تجريبي',
      titleEn: 'Test Car Wash',
      image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?w=800',
      price: 250,
      duration: 60,
      serviceDurationMinutes: 45,
      travelTimeMinutes: 15,
      totalOccupancyMinutes: 60,
      available: true,
    });

    // Seed clean hierarchical test locations
    await LocationGovernorate.deleteMany({});
    await LocationGovernorate.create([
      {
        id: 'cairo',
        name: 'القاهرة',
        nameEn: 'Cairo',
        active: true,
        order: 1,
        cities: [
          { id: 'nasr-city', name: 'مدينة نصر', nameEn: 'Nasr City', active: true, order: 1, areas: [] },
          { id: 'new-cairo', name: 'القاهرة الجديدة', nameEn: 'New Cairo', active: true, order: 2, areas: [] },
          { id: 'maadi', name: 'المعادي', nameEn: 'Maadi', active: true, order: 3, areas: [] },
        ],
      },
      {
        id: 'giza',
        name: 'الجيزة',
        nameEn: 'Giza',
        active: true,
        order: 2,
        cities: [
          { id: 'haram', name: 'الهرم', nameEn: 'Haram', active: true, order: 1, areas: [] },
          { id: 'october', name: '6 أكتوبر', nameEn: '6th of October', active: true, order: 2, areas: [] },
          { id: 'sheikh-zayed', name: 'الشيخ زايد', nameEn: 'Sheikh Zayed', active: true, order: 3, areas: [] },
        ],
      },
      {
        id: 'alexandria',
        name: 'الإسكندرية',
        nameEn: 'Alexandria',
        active: true,
        order: 3,
        cities: [
          { id: 'smouha', name: 'سموحة', nameEn: 'Smouha', active: true, order: 1, areas: [] },
        ],
      },
      {
        id: 'minya',
        name: 'المنيا',
        nameEn: 'El Minya',
        active: true,
        order: 4,
        cities: [
          { id: 'new-minya', name: 'المنيا الجديدة', nameEn: 'New Minya', active: true, order: 1, areas: [] },
        ],
      },
    ]);

    await CustomerAddress.deleteMany({});
    await Booking.deleteMany({});

    console.log('✓ Actors, hierarchical locations, and test services seeded.\n');

    // -------------------------------------------------------------
    // TEST SUITE EXECUTION
    // -------------------------------------------------------------

    // TEST 1: First-Time Customer has 0 saved addresses
    console.log('🔹 Test 1: First-time customer returns empty address list (No phantom cards)');
    const resT1 = await makeRequest('GET', '/addresses', undefined, customerTokenA);
    assert(resT1.status === 200, 'GET /api/addresses returns 200');
    assert(Array.isArray(resT1.body.data), 'Returns an array');
    assert(resT1.body.data.length === 0, 'First-time customer has exactly 0 saved addresses');

    // TEST 2: Public active locations API returns only active governorates & cities
    console.log('\n🔹 Test 2: Public active locations returns only active governorates & cities');
    const resT2 = await makeRequest('GET', '/locations/active');
    assert(resT2.status === 200, 'GET /api/locations/active returns 200');
    const activeGovs = resT2.body.data;
    assert(activeGovs.length === 4, 'Returns 4 active governorates');
    const cairo = activeGovs.find((g: any) => g.id === 'cairo');
    assert(cairo !== undefined, 'Cairo exists in active list');
    assert(cairo.cities.length === 3, 'Cairo has 3 active cities (Nasr City, New Cairo, Maadi)');

    // TEST 3: Cities by governorate endpoint returns only cities for that governorate
    console.log('\n🔹 Test 3: Cities by governorate returns only matching cities');
    const resT3 = await makeRequest('GET', '/locations/giza/cities');
    assert(resT3.status === 200, 'GET /api/locations/giza/cities returns 200');
    const gizaCities = resT3.body.data;
    assert(gizaCities.length === 3, 'Giza has 3 cities (Haram, October, Zayed)');
    assert(gizaCities.some((c: any) => c.id === 'haram'), 'Haram is in Giza');
    assert(!gizaCities.some((c: any) => c.id === 'nasr-city'), 'Nasr City is NOT in Giza');

    // TEST 4: Customer A adds their first address -> auto-marked as default
    console.log('\n🔹 Test 4: Customer A adds first address (auto-marked default, snapshots populated)');
    const resT4 = await makeRequest(
      'POST',
      '/addresses',
      {
        label: 'المنزل',
        governorateId: 'cairo',
        cityId: 'nasr-city',
        area: 'شارع الطيران',
        building: 'عمارة 12',
        floor: '4',
        apartment: '8',
        landmark: 'أمام مسجد رابعة',
        notes: 'يرجى الاتصال عند الوصول',
      },
      customerTokenA
    );
    assert(resT4.status === 201, 'POST /api/addresses returns 201');
    const addressA1 = resT4.body.data;
    assert(addressA1.governorateId === 'cairo', 'Stores governorateId relational key');
    assert(addressA1.cityId === 'nasr-city', 'Stores cityId relational key');
    assert(addressA1.governorateNameSnapshot === 'القاهرة', 'Stores immutable governorateNameSnapshot');
    assert(addressA1.cityNameSnapshot === 'مدينة نصر', 'Stores immutable cityNameSnapshot');
    assert(addressA1.isDefault === true, 'First address is automatically set as isDefault: true');
    assert(addressA1.customerId === customerAId.toString(), 'Address is owned by Customer A');

    // TEST 5: Customer A adds a second address -> isDefault is false
    console.log('\n🔹 Test 5: Customer A adds a second address (isDefault: false)');
    const resT5 = await makeRequest(
      'POST',
      '/addresses',
      {
        label: 'العمل',
        governorateId: 'cairo',
        cityId: 'new-cairo',
        area: 'شارع التسعين الشمالي',
        building: 'مجمع البنوك',
      },
      customerTokenA
    );
    assert(resT5.status === 201, 'POST second address returns 201');
    const addressA2 = resT5.body.data;
    assert(addressA2.isDefault === false, 'Second address isDefault is false');

    // TEST 6: Customer A sets second address as default -> first address loses default atomically
    console.log('\n🔹 Test 6: Setting second address as default updates defaults atomically');
    const resT6 = await makeRequest('PATCH', `/addresses/${addressA2._id}/default`, {}, customerTokenA);
    assert(resT6.status === 200, 'PATCH default returns 200');
    const checkA1 = await CustomerAddress.findById(addressA1._id);
    const checkA2 = await CustomerAddress.findById(addressA2._id);
    assert(checkA2?.isDefault === true, 'Address A2 is now default');
    assert(checkA1?.isDefault === false, 'Address A1 is no longer default');

    // TEST 7: Customer A updates an address
    console.log('\n🔹 Test 7: Customer A updates address details');
    const resT7 = await makeRequest(
      'PATCH',
      `/addresses/${addressA1._id}`,
      {
        building: 'عمارة 14 الجديدة',
        notes: 'تم تغيير البوابة',
      },
      customerTokenA
    );
    assert(resT7.status === 200, 'PATCH address returns 200');
    assert(resT7.body.data.building === 'عمارة 14 الجديدة', 'Building updated successfully');

    // TEST 8: Anti-IDOR: Customer B cannot update Customer A's address
    console.log('\n🔹 Test 8: Anti-IDOR: Customer B cannot modify Customer A address');
    const resT8 = await makeRequest(
      'PATCH',
      `/addresses/${addressA1._id}`,
      {
        building: 'HACKED BUILDING',
      },
      customerTokenB
    );
    assert(resT8.status === 403, 'PATCH Customer A address by Customer B returns 403 FORBIDDEN_IDOR');

    // TEST 9: Anti-IDOR: Customer B cannot set Customer A's address as default
    console.log('\n🔹 Test 9: Anti-IDOR: Customer B cannot set Customer A address as default');
    const resT9 = await makeRequest('PATCH', `/addresses/${addressA1._id}/default`, {}, customerTokenB);
    assert(resT9.status === 403, 'PATCH default Customer A address by Customer B returns 403');

    // TEST 10: Anti-IDOR: Customer B cannot delete Customer A's address
    console.log('\n🔹 Test 10: Anti-IDOR: Customer B cannot delete Customer A address');
    const resT10 = await makeRequest('DELETE', `/addresses/${addressA1._id}`, {}, customerTokenB);
    assert(resT10.status === 403, 'DELETE Customer A address by Customer B returns 403');

    // TEST 11: Anti-IDOR in Booking: Customer B cannot book with Customer A's addressId
    console.log('\n🔹 Test 11: Anti-IDOR in Booking: Customer B cannot book with Customer A addressId');
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const resT11 = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId,
        date: tomorrowStr,
        time: '10:00 AM',
        address: {
          addressId: addressA1._id,
        },
      },
      customerTokenB
    );
    assert(resT11.status === 403, 'Booking with foreign addressId returns 403 FORBIDDEN_IDOR');

    // TEST 12: Mismatched Location: Booking with Alexandria + Nasr City (Cairo) is rejected
    console.log('\n🔹 Test 12: Mismatched governorate & city rejected by backend');
    const resT12 = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId,
        date: tomorrowStr,
        time: '11:00 AM',
        address: {
          governorateId: 'alexandria',
          cityId: 'nasr-city', // belongs to Cairo, not Alexandria!
          area: 'شارع تجريبي',
        },
      },
      customerTokenA
    );
    assert(resT12.status === 422, 'Mismatched location pair returns 422 Unprocessable Entity');
    assert(resT12.body.code === 'LOCATION_CITY_INVALID', 'Error code is LOCATION_CITY_INVALID');

    // TEST 13: Non-existent Governorate rejected
    console.log('\n🔹 Test 13: Non-existent governorate rejected');
    const resT13 = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId,
        date: tomorrowStr,
        time: '12:00 PM',
        address: {
          governorateId: 'fake-governorate',
          cityId: 'fake-city',
          area: 'شارع وهمي',
        },
      },
      customerTokenA
    );
    assert(resT13.status === 422, 'Non-existent governorate returns 422');

    // TEST 14: Valid Booking with Saved Address succeeds & preserves immutable snapshots
    console.log('\n🔹 Test 14: Valid Booking with Saved Address succeeds with immutable snapshot');
    const resT14 = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId,
        date: tomorrowStr,
        time: '01:00 PM',
        address: {
          addressId: addressA2._id,
        },
      },
      customerTokenA
    );
    assert(resT14.status === 201, 'Booking with valid saved address returns 201');
    const booking1 = resT14.body.data;
    assert(booking1.address.governorateId === 'cairo', 'Booking has governorateId');
    assert(booking1.address.cityId === 'new-cairo', 'Booking has cityId');
    assert(booking1.address.governorateNameSnapshot === 'القاهرة', 'Booking has governorateNameSnapshot');
    assert(booking1.address.cityNameSnapshot === 'القاهرة الجديدة', 'Booking has cityNameSnapshot');
    assert(booking1.address.area === 'شارع التسعين الشمالي', 'Booking has correct area');

    // TEST 15: Valid Booking with New Address & saveAddress: true creates CustomerAddress
    console.log('\n🔹 Test 15: Valid Booking with New Address and saveAddress creates CustomerAddress');
    const countBefore = await CustomerAddress.countDocuments({ customerId: customerAId });
    const resT15 = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId,
        date: tomorrowStr,
        time: '03:00 PM',
        address: {
          governorateId: 'giza',
          cityId: 'sheikh-zayed',
          area: 'بيفرلي هيلز',
          building: 'فيلا 5',
          label: 'فيلا الشيخ زايد',
        },
        saveAddress: true,
      },
      customerTokenA
    );
    assert(resT15.status === 201, 'Booking created successfully');
    const countAfter = await CustomerAddress.countDocuments({ customerId: customerAId });
    assert(countAfter === countBefore + 1, 'New address auto-saved to CustomerAddress collection');
    const savedZayedAddr = await CustomerAddress.findOne({ customerId: customerAId, cityId: 'sheikh-zayed' });
    assert(savedZayedAddr !== null, 'Zayed address persisted in DB');
    assert(savedZayedAddr?.governorateNameSnapshot === 'الجيزة', 'Snapshot persisted correctly');

    // TEST 16: Admin toggles Governorate inactive -> hidden from public & rejected in booking
    console.log('\n🔹 Test 16: Admin toggles Governorate inactive (Alexandria)');
    const resT16Toggle = await makeRequest('PATCH', '/locations/admin/alexandria/toggle', {}, ownerToken);
    assert(resT16Toggle.status === 200, 'Admin toggle returns 200');
    assert(resT16Toggle.body.data.active === false, 'Alexandria is now active: false');

    // Verify it disappears from public active API
    const resT16Public = await makeRequest('GET', '/locations/active');
    const publicGovs = resT16Public.body.data;
    assert(!publicGovs.some((g: any) => g.id === 'alexandria'), 'Disabled Alexandria is hidden from public API');

    // Verify booking in disabled governorate is rejected
    const resT16Booking = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId,
        date: tomorrowStr,
        time: '04:00 PM',
        address: {
          governorateId: 'alexandria',
          cityId: 'smouha',
          area: 'سموحة القديمة',
        },
      },
      customerTokenA
    );
    assert(resT16Booking.status === 422, 'Booking in disabled governorate returns 422');
    assert(resT16Booking.body.code === 'LOCATION_GOVERNORATE_INVALID', 'Code is LOCATION_GOVERNORATE_INVALID');

    // TEST 17: Admin toggles City inactive -> hidden from public & rejected in booking
    console.log('\n🔹 Test 17: Admin toggles City inactive (Maadi under Cairo)');
    const resT17Toggle = await makeRequest('PATCH', '/locations/admin/cairo/cities/maadi/toggle', {}, ownerToken);
    assert(resT17Toggle.status === 200, 'Admin toggle city returns 200');

    // Verify Maadi hidden from Cairo active cities
    const resT17Cities = await makeRequest('GET', '/locations/cairo/cities');
    assert(!resT17Cities.body.data.some((c: any) => c.id === 'maadi'), 'Disabled Maadi is hidden from active cities');

    // Verify booking in disabled city is rejected
    const resT17Booking = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId,
        date: tomorrowStr,
        time: '05:00 PM',
        address: {
          governorateId: 'cairo',
          cityId: 'maadi',
          area: 'دجلة المعادي',
        },
      },
      customerTokenA
    );
    assert(resT17Booking.status === 422, 'Booking in disabled city returns 422');
    assert(resT17Booking.body.code === 'LOCATION_CITY_INVALID', 'Code is LOCATION_CITY_INVALID');

    // Other cities under Cairo still work
    const resT17OtherCity = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId,
        date: tomorrowStr,
        time: '06:00 PM',
        address: {
          governorateId: 'cairo',
          cityId: 'nasr-city',
          area: 'شارع مكرم عبيد',
        },
      },
      customerTokenA
    );
    assert(resT17OtherCity.status === 201, 'Active city under Cairo (Nasr City) still accepts bookings');

    // TEST 18: Historical booking integrity -> Past booking remains intact
    console.log('\n🔹 Test 18: Historical booking integrity check');
    const pastBooking = await Booking.findOne({ id: booking1.id });
    assert(pastBooking !== null, 'Past booking exists in database');
    assert(pastBooking?.address.governorateNameSnapshot === 'القاهرة', 'Past booking address snapshot unchanged');
    assert(pastBooking?.address.cityNameSnapshot === 'القاهرة الجديدة', 'Past booking city snapshot unchanged');

    // TEST 19: Customer deletes default address -> remaining address auto-promoted to default
    console.log('\n🔹 Test 19: Customer deletes default address, remaining promoted to default');
    // First verify A2 is default
    const addrToDelete = await CustomerAddress.findById(addressA2._id);
    assert(addrToDelete?.isDefault === true, 'Address A2 is currently default');
    const resT19 = await makeRequest('DELETE', `/addresses/${addressA2._id}`, {}, customerTokenA);
    assert(resT19.status === 200, 'DELETE default address returns 200');
    // Check remaining address
    const remainingAddresses = await CustomerAddress.find({ customerId: customerAId });
    const hasDefault = remainingAddresses.some((a) => a.isDefault);
    assert(hasDefault, 'A remaining address was automatically promoted to default');

    // TEST 20: Admin can create new Governorate & City hierarchy and use it immediately
    console.log('\n🔹 Test 20: Admin creates new Governorate & City and books in it');
    const resT20Gov = await makeRequest(
      'POST',
      '/locations/admin',
      {
        name: 'البحر الأحمر',
        nameEn: 'Red Sea',
      },
      ownerToken
    );
    assert(resT20Gov.status === 201, 'Admin created Red Sea governorate');
    const newGovId = resT20Gov.body.data.id;

    const resT20City = await makeRequest(
      'POST',
      `/locations/admin/${newGovId}/cities`,
      {
        name: 'الغردقة',
        nameEn: 'Hurghada',
      },
      ownerToken
    );
    assert(resT20City.status === 201, 'Admin added Hurghada city under Red Sea');

    // Customer can immediately book in the newly created location
    const resT20Book = await makeRequest(
      'POST',
      '/bookings',
      {
        serviceId,
        date: tomorrowStr,
        time: '07:00 PM',
        address: {
          governorateId: newGovId,
          cityId: 'hurghada',
          area: 'شارع شيراتون',
        },
      },
      customerTokenA
    );
    assert(resT20Book.status === 201, 'Customer successfully booked in newly created admin location');
    assert(resT20Book.body.data.address.governorateNameSnapshot === 'البحر الأحمر', 'Snapshot reflects Red Sea');
    assert(resT20Book.body.data.address.cityNameSnapshot === 'الغردقة', 'Snapshot reflects Hurghada');

    console.log('\n===============================================================');
    console.log('🎉 ALL 20 TESTS PASSED (100% SUCCESS RATE)!');
    console.log('===============================================================\n');
  } catch (error) {
    console.error('\n❌ Test Suite Failed with error:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runAddressSystemTests();
