import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { LocationGovernorate } from '../src/models/Location.js';
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

async function getTotalCitiesCount(): Promise<number> {
  const allGovs = await LocationGovernorate.find({});
  let total = 0;
  for (const g of allGovs) {
    total += (g.cities || []).length;
  }
  return total;
}

async function runStopAutoCityCreationTests() {
  console.log('===============================================================');
  console.log('CLEANZO — MODIFICATION 02: STOP AUTOMATIC CITY CREATION TEST');
  console.log('===============================================================\n');

  await connectDB();

  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as any;
      baseUrl = `http://127.0.0.1:${addr.port}`;
      console.log(`Test Express server running at: ${baseUrl}\n`);
      resolve();
    });
  });

  let owner = await AdminUser.findOne({ role: 'owner' });
  if (!owner) {
    owner = await AdminUser.create({
      id: `owner-${Date.now()}`,
      name: 'Owner Admin',
      username: 'owner_admin',
      email: 'owner_test@cleanzo.com',
      password: 'password123',
      role: 'owner',
      status: 'active',
    });
  }
  ownerToken = generateAdminToken({
    id: owner._id.toString(),
    username: owner.username,
    role: owner.role || 'owner',
  });

  const testGovId = `sharqia-test-${Date.now()}`;

  try {
    // -------------------------------------------------------------
    // STEP 1: Check Cities Count Before Governorate Creation
    // -------------------------------------------------------------
    console.log('📌 [STEP 1] Audit cities count BEFORE governorate creation');
    const citiesCountBefore = await getTotalCitiesCount();
    console.log(`Total cities before test: ${citiesCountBefore}`);

    // -------------------------------------------------------------
    // STEP 2: Create Governorate (الشرقية / Sharqia) via Admin API
    // -------------------------------------------------------------
    console.log('\n📌 [STEP 2] Admin creates governorate: الشرقية (Sharqia)');
    const createRes = await makeRequest(
      'POST',
      '/locations/admin',
      {
        id: testGovId,
        name: 'الشرقية',
        nameEn: 'Sharqia',
        order: 5,
      },
      ownerToken
    );

    assert(createRes.status === 201, `Governorate creation returned status 201 (got ${createRes.status})`);
    assert(createRes.body.success === true, 'Response indicates success');
    assert(createRes.body.data.name === 'الشرقية', 'Governorate Arabic name is الشرقية');
    assert(createRes.body.data.nameEn === 'Sharqia', 'Governorate English name is Sharqia');
    
    // CRITICAL ASSERTION: No cities returned
    assert(Array.isArray(createRes.body.data.cities), 'Cities is an array');
    assert(createRes.body.data.cities.length === 0, `Governorate cities array is strictly empty (got ${createRes.body.data.cities.length})`);

    // -------------------------------------------------------------
    // STEP 3: Verify in Database Directly
    // -------------------------------------------------------------
    console.log('\n📌 [STEP 3] Verify database record for new governorate');
    const dbGov = await LocationGovernorate.findOne({ id: testGovId });
    assert(!!dbGov, 'Governorate exists in DB');
    assert(Array.isArray(dbGov.cities), 'DB cities field is an array');
    assert(dbGov.cities.length === 0, `DB cities count is strictly 0 (got ${dbGov.cities.length})`);

    const citiesCountAfterGov = await getTotalCitiesCount();
    console.log(`Total cities after governorate creation: ${citiesCountAfterGov}`);
    assert(
      citiesCountAfterGov === citiesCountBefore,
      `Number of cities before (${citiesCountBefore}) equals number after (${citiesCountAfterGov}) - NO automatic city created`
    );

    // -------------------------------------------------------------
    // STEP 4: Public API check - No fake cities exposed to customers
    // -------------------------------------------------------------
    console.log('\n📌 [STEP 4] Verify Public API returns empty cities array');
    const publicRes = await makeRequest('GET', `/locations/${testGovId}/cities`);
    assert(publicRes.status === 200, 'Public get cities returns 200');
    assert(Array.isArray(publicRes.body.data), 'Public cities is array');
    assert(publicRes.body.data.length === 0, `Public cities count is 0 (got ${publicRes.body.data.length})`);

    // -------------------------------------------------------------
    // STEP 5: Explicitly Add City (الزقازيق / Zagazig)
    // -------------------------------------------------------------
    console.log('\n📌 [STEP 5] Explicitly add city: الزقازيق (Zagazig)');
    const addCityRes = await makeRequest(
      'POST',
      `/locations/admin/${testGovId}/cities`,
      {
        cityId: 'zagazig',
        name: 'الزقازيق',
        nameEn: 'Zagazig',
        order: 1,
      },
      ownerToken
    );

    assert(addCityRes.status === 201, `City creation returned status 201 (got ${addCityRes.status})`);
    assert(addCityRes.body.data.cities.length === 1, 'Governorate now has exactly 1 city');
    const addedCity = addCityRes.body.data.cities[0];
    assert(addedCity.id === 'zagazig', 'City ID is zagazig');
    assert(addedCity.name === 'الزقازيق', 'City name is الزقازيق');
    assert(addedCity.nameEn === 'Zagazig', 'City nameEn is Zagazig');
    assert(addedCity.active === true, 'City is active by default');

    const citiesCountAfterCity = await getTotalCitiesCount();
    assert(
      citiesCountAfterCity === citiesCountBefore + 1,
      `Total cities count incremented by exactly 1 (${citiesCountBefore} -> ${citiesCountAfterCity})`
    );

    // -------------------------------------------------------------
    // STEP 6: Update City & Toggle City Active
    // -------------------------------------------------------------
    console.log('\n📌 [STEP 6] Update city and toggle active status');
    const updateCityRes = await makeRequest(
      'PUT',
      `/locations/admin/${testGovId}/cities/zagazig`,
      {
        name: 'الزقازيق الجديدة',
        nameEn: 'New Zagazig',
      },
      ownerToken
    );
    assert(updateCityRes.status === 200, 'City update returns 200');
    const updatedCity = updateCityRes.body.data.cities.find((c: any) => c.id === 'zagazig');
    assert(updatedCity.name === 'الزقازيق الجديدة', 'City name updated in DB');

    const toggleCityRes = await makeRequest(
      'PATCH',
      `/locations/admin/${testGovId}/cities/zagazig/toggle`,
      {},
      ownerToken
    );
    assert(toggleCityRes.status === 200, 'Toggle city returns 200');
    const toggledCity = toggleCityRes.body.data.cities.find((c: any) => c.id === 'zagazig');
    assert(toggledCity.active === false, 'City active state toggled to false');

    // -------------------------------------------------------------
    // STEP 7: Delete City Explicitly
    // -------------------------------------------------------------
    console.log('\n📌 [STEP 7] Explicitly delete city');
    const deleteCityRes = await makeRequest(
      'DELETE',
      `/locations/admin/${testGovId}/cities/zagazig`,
      {},
      ownerToken
    );
    assert(deleteCityRes.status === 200, 'Delete city returns 200');
    assert(deleteCityRes.body.data.cities.length === 0, 'Cities array is empty again after deletion');

    const finalCitiesCount = await getTotalCitiesCount();
    assert(finalCitiesCount === citiesCountBefore, 'Total cities count returned to original baseline');

    console.log('\n===============================================================');
    console.log('✅ ALL TESTS PASSED: AUTOMATIC CITY CREATION COMPLETELY REMOVED!');
    console.log('===============================================================');
  } finally {
    // Clean up test governorate
    await LocationGovernorate.deleteOne({ id: testGovId });
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runStopAutoCityCreationTests().catch((err) => {
  console.error('Test failed with error:', err);
  process.exit(1);
});
