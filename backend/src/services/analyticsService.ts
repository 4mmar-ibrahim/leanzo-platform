import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { Service } from '../models/Service.js';

export interface AnalyticsFilter {
  period?: 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
}

export async function getDashboardAnalytics(filter: AnalyticsFilter = {}) {
  const { period = 'this_month', startDate, endDate } = filter;

  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), 1);
  let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (period === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (period === 'yesterday') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59);
  } else if (period === 'this_week') {
    const day = now.getDay();
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (6 - day), 23, 59, 59);
  } else if (period === 'this_year') {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (period === 'custom' && startDate && endDate) {
    start = new Date(startDate);
    end = new Date(`${endDate}T23:59:59`);
  } else if (period === 'all') {
    start = new Date(2020, 0, 1);
    end = new Date(2030, 11, 31);
  }

  const startStr = start.toISOString().split('T')[0];
  const endStr = end.toISOString().split('T')[0];

  // Bookings query
  const bookings = await Booking.find({
    date: { $gte: startStr, $lte: endStr },
  });

  // Calculate stats
  const totalBookings = bookings.length;
  let pendingCount = 0;
  let confirmedCount = 0;
  let assignedCount = 0;
  let inProgressCount = 0;
  let completedCount = 0;
  let cancelledCount = 0;
  let totalRevenue = 0;

  const serviceFrequency: Record<string, { title: string; count: number; revenue: number }> = {};

  for (const b of bookings) {
    switch (b.status) {
      case 'pending':
        pendingCount++;
        break;
      case 'confirmed':
        confirmedCount++;
        totalRevenue += b.finalPrice;
        break;
      case 'assigned':
        assignedCount++;
        totalRevenue += b.finalPrice;
        break;
      case 'in_progress':
        inProgressCount++;
        totalRevenue += b.finalPrice;
        break;
      case 'completed':
        completedCount++;
        totalRevenue += b.finalPrice;
        break;
      case 'cancelled':
        cancelledCount++;
        break;
    }

    const sId = b.serviceId;
    if (!serviceFrequency[sId]) {
      serviceFrequency[sId] = {
        title: b.serviceSnapshot?.title || sId,
        count: 0,
        revenue: 0,
      };
    }
    serviceFrequency[sId].count++;
    if (b.status !== 'cancelled') {
      serviceFrequency[sId].revenue += b.finalPrice;
    }
  }

  // Top services
  const topServices = Object.entries(serviceFrequency)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const averageBookingValue =
    completedCount + confirmedCount > 0 ? Math.round(totalRevenue / (completedCount + confirmedCount)) : 0;

  // Customers count
  const totalCustomers = await User.countDocuments();
  const newCustomers = await User.countDocuments({
    createdAt: { $gte: start, $lte: end },
  });

  return {
    period,
    startDate: startStr,
    endDate: endStr,
    metrics: {
      totalBookings,
      pendingCount,
      confirmedCount,
      assignedCount,
      inProgressCount,
      completedCount,
      cancelledCount,
      totalRevenue,
      averageBookingValue,
      totalCustomers,
      newCustomers,
      cancellationRate: totalBookings > 0 ? Math.round((cancelledCount / totalBookings) * 100) : 0,
    },
    topServices,
  };
}
