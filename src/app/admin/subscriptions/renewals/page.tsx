'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  User,
  Phone,
  DollarSign,
  Calendar,
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import { apiGet } from '@/lib/api';
import { toast } from 'sonner';

export default function AdminSubscriptionRenewalsPage() {
  const [renewals, setRenewals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchRenewals = async () => {
    try {
      setLoading(true);
      let res: any;
      try {
        res = await apiGet('/subscriptions/admin/renewals');
      } catch {
        try {
          res = await apiGet('/admin/subscriptions/renewals');
        } catch {
          res = await apiGet('/subscriptions/renewals');
        }
      }
      const rawRenewals = Array.isArray(res?.data) ? res.data : res?.data?.renewals || [];
      setRenewals(rawRenewals);
    } catch (err: any) {
      console.warn('Failed to load renewals:', err);
      setRenewals([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenewals();
  }, []);

  const renewalsList: any[] = Array.isArray(renewals) ? renewals : (renewals as any)?.renewals || [];
  const filteredRenewals = renewalsList.filter((ren: any) => {
    if (!ren) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchCustomer = ren.customerName?.toLowerCase().includes(q) || ren.customerPhone?.includes(q);
      const matchPlan = ren.planName?.toLowerCase().includes(q);
      if (!matchCustomer && !matchPlan) return false;
    }
    return true;
  });

  const totalRenewalRevenue = renewalsList.reduce((acc: number, r: any) => acc + (Number(r.amountPaid || r.renewalPrice) || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/subscriptions" className="text-xs text-foreground/60 hover:text-primary flex items-center gap-1">
              <ArrowRight className="w-3.5 h-3.5" />
              الاشتراكات
            </Link>
            <span className="text-foreground/40">/</span>
            <span className="text-xs text-foreground/80">التجديدات</span>
          </div>
          <h1 className="text-2xl font-black text-foreground">
            سجل تجديد الاشتراكات (Renewals)
          </h1>
          <p className="text-xs text-foreground/60 mt-1">
            متابعة دورات التجديد الناجحة وعائدات إعادة الاشتراك للعملاء الحاليين
          </p>
        </div>

        <button
          onClick={fetchRenewals}
          className="p-2 rounded-xl bg-card border border-border/50 text-foreground/70 hover:text-primary transition"
          title="تحديث"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <RefreshCw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-foreground/60 font-medium">إجمالي عمليات التجديد</div>
            <div className="text-2xl font-black text-foreground mt-0.5">{renewalsList.length} دورة</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-foreground/60 font-medium">عائدات التجديد</div>
            <div className="text-2xl font-black text-emerald-500 mt-0.5">{totalRenewalRevenue.toLocaleString()} ج.م</div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-500">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-foreground/60 font-medium">معدل الحفاظ على العملاء</div>
            <div className="text-2xl font-black text-blue-500 mt-0.5">
              {renewalsList.length > 0 ? 'نشط ومستمر' : 'في انتظار التجديدات'}
            </div>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 rounded-2xl bg-card border border-border/50 shadow-sm flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-foreground/40 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="بحث باسم العميل أو الباقة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-9 pl-3 py-2 rounded-xl bg-background border border-border text-xs focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-card border border-border/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-muted/50 text-foreground/70 border-b border-border/40">
              <tr>
                <th className="py-3 px-4 font-bold"># معرف التجديد</th>
                <th className="py-3 px-4 font-bold">العميل</th>
                <th className="py-3 px-4 font-bold">رقم الدورة</th>
                <th className="py-3 px-4 font-bold">الاشتراك السابق</th>
                <th className="py-3 px-4 font-bold">الاشتراك الجديد</th>
                <th className="py-3 px-4 font-bold">قيمة التجديد</th>
                <th className="py-3 px-4 font-bold">تاريخ التجديد</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-foreground/50">
                    <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto mb-2" />
                    جاري تحميل التجديدات...
                  </td>
                </tr>
              ) : filteredRenewals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-foreground/50">
                    لا توجد سجلات تجديد بعد
                  </td>
                </tr>
              ) : (
                filteredRenewals.map((ren: any) => (
                  <tr key={ren.id} className="hover:bg-muted/20 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground/70">
                      {ren.id.slice(0, 8)}
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="font-bold text-foreground">
                        {ren.customer?.fullName || ren.customer?.name || ren.customerName || 'عميل'}
                      </div>
                      <div className="text-[11px] text-foreground/60 font-mono" dir="ltr">
                        {ren.customer?.phone || ren.customerPhone}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-bold text-primary font-mono">
                      دورة #{ren.cycleNumber || 1}
                    </td>

                    <td className="py-3.5 px-4">
                      {ren.previousSubscriptionId ? (
                        <Link
                          href={`/admin/subscriptions/${ren.previousSubscriptionId}`}
                          className="font-mono text-[11px] text-foreground/60 hover:text-primary flex items-center gap-1"
                        >
                          {ren.previousSubscriptionId.slice(0, 8)}...
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-foreground/40 italic">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {ren.newSubscriptionId ? (
                        <Link
                          href={`/admin/subscriptions/${ren.newSubscriptionId}`}
                          className="font-mono text-[11px] text-primary hover:underline font-bold flex items-center gap-1"
                        >
                          {ren.newSubscriptionId.slice(0, 8)}...
                          <ArrowUpRight className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-foreground/40 italic">-</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-500">
                      {ren.amountPaid} ج.م
                    </td>

                    <td className="py-3.5 px-4 font-mono text-foreground/60">
                      {new Date(ren.createdAt).toLocaleDateString('ar-SA')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
