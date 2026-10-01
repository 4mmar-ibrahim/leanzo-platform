import prisma from '../config/prisma.js';
import { Booking, IBooking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';
import { LocationGovernorate } from '../models/Location.js';
import { Coupon } from '../models/Coupon.js';
import { CouponUsage } from '../models/CouponUsage.js';
import { Technician } from '../models/Technician.js';

export type ReportPeriod =
  | 'today'
  | 'yesterday'
  | 'last_7_days'
  | 'last_30_days'
  | 'this_month'
  | 'last_month'
  | 'this_year'
  | 'custom'
  | 'all';

export interface ReportFilter {
  period?: ReportPeriod | string;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
}

export interface ParsedDateRange {
  start: Date;
  end: Date;
  startStr: string; // YYYY-MM-DD
  endStr: string;   // YYYY-MM-DD
  prevStart: Date;
  prevEnd: Date;
  prevStartStr: string;
  prevEndStr: string;
  periodName: string;
}

/**
 * Standardized Date Range & Symmetrical Previous Period Calculator
 */
export function parseDateFilter(filter: ReportFilter = {}): ParsedDateRange {
  const period = (filter.period || 'this_month') as ReportPeriod;
  const now = new Date();

  let start: Date;
  let end: Date;
  let prevStart: Date;
  let prevEnd: Date;

  switch (period) {
    case 'today': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      // Previous: Yesterday
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      break;
    }
    case 'yesterday': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
      // Previous: Day before yesterday
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 2, 23, 59, 59, 999);
      break;
    }
    case 'last_7_days': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      // Previous: 7 days before that
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23, 59, 59, 999);
      break;
    }
    case 'last_30_days': {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      // Previous: 30 days before that
      prevStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 23, 59, 59, 999);
      break;
    }
    case 'last_month': {
      // First day of last month
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      // Last day of last month
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      // Previous: Month before that
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'this_year': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      // Previous: Entire last year
      prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      if (filter.startDate && filter.endDate) {
        start = new Date(`${filter.startDate}T00:00:00.000Z`);
        end = new Date(`${filter.endDate}T23:59:59.999Z`);
        const durationMs = end.getTime() - start.getTime();
        prevEnd = new Date(start.getTime() - 1);
        prevStart = new Date(prevEnd.getTime() - durationMs);
      } else {
        // Fallback to this month if custom range is incomplete
        start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
        prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      }
      break;
    }
    case 'all': {
      start = new Date(2020, 0, 1, 0, 0, 0, 0);
      end = new Date(2035, 11, 31, 23, 59, 59, 999);
      prevStart = new Date(2010, 0, 1, 0, 0, 0, 0);
      prevEnd = new Date(2019, 11, 31, 23, 59, 59, 999);
      break;
    }
    case 'this_month':
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
  }

  const formatStr = (d: Date) => d.toISOString().split('T')[0];

  return {
    start,
    end,
    startStr: formatStr(start),
    endStr: formatStr(end),
    prevStart,
    prevEnd,
    prevStartStr: formatStr(prevStart),
    prevEndStr: formatStr(prevEnd),
    periodName: period,
  };
}

/**
 * Builds standard query for bookings in the specified range.
 * Supports date string range ($gte startStr, $lte endStr) and/or createdAt range.
 */
function buildBookingDateQuery(range: ParsedDateRange) {
  return {
    $or: [
      { date: { $gte: range.startStr, $lte: range.endStr } },
      { createdAt: { $gte: range.start, $lte: range.end } },
    ],
  };
}

