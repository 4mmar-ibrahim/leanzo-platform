'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Sliders,
  Calendar,
  Palette,
  Phone,
  Share2,
  Bell,
  Database,
  Shield,
  ChevronLeft,
  Smartphone,
  ShieldCheck,
  Lock,
  Key,
  AlertTriangle,
  RefreshCw,
  Loader2,
  CheckCircle2,
  Trash2,
  Sparkles,
  Link2,
} from 'lucide-react';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { encryptFrontendStores, wipeAllFrontendStores } from '@/lib/services/platformDataControl';
import { toast } from 'sonner';

export default function AdminSettingsHubPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  // Encryption status state
  const [encryptionStatus, setEncryptionStatus] = useState<{
    isEncrypted: boolean;
    algorithm: string;
    totalRecordsEncrypted: number;
    lastEncryptedAt: string | null;
    breakdown: {
      customers: number;
      orders: number;
      messages: number;
    };
  }>({
    isEncrypted: false,
    algorithm: 'AES-256-GCM',
    totalRecordsEncrypted: 0,
    lastEncryptedAt: null,
    breakdown: { customers: 0, orders: 0, messages: 0 },
  });

  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  // Modals
  const [showEncryptModal, setShowEncryptModal] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');

  // Fetch encryption status
  const fetchStatus = useCallback(async () => {
    setIsLoadingStatus(true);
    try {
      const res = await cleanzoApi.settings.getEncryptionStatus();
      if (res) {
        setEncryptionStatus({
          isEncrypted: Boolean(res.isEncrypted),
          algorithm: res.algorithm || 'AES-256-GCM',
          totalRecordsEncrypted: res.totalRecordsEncrypted || 0,
          lastEncryptedAt: res.lastEncryptedAt || null,
          breakdown: res.breakdown || { customers: 0, orders: 0, messages: 0 },
        });
      }
    } catch (err: any) {
      console.warn('Failed to fetch encryption status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Execute full encryption
  const handleEncryptAll = async () => {
    setIsEncrypting(true);
    try {
      const res = await cleanzoApi.settings.encryptAllData();
      const localStats = encryptFrontendStores();
      const total = (res.totalRecordsEncrypted || 0) + localStats.customersCount + localStats.ordersCount;

      setEncryptionStatus({
        isEncrypted: true,
        algorithm: res.algorithm || 'AES-256-GCM',
        totalRecordsEncrypted: total,
        lastEncryptedAt: res.lastEncryptedAt || new Date().toISOString(),
        breakdown: res.breakdown || { customers: localStats.customersCount, orders: localStats.ordersCount, messages: 0 },
      });

      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تشفير شامل لبيانات المنصة',
        module: 'settings',
        target: 'All Platform Data',
        details: `تم تشفير ${total} حقل وسجل بنجاح في قاعدة البيانات والمتصفح باستخدام خوارزمية AES-256-GCM`,
      });

      toast.success(
        `تم تشفير جميع بيانات البرنامج بنجاح (${total} سجل مشفر بتقنية AES-256-GCM)`
      );
      setShowEncryptModal(false);
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'فشل تشفير بيانات البرنامج');
    } finally {
      setIsEncrypting(false);
    }
  };

  // Execute full data wipe
  const handleWipeAll = async () => {
    if (wipeConfirmInput.trim() !== 'مسح' && wipeConfirmInput.trim() !== 'WIPE') {
      toast.error('يرجى كتابة كلمة "مسح" لتأكيد التصفير');
      return;
    }

    setIsWiping(true);
    try {
      const res = await cleanzoApi.settings.wipeAllData('مسح');
      wipeAllFrontendStores();

      setEncryptionStatus({
        isEncrypted: false,
        algorithm: 'AES-256-GCM',
        totalRecordsEncrypted: 0,
        lastEncryptedAt: null,
        breakdown: { customers: 0, orders: 0, messages: 0 },
      });

      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'مسح وإعادة ضبط بيانات الموقع',
        module: 'settings',
        target: 'All Platform Data',
        details: `تم مسح جميع بيانات الموقع بنجاح من كافة الأقسام مع حماية حساب المشرف الأعلى (${res.preservedAdmin})`,
      });

      toast.success(
        `تم مسح وإعادة ضبط جميع بيانات الموقع بنجاح من كافة الأقسام مع الحفاظ على حساب المشرف الأعلى`
      );
      setShowWipeModal(false);
      setWipeConfirmInput('');
      fetchStatus();
    } catch (err: any) {
      toast.error(err.message || 'فشل مسح البيانات');
    } finally {
      setIsWiping(false);
    }
  };

  const sections = [
    {
      title: 'الأمان وتشفير البيانات (Security & Encryption)',
      desc: 'تشفير جميع بيانات البرنامج بتقنية AES-256-GCM، فحص الأمان، ومسح وتصفير البيانات الآمن',
      href: '/admin/settings/security',
      icon: ShieldCheck,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      title: 'الإعدادات العامة (General)',
      desc: 'اسم الشركة، العملة الرسمية، اللغة الافتراضية والمنطقة الزمنية',
      href: '/admin/settings/general',
      icon: Sliders,
      color: 'text-sky-500 bg-sky-500/10',
    },
    {
      title: 'الهوية والعلامة التجارية (Branding)',
      desc: 'الشعار، أيقونة المتصفح (Favicon)، ألوان المنصة، الشريط الإعلاني، ووضع الصيانة',
      href: '/admin/settings/branding',
      icon: Palette,
      color: 'text-purple-500 bg-purple-500/10',
    },
    {
      title: 'روابط أسفل الموقع والفوتر (Footer Links)',
      desc: 'إدارة وحذف وإضافة الروابط السريعة وفئات الخدمات المعروضة أسفل الموقع بالكامل',
      href: '/admin/settings/footer-links',
      icon: Link2,
      color: 'text-cyan-500 bg-cyan-500/10',
    },
    {
      title: 'تجربة الموبايل (Mobile Experience)',
      desc: 'التحكم في واجهة التطبيق، الحجز السريع، الأزرار العائمة، وإخفاء الهيرو',
      href: '/admin/settings/mobile',
      icon: Smartphone,
      color: 'text-blue-500 bg-blue-500/10',
    },
    {
      title: 'قواعد الحجز والمواعيد (Booking Rules)',
      desc: 'أيام وساعات العمل، فترات الراحة، الفواصل الزمنية، وتواريخ الإجازات',
      href: '/admin/settings/booking',
      icon: Calendar,
      color: 'text-[#0866C6] bg-[#0866C6]/10',
    },
    {
      title: 'بيانات التواصل والدعم (Contact Info)',
      desc: 'أرقام الهواتف، رابط واتساب، والعنوان المعروض في الموقع',
      href: '/admin/settings/contact',
      icon: Phone,
      color: 'text-emerald-500 bg-emerald-500/10',
    },
    {
      title: 'منصات التواصل الاجتماعي (Social Media)',
      desc: 'روابط فيسبوك، إنستجرام، تيك توك، يوتيوب، وواتساب',
      href: '/admin/settings/social',
      icon: Share2,
      color: 'text-indigo-500 bg-indigo-500/10',
    },
    {
      title: 'تفضيلات التنبيهات (Notification Settings)',
      desc: 'تنبيهات الحجوزات الجديدة، الإلغاءات وتسجيل العملاء',
      href: '/admin/settings/notifications',
      icon: Bell,
      color: 'text-amber-500 bg-amber-500/10',
    },
    {
      title: 'النسخ الاحتياطي والبيانات (Backup & Restore)',
      desc: 'تصدير نسخة احتياطية محلية، استيراد البيانات وسجل المزامنة',
      href: '/admin/settings/backup',
      icon: Database,
      color: 'text-rose-500 bg-rose-500/10',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            إعدادات النظام والمنصة
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            التحكم الشامل في قواعد العمل، المظهر، مركز الأمان والتشفير، وإدارة البيانات
          </p>
        </div>

        <button
          type="button"
          onClick={fetchStatus}
          disabled={isLoadingStatus}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin text-sky-500' : ''}`} />
          <span>تحديث حالة الأمان</span>
        </button>
      </div>

      {/* Primary Security & Full Data Encryption Control Panel */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-sky-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <span>مركز الأمان وتشفير جميع بيانات البرنامج</span>
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  </h2>
                  <p className="text-xs text-slate-300">
                    نظام الحماية المتقدم بخوارزمية التشفير القياسية العسكرية AES-256-GCM
                  </p>
                </div>
              </div>
            </div>

            {/* Current Status Badge */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                  encryptionStatus.isEncrypted
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    encryptionStatus.isEncrypted ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                  }`}
                />
                <span>
                  {encryptionStatus.isEncrypted
                    ? 'البيانات مشفرة ومؤمنة بالكامل'
                    : 'البيانات غير مشفرة حالياً'}
                </span>
              </span>
            </div>
          </div>

          {/* Encryption KPI Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-slate-400 text-[11px] block">خوارزمية التشفير</span>
              <span className="font-mono font-bold text-sky-300">{encryptionStatus.algorithm}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-slate-400 text-[11px] block">إجمالي السجلات المشفرة</span>
              <span className="font-mono font-bold text-emerald-300">
                {encryptionStatus.totalRecordsEncrypted.toLocaleString()} سجل
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-slate-400 text-[11px] block">حسابات العملاء المشفرة</span>
              <span className="font-mono font-bold text-indigo-300">
                {encryptionStatus.breakdown?.customers || 0} عميل
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 space-y-1">
              <span className="text-slate-400 text-[11px] block">الطلبات المشفرة</span>
              <span className="font-mono font-bold text-amber-300">
                {encryptionStatus.breakdown?.orders || 0} طلب
              </span>
            </div>
          </div>

          {/* Action Buttons Row */}
          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Encrypt All Button */}
            <button
              type="button"
              onClick={() => setShowEncryptModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-gradient-to-r from-sky-500 via-indigo-600 to-purple-600 hover:from-sky-600 hover:to-purple-700 text-white shadow-lg shadow-sky-500/20 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Key className="w-4 h-4" />
              <span>تشفير جميع بيانات البرنامج (Encrypt All)</span>
            </button>

            {/* Wipe Platform Data Button */}
            <button
              type="button"
              onClick={() => {
                setWipeConfirmInput('');
                setShowWipeModal(true);
              }}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold bg-rose-600/80 hover:bg-rose-600 text-white border border-rose-500/40 shadow-lg shadow-rose-600/10 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>مسح وإعادة ضبط بيانات الموقع (Wipe & Reset)</span>
            </button>

            {/* Dedicated Page Link */}
            <Link
              href="/admin/settings/security"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <ShieldCheck className="w-4 h-4 text-sky-400" />
              <span>مركز الأمان المتقدم &larr;</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Settings Hub Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((sec, idx) => {
          const Icon = sec.icon;
          return (
            <Link
              key={idx}
              href={sec.href}
              className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-sky-500/50 transition-all flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${sec.color} group-hover:scale-110 transition-transform`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-sky-500 transition-colors">
                    {sec.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{sec.desc}</p>
                </div>
              </div>
              <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-sky-500 transition-transform group-hover:-translate-x-1" />
            </Link>
          );
        })}
      </div>

      {/* Encrypt Confirmation Modal */}
      {showEncryptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4">
            <div className="flex items-center gap-3 text-sky-500">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  تأكيد تشفير جميع بيانات البرنامج
                </h3>
                <p className="text-xs text-slate-400">حماية عسكرية فورية لكافة قواعد البيانات</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 space-y-2 leading-relaxed">
              <p>
                سيقوم النظام فوراً بفحص كافة مجموعات قاعدة البيانات وتشفير الحقول التالية بتقنية{' '}
                <strong className="text-sky-500 font-mono">AES-256-GCM</strong>:
              </p>
              <ul className="list-disc list-inside space-y-1 text-slate-500 dark:text-slate-400">
                <li>أرقام هواتف وعناوين وإيميلات وملاحظات جميع العملاء.</li>
                <li>تفاصيل الحجوزات، العناوين، وملاحظات الطلبات.</li>
                <li>رسائل التواصل والتنبيهات الحساسة.</li>
              </ul>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold pt-1">
                ✓ لن يتعطل الموقع أو الحجز، وسيبقى كل شيء يعمل بسلاسة وشفافية تامة.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isEncrypting}
                onClick={() => setShowEncryptModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isEncrypting}
                onClick={handleEncryptAll}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white flex items-center gap-2 shadow-md shadow-sky-500/20 transition-all"
              >
                {isEncrypting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                <span>{isEncrypting ? 'جارٍ تشفير البيانات...' : 'بدء تشفير جميع البيانات الآن'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wipe Confirmation Modal */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-200 dark:border-rose-900/50 p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  مسح وإعادة ضبط بيانات الموقع (Wipe Data)
                </h3>
                <p className="text-xs text-rose-500 font-bold">إجراء تدميري لا يمكن التراجع عنه!</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 space-y-2 leading-relaxed">
              <p className="font-bold">تنبيه حاسم:</p>
              <ul className="list-disc list-inside space-y-1 opacity-90 text-[11px]">
                <li>سيتم مسح كافة الطلبات والحجوزات المسجلة.</li>
                <li>سيتم مسح حسابات العملاء وعناوينهم والرسائل وسجلات النشاط.</li>
                <li>
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    حماية المشرف:
                  </strong>{' '}
                  حساب المشرف الأعلى (Super Admin) محمي تماماً ولن يتم حذفه لتتمكن من متابعة الدخول فوراً.
                </li>
              </ul>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                لتأكيد المسح، اكتب كلمة <span className="text-rose-600 font-black">مسح</span> في المربع أدناه:
              </label>
              <input
                type="text"
                value={wipeConfirmInput}
                onChange={(e) => setWipeConfirmInput(e.target.value)}
                placeholder="اكتب مسح للتأكيد..."
                className="w-full p-2.5 rounded-xl border border-rose-200 dark:border-rose-800 bg-white dark:bg-slate-950 text-xs font-bold text-center text-rose-600 placeholder:text-slate-400 focus:outline-hidden focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isWiping}
                onClick={() => {
                  setShowWipeModal(false);
                  setWipeConfirmInput('');
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isWiping || (wipeConfirmInput.trim() !== 'مسح' && wipeConfirmInput.trim() !== 'WIPE')}
                onClick={handleWipeAll}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all"
              >
                {isWiping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isWiping ? 'جارٍ مسح وتصفير البيانات...' : 'تأكيد مسح وتصفير البيانات'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
