import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetBusinessData() {
  console.log('=====================================================');
  console.log('🚀 CLEANZO — SAFE BUSINESS DATA RESET');
  console.log('=====================================================');

  // Verify Owner account safety before touching anything
  const owner = await prisma.adminUser.findFirst({
    where: { role: 'owner' },
  });

  if (!owner) {
    throw new Error('ABORT: Owner account not found in adminUser table! Cannot proceed.');
  }

  console.log(`🔒 SAFETY VERIFIED: Owner account "${owner.name}" (${owner.username}) is intact.`);

  // Verify system settings exist and will be preserved
  const settingsCount = await prisma.systemSettings.count();
  console.log(`🔒 SAFETY VERIFIED: SystemSettings (${settingsCount} record) will be preserved.`);

  // Verify RBAC roles exist and will be preserved
  const rolesCount = await prisma.role.count();
  console.log(`🔒 SAFETY VERIFIED: RBAC Roles (${rolesCount} roles) will be preserved.`);

  // Verify Locations exist and will be preserved
  const locationsCount = await prisma.locationGovernorate.count();
  console.log(`🔒 SAFETY VERIFIED: Locations (${locationsCount} governorates) will be preserved.`);

  console.log('\n--- EXECUTING BUSINESS DATA PURGE (ORDERED BY DEPENDENCY) ---');

  const result = await prisma.$transaction(async (tx) => {
    // 1. Subscription-related sub-records
    const delCashbacks = await tx.subscriptionCashback.deleteMany({});
    console.log(`✓ Deleted subscriptionCashback: ${delCashbacks.count}`);

    const delRenewals = await tx.subscriptionRenewal.deleteMany({});
    console.log(`✓ Deleted subscriptionRenewal: ${delRenewals.count}`);

    const delVisits = await tx.subscriptionVisit.deleteMany({});
    console.log(`✓ Deleted subscriptionVisit: ${delVisits.count}`);

    // 2. Subscriptions
    const delSubscriptions = await tx.subscription.deleteMany({});
    console.log(`✓ Deleted subscription: ${delSubscriptions.count}`);

    // 3. Subscription Plans
    const delPlans = await tx.subscriptionPlan.deleteMany({});
    console.log(`✓ Deleted subscriptionPlan: ${delPlans.count}`);

    // 4. Bookings & Orders
    const delBookings = await tx.booking.deleteMany({});
    console.log(`✓ Deleted booking: ${delBookings.count}`);

    // 5. Coupon Usages & Coupons
    const delCouponUsages = await tx.couponUsage.deleteMany({});
    console.log(`✓ Deleted couponUsage: ${delCouponUsages.count}`);

    const delCoupons = await tx.coupon.deleteMany({});
    console.log(`✓ Deleted coupon: ${delCoupons.count}`);

    // 6. Offers
    const delOffers = await tx.offer.deleteMany({});
    console.log(`✓ Deleted offer: ${delOffers.count}`);

    // 7. Reviews
    const delReviews = await tx.review.deleteMany({});
    console.log(`✓ Deleted review: ${delReviews.count}`);

    // 8. Portfolio Items
    const delPortfolio = await tx.portfolioItem.deleteMany({});
    console.log(`✓ Deleted portfolioItem: ${delPortfolio.count}`);

    // 9. Service Addons & Packages
    const delAddons = await tx.serviceAddon.deleteMany({});
    console.log(`✓ Deleted serviceAddon: ${delAddons.count}`);

    const delPackages = await tx.servicePackage.deleteMany({});
    console.log(`✓ Deleted servicePackage: ${delPackages.count}`);

    // 10. Services
    const delServices = await tx.service.deleteMany({});
    console.log(`✓ Deleted service: ${delServices.count}`);

    // 11. Service Categories (dynamic only, preserve table)
    const delCategories = await tx.serviceCategory.deleteMany({});
    console.log(`✓ Deleted serviceCategory: ${delCategories.count}`);

    // 12. Customer Addresses
    const delAddresses = await tx.customerAddress.deleteMany({});
    console.log(`✓ Deleted customerAddress: ${delAddresses.count}`);

    // 13. Customer Users (all clients; admin users remain in adminUser)
    const delUsers = await tx.user.deleteMany({});
    console.log(`✓ Deleted customer users: ${delUsers.count}`);

    // 14. Business Notifications
    const delNotifications = await tx.notification.deleteMany({});
    console.log(`✓ Deleted notification: ${delNotifications.count}`);

    // 15. Audit Logs from past test actions
    const delAudit = await tx.auditLog.deleteMany({});
    console.log(`✓ Deleted auditLog: ${delAudit.count}`);

    // 16. Contact Messages & Backups
    const delContact = await tx.contactMessage.deleteMany({});
    console.log(`✓ Deleted contactMessage: ${delContact.count}`);

    const delBackups = await tx.backupRecord.deleteMany({});
    console.log(`✓ Deleted backupRecord: ${delBackups.count}`);

    return {
      delCashbacks: delCashbacks.count,
      delRenewals: delRenewals.count,
      delVisits: delVisits.count,
      delSubscriptions: delSubscriptions.count,
      delPlans: delPlans.count,
      delBookings: delBookings.count,
      delCouponUsages: delCouponUsages.count,
      delCoupons: delCoupons.count,
      delOffers: delOffers.count,
      delReviews: delReviews.count,
      delPortfolio: delPortfolio.count,
      delAddons: delAddons.count,
      delPackages: delPackages.count,
      delServices: delServices.count,
      delCategories: delCategories.count,
      delAddresses: delAddresses.count,
      delUsers: delUsers.count,
      delNotifications: delNotifications.count,
      delAudit: delAudit.count,
    };
  });

  console.log('\n================ POST-RESET VERIFICATION ================');
  const counts = {
    customers: await prisma.user.count(),
    services: await prisma.service.count(),
    servicePackages: await prisma.servicePackage.count(),
    serviceAddons: await prisma.serviceAddon.count(),
    bookings: await prisma.booking.count(),
    subscriptions: await prisma.subscription.count(),
    subscriptionVisits: await prisma.subscriptionVisit.count(),
    subscriptionRenewals: await prisma.subscriptionRenewal.count(),
    offers: await prisma.offer.count(),
    coupons: await prisma.coupon.count(),
    couponUsage: await prisma.couponUsage.count(),
    reviews: await prisma.review.count(),
    portfolio: await prisma.portfolioItem.count(),
    notifications: await prisma.notification.count(),
    auditLogs: await prisma.auditLog.count(),
    // Preserved tables
    adminUsers: await prisma.adminUser.count(),
    roles: await prisma.role.count(),
    systemSettings: await prisma.systemSettings.count(),
    locations: await prisma.locationGovernorate.count(),
  };

  console.log('Post-reset counts:');
  console.log(JSON.stringify(counts, null, 2));

  console.log('\n🎉 BUSINESS DATA RESET COMPLETED SUCCESSFULLY!');
}

resetBusinessData()
  .catch((err) => {
    console.error('❌ Reset failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
