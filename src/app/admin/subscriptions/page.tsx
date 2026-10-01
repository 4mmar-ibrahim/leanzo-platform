'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  Filter,
  Layers,
  Calendar,
  Clock,
  User,
  Phone,
  CheckCircle2,
  XCircle,
  Eye,
  Plus,
  RefreshCw,
  Car,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Tag,
  ArrowUpRight,
} from 'lucide-react';
import { apiGet, apiPut } from '@/lib/api';
import { toast } from 'sonner';

interface ISubscription {
  id: string;
  customerName: string;
  customerPhone: string;
  planId: string;
  serviceId: string;
  status: string;
  totalVisits: number;
  usedVisits: number;
  remainingVisits: number;
  price: number;
  startDate: string;
  endDate: string;
  renewalCycle: number;
  renewedToId?: string;
  vehicleDetails?: any;
  plan?: {
    id: string;
    name: string;
    visitCount: number;
  };
  service?: {
    id: string;
    title: string;
    category: string;
  };
  visits?: Array<{
    id: string;
    date: string;
    time: string;
    status: string;
  }>;
}

export default function AdminSubscriptionsPage() {
  const [loading, setLoading] = useState(true);
  const [subscriptions, setSubscriptions] = useState<ISubscription[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const fetchSubscriptions = async (page = 1) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      query.set('page', String(page));
      query.set('limit', '20');
      if (statusFilter !== 'all') query.set('status', statusFilter);
      if (search.trim()) query.set('search', search.trim());

      const res = await apiGet<{ subscriptions: ISubscription[]; pagination: any }>(
        `/subscriptions/admin/all?${query.toString()}`
      );

      if (res?.data) {
        setSubscriptions(res.data.subscriptions || []);
        if (res.data.pagination) setPagination(res.data.pagination);
      }
    } catch (err: any) {
      console.error('Failed to load admin subscriptions:', err);
      toast.error('تعذر تحميل قائمة الاشتراكات');
    } finally {
      setLoading(false);
    }
  };

  const [analytics, setAnalytics] = useState<any>(null);

  const fetchAnalytics = async () => {
    try {
      const res = await apiGet('/subscriptions/admin/analytics');
      if (res?.data) {
        setAnalytics(res.data);
      }
    } catch (e) {
      console.warn('Analytics fetch error', e);
    }
  };

  useEffect(() => {
    fetchSubscriptions(1);
    fetchAnalytics();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSubscriptions(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">نشط</span>;
      case 'completed':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">مكتمل</span>;
      case 'expired':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">منتهي</span>;
      case 'cancelled':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">ملغي</span>;
      case 'paused':
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">موقوف</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-500">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-[#0866C6]" />
            <span>إدارة جميع الاشتراكات</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            استعراض وتتبع اشتراكات العملاء الدورية، أرصدة الزيارات، وتجديدات الباقات
          </p>
        </div>

        {/* Quick Nav Links */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/admin/subscriptions/plans">
            <button className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-[#0866C6]" />
              <span>الباقات</span>
            </button>
          </Link>
          <Link href="/admin/subscriptions/visits">
            <button className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-emerald-500" />
              <span>الزيارات والمواعيد</span>
            </button>
          </Link>
          <Link href="/admin/subscriptions/renewals">
            <button className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5">
              <RefreshCw className="w-4 h-4 text-purple-500" />
              <span>التجديدات</span>
            </button>
          </Link>
          <Link href="/admin/subscriptions/settings">
            <button className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-amber-500" />
              <span>الإعدادات</span>
            </button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Bar */}
      {analytics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500">الاشتراكات النشطة</div>
            <div className="text-2xl font-black text-[#0866C6] mt-1 font-mono">{analytics.activeSubscriptions}</div>
            <div className="text-[10px] text-slate-400 mt-1">من إجمالي {analytics.totalSubscriptions} اشتراك</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500">القيمة المالية النشطة</div>
            <div className="text-2xl font-black text-emerald-500 mt-1 font-mono">{analytics.activeSubscriptionValue} ريال</div>
            <div className="text-[10px] text-slate-400 mt-1">إجمالي الإيرادات: {analytics.totalSubscriptionRevenue} ريال</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500">الزيارات المكتملة</div>
            <div className="text-2xl font-black text-blue-500 mt-1 font-mono">{analytics.visitStats?.completed || 0}</div>
            <div className="text-[10px] text-slate-400 mt-1">مجدولة: {analytics.visitStats?.scheduled || 0}</div>
          </div>
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="text-[11px] font-bold text-slate-500">معدل التجديد</div>
            <div className="text-2xl font-black text-purple-500 mt-1 font-mono">%{analytics.renewalRate || 0}</div>
            <div className="text-[10px] text-slate-400 mt-1">تم تجديد: {analytics.renewedSubscriptions}</div>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث برقم الاشتراك، اسم العميل، أو الهاتف..."
            className="w-full pr-10 pl-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-[#0866C6]"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3" />
        </form>

        {/* Status Filter */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-none">
          {[
            { key: 'all', label: 'الكل' },
            { key: 'active', label: 'النشطة' },
            { key: 'completed', label: 'المكتملة' },
            { key: 'expired', label: 'المنتهية' },
            { key: 'cancelled', label: 'الملغاة' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
                statusFilter === tab.key
                  ? 'bg-[#0866C6] text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-[#0866C6]/20 border-t-[#0866C6] rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-bold">جاري تحميل بيانات الاشتراكات...</p>
          </div>
        ) : subscriptions.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Layers className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">لا توجد اشتراكات تطابق البحث</h3>
            <p className="text-xs text-slate-400">جرب تعديل معايير التصفية أو البحث</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-4 px-4">رقم الاشتراك</th>
                  <th className="py-4 px-4">العميل</th>
                  <th className="py-4 px-4">الخدمة والباقة</th>
                  <th className="py-4 px-4">السيارة</th>
                  <th className="py-4 px-4">رصيد الزيارات</th>
                  <th className="py-4 px-4">القيمة</th>
                  <th className="py-4 px-4">الموعد القادم</th>
                  <th className="py-4 px-4">الحالة</th>
                  <th className="py-4 px-4 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {(Array.isArray(subscriptions) ? subscriptions : []).map((sub) => {
                  const nextVisit = sub.visits?.[0];
                  const percent = Math.min(100, Math.round((sub.usedVisits / (sub.totalVisits || 1)) * 100));

                  return (
                    <tr key={sub.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-4 px-4">
                        <Link
                          href={`/admin/subscriptions/${sub.id}`}
                          className="font-black text-[#0866C6] dark:text-sky-400 hover:underline flex items-center gap-1"
                        >
                          <span>{sub.id}</span>
                          <ArrowUpRight className="w-3 h-3 opacity-60" />
                        </Link>
                        {sub.renewalCycle > 1 && (
                          <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold block">
                            دورة تجديد #{sub.renewalCycle}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-900 dark:text-white">{sub.customerName}</div>
                        <div className="text-[11px] text-slate-500 font-mono" dir="ltr">
                          {sub.customerPhone}
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-bold text-slate-800 dark:text-slate-200">
                          {sub.plan?.name || 'باقة اشتراك'}
                        </div>
                        <div className="text-[11px] text-slate-500">{sub.service?.title}</div>
                      </td>

                      <td className="py-4 px-4 text-slate-600 dark:text-slate-400">
                        {sub.vehicleDetails ? (
                          <div className="flex items-center gap-1">
                            <Car className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {sub.vehicleDetails.make} {sub.vehicleDetails.model}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Visit Balance with Progress bar */}
                      <td className="py-4 px-4">
                        <div className="w-28 space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold">
                            <span>{sub.usedVisits}/{sub.totalVisits}</span>
                            <span className="text-slate-400">متبقي {sub.remainingVisits}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#0866C6] rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 font-black text-slate-900 dark:text-white">
                        {sub.price} ج.م
                      </td>

                      <td className="py-4 px-4">
                        {nextVisit ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-800 dark:text-slate-200">{nextVisit.date}</div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{nextVisit.time}</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-4 px-4">{getStatusBadge(sub.status)}</td>

                      <td className="py-4 px-4 text-center">
                        <Link href={`/admin/subscriptions/${sub.id}`}>
                          <button className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#0866C6] hover:text-white text-slate-600 dark:text-slate-300 transition-colors">
                            <Eye className="w-4 h-4" />
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-400">
            <span>
              إجمالي {pagination.total} اشتراك • صفحة {pagination.page} من {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchSubscriptions(pagination.page - 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchSubscriptions(pagination.page + 1)}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
