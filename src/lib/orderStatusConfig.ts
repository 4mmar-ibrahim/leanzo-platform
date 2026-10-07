/**
 * CLEANZO - SINGLE AUTHORITATIVE ORDER STATUS & TRACKING CONFIGURATION
 * Single source of truth for Order Status Banner, Stepper Timeline, and Visual State.
 */

import { Order, OrderStatus } from '@/types';
import { formatTimeTo12Hour } from './timeUtils';
import {
  Clock,
  CheckCircle2,
  ShieldCheck,
  Car,
  Sparkles,
  AlertCircle,
  LucideIcon,
} from 'lucide-react';

export interface TimelineStepConfig {
  status: OrderStatus;
  index: number;
  labelAr: string;
  labelEn: string;
  descAr: (order: Order) => string;
  descEn: (order: Order) => string;
  icon: LucideIcon;
}

export const CANONICAL_TIMELINE_STEPS: TimelineStepConfig[] = [
  {
    status: 'pending',
    index: 0,
    labelAr: 'تم إنشاء الطلب',
    labelEn: 'Order Created',
    descAr: () => 'تم استلام طلبك بنجاح وجارٍ مراجعته من الفريق.',
    descEn: () => 'Your booking has been received and is queued for review.',
    icon: Clock,
  },
  {
    status: 'confirmed',
    index: 1,
    labelAr: 'تم تأكيد الطلب',
    labelEn: 'Order Confirmed',
    descAr: (order) =>
      order.date && order.time
        ? `تم تأكيد موعد الزيارة (${order.date} الساعة ${formatTimeTo12Hour(order.time)}) وحجز وحدة الخدمة.`
        : 'تم تأكيد الموعد وحجز وحدة الخدمة المتنقلة.',
    descEn: () => 'Appointment confirmed and service unit reserved.',
    icon: CheckCircle2,
  },
  {
    status: 'assigned',
    index: 2,
    labelAr: 'تم تعيين الفني المختص',
    labelEn: 'Technician Assigned',
    descAr: (order) =>
      order.technician?.name
        ? `تم إسناد الطلب للكابتن ${order.technician.name} (${order.technician.specialty || 'فني معتمد'}).`
        : 'تم تعيين فني معتمد مجهز بالكامل للزيارة.',
    descEn: (order) =>
      order.technician?.name
        ? `Assigned to specialist ${order.technician.name}.`
        : 'Assigned to certified specialist.',
    icon: ShieldCheck,
  },
  {
    status: 'on_the_way',
    index: 3,
    labelAr: 'الفني في الطريق إليك 🚗',
    labelEn: 'Technician on the way 🚗',
    descAr: (order) => {
      const area = order.address?.area ? ` إلى: ${order.address.area}` : '';
      const eta = order.travelTimeMinutes
        ? ` (الوقت المتوقع للوصول: حوالي ${order.travelTimeMinutes} دقيقة)`
        : '';
      return `تحركت وحدة الخدمة المتنقلة وهي متجهة إلى موقعك الآن${area}.${eta}`;
    },
    descEn: (order) =>
      order.travelTimeMinutes
        ? `Mobile unit is on the way (estimated travel time ~${order.travelTimeMinutes} min).`
        : 'Mobile unit has departed and is on the way to your location.',
    icon: Car,
  },
  {
    status: 'in_progress',
    index: 4,
    labelAr: 'جاري تنفيذ الخدمة 🧹',
    labelEn: 'Service in progress 🧹',
    descAr: () => 'يتم الآن تنفيذ أعمال التنظيف والتلميع بأحدث المعدات ومواد التعقيم المعتمدة.',
    descEn: () => 'Specialist is actively performing the cleaning with professional equipment.',
    icon: Sparkles,
  },
  {
    status: 'completed',
    index: 5,
    labelAr: 'تم الانتهاء بنجاح ✅',
    labelEn: 'Completed Successfully ✅',
    descAr: () => 'انتهت الخدمة بالكامل وتم تسليم العمل بأعلى معايير النظافة والتعقيم.',
    descEn: () => 'Service completed to 5-star perfection and customer satisfaction.',
    icon: CheckCircle2,
  },
];

