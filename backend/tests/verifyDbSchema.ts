import prisma from '../src/config/prisma.js';

async function main() {
  const plans = await prisma.subscriptionPlan.count();
  const subs = await prisma.subscription.count();
  const visits = await prisma.subscriptionVisit.count();
  const renewals = await prisma.subscriptionRenewal.count();
  const cashbacks = await prisma.subscriptionCashback.count();
  const services = await prisma.service.count();
  const bookings = await prisma.booking.count();
  const users = await prisma.user.count();

  console.log('Database Verification Results:');
  console.log('  SubscriptionPlan count:', plans);
  console.log('  Subscription count:', subs);
  console.log('  SubscriptionVisit count:', visits);
  console.log('  SubscriptionRenewal count:', renewals);
  console.log('  SubscriptionCashback count:', cashbacks);
  console.log('  Services intact:', services);
  console.log('  Bookings intact:', bookings);
  console.log('  Users intact:', users);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Verification failed:', err);
    process.exit(1);
  });
