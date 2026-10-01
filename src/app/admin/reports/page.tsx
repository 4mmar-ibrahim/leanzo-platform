'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Users,
  ShoppingBag,
  Banknote,
  Sparkles,
  MapPin,
  TicketPercent,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileSpreadsheet,
  Search,
  RefreshCw,
  Percent,
  RotateCcw,
  Layers,
  ExternalLink,
  Eye,
} from 'lucide-react';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { ClearStatsButton } from '@/components/admin/ClearStatsButton';
import { useAdminStore } from '@/store/useAdminStore';
import { hasPermission } from '@/lib/permissions';
import {
  generateOfficialReportHtml,
  generateOfficialSubscriptionInvoiceHtml,
  printHtmlDocument,
} from '@/lib/printUtils';
import { toast } from 'sonner';

type ReportTab =
  | 'customers'
  | 'orders'
  | 'revenue'
  | 'services'
  | 'areas'
  | 'coupons'
  | 'bookings'
  | 'subscriptions';

export default function AdminReportsPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canViewReports = hasPermission(currentAdmin, 'reports.view');

  const [activeTab, setActiveTab] = useState<ReportTab>('orders');
  const [period, setPeriod] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [reportData, setReportData] = useState<any>(null);

  const fetchReport = useCallback(async () => {
    if (!canViewReports) return;
    setIsLoading(true);
    try {
      const params = {
        period,
        ...(period === 'custom' && startDate ? { startDate } : {}),
        ...(period === 'custom' && endDate ? { endDate } : {}),
      };

      let res: any;
      switch (activeTab) {
        case 'customers':
          res = await cleanzoApi.admin.reports.getCustomers(params);
          break;
        case 'orders':
          res = await cleanzoApi.admin.reports.getOrders(params);
          break;
        case 'revenue':
          res = await cleanzoApi.admin.reports.getRevenue(params);
          break;
        case 'services':
          res = await cleanzoApi.admin.reports.getServices(params);
          break;
        case 'areas':
          res = await cleanzoApi.admin.reports.getAreas(params);
          break;
        case 'coupons':
          res = await cleanzoApi.admin.reports.getCoupons(params);
          break;
        case 'bookings':
          res = await cleanzoApi.admin.reports.getBookings(params);
          break;
        case 'subscriptions':
          res = await cleanzoApi.admin.reports.getSubscriptions(params);
          break;
        default:
          res = await cleanzoApi.admin.reports.getOverview(params);
          break;
      }
      setReportData(res || {});
    } catch (err: any) {
      toast.error('حدث خطأ أثناء تحميل بيانات التقرير من الخادم');
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, period, startDate, endDate, canViewReports]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  useEffect(() => {
    const handleRefresh = () => fetchReport();
    window.addEventListener('cleanzo:refresh-data', handleRefresh);
    return () => window.removeEventListener('cleanzo:refresh-data', handleRefresh);
  }, [fetchReport]);

  // Export functionality
  const handleExport = (format: 'csv' | 'excel' | 'print') => {
    if (format === 'print') {
      let reportTitle = 'تقرير تشغيلي موحد';
      let tableHeaders: string[] = [];
      let tableRows: Array<Array<string | number>> = [];
      let summaryCards: Array<{ label: string; value: string | number; note?: string }> = [];

      const sum = reportData?.summary || {};
      if (sum.totalOrders !== undefined || sum.totalRevenue !== undefined) {
        summaryCards = [
          { label: 'إجمالي الطلبات', value: sum.totalOrders ?? 0 },
          { label: 'الطلبات المكتملة', value: sum.completedOrders ?? 0, note: `${sum.completionRate || 0}% نسبة الإنجاز` },
          { label: 'إجمالي الإيرادات', value: `${(sum.totalRevenue || 0).toLocaleString()} ج.م` },
          { label: 'متوسط قيمة الطلب', value: `${(sum.avgOrderValue || 0).toLocaleString()} ج.م` },
        ];
      }

      const statusMap: Record<string, string> = {
        completed: 'مكتمل بنجاح',
        confirmed: 'مؤكد',
        pending: 'قيد المراجعة',
        in_progress: 'قيد التنفيذ',
        assigned: 'تم تعيين فني',
        cancelled: 'ملغي',
      };

      if (activeTab === 'orders') {
        reportTitle = 'تقرير إحصائيات المبيعات والطلبات التشغيلية';
        tableHeaders = ['رقم الطلب', 'اسم العميل', 'رقم الهاتف', 'الخدمة المطلوبة', 'القطاع', 'الموعد', 'المحافظة', 'القيمة الصافية', 'الحالة'];
        tableRows = (reportData?.ordersList || []).map((o: any) => [
          `#${String(o.id).slice(-6)}`,
          o.customerName || 'عميل كلينزو',
          o.customerPhone || '-',
          o.serviceTitle || '-',
          o.category === 'car' ? '🚗 سيارات' : '🏠 منازل',
          `${o.date || ''} ${o.time || ''}`,
          o.governorate || '-',
          `${o.finalPrice || o.price || 0} ج.م`,
          statusMap[o.status] || o.status,
        ]);
      } else if (activeTab === 'customers') {
        reportTitle = 'تقرير قاعدة بيانات وسجلات العملاء';
        tableHeaders = ['اسم العميل', 'رقم الهاتف', 'المحافظة والمدينة', 'عدد الطلبات', 'إجمالي الإنفاق', 'الحالة'];
        tableRows = (reportData?.customersList || []).map((c: any) => [
          c.name || 'عميل',
          c.phone || '-',
          `${c.governorate || ''} - ${c.city || ''}`,
          c.ordersCount || 0,
          `${(c.totalSpent || 0).toLocaleString()} ج.م`,
          c.status === 'active' ? 'نشط' : 'محظور',
        ]);
      } else if (activeTab === 'revenue') {
        reportTitle = 'تقرير الأداء المالي والإيرادات المحققة';
        tableHeaders = ['الخدمة / القطاع', 'عدد الطلبات المنفذة', 'الإيراد الإجمالي المحقق', 'النسبة من الإجمالي'];
        const totalRev = (reportData?.revenueByService || []).reduce((acc: number, curr: any) => acc + (curr.revenue || 0), 0) || 1;
        tableRows = (reportData?.revenueByService || []).map((s: any) => [
          s.title || 'خدمة',
          s.count || 0,
          `${(s.revenue || 0).toLocaleString()} ج.م`,
          `${Math.round(((s.revenue || 0) / totalRev) * 100)}%`,
        ]);
      } else if (activeTab === 'services') {
        reportTitle = 'تقرير أداء الخدمات والباقات الأكثر طلباً';
        tableHeaders = ['اسم الخدمة', 'القطاع', 'السعر', 'إجمالي الحجوزات', 'المكتمل', 'الإيراد المحقق', 'متوسط الطلب', 'الحالة'];
        tableRows = (reportData?.allServices || []).map((s: any) => [
          s.title || '-',
          s.category === 'car' ? '🚗 سيارات' : '🏠 منازل',
          `${s.price || 0} ج.م`,
          s.bookingsCount || 0,
          s.completedCount || 0,
          `${(s.revenue || 0).toLocaleString()} ج.م`,
          `${(s.averageOrderValue || 0).toLocaleString()} ج.م`,
          s.active ? 'نشطة ومتاحة' : 'معطلة',
        ]);
      } else if (activeTab === 'areas') {
        reportTitle = 'تقرير التغطية الجغرافية والمناطق';
        tableHeaders = ['المحافظة / النطاق', 'عدد المدن', 'عدد العملاء', 'إجمالي الطلبات', 'المكتمل', 'الإيراد المحقق', 'حالة النطاق'];
        tableRows = (reportData?.areasList || []).map((a: any) => [
          a.name || '-',
          a.citiesCount || 0,
          a.customersCount || 0,
          a.ordersCount || 0,
          a.completedOrders || 0,
          `${(a.revenue || 0).toLocaleString()} ج.م`,
          a.active ? 'مغطاة ونشطة' : 'غير نشطة',
        ]);
      } else if (activeTab === 'coupons') {
        reportTitle = 'تقرير قسائم الخصم والعروض الترويجية';
        tableHeaders = ['كود الكوبون', 'نوع الخصم', 'القيمة', 'مرات الاستخدام', 'الحد الأقصى', 'الفترة', 'الحالة'];
        tableRows = (reportData?.couponsList || []).map((c: any) => [
          c.code || '-',
          c.discountType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت',
          c.discountType === 'percentage' ? `${c.discountValue}%` : `${c.discountValue} ج.م`,
          c.currentUsageCount || 0,
          c.totalUsageLimit || 'غير محدود',
          `${c.startDate || ''} إلى ${c.endDate || ''}`,
          c.status === 'active' ? 'نشط وفعال' : 'منتهي / معطل',
        ]);
      } else if (activeTab === 'bookings') {
        reportTitle = 'تقرير كثافة وجدولة المواعيد والحجوزات';
        tableHeaders = ['اليوم / الموعد', 'عدد الحجوزات المسجلة'];
        tableRows = (reportData?.bookingsByDay || []).map((b: any) => [
          b.dayName || '-',
          b.count || 0,
        ]);
      } else if (activeTab === 'subscriptions') {
        reportTitle = 'تقرير عقود واشتراكات كلينزو الدورية (Subscription Financial & Operations Report)';
        tableHeaders = [
          'رقم الاشتراك',
          'اسم العميل',
          'رقم الهاتف',
          'الباقة / الخدمة',
          'القطاع',
          'القيمة التعاقدية',
          'الزيارات المنفذة',
          'فترة السريان',
          'الحالة',
          'التجديد',
        ];
        tableRows = (reportData?.subscriptionsList || []).map((s: any) => [
          s.id,
          s.customerName || 'عميل كلينزو',
          s.customerPhone || '-',
          `${s.planName || ''} (${s.serviceTitle || ''})`,
          s.category === 'home' ? '🏠 منازل' : '🚗 سيارات',
          `${(s.price || 0).toLocaleString()} ج.م`,
          `${s.usedVisits || 0} من ${s.totalVisits || 0}`,
          `${s.startDate || '-'} إلى ${s.endDate || '-'}`,
          statusMap[s.status] || s.status,
          s.renewedToId ? `مجدد (دورة ${s.renewalCycle || 1})` : 'غير مجدد',
        ]);
        summaryCards = [
          { label: 'إجمالي الاشتراكات', value: sum.totalSubscriptions ?? 0 },
          {
            label: 'الاشتراكات النشطة',
            value: sum.activeSubscriptions ?? 0,
            note: `${sum.expiredSubscriptions || 0} منتهي • ${sum.cancelledSubscriptions || 0} ملغي`,
          },
          {
            label: 'إجمالي إيراد الاشتراكات',
            value: `${(sum.totalRevenue || sum.subscriptionRevenue || 0).toLocaleString()} ج.م`,
          },
          {
            label: 'القيمة التعاقدية للنشطة',
            value: `${(sum.activeSubscriptionValue || 0).toLocaleString()} ج.م`,
          },
          {
            label: 'معدل التجديد الدوري',
            value: `${sum.renewalRate || 0}%`,
            note: `${sum.renewedSubscriptions || 0} اشتراك مجدد`,
          },
          {
            label: 'الزيارات المنفذة',
            value: `${sum.completedVisits || 0} من ${sum.totalVisits || 0}`,
            note: `${sum.rescheduledVisits || 0} معاد جدولتها`,
          },
          {
            label: 'كاش باك ناتج / مستخدم',
            value: `${sum.cashbackGenerated || 0} / ${sum.cashbackUsed || 0} ج.م`,
          },
        ];
      }

      const periodLabels: Record<string, string> = {
        today: 'اليوم',
        yesterday: 'أمس',
        last_7_days: 'آخر 7 أيام',
        last_30_days: 'آخر 30 يوماً',
        this_month: 'هذا الشهر',
        last_month: 'الشهر السابق',
        this_year: 'هذا العام الحالي',
        custom: `فترة مخصصة (${startDate || ''} إلى ${endDate || ''})`,
      };

      const html = generateOfficialReportHtml({
        reportTitle,
        reportRef: `CLZ-REP-${Date.now().toString().slice(-6)}`,
        periodLabel: periodLabels[period] || period,
        generatedBy: `${currentAdmin?.name || 'مدير المنصة'} (${currentAdmin?.role || 'إدارة التشغيل'})`,
        summaryCards,
        tableHeaders,
        tableRows,
      });

      printHtmlDocument(reportTitle, html);
      toast.success('تم إنشاء التقرير الرسمي وإرساله إلى الطباعة المعتمدة');
      return;
    }

    let csvContent = '\uFEFF'; // UTF-8 BOM for Arabic text in Excel
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `cleanzo-report-${activeTab}-${period}-${timestamp}.${format === 'csv' ? 'csv' : 'xls'}`;

    if (activeTab === 'orders' && reportData?.ordersList) {
      csvContent += 'رقم الطلب,اسم العميل,الهاتف,الخدمة,القطاع,التاريخ,الوقت,القيمة الصافية,المحافظة,الحالة\n';
      reportData.ordersList.forEach((o: any) => {
        csvContent += `"${o.id}","${o.customerName}","${o.customerPhone}","${o.serviceTitle}","${o.category === 'car' ? 'سيارات' : 'منازل'}","${o.date}","${o.time || ''}","${o.finalPrice}","${o.governorate}","${o.status}"\n`;
      });
    } else if (activeTab === 'customers' && reportData?.customersList) {
      csvContent += 'اسم العميل,الهاتف,البريد الإلكتروني,المحافظة,المدينة,عدد الطلبات,إجمالي الإنفاق,الحالة\n';
      reportData.customersList.forEach((c: any) => {
        csvContent += `"${c.name}","${c.phone}","${c.email || ''}","${c.governorate}","${c.city}","${c.ordersCount}","${c.totalSpent}","${c.status}"\n`;
      });
    } else if (activeTab === 'revenue' && reportData?.revenueByService) {
      csvContent += 'الخدمة,عدد الطلبات,الإيراد المحقق\n';
      reportData.revenueByService.forEach((s: any) => {
        csvContent += `"${s.title}","${s.count}","${s.revenue}"\n`;
      });
    } else if (activeTab === 'services' && reportData?.allServices) {
      csvContent += 'الخدمة,القطاع,السعر,الحجوزات,المكتمل,الإيراد المحقق,متوسط الطلب,الحالة\n';
      reportData.allServices.forEach((s: any) => {
        csvContent += `"${s.title}","${s.category === 'car' ? 'سيارات' : 'منازل'}","${s.price}","${s.bookingsCount}","${s.completedCount}","${s.revenue}","${s.averageOrderValue}","${s.active ? 'نشط' : 'معطل'}"\n`;
      });
    } else if (activeTab === 'areas' && reportData?.areasList) {
      csvContent += 'المحافظة / المنطقة,المدن,عدد العملاء,عدد الطلبات,الطلبات المكتملة,الإيرادات المحققة,الحالة\n';
      reportData.areasList.forEach((a: any) => {
        csvContent += `"${a.name}","${a.citiesCount}","${a.customersCount}","${a.ordersCount}","${a.completedOrders}","${a.revenue}","${a.active ? 'نشط' : 'معطل'}"\n`;
      });
    } else if (activeTab === 'coupons' && reportData?.couponsList) {
      csvContent += 'كود الكوبون,نوع الخصم,قيمة الخصم,مرات الاستخدام,الحد الأقصى,تاريخ البدء,تاريخ الانتهاء,الحالة\n';
      reportData.couponsList.forEach((c: any) => {
        csvContent += `"${c.code}","${c.discountType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}","${c.discountValue}","${c.currentUsageCount}","${c.totalUsageLimit}","${c.startDate}","${c.endDate}","${c.status}"\n`;
      });
    } else if (activeTab === 'bookings' && reportData?.bookingsByDay) {
      csvContent += 'اليوم,عدد الحجوزات\n';
      reportData.bookingsByDay.forEach((b: any) => {
        csvContent += `"${b.dayName}","${b.count}"\n`;
      });
    } else if (activeTab === 'subscriptions' && reportData?.subscriptionsList) {
      csvContent += 'رقم الاشتراك,اسم العميل,رقم الهاتف,باقة الاشتراك,الخدمة,القطاع,القيمة,الزيارات المنفذة,إجمالي الزيارات,تاريخ البدء,تاريخ الانتهاء,الحالة,التجديد\n';
      reportData.subscriptionsList.forEach((s: any) => {
        csvContent += `"${s.id}","${s.customerName}","${s.customerPhone}","${s.planName}","${s.serviceTitle}","${s.category === 'home' ? 'منازل' : 'سيارات'}","${s.price}","${s.usedVisits}","${s.totalVisits}","${s.startDate}","${s.endDate}","${s.status}","${s.renewedToId ? 'مجدد' : 'غير مجدد'}"\n`;
      });
    } else {
      csvContent += 'البيان,القيمة\n';
      if (reportData?.summary) {
        Object.entries(reportData.summary).forEach(([key, val]) => {
          csvContent += `"${key}","${val}"\n`;
        });
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    toast.success(`تم إنشاء وتصدير التقرير بصيغة (${format.toUpperCase()}) بنجاح`);
  };

  if (!canViewReports) {
    return (
      <div className="p-8 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
        <XCircle className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">صلاحيات الوصول مقيدة</h2>
        <p className="text-xs text-slate-500 mt-1">ليس لديك صلاحية عرض مركز التقارير (reports.view).</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-sky-500" />
            <span>مركز التقارير التشغيلية والمالية الموحد</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            بيانات رقمية دقيقة مستخرجة مباشرة من قاعدة البيانات مع فلاتر زمنية وإمكانيات تصدير احترافية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <ClearStatsButton onRefresh={fetchReport} />

          <button
            onClick={() => handleExport('csv')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>تصدير CSV</span>
          </button>

          <button
            onClick={() => handleExport('excel')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors shadow-xs"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
            <span>Excel جاهز</span>
          </button>

          <button
            onClick={() => handleExport('print')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0866C6] hover:bg-[#06529E] text-white shadow-xs cursor-pointer transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Date Filters Bar */}
      <div className="p-3 rounded-2xl bg-white dark:bg-[#082845] border border-slate-200/80 dark:border-[#133B61] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-1 text-xs">
          {[
            { id: 'today', label: 'اليوم' },
            { id: 'yesterday', label: 'أمس' },
            { id: 'last_7_days', label: 'آخر 7 أيام' },
            { id: 'last_30_days', label: 'آخر 30 يوماً' },
            { id: 'this_month', label: 'هذا الشهر' },
            { id: 'last_month', label: 'الشهر السابق' },
            { id: 'this_year', label: 'هذا العام' },
            { id: 'custom', label: 'فترة مخصصة' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setPeriod(item.id)}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                period === item.id
                  ? 'bg-[#0866C6] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-[#07345C]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {period === 'custom' && (
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400">من:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="text-slate-400">إلى:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-slate-800 dark:text-slate-200 font-mono text-xs outline-hidden"
              />
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5 text-sky-500" />
          <span>
            {reportData?.startDate || '—'} إلى {reportData?.endDate || '—'}
          </span>
        </div>
      </div>

      {/* 7 Report Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-[#082845] border border-slate-200/80 dark:border-[#133B61] text-xs font-semibold overflow-x-auto">
        <button
          onClick={() => setActiveTab('orders')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#07345C] dark:hover:text-white'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5" />
          <span>تقرير الطلبات</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'customers'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#07345C] dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>تقرير العملاء</span>
        </button>

        <button
          onClick={() => setActiveTab('revenue')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'revenue'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#07345C] dark:hover:text-white'
          }`}
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>تقرير الإيرادات والمالية</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'services'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#07345C] dark:hover:text-white'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>تقرير الخدمات</span>
        </button>

        <button
          onClick={() => setActiveTab('areas')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'areas'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#07345C] dark:hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>تقرير مناطق التغطية</span>
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'coupons'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#07345C] dark:hover:text-white'
          }`}
        >
          <TicketPercent className="w-3.5 h-3.5" />
          <span>تقرير الكوبونات</span>
        </button>

        <button
          onClick={() => setActiveTab('bookings')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'bookings'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#07345C] dark:hover:text-white'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>تقرير المواعيد والحجوزات</span>
        </button>

        <button
          onClick={() => setActiveTab('subscriptions')}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition-all cursor-pointer ${
            activeTab === 'subscriptions'
              ? 'bg-[#0866C6] text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#07345C] dark:hover:text-white'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>تقرير الاشتراكات</span>
        </button>
      </div>

      {/* Dynamic Summary Cards for each report */}
      {isLoading ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <RefreshCw className="w-6 h-6 text-sky-500 animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-400">جاري حساب وتجميع البيانات من قاعدة البيانات...</span>
        </div>
      ) : (
        <>
          {/* TAB 1: ORDERS SUMMARY */}
          {activeTab === 'orders' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">إجمالي الطلبات</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{reportData?.summary?.totalOrders || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">طلبات مكتملة</span>
                <span className="text-xl font-black text-emerald-500">{reportData?.summary?.completedCount || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">طلبات معلقة</span>
                <span className="text-xl font-black text-amber-500">{reportData?.summary?.pendingCount || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">قيد التنفيذ / مؤكدة</span>
                <span className="text-xl font-black text-sky-500">
                  {(reportData?.summary?.inProgressCount || 0) + (reportData?.summary?.confirmedCount || 0) + (reportData?.summary?.assignedCount || 0)}
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">طلبات ملغاة</span>
                <span className="text-xl font-black text-rose-500">{reportData?.summary?.cancelledCount || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">متوسط قيمة الطلب (AOV)</span>
                <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">{reportData?.summary?.averageOrderValue || 0} ج.م</span>
              </div>
            </div>
          )}

          {/* TAB 2: CUSTOMERS SUMMARY */}
          {activeTab === 'customers' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">إجمالي العملاء المسجلين</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{reportData?.summary?.totalCustomers || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">عملاء جدد في الفترة</span>
                <span className="text-xl font-black text-sky-500">+{reportData?.summary?.newCustomers || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">معدل عودة العملاء (Return Rate)</span>
                <span className="text-xl font-black text-emerald-500">{reportData?.summary?.returnRate || 0}%</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">متوسط عدد الطلبات للعميل</span>
                <span className="text-xl font-black text-amber-500">{reportData?.summary?.averageOrdersPerCustomer || 0} طلب</span>
              </div>
            </div>
          )}

          {/* TAB 3: REVENUE SUMMARY */}
          {activeTab === 'revenue' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">الإيرادات المكتملة الفعلية (صافي)</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                  {(reportData?.summary?.completedRevenue || 0).toLocaleString()} ج.م
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">إجمالي الحجوزات غير الملغاة</span>
                <span className="text-xl font-black text-sky-600 dark:text-sky-400">
                  {(reportData?.summary?.grossBookedRevenue || 0).toLocaleString()} ج.م
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">إجمالي الخصومات الممنوحة</span>
                <span className="text-xl font-black text-rose-500">
                  {(reportData?.summary?.totalDiscountsGiven || 0).toLocaleString()} ج.م
                </span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">وفورات الكوبونات المستخدمة</span>
                <span className="text-xl font-black text-purple-500">
                  {(reportData?.summary?.totalCouponDiscounts || 0).toLocaleString()} ج.م
                </span>
              </div>
            </div>
          )}

          {/* TAB 4: SERVICES SUMMARY */}
          {activeTab === 'services' && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">إجمالي الخدمات المتاحة</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{reportData?.summary?.totalServices || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">الخدمات النشطة</span>
                <span className="text-xl font-black text-emerald-500">{reportData?.summary?.activeServicesCount || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">الخدمات المعطلة</span>
                <span className="text-xl font-black text-rose-500">{reportData?.summary?.inactiveServicesCount || 0}</span>
              </div>
            </div>
          )}

          {/* TAB 5: AREAS SUMMARY */}
          {activeTab === 'areas' && (
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">إجمالي المحافظات ونطاقات التغطية</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{reportData?.summary?.totalGovernorates || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">المحافظات النشطة ميدانياً</span>
                <span className="text-xl font-black text-emerald-500">{reportData?.summary?.activeGovernorates || 0}</span>
              </div>
            </div>
          )}

          {/* TAB 6: COUPONS SUMMARY */}
          {activeTab === 'coupons' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">إجمالي الكوبونات</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{reportData?.summary?.totalCoupons || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">الكوبونات النشطة</span>
                <span className="text-xl font-black text-emerald-500">{reportData?.summary?.activeCouponsCount || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">مرات الاستخدام في الفترة</span>
                <span className="text-xl font-black text-sky-500">{reportData?.summary?.periodRedemptionCount || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">قيمة الخصومات الموفرة</span>
                <span className="text-xl font-black text-purple-500">{(reportData?.summary?.periodDiscountValue || 0).toLocaleString()} ج.م</span>
              </div>
            </div>
          )}

          {/* TAB 7: BOOKINGS SUMMARY */}
          {activeTab === 'bookings' && (
            <div className="grid grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">إجمالي الحجوزات في الفترة</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{reportData?.summary?.totalBookings || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">الحجوزات المكتملة</span>
                <span className="text-xl font-black text-emerald-500">{reportData?.summary?.completedCount || 0}</span>
              </div>
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <span className="text-[11px] text-slate-400 block mb-1">الحجوزات الملغاة</span>
                <span className="text-xl font-black text-rose-500">{reportData?.summary?.cancelledCount || 0}</span>
              </div>
            </div>
          )}

          {/* TAB 8: SUBSCRIPTIONS SUMMARY */}
          {activeTab === 'subscriptions' && (
            <div className="space-y-4">
              {/* 8 Primary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3">
                {/* 1. Total Subscriptions */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>إجمالي الاشتراكات</span>
                    <RotateCcw className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {reportData?.summary?.totalSubscriptions || 0}
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-emerald-500 font-bold">{reportData?.summary?.activeSubscriptions || 0} نشط</span>
                    <span>•</span>
                    <span className="text-amber-500 font-bold">{reportData?.summary?.expiredSubscriptions || 0} منتهي</span>
                    <span>•</span>
                    <span className="text-rose-500 font-bold">{reportData?.summary?.cancelledSubscriptions || 0} ملغي</span>
                  </div>
                </div>

                {/* 2. Subscription Revenue */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>إيرادات الاشتراكات</span>
                    <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                  </div>
                  <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {(reportData?.summary?.totalRevenue || reportData?.summary?.subscriptionRevenue || 0).toLocaleString()} ج.م
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    منها تجديدات: <strong className="text-slate-700 dark:text-slate-300">{(reportData?.summary?.renewalRevenue || 0).toLocaleString()} ج.م</strong>
                  </div>
                </div>

                {/* 3. Active Contract Value */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>قيمة الاشتراكات النشطة</span>
                    <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400">
                    {(reportData?.summary?.activeSubscriptionValue || 0).toLocaleString()} ج.م
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    عقود جارية لـ <strong className="text-slate-700 dark:text-slate-300">{reportData?.summary?.activeSubscriptions || 0} عميل</strong>
                  </div>
                </div>

                {/* 4. Renewal Rate */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>معدل التجديد الدوري</span>
                    <Percent className="w-3.5 h-3.5 text-purple-500" />
                  </div>
                  <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                    {reportData?.summary?.renewalRate || 0}%
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">{reportData?.summary?.renewedSubscriptions || 0} تم تجديدها</span>
                    <span>•</span>
                    <span className="text-slate-500">{reportData?.summary?.nonRenewedSubscriptions || 0} لم تجدد</span>
                  </div>
                </div>

                {/* 5. Subscribers Count */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>العملاء المشتركون</span>
                    <Users className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {reportData?.summary?.totalSubscribers || 0} عميل
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    عملاء جدد من الاشتراكات: <strong className="text-emerald-600 dark:text-emerald-400 font-bold">+{reportData?.summary?.newSubscriptionCustomers || 0}</strong>
                  </div>
                </div>

                {/* 6. Visits Operations */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>الزيارات الميدانية</span>
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-xl font-black text-slate-900 dark:text-white">
                    {reportData?.summary?.totalVisits || 0} زيارة
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                    <span className="text-emerald-500 font-bold">{reportData?.summary?.completedVisits || 0} منجزة</span>
                    <span>•</span>
                    <span className="text-amber-500 font-bold">{reportData?.summary?.rescheduledVisits || 0} معاد جدولتها</span>
                    <span>•</span>
                    <span className="text-rose-500 font-bold">{reportData?.summary?.cancelledVisits || 0} ملغاة</span>
                  </div>
                </div>

                {/* 7. Cashback System */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>كاش باك الاشتراكات</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </div>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    {(reportData?.summary?.cashbackRemaining || 0).toLocaleString()} ج.م
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1.5">
                    <span className="text-emerald-500 font-bold">+{reportData?.summary?.cashbackGenerated || 0} ناتج</span>
                    <span>•</span>
                    <span className="text-purple-500 font-bold">-{reportData?.summary?.cashbackUsed || 0} مستخدم</span>
                  </div>
                </div>

                {/* 8. Upcoming Visits */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <span>الزيارات المجدولة القادمة</span>
                    <Calendar className="w-3.5 h-3.5 text-sky-500" />
                  </div>
                  <span className="text-xl font-black text-sky-600 dark:text-sky-400">
                    {reportData?.summary?.upcomingVisits || 0} موعد
                  </span>
                  <div className="text-[10px] text-slate-400 mt-1">
                    مجدولة للتنفيذ الميداني لدى الفنيين
                  </div>
                </div>
              </div>

              {/* Breakdown Grid: Services Breakdown & Plan Performance */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Subscriptions by Service */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>الاشتراكات والإيراد حسب الخدمة</span>
                    <span className="text-[10px] font-mono text-slate-400">{reportData?.subscriptionsByService?.length || 0} خدمة</span>
                  </h4>
                  <div className="space-y-2">
                    {(reportData?.subscriptionsByService || []).map((srv: any, idx: number) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-slate-800 dark:text-slate-200">
                            {srv.category === 'home' ? '🏠' : '🚗'} {srv.serviceTitle}
                          </span>
                          <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                            {(srv.revenue || 0).toLocaleString()} ج.م ({srv.count} اشتراك)
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 rounded-full"
                            style={{ width: `${srv.sharePercentage || 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {(!reportData?.subscriptionsByService || reportData.subscriptionsByService.length === 0) && (
                      <div className="text-center py-4 text-xs text-slate-400">لا توجد خدمات مسجلة في هذا النطاق</div>
                    )}
                  </div>
                </div>

                {/* Plan Performance Breakdown */}
                <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                    <span>أداء خطط وباقات الاشتراكات</span>
                    <span className="text-[10px] font-mono text-slate-400">{reportData?.planBreakdown?.length || 0} باقة</span>
                  </h4>
                  <div className="space-y-2">
                    {(reportData?.planBreakdown || []).slice(0, 4).map((p: any) => (
                      <div key={p.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 block">{p.name}</strong>
                          <span className="text-[10px] text-slate-400">
                            {p.category === 'home' ? '🏠 منازل' : '🚗 سيارات'} • {p.visitCount} زيارات • {p.price} ج.م
                          </span>
                        </div>
                        <div className="text-left font-mono">
                          <span className="font-bold text-sky-600 dark:text-sky-400 block">{p.subscriptionCount} اشتراك</span>
                          <span className="text-[10px] text-emerald-500 font-bold">{(p.revenue || 0).toLocaleString()} ج.م</span>
                        </div>
                      </div>
                    ))}
                    {(!reportData?.planBreakdown || reportData.planBreakdown.length === 0) && (
                      <div className="text-center py-4 text-xs text-slate-400">لا توجد باقات مسجلة</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Detailed Data Tables */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-5 space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  السجلات التفصيلية الحية
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  قاعدة البيانات المباشرة
                </span>
              </div>

              {/* Search input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="بحث في بيانات التقرير..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pr-8 pl-3 py-1.5 rounded-xl text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              {/* ORDERS TABLE */}
              {activeTab === 'orders' && (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-3 px-3">رقم الطلب</th>
                      <th className="pb-3 px-3">العميل</th>
                      <th className="pb-3 px-3">الخدمة</th>
                      <th className="pb-3 px-3">التاريخ والوقت</th>
                      <th className="pb-3 px-3">المحافظة</th>
                      <th className="pb-3 px-3">القيمة</th>
                      <th className="pb-3 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reportData?.ordersList || [])
                      .filter((o: any) =>
                        searchQuery ? o.id.includes(searchQuery) || o.customerName.includes(searchQuery) || o.serviceTitle.includes(searchQuery) : true
                      )
                      .map((o: any) => (
                        <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold font-mono">#{o.id}</td>
                          <td className="py-3 px-3 font-semibold">{o.customerName}</td>
                          <td className="py-3 px-3">{o.serviceTitle}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">{o.date} {o.time || ''}</td>
                          <td className="py-3 px-3">{o.governorate}</td>
                          <td className="py-3 px-3 font-bold text-sky-600 dark:text-sky-400">{o.finalPrice} ج.م</td>
                          <td className="py-3 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              o.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-600'
                                : o.status === 'cancelled'
                                ? 'bg-rose-500/10 text-rose-600'
                                : 'bg-amber-500/10 text-amber-600'
                            }`}>
                              {o.status === 'completed' ? 'مكتمل' : o.status === 'cancelled' ? 'ملغي' : o.status === 'pending' ? 'قيد المراجعة' : o.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {(!reportData?.ordersList || reportData.ordersList.length === 0) && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">لا توجد طلبات مسجلة في الفترة المحددة.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* CUSTOMERS TABLE */}
              {activeTab === 'customers' && (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-3 px-3">اسم العميل</th>
                      <th className="pb-3 px-3">الهاتف</th>
                      <th className="pb-3 px-3">المحافظة / المدينة</th>
                      <th className="pb-3 px-3">عدد الطلبات</th>
                      <th className="pb-3 px-3">إجمالي الإنفاق</th>
                      <th className="pb-3 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reportData?.customersList || [])
                      .filter((c: any) =>
                        searchQuery ? c.name.includes(searchQuery) || c.phone.includes(searchQuery) : true
                      )
                      .map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold">{c.name}</td>
                          <td className="py-3 px-3 font-mono text-slate-500">{c.phone}</td>
                          <td className="py-3 px-3">{c.governorate} / {c.city}</td>
                          <td className="py-3 px-3 font-bold">{c.ordersCount} طلب</td>
                          <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">
                            {(c.totalSpent || 0).toLocaleString()} ج.م
                          </td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600">
                              {c.status || 'نشط'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    {(!reportData?.customersList || reportData.customersList.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">لا يوجد عملاء مسجلون في الفترة المحددة.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* REVENUE TABLE */}
              {activeTab === 'revenue' && (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-3 px-3">الخدمة</th>
                      <th className="pb-3 px-3">عدد الطلبات المكتملة</th>
                      <th className="pb-3 px-3">الإيراد المحقق الفعلي</th>
                      <th className="pb-3 px-3">نسبة المساهمة في الإيراد</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reportData?.revenueByService || []).map((s: any, idx: number) => {
                      const totalRev = reportData?.summary?.completedRevenue || 1;
                      const pct = Math.round((s.revenue / totalRev) * 100);
                      return (
                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-bold">{s.title}</td>
                          <td className="py-3 px-3 font-bold">{s.count} طلب</td>
                          <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">{s.revenue.toLocaleString()} ج.م</td>
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-24 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="font-mono text-[11px] text-slate-500">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {(!reportData?.revenueByService || reportData.revenueByService.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400">لا توجد إيرادات مكتملة مسجلة في الفترة المحددة.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* SERVICES TABLE */}
              {activeTab === 'services' && (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-3 px-3">الخدمة</th>
                      <th className="pb-3 px-3">القطاع</th>
                      <th className="pb-3 px-3">السعر الأساسي</th>
                      <th className="pb-3 px-3">إجمالي الحجوزات</th>
                      <th className="pb-3 px-3">المكتمل</th>
                      <th className="pb-3 px-3">إجمالي الإيرادات</th>
                      <th className="pb-3 px-3">متوسط الطلب</th>
                      <th className="pb-3 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reportData?.allServices || []).map((s: any) => (
                      <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold">{s.title}</td>
                        <td className="py-3 px-3">{s.category === 'car' ? '🚗 سيارات' : '🏠 منازل'}</td>
                        <td className="py-3 px-3 font-mono">{s.price} ج.م</td>
                        <td className="py-3 px-3 font-bold">{s.bookingsCount}</td>
                        <td className="py-3 px-3 text-emerald-600 font-bold">{s.completedCount}</td>
                        <td className="py-3 px-3 font-bold text-sky-600 dark:text-sky-400">{s.revenue.toLocaleString()} ج.م</td>
                        <td className="py-3 px-3 font-mono">{s.averageOrderValue} ج.م</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {s.active ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* AREAS TABLE */}
              {activeTab === 'areas' && (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-3 px-3">المحافظة / النطاق</th>
                      <th className="pb-3 px-3">عدد المدن</th>
                      <th className="pb-3 px-3">عدد العملاء</th>
                      <th className="pb-3 px-3">إجمالي الطلبات</th>
                      <th className="pb-3 px-3">الطلبات المكتملة</th>
                      <th className="pb-3 px-3">الإيرادات المحققة</th>
                      <th className="pb-3 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reportData?.areasList || []).map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold">{a.name}</td>
                        <td className="py-3 px-3">{a.citiesCount}</td>
                        <td className="py-3 px-3 font-bold">{a.customersCount}</td>
                        <td className="py-3 px-3 font-bold text-sky-600">{a.ordersCount}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600">{a.completedOrders}</td>
                        <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400">{a.revenue.toLocaleString()} ج.م</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            a.active ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {a.active ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* COUPONS TABLE */}
              {activeTab === 'coupons' && (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-3 px-3">كود الكوبون</th>
                      <th className="pb-3 px-3">نوع الخصم</th>
                      <th className="pb-3 px-3">قيمة الخصم</th>
                      <th className="pb-3 px-3">مرات الاستخدام</th>
                      <th className="pb-3 px-3">الحد الأقصى</th>
                      <th className="pb-3 px-3">تاريخ الانتهاء</th>
                      <th className="pb-3 px-3">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reportData?.couponsList || []).map((c: any) => (
                      <tr key={c.code} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="py-3 px-3 font-bold font-mono text-sky-600">{c.code}</td>
                        <td className="py-3 px-3">{c.discountType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</td>
                        <td className="py-3 px-3 font-bold">{c.discountValue} {c.discountType === 'percentage' ? '%' : 'ج.م'}</td>
                        <td className="py-3 px-3 font-bold">{c.currentUsageCount}</td>
                        <td className="py-3 px-3 font-mono">{c.totalUsageLimit}</td>
                        <td className="py-3 px-3 font-mono text-slate-500">{c.endDate}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'active' && !c.isExpired
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-rose-500/10 text-rose-600'
                          }`}>
                            {c.isExpired ? 'منتهي' : c.status === 'active' ? 'نشط' : 'معطل'}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {(!reportData?.couponsList || reportData.couponsList.length === 0) && (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">لا توجد كوبونات مسجلة.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {/* BOOKINGS TABLE */}
              {activeTab === 'bookings' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                      كثافة الحجوزات حسب أيام الأسبوع:
                    </h4>
                    <div className="grid grid-cols-7 gap-2 text-center">
                      {(reportData?.bookingsByDay || []).map((b: any) => (
                        <div key={b.dayIndex} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700">
                          <span className="text-[11px] text-slate-400 block mb-1">{b.dayName}</span>
                          <span className="text-base font-black text-slate-900 dark:text-white">{b.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
                      الفترات والمواعيد الأكثر طلباً:
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {(reportData?.busySlots || []).slice(0, 8).map((slot: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700 flex items-center justify-between">
                          <span className="text-xs font-mono font-bold">{slot.slot}</span>
                          <span className="text-xs font-black text-sky-600">{slot.count} حجز</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUBSCRIPTIONS TABLE */}
              {activeTab === 'subscriptions' && (
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400">
                      <th className="pb-3 px-3">رقم الاشتراك</th>
                      <th className="pb-3 px-3">العميل</th>
                      <th className="pb-3 px-3">الباقة والخدمة</th>
                      <th className="pb-3 px-3">القطاع</th>
                      <th className="pb-3 px-3">القيمة التعاقدية</th>
                      <th className="pb-3 px-3">الزيارات</th>
                      <th className="pb-3 px-3">فترة السريان</th>
                      <th className="pb-3 px-3">الحالة</th>
                      <th className="pb-3 px-3">التجديد</th>
                      <th className="pb-3 px-3 text-center">إجراءات وفاتورة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(reportData?.subscriptionsList || [])
                      .filter((s: any) =>
                        searchQuery
                          ? (s.id && s.id.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (s.customerName && s.customerName.includes(searchQuery)) ||
                            (s.customerPhone && s.customerPhone.includes(searchQuery)) ||
                            (s.planName && s.planName.includes(searchQuery)) ||
                            (s.serviceTitle && s.serviceTitle.includes(searchQuery))
                          : true
                      )
                      .map((sub: any) => {
                        const statusBadge =
                          sub.status === 'active'
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : sub.status === 'completed'
                            ? 'bg-sky-500/10 text-sky-600'
                            : sub.status === 'expired'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-rose-500/10 text-rose-600';

                        const statusLabel =
                          sub.status === 'active'
                            ? 'نشط'
                            : sub.status === 'completed'
                            ? 'مكتمل'
                            : sub.status === 'expired'
                            ? 'منتهي'
                            : 'ملغي';

                        return (
                          <tr key={sub.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-3 font-mono font-bold text-sky-600 dark:text-sky-400">
                              #{sub.id}
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-bold text-slate-900 dark:text-white block">
                                {sub.customerName || 'عميل كلينزو'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono" dir="ltr">
                                {sub.customerPhone}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className="font-semibold block">{sub.planName}</span>
                              <span className="text-[10px] text-slate-400">{sub.serviceTitle}</span>
                            </td>
                            <td className="py-3 px-3">
                              {sub.category === 'home' ? '🏠 منازل' : '🚗 سيارات'}
                            </td>
                            <td className="py-3 px-3 font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                              {(sub.price || 0).toLocaleString()} ج.م
                            </td>
                            <td className="py-3 px-3 font-mono">
                              <span className="font-bold">{sub.usedVisits || 0}</span>
                              <span className="text-slate-400"> / {sub.totalVisits || 0}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                              {sub.startDate || '-'} إلى {sub.endDate || '-'}
                            </td>
                            <td className="py-3 px-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge}`}>
                                {statusLabel}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-[11px]">
                              {sub.renewedToId ? (
                                <span className="text-purple-600 dark:text-purple-400 font-bold">
                                  مجدد (دورة {sub.renewalCycle || 1})
                                </span>
                              ) : (
                                <span className="text-slate-400">غير مجدد</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => {
                                    const invoiceHtml = generateOfficialSubscriptionInvoiceHtml(sub);
                                    printHtmlDocument(`فاتورة اشتراك ${sub.id}`, invoiceHtml);
                                  }}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-[11px] font-bold transition-all cursor-pointer border border-sky-200 dark:border-sky-800 shadow-xs"
                                  title="طباعة فاتورة الاشتراك الضريبية الرسمية"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                  <span>طباعة الفاتورة</span>
                                </button>

                                <Link
                                  href={`/admin/subscriptions/${sub.id}`}
                                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                                  title="عرض تفاصيل الاشتراك في لوحة التحكم"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    {(!reportData?.subscriptionsList || reportData.subscriptionsList.length === 0) && (
                      <tr>
                        <td colSpan={10} className="py-8 text-center text-slate-400">
                          لا توجد اشتراكات مسجلة في الفترة المحددة.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