/**
 * Helper to calculate growth percentage safely without Infinity or NaN.
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  const delta = current - previous;
  return Math.round((delta / previous) * 100 * 10) / 10;
}

// ==========================================
// 1. OVERVIEW REPORT
// ==========================================
export async function getReportsOverview(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);
  const bookingQuery = buildBookingDateQuery(range);

  const [
    totalCustomers,
    newCustomersInPeriod,
    bookings,
    servicesCount,
    governoratesCount,
    couponsCount,
  ] = await Promise.all([
    User.countDocuments({ isDeleted: { $ne: true } }),
    User.countDocuments({
      isDeleted: { $ne: true },
      createdAt: { $gte: range.start, $lte: range.end },
    }),
    Booking.find(bookingQuery).lean(),
    Service.countDocuments({ isArchived: { $ne: true }, available: { $ne: false } }),
    LocationGovernorate.countDocuments({ active: { $ne: false } }),
    Coupon.countDocuments({ isArchived: { $ne: true } }),
  ]);

  const totalOrders = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === 'completed');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');
  const pendingBookings = bookings.filter((b) => b.status === 'pending');
  const inProgressBookings = bookings.filter((b) =>
    ['confirmed', 'assigned', 'in_progress'].includes(b.status)
  );

  // Financials: Strictly completed revenue
  const completedRevenue = completedBookings.reduce(
    (sum, b) => sum + (Number(b.finalPrice) || 0),
    0
  );
  const totalDiscounts = bookings.reduce(
    (sum, b) => sum + (Number(b.discount) || 0),
    0
  );
  const grossPotentialRevenue = bookings
    .filter((b) => b.status !== 'cancelled')
    .reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0);

  const averageOrderValue =
    completedBookings.length > 0
      ? Math.round(completedRevenue / completedBookings.length)
      : totalOrders > 0
      ? Math.round(grossPotentialRevenue / totalOrders)
      : 0;

  const cancellationRate =
    totalOrders > 0
      ? Math.round((cancelledBookings.length / totalOrders) * 100 * 10) / 10
      : 0;

  const completionRate =
    totalOrders > 0
      ? Math.round((completedBookings.length / totalOrders) * 100 * 10) / 10
      : 0;

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    kpis: {
      totalCustomers,
      newCustomersInPeriod,
      totalOrders,
      completedOrders: completedBookings.length,
      cancelledOrders: cancelledBookings.length,
      pendingOrders: pendingBookings.length,
      inProgressOrders: inProgressBookings.length,
      completedRevenue,
      grossPotentialRevenue,
      totalDiscounts,
      averageOrderValue,
      cancellationRate,
      completionRate,
      activeServices: servicesCount,
      activeCoverageAreas: governoratesCount,
      activeCoupons: couponsCount,
    },
  };
}

// ==========================================
// 2. CUSTOMERS REPORT
// ==========================================
export async function getCustomersReport(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);

  const [allCustomers, newCustomers, bookings] = await Promise.all([
    User.find({ isDeleted: { $ne: true } })
      .select('name phone email status totalSpent ordersCount addresses createdAt source tags')
      .lean(),
    User.countDocuments({
      isDeleted: { $ne: true },
      createdAt: { $gte: range.start, $lte: range.end },
    }),
    Booking.find({
      $or: [
        { date: { $gte: range.startStr, $lte: range.endStr } },
        { createdAt: { $gte: range.start, $lte: range.end } },
      ],
    })
      .select('customerId customerPhone customerName serviceSnapshot address status finalPrice')
      .lean(),
  ]);

  const totalCustomers = allCustomers.length;

  // Active in period: customers who have placed at least 1 booking in the current period
  const activeCustomerPhones = new Set<string>();
  const customerServiceFreq: Record<string, number> = {};
  const customerGovernorateFreq: Record<string, number> = {};

  bookings.forEach((b) => {
    if (b.customerPhone) {
      activeCustomerPhones.add(b.customerPhone.trim());
    }
    const sTitle = b.serviceSnapshot?.title || 'خدمة عامة';
    customerServiceFreq[sTitle] = (customerServiceFreq[sTitle] || 0) + 1;

    const gov = b.address?.governorate || 'غير محدد';
    customerGovernorateFreq[gov] = (customerGovernorateFreq[gov] || 0) + 1;
  });

  const activeInPeriodCount = activeCustomerPhones.size;
  const inactiveInPeriodCount = Math.max(0, totalCustomers - activeInPeriodCount);

  // Return rate: customers with > 1 completed booking
  let returningCustomersCount = 0;
  let totalCustomerCompletedOrders = 0;

  allCustomers.forEach((c) => {
    const ordersCount = c.ordersCount || 0;
    totalCustomerCompletedOrders += ordersCount;
    if (ordersCount > 1) {
      returningCustomersCount++;
    }
  });

  const returnRate =
    totalCustomers > 0
      ? Math.round((returningCustomersCount / totalCustomers) * 100 * 10) / 10
      : 0;

  const averageOrdersPerCustomer =
    totalCustomers > 0
      ? Math.round((totalCustomerCompletedOrders / totalCustomers) * 10) / 10
      : 0;

  // Sort areas & services breakdown
  const customersByGovernorate = Object.entries(customerGovernorateFreq)
    .map(([governorate, count]) => ({ governorate, count }))
    .sort((a, b) => b.count - a.count);

  const customersByService = Object.entries(customerServiceFreq)
    .map(([service, count]) => ({ service, count }))
    .sort((a, b) => b.count - a.count);

  // List of customers mapped with fresh stats
  const customersList = allCustomers.map((c) => ({
    id: c._id.toString(),
    name: c.name,
    phone: c.phone,
    email: c.email || '',
    status: c.status,
    ordersCount: c.ordersCount || 0,
    totalSpent: c.totalSpent || 0,
    governorate: c.addresses?.[0]?.governorate || 'القاهرة',
    city: c.addresses?.[0]?.city || c.addresses?.[0]?.area || 'الرئيسية',
    createdAt: c.createdAt,
    source: c.source || 'website',
  }));

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    summary: {
      totalCustomers,
      newCustomers,
      activeInPeriodCount,
      inactiveInPeriodCount,
      returningCustomersCount,
      returnRate,
      averageOrdersPerCustomer,
    },
    customersByGovernorate,
    customersByService,
    customersList,
  };
}

// ==========================================
// 3. ORDERS REPORT
// ==========================================
export async function getOrdersReport(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);
  const bookingQuery = buildBookingDateQuery(range);

  const bookings = await Booking.find(bookingQuery)
    .sort({ createdAt: -1 })
    .lean();

  const totalOrders = bookings.length;
  let pendingCount = 0;
  let confirmedCount = 0;
  let assignedCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalDurationMinutes = 0;
  let completedRevenue = 0;

  const ordersByServiceMap: Record<string, { title: string; count: number; revenue: number }> = {};
  const ordersByCategoryMap: Record<string, number> = { car: 0, home: 0 };
  const ordersByGovernorateMap: Record<string, number> = {};
  const ordersTimelineMap: Record<string, { count: number; completedRevenue: number }> = {};

  bookings.forEach((b) => {
    switch (b.status) {
      case 'pending':
        pendingCount++;
        break;
      case 'confirmed':
        confirmedCount++;
        break;
      case 'assigned':
        assignedCount++;
        break;
      case 'in_progress':
        inProgressCount++;
        break;
      case 'completed':
        completedCount++;
        completedRevenue += Number(b.finalPrice) || 0;
        break;
      case 'cancelled':
        cancelledCount++;
        break;
    }

    totalDurationMinutes += Number(b.duration) || Number(b.serviceDurationMinutes) || 45;

    // By service
    const sId = b.serviceId || 'srv-unknown';
    const sTitle = b.serviceSnapshot?.title || 'خدمة كلينزو';
    if (!ordersByServiceMap[sId]) {
      ordersByServiceMap[sId] = { title: sTitle, count: 0, revenue: 0 };
    }
    ordersByServiceMap[sId].count++;
    if (b.status === 'completed') {
      ordersByServiceMap[sId].revenue += Number(b.finalPrice) || 0;
    }

    // By category
    const cat = b.category === 'home' ? 'home' : 'car';
    ordersByCategoryMap[cat] = (ordersByCategoryMap[cat] || 0) + 1;

    // By governorate
    const gov = b.address?.governorate || 'القاهرة';
    ordersByGovernorateMap[gov] = (ordersByGovernorateMap[gov] || 0) + 1;

    // By date string
    const dStr = b.date || (b.createdAt ? b.createdAt.toISOString().split('T')[0] : range.startStr);
    if (!ordersTimelineMap[dStr]) {
      ordersTimelineMap[dStr] = { count: 0, completedRevenue: 0 };
    }
    ordersTimelineMap[dStr].count++;
    if (b.status === 'completed') {
      ordersTimelineMap[dStr].completedRevenue += Number(b.finalPrice) || 0;
    }
  });

  const averageOrderValue =
    completedCount > 0 ? Math.round(completedRevenue / completedCount) : 0;
  const averageDurationMinutes =
    totalOrders > 0 ? Math.round(totalDurationMinutes / totalOrders) : 0;

  const ordersByService = Object.entries(ordersByServiceMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count);

  const ordersByGovernorate = Object.entries(ordersByGovernorateMap)
    .map(([governorate, count]) => ({ governorate, count }))
    .sort((a, b) => b.count - a.count);

  const ordersTimeline = Object.entries(ordersTimelineMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const ordersList = bookings.map((b) => ({
    id: b.id,
    customerName: b.customerName,
    customerPhone: b.customerPhone,
    serviceTitle: b.serviceSnapshot?.title || 'خدمة',
    category: b.category,
    date: b.date,
    time: b.time,
    status: b.status,
    basePrice: b.basePrice || 0,
    discount: b.discount || 0,
    finalPrice: b.finalPrice || 0,
    governorate: b.address?.governorate || 'القاهرة',
    city: b.address?.city || '',
    technicianName: b.technician?.name || '',
    createdAt: b.createdAt,
  }));

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    summary: {
      totalOrders,
      pendingCount,
      confirmedCount,
      assignedCount,
      inProgressCount,
      completedCount,
      cancelledCount,
      averageOrderValue,
      averageDurationMinutes,
      completedRevenue,
    },
    ordersByCategory: ordersByCategoryMap,
    ordersByService,
    ordersByGovernorate,
    ordersTimeline,
    ordersList,
  };
}

// ==========================================
// 4. REVENUE REPORT
// ==========================================
export async function getRevenueReport(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);
  const bookingQuery = buildBookingDateQuery(range);

  const bookings = await Booking.find(bookingQuery).lean();

  let grossBookedRevenue = 0;
  let completedRevenue = 0;
  let totalDiscountsGiven = 0;
  let totalCouponDiscounts = 0;

  const revenueByServiceMap: Record<string, { title: string; count: number; revenue: number }> = {};
  const revenueByGovernorateMap: Record<string, number> = {};
  const revenueByPaymentMethodMap: Record<string, { count: number; revenue: number }> = {
    cash: { count: 0, revenue: 0 },
    card: { count: 0, revenue: 0 },
    wallet: { count: 0, revenue: 0 },
  };
  const revenueTimelineMap: Record<string, number> = {};

  bookings.forEach((b) => {
    const finalPrice = Number(b.finalPrice) || 0;
    const discount = Number(b.discount) || 0;

    if (b.status !== 'cancelled') {
      grossBookedRevenue += finalPrice;
    }

    if (b.status === 'completed') {
      completedRevenue += finalPrice;
      totalDiscountsGiven += discount;

      if (b.couponSnapshot?.actualDiscountAmount) {
        totalCouponDiscounts += Number(b.couponSnapshot.actualDiscountAmount) || 0;
      }

      // By Service
      const sId = b.serviceId || 'srv-gen';
      const sTitle = b.serviceSnapshot?.title || 'خدمة كلينزو';
      if (!revenueByServiceMap[sId]) {
        revenueByServiceMap[sId] = { title: sTitle, count: 0, revenue: 0 };
      }
      revenueByServiceMap[sId].count++;
      revenueByServiceMap[sId].revenue += finalPrice;

      // By Governorate
      const gov = b.address?.governorate || 'القاهرة';
      revenueByGovernorateMap[gov] = (revenueByGovernorateMap[gov] || 0) + finalPrice;

      // Payment Method
      const method = (b.metadata?.paymentMethod || 'cash').toLowerCase();
      const resolvedMethod = method.includes('card') ? 'card' : method.includes('wallet') ? 'wallet' : 'cash';
      revenueByPaymentMethodMap[resolvedMethod].count++;
      revenueByPaymentMethodMap[resolvedMethod].revenue += finalPrice;

      // Timeline
      const dStr = b.date || (b.createdAt ? b.createdAt.toISOString().split('T')[0] : range.startStr);
      revenueTimelineMap[dStr] = (revenueTimelineMap[dStr] || 0) + finalPrice;
    }
  });

  const netRevenue = completedRevenue;

  const revenueByService = Object.entries(revenueByServiceMap)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenueByGovernorate = Object.entries(revenueByGovernorateMap)
    .map(([governorate, revenue]) => ({ governorate, revenue }))
    .sort((a, b) => b.revenue - a.revenue);

  const revenueTimeline = Object.entries(revenueTimelineMap)
    .map(([date, revenue]) => ({ date, revenue }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    summary: {
      completedRevenue,
      netRevenue,
      grossBookedRevenue,
      totalDiscountsGiven,
      totalCouponDiscounts,
      completedOrdersCount: bookings.filter((b) => b.status === 'completed').length,
    },
    revenueByService,
    revenueByGovernorate,
    revenueByPaymentMethod: revenueByPaymentMethodMap,
    revenueTimeline,
  };
}

// ==========================================
// 5. SERVICES REPORT
// ==========================================
export async function getServicesReport(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);
  const bookingQuery = buildBookingDateQuery(range);

  const [services, bookings] = await Promise.all([
    Service.find().lean(),
    Booking.find(bookingQuery).lean(),
  ]);

  const serviceStatsMap: Record<
    string,
    {
      id: string;
      title: string;
      category: string;
      price: number;
      active: boolean;
      bookingsCount: number;
      completedCount: number;
      revenue: number;
    }
  > = {};

  services.forEach((s) => {
    const isServiceActive = (s as any).active ?? (s.available !== false && !s.isArchived);
    serviceStatsMap[s.id] = {
      id: s.id,
      title: s.title,
      category: s.category || 'car',
      price: s.price || (s as any).basePrice || 0,
      active: Boolean(isServiceActive),
      bookingsCount: 0,
      completedCount: 0,
      revenue: 0,
    };
  });

  bookings.forEach((b) => {
    const sId = b.serviceId;
    if (!serviceStatsMap[sId]) {
      serviceStatsMap[sId] = {
        id: sId,
        title: b.serviceSnapshot?.title || sId,
        category: b.category || 'car',
        price: b.serviceSnapshot?.price || 0,
        active: true,
        bookingsCount: 0,
        completedCount: 0,
        revenue: 0,
      };
    }
    serviceStatsMap[sId].bookingsCount++;
    if (b.status === 'completed') {
      serviceStatsMap[sId].completedCount++;
      serviceStatsMap[sId].revenue += Number(b.finalPrice) || 0;
    }
  });

  // Package & Add-on Analytics
  const packageStatsMap: Record<string, { id: string; name: string; serviceTitle: string; bookingsCount: number; completedCount: number; revenue: number }> = {};
  const addonStatsMap: Record<string, { id: string; name: string; serviceTitle: string; count: number; revenue: number }> = {};
  let ordersWithAddonsCount = 0;

  bookings.forEach((b) => {
    // Package stats
    if (b.packageSnapshot && b.packageSnapshot.id) {
      const pkgId = b.packageSnapshot.id;
      const pkgName = b.packageSnapshot.name || 'باقة';
      const sTitle = b.serviceSnapshot?.title || '';
      if (!packageStatsMap[pkgId]) {
        packageStatsMap[pkgId] = { id: pkgId, name: pkgName, serviceTitle: sTitle, bookingsCount: 0, completedCount: 0, revenue: 0 };
      }
      packageStatsMap[pkgId].bookingsCount++;
      if (b.status === 'completed') {
        packageStatsMap[pkgId].completedCount++;
        packageStatsMap[pkgId].revenue += Number(b.packageSnapshot.price) || 0;
      }
    }

    // Addons stats
    const addonsList = Array.isArray(b.addons) ? b.addons : [];
    if (addonsList.length > 0) {
      ordersWithAddonsCount++;
      addonsList.forEach((a: any) => {
        if (!a || !a.id) return;
        const aId = a.id;
        const aName = a.name || 'إضافة';
        const sTitle = b.serviceSnapshot?.title || '';
        if (!addonStatsMap[aId]) {
          addonStatsMap[aId] = { id: aId, name: aName, serviceTitle: sTitle, count: 0, revenue: 0 };
        }
        addonStatsMap[aId].count++;
        if (b.status === 'completed') {
          addonStatsMap[aId].revenue += Number(a.price) || 0;
        }
      });
    }
  });

  const allServiceStats = Object.values(serviceStatsMap).map((item) => ({
    ...item,
    averageOrderValue: item.completedCount > 0 ? Math.round(item.revenue / item.completedCount) : 0,
  }));

  const activeServicesCount = services.filter((s) => (s as any).active ?? (s.available !== false && !s.isArchived)).length;
  const inactiveServicesCount = services.length - activeServicesCount;

  // Top and least requested services
  const sortedByDemand = [...allServiceStats].sort((a, b) => b.bookingsCount - a.bookingsCount);
  const mostRequested = sortedByDemand.slice(0, 5);
  const leastRequested = sortedByDemand.filter((s) => s.bookingsCount >= 0).slice(-5).reverse();

  // Top packages and add-ons
  const mostPopularPackages = Object.values(packageStatsMap).sort((a, b) => b.bookingsCount - a.bookingsCount);
  const mostPopularAddons = Object.values(addonStatsMap).sort((a, b) => b.count - a.count);
  const addonAttachmentRate = bookings.length > 0 ? Math.round((ordersWithAddonsCount / bookings.length) * 100) : 0;

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    summary: {
      totalServices: services.length,
      activeServicesCount,
      inactiveServicesCount,
      totalPackagesTracked: mostPopularPackages.length,
      totalAddonsTracked: mostPopularAddons.length,
      addonAttachmentRate,
    },
    mostRequested,
    leastRequested,
    allServices: sortedByDemand,
    mostPopularPackages,
    mostPopularAddons,
    addonAttachmentRate,
  };
}

// ==========================================
// 6. COVERAGE AREAS REPORT
// ==========================================
export async function getAreasReport(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);
  const bookingQuery = buildBookingDateQuery(range);

  const [governorates, customers, bookings] = await Promise.all([
    LocationGovernorate.find().lean(),
    User.find({ isDeleted: { $ne: true } }).select('addresses').lean(),
    Booking.find(bookingQuery).lean(),
  ]);

  const areaMap: Record<
    string,
    {
      id: string;
      name: string;
      nameEn: string;
      active: boolean;
      citiesCount: number;
      customersCount: number;
      ordersCount: number;
      completedOrders: number;
      revenue: number;
    }
  > = {};

  governorates.forEach((g) => {
    areaMap[g.name] = {
      id: g.id,
      name: g.name,
      nameEn: g.nameEn,
      active: g.active,
      citiesCount: g.cities ? g.cities.length : 0,
      customersCount: 0,
      ordersCount: 0,
      completedOrders: 0,
      revenue: 0,
    };
  });

  // Count customers per governorate
  customers.forEach((c) => {
    const gov = c.addresses?.[0]?.governorate;
    if (gov && areaMap[gov]) {
      areaMap[gov].customersCount++;
    }
  });

  // Count bookings & revenue per governorate
  bookings.forEach((b) => {
    const gov = b.address?.governorate || 'القاهرة';
    if (!areaMap[gov]) {
      areaMap[gov] = {
        id: gov,
        name: gov,
        nameEn: gov,
        active: true,
        citiesCount: 1,
        customersCount: 0,
        ordersCount: 0,
        completedOrders: 0,
        revenue: 0,
      };
    }
    areaMap[gov].ordersCount++;
    if (b.status === 'completed') {
      areaMap[gov].completedOrders++;
      areaMap[gov].revenue += Number(b.finalPrice) || 0;
    }
  });

  const areasList = Object.values(areaMap).sort((a, b) => b.ordersCount - a.ordersCount);

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    summary: {
      totalGovernorates: governorates.length,
      activeGovernorates: governorates.filter((g) => g.active).length,
    },
    areasList,
  };
}

// ==========================================
// 7. COUPONS REPORT
// ==========================================
export async function getCouponsReport(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);

  const [coupons, couponUsages] = await Promise.all([
    Coupon.find({ isArchived: { $ne: true } }).lean(),
    CouponUsage.find({
      usedAt: { $gte: range.start, $lte: range.end },
    }).lean(),
  ]);

  const todayStr = new Date().toISOString().split('T')[0];
  let activeCouponsCount = 0;
  let expiredCouponsCount = 0;

  const usageByCouponMap: Record<
    string,
    { code: string; redemptionsCount: number; totalDiscountValue: number }
  > = {};

  coupons.forEach((c) => {
    if (c.status === 'active' && c.endDate >= todayStr && c.currentUsageCount < c.totalUsageLimit) {
      activeCouponsCount++;
    } else {
      expiredCouponsCount++;
    }

    usageByCouponMap[c.code] = {
      code: c.code,
      redemptionsCount: c.currentUsageCount || 0,
      totalDiscountValue: 0,
    };
  });

  let periodRedemptionCount = couponUsages.length;
  let periodDiscountValue = 0;

  couponUsages.forEach((u) => {
    const amount = Number(u.actualDiscountAmount) || 0;
    periodDiscountValue += amount;

    if (!usageByCouponMap[u.couponCode]) {
      usageByCouponMap[u.couponCode] = {
        code: u.couponCode,
        redemptionsCount: 0,
        totalDiscountValue: 0,
      };
    }
    usageByCouponMap[u.couponCode].totalDiscountValue += amount;
  });

  const topCoupons = Object.values(usageByCouponMap).sort(
    (a, b) => b.redemptionsCount - a.redemptionsCount
  );

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    summary: {
      totalCoupons: coupons.length,
      activeCouponsCount,
      expiredCouponsCount,
      periodRedemptionCount,
      periodDiscountValue,
    },
    topCoupons,
    couponsList: coupons.map((c) => ({
      code: c.code,
      discountType: c.discountType,
      discountValue: c.discountValue,
      currentUsageCount: c.currentUsageCount || 0,
      totalUsageLimit: c.totalUsageLimit || 100,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      isExpired: c.endDate < todayStr,
    })),
  };
}

// ==========================================
// 8. BOOKINGS REPORT
// ==========================================
export async function getBookingsReport(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);
  const bookingQuery = buildBookingDateQuery(range);

  const bookings = await Booking.find(bookingQuery).lean();

  const totalBookings = bookings.length;
  let completedCount = 0;
  let cancelledCount = 0;

  const dayOfWeekMap: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const hourMap: Record<string, number> = {};

  bookings.forEach((b) => {
    if (b.status === 'completed') completedCount++;
    if (b.status === 'cancelled') cancelledCount++;

    const d = new Date(b.date);
    if (!isNaN(d.getDay())) {
      dayOfWeekMap[d.getDay()] = (dayOfWeekMap[d.getDay()] || 0) + 1;
    }

    // Time slot analysis
    const timeSlot = b.timeSlotStart || (b.time ? b.time.split(' ')[0] : '10:00');
    hourMap[timeSlot] = (hourMap[timeSlot] || 0) + 1;
  });

  const daysLabel = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const bookingsByDay = Object.entries(dayOfWeekMap).map(([dayIdx, count]) => ({
    dayIndex: Number(dayIdx),
    dayName: daysLabel[Number(dayIdx)],
    count,
  }));

  const busySlots = Object.entries(hourMap)
    .map(([slot, count]) => ({ slot, count }))
    .sort((a, b) => b.count - a.count);

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    summary: {
      totalBookings,
      completedCount,
      cancelledCount,
    },
    bookingsByDay,
    busySlots,
  };
}

// ==========================================
// 9. ANALYTICS & COMPARATIVE GROWTH
// ==========================================
export async function getAnalyticsOverview(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);

  // Current period bookings
  const currQuery = buildBookingDateQuery(range);
  const currBookings = await Booking.find(currQuery).lean();

  // Previous period bookings
  const prevQuery = {
    $or: [
      { date: { $gte: range.prevStartStr, $lte: range.prevEndStr } },
      { createdAt: { $gte: range.prevStart, $lte: range.prevEnd } },
    ],
  };
  const prevBookings = await Booking.find(prevQuery).lean();

  // Customer counts
  const [currCustomers, prevCustomers] = await Promise.all([
    User.countDocuments({
      isDeleted: { $ne: true },
      createdAt: { $gte: range.start, $lte: range.end },
    }),
    User.countDocuments({
      isDeleted: { $ne: true },
      createdAt: { $gte: range.prevStart, $lte: range.prevEnd },
    }),
  ]);

  // Current period metrics
  const currTotalOrders = currBookings.length;
  const currCompletedBookings = currBookings.filter((b) => b.status === 'completed');
  const currCancelledBookings = currBookings.filter((b) => b.status === 'cancelled');
  const currRevenue = currCompletedBookings.reduce(
    (sum, b) => sum + (Number(b.finalPrice) || 0),
    0
  );
  const currAOV =
    currCompletedBookings.length > 0
      ? Math.round(currRevenue / currCompletedBookings.length)
      : 0;

  // Previous period metrics
  const prevTotalOrders = prevBookings.length;
  const prevCompletedBookings = prevBookings.filter((b) => b.status === 'completed');
  const prevRevenue = prevCompletedBookings.reduce(
    (sum, b) => sum + (Number(b.finalPrice) || 0),
    0
  );
  const prevAOV =
    prevCompletedBookings.length > 0
      ? Math.round(prevRevenue / prevCompletedBookings.length)
      : 0;

  // Mathematically calculated true growth percentages
  const customerGrowth = calculateGrowth(currCustomers, prevCustomers);
  const ordersGrowth = calculateGrowth(currTotalOrders, prevTotalOrders);
  const revenueGrowth = calculateGrowth(currRevenue, prevRevenue);
  const aovGrowth = calculateGrowth(currAOV, prevAOV);

  // Efficiency rates
  const cancellationRate =
    currTotalOrders > 0
      ? Math.round((currCancelledBookings.length / currTotalOrders) * 100 * 10) / 10
      : 0;
  const completionRate =
    currTotalOrders > 0
      ? Math.round((currCompletedBookings.length / currTotalOrders) * 100 * 10) / 10
      : 0;

  const ordersWithCoupon = currBookings.filter(
    (b) => b.promoCode || b.couponSnapshot?.couponCode
  ).length;
  const couponAdoptionRate =
    currTotalOrders > 0
      ? Math.round((ordersWithCoupon / currTotalOrders) * 100 * 10) / 10
      : 0;

  // Category demand split
  const carOrders = currBookings.filter((b) => b.category === 'car').length;
  const homeOrders = currBookings.filter((b) => b.category === 'home').length;
  const carPercentage =
    currTotalOrders > 0 ? Math.round((carOrders / currTotalOrders) * 100) : 50;
  const homePercentage =
    currTotalOrders > 0 ? Math.round((homeOrders / currTotalOrders) * 100) : 50;

  // Peak booking hours distribution (09:00 to 20:00)
  const hourSlots = [
    { hour: '9 ص', h: 9 },
    { hour: '10 ص', h: 10 },
    { hour: '11 ص', h: 11 },
    { hour: '12 م', h: 12 },
    { hour: '1 م', h: 13 },
    { hour: '2 م', h: 14 },
    { hour: '3 م', h: 15 },
    { hour: '4 م', h: 16 },
    { hour: '5 م', h: 17 },
    { hour: '6 م', h: 18 },
    { hour: '7 م', h: 19 },
    { hour: '8 م', h: 20 },
  ];

  const hourCounts: Record<number, number> = {};
  currBookings.forEach((b) => {
    let h = 11;
    if (b.timeSlotStart) {
      const parts = b.timeSlotStart.split(':');
      h = parseInt(parts[0], 10);
    } else if (b.time) {
      const match = b.time.match(/(\d{1,2})/);
      if (match) {
        h = parseInt(match[1], 10);
        if ((b.time.includes('م') || b.time.toLowerCase().includes('pm')) && h < 12) {
          h += 12;
        }
      }
    }
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });

  const maxHourCount = Math.max(...Object.values(hourCounts), 1);
  const peakHours = hourSlots.map((slot) => {
    const count = hourCounts[slot.h] || 0;
    const load = currTotalOrders > 0 ? Math.round((count / maxHourCount) * 100) : 0;
    return {
      hour: slot.hour,
      hour24: slot.h,
      count,
      load,
      isPeak: load >= 70 && count > 0,
    };
  });

    // Subscriptions KPI & Growth from PostgreSQL
    const [currSubs, prevSubs, subPlans, currVisits, currCashbacks] = await Promise.all([
      prisma.subscription.findMany({
        where: { createdAt: { gte: range.start, lte: range.end } },
        include: { plan: true },
      }),
      prisma.subscription.findMany({
        where: { createdAt: { gte: range.prevStart, lte: range.prevEnd } },
      }),
      prisma.subscriptionPlan.findMany({ include: { service: true } }),
      prisma.subscriptionVisit.findMany({
        where: { createdAt: { gte: range.start, lte: range.end } },
      }),
      prisma.subscriptionCashback.findMany({
        where: { createdAt: { gte: range.start, lte: range.end } },
      }),
    ]);

    const currSubsCount = currSubs.length;
    const prevSubsCount = prevSubs.length;
    const subsGrowth = calculateGrowth(currSubsCount, prevSubsCount);

    const currSubsRevenue = currSubs.reduce((acc, s) => acc + (s.price || 0), 0);
    const prevSubsRevenue = prevSubs.reduce((acc, s) => acc + (s.price || 0), 0);
    const subsRevenueGrowth = calculateGrowth(currSubsRevenue, prevSubsRevenue);

    const currActiveSubs = currSubs.filter((s) => s.status === 'active').length;
    const prevActiveSubs = prevSubs.filter((s) => s.status === 'active').length;
    const activeSubsGrowth = calculateGrowth(currActiveSubs, prevActiveSubs);

    const currActiveValue = currSubs
      .filter((s) => s.status === 'active')
      .reduce((acc, s) => acc + (s.price || 0), 0);

    const currSubscribers = new Set(currSubs.map((s) => s.customerPhone)).size;
    const prevSubscribers = new Set(prevSubs.map((s) => s.customerPhone)).size;
    const subscribersGrowth = calculateGrowth(currSubscribers, prevSubscribers);

    const currCompletedSubs = currSubs.filter((s) => s.status === 'completed').length;
    const currExpiredSubs = currSubs.filter((s) => s.status === 'expired').length;
    const currRenewedSubs = currSubs.filter((s) => Boolean(s.renewedToId)).length;
    const currEligibleRenewal = currCompletedSubs + currExpiredSubs;
    const currRenewalRate =
      currEligibleRenewal > 0 ? Math.round((currRenewedSubs / currEligibleRenewal) * 100) : 0;

    const currCarSubs = currSubs.filter((s) => s.category === 'car').length;
    const currHomeSubs = currSubs.filter((s) => s.category === 'home').length;

    const completedVisits = currVisits.filter((v) => v.status === 'completed').length;
    const cancelledVisits = currVisits.filter((v) => v.status === 'cancelled').length;
    const rescheduledVisits = currVisits.filter(
      (v) => Boolean(v.rescheduledFrom) || Boolean(v.rescheduledAt)
    ).length;

    const cashbackGenerated = currCashbacks
      .filter((c) => c.type === 'credit')
      .reduce((acc, c) => acc + (c.amount || 0), 0);
    const cashbackUsed = currCashbacks
      .filter((c) => c.type === 'debit')
      .reduce((acc, c) => acc + (c.amount || 0), 0);

    const topPlans = subPlans
      .map((p) => {
        const pSubs = currSubs.filter((s) => s.planId === p.id);
        return {
          id: p.id,
          name: p.name,
          count: pSubs.length,
          revenue: pSubs.reduce((acc, s) => acc + (s.price || 0), 0),
          serviceTitle: p.service?.title || '',
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      period: range.periodName,
      currentRange: { start: range.startStr, end: range.endStr },
      previousRange: { start: range.prevStartStr, end: range.prevEndStr },
      comparisons: {
        customers: { current: currCustomers, previous: prevCustomers, growthPercent: customerGrowth },
        orders: { current: currTotalOrders, previous: prevTotalOrders, growthPercent: ordersGrowth },
        revenue: { current: currRevenue, previous: prevRevenue, growthPercent: revenueGrowth },
        averageOrderValue: { current: currAOV, previous: prevAOV, growthPercent: aovGrowth },
        subscriptions: {
          count: { current: currSubsCount, previous: prevSubsCount, growthPercent: subsGrowth },
          revenue: { current: currSubsRevenue, previous: prevSubsRevenue, growthPercent: subsRevenueGrowth },
          activeSubscriptions: { current: currActiveSubs, previous: prevActiveSubs, growthPercent: activeSubsGrowth },
          subscribers: { current: currSubscribers, previous: prevSubscribers, growthPercent: subscribersGrowth },
        },
      },
      subscriptionsAnalytics: {
        activeCount: currActiveSubs,
        activeValue: currActiveValue,
        renewalRate: currRenewalRate,
        renewedCount: currRenewedSubs,
        totalVisits: currVisits.length,
        completedVisits,
        cancelledVisits,
        rescheduledVisits,
        cashbackGenerated,
        cashbackUsed,
        carSubscriptions: currCarSubs,
        homeSubscriptions: currHomeSubs,
        carPercentage: currSubsCount > 0 ? Math.round((currCarSubs / currSubsCount) * 100) : 50,
        homePercentage: currSubsCount > 0 ? Math.round((currHomeSubs / currSubsCount) * 100) : 50,
        topPlans,
      },
      efficiency: {
        cancellationRate,
        completionRate,
        couponAdoptionRate,
        ordersWithCoupon,
      },
      categoryShare: {
        carOrders,
        homeOrders,
        carPercentage,
        homePercentage,
      },
      peakHours,
    };
  }

// ==========================================
// 10. DASHBOARD KPIS (Single Source of Truth)
// ==========================================
export async function getDashboardKPIs(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);
  const bookingQuery = buildBookingDateQuery(range);

  const [totalCustomers, bookings] = await Promise.all([
    User.countDocuments({ isDeleted: { $ne: true } }),
    Booking.find(bookingQuery).lean(),
  ]);

  const totalOrders = bookings.length;
  let newOrders = 0;
  let confirmedOrders = 0;
  let assignedOrders = 0;
  let inProgressOrders = 0;
  let completedOrders = 0;
  let cancelledOrders = 0;
  let completedRevenue = 0;

  const serviceCounts: Record<string, number> = {};

  // Daily distribution: Saturday through Friday
  const daysMap: Record<number, { rev: number; ord: number }> = {
    6: { rev: 0, ord: 0 }, // Saturday
    0: { rev: 0, ord: 0 }, // Sunday
    1: { rev: 0, ord: 0 }, // Monday
    2: { rev: 0, ord: 0 }, // Tuesday
    3: { rev: 0, ord: 0 }, // Wednesday
    4: { rev: 0, ord: 0 }, // Thursday
    5: { rev: 0, ord: 0 }, // Friday
  };

  bookings.forEach((b) => {
    switch (b.status) {
      case 'pending':
        newOrders++;
        break;
      case 'confirmed':
        confirmedOrders++;
        break;
      case 'assigned':
        assignedOrders++;
        break;
      case 'in_progress':
        inProgressOrders++;
        break;
      case 'completed':
        completedOrders++;
        completedRevenue += Number(b.finalPrice) || 0;
        break;
      case 'cancelled':
        cancelledOrders++;
        break;
    }

    const sTitle = b.serviceSnapshot?.title || 'خدمة كلينزو';
    serviceCounts[sTitle] = (serviceCounts[sTitle] || 0) + 1;

    const d = new Date(b.date);
    const dayIndex = isNaN(d.getDay()) ? 4 : d.getDay();
    if (daysMap[dayIndex]) {
      daysMap[dayIndex].ord += 1;
      if (b.status === 'completed') {
        daysMap[dayIndex].rev += Number(b.finalPrice) || 0;
      }
    }
  });

  const averageOrderValue =
    completedOrders > 0
      ? Math.round(completedRevenue / completedOrders)
      : totalOrders > 0
      ? Math.round(completedRevenue / totalOrders)
      : 0;

  // Most popular service
  let popularServiceName = 'لا توجد طلبات مسجلة';
  let maxServiceCount = 0;
  Object.entries(serviceCounts).forEach(([title, count]) => {
    if (count > maxServiceCount) {
      maxServiceCount = count;
      popularServiceName = title;
    }
  });
  const popularServicePct =
    totalOrders > 0 ? Math.round((maxServiceCount / totalOrders) * 100) : 0;

  const maxDailyRev = Math.max(...Object.values(daysMap).map((d) => d.rev), 1);
  const maxDailyOrd = Math.max(...Object.values(daysMap).map((d) => d.ord), 1);

  const dailyChart = [
    { day: 'السبت', rev: Math.round((daysMap[6].rev / maxDailyRev) * 100), ord: Math.round((daysMap[6].ord / maxDailyOrd) * 100), count: daysMap[6].ord, amount: daysMap[6].rev },
    { day: 'الأحد', rev: Math.round((daysMap[0].rev / maxDailyRev) * 100), ord: Math.round((daysMap[0].ord / maxDailyOrd) * 100), count: daysMap[0].ord, amount: daysMap[0].rev },
    { day: 'الاثنين', rev: Math.round((daysMap[1].rev / maxDailyRev) * 100), ord: Math.round((daysMap[1].ord / maxDailyOrd) * 100), count: daysMap[1].ord, amount: daysMap[1].rev },
    { day: 'الثلاثاء', rev: Math.round((daysMap[2].rev / maxDailyRev) * 100), ord: Math.round((daysMap[2].ord / maxDailyOrd) * 100), count: daysMap[2].ord, amount: daysMap[2].rev },
    { day: 'الأربعاء', rev: Math.round((daysMap[3].rev / maxDailyRev) * 100), ord: Math.round((daysMap[3].ord / maxDailyOrd) * 100), count: daysMap[3].ord, amount: daysMap[3].rev },
    { day: 'الخميس', rev: Math.round((daysMap[4].rev / maxDailyRev) * 100), ord: Math.round((daysMap[4].ord / maxDailyOrd) * 100), count: daysMap[4].ord, amount: daysMap[4].rev },
    { day: 'الجمعة', rev: Math.round((daysMap[5].rev / maxDailyRev) * 100), ord: Math.round((daysMap[5].ord / maxDailyOrd) * 100), count: daysMap[5].ord, amount: daysMap[5].rev },
  ];

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    totalCustomers,
    totalOrders,
    newOrders,
    completedOrders,
    cancelledOrders,
    inProgressOrders: inProgressOrders + assignedOrders + confirmedOrders,
    totalRevenue: completedRevenue,
    averageOrderValue,
    popularServiceName,
    popularServicePct,
    dailyChart,
  };
}

// ==========================================
// 11. SUBSCRIPTIONS REPORT (PostgreSQL Single Source of Truth)
// ==========================================
export async function getSubscriptionsReport(filter: ReportFilter = {}) {
  const range = parseDateFilter(filter);
  const now = new Date();

  const whereSub: any = {};
  if (filter.period !== 'all') {
    whereSub.createdAt = {
      gte: range.start,
      lte: range.end,
    };
  }

  // Fetch all live data directly from PostgreSQL via Prisma
  const [
    subs,
    allSubsHistorical,
    allVisits,
    allRenewals,
    allCashbacks,
    allPlans,
    allServices,
  ] = await Promise.all([
    prisma.subscription.findMany({
      where: whereSub,
      include: {
        plan: { include: { service: true } },
        service: true,
        visits: { orderBy: { visitIndex: 'asc' } },
        renewals: { orderBy: { renewedAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscription.findMany({
      select: { id: true, customerPhone: true, createdAt: true },
    }),
    prisma.subscriptionVisit.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscriptionRenewal.findMany({
      orderBy: { renewedAt: 'desc' },
    }),
    prisma.subscriptionCashback.findMany({
      orderBy: { createdAt: 'desc' },
    }),
    prisma.subscriptionPlan.findMany({
      include: { service: true },
    }),
    prisma.service.findMany(),
  ]);

  const totalSubscriptions = subs.length;
  const activeSubscriptions = subs.filter((s) => s.status === 'active').length;
  const completedSubscriptions = subs.filter((s) => s.status === 'completed').length;
  const cancelledSubscriptions = subs.filter((s) => s.status === 'cancelled').length;
  const expiredSubscriptions = subs.filter(
    (s) => s.status === 'expired' || (s.status === 'active' && s.endDate < now)
  ).length;

  const renewedSubscriptions = subs.filter((s) => Boolean(s.renewedToId)).length;
  const nonRenewedSubscriptions = Math.max(
    0,
    completedSubscriptions + expiredSubscriptions - renewedSubscriptions
  );

  const eligibleForRenewal = completedSubscriptions + expiredSubscriptions;
  const renewalRate =
    eligibleForRenewal > 0 ? Math.round((renewedSubscriptions / eligibleForRenewal) * 100) : 0;

  // Distinct subscribers in range
  const distinctPhones = new Set(subs.map((s) => s.customerPhone));
  const totalSubscribers = distinctPhones.size;

  // New subscription customers (phone seen for the first time ever within this period)
  const firstSeenMap = new Map<string, Date>();
  for (const h of allSubsHistorical) {
    const existing = firstSeenMap.get(h.customerPhone);
    if (!existing || h.createdAt < existing) {
      firstSeenMap.set(h.customerPhone, h.createdAt);
    }
  }

  let newSubscriptionCustomers = 0;
  for (const phone of distinctPhones) {
    const firstDate = firstSeenMap.get(phone);
    if (
      firstDate &&
      (!range.start || firstDate >= range.start) &&
      (!range.end || firstDate <= range.end)
    ) {
      newSubscriptionCustomers++;
    }
  }

  // Financials
  const subscriptionRevenue = subs.reduce((acc, s) => acc + (s.price || 0), 0);
  const activeSubscriptionValue = subs
    .filter((s) => s.status === 'active')
    .reduce((acc, s) => acc + (s.price || 0), 0);

  // Visits breakdown
  const subIdsSet = new Set(subs.map((s) => s.id));
  const relevantVisits = allVisits.filter((v) => subIdsSet.has(v.subscriptionId));
  const totalVisits = relevantVisits.length;
  const completedVisits = relevantVisits.filter((v) => v.status === 'completed').length;
  const cancelledVisits = relevantVisits.filter((v) => v.status === 'cancelled').length;
  const rescheduledVisits = relevantVisits.filter(
    (v) => Boolean(v.rescheduledFrom) || Boolean(v.rescheduledAt)
  ).length;
  const upcomingVisits = relevantVisits.filter((v) =>
    ['pending', 'confirmed', 'assigned'].includes(v.status)
  ).length;

  // Renewals in range
  const relevantRenewals = allRenewals.filter(
    (r) => subIdsSet.has(r.subscriptionId) || (r.newSubscriptionId && subIdsSet.has(r.newSubscriptionId))
  );
  const renewalRevenue = relevantRenewals.reduce((acc, r) => acc + (r.renewalPrice || 0), 0);

  // Cashback metrics
  const relevantCashbacks = allCashbacks.filter((c) => subIdsSet.has(c.subscriptionId));
  const cashbackGenerated = relevantCashbacks
    .filter((c) => c.type === 'credit')
    .reduce((acc, c) => acc + (c.amount || 0), 0);
  const cashbackUsed = relevantCashbacks
    .filter((c) => c.type === 'debit')
    .reduce((acc, c) => acc + (c.amount || 0), 0);
  const cashbackRemaining = Math.max(0, cashbackGenerated - cashbackUsed);

  // Plan Breakdown
  const planBreakdown = allPlans
    .map((p) => {
      const pSubs = subs.filter((s) => s.planId === p.id);
      const pRevenue = pSubs.reduce((acc, s) => acc + (s.price || 0), 0);
      const pVisits = relevantVisits.filter((v) => {
        const sub = subs.find((s) => s.id === v.subscriptionId);
        return sub?.planId === p.id;
      });
      const pCompletedVisits = pVisits.filter((v) => v.status === 'completed').length;
      const pRenewals = relevantRenewals.filter((r) => r.newPlanId === p.id).length;

      return {
        id: p.id,
        planId: p.id,
        name: p.name,
        planName: p.name,
        serviceTitle: p.service?.title || '',
        category: (p as any).category || (p.service?.category as string) || 'car',
        price: p.price,
        visitCount: p.visitCount,
        subscriptionCount: pSubs.length,
        activeCount: pSubs.filter((s) => s.status === 'active').length,
        completedCount: pSubs.filter((s) => s.status === 'completed').length,
        cancelledCount: pSubs.filter((s) => s.status === 'cancelled').length,
        revenue: pRevenue,
        visitsCount: pVisits.length,
        completedVisitsCount: pCompletedVisits,
        renewalsCount: pRenewals,
      };
    })
    .sort((a, b) => b.subscriptionCount - a.subscriptionCount);

  // Subscriptions by Service
  const serviceMap: Record<
    string,
    { serviceId: string; serviceTitle: string; category: string; count: number; revenue: number }
  > = {};
  for (const s of subs) {
    const sId = s.serviceId || 'unknown';
    const sTitle = s.service?.title || (s.serviceSnapshot as any)?.title || 'خدمة غير محددة';
    const sCat = s.category || (s.service?.category as string) || 'car';
    if (!serviceMap[sId]) {
      serviceMap[sId] = {
        serviceId: sId,
        serviceTitle: sTitle,
        category: sCat,
        count: 0,
        revenue: 0,
      };
    }
    serviceMap[sId].count++;
    serviceMap[sId].revenue += s.price || 0;
  }

  const subscriptionsByService = Object.values(serviceMap)
    .map((srv) => ({
      ...srv,
      sharePercentage:
        totalSubscriptions > 0 ? Math.round((srv.count / totalSubscriptions) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Subscriptions Timeline (daily distribution)
  const timelineMap: Record<string, { count: number; revenue: number; visits: number }> = {};
  for (const s of subs) {
    const dStr = s.createdAt ? s.createdAt.toISOString().split('T')[0] : range.startStr;
    if (!timelineMap[dStr]) {
      timelineMap[dStr] = { count: 0, revenue: 0, visits: 0 };
    }
    timelineMap[dStr].count++;
    timelineMap[dStr].revenue += s.price || 0;
  }
  for (const v of relevantVisits) {
    const dStr = v.date || (v.createdAt ? v.createdAt.toISOString().split('T')[0] : range.startStr);
    if (timelineMap[dStr]) {
      timelineMap[dStr].visits++;
    }
  }

  const subscriptionsTimeline = Object.entries(timelineMap)
    .map(([date, data]) => ({
      date,
      ...data,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Subscriptions List (Full details & Invoice printable objects)
  const subscriptionsList = subs.map((s) => ({
    id: s.id,
    subscriptionNumber: s.id,
    customerId: s.customerId,
    customerName: s.customerName,
    customerPhone: s.customerPhone,
    planId: s.planId,
    planName: s.plan?.name || (s.planSnapshot as any)?.name || 'خطة اشتراك',
    serviceId: s.serviceId,
    serviceTitle: s.service?.title || (s.serviceSnapshot as any)?.title || 'خدمة',
    category: s.category || 'car',
    price: s.price,
    totalVisits: s.totalVisits,
    usedVisits: s.usedVisits,
    remainingVisits: s.remainingVisits,
    status: s.status,
    startDate: s.startDate ? s.startDate.toISOString().split('T')[0] : '',
    endDate: s.endDate ? s.endDate.toISOString().split('T')[0] : '',
    autoRenew: s.autoRenew,
    renewalCycle: s.renewalCycle,
    renewedToId: s.renewedToId,
    renewedFromId: s.renewedFromId,
    address: s.address,
    vehicleDetails: s.vehicleDetails,
    createdAt: s.createdAt,
    visits: s.visits,
    renewals: s.renewals,
  }));

  return {
    period: range.periodName,
    startDate: range.startStr,
    endDate: range.endStr,
    summary: {
      totalSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      renewedSubscriptions,
      nonRenewedSubscriptions,
      totalSubscribers,
      newSubscriptionCustomers,
      totalRevenue: subscriptionRevenue,
      subscriptionRevenue,
      activeSubscriptionValue,
      totalVisits,
      completedVisits,
      cancelledVisits,
      rescheduledVisits,
      upcomingVisits,
      renewalRate,
      renewalRevenue,
      cashbackGenerated,
      cashbackUsed,
      cashbackRemaining,
    },
    planBreakdown,
    subscriptionsByService,
    subscriptionsTimeline,
    subscriptionsList,
    renewalsList: relevantRenewals,
  };
}

