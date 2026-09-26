'use client';

import React from 'react';
import { useTheme } from 'next-themes';
import { Sun, Moon, Laptop, Globe, Shield, LogOut, RotateCcw } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
  const { theme, setTheme } = useTheme();
  const { locale, setLocale, t } = useLocaleStore();
  const { rememberMe, logout, resetDemoUser } = useAuthStore();
  const isAr = locale === 'ar';

  const handleResetData = () => {
    if (confirm(isAr ? 'هل تريد استعادة البيانات التجريبية الافتراضية؟' : 'Reset all mock data to initial state?')) {
      resetDemoUser();
      toast.info(isAr ? 'تمت استعادة البيانات الافتراضية' : 'Mock data reset to defaults');
    }
  };

  return (
    <div className="space-y-6 text-start">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t.account.settings}
        </h2>
        <p className="text-xs text-slate-500">
          {isAr ? 'تخصيص المظهر واللغة وإعدادات الحساب' : 'Customize appearance, language and session'}
        </p>
      </div>

      <div className="space-y-6">
        {/* Appearance Settings */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span>{t.common.theme}</span>
          </h3>

          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'light', label: t.common.light, icon: Sun },
              { id: 'dark', label: t.common.dark, icon: Moon },
              { id: 'system', label: t.common.system, icon: Laptop },
            ].map((th) => {
              const Icon = th.icon;
              const isSelected = theme === th.id;

              return (
                <button
                  key={th.id}
                  onClick={() => setTheme(th.id)}
                  className={`p-3.5 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 text-xs font-bold transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{th.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Language Settings */}
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-500" />
            <span>{t.common.language}</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setLocale('ar')}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                locale === 'ar'
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span>العربية (RTL)</span>
            </button>

            <button
              onClick={() => setLocale('en')}
              className={`p-3.5 rounded-2xl border-2 flex items-center justify-center gap-2 text-xs font-bold transition-all ${
                locale === 'en'
                  ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
              }`}
            >
              <span>English (LTR)</span>
            </button>
          </div>
        </div>

        {/* Danger Zone & Reset */}
        <div className="p-6 rounded-3xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 space-y-4">
          <h3 className="text-sm font-bold text-rose-700 dark:text-rose-400">
            {isAr ? 'منطقة الصيانة وإعادة الضبط' : 'Reset Zone'}
          </h3>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-white">
                {isAr ? 'استعادة بيانات العرض التجريبي الأصلية' : 'Reset to Default Demo State'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isAr ? 'يعيد ضبط المستخدم والطلبات الافتراضية للاختبار من جديد' : 'Resets mock customer and orders to fresh seed data'}
              </p>
            </div>

            <Button variant="outline" size="sm" onClick={handleResetData} className="border-rose-300 text-rose-700 dark:text-rose-400 hover:bg-rose-100">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isAr ? 'إعادة ضبط البيانات' : 'Reset Data'}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
