'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  Bell,
  CheckCheck,
  X,
  Car,
  Gift,
  CalendarCheck,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import { useCustomerNotificationStore } from '@/store/useCustomerNotificationStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { cn } from '@/lib/utils';

interface CustomerNotificationCenterProps {
  buttonClassName?: string;
  iconClassName?: string;
}

export function CustomerNotificationCenter({
  buttonClassName,
  iconClassName,
}: CustomerNotificationCenterProps = {}) {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const notifications = useCustomerNotificationStore((s) => s.notifications);
  const markAsRead = useCustomerNotificationStore((s) => s.markAsRead);
  const markAllAsRead = useCustomerNotificationStore((s) => s.markAllAsRead);

  // Directly derive reactive unread counter from notifications array
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when open on mobile
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getNotificationIcon = (type?: string, title?: string) => {
    if (type === 'offer' || title?.includes('خصم') || title?.includes('Discount')) {
      return <Gift className="w-4 h-4 text-[#F0444C]" />;
    }
    if (title?.includes('🚗') || title?.includes('الطريق') || title?.includes('on the Way')) {
      return <Car className="w-4 h-4 text-[#0866C6]" />;
    }
    if (title?.includes('👷') || title?.includes('الفني') || title?.includes('Specialist') || title?.includes('Technician')) {
      return <UserCheck className="w-4 h-4 text-[#0866C6]" />;
    }
    if (title?.includes('🎉') || title?.includes('اكتمال') || title?.includes('نعيماً') || title?.includes('Completed')) {
      return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
    }
    if (title?.includes('✨') || title?.includes('تنفيذ') || title?.includes('Progress') || title?.includes('جارٍ')) {
      return <Sparkles className="w-4 h-4 text-cyan-500" />;
    }
    if (title?.includes('❌') || title?.includes('إلغاء') || title?.includes('Cancelled')) {
      return <XCircle className="w-4 h-4 text-rose-500" />;
    }
    if (title?.includes('⏳') || title?.includes('مراجعة') || title?.includes('Review') || title?.includes('الانتظار') || title?.includes('Pending')) {
      return <Clock className="w-4 h-4 text-amber-500" />;
    }
    if (title?.includes('✅') || title?.includes('تأكيد') || title?.includes('حجز') || title?.includes('Confirmed')) {
      return <CalendarCheck className="w-4 h-4 text-emerald-500" />;
    }
    return <Bell className="w-4 h-4 text-[#0866C6]" />;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors',
          buttonClassName
        )}
        aria-label="Notifications"
      >
        <Bell className={cn('w-5 h-5', iconClassName)} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-4 h-4 rounded-full bg-[#F0444C] text-white text-[10px] font-black flex items-center justify-center animate-pulse shadow-2xs">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Render Portal directly to body to break free of any ancestor backdrop filters / clipping */}
      {mounted &&
        isOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-start sm:items-end p-0 sm:p-6 select-none">
            {/* Dark Backdrop Overlay */}
            <div
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in-0 duration-200"
            />

            {/* Notification Sheet / Dialog */}
            <div
              dir={direction}
              className={cn(
                'relative z-[101] w-full sm:w-[420px] max-h-[82vh] sm:max-h-[580px]',
                'bg-white dark:bg-[#082845] rounded-t-3xl sm:rounded-3xl',
                'border border-slate-200 dark:border-[#133B61] shadow-2xl',
                'flex flex-col overflow-hidden',
                'animate-in slide-in-from-bottom sm:slide-in-from-top-4 duration-250'
              )}
            >
              {/* Mobile Drag Handle */}
              <div className="w-12 h-1 rounded-full bg-slate-300 dark:bg-slate-700 mx-auto mt-2.5 mb-1 sm:hidden" />

              {/* Modal Header */}
              <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-100 dark:border-[#133B61]/80">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0866C6]/10 dark:bg-[#0866C6]/20 text-[#0866C6] flex items-center justify-center">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-black text-sm text-[#07345C] dark:text-white">
                      {isAr ? 'مركز التنبيهات' : 'Notifications'}
                    </h3>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {unreadCount > 0
                        ? isAr
                          ? `لديك ${unreadCount} تنبيهات غير مقروءة`
                          : `You have ${unreadCount} unread notifications`
                        : isAr
                        ? 'جميع التنبيهات مقروءة'
                        : 'All notifications are read'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-[#0866C6] dark:text-[#3894ec] hover:bg-[#0866C6]/10 transition-colors flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>{isAr ? 'قراءة الكل' : 'Mark all read'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Notifications Scrollable List */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 text-start">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-[#041728] flex items-center justify-center mx-auto text-slate-400">
                      <Bell className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                      {isAr ? 'لا توجد تنبيهات جديدة حالياً.' : 'No notifications yet.'}
                    </p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        if (!notif.read) {
                          markAsRead(notif.id);
                        }
                      }}
                      className={cn(
                        'p-3.5 rounded-2xl transition-all cursor-pointer border text-start space-y-2 select-text',
                        !notif.read
                          ? 'bg-[#0866C6]/5 dark:bg-[#07345C]/40 border-[#0866C6]/30 shadow-xs'
                          : 'bg-slate-50/60 dark:bg-[#082845]/50 border-slate-100 dark:border-[#133B61]/80 hover:bg-slate-100 dark:hover:bg-[#082845] opacity-80'
                      )}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className={cn(
                              'w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-2xs',
                              !notif.read
                                ? 'bg-white dark:bg-[#082845] text-[#0866C6]'
                                : 'bg-slate-100 dark:bg-[#041728] text-slate-400'
                            )}
                          >
                            {getNotificationIcon(notif.type, notif.title)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs sm:text-sm font-black text-[#07345C] dark:text-white truncate">
                                {isAr ? notif.title : notif.titleEn}
                              </h4>
                              {!notif.read && (
                                <span className="w-2 h-2 rounded-full bg-[#0866C6] shrink-0 animate-pulse" />
                              )}
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap shrink-0">
                          {notif.timestamp}
                        </span>
                      </div>

                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed pe-1">
                        {isAr ? notif.message : notif.messageEn}
                      </p>

                      <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-[#133B61]/60 mt-1">
                        {!notif.read ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                            }}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-[#0866C6]/15 text-[#0866C6] hover:bg-[#0866C6] hover:text-white transition-colors"
                          >
                            <CheckCheck className="w-3 h-3" />
                            <span>{isAr ? 'تحديد كمقروء' : 'Mark as read'}</span>
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-400">
                            <CheckCheck className="w-3 h-3 text-[#0866C6]" />
                            <span>{isAr ? 'تمت القراءة' : 'Read'}</span>
                          </span>
                        )}

                        {notif.link && (
                          <Link
                            href={notif.link}
                            onClick={(e) => {
                              e.stopPropagation();
                              markAsRead(notif.id);
                              setIsOpen(false);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-bold text-[#0866C6] dark:text-[#3894ec] hover:underline"
                          >
                            <span>{isAr ? 'عرض التفاصيل' : 'View Details'}</span>
                            <ArrowIcon className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
