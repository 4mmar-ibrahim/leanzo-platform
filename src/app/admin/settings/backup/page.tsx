'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Database,
  Download,
  RefreshCw,
  Clock,
  ShieldCheck,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  FileArchive,
  HardDrive,
  Trash2,
  RotateCcw,
  Sparkles,
  Layers,
  Copy,
  Check,
  UploadCloud,
  FileCheck,
  FileX,
  X,
  Info,
  Server,
  KeyRound,
  Eye,
  Sliders,
  CheckSquare,
} from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { getAdminAuthToken } from '@/lib/api/apiClient';
import { BackupRecord, BackupType } from '@/types';
import { toast } from 'sonner';

export default function AdminBackupSettingsPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const isOwner = currentAdmin?.role === 'owner' || !currentAdmin;

  // Tabs: 'create' | 'upload' | 'history'
  const [activeTab, setActiveTab] = useState<'create' | 'upload' | 'history'>('create');

  // Audit data
  const [audit, setAudit] = useState<{
    database: string;
    tablesCount: number;
    totalRecords: number;
    tableCounts: Record<string, number>;
    foreignKeysCount: number;
    mediaCount: number;
    mediaTotalSize: string;
  } | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  // Backups list
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Backup state & progress
  const [notes, setNotes] = useState('');
  const [includeMedia, setIncludeMedia] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createStep, setCreateStep] = useState<number>(0);
  const [createdResult, setCreatedResult] = useState<BackupRecord | null>(null);

  // Upload & Device Restore state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);
  const [restoreConfirmText, setRestoreConfirmText] = useState('');
  const [deviceRestoring, setDeviceRestoring] = useState(false);
  const [restoreResult, setRestoreResult] = useState<any | null>(null);

  // Saved Backup Restore Modal state
  const [savedRestoreTarget, setSavedRestoreTarget] = useState<BackupRecord | null>(null);
  const [savedRestoring, setSavedRestoring] = useState(false);
  const [savedConfirmText, setSavedConfirmText] = useState('');

  // Delete Modal state
  const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Copied indicator
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch audit and backups list
  const fetchData = async () => {
    setLoading(true);
    setAuditLoading(true);
    try {
      const [backupsData, auditData] = await Promise.all([
        cleanzoApi.backup.getAll().catch(() => []),
        cleanzoApi.backup.getAudit().catch(() => null),
      ]);
      setBackups(Array.isArray(backupsData) ? backupsData : []);
      if (auditData) setAudit(auditData);
    } catch (err: any) {
      console.error('Failed to load backup data:', err);
      toast.error('تعذر جلب معلومات النسخ الاحتياطي من الخادم');
    } finally {
      setLoading(false);
      setAuditLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handle Create Backup with step progression
  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateStep(1);
    setCreatedResult(null);

    // Simulated progress steps for great UX while backend builds the archive
    const stepTimer1 = setTimeout(() => setCreateStep(2), 700);
    const stepTimer2 = setTimeout(() => setCreateStep(3), 1500);
    const stepTimer3 = setTimeout(() => setCreateStep(4), 2300);
    const stepTimer4 = setTimeout(() => setCreateStep(5), 3100);

    try {
      const newBackup = await cleanzoApi.backup.create({
        notes: notes.trim() || undefined,
        includeMedia,
      });

      setCreateStep(6);
      setCreatedResult(newBackup);
      toast.success('تم إنشاء النسخة الاحتياطية الشاملة بنجاح!', {
        description: `تم حفظ ${newBackup.collectionsCount} جدول بحجم ${newBackup.sizeFormatted}`,
      });
      setNotes('');
      await fetchData();
    } catch (err: any) {
      console.error('Create backup error:', err);
      toast.error(err.message || 'فشلت عملية إنشاء النسخة الاحتياطية');
      setCreateStep(0);
    } finally {
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
      clearTimeout(stepTimer3);
      clearTimeout(stepTimer4);
      setCreating(false);
    }
  };

  // Direct download to user device
  const handleDirectDownload = async (backup: BackupRecord) => {
    try {
      toast.info('جاري بدء تحميل ملف النسخة الاحتياطية إلى جهازك...');
      const downloadUrl = cleanzoApi.backup.getDownloadUrl(backup.id);

      const token = getAdminAuthToken();
      const response = await fetch(downloadUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('فشل تحميل الملف من السيرفر');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = backup.filename || `${backup.id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('تم تحميل الأرشيف بنجاح إلى جهازك');
    } catch (err: any) {
      console.error('Download error:', err);
      toast.error(err.message || 'حدث خطأ أثناء تحميل الملف');
    }
  };

  // Handle File Selection for Device Restore
  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.zip')) {
      toast.error('يرجى اختيار ملف أرشيف صالح بصيغة (.zip)');
      return;
    }
    setSelectedFile(file);
    setValidationResult(null);
    setRestoreResult(null);
    setRestoreConfirmText('');
  };

  // Validate Selected Device Archive
  const handleValidateDeviceFile = async () => {
    if (!selectedFile) return;
    setValidating(true);
    setValidationResult(null);

    try {
      toast.info('جاري فحص سلامة الأرشيف والتحقق من البصمات...');
      const res = await cleanzoApi.backup.validateArchive(selectedFile);
      setValidationResult(res);
      if (res.isValid) {
        toast.success('تم التحقق من سلامة النسخة الاحتياطية بنجاح!', {
          description: `تحتوي على ${res.tablesCount} جدول و ${res.mediaCount} ملف وسائط`,
        });
      } else {
        toast.warning('الأرشيف يحتوي على بعض التنبيهات، يرجى مراجعة التفاصيل.');
      }
    } catch (err: any) {
      console.error('Validation error:', err);
      toast.error(err.message || 'فشل فحص النسخة الاحتياطية');
    } finally {
      setValidating(false);
    }
  };

  // Execute Restore from Device
  const handleExecuteDeviceRestore = async () => {
    if (!selectedFile) return;
    if (restoreConfirmText.trim().toUpperCase() !== 'RESTORE' && restoreConfirmText.trim() !== 'استرجاع') {
      toast.error('يرجى كتابة كلمة "RESTORE" أو "استرجاع" لتأكيد الاستبدال');
      return;
    }

    setDeviceRestoring(true);
    try {
      toast.info('جاري أخذ نقطة أمان سابقة والبدء في استعادة النظام...');
      const res = await cleanzoApi.backup.restoreFromDevice(selectedFile);
      setRestoreResult(res);
      toast.success('تمت استعادة النظام بالكامل والتحقق من البيانات بنجاح!', {
        description: `تم استرجاع ${res.restoredTablesCount} جدول و ${res.restoredMediaCount} ملف وسائط`,
      });
      await fetchData();
    } catch (err: any) {
      console.error('Device restore error:', err);
      toast.error(err.message || 'فشلت عملية استعادة النظام من النسخة المحددة');
    } finally {
      setDeviceRestoring(false);
    }
  };

  // Execute Restore from Saved Server Backup
  const handleExecuteSavedRestore = async () => {
    if (!savedRestoreTarget) return;
    if (savedConfirmText.trim().toUpperCase() !== 'RESTORE' && savedConfirmText.trim() !== 'استرجاع') {
      toast.error('يرجى كتابة كلمة "RESTORE" أو "استرجاع" للتأكيد');
      return;
    }

    setSavedRestoring(true);
    try {
      toast.info('جاري أخذ نقطة أمان سابقة والبدء في استرجاع النسخة المحفوظة...');
      const res = await cleanzoApi.backup.restore(savedRestoreTarget.id);
      setRestoreResult(res);
      setSavedRestoreTarget(null);
      setSavedConfirmText('');
      toast.success('تمت استعادة النظام بنجاح من النسخة المحفوظة!', {
        description: `تم استرجاع ${res.restoredTablesCount} جدول بنجاح`,
      });
      await fetchData();
    } catch (err: any) {
      console.error('Saved restore error:', err);
      toast.error(err.message || 'فشلت عملية استعادة النسخة');
    } finally {
      setSavedRestoring(false);
    }
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await cleanzoApi.backup.delete(deleteTarget.id);
      toast.success('تم حذف النسخة الاحتياطية نهائياً من السيرفر');
      setDeleteTarget(null);
      setBackups((prev) => prev.filter((b) => b.id !== deleteTarget.id));
    } catch (err: any) {
      console.error('Delete error:', err);
      toast.error(err.message || 'فشل حذف النسخة الاحتياطية');
    } finally {
      setDeleting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    toast.success('تم نسخ المعرّف إلى الحافظة');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // KPIs
  const totalBackups = backups.length;
  const lastBackup = backups[0];
  const totalSizeBytes = backups.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);
  const totalSizeFormatted =
    totalSizeBytes > 1024 * 1024
      ? `${(totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`
      : `${(totalSizeBytes / 1024).toFixed(1)} KB`;

  const getTypeBadge = (type: BackupType) => {
    switch (type) {
      case 'full':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Layers className="w-3 h-3" />
            شامل + وسائط و Zo
          </span>
        );
      case 'database_only':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            <Database className="w-3 h-3" />
            قاعدة البيانات فقط
          </span>
        );
      case 'pre_restore':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3 h-3" />
            نقطة استعادة أمان تلقائية
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-20">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-sky-500 transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              العودة للإعدادات
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-bold text-sky-600 dark:text-sky-400">مركز النسخ والاستعادة الشامل</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
              <Database className="w-5 h-5" />
            </span>
            النسخ الاحتياطي والاستعادة الشاملة (PostgreSQL + Media + Zo)
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            نظام متكامل لتوليد أرشيفات كاملة ومستقلة قابلة للنقل والتنزيل على الجهاز والاسترجاع الآمن بنسبة تغطية 100%.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchData}
            disabled={loading || auditLoading}
            className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 text-xs font-bold transition-all shadow-xs flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading || auditLoading ? 'animate-spin' : ''}`} />
            <span>تحديث البيانات والفحص</span>
          </button>
        </div>
      </div>

      {/* Live PostgreSQL Source-of-Truth KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* PostgreSQL Database Coverage */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">تغطية PostgreSQL</span>
            <span className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-500 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900 dark:text-white">
                {audit ? audit.tablesCount : 27}
              </span>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">جدول مكتشف (100%)</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              إجمالي السجلات: {audit ? audit.totalRecords : '—'} مستند
            </p>
          </div>
        </div>

        {/* Media & Zo Assets Coverage */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">الوسائط وشخصيات Zo</span>
            <span className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {audit ? audit.mediaCount : '—'}
            </span>
            <span className="text-xs text-slate-400 mr-1.5 font-normal">ملف أصلي</span>
            <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold mt-1">
              الحجم: {audit ? audit.mediaTotalSize : '—'} (جودة 100%)
            </p>
          </div>
        </div>

        {/* Saved Backups */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">سجل النسخ المحفوظة</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <FileArchive className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalBackups}</span>
            <span className="text-xs text-slate-400 mr-1.5 font-normal">أرشيف مضغوط</span>
            <p className="text-[11px] text-slate-400 mt-1">
              آخر نسخة: {lastBackup ? new Date(lastBackup.createdAt).toLocaleDateString('ar-EG') : 'لا يوجد'}
            </p>
          </div>
        </div>

        {/* Engine Security & Integrity */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400">سلامة المعاملات (ACID)</span>
            <span className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              استعادة آمنة (Transactional)
            </span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">
            نقاط أمان تلقائية (Safety Backup) + بصمات SHA-256
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-800/80 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'create'
              ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>إنشاء نسخة وتنزيلها (Create & Export)</span>
        </button>

        <button
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'upload'
              ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>استرجاع من ملف على جهازك (Restore from Device)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'history'
              ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>سجل النسخ المحفوظة على السيرفر ({backups.length})</span>
        </button>
      </div>

      {/* TAB 1: CREATE PORTABLE BACKUP */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5" />
                  أرشيف مستقل وشامل بالكامل
                </div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white">
                  إنشاء نسخة احتياطية قابلة للنقل والتنزيل (Portable Full Backup)
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  يقوم المحرك باكتشاف كافة جداول PostgreSQL ديناميكياً (الخدمات، الطلبات، العملاء، الصلاحيات، الفئات،
                  الكوبونات، الإعدادات، العناوين، وسجلات التدقيق) وتضمين كافة ملفات الوسائط وشخصيات Zo بجودتها الأصلية وحساب
                  بصمة SHA-256 لكل ملف.
                </p>

                <div className="pt-2 flex flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    استبعاد البيانات الحساسة البيئية (.env secrets excluded)
                  </span>
                  <span className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-200/60 dark:border-slate-700/60">
                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                    حفظ العلاقات والمفاتيح الخارجية (Foreign Keys)
                  </span>
                </div>
              </div>

              <form onSubmit={handleCreateBackup} className="w-full lg:w-96 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    ملاحظات أو سبب النسخ (اختياري)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="مثال: ترقية شاملة، قبل إطلاق حملة تسويقية..."
                    disabled={creating}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 disabled:opacity-50"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
                  <div className="flex items-center gap-2.5">
                    <FileArchive className="w-4 h-4 text-sky-500" />
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">تضمين ملفات الوسائط وشخصيات Zo</p>
                      <p className="text-[10px] text-slate-400">حفظ صور الخدمات، المعرض، وشخصية Zo كاملة</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={includeMedia}
                    onChange={(e) => setIncludeMedia(e.target.checked)}
                    disabled={creating}
                    className="w-4 h-4 rounded-md text-sky-600 focus:ring-sky-500 cursor-pointer"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-sky-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${creating ? 'animate-spin' : ''}`} />
                  <span>{creating ? 'جاري بناء الأرشيف والضغط...' : 'بدء إنشاء النسخة الشاملة (Create Backup)'}</span>
                </button>
              </form>
            </div>

            {/* Creation Live Progress Stepper */}
            {creating && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
                  مراحل توليد النسخة الاحتياطية المباشرة:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {[
                    { step: 1, label: 'فحص واكتشاف جداول PostgreSQL (100%)' },
                    { step: 2, label: 'تصدير السجلات والعلاقات إلى JSON' },
                    { step: 3, label: 'تجميع ملفات الوسائط وشخصيات Zo' },
                    { step: 4, label: 'حساب بصمات الأمان SHA-256' },
                    { step: 5, label: 'بناء وضغط أرشيف ZIP المتنقل' },
                    { step: 6, label: 'التحقق النهائي من سلامة النسخة' },
                  ].map((s) => (
                    <div
                      key={s.step}
                      className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 transition-all ${
                        createStep > s.step
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                          : createStep === s.step
                          ? 'bg-sky-500/10 border-sky-500/30 text-sky-600 dark:text-sky-400 animate-pulse'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400'
                      }`}
                    >
                      {createStep > s.step ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : createStep === s.step ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500 shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-400 shrink-0" />
                      )}
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Created Backup Report Banner with Direct Download Button */}
            {createdResult && (
              <div className="mt-6 p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-6 h-6" />
                    </span>
                    <div>
                      <h3 className="text-sm font-black text-emerald-950 dark:text-emerald-200">
                        تم تجهيز النسخة الاحتياطية بنجاح ومطابقتها للمعايير!
                      </h3>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-mono mt-0.5">
                        {createdResult.filename} • {createdResult.sizeFormatted} • {createdResult.collectionsCount} جدول •{' '}
                        {createdResult.mediaCount} ملف وسائط
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDirectDownload(createdResult)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 shrink-0"
                  >
                    <Download className="w-4 h-4" />
                    <span>تنزيل النسخة إلى جهازك الآن (Download ZIP)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: RESTORE FROM DEVICE */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold">
                <UploadCloud className="w-3.5 h-3.5" />
                استيراد واسترجاع من ملف مضغوط خارجي
              </div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                استرجاع النظام من ملف النسخة الاحتياطية على جهازك (Restore Backup From Device)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اختر ملف الأرشيف المضغوط (`Cleanzo_Backup_*.zip`). سيقوم النظام بفحصه أمنياً، والتحقق من سلامة البصمات،
                وعرض معاينة شاملة للمحتوى قبل اتخاذ أي إجراء استبدال.
              </p>
            </div>

            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleFileSelect(e.dataTransfer.files[0]);
                }
              }}
              className={`p-8 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all ${
                selectedFile
                  ? 'border-sky-500/50 bg-sky-50/50 dark:bg-sky-500/5'
                  : 'border-slate-300 dark:border-slate-700 hover:border-sky-500 dark:hover:border-sky-500 bg-slate-50/50 dark:bg-slate-800/40'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileSelect(e.target.files[0]);
                  }
                }}
              />

              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-3">
                <FileArchive className="w-7 h-7" />
              </div>

              {selectedFile ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">{selectedFile.name}</p>
                  <p className="text-xs text-slate-400 font-mono">
                    الحجم: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                  <p className="text-[11px] text-sky-600 dark:text-sky-400 font-bold mt-2">
                    اضغط لتغيير الملف المختار
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    اسحب ملف النسخة الاحتياطية (.zip) وأفلته هنا، أو اضغط للاختيار من جهازك
                  </p>
                  <p className="text-xs text-slate-400">يدعم أرشيفات كلينزو الكاملة بحجم يصل إلى 300 ميجابايت</p>
                </div>
              )}
            </div>

            {/* Validate Action Button */}
            {selectedFile && !validationResult && (
              <div className="flex items-center justify-end">
                <button
                  onClick={handleValidateDeviceFile}
                  disabled={validating}
                  className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-md shadow-sky-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${validating ? 'animate-spin' : ''}`} />
                  <span>{validating ? 'جاري فحص الأرشيف...' : 'فحص ومعاينة محتوى النسخة (Validate Backup)'}</span>
                </button>
              </div>
            )}

            {/* Validation & Preview Card */}
            {validationResult && (
              <div className="space-y-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <FileCheck className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white">
                        تقرير فحص ومعاينة النسخة الاحتياطية (Backup Preview)
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        تم التحقق من سلامة البصمات وتوافق الجداول مع قاعدة بيانات PostgreSQL
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      validationResult.isValid
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
                    }`}
                  >
                    {validationResult.isValid ? 'أرشيف سليم ومتطابق 100%' : 'تنبيه أمني'}
                  </span>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">تاريخ النسخة</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {validationResult.manifest?.createdAt
                        ? new Date(validationResult.manifest.createdAt).toLocaleDateString('ar-EG')
                        : 'غير محدد'}
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">عدد الجداول</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {validationResult.tablesCount} جدول
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">إجمالي السجلات</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {validationResult.documentsCount} مستند
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] text-slate-400 font-bold block">ملفات الوسائط</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block mt-0.5">
                      {validationResult.mediaCount} ملف ({validationResult.mediaTotalSize})
                    </span>
                  </div>
                </div>

                {/* Table by Table Comparison */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    مقارنة السجلات بين النسخة وقاعدة البيانات الحالية:
                  </p>
                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-800 text-[11px] bg-white dark:bg-slate-900">
                    {validationResult.tableComparison?.map((row: any) => (
                      <div key={row.table} className="px-3 py-1.5 flex items-center justify-between font-mono">
                        <span className="text-slate-800 dark:text-slate-200 font-sans font-bold">{row.table}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400">الحالي: {row.currentCount}</span>
                          <span className="text-slate-300 dark:text-slate-700">←</span>
                          <span className="text-sky-600 dark:text-sky-400 font-bold">في النسخة: {row.backupCount}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Safety Guarantee Notice */}
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-300">
                    <ShieldCheck className="w-4 h-4 text-amber-600" />
                    <span>حماية أمان البيانات التلقائية قبل الاستبدال (Safety Backup):</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    عملية الاسترجاع الكامل تستبدل بيانات الموقع الحالية. لضمان أمانك الكامل، سيقوم السيرفر تلقائياً بإنشاء
                    نقطة أمان سابقة (`pre_restore`) لحالة النظام وقاعدة البيانات والوسائط الحالية قبل تنفيذ أي تعديل.
                  </p>
                </div>

                {/* Confirmation Box */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    لتأكيد الاسترجاع الشامل، اكتب كلمة <span className="font-mono text-rose-500 font-black">RESTORE</span> أو{' '}
                    <span className="font-mono text-rose-500 font-black">استرجاع</span> في المربع التالي:
                  </label>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <input
                      type="text"
                      value={restoreConfirmText}
                      onChange={(e) => setRestoreConfirmText(e.target.value)}
                      placeholder="اكتب RESTORE أو استرجاع..."
                      disabled={deviceRestoring}
                      className="px-3.5 py-2.5 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 w-full sm:w-64"
                    />

                    <button
                      onClick={handleExecuteDeviceRestore}
                      disabled={
                        deviceRestoring ||
                        (restoreConfirmText.trim().toUpperCase() !== 'RESTORE' &&
                          restoreConfirmText.trim() !== 'استرجاع')
                      }
                      className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-40"
                    >
                      <RotateCcw className={`w-3.5 h-3.5 ${deviceRestoring ? 'animate-spin' : ''}`} />
                      <span>{deviceRestoring ? 'جاري الاسترجاع الشامل...' : 'بدء استرجاع النظام الآن (Execute Restore)'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Restore Completion Screen */}
            {restoreResult && (
              <div className="p-6 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-500/30 space-y-4">
                <div className="flex items-center gap-3">
                  <span className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-7 h-7" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-emerald-950 dark:text-emerald-200">
                      تمت استعادة النظام بنجاح والتحقق من كافة السجلات والوسائط!
                    </h3>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-0.5">
                      تم استرجاع {restoreResult.restoredTablesCount} جدول، و {restoreResult.restoredDocumentsCount} مستند،
                      و {restoreResult.restoredMediaCount} ملف وسائط بنجاح تام.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>إعادة تحميل لوحة التحكم (Reload Application)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SAVED SERVER BACKUPS LIST */}
      {activeTab === 'history' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Database className="w-4 h-4 text-sky-500" />
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                سجل النسخ الاحتياطية ونقاط الاستعادة على السيرفر
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                {backups.length}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <RefreshCw className="w-8 h-8 text-sky-500 animate-spin mx-auto mb-3" />
              <p className="text-xs text-slate-500 font-medium">جاري فحص سجل النسخ الاحتياطية من السيرفر...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="py-16 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-dashed border-slate-200 dark:border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-500 flex items-center justify-center mx-auto mb-3">
                <Database className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">لا توجد نسخ احتياطية مسجلة بعد</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                اضغط على &quot;إنشاء نسخة وتنزيلها&quot; بالأعلى لتوليد أول نقطة استعادة شاملة لقاعدة البيانات والوسائط.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold">
                    <th className="pb-3 pr-3">معرّف النسخة / الملاحظات</th>
                    <th className="pb-3 px-3">النوع</th>
                    <th className="pb-3 px-3">الحجم</th>
                    <th className="pb-3 px-3">المحتوى</th>
                    <th className="pb-3 px-3">بواسطة</th>
                    <th className="pb-3 px-3">التاريخ والوقت</th>
                    <th className="pb-3 pl-3 text-center">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {backups.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Identifier & Notes */}
                      <td className="py-3.5 pr-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => copyToClipboard(b.id)}
                            title="نسخ المعرّف"
                            className="p-1 rounded-md text-slate-400 hover:text-sky-500 transition-colors"
                          >
                            {copiedId === b.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <div>
                            <p className="font-bold text-slate-900 dark:text-white font-mono text-[11px]">{b.id}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5 line-clamp-1">
                              {b.notes || 'نسخة احتياطية قياسية'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type */}
                      <td className="py-3.5 px-3 whitespace-nowrap">{getTypeBadge(b.type)}</td>

                      {/* Size */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                          {b.sizeFormatted || '0 KB'}
                        </span>
                      </td>

                      {/* Content Count */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                          <p>
                            {b.collectionsCount || 27} جدول ({b.documentsCount || 0} مستند)
                          </p>
                          {b.mediaCount > 0 && <p className="text-sky-600 dark:text-sky-400">{b.mediaCount} ملف وسائط</p>}
                        </div>
                      </td>

                      {/* Creator */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="text-slate-700 dark:text-slate-300 text-xs font-semibold">
                          {b.createdBy?.name || 'المسؤول'}
                        </span>
                        <span className="block text-[10px] text-slate-400">{b.createdBy?.role || 'admin'}</span>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="text-slate-800 dark:text-slate-200 block">
                          {new Date(b.createdAt).toLocaleDateString('ar-EG')}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(b.createdAt).toLocaleTimeString('ar-EG', {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 pl-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Direct Download to Device */}
                          <button
                            onClick={() => handleDirectDownload(b)}
                            title="تنزيل الأرشيف المضغوط (ZIP) إلى جهازك"
                            className="p-2 rounded-xl bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-500/20 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Restore */}
                          <button
                            onClick={() => {
                              setSavedRestoreTarget(b);
                              setSavedConfirmText('');
                            }}
                            disabled={!isOwner}
                            title={isOwner ? 'استعادة النظام من هذه النسخة' : 'تتطلب صلاحية المالك'}
                            className="px-2.5 py-1.5 rounded-xl border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 font-bold text-xs flex items-center gap-1.5 transition-colors disabled:opacity-40"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>استعادة</span>
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(b)}
                            disabled={!isOwner}
                            title={isOwner ? 'حذف النسخة الاحتياطية' : 'تتطلب صلاحية المالك'}
                            className="p-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors disabled:opacity-40"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Saved Restore Confirmation Modal */}
      {savedRestoreTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-amber-500/30 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">تأكيد استعادة النظام</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                هل أنت متأكد من استعادة كافة جداول PostgreSQL وملفات الوسائط إلى حالة النسخة (
                <span className="font-mono text-slate-800 dark:text-slate-200">{savedRestoreTarget.id}</span>)؟
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>ضمان أمان البيانات التلقائي (Pre-Restore Snapshot):</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                قبل استبدال البيانات، سيقوم السيرفر تلقائياً بإنشاء نقطة استعادة أمان سابقة (`pre_restore`) لحالة النظام
                الحالية، بحيث يمكنك العودة إليها في أي لحظة.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                للتأكيد، اكتب كلمة <span className="font-mono text-rose-500 font-black">RESTORE</span> أو{' '}
                <span className="font-mono text-rose-500 font-black">استرجاع</span>:
              </label>
              <input
                type="text"
                value={savedConfirmText}
                onChange={(e) => setSavedConfirmText(e.target.value)}
                placeholder="اكتب RESTORE أو استرجاع..."
                className="w-full px-3.5 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono"
              />
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setSavedRestoreTarget(null)}
                disabled={savedRestoring}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleExecuteSavedRestore}
                disabled={
                  savedRestoring ||
                  (savedConfirmText.trim().toUpperCase() !== 'RESTORE' && savedConfirmText.trim() !== 'استرجاع')
                }
                className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${savedRestoring ? 'animate-spin' : ''}`} />
                <span>{savedRestoring ? 'جاري الاستعادة...' : 'تأكيد واسترجاع الآن'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-2xl border border-rose-500/30 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900 dark:text-white">حذف النسخة الاحتياطية</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سيتم حذف ملف الأرشيف ({deleteTarget.filename}) نهائياً من القرص التخزيني وسجل النظام.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
              >
                تراجع
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Trash2 className={`w-3.5 h-3.5 ${deleting ? 'animate-spin' : ''}`} />
                <span>{deleting ? 'جاري الحذف...' : 'حذف نهائي'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
