import prisma from '../config/prisma.js';
import { Notification } from '../models/Notification.js';
import { renewSubscription } from './subscriptionService.js';
import {
  getCurrentCairoDateString,
  getCurrentCairoTimeString,
} from './availabilityService.js';

/**
 * Calculates remaining hours from now to an appointment date and time in Africa/Cairo timezone.
 */
export function getCairoHoursUntilAppointment(dateStr: string, timeStr: string): number {
  try {
    const rawTime = String(timeStr || '').trim();
    const startPart = rawTime.split(/[-–—]/)[0].trim();
    const clean = startPart.replace(/(AM|PM|مساءً|صباحاً|مساء|صباح)/gi, '').trim();
    const [hStr, mStr] = clean.split(':');
    let hours = parseInt(hStr || '0', 10);
    const mins = parseInt(mStr || '0', 10);

    const isPM = rawTime.toUpperCase().includes('PM') || rawTime.includes('مساء');
    const isAM = rawTime.toUpperCase().includes('AM') || rawTime.includes('صباح');
    if (isPM && hours < 12) hours += 12;
    if (isAM && hours === 12) hours = 0;

    const [year, month, day] = dateStr.split('-').map(Number);
    const aptDate = new Date(year, month - 1, day, hours, mins, 0);

    const nowCairoDate = getCurrentCairoDateString();
    const nowCairoTime = getCurrentCairoTimeString();
    const [nowY, nowM, nowD] = nowCairoDate.split('-').map(Number);
    const [nowH, nowMin] = nowCairoTime.split(':').map(Number);
    const nowDate = new Date(nowY, nowM - 1, nowD, nowH, nowMin, 0);

    const diffMs = aptDate.getTime() - nowDate.getTime();
    return diffMs / (1000 * 60 * 60);
  } catch (err) {
    console.error('Error calculating hours until appointment:', err);
    return -999;
  }
}

/**
 * Core engine to run subscription scheduler cycle:
 * 1. Customer 24h & 12h unread notifications
 * 2. Admin 24h notifications with complete details
 * 3. Automatic renewal execution for eligible subscriptions
 */
