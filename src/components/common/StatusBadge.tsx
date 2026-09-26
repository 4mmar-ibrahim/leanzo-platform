'use client';

import React from 'react';
import { OrderStatus } from '@/types';
import { useLocaleStore } from '@/store/useLocaleStore';
import { Clock, CheckCircle2, UserCheck, PlayCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: OrderStatus;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';

  const configs: Record<
    OrderStatus,
    { labelAr: string; labelEn: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    pending: {
      labelAr: 'قيد المراجعة',
      labelEn: 'Pending',
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-700 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800',
      icon: Clock,
    },
    confirmed: {
      labelAr: 'مستلم',
      labelEn: 'Received',
      bg: 'bg-[#F0F6FC] dark:bg-[#082845]',
      text: 'text-[#0866C6] dark:text-[#7CB5F0]',
      border: 'border-[#0866C6]/20 dark:border-[#0866C6]/40',
      icon: CheckCircle2,
    },
    assigned: {
      labelAr: 'تم تعيين الفني',
      labelEn: 'Assigned',
      bg: 'bg-slate-100 dark:bg-[#0D3357]',
      text: 'text-[#07345C] dark:text-[#F8FAFC]',
      border: 'border-slate-200 dark:border-[#133B61]',
      icon: UserCheck,
    },
    in_progress: {
      labelAr: 'قيد التنفيذ',
      labelEn: 'In Progress',
      bg: 'bg-[#F0F6FC] dark:bg-[#082845]',
      text: 'text-[#0866C6] dark:text-[#7CB5F0]',
      border: 'border-[#0866C6]/20 dark:border-[#0866C6]/40',
      icon: PlayCircle,
    },
    completed: {
      labelAr: 'مكتمل',
      labelEn: 'Completed',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      icon: CheckCircle2,
    },
    cancelled: {
      labelAr: 'ملغي',
      labelEn: 'Cancelled',
      bg: 'bg-[#FEECEE] dark:bg-[#380C10]',
      text: 'text-[#F0444C] dark:text-[#F87176]',
      border: 'border-[#F0444C]/25 dark:border-[#F0444C]/40',
      icon: XCircle,
    },
  };

  const current = configs[status] || configs.pending;
  const Icon = current.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors',
        current.bg,
        current.text,
        current.border,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{isAr ? current.labelAr : current.labelEn}</span>
    </span>
  );
}
