'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BrainCircuit,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  RefreshCw,
  CheckCircle2,
  Zap,
  BarChart3,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { useAdminStore } from '@/store/useAdminStore';
import { hasPermission } from '@/lib/permissions';
import { toast } from 'sonner';

interface AIInsight {
  id: string;
  type: 'growth' | 'demand' | 'warning' | 'recommendation' | 'opportunity';
  category?: 'sales' | 'operations' | 'marketing' | 'quality' | 'general';
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  confidence: number;
  metric?: string;
  impact: 'high' | 'medium' | 'low';
  actionableStep?: string;
}

export default function AdminAIAnalyticsPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canView = hasPermission(currentAdmin, 'reports.view') || hasPermission(currentAdmin, 'analytics.view') || hasPermission(currentAdmin, 'dashboard.view');

  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');

  const fetchInsights = useCallback(async (isRefresh = false) => {
    if (isRefresh) setAnalyzing(true);
    else setIsLoading(true);

    try {
      const data = await cleanzoApi.admin.getAIInsights();
      if (Array.isArray(data)) {
        setInsights(data);
      } else {
        setInsights([]);
      }
      if (isRefresh) {
        toast.success('تم فحص وتحديث تحليلات الذكاء الاصطناعي بنجاح من قاعدة البيانات');
      }
    } catch (err: any) {
      console.error('Failed to fetch AI insights:', err);
      toast.error('تعذر جلب تحليلات الذكاء الاصطناعي من الخادم');
    } finally {
      setIsLoading(false);
      setAnalyzing(false);
    }
  }, []);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const filteredInsights = insights.filter((item) => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  // Calculate statistics
  const highImpactCount = insights.filter((i) => i.impact === 'high').length;
  const avgConfidence =
    insights.length > 0
      ? Math.round(
          (insights.reduce((acc, curr) => acc + (curr.confidence || 0.9), 0) / insights.length) * 100
        )
      : 95;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'growth':
        return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'demand':
        return <Layers className="w-4 h-4 text-sky-500" />;
      case 'opportunity':
        return <Target className="w-4 h-4 text-purple-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'recommendation':
      default:
        return <Lightbulb className="w-4 h-4 text-indigo-500" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'growth':
        return 'نمو وتوسع';
      case 'demand':
        return 'كثافة الطلب';
      case 'opportunity':
        return 'فرصة ربحية';
      case 'warning':
        return 'تنبيه تشغيلي';
      case 'recommendation':
      default:
        return 'توصية استراتيجية';
    }
  };

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'high':
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            عالي التأثير
          </span>
        );
      case 'medium':
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            متوسط التأثير
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
            عادي
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/analytics"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-500 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة للتحليلات ومؤشرات الأداء العامة</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <BrainCircuit className="w-6 h-6 text-indigo-500" />
            <span>محرك الرؤى والتحليلات الذكية (Cleanzo AI Insights)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            تحليل بيانات حقيقي 100% مستخرج من قاعدة البيانات لحركة الحجوزات، المبيعات، ومعدلات ولاء العملاء.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchInsights(true)}
          disabled={analyzing || isLoading}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs flex items-center gap-2 transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin text-indigo-500' : ''}`} />
          <span>{analyzing ? 'جاري إعادة الفحص والتحليل...' : 'إعادة التوليد والتحليل الفوري'}</span>
        </button>
      </div>

      {/* Hero Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-linear-to-r from-indigo-950 via-slate-900 to-[#04213B] text-white border border-indigo-500/30 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold border border-indigo-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>ذكاء اصطناعي تحليلي معتمد على بيانات حقيقية</span>
            </div>
            <h2 className="text-lg sm:text-xl font-black">
              استكشاف أنماط الطلب وساعات الذروة وفرص مضاعفة الإيرادات
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              يقوم المحرك بربط سجلات الحجوزات، المناطق الجغرافية، سلوك العملاء المتكررين، ومعدلات الإلغاء لتقديم توصيات مباشرة وقابلة للتطبيق الفوري دون أي أرقام وهمية.
            </p>
          </div>

          {/* Quick Metrics Inside Banner */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[100px]">
              <span className="block text-2xl font-black text-indigo-400">{insights.length}</span>
              <span className="text-[11px] text-slate-400 font-semibold">رؤية مكتشفة</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[100px]">
              <span className="block text-2xl font-black text-rose-400">{highImpactCount}</span>
              <span className="text-[11px] text-slate-400 font-semibold">عالية الأثر</span>
            </div>
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center min-w-[100px]">
              <span className="block text-2xl font-black text-emerald-400">{avgConfidence}%</span>
              <span className="text-[11px] text-slate-400 font-semibold">دقة التحليل</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs text-xs">
        {[
          { id: 'all', label: 'كافة الرؤى والتحليلات', icon: Sparkles },
          { id: 'demand', label: 'كثافة الطلب والمناطق', icon: Layers },
          { id: 'growth', label: 'النمو والخدمات الرائدة', icon: TrendingUp },
          { id: 'opportunity', label: 'فرص الأرباح والذروة', icon: Target },
          { id: 'recommendation', label: 'توصيات تشغيلية', icon: Lightbulb },
          { id: 'warning', label: 'التنبيهات والمخاطر', icon: AlertTriangle },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = filterType === tab.id;
          const count = tab.id === 'all' ? insights.length : insights.filter((i) => i.type === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Insights Cards Grid */}
      {isLoading ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            جاري تشغيل محرك الذكاء الاصطناعي وتحليل قاعدة البيانات...
          </p>
          <p className="text-xs text-slate-400">
            يتم فحص أرقام الحجوزات ومعدلات الإلغاء وساعات الذروة الميدانية
          </p>
        </div>
      ) : filteredInsights.length === 0 ? (
        <div className="p-16 text-center rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <HelpCircle className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            لا توجد رؤى مطابقة لهذا التصنيف
          </h3>
          <p className="text-xs text-slate-500">
            يمكنك اختيار تصنيف آخر أو الضغط على "كافة الرؤى والتحليلات" لعرض النتائج كاملة.
          </p>
          <button
            onClick={() => setFilterType('all')}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            عرض جميع التحليلات
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredInsights.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Top Badges Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold">
                    {getTypeIcon(item.type)}
                    <span>{getTypeLabel(item.type)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.metric && (
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800">
                        {item.metric}
                      </span>
                    )}
                    {getImpactBadge(item.impact)}
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug">
                  {item.title}
                </h3>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Actionable Step Box (if available) */}
              <div className="space-y-3 pt-2">
                {item.actionableStep && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-2.5">
                    <Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                        الخطوة المقترحة للتطبيق
                      </span>
                      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {item.actionableStep}
                      </p>
                    </div>
                  </div>
                )}

                {/* Confidence Footer */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                    <span>مبني على سجلات حقيقية</span>
                  </span>
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-400">
                    دقة الحساب: {Math.round(item.confidence * 100)}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bottom Insights Summary */}
      <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
        <div className="space-y-0.5">
          <p className="font-bold text-slate-900 dark:text-white">
            هل ترغب في فحص تقارير الإيرادات التفصيلية؟
          </p>
          <p className="text-slate-500">
            يمكنك الاطلاع على الجداول الكاملة وتصدير الفواتير الرسمية من قسم التقارير.
          </p>
        </div>
        <Link
          href="/admin/reports"
          className="px-4 py-2 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] font-bold self-start sm:self-auto transition-colors shadow-md"
        >
          الانتقال لتقارير المبيعات الشاملة &larr;
        </Link>
      </div>
    </div>
  );
}