/**
 * Returns canonical timeline step index for any status.
 */
export function getOrderStepIndex(status: OrderStatus | string): number {
  switch (status) {
    case 'pending':
      return 0;
    case 'confirmed':
      return 1;
    case 'assigned':
      return 2;
    case 'on_the_way':
      return 3;
    case 'in_progress':
      return 4;
    case 'completed':
      return 5;
    case 'cancelled':
      return -1;
    default:
      return 1;
  }
}

export interface StatusBannerData {
  title: string;
  description: string;
  badge: string;
  isLive: boolean;
  icon: LucideIcon;
  gradientClass: string;
  borderClass: string;
  iconBgClass: string;
  showCallButton: boolean;
  isCancelled: boolean;
}

/**
 * Generates the single authoritative status banner configuration strictly derived from saved backend order status.
 */
export function getAuthoritativeStatusBanner(order: Order, isAr: boolean = true): StatusBannerData {
  const status = order.status;
  const techName = order.technician?.name || (isAr ? 'الفني المعين' : 'Assigned Technician');
  const techPhone = order.technician?.phone;
  const areaName = order.address?.area
    ? `${order.address.area}${order.address.city ? `، ${order.address.city}` : ''}`
    : '';

  switch (status) {
    case 'pending':
      return {
        title: isAr ? 'طلبك قيد المراجعة والتأكيد ⏳' : 'Order Under Review ⏳',
        description: isAr
          ? 'تم استلام طلبك بنجاح وجارٍ مراجعته وتأكيده من فريق العمليات لتجهيز الموعد.'
          : 'Your booking request is received and is currently being reviewed by our team.',
        badge: isAr ? 'قيد المراجعة' : 'Pending',
        isLive: false,
        icon: Clock,
        gradientClass: 'bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5',
        borderClass: 'border-amber-500/30',
        iconBgClass: 'bg-amber-500 text-white shadow-amber-500/25',
        showCallButton: false,
        isCancelled: false,
      };

    case 'confirmed':
      return {
        title: isAr ? 'تم تأكيد موعد طلبك بنجاح ✓' : 'Appointment Confirmed ✓',
        description: isAr
          ? order.date && order.time
            ? `موعدك محجوز ليوم ${order.date} الساعة ${formatTimeTo12Hour(order.time)}. جاري تجهيز فريق العمل ووحدة الخدمة.`
            : 'تم تأكيد موعدك بنجاح وجاري تجهيز فريق العمل ووحدة الخدمة المتنقلة.'
          : 'Your appointment is confirmed. The team and mobile unit are being prepared.',
        badge: isAr ? 'مؤكد' : 'Confirmed',
        isLive: false,
        icon: CheckCircle2,
        gradientClass: 'bg-gradient-to-r from-sky-500/15 via-sky-500/10 to-sky-500/5',
        borderClass: 'border-sky-500/30',
        iconBgClass: 'bg-sky-500 text-white shadow-sky-500/25',
        showCallButton: false,
        isCancelled: false,
      };

    case 'assigned':
      return {
        title: isAr
          ? `تم تعيين الفني المختص (${techName}) 👷‍♂️`
          : `Technician Assigned (${techName}) 👷‍♂️`,
        description: isAr
          ? `تم إسناد الطلب للكابتن ${techName}. الوحدة مجهزة وتنتظر موعد التحرك المجدول في موعده المحدد.`
          : `Assigned to ${techName}. Service unit is prepared and scheduled for departure.`,
        badge: isAr ? 'تم تعيين الفني' : 'Technician Assigned',
        isLive: false,
        icon: ShieldCheck,
        gradientClass: 'bg-gradient-to-r from-indigo-500/15 via-indigo-500/10 to-indigo-500/5',
        borderClass: 'border-indigo-500/30',
        iconBgClass: 'bg-indigo-600 text-white shadow-indigo-500/25',
        showCallButton: Boolean(techPhone),
        isCancelled: false,
      };

    case 'on_the_way': {
      const etaText = order.travelTimeMinutes
        ? isAr
          ? ` (الوقت المتوقع للوصول: حوالي ${order.travelTimeMinutes} دقيقة)`
          : ` (ETA: ~${order.travelTimeMinutes} min)`
        : '';
      return {
        title: isAr
          ? `الفني في الطريق إليك الآن 🚗`
          : `Technician is on the way 🚗`,
        description: isAr
          ? `تحركت الوحدة المتنقلة وهي متجهة حالياً إلى موقعك${areaName ? `: ${areaName}` : ''}${etaText}.`
          : `Mobile service unit has departed and is on the way to your location${etaText}.`,
        badge: isAr ? 'مباشر LIVE' : 'LIVE On The Way',
        isLive: true,
        icon: Car,
        gradientClass: 'bg-gradient-to-r from-sky-500/20 via-[#0866C6]/15 to-sky-500/10',
        borderClass: 'border-sky-500/40',
        iconBgClass: 'bg-sky-500 text-white shadow-sky-500/30 animate-bounce',
        showCallButton: Boolean(techPhone),
        isCancelled: false,
      };
    }

    case 'in_progress':
      return {
        title: isAr
          ? 'جاري تنفيذ أعمال الخدمة حالياً 🧹'
          : 'Service Execution In Progress 🧹',
        description: isAr
          ? `الفني يعمل حالياً في موقعك لتقديم الخدمة بأعلى معايير الجودة والتعقيم المعتمدة.`
          : 'Specialist is currently executing the service at your location to high standards.',
        badge: isAr ? 'قيد التنفيذ LIVE' : 'LIVE In Progress',
        isLive: true,
        icon: Sparkles,
        gradientClass: 'bg-gradient-to-r from-blue-500/20 via-sky-500/15 to-blue-500/10',
        borderClass: 'border-blue-500/40',
        iconBgClass: 'bg-blue-600 text-white shadow-blue-500/30',
        showCallButton: Boolean(techPhone),
        isCancelled: false,
      };

    case 'completed':
      return {
        title: isAr
          ? 'تم الانتهاء واكتمال الطلب بنجاح ✅'
          : 'Service Completed Successfully ✅',
        description: isAr
          ? 'شكراً لاختيارك كلينزو! تم تسليم الخدمة بالكامل بأعلى معايير النظافة والرضا التام.'
          : 'Thank you for choosing Cleanzo! Your service was delivered to full satisfaction.',
        badge: isAr ? 'مكتمل بنجاح' : 'Completed',
        isLive: false,
        icon: CheckCircle2,
        gradientClass: 'bg-gradient-to-r from-emerald-500/15 via-emerald-500/10 to-emerald-500/5',
        borderClass: 'border-emerald-500/30',
        iconBgClass: 'bg-emerald-600 text-white shadow-emerald-500/25',
        showCallButton: false,
        isCancelled: false,
      };

    case 'cancelled':
    default:
      return {
        title: isAr ? 'تم إلغاء هذا الطلب ✕' : 'Order Cancelled ✕',
        description: isAr
          ? 'تم إلغاء هذا الطلب. يمكنك إعادة طلب الخدمة بنقرة واحدة وتحديد موعد جديد يناسبك.'
          : 'This booking has been cancelled. You can easily rebook at any time.',
        badge: isAr ? 'ملغي' : 'Cancelled',
        isLive: false,
        icon: AlertCircle,
        gradientClass: 'bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-rose-500/5',
        borderClass: 'border-rose-500/30',
        iconBgClass: 'bg-rose-600 text-white shadow-rose-500/25',
        showCallButton: false,
        isCancelled: true,
      };
  }
}
