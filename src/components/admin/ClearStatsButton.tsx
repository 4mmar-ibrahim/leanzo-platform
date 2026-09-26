'use client';

import React, { useState } from 'react';
import { RefreshCw, Database } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface LiveSyncButtonProps {
  variant?: 'compact' | 'full';
  className?: string;
  onRefresh?: () => Promise<void> | void;
}

export function ClearStatsButton({ variant = 'full', className, onRefresh }: LiveSyncButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (onRefresh) {
        await onRefresh();
      }
      // Broadcast global event for any listening page/components
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('cleanzo:refresh-data'));
      }
      toast.success('تم جلب وتحديث كافة المؤشرات والبيانات الحية من قاعدة البيانات بنجاح');
    } catch (e: any) {
      toast.error('حدث خطأ أثناء مزامنة البيانات');
    } finally {
      setTimeout(() => setIsSyncing(false), 500);
    }
  };

  return (
    <button
      type="button"
      onClick={handleSync}
      disabled={isSyncing}
      className={cn(
        'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer',
        'bg-sky-50 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800 hover:bg-sky-100 dark:hover:bg-sky-900/50',
        className
      )}
      title="مزامنة وتحديث كافة المؤشرات والتقارير مباشرة من قاعدة البيانات"
    >
      <RefreshCw className={cn('w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0', isSyncing && 'animate-spin')} />
      <span>{variant === 'compact' ? 'تحديث حي' : 'تحديث البيانات الحية (Live Sync)'}</span>
    </button>
  );
}