export async function runSubscriptionSchedulerCycle(): Promise<{
  customerNotifs24h: number;
  customerNotifs12h: number;
  adminNotifs24h: number;
  autoRenewalsProcessed: number;
}> {
  let customerNotifs24h = 0;
  let customerNotifs12h = 0;
  let adminNotifs24h = 0;
  let autoRenewalsProcessed = 0;

  try {
    // -------------------------------------------------------------
    // PART 1: SUBSCRIPTION VISIT NOTIFICATIONS (24h & 12h)
    // -------------------------------------------------------------
    // Fetch all active/upcoming visits not cancelled or completed
    const upcomingVisits = await prisma.subscriptionVisit.findMany({
      where: {
        status: { in: ['pending', 'confirmed', 'assigned'] },
      },
      include: {
        subscription: {
          include: {
            plan: true,
            service: true,
          },
        },
      },
    });

    for (const visit of upcomingVisits) {
      const hoursUntil = getCairoHoursUntilAppointment(
        visit.date,
        visit.scheduledStart || visit.time
      );

      // Only evaluate visits in the upcoming window (0 to 36 hours)
      if (hoursUntil <= 0 || hoursUntil > 36) continue;

      const sub = visit.subscription;
      const serviceTitle = (visit.serviceSnapshot as any)?.title || sub?.service?.title || 'خدمة كلينزو';
      const planName = (sub?.planSnapshot as any)?.name || sub?.plan?.name || 'اشتراك كلينزو';
      const customerUserId = visit.customerId || sub?.customerId || undefined;
      const vehicleDesc = visit.vehicleDetails
        ? `${(visit.vehicleDetails as any).make || ''} ${(visit.vehicleDetails as any).model || ''}`.trim()
        : '';

      const customerLink24h = `/account/subscriptions?visitId=${visit.id}&reminder=24h`;
      const customerLink12h = `/account/subscriptions?visitId=${visit.id}&reminder=12h`;
      const adminLink24h = `/admin/subscriptions/visits?visitId=${visit.id}&reminder=24h`;

      // ---------------------------------------------------------
      // 1A. Customer 24-Hour Notification (Triggered between 12h and 26h)
      // ---------------------------------------------------------
      if (hoursUntil <= 26 && hoursUntil > 12) {
        // Check if 24h notification already sent
        const existing24hCust = await prisma.notification.findFirst({
          where: {
            target: 'customer',
            userId: customerUserId,
            link: customerLink24h,
          },
        });

        if (!existing24hCust) {
          await Notification.create({
            target: 'customer',
            userId: customerUserId,
            title: 'تذكير بموعد اشتراكك غداً ⏰',
            titleEn: 'Reminder: Your Subscription Visit Tomorrow',
            message: `موعد زيارتك القادمة لـ (${serviceTitle}) غداً بتاريخ ${visit.date} في تمام الساعة (${visit.time})${vehicleDesc ? ` للسيارة (${vehicleDesc})` : ''}. نتطلع لخدمتكم!`,
            messageEn: `Your upcoming visit for ${serviceTitle} is scheduled for tomorrow ${visit.date} at ${visit.time}.`,
            type: 'system',
            read: false,
            link: customerLink24h,
          });
          customerNotifs24h++;
        }
      }

      // ---------------------------------------------------------
      // 1B. Customer 12-Hour Notification (Triggered when <= 12h)
      // RULE: ONLY IF THE 24-HOUR NOTIFICATION WAS NOT SEEN / READ!
      // ---------------------------------------------------------
      if (hoursUntil <= 12 && hoursUntil > 0) {
        // Find existing 24h notification
        const existing24hCust = await prisma.notification.findFirst({
          where: {
            target: 'customer',
            userId: customerUserId,
            link: customerLink24h,
          },
        });

        // If 24h notification was already read, DO NOT send second notification!
        const is24hRead = existing24hCust ? existing24hCust.read : false;

        if (!is24hRead) {
          // Check if 12h notification was already sent
          const existing12hCust = await prisma.notification.findFirst({
            where: {
              target: 'customer',
              userId: customerUserId,
              link: customerLink12h,
            },
          });

          if (!existing12hCust) {
            await Notification.create({
              target: 'customer',
              userId: customerUserId,
              title: 'تذكير مهم: موعد زيارة اشتراكك اليوم ⚠️',
              titleEn: 'Important: Your Subscription Visit is in a few hours',
              message: `تذكير بموعد زيارة اشتراكك (${serviceTitle}) اليوم الساعة (${visit.time}). يرجى التأكد من تواجدكم أو تجهيز السيارة لاستقبال الفني.`,
              messageEn: `Important reminder: Your subscription visit for ${serviceTitle} is today at ${visit.time}.`,
              type: 'system',
              read: false,
              link: customerLink12h,
            });
            customerNotifs12h++;
          }
        }
      }

      // ---------------------------------------------------------
      // 1C. Admin 24-Hour Notification (Triggered between 0h and 26h)
      // ---------------------------------------------------------
      if (hoursUntil <= 26 && hoursUntil > 0) {
        const existing24hAdmin = await prisma.notification.findFirst({
          where: {
            target: 'admin',
            link: adminLink24h,
          },
        });

        if (!existing24hAdmin) {
          const techName = (visit.technician as any)?.name || 'لم يتم التعيين بعد';
          await Notification.create({
            target: 'admin',
            title: `موعد اشتراك قادم خلال 24 ساعة: ${visit.customerName}`,
            titleEn: `Upcoming Subscription Visit within 24h: ${visit.customerName}`,
            message: `موعد زيارة اشتراك رقم #${visit.id} (اشتراك #${visit.subscriptionId}) | العميل: ${visit.customerName} (${visit.customerPhone}) | الخدمة: ${serviceTitle} - ${planName} | الموعد: ${visit.date} ${visit.time} | الفني: ${techName}`,
            messageEn: `Subscription visit #${visit.id} for ${visit.customerName} on ${visit.date} at ${visit.time}. Technician: ${techName}`,
            type: 'system',
            read: false,
            link: adminLink24h,
          });
          adminNotifs24h++;
        }
      }
    }

    // -------------------------------------------------------------
    // PART 2: AUTOMATIC RENEWAL ENGINE (TASK 02)
    // -------------------------------------------------------------
    const now = new Date();
    // Subscriptions marked autoRenew=true, active or expired, whose endDate has passed and not already renewed
    const candidatesForAutoRenew = await prisma.subscription.findMany({
      where: {
        autoRenew: true,
        status: { in: ['active', 'expired'] },
        endDate: { lte: now },
        renewedToId: null,
      },
      include: {
        plan: true,
      },
    });

    for (const sub of candidatesForAutoRenew) {
      // Respect plan-level setting: allowRenewal / allowAutoRenewal
      const planAllowRenewal = sub.plan?.allowRenewal ?? true;
      if (!planAllowRenewal) {
        continue;
      }

      try {
        const previousVisits = await prisma.subscriptionVisit.findMany({
          where: { subscriptionId: sub.id },
          orderBy: { visitIndex: 'asc' },
        });

        const nextVisits = previousVisits.map((pv) => {
          const prevDate = new Date(pv.date);
          prevDate.setDate(prevDate.getDate() + (sub.plan?.durationDays || 30));
          return {
            date: prevDate.toISOString().split('T')[0],
            time: pv.timeSlotStart || pv.time || '10:00',
          };
        });

        await renewSubscription({
          subscriptionId: sub.id,
          visits: nextVisits,
          adminActor: {
            id: 'system',
            name: 'نظام التجديد التلقائي (Auto-Renewal Engine)',
            role: 'system',
          },
        });
        autoRenewalsProcessed++;
      } catch (renewErr) {
        console.error(`Failed to auto-renew subscription ${sub.id}:`, renewErr);
      }
    }

    // -------------------------------------------------------------
    // PART 3: EXPIRATION HANDLING & EXPIRATION ADVANCE ALERTS
    // -------------------------------------------------------------
    // 3A. Mark active subscriptions whose end date has passed as 'expired'
    await prisma.subscription.updateMany({
      where: {
        status: 'active',
        endDate: { lte: now },
        renewedToId: null,
      },
      data: {
        status: 'expired',
      },
    });

    // 3B. Advance reminder for subscriptions expiring within 3 days
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const expiringSoonSubs = await prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: { gt: now, lte: in3Days },
        renewedToId: null,
      },
      include: { plan: true },
    });

    for (const expSoon of expiringSoonSubs) {
      if (expSoon.customerId) {
        const notifKey = `/account/subscriptions?id=${expSoon.id}&reminder=expiring_soon`;
        const exists = await prisma.notification.findFirst({
          where: { target: 'customer', userId: expSoon.customerId, link: notifKey },
        });

        if (!exists) {
          const planName = (expSoon.planSnapshot as any)?.name || expSoon.plan?.name || 'اشتراك كلينزو';
          await Notification.create({
            target: 'customer',
            userId: expSoon.customerId,
            title: 'تنبيه: اقتراب موعد انتهاء باقة اشتراكك ⏳',
            titleEn: 'Reminder: Your Subscription is Expiring Soon',
            message: `سينتهي اشتراكك في باقة (${planName}) خلال 3 أيام. يمكنك التجديد الآن لضمان استمرار جدول مواعيدك بانتظام.`,
            messageEn: `Your subscription to (${planName}) will expire within 3 days. Renew now to maintain your schedule.`,
            type: 'system',
            read: false,
            link: notifKey,
          });
        }
      }
    }
  } catch (cycleErr) {
    console.error('Error during subscription scheduler cycle:', cycleErr);
  }

  return {
    customerNotifs24h,
    customerNotifs12h,
    adminNotifs24h,
    autoRenewalsProcessed,
  };
}

let schedulerTimer: NodeJS.Timeout | null = null;

/**
 * Starts the background subscription scheduler (runs every 5 minutes).
 */
export function startSubscriptionScheduler(intervalMs = 5 * 60 * 1000): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
  }

  console.log('⏰ [Subscription Scheduler] Started running every', Math.round(intervalMs / 1000), 'seconds.');

  // Run initial cycle shortly after boot
  setTimeout(() => {
    runSubscriptionSchedulerCycle().catch((e) =>
      console.error('[Subscription Scheduler] Initial cycle error:', e)
    );
  }, 5000);

  schedulerTimer = setInterval(() => {
    runSubscriptionSchedulerCycle().catch((e) =>
      console.error('[Subscription Scheduler] Scheduled cycle error:', e)
    );
  }, intervalMs);
}

/**
 * Stops the background scheduler
 */
export function stopSubscriptionScheduler(): void {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('⏹️ [Subscription Scheduler] Stopped.');
  }
}
