'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Search,
  Eye,
  Edit,
  Copy,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Tag,
  ArrowUpDown,
  Car,
  Home,
  Layers,
} from 'lucide-react';
import { useServiceStore } from '@/store/useServiceStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { hasPermission } from '@/lib/permissions';
import { ServiceCategory } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function AdminServicesPage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const canCreate = hasPermission(currentAdmin, 'services.create');
  const canEdit = hasPermission(currentAdmin, 'services.edit');
  const canDelete = hasPermission(currentAdmin, 'services.delete');

  const services = useServiceStore((s) => s.services);
  const categories = useServiceStore((s) => s.categories);
  const fetchAdminServices = useServiceStore((s) => s.fetchAdminServices);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);
  const deleteService = useServiceStore((s) => s.deleteService);
  const duplicateService = useServiceStore((s) => s.duplicateService);
  const toggleVisibility = useServiceStore((s) => s.toggleServiceVisibility);

  const addLog = useActivityLogStore((s) => s.addLog);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | 'all'>('all');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminServices();
    fetchCategories();
  }, [fetchAdminServices, fetchCategories]);

  const filtered = services.filter((s) => {
    const matchCat = selectedCategory === 'all' || s.category === selectedCategory;
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      s.title.toLowerCase().includes(q) ||
      s.titleEn.toLowerCase().includes(q) ||
      s.shortDescription.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteService(id);
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'حذف خدمة من الكتالوج',
        module: 'services',
        target: title,
      });
      setDeleteConfirmId(null);
      toast.success('تم حذف الخدمة من المنصة بنجاح');
    } catch (err: any) {
      toast.error(err.message || 'فشل حذف الخدمة من الخادم');
    }
  };

  const handleDuplicate = async (id: string, title: string) => {
    try {
      await duplicateService(id);
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'تكرار / استنساخ خدمة',
        module: 'services',
        target: title,
      });
      toast.success('تم استنساخ الخدمة بنجاح كمسودة جديدة');
    } catch (err: any) {
      toast.error(err.message || 'فشل تكرار الخدمة على الخادم');
    }
  };

  const handleToggle = async (id: string, title: string, currentAvailable: boolean) => {
    try {
      await toggleVisibility(id);
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: currentAvailable ? 'إخفاء خدمة من الموقع' : 'نشر خدمة في الموقع',
        module: 'services',
        target: title,
      });
      toast.info(currentAvailable ? 'تم إخفاء الخدمة من موقع العملاء' : 'تم تفعيل ظهور الخدمة في الموقع');
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث حالة ظهور الخدمة');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            كتالوج الخدمات والتسعير
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة الأسعار، الخصومات، التوفر، والتفاصيل لجميع باقات كلينزو
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/services/categories"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            <span>إدارة التصنيفات ({categories.length})</span>
          </Link>
          {canCreate && (
            <Link
              href={`/admin/services/new${selectedCategory !== 'all' ? `?category=${encodeURIComponent(selectedCategory)}` : ''}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة خدمة جديدة</span>
            </Link>
          )}
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-3 shadow-xs">
        <div className="relative flex-1 w-full">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث باسم الخدمة أو الوصف..."
            className="w-full pl-3 pr-9 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
        </div>

        {/* Category switcher */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs w-full sm:w-auto justify-start overflow-x-auto">
          <button
            onClick={() => setSelectedCategory('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors',
              selectedCategory === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500'
            )}
          >
            الكل ({services.length})
          </button>
          {categories.length > 0 ? (
            <>
              {categories.map((cat) => {
                const count = services.filter((s) => s.category === cat.slug).length;
                return (
                  <button
                    key={cat.id || cat.slug}
                    onClick={() => setSelectedCategory(cat.slug as ServiceCategory)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5',
                      selectedCategory === cat.slug
                        ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                        : 'text-slate-500'
                    )}
                  >
                    {cat.slug === 'car' ? (
                      <Car className="w-3.5 h-3.5" />
                    ) : cat.slug === 'home' ? (
                      <Home className="w-3.5 h-3.5" />
                    ) : (
                      <Sparkles className="w-3.5 h-3.5" />
                    )}
                    <span>{cat.name}</span>
                    <span className="text-[10px] opacity-60">({count})</span>
                  </button>
                );
              })}
              {/* Orphan category tabs (if services exist with a slug not in categories table) */}
              {Array.from(new Set(services.map((s) => s.category)))
                .filter((catSlug) => catSlug && !categories.some((c) => c.slug === catSlug))
                .map((orphanSlug) => {
                  const count = services.filter((s) => s.category === orphanSlug).length;
                  const orphanName =
                    orphanSlug === 'car'
                      ? 'خدمات السيارات'
                      : orphanSlug === 'home'
                      ? 'خدمات المنازل'
                      : orphanSlug;
                  return (
                    <button
                      key={orphanSlug}
                      onClick={() => setSelectedCategory(orphanSlug as ServiceCategory)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5',
                        selectedCategory === orphanSlug
                          ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs'
                          : 'text-slate-500'
                      )}
                    >
                      {orphanSlug === 'car' ? <Car className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                      <span>{orphanName}</span>
                      <span className="text-[10px] opacity-60">({count})</span>
                    </button>
                  );
                })}
            </>
          ) : (
            <>
              <button
                onClick={() => setSelectedCategory('car')}
                className={cn('px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1', selectedCategory === 'car' ? 'bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 shadow-xs' : 'text-slate-500')}
              >
                <Car className="w-3.5 h-3.5" />
                <span>سيارات</span>
              </button>
              <button
                onClick={() => setSelectedCategory('home')}
                className={cn('px-3 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1', selectedCategory === 'home' ? 'bg-white dark:bg-slate-900 text-[#07345C] dark:text-[#83AED0] shadow-xs' : 'text-slate-500')}
              >
                <Home className="w-3.5 h-3.5" />
                <span>منازل</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Services Table */}
      <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 font-semibold">
                <th className="py-3.5 px-4">الخدمة</th>
                <th className="py-3.5 px-4">القطاع</th>
                <th className="py-3.5 px-4">السعر الأساسي</th>
                <th className="py-3.5 px-4">السعر النهائي</th>
                <th className="py-3.5 px-4">المدة</th>
                <th className="py-3.5 px-4">الظهور بالموقع</th>
                <th className="py-3.5 px-4 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((service) => (
                <tr key={service.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {service.image ? (
                        <img
                          src={service.image}
                          alt={service.title}
                          className="w-12 h-12 rounded-xl object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700 shrink-0">
                          <Sparkles className="w-5 h-5 text-slate-400" />
                        </div>
                      )}
                      <div>
                        <Link
                          href={`/admin/services/${service.id}`}
                          className="font-bold text-slate-900 dark:text-white hover:text-sky-500"
                        >
                          {service.title}
                        </Link>
                        <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1 max-w-xs">
                          {service.shortDescription}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    {(() => {
                      const catObj = categories.find((c) => c.slug === service.category);
                      const catName = catObj?.name || (service.category === 'car' ? 'خدمات السيارات' : service.category === 'home' ? 'خدمات المنازل' : service.category);
                      const isCar = service.category === 'car';
                      const isHome = service.category === 'home';

                      return (
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-lg text-[11px] font-bold inline-flex items-center gap-1.5',
                            isCar
                              ? 'bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800'
                              : isHome
                              ? 'bg-[#07345C]/10 dark:bg-[#07345C]/40 text-[#07345C] dark:text-[#83AED0] border border-[#07345C]/20 dark:border-[#83AED0]/30'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                          )}
                        >
                          {isCar ? (
                            <Car className="w-3.5 h-3.5 text-sky-500" />
                          ) : isHome ? (
                            <Home className="w-3.5 h-3.5 text-[#07345C] dark:text-[#83AED0]" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                          )}
                          <span>{catName}</span>
                        </span>
                      );
                    })()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 line-through">
                    {service.originalPrice ? `${service.originalPrice} ج.م` : '-'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-sky-600 dark:text-sky-400">
                    {service.price} ج.م
                  </td>
                  <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                    {service.duration} دقيقة
                  </td>
                  <td className="py-3.5 px-4">
                    {canEdit ? (
                      <button
                        onClick={() => handleToggle(service.id, service.title, service.available)}
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-bold transition-colors',
                          service.available
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        )}
                      >
                        {service.available ? 'معروض للعملاء' : 'مخفي'}
                      </button>
                    ) : (
                      <span
                        className={cn(
                          'px-2.5 py-1 rounded-full text-[10px] font-bold',
                          service.available
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        )}
                      >
                        {service.available ? 'معروض للعملاء' : 'مخفي'}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {canEdit && (
                        <Link
                          href={`/admin/services/${service.id}`}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-500 hover:text-white transition-colors"
                          title="تعديل الخدمة"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                      )}
                      {canCreate && (
                        <button
                          onClick={() => handleDuplicate(service.id, service.title)}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white transition-colors"
                          title="استنساخ الخدمة"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => setDeleteConfirmId(service.id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-colors"
                          title="حذف الخدمة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
            <h3 className="text-sm font-bold text-rose-500">تأكيد حذف الخدمة</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              هل أنت متأكد من رغبتك في حذف هذه الخدمة نهائياً من الكتالوج وموقع العملاء؟
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-slate-500"
              >
                إلغاء
              </button>
              <button
                onClick={() => {
                  const s = services.find((x) => x.id === deleteConfirmId);
                  if (s) handleDelete(s.id, s.title);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
