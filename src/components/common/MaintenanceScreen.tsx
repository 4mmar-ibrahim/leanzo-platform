'use client';

import React from 'react';
import { Wrench, MessageCircle, Phone, Clock } from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useLocaleStore } from '@/store/useLocaleStore';

export function MaintenanceScreen() {
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const maintenanceMessage = useSettingsStore(
    (s) => s.settings.branding?.maintenanceMessage
  ) || 'الموقع يخضع حالياً لترقية وتحسينات وسنعود للعمل خلال وقت قصير.';

  return (
    <div className="fixed inset-0 z-50 bg-[#041728] text-white flex items-center justify-center p-4">
      <div className="max-w-lg w-full text-center space-y-6 animate-in fade-in zoom-in-95">
        <div className="w-20 h-20 rounded-3xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-2xl">
          <Wrench className="w-10 h-10 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>{isAr ? 'ترقية وصيانة مجدولة' : 'Scheduled Maintenance'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {isAr ? 'نعمل على تحسين تجربتكم الآن' : 'We are updating Cleanzo'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
            {maintenanceMessage}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
          <p className="font-bold text-white">هل لديك حجز عاجل ترغب في تنفيذه؟</p>
          <p className="text-[11px] text-slate-400">فريق خدمة العملاء متواجد على مدار الساعة عبر واتساب لحجز المواعيد يدوياً فوراً.</p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <a
              href="https://wa.me/201012345678"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-2 shadow-md transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              <span>واتساب مباشر</span>
            </a>
            <a
              href="tel:01012345678"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span>اتصال هاتفي</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
