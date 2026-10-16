/**
 * CLEANZO - CUSTOMER NOTIFICATION ISOLATION & SCOPING TEST SUITE
 *
 * Verifies that:
 * 1. Newly created / registered accounts have 0 notifications (no bleed-through).
 * 2. Order notifications are strictly isolated to the owning customer.
 * 3. Un-scoped legacy notifications are purged and excluded from customer views.
 */

import { useCustomerNotificationStore } from '../src/store/useCustomerNotificationStore';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('================================================================');
console.log('CLEANZO CUSTOMER NOTIFICATION ISOLATION & SCOPING SUITE');
console.log('================================================================\n');

const store = useCustomerNotificationStore.getState();

// Reset store to a clean slate
store.clearAll();
assert(store.notifications.length === 0, 'Store cleared successfully');

// 1. Simulate 193 un-scoped legacy notifications (from prior admin tests)
console.log('--- TEST 1: Simulating legacy un-scoped test notifications ---');
for (let i = 1; i <= 50; i++) {
  store.addNotification({
    title: `طلب قديم #${i}`,
    titleEn: `Old Order #${i}`,
    message: 'رسالة قديمة غير معزولة من بيئة الاختبار',
    messageEn: 'Old message',
    type: 'order',
  });
}
assert(useCustomerNotificationStore.getState().notifications.length === 50, '50 legacy notifications populated');

// 2. Add an order notification specifically for Customer A
store.addNotification({
  userId: 'usr-customerA',
  customerPhone: '01011112222',
  title: 'تم تأكيد موعد حجزك بنجاح',
  titleEn: 'Booking Confirmed',
  message: 'يسعدنا إبلاغك بتأكيد حجزك للطلب #CLN-2026-000108',
  messageEn: 'Booking confirmed for CLN-2026-000108',
  type: 'order',
});

// 3. Add a general broadcast offer
store.addNotification({
  title: 'عرض ترويجي عام',
  titleEn: 'General Promo',
  message: 'خصم 20% على خدمات غسيل السيارات',
  messageEn: '20% off',
  type: 'offer',
});

// 4. Test Customer B (Brand New Registered Account)
console.log('\n--- TEST 2: Brand new customer isolation ---');
const newCustomerNotifs = store.getUserNotifications('usr-newCustomerB', '01099998888');
const newCustomerUnread = store.getUnreadCount('usr-newCustomerB', '01099998888');

console.log(`New Customer B visible notifications: ${newCustomerNotifs.length}`);
console.log(`New Customer B unread count: ${newCustomerUnread}`);

assert(
  !newCustomerNotifs.some((n) => n.title.includes('طلب قديم')),
  'New customer DOES NOT see any legacy un-scoped test order notifications'
);
assert(
  !newCustomerNotifs.some((n) => n.message.includes('CLN-2026-000108')),
  'New customer DOES NOT see Customer A order notifications (#CLN-2026-000108)'
);
assert(
  newCustomerNotifs.length === 1 && newCustomerNotifs[0].type === 'offer',
  'New customer only receives general broadcast offers, zero unauthorized orders'
);

// 5. Test Customer A (Owner of order #CLN-2026-000108)
console.log('\n--- TEST 3: Order owner sees their own notification ---');
const customerANotifs = store.getUserNotifications('usr-customerA', '01011112222');
assert(
  customerANotifs.some((n) => n.message.includes('CLN-2026-000108')),
  'Customer A can view their own booking confirmation notification'
);

// 6. Test Purge Legacy Un-scoped
console.log('\n--- TEST 4: Purging un-scoped legacy notifications ---');
store.purgeLegacyUnscoped();
const remainingNotifs = useCustomerNotificationStore.getState().notifications;
assert(
  !remainingNotifs.some((n) => n.type === 'order' && !n.userId && !n.customerPhone),
  'All 50 legacy un-scoped order notifications are permanently purged'
);
assert(
  remainingNotifs.length === 2,
  `Only valid customer-scoped and broadcast notifications remain (${remainingNotifs.length})`
);

console.log('\n================================================================');
console.log('🎉 ALL NOTIFICATION ISOLATION TESTS PASSED WITH 100% SUCCESS!');
console.log('================================================================');
