'use client';

import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  Edit2,
  Building,
  CheckCircle2,
  XCircle,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { useLocationStore } from '@/store/useLocationStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';

export default function AdminLocationsPage() {
  const {
    governorates,
    fetchLocations,
    addGovernorate,
    updateGovernorate,
    toggleGovernorateActive,
    deleteGovernorate,
    addCity,
    updateCity,
    toggleCityActive,
    deleteCity,
    isLoading,
  } = useLocationStore();

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  // Fetch admin locations on mount
  useEffect(() => {
    fetchLocations(true);
  }, [fetchLocations]);

  // Selected for drill-down
  const [selectedGovId, setSelectedGovId] = useState('');

  useEffect(() => {
    if (governorates.length > 0 && (!selectedGovId || !governorates.some((g) => g.id === selectedGovId))) {
      setSelectedGovId(governorates[0].id);
    }
  }, [governorates, selectedGovId]);

  // Inputs
  const [newGovName, setNewGovName] = useState('');
  const [newGovNameEn, setNewGovNameEn] = useState('');
  const [newCityName, setNewCityName] = useState('');
  const [newCityNameEn, setNewCityNameEn] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Editing states
  const [editingGov, setEditingGov] = useState<{ id: string; name: string; nameEn: string } | null>(null);
  const [editingCity, setEditingCity] = useState<{ id: string; name: string; nameEn: string } | null>(null);

  const activeGov = governorates.find((g) => g.id === selectedGovId) || governorates[0];

  const handleAddGov = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGovName.trim()) return;

    setIsSubmitting(true);
    try {
      await addGovernorate(newGovName.trim(), newGovNameEn.trim() || newGovName.trim());
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'إضافة محافظة جديدة لنطاق الخدمة',
        module: 'locations',
        target: newGovName,
      });
      setNewGovName('');
      setNewGovNameEn('');
      toast.success('تمت إضافة المحافظة بنجاح وحفظها في قاعدة البيانات');
    } catch (err: any) {
      toast.error(err.message || 'فشل إضافة المحافظة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateGov = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGov || !editingGov.name.trim()) return;

    try {
      await updateGovernorate(editingGov.id, {
        name: editingGov.name.trim(),
        nameEn: editingGov.nameEn.trim(),
      });
      toast.success('تم تحديث بيانات المحافظة');
      setEditingGov(null);
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث المحافظة');
    }
  };

  const handleToggleGov = async (govId: string, govName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await toggleGovernorateActive(govId);
      toast.success(`تم تغيير حالة المحافظة (${govName})`);
    } catch (err: any) {
      toast.error('فشل تغيير حالة المحافظة');
    }
  };

  const handleDeleteGov = async (govId: string, govName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`هل أنت متأكد من حذف محافظة (${govName}) وجميع المدن التابعة لها؟`)) {
      try {
        await deleteGovernorate(govId);
        toast.success('تم حذف المحافظة بنجاح');
      } catch (err: any) {
        toast.error(err.message || 'فشل حذف المحافظة');
      }
    }
  };

  const handleAddCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim() || !activeGov) return;

    setIsSubmitting(true);
    try {
      await addCity(activeGov.id, newCityName.trim(), newCityNameEn.trim() || newCityName.trim());
      addLog({
        adminName: currentAdmin?.name || 'Admin',
        adminRole: currentAdmin?.role || 'owner',
        action: 'إضافة مدينة جديدة',
        module: 'locations',
        target: `${activeGov.name} - ${newCityName}`,
      });
      setNewCityName('');
      setNewCityNameEn('');
      toast.success(`تمت إضافة (${newCityName}) بنجاح لمحافظة ${activeGov.name}`);
    } catch (err: any) {
      toast.error(err.message || 'فشل إضافة المدينة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateCity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCity || !editingCity.name.trim() || !activeGov) return;

    try {
      await updateCity(activeGov.id, editingCity.id, {
        name: editingCity.name.trim(),
        nameEn: editingCity.nameEn.trim(),
      });
      toast.success('تم تحديث بيانات المدينة');
      setEditingCity(null);
    } catch (err: any) {
      toast.error(err.message || 'فشل تحديث المدينة');
    }
  };

  const handleToggleCity = async (cityId: string, cityName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeGov) return;
    try {
      await toggleCityActive(activeGov.id, cityId);
      toast.success(`تم تغيير حالة المدينة (${cityName})`);
    } catch (err: any) {
      toast.error('فشل تغيير حالة المدينة');
    }
  };

  const handleDeleteCity = async (cityId: string, cityName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeGov) return;
    if (confirm(`هل أنت متأكد من حذف مدينة (${cityName}) من محافظة (${activeGov.name})؟`)) {
      try {
        await deleteCity(activeGov.id, cityId);
        toast.success('تم حذف المدينة بنجاح');
      } catch (err: any) {
        toast.error(err.message || 'فشل حذف المدينة');
      }
    }
  };

  return (
    <div className="space-y-6 text-start">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-[#07345C] dark:text-white flex items-center gap-2.5">
            <MapPin className="w-6 h-6 text-[#0866C6]" />
            <span>نطاق التغطية والمناطق الجغرافية</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            إدارة المحافظات والمدن والمراكز المتاحة للحجز والتحكم في تفعيل أو تعطيل أي منطقة فورياً
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchLocations(true)}
          className="px-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#072540] hover:bg-slate-100 dark:hover:bg-[#0A2E50] text-[#07345C] dark:text-slate-200 border border-slate-200/80 dark:border-[#133B61] flex items-center gap-1.5 font-bold transition-colors shadow-xs cursor-pointer"
        >
          {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0866C6]" /> : null}
          <span>تحديث من الخادم</span>
        </button>
      </div>

      {/* Two Columns Hierarchy: Governorates (Left/1) -> Cities (Right/Many) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Column 1: Governorates */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-sm sm:text-base font-black text-[#07345C] dark:text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#0866C6]" />
              <span>المحافظات المتاحة ({governorates.length})</span>
            </h3>
          </div>

          {/* Add Governorate Form */}
          <form onSubmit={handleAddGov} className="space-y-2.5 bg-slate-50 dark:bg-[#041728] p-3.5 rounded-2xl border border-slate-200/80 dark:border-[#133B61]">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={newGovName}
                onChange={(e) => setNewGovName(e.target.value)}
                placeholder="اسم المحافظة (مثال: القاهرة)"
                className="p-2.5 text-xs rounded-xl bg-white dark:bg-[#072540] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-bold focus:outline-hidden focus:border-[#0866C6] transition-colors"
              />
              <input
                type="text"
                value={newGovNameEn}
                onChange={(e) => setNewGovNameEn(e.target.value)}
                placeholder="بالإنجليزي (e.g. Cairo)"
                className="p-2.5 text-xs rounded-xl bg-white dark:bg-[#072540] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:outline-hidden focus:border-[#0866C6] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-60"
            >
              + إضافة محافظة جديدة
            </button>
          </form>

          {/* Governorates List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-0.5">
            {governorates.map((gov) => {
              const isSelected = activeGov?.id === gov.id;
              const isActive = gov.active !== false;

              return (
                <div
                  key={gov.id}
                  onClick={() => setSelectedGovId(gov.id)}
                  className={`p-3.5 rounded-2xl text-xs flex items-center justify-between cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-[#0866C6] bg-sky-50/90 dark:bg-[#0866C6]/20 text-[#07345C] dark:text-white font-black shadow-xs ring-1 ring-[#0866C6]/30'
                      : 'border-slate-200/80 dark:border-[#133B61] bg-white dark:bg-[#072540] hover:border-[#0866C6]/40 text-[#07345C] dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isActive ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-400'
                      }`}
                    />
                    <div>
                      <p className="font-black text-xs text-[#07345C] dark:text-white">{gov.name}</p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{gov.nameEn}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#041728] text-slate-700 dark:text-slate-300 font-bold border border-slate-200/60 dark:border-[#133B61]">
                      {(gov.cities || []).length} مدن
                    </span>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingGov({ id: gov.id, name: gov.name, nameEn: gov.nameEn || '' });
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0866C6] dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
                      title="تعديل اسم المحافظة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle Active Switch */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleGov(gov.id, gov.name, e)}
                      title={isActive ? 'تعطيل المحافظة' : 'تفعيل المحافظة'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      {isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>

                    {/* Delete button */}
                    {governorates.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleDeleteGov(gov.id, gov.name, e)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-[#F0444C] hover:bg-rose-50 dark:hover:bg-[#F0444C]/10 transition-colors"
                        title="حذف المحافظة"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Cities belonging to Selected Governorate */}
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-[#133B61] space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm sm:text-base font-black text-[#07345C] dark:text-white flex items-center gap-2">
                <Building className="w-4 h-4 text-[#0866C6]" />
                <span>
                  المدن والمناطق التابعة لـ ({activeGov?.name || 'المحافظة'}) ({activeGov?.cities?.length || 0})
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                تظهر للعميل في استمارة الحجز فقط عند اختيار {activeGov?.name}
              </p>
            </div>
          </div>

          {/* Add City Form */}
          <form onSubmit={handleAddCity} className="space-y-2.5 bg-slate-50 dark:bg-[#041728] p-3.5 rounded-2xl border border-slate-200/80 dark:border-[#133B61]">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-200">
                المحافظة التابع لها:
              </label>
              <select
                value={selectedGovId}
                onChange={(e) => setSelectedGovId(e.target.value)}
                className="w-full p-2.5 text-xs rounded-xl bg-white dark:bg-[#072540] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white font-bold focus:outline-hidden focus:border-[#0866C6] transition-colors"
              >
                {governorates.map((gov) => (
                  <option key={gov.id} value={gov.id}>
                    {gov.name} {gov.nameEn ? `(${gov.nameEn})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                required
                value={newCityName}
                onChange={(e) => setNewCityName(e.target.value)}
                placeholder="اسم المدينة أو المنطقة (مثال: مدينة نصر)"
                className="p-2.5 text-xs rounded-xl bg-white dark:bg-[#072540] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-bold focus:outline-hidden focus:border-[#0866C6] transition-colors"
              />
              <input
                type="text"
                value={newCityNameEn}
                onChange={(e) => setNewCityNameEn(e.target.value)}
                placeholder="بالإنجليزي (اختياري)"
                className="p-2.5 text-xs rounded-xl bg-white dark:bg-[#072540] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium focus:outline-hidden focus:border-[#0866C6] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !activeGov}
              className="w-full py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] text-xs font-black transition-all shadow-md cursor-pointer disabled:opacity-60"
            >
              + إضافة منطقة / مدينة تابعة لـ {activeGov?.name}
            </button>
          </form>

          {/* Cities List */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-0.5">
            {(activeGov?.cities || []).map((city) => {
              const isActive = city.active !== false;

              return (
                <div
                  key={city.id}
                  className="p-3.5 rounded-2xl text-xs flex items-center justify-between border border-slate-200/80 dark:border-[#133B61] bg-white dark:bg-[#072540] hover:border-[#0866C6]/40 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        isActive ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-400'
                      }`}
                    />
                    <div>
                      <p className="font-black text-xs text-[#07345C] dark:text-white">{city.name}</p>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{city.nameEn}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold border ${
                        isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/80'
                          : 'bg-slate-100 dark:bg-[#041728] text-slate-600 dark:text-slate-400 border-slate-200 dark:border-[#133B61]'
                      }`}
                    >
                      {isActive ? 'مفعلة للحجز' : 'معطلة'}
                    </span>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCity({ id: city.id, name: city.name, nameEn: city.nameEn || '' });
                      }}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0866C6] dark:hover:text-sky-400 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
                      title="تعديل اسم المدينة"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Toggle Active Switch */}
                    <button
                      type="button"
                      onClick={(e) => handleToggleCity(city.id, city.name, e)}
                      title={isActive ? 'تعطيل المدينة' : 'تفعيل المدينة'}
                      className={`p-1.5 rounded-lg transition-colors ${
                        isActive ? 'text-emerald-500 hover:text-emerald-600' : 'text-slate-400 hover:text-slate-500'
                      }`}
                    >
                      {isActive ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => handleDeleteCity(city.id, city.name, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#F0444C] hover:bg-rose-50 dark:hover:bg-[#F0444C]/10 transition-colors"
                      title="حذف المدينة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {(!activeGov?.cities || activeGov.cities.length === 0) && (
              <div className="p-8 text-center text-slate-400 text-xs">
                لا توجد مدن مسجلة حتى الآن لهذه المحافظة. أضف أول مدينة أعلاه.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Governorate Modal */}
      {editingGov && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#072540] rounded-3xl p-6 border border-slate-200/80 dark:border-[#133B61] shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#133B61]">
              <h3 className="text-sm font-black text-[#07345C] dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#0866C6]" />
                <span>تعديل اسم المحافظة</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingGov(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateGov} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">الاسم بالعربية:</label>
                <input
                  type="text"
                  required
                  value={editingGov.name}
                  onChange={(e) => setEditingGov({ ...editingGov, name: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white font-bold focus:outline-hidden focus:border-[#0866C6] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">الاسم بالإنجليزية:</label>
                <input
                  type="text"
                  value={editingGov.nameEn}
                  onChange={(e) => setEditingGov({ ...editingGov, nameEn: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white font-medium focus:outline-hidden focus:border-[#0866C6] transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#133B61]">
                <button
                  type="button"
                  onClick={() => setEditingGov(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md transition-all cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit City Modal */}
      {editingCity && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#072540] rounded-3xl p-6 border border-slate-200/80 dark:border-[#133B61] shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#133B61]">
              <h3 className="text-sm font-black text-[#07345C] dark:text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#0866C6]" />
                <span>تعديل اسم المدينة / المنطقة ({activeGov?.name})</span>
              </h3>
              <button
                type="button"
                onClick={() => setEditingCity(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateCity} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">الاسم بالعربية:</label>
                <input
                  type="text"
                  required
                  value={editingCity.name}
                  onChange={(e) => setEditingCity({ ...editingCity, name: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white font-bold focus:outline-hidden focus:border-[#0866C6] transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">الاسم بالإنجليزية:</label>
                <input
                  type="text"
                  value={editingCity.nameEn}
                  onChange={(e) => setEditingCity({ ...editingCity, nameEn: e.target.value })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] text-[#07345C] dark:text-white font-medium focus:outline-hidden focus:border-[#0866C6] transition-colors"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-[#133B61]">
                <button
                  type="button"
                  onClick={() => setEditingCity(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#0A2E50] transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] shadow-md transition-all cursor-pointer"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
