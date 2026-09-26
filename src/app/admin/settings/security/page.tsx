'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  Key,
  Database,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  ArrowRight,
  Sparkles,
  Users,
  Calendar,
  Layers,
  History,
  FileText,
  Clock,
} from 'lucide-react';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { encryptFrontendStores, wipeAllFrontendStores } from '@/lib/services/platformDataControl';
import { toast } from 'sonner';

interface EncryptionLogItem {
  id: string;
  timestamp: string;
  status: 'success' | 'failed';
  algorithm: string;
  totalRecordsEncrypted: number;
  breakdown?: {
    customers?: number;
    orders?: number;
    messages?: number;
    addresses?: number;
  };
  errorMessage?: string;
  initiatedBy?: string;
}

export default function SecurityAndEncryptionPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const [encryptionStatus, setEncryptionStatus] = useState<{
    isEncrypted: boolean;
    algorithm: string;
    totalRecordsEncrypted: number;
    lastEncryptedAt: string | null;
    breakdown: {
      customers: number;
      orders: number;
      messages: number;
      addresses?: number;
    };
  }>({
    isEncrypted: false,
    algorithm: 'AES-256-GCM',
    totalRecordsEncrypted: 0,
    lastEncryptedAt: null,
    breakdown: { customers: 0, orders: 0, messages: 0 },
  });

  const [encryptionLogs, setEncryptionLogs] = useState<EncryptionLogItem[]>([]);
  const [isLoadingStatus, setIsLoadingStatus] = useState(true);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [isWiping, setIsWiping] = useState(false);
  const [encryptionError, setEncryptionError] = useState<string | null>(null);

  // Modals
  const [showEncryptModal, setShowEncryptModal] = useState(false);
  const [showWipeModal, setShowWipeModal] = useState(false);
  const [wipeConfirmInput, setWipeConfirmInput] = useState('');

  // Format Date to localized Arabic format
  const formatDateTime = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'لا يوجد تشفير سابق';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'غير محدد';
      return new Intl.DateTimeFormat('ar-EG', {
        dateStyle: 'full',
        timeStyle: 'medium',
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Fetch encryption status & logs
  const fetchStatusAndLogs = useCallback(async () => {
    setIsLoadingStatus(true);
    setEncryptionError(null);
    try {
      // 1. Status
      const statusRes = await cleanzoApi.settings.getEncryptionStatus();
      if (statusRes) {
        setEncryptionStatus({
          isEncrypted: Boolean(statusRes.isEncrypted),
          algorithm: statusRes.algorithm || 'AES-256-GCM',
          totalRecordsEncrypted: statusRes.totalRecordsEncrypted || 0,
          lastEncryptedAt: statusRes.lastEncryptedAt || null,
          breakdown: statusRes.breakdown || { customers: 0, orders: 0, messages: 0 },
        });
      }

      // 2. Logs
      try {
        const logsRes = await cleanzoApi.settings.getEncryptionLogs();
        if (Array.isArray(logsRes)) {
          setEncryptionLogs(logsRes);
        }
      } catch (logErr) {
        console.warn('Failed to load encryption logs from backend:', logErr);
      }
    } catch (err: any) {
      console.warn('Failed to fetch encryption status:', err);
    } finally {
      setIsLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    fetchStatusAndLogs();
  }, [fetchStatusAndLogs]);

  // Execute full encryption
  const handleEncryptAll = async () => {
    setIsEncrypting(true);
    setEncryptionError(null);
    try {
      // 1. Encrypt Database Data via Backend API
      const res = await cleanzoApi.settings.encryptAllData();

      // 2. Synchronize Frontend Stores & LocalStorage
      const localStats = encryptFrontendStores();

      const totalCalculated = (res.totalRecordsEncrypted || 0) + localStats.customersCount + localStats.ordersCount;
      const nowIso = res.lastEncryptedAt || new Date().toISOString();

      setEncryptionStatus({
        isEncrypted: true,
        algorithm: res.algorithm || 'AES-256-GCM',
        totalRecordsEncrypted: totalCalculated,
        lastEncryptedAt: nowIso,
        breakdown: res.breakdown || {
          customers: localStats.customersCount,
          orders: localStats.ordersCount,
          messages: 0,
        },
      });

      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تشفير شامل لبيانات المنصة',
        module: 'settings',
        target: 'All Platform Data',
        details: `تم تشفير ${totalCalculated} سجل بنجاح في قاعدة البيانات والمتصفح بخوارزمية AES-256-GCM`,
      });

      toast.success(
        `تم تشفير جميع بيانات البرنامج بنجاح (${totalCalculated} سجل مشفر بتقنية AES-256-GCM)`
      );
      setShowEncryptModal(false);
      await fetchStatusAndLogs();
    } catch (err: any) {
      const msg = err.message || 'فشل تشفير بيانات البرنامج. يرجى التحقق من اتصال قاعدة البيانات.';
      setEncryptionError(msg);
      toast.error(msg);
      // Refresh logs to show the recorded failed run
      fetchStatusAndLogs();
    } finally {
      setIsEncrypting(false);
    }
  };

  // Execute comprehensive data wipe
  const handleWipeAll = async () => {
    if (wipeConfirmInput.trim() !== 'مسح' && wipeConfirmInput.trim() !== 'WIPE') {
      toast.error('يرجى كتابة كلمة "مسح" لتأكيد التصفير النهائي');
      return;
    }

    setIsWiping(true);
    try {
      // 1. Wipe Database via Backend API
      const res = await cleanzoApi.settings.wipeAllData('مسح');

      // 2. Wipe ALL Client Stores & localStorage
      wipeAllFrontendStores();

      // 3. Reset local encryption status
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
        action: 'مسح وإعادة ضبط شامل لجميع بيانات الموقع',
        module: 'settings',
        target: 'All Platform Data',
        details: `تم مسح جميع بيانات الموقع من كافة الأقسام مع الحفاظ على حساب المشرف الأعلى (${res.preservedAdmin})`,
      });

      const detailsList = [
        res.deletedOrders ? `${res.deletedOrders} طلب` : null,
        res.deletedCustomers ? `${res.deletedCustomers} عميل` : null,
        res.deletedServices ? `${res.deletedServices} خدمة` : null,
        res.deletedCoupons ? `${res.deletedCoupons} كوبون` : null,
        res.deletedOffers ? `${res.deletedOffers} عرض` : null,
        res.deletedLocations ? `${res.deletedLocations} محافظة/مدينة` : null,
        res.deletedPortfolio ? `${res.deletedPortfolio} عمل بالمعرض` : null,
      ]
        .filter(Boolean)
        .join('، ');

      toast.success(
        `تم مسح وإعادة ضبط جميع بيانات الموقع بنجاح (${detailsList || 'تم تفريغ كافة الأقسام'}) مع الحفاظ على حساب المشرف الأعلى`
      );

      setShowWipeModal(false);
      setWipeConfirmInput('');
      await fetchStatusAndLogs();
    } catch (err: any) {
      toast.error(err.message || 'فشل مسح البيانات بالكامل. يرجى مراجعة تفاصيل الخطأ.');
    } finally {
      setIsWiping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <Link href="/admin/settings" className="hover:text-sky-500 transition-colors">
              إعدادات النظام
            </Link>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-200 font-semibold">
              الأمان وتشفير البيانات
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-sky-500" />
            <span>مركز الأمان وتشفير جميع بيانات البرنامج</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            تشفير فعلي شامل للبيانات الحساسة بخوارزمية AES-256-GCM، ومسح شامل لجميع أقسام الموقع
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/settings"
            className="flex items-center gap-1 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>رجوع للإعدادات</span>
          </Link>
          <button
            type="button"
            onClick={fetchStatusAndLogs}
            disabled={isLoadingStatus}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-500/20 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingStatus ? 'animate-spin' : ''}`} />
            <span>تحديث السجل</span>
          </button>
        </div>
      </div>

      {/* Error Alert if any */}
      {encryptionError && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-3">
          <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold">حدث خطأ أثناء تنفيذ عملية التشفير:</h4>
            <p>{encryptionError}</p>
          </div>
        </div>
      )}

      {/* Main Status Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 shadow-xl border border-indigo-500/30">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-sky-400 shrink-0 shadow-inner">
                <Lock className="w-7 h-7 text-sky-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">
                    حالة تشفير بيانات المنصة
                  </h2>
                  <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  خوارزمية التشفير القياسية: <span className="font-mono text-sky-300 font-bold">AES-256-GCM</span>
                </p>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex items-center gap-2 self-start md:self-auto">
              <span
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold shadow-sm ${
                  encryptionStatus.isEncrypted
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
                    : 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                }`}
              >
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
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

          {/* Last Encrypted Date Banner */}
          <div className="p-4 rounded-2xl bg-white/10 border border-white/15 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs backdrop-blur-xs">
            <div className="flex items-center gap-2 text-slate-200">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="font-semibold">تاريخ ووقت آخر عملية تشفير:</span>
              <span className="font-bold text-sky-300">{formatDateTime(encryptionStatus.lastEncryptedAt)}</span>
            </div>
            <div className="text-slate-300 text-[11px]">
              إجمالي السجلات المشفرة: <span className="font-bold font-mono text-emerald-300">{encryptionStatus.totalRecordsEncrypted.toLocaleString()} سجل</span>
            </div>
          </div>

          {/* Breakdown Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px]">عملاء مشفرون</span>
              </div>
              <span className="font-mono font-bold text-indigo-300 text-sm block">
                {(encryptionStatus.breakdown?.customers || 0).toLocaleString()} عميل
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[11px]">طلبات مشفرة</span>
              </div>
              <span className="font-mono font-bold text-amber-300 text-sm block">
                {(encryptionStatus.breakdown?.orders || 0).toLocaleString()} طلب
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-[11px]">رسائل وعناوين مشفرة</span>
              </div>
              <span className="font-mono font-bold text-sky-300 text-sm block">
                {((encryptionStatus.breakdown?.messages || 0) + (encryptionStatus.breakdown?.addresses || 0)).toLocaleString()} سجل
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1 backdrop-blur-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Database className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px]">إجمالي المشفر</span>
              </div>
              <span className="font-mono font-bold text-emerald-300 text-sm block">
                {encryptionStatus.totalRecordsEncrypted.toLocaleString()} سجل
              </span>
            </div>
          </div>

          {/* Action Trigger Buttons */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowEncryptModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Key className="w-4 h-4" />
              <span>تشفير جميع بيانات البرنامج الآن</span>
            </button>

            <button
              type="button"
              onClick={() => setShowWipeModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl font-semibold text-xs sm:text-sm bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-400" />
              <span>حذف جميع بيانات الموقع بالكامل (Wipe All Data)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Encryption Operations Log (سجل عمليات التشفير) */}
      <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 text-slate-900 dark:text-white">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">سجل عمليات التشفير (Encryption Operations Log)</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سجل زمني لجميع عمليات التشفير التي تم تنفيذها وتاريخ ووقت كل عملية وحالتها
              </p>
            </div>
          </div>

          <span className="text-xs text-slate-400">
            {encryptionLogs.length} عملية مسجلة
          </span>
        </div>

        {encryptionLogs.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
            لا توجد سجلات تشفير سابقة حتى الآن. اضغط على "تشفير جميع بيانات البرنامج الآن" لبدء أول عملية.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 px-3 font-semibold">تاريخ ووقت العملية</th>
                  <th className="py-2.5 px-3 font-semibold">الحالة</th>
                  <th className="py-2.5 px-3 font-semibold">الخوارزمية</th>
                  <th className="py-2.5 px-3 font-semibold">السجلات المشفرة</th>
                  <th className="py-2.5 px-3 font-semibold">المسؤول</th>
                  <th className="py-2.5 px-3 font-semibold">ملاحظات / أخطاء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {encryptionLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                    <td className="py-3 px-3 font-medium text-slate-800 dark:text-slate-200 font-mono text-[11px]">
                      {formatDateTime(log.timestamp)}
                    </td>
                    <td className="py-3 px-3">
                      {log.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>نجحت</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                          <XCircle className="w-3 h-3" />
                          <span>فشلت</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-slate-400">
                      {log.algorithm || 'AES-256-GCM'}
                    </td>
                    <td className="py-3 px-3 font-bold font-mono text-slate-900 dark:text-white">
                      {log.totalRecordsEncrypted.toLocaleString()} سجل
                    </td>
                    <td className="py-3 px-3 text-slate-600 dark:text-slate-400">
                      {log.initiatedBy || 'Admin'}
                    </td>
                    <td className="py-3 px-3">
                      {log.status === 'failed' && log.errorMessage ? (
                        <span className="text-rose-600 dark:text-rose-400 text-[11px] font-medium block max-w-xs truncate" title={log.errorMessage}>
                          {log.errorMessage}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">تم التشفير الفعلي بنجاح</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirmation Modal - Encrypt All Data */}
      {showEncryptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-sky-500/10 text-sky-500">
                <Lock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  تأكيد تشفير جميع بيانات البرنامج
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  خوارزمية التشفير القياسية AES-256-GCM
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700/50">
              <p>
                سيقوم النظام بمسح قاعدة البيانات وتشفير جميع البيانات الحساسة فعلياً
                (أرقام هواتف العملاء، تفاصيل العناوين، معلومات الطلبات، وسجلات الرسائل).
              </p>
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                ✓ سيتم حفظ تاريخ وتوقيت العملية في سجل التشفير الموثق.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isEncrypting}
                onClick={() => setShowEncryptModal(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isEncrypting}
                onClick={handleEncryptAll}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-md transition-all"
              >
                {isEncrypting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري التشفير الفعلي...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5" />
                    <span>بدء تشفير جميع البيانات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal - Comprehensive Data Wipe */}
      {showWipeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-rose-500/40 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-600 dark:text-rose-400">
                  تحذير شديد: حذف جميع بيانات الموقع بالكامل
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  عملية نهائية ولا يمكن التراجع عنها إطلاقاً
                </p>
              </div>
            </div>

            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-3 bg-rose-50 dark:bg-rose-950/20 p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50">
              <p className="font-bold text-rose-700 dark:text-rose-300">
                ⚠️ سيشمل الحذف الفعلي جميع أقسام وصفحات وبيانات المنصة بالكامل:
              </p>
              <ul className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-700 dark:text-slate-300">
                <li>• جميع الطلبات والحجوزات</li>
                <li>• جميع العملاء المسجلين</li>
                <li>• جميع الخدمات والتصنيفات</li>
                <li>• جميع الكوبونات وقسائم الخصم</li>
                <li>• جميع العروض الترويجية</li>
                <li>• جميع المحافظات والمناطق</li>
                <li>• جميع أعمال معرض الصور</li>
                <li>• جميع الفنيين المسجلين</li>
                <li>• جميع الإشعارات والرسائل</li>
                <li>• التخزين المحلي في المتصفح</li>
              </ul>
              <div className="pt-2 border-t border-rose-200 dark:border-rose-900/50 flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>يتم الاحتفاظ بحساب المشرف الأعلى (Super Admin) فقط لمنع قفل اللوحة.</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                لتأكيد الحذف النهائي الشامل، اكتب كلمة <span className="font-mono font-black text-rose-600">مسح</span> في المربع التالي:
              </label>
              <input
                type="text"
                value={wipeConfirmInput}
                onChange={(e) => setWipeConfirmInput(e.target.value)}
                placeholder='اكتب كلمة "مسح"'
                className="w-full px-4 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-hidden focus:border-rose-500 transition-colors text-center font-bold"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isWiping}
                onClick={() => {
                  setShowWipeModal(false);
                  setWipeConfirmInput('');
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isWiping || (wipeConfirmInput.trim() !== 'مسح' && wipeConfirmInput.trim() !== 'WIPE')}
                onClick={handleWipeAll}
                className="flex items-center gap-1.5 px-6 py-2.5 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white shadow-lg shadow-rose-600/20 transition-all cursor-pointer"
              >
                {isWiping ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>جاري الحذف الشامل لجميع الأقسام...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>تأكيد الحذف النهائي لجميع البيانات</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
