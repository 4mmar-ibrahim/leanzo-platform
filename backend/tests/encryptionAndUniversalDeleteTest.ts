import assert from 'assert';
import mongoose from 'mongoose';
import { encryptText, decryptText, isEncrypted, encryptAllDatabaseData, getEncryptionStatus, getEncryptionLogs } from '../src/services/encryptionService.js';
import { wipeAllPlatformData } from '../src/services/dataWipeService.js';
import { User } from '../src/models/User.js';
import { Booking } from '../src/models/Booking.js';
import { Service } from '../src/models/Service.js';
import { ServiceCategory } from '../src/models/ServiceCategory.js';
import { Coupon } from '../src/models/Coupon.js';
import { Offer } from '../src/models/Offer.js';
import { LocationGovernorate } from '../src/models/Location.js';
import { EncryptionLog } from '../src/models/EncryptionLog.js';
import { AdminUser } from '../src/models/AdminUser.js';

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cleanzo';

async function runTests() {
  console.log('🚀 Starting Cleanzo Encryption & Universal Deletion Verification Suite...\n');

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI);
  }

  // --- Test 1: AES-256-GCM Encryption / Decryption ---
  console.log('Test 1: AES-256-GCM Encryption and Decryption Roundtrip...');
  const samplePlain = '01012345678 - Cairo New Settlement';
  const cipher = encryptText(samplePlain);
  assert(isEncrypted(cipher), 'Encrypted string must start with enc:v1:');
  assert(cipher !== samplePlain, 'Cipher text must differ from plain text');
  const decrypted = decryptText(cipher);
  assert.strictEqual(decrypted, samplePlain, 'Decrypted text must match original plain text');
  console.log('  ✓ AES-256-GCM encryption & decryption passed.');

  // --- Test 2: Seed sample test customer & order, execute DB encryption ---
  console.log('Test 2: Seeding test records and executing full DB encryption...');
  const testPhone = '012' + Math.floor(10000000 + Math.random() * 90000000);
  const testCustomer = await User.create({
    name: 'عميل تجريبي للتشفير',
    phone: testPhone,
    email: `crypto_test_${Date.now()}@cleanzo.com`,
    password: 'password123',
    role: 'customer',
  });

  const testBooking = await Booking.create({
    id: `TEST-${Date.now()}`,
    customerName: testCustomer.name,
    customerPhone: testPhone,
    serviceId: 'srv-test',
    serviceSnapshot: {
      id: 'srv-test',
      title: 'غسيل وتلميع VIP',
      titleEn: 'VIP Wash & Polish',
      category: 'car',
      image: '/test.png',
      price: 500,
      duration: 60,
    },
    category: 'car',
    date: '2026-09-25',
    time: '14:00',
    timeSlotStart: '14:00',
    scheduledStart: new Date('2026-09-25T14:00:00Z'),
    scheduledEnd: new Date('2026-09-25T15:00:00Z'),
    carDetails: {
      type: 'sedan',
      plateNumber: 'س ي ر 123',
    },
    paymentMethod: 'cash',
    basePrice: 500,
    totalPrice: 500,
    finalPrice: 500,
    address: {
      governorate: 'cairo',
      city: 'new-cairo',
      area: 'التجمع الخامس',
      street: 'شارع التسعين التجمع الخامس',
      building: 'عمارة 12',
    },
    status: 'pending',
  });

  const encStats = await encryptAllDatabaseData('Automated Test Runner');
  assert(encStats.isEncrypted === true, 'Status isEncrypted must be true');
  assert(encStats.totalRecordsEncrypted >= 2, 'Must have encrypted at least 2 test records');
  assert(encStats.lastEncryptedAt !== null, 'Must record lastEncryptedAt timestamp');

  // Verify records are actually encrypted in DB
  const reloadedCust = await User.findById(testCustomer._id);
  assert(isEncrypted(reloadedCust?.phone), 'Customer phone in DB must be encrypted');
  assert.strictEqual(decryptText(reloadedCust?.phone), testPhone, 'Customer phone must decrypt accurately');

  const reloadedBooking = await Booking.findById(testBooking._id);
  assert(isEncrypted(reloadedBooking?.customerPhone), 'Booking customer phone in DB must be encrypted');
  assert.strictEqual(decryptText(reloadedBooking?.customerPhone), testPhone, 'Booking phone must decrypt accurately');

  // Verify EncryptionLog was saved
  const logs = await getEncryptionLogs(5);
  assert(logs.length > 0, 'Encryption log must have been created');
  assert.strictEqual(logs[0].status, 'success', 'Latest encryption log must have status success');
  console.log('  ✓ Database encryption, verification, and audit logging passed.');

  // --- Test 3: Universal Deletion - Category ---
  console.log('Test 3: Category Deletion...');
  const testCat = await ServiceCategory.create({
    id: `cat-test-${Date.now()}`,
    slug: `test-slug-${Date.now()}`,
    name: 'تصنيف تجريبي للحذف',
    nameEn: 'Test Category For Deletion',
  });
  const deletedCat = await ServiceCategory.findOneAndDelete({ id: testCat.id });
  assert(deletedCat !== null, 'Category must be successfully deleted');
  const catCheck = await ServiceCategory.findOne({ id: testCat.id });
  assert.strictEqual(catCheck, null, 'Category must not exist after deletion');
  console.log('  ✓ Category deletion passed.');

  // --- Test 4: Universal Deletion - Order/Booking ---
  console.log('Test 4: Order Deletion...');
  const deletedBooking = await Booking.deleteOne({ _id: testBooking._id });
  assert(deletedBooking.deletedCount === 1, 'Booking must be deleted');
  const bookingCheck = await Booking.findById(testBooking._id);
  assert.strictEqual(bookingCheck, null, 'Booking must not exist after deletion');
  console.log('  ✓ Order deletion passed.');

  // --- Test 5: Universal Deletion - Customer ---
  console.log('Test 5: Customer Deletion...');
  const deletedCust = await User.findByIdAndDelete(testCustomer._id);
  assert(deletedCust !== null, 'Customer must be deleted');
  const custCheck = await User.findById(testCustomer._id);
  assert.strictEqual(custCheck, null, 'Customer must not exist after deletion');
  console.log('  ✓ Customer deletion passed.');

  // --- Test 6: Comprehensive Multi-Section Wipe & Super Admin Preservation ---
  console.log('Test 6: Multi-Section Data Wipe & Reset while preserving Super Admin...');
  let admin = await AdminUser.findOne({ role: 'owner' });
  if (!admin) {
    admin = await AdminUser.create({
      name: 'كلينزو مالك النظام',
      username: 'cleanzo_owner',
      phone: '01000000000',
      email: 'owner@cleanzo.com',
      password: 'password123',
      role: 'owner',
    });
  }

  // Seed data across multiple sections
  const dummyPhone = '015' + Math.floor(10000000 + Math.random() * 90000000);
  await User.create({
    name: 'عميل للتصفير',
    phone: dummyPhone,
    password: 'password123',
    role: 'customer',
  });

  const testCoupon = await Coupon.create({
    code: `TESTWIPE${Date.now()}`,
    title: 'كوبون تجريبي للتصفير',
    type: 'percentage',
    discountValue: 15,
    startDate: new Date(),
    endDate: new Date('2026-12-31'),
    expiresAt: new Date('2026-12-31'),
  });

  const testOffer = await Offer.create({
    id: `offer-test-${Date.now()}`,
    title: 'عرض تجريبي للتصفير',
    titleEn: 'Test Offer Wipe',
    description: 'خصم تجريبي',
    descriptionEn: 'Test discount',
    discountPercentage: 20,
    image: '/offer.png',
    expiresAt: new Date('2026-12-31'),
    validUntil: new Date('2026-12-31'),
    code: `OFFER${Date.now()}`,
  });

  const wipeSummary = await wipeAllPlatformData(admin._id.toString());
  assert(wipeSummary.success === true, 'Wipe must report complete success');
  assert(wipeSummary.preservedAdmin, 'Summary must record preserved admin');
  assert(wipeSummary.deletedCustomers >= 1, 'Must wipe customers');
  assert(wipeSummary.deletedCoupons >= 1, 'Must wipe coupons');
  assert(wipeSummary.deletedOffers >= 1, 'Must wipe offers');

  // Verify admin account STILL EXISTS and is intact
  const adminCheck = await AdminUser.findById(admin._id);
  assert(adminCheck !== null, 'Primary Super Admin / Owner account MUST NOT be deleted during wipe');
  assert.strictEqual(adminCheck?.role, 'owner', 'Admin role must remain intact');

  // Verify customer was wiped
  const wipedCust = await User.findOne({ phone: dummyPhone });
  assert.strictEqual(wipedCust, null, 'Non-admin users must be wiped');

  // Verify coupon was wiped
  const wipedCoupon = await Coupon.findById(testCoupon._id);
  assert.strictEqual(wipedCoupon, null, 'Coupons must be wiped');

  // Verify offer was wiped
  const wipedOffer = await Offer.findById(testOffer._id);
  assert.strictEqual(wipedOffer, null, 'Offers must be wiped');

  console.log('  ✓ Multi-section data wipe and admin safety preservation passed.');

  console.log('\n🎉 ALL 6 VERIFICATION CHECKS PASSED WITH 100% SUCCESS!');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
