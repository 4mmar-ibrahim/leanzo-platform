import { connectDB, disconnectDB } from '../src/config/db.js';
import { app } from '../src/app.js';
import http from 'http';
import { Booking } from '../src/models/Booking.js';
import { Technician } from '../src/models/Technician.js';
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

    req.on('error', reject);

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function runStrictWorkflowTests() {
  console.log('===============================================================');
  console.log('CLEANZO — MODIFICATION 03: STRICT ORDER WORKFLOW & AUTOMATIC COMPLETION');
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

  // Ensure Admin Owner Token
  let owner = await AdminUser.findOne({ role: 'owner' });
  if (!owner) {
    owner = await AdminUser.create({
      id: `owner-${Date.now()}`,
      name: 'Owner Admin',
      username: 'owner_workflow',
      email: 'owner_workflow@cleanzo.com',
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

  // Ensure Technician
  const techId = `tech-flow-${Date.now()}`;
  const tech = await Technician.create({
    id: techId,
    name: 'كابتن حسام المتخصص',
    phone: '01022334455',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
    specialty: 'سيارات',
    status: 'available',
    completedOrders: 0,
  });

  // Create temporary booking in pending state
  const testBookingId = `CLN-WF-${Date.now()}`;
  const testBooking = await Booking.create({
    id: testBookingId,
    customerName: 'أحمد محمود العميل',
    customerPhone: '01012345678',
    serviceId: 'car-wash-steam',
    serviceSnapshot: {
      id: 'car-wash-steam',
      title: 'غسيل بخار مكثف',
      titleEn: 'Steam Wash Intensive',
      category: 'car',
      image: '/images/car.png',
      price: 350,
      duration: 45,
    },
    category: 'car',
    date: '2026-10-15',
    time: '11:00 AM',
    timeSlotStart: '11:00',
    scheduledStart: '11:00',
    scheduledEnd: '11:45',
    duration: 45,
    serviceDurationMinutes: 45,
    travelTimeMinutes: 15,
    totalOccupiedMinutes: 60,
    address: {
      governorate: 'القاهرة',
      city: 'مدينة نصر',
      area: 'مكرم عبيد',
      details: 'شارع 15 عمارة 4',
      label: 'المنزل',
    },
    basePrice: 350,
    discount: 0,
    serviceFee: 0,
    finalPrice: 350,
    currency: 'ج.م',
    status: 'pending',
    timeline: [
      {
        status: 'pending',
        label: 'طلب جديد قيد الانتظار',
        labelEn: 'Pending Review',
        timestamp: new Date().toLocaleString('ar-EG'),
        completed: true,
      },
    ],
  });

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Direct Invalid Transitions from PENDING must be strictly rejected
    // -------------------------------------------------------------------------
    console.log('📌 [TEST 1] Testing direct API security & transition guards from PENDING:');

    // Attempt: PENDING -> COMPLETED (Must REJECT)
    const pendingToCompleted = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'completed' },
      ownerToken
    );
    assert(pendingToCompleted.status === 422, 'PENDING -> COMPLETED is strictly rejected with HTTP 422');

    // Attempt: PENDING -> IN_PROGRESS (Must REJECT)
    const pendingToInProgress = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'in_progress' },
      ownerToken
    );
    assert(pendingToInProgress.status === 422, 'PENDING -> IN_PROGRESS is strictly rejected with HTTP 422');

    // Attempt: Assign technician directly while PENDING (Must REJECT, required received first)
    const pendingAssign = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/assign`,
      { technicianId: tech.id },
      ownerToken
    );
    assert(pendingAssign.status === 422, 'Direct technician assign on PENDING order is rejected with HTTP 422');

    // -------------------------------------------------------------------------
    // TEST 2: Move Order to RECEIVED (confirmed)
    // -------------------------------------------------------------------------
    console.log('\n📌 [TEST 2] Move order to RECEIVED (confirmed):');
    const receiveRes = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'confirmed', note: 'تم استلام طلب الحجز وتأكيده هاتفياً' },
      ownerToken
    );
    assert(receiveRes.status === 200, 'Order successfully moved to RECEIVED (confirmed)');
    assert(receiveRes.body.data.status === 'confirmed', 'DB status updated to confirmed');

    // -------------------------------------------------------------------------
    // TEST 3: Direct Invalid Transitions from RECEIVED (confirmed)
    // -------------------------------------------------------------------------
    console.log('\n📌 [TEST 3] Testing transition guards from RECEIVED (confirmed):');

    // Attempt: RECEIVED -> COMPLETED (Must REJECT)
    const receivedToCompleted = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'completed' },
      ownerToken
    );
    assert(receivedToCompleted.status === 422, 'RECEIVED -> COMPLETED is strictly rejected with HTTP 422');

    // Attempt: RECEIVED -> IN_PROGRESS without assigned technician (Must REJECT)
    const receivedToInProgress = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'in_progress' },
      ownerToken
    );
    assert(receivedToInProgress.status === 422, 'RECEIVED -> IN_PROGRESS without technician is rejected with HTTP 422');

    // -------------------------------------------------------------------------
    // TEST 4: Assign Technician (RECEIVED -> ASSIGNED)
    // -------------------------------------------------------------------------
    console.log('\n📌 [TEST 4] Assign technician to order (transitions to ASSIGNED):');
    const assignRes = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/assign`,
      { technicianId: tech.id },
      ownerToken
    );
    assert(assignRes.status === 200, 'Technician assigned successfully');
    assert(assignRes.body.data.status === 'assigned', 'Status automatically transitioned to assigned');
    assert(assignRes.body.data.assignedTechnicianId === tech.id, 'Assigned technician ID recorded');
    assert(assignRes.body.data.technician?.name === tech.name, 'Technician snapshot stored on order');

    // -------------------------------------------------------------------------
    // TEST 5: Direct Invalid Transitions from ASSIGNED
    // -------------------------------------------------------------------------
    console.log('\n📌 [TEST 5] Testing transition guards from ASSIGNED:');

    // Attempt: ASSIGNED -> COMPLETED (Must REJECT, must start in_progress first)
    const assignedToCompleted = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'completed' },
      ownerToken
    );
    assert(assignedToCompleted.status === 422, 'ASSIGNED -> COMPLETED is strictly rejected with HTTP 422');

    // -------------------------------------------------------------------------
    // TEST 6: Move Order to IN PROGRESS
    // -------------------------------------------------------------------------
    console.log('\n📌 [TEST 6] Move order to IN PROGRESS (قيد التنفيذ):');
    const inProgressRes = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'in_progress', note: 'بدأ الفني في تنفيذ أعمال التنظيف' },
      ownerToken
    );
    assert(inProgressRes.status === 200, 'Order successfully moved to IN_PROGRESS');
    assert(inProgressRes.body.data.status === 'in_progress', 'DB status updated to in_progress');

    // -------------------------------------------------------------------------
    // TEST 7: Technician Requirement Before Completion (Section 8)
    // -------------------------------------------------------------------------
    console.log('\n📌 [TEST 7] Testing technician requirement before completion:');
    // Temporarily remove technician from booking in DB
    await Booking.updateOne(
      { id: testBookingId },
      { assignedTechnicianId: null, technician: null }
    );

    const completeWithoutTech = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'completed' },
      ownerToken
    );
    assert(completeWithoutTech.status === 422, 'IN_PROGRESS -> COMPLETED without technician is strictly rejected with HTTP 422');

    // Restore technician
    await Booking.updateOne(
      { id: testBookingId },
      {
        $set: {
          assignedTechnicianId: tech.id,
          technician: {
            id: tech.id,
            name: tech.name,
            phone: tech.phone,
            avatar: tech.avatar,
            rating: tech.rating,
            specialty: tech.specialty,
          },
        },
      }
    );

    // -------------------------------------------------------------------------
    // TEST 8: Completion Action ("تم الانتهاء") -> Automatically COMPLETED
    // -------------------------------------------------------------------------
    console.log('\n📌 [TEST 8] Completion Action ("تم الانتهاء") -> Automatically COMPLETED:');
    const completeRes = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'completed', note: 'تم الانتهاء من تنفيذ الطلب بنجاح والتأكد من الجودة' },
      ownerToken
    );
    assert(completeRes.status === 200, 'Completion action succeeded with 200');
    assert(completeRes.body.data.status === 'completed', 'Order status automatically transitioned to completed');
    assert(!!completeRes.body.data.completedAt, 'completedAt timestamp recorded');
    assert(!!completeRes.body.data.completedBy?.name, `completedBy metadata stored (${completeRes.body.data.completedBy?.name})`);

    // Check Technician completed counter incremented
    const updatedTech = await Technician.findOne({ id: tech.id });
    assert((updatedTech?.completedOrders || 0) >= 1, 'Technician completedOrders count incremented');

    // -------------------------------------------------------------------------
    // TEST 9: Terminal State Immutability
    // -------------------------------------------------------------------------
    console.log('\n📌 [TEST 9] Terminal State Immutability:');
    const editCompleted = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/status`,
      { status: 'pending' },
      ownerToken
    );
    assert(editCompleted.status === 422, 'Completed order cannot be changed (rejected with HTTP 422)');

    const assignCompleted = await makeRequest(
      'PUT',
      `/bookings/admin/${testBookingId}/assign`,
      { technicianId: tech.id },
      ownerToken
    );
    assert(assignCompleted.status === 422, 'Completed order cannot be reassigned (rejected with HTTP 422)');

    console.log('\n===============================================================');
    console.log('🎉 ALL STRICT ORDER WORKFLOW TESTS PASSED 100%!');
    console.log('===============================================================');
  } finally {
    // Cleanup
    await Booking.deleteOne({ id: testBookingId });
    await Technician.deleteOne({ id: techId });
    if (server) {
      server.close();
    }
    await disconnectDB();
  }
}

runStrictWorkflowTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
