import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
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

    req.on('error', (err) => reject(err));

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runTestSuite() {
  console.log('================================================================');
  console.log('🚀 بدء تشغيل سويت اختبارات مسارات إلغاء وتعديل المواعيد بالإدارة');
  console.log('================================================================\n');

  await connectDB();

  await new Promise<void>((resolve) => {
    server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const addr: any = server.address();
      baseUrl = `http://127.0.0.1:${addr.port}`;
      resolve();
    });
  });

  const testAdminId = 'adm-qa-admin-test';
  await AdminUser.deleteMany({ username: 'qa_reschedule_admin' });
  const adminUser = await AdminUser.create({
    id: testAdminId,
    username: 'qa_reschedule_admin',
    email: 'qa_reschedule_admin@cleanzo.test',
    password: 'Password123!',
    name: 'مسؤول الجودة QA Admin',
    role: 'owner',
    permissions: {
      orders: 'edit',
      users: 'manage',
      services: 'manage',
    },
    granularPermissions: ['*'],
  });

  ownerToken = generateAdminToken({
    id: adminUser.id,
    username: adminUser.username,
    role: adminUser.role,
  });

  // Create mock service
  const testServiceId = 'srv-qa-car-wash-admin';
  await Service.deleteMany({ id: testServiceId });
  await Service.create({
    id: testServiceId,
    title: 'غسيل واكس ديلوكس تجريبي',
    titleEn: 'Deluxe Wax Wash Test',
    category: 'car',
    image: '/images/services/car-wash.webp',
    price: 350,
    duration: 60,
    isActive: true,
  });

  const testSnapshot = {
    id: testServiceId,
    title: 'غسيل واكس ديلوكس تجريبي',
    titleEn: 'Deluxe Wax Wash Test',
    category: 'car',
    image: '/images/services/car-wash.webp',
    price: 350,
    duration: 60,
  };

  const createTestBooking = async (
    id: string,
    date: string,
    timeStart: string,
    timeEnd: string,
    status: any,
    customerName: string,
    customerPhone: string
  ) => {
    return await Booking.create({
      id,
      bookingNumber: id,
      serviceId: testServiceId,
      serviceSnapshot: testSnapshot,
      category: 'car',
      date,
      time: `${timeStart} – ${timeEnd}`,
      timeSlotStart: timeStart,
      scheduledStart: timeStart,
      scheduledEnd: timeEnd,
      duration: 60,
      totalOccupiedMinutes: 60,
      status,
      customerName,
      customerPhone,
      address: {
        area: 'المعادي',
        city: 'القاهرة',
        street: 'شارع النصر',
        building: '10',
      },
      basePrice: 350,
      finalPrice: 350,
      timeline: [],
    });
  };

  const targetDateA = '2027-02-10';
  const targetDateB = '2027-02-11';
  const order1Id = 'ord-qa-cancel-details-01';
  const order2Id = 'ord-qa-cancel-list-02';
  const order3Id = 'ord-qa-reschedule-03';
  const order4Id = 'ord-qa-conflict-04';

  await Booking.deleteMany({
    date: { $in: [targetDateA, targetDateB] },
  });

  try {
    // -------------------------------------------------------------
    // Test 1: Order Cancellation from Details Screen API route
    // -------------------------------------------------------------
    console.log('🔹 الاختبار 1: إلغاء الطلب من مسار تفاصيل الطلب مع تسجيل سبب الإلغاء');
    await createTestBooking(
      order1Id,
      targetDateA,
      '09:00',
      '10:00',
      'pending',
      'عميل اختبار تفاصيل',
      '01011112222'
    );

    const cancelDetailsRes = await makeRequest(
      'PUT',
      `/bookings/admin/${order1Id}/status`,
      {
        status: 'cancelled',
        note: 'سبب الإلغاء: تعذر الوصول للعميل بالهاتف',
      },
      ownerToken
    );

    assert(cancelDetailsRes.status === 200, `نجاح استدعاء الإلغاء بكود 200 (الحالي: ${cancelDetailsRes.status})`);
    assert(cancelDetailsRes.body?.data?.status === 'cancelled', 'الحالة المرجعة هي cancelled');

    const dbOrder1 = await Booking.findOne({ id: order1Id });
    assert(dbOrder1 !== null, 'الطلب موجود بقاعدة البيانات');
    assert(dbOrder1?.status === 'cancelled', 'حالة الطلب في قاعدة البيانات أصبحت cancelled');
    assert(dbOrder1?.cancellationSource === 'admin', 'مصدر الإلغاء مسجل admin');
    assert(
      dbOrder1?.cancellationReason?.includes('تعذر الوصول للعميل بالهاتف') === true,
      'سبب الإلغاء مسجل في قاعدة البيانات بدقة'
    );
    const lastTimeline1 = dbOrder1?.timeline[dbOrder1.timeline.length - 1];
    assert(lastTimeline1?.status === 'cancelled', 'المخطط الزمني يحتوي على مرحلة الإلغاء');

    // -------------------------------------------------------------
    // Test 2: Order Cancellation from List Screen API route
    // -------------------------------------------------------------
    console.log('\n🔹 الاختبار 2: إلغاء الطلب من مسار القائمة السريعة مع نص الإدارة الافتراضي');
    await createTestBooking(
      order2Id,
      targetDateA,
      '11:00',
      '12:00',
      'confirmed',
      'عميل اختبار القائمة',
      '01022223333'
    );

    const cancelListRes = await makeRequest(
      'PUT',
      `/bookings/admin/${order2Id}/status`,
      {
        status: 'cancelled',
        note: 'إلغاء بواسطة الإدارة',
      },
      ownerToken
    );

    assert(cancelListRes.status === 200, 'نجاح إلغاء الطلب من مسار القائمة بكود 200');
    assert(cancelListRes.body?.data?.status === 'cancelled', 'حالة الطلب المرجعة cancelled');

    const dbOrder2 = await Booking.findOne({ id: order2Id });
    assert(dbOrder2?.status === 'cancelled', 'تطابق الحالة المؤكد في قاعدة البيانات مع شاشة التفاصيل');

    // -------------------------------------------------------------
    // Test 3: Rejection of Modifying Terminal Cancelled Order
    // -------------------------------------------------------------
    console.log('\n🔹 الاختبار 3: منع تعديل حالة طلب ملغي نهائياً لحماية سجل التدقيق');
    const tryReopenRes = await makeRequest(
      'PUT',
      `/bookings/admin/${order1Id}/status`,
      {
        status: 'confirmed',
      },
      ownerToken
    );
    assert(tryReopenRes.status === 422, 'رفض الخادم تعديل حالة الطلب الملغي بكود 422');

    // -------------------------------------------------------------
    // Test 4: Admin Reschedule to an Available Slot
    // -------------------------------------------------------------
    console.log('\n🔹 الاختبار 4: تعديل موعد الطلب بواسطة الإدارة إلى فترة متاحة بنجاح');
    await createTestBooking(
      order3Id,
      targetDateA,
      '14:00',
      '15:00',
      'confirmed',
      'عميل اختبار التعديل',
      '01033334444'
    );

    const rescheduleRes = await makeRequest(
      'POST',
      `/bookings/admin/${order3Id}/reschedule`,
      {
        newDate: targetDateB,
        newTime: '15:00',
        reason: 'تغيير بطلب العميل هاتفياً',
      },
      ownerToken
    );

    assert(rescheduleRes.status === 200, `نجاح استدعاء إعادة الجدولة بكود 200 (الحالي: ${rescheduleRes.status})`);
    assert(rescheduleRes.body?.data?.date === targetDateB, `تحديث تاريخ الطلب إلى ${targetDateB}`);

    const dbOrder3 = await Booking.findOne({ id: order3Id });
    assert(dbOrder3?.date === targetDateB, 'تحديث التاريخ في قاعدة البيانات');
    assert(dbOrder3?.timeSlotStart === '15:00', 'تحديث وقت البدء في قاعدة البيانات');
    const rescheduleTimeline = dbOrder3?.timeline.find((t: any) =>
      t.label?.includes('تعديل الموعد') || t.description?.includes('تغيير بطلب العميل')
    );
    assert(Boolean(rescheduleTimeline), 'تسجيل واقعة تعديل الموعد في المخطط الزمني للطلب');

    // -------------------------------------------------------------
    // Test 5: Rejection of Reschedule to a Conflicting Occupied Slot
    // -------------------------------------------------------------
    console.log('\n🔹 الاختبار 5: رفض تعديل الموعد إلى فترة متداخلة ومشغولة مع مورد آخر');
    await createTestBooking(
      order4Id,
      targetDateA,
      '16:00',
      '17:00',
      'confirmed',
      'عميل اختبار التعارض',
      '01044445555'
    );

    // Try to reschedule order4 to targetDateB at 15:00 (which is now occupied by order3)
    const conflictRes = await makeRequest(
      'POST',
      `/bookings/admin/${order4Id}/reschedule`,
      {
        newDate: targetDateB,
        newTime: '15:00',
        reason: 'محاولة تعارض',
      },
      ownerToken
    );

    assert(
      conflictRes.status === 409,
      `الخادم يرفض التعارض الزمني بكود 409 SLOT_UNAVAILABLE (الحالي: ${conflictRes.status})`
    );
    assert(
      conflictRes.body?.success === false,
      'الاستجابة تؤكد فشل العملية وعدم قبول الموعد المتعارض'
    );

    const dbOrder4 = await Booking.findOne({ id: order4Id });
    assert(dbOrder4?.date === targetDateA, 'بقاء تاريخ الطلب الأصلي دون تغيير');
    assert(dbOrder4?.timeSlotStart === '16:00', 'بقاء موعد الطلب الأصلي دون تلاعب');

    // -------------------------------------------------------------
    // Test 6: Cancelling the conflicting order immediately frees the slot
    // -------------------------------------------------------------
    console.log('\n🔹 الاختبار 6: إلغاء الطلب الشاغل يحرر الموعد فورياً ويسمح بإعادة الجدولة إليه');
    // Cancel order 3
    const cancelRes3 = await makeRequest(
      'PUT',
      `/bookings/admin/${order3Id}/status`,
      {
        status: 'cancelled',
        note: 'إلغاء لتحرير الفترة',
      },
      ownerToken
    );
    assert(cancelRes3.status === 200, 'إلغاء الطلب 3 بنجاح');

    // Now order4 should be able to reschedule to Date B 15:00!
    const retryRes = await makeRequest(
      'POST',
      `/bookings/admin/${order4Id}/reschedule`,
      {
        newDate: targetDateB,
        newTime: '15:00',
        reason: 'إعادة المحاولة بعد الإلغاء',
      },
      ownerToken
    );
    assert(
      retryRes.status === 200,
      `نجاح إعادة الجدولة فور تحرير المورد بكود 200 (الحالي: ${retryRes.status})`
    );
    const dbOrder4Updated = await Booking.findOne({ id: order4Id });
    assert(dbOrder4Updated?.date === targetDateB, 'انتقال الطلب 4 بنجاح إلى الموعد المحرر');

    console.log('\n================================================================');
    console.log('✅ نجحت كافة اختبارات مساري تعديل موعد الطلب وإلغائه بنسبة 100%!');
    console.log('================================================================\n');
  } finally {
    // Cleanup test bookings
    await Booking.deleteMany({
      id: { $in: [order1Id, order2Id, order3Id, order4Id] },
    });
    await Service.deleteMany({ id: testServiceId });
    await AdminUser.deleteMany({ id: testAdminId });

    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
    await disconnectDB();
  }
}

runTestSuite().catch((err) => {
  console.error('❌ فشل فادح في سويت الاختبارات:', err);
  process.exit(1);
});
