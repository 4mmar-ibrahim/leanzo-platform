'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Plus,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  MoveUp,
  MoveDown,
  ExternalLink,
  Save,
  Send,
  Loader2,
  Sparkles,
  Share2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Link2,
} from 'lucide-react';
import { useCMSStore } from '@/store/useCMSStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';
import {
  SocialBrandIcon,
  resolveSocialItems,
  PLATFORMS_META,
  PlatformMeta,
} from '@/components/common/SocialBrandIcon';
import { SocialLinkItem, SocialPlatformKey } from '@/types';
import { initialSocialLinks } from '@/data/cmsData';

export default function AdminSocialSettingsPage() {
  const social = useCMSStore((s) => s.social);
  const updateSocial = useCMSStore((s) => s.updateSocial);
  const fetchDraftContent = useCMSStore((s) => s.fetchDraftContent);
  const saveDraftToDatabase = useCMSStore((s) => s.saveDraftToDatabase);
  const publishToDatabase = useCMSStore((s) => s.publishToDatabase);
  const saveSettingsToDatabase = useSettingsStore((s) => s.saveSettingsToDatabase);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const [items, setItems] = useState<SocialLinkItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SocialLinkItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<SocialLinkItem | null>(null);

  // Form states for Add/Edit
  const [formPlatform, setFormPlatform] = useState<SocialPlatformKey>('whatsapp');
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formVisible, setFormVisible] = useState(true);

  useEffect(() => {
    fetchDraftContent();
  }, [fetchDraftContent]);

  useEffect(() => {
    if (social) {
      const resolved = resolveSocialItems(social);
      setItems(resolved);
    }
  }, [social]);

  // When changing platform in add modal, auto-suggest default name
  const handlePlatformChange = (key: SocialPlatformKey) => {
    setFormPlatform(key);
    const meta = PLATFORMS_META[key];
    if (meta && !formName) {
      setFormName(meta.nameAr);
    }
  };

  const openAddModal = () => {
    const defaultMeta = PLATFORMS_META['whatsapp'];
    setFormPlatform('whatsapp');
    setFormName(defaultMeta.nameAr);
    setFormUrl('');
    setFormVisible(true);
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: SocialLinkItem) => {
    setEditingItem(item);
    setFormPlatform(item.platform);
    setFormName(item.name);
    setFormUrl(item.url);
    setFormVisible(item.visible);
  };

  // Add Item Handler
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formUrl.trim()) {
      toast.error('يرجى كتابة اسم المنصة والرابط');
      return;
    }

    const newItem: SocialLinkItem = {
      id: `soc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      platform: formPlatform,
      name: formName.trim(),
      nameEn: PLATFORMS_META[formPlatform]?.nameEn || formName.trim(),
      url: formUrl.trim(),
      visible: formVisible,
      order: items.length + 1,
    };

    setItems((prev) => [...prev, newItem]);
    setHasChanges(true);
    setIsAddModalOpen(false);
    toast.success(`تمت إضافة ${newItem.name} للقائمة بنجاح!`);
  };

  // Update Item Handler
  const handleUpdateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    if (!formName.trim() || !formUrl.trim()) {
      toast.error('يرجى كتابة اسم المنصة والرابط');
      return;
    }

    setItems((prev) =>
      prev.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              platform: formPlatform,
              name: formName.trim(),
              nameEn: PLATFORMS_META[formPlatform]?.nameEn || formName.trim(),
              url: formUrl.trim(),
              visible: formVisible,
            }
          : item
      )
    );
    setHasChanges(true);
    setEditingItem(null);
    toast.success('تم تحديث بيانات وسيلة التواصل');
  };

  // Delete Item Handler
  const handleDeleteItem = () => {
    if (!deletingItem) return;
    setItems((prev) =>
      prev
        .filter((item) => item.id !== deletingItem.id)
        .map((item, idx) => ({ ...item, order: idx + 1 }))
    );
    setHasChanges(true);
    setDeletingItem(null);
    toast.success(`تم حذف ${deletingItem.name} من القائمة`);
  };

  // Toggle Visibility Handler
  const handleToggleVisibility = (id: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextVisible = !item.visible;
          toast.info(nextVisible ? `تم إظهار ${item.name} في الموقع` : `تم إخفاء ${item.name} من الموقع`);
          return { ...item, visible: nextVisible };
        }
        return item;
      })
    );
    setHasChanges(true);
  };

  // Move item Up/Down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    const updated = [...items];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Re-assign order numbers
    const reordered = updated.map((item, idx) => ({ ...item, order: idx + 1 }));
    setItems(reordered);
    setHasChanges(true);
  };

  // Reset to default presets
  const handleResetDefaults = () => {
    if (window.confirm('هل تريد استعادة وسائل التواصل الافتراضية لكلينزو؟')) {
      const defaults = resolveSocialItems(initialSocialLinks);
      setItems(defaults);
      setHasChanges(true);
      toast.info('تمت استعادة الروابط الافتراضية، يرجى الضغط على نشر للتأكيد');
    }
  };

  // Save and Publish
  const handleSaveAndPublish = async () => {
    setSaving(true);

    // Build legacy fields for backwards compatibility
    const legacyMap: Record<string, string> = {};
    items.forEach((item) => {
      if (['facebook', 'instagram', 'tiktok', 'youtube', 'whatsapp', 'twitter', 'linkedin'].includes(item.platform)) {
        if (!legacyMap[item.platform]) {
          legacyMap[item.platform] = item.url;
        }
      }
    });

    const socialPayload = {
      ...legacyMap,
      items,
    };

    updateSocial(socialPayload);
    await saveDraftToDatabase();
    await publishToDatabase();
    await saveSettingsToDatabase({ social: socialPayload as any });

    setSaving(false);
    setHasChanges(false);

    addLog({
      adminName: currentAdmin?.name || 'Admin',
      adminRole: currentAdmin?.role || 'owner',
      action: 'تحديث ونشر قائمة منصات وسائل التواصل الاجتماعي وشعاراتها',
      module: 'settings',
      target: 'وسائل التواصل',
    });

    toast.success('تم حفظ ونشر جميع وسائل التواصل الاجتماعي بنجاح في الموقع وقاعدة البيانات!');
  };

  const activeCount = items.filter((i) => i.visible !== false).length;
  const hiddenCount = items.filter((i) => i.visible === false).length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/settings"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-sky-500 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة الإعدادات</span>
          </Link>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Share2 className="w-6 h-6 text-sky-500" />
            <span>منصات وسائل التواصل الاجتماعي (Social Media)</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            إدارة روابط وحسابات كلينزو المعروضة في ترويسة وتذييل الموقع وصفحة التواصل بالشعارات الرسمية لكل منصة.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={openAddModal}
            className="px-4 py-2.5 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] text-xs font-bold shadow-md flex items-center gap-2 transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة منصة جديدة</span>
          </button>

          <button
            type="button"
            onClick={handleSaveAndPublish}
            disabled={saving}
            className={`px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-all shadow-md ${
              hasChanges
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            } disabled:opacity-50`}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{hasChanges ? 'نشر التعديلات للعملاء *' : 'حفظ ونشر'}</span>
          </button>
        </div>
      </div>

      {/* Helpful banner to Footer Links */}
      <div className="p-4 rounded-2xl bg-[#0866C6]/10 border border-[#0866C6]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 text-[#0866C6] dark:text-sky-400">
          <Link2 className="w-5 h-5 shrink-0" />
          <span>
            <strong>هل تبحث عن إدارة أو حذف روابط أسفل الموقع (الفوتر)؟</strong> يمكنك التحكم في الروابط السريعة وفئات الخدمات المعروضة في الفوتر من صفحة الروابط المخصصة.
          </span>
        </div>
        <Link
          href="/admin/settings/footer-links"
          className="px-3.5 py-1.5 rounded-xl bg-[#0866C6] text-white font-bold text-xs hover:bg-[#07529E] transition-colors shrink-0 text-center"
        >
          الانتقال لروابط الفوتر
        </Link>
      </div>

      {/* Quick Stats & Live Preview Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-slate-400">إجمالي المنصات المتاحة</p>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{items.length}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 flex items-center justify-center">
            <Share2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-emerald-600">المنصات المعروضة في الموقع</p>
            <p className="text-2xl font-black text-emerald-600">{activeCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div className="space-y-0.5">
            <p className="text-[11px] font-bold text-slate-400">المنصات المخفية مؤقتاً</p>
            <p className="text-2xl font-black text-slate-500">{hiddenCount}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
            <EyeOff className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Live Preview Card */}
      <div className="p-5 rounded-3xl bg-gradient-to-br from-[#041728] to-[#082845] text-white border border-[#133B61] shadow-lg space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#3894ec]" />
            <span className="text-xs font-bold text-[#83AED0]">
              معاينة حية لشكل أيقونات التواصل في الموقع (Live Website Bar Preview)
            </span>
          </div>
          <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#0866C6]/20 text-[#83AED0] border border-[#0866C6]/30">
            تحديث مباشر
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          {items
            .filter((item) => item.visible !== false && Boolean(item.url?.trim()))
            .map((item) => (
              <div
                key={item.id}
                className="group relative flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 transition-all duration-200 hover:scale-105 cursor-pointer shadow-xs"
                title={item.name}
              >
                <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center shrink-0">
                  <SocialBrandIcon platform={item.platform} size="xs" colored={true} />
                </div>
                <span className="text-xs font-semibold text-slate-200">{item.name}</span>
              </div>
            ))}
          {activeCount === 0 && (
            <p className="text-xs text-slate-400 italic">لا توجد وسائل تواصل ظاهرة حالياً</p>
          )}
        </div>
      </div>

      {/* Main List Table / Cards */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              قائمة منصات وسائل التواصل
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              يمكنك إعادة الترتيب، أو إخفاء المنصة مؤقتاً، أو تعديل الرابط، أو حذفها نهائياً.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="text-xs font-semibold text-slate-400 hover:text-rose-500 flex items-center gap-1.5 transition-colors"
            title="استعادة الروابط الافتراضية"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">استعادة الافتراضي</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Share2 className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
              لا توجد منصات تواصل مضافة حتى الآن
            </p>
            <button
              type="button"
              onClick={openAddModal}
              className="px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold"
            >
              إضافة أول وسيلة تواصل
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.map((item, index) => {
              const meta = PLATFORMS_META[item.platform] || PLATFORMS_META['custom'];

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                    item.visible ? 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40' : 'bg-slate-50/40 dark:bg-slate-950/40 opacity-70'
                  }`}
                >
                  {/* Left info: Icon + Name + Link */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Order Controls */}
                    <div className="flex flex-col gap-1 text-slate-400 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'up')}
                        disabled={index === 0}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-sky-500 disabled:opacity-20 transition-colors"
                        title="تحريك لأعلى"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMove(index, 'down')}
                        disabled={index === items.length - 1}
                        className="p-1 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 hover:text-sky-500 disabled:opacity-20 transition-colors"
                        title="تحريك لأسفل"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Official Brand Badge */}
                    <div className="w-11 h-11 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                      <SocialBrandIcon platform={item.platform} size="md" colored={true} />
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                          {item.name}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {meta.nameAr}
                        </span>
                        {item.visible ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200/60 dark:border-emerald-800">
                            ظاهر في الموقع
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-slate-200 dark:bg-slate-800 text-slate-500">
                            مخفي
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400 font-mono truncate">
                        <span className="truncate">{item.url}</span>
                        {Boolean(item.url) && (
                          <a
                            href={
                              item.platform === 'whatsapp' && !item.url.startsWith('http')
                                ? `https://wa.me/${item.url.replace(/\D/g, '')}`
                                : item.url
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-500 hover:text-sky-600 shrink-0 p-0.5"
                            title="فحص الرابط"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Toggle Visibility */}
                    <button
                      type="button"
                      onClick={() => handleToggleVisibility(item.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                        item.visible
                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}
                      title={item.visible ? 'إخفاء المنصة من الموقع' : 'إظهار المنصة في الموقع'}
                    >
                      {item.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      <span>{item.visible ? 'إخفاء' : 'إظهار'}</span>
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
                      title="تعديل"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => setDeletingItem(item)}
                      className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 transition-colors"
                      title="حذف نهائي"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      {(isAddModalOpen || editingItem) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                {isAddModalOpen ? (
                  <>
                    <Plus className="w-4 h-4 text-sky-500" />
                    <span>إضافة وسيلة تواصل اجتماعي جديدة</span>
                  </>
                ) : (
                  <>
                    <Edit2 className="w-4 h-4 text-sky-500" />
                    <span>تعديل وسيلة التواصل</span>
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={isAddModalOpen ? handleAddItem : handleUpdateItem} className="p-5 space-y-4 text-xs">
              {/* Platform Selector with Icons */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  اختر المنصة أو الموقع
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {(Object.keys(PLATFORMS_META) as SocialPlatformKey[]).map((key) => {
                    const pMeta = PLATFORMS_META[key];
                    const isSelected = formPlatform === key;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handlePlatformChange(key)}
                        className={`p-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all ${
                          isSelected
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 ring-2 ring-sky-500/20'
                            : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <SocialBrandIcon platform={key} size="sm" colored={true} />
                        <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 truncate w-full text-center">
                          {pMeta.nameAr}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Platform Name */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  اسم المنصة أو التسمية (يظهر للمستخدم)
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="مثال: واتساب كلينزو الرسمي، صفحة فيسبوك"
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-semibold text-slate-900 dark:text-white"
                />
              </div>

              {/* Platform URL */}
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  رابط المنصة / رقم الهاتف
                </label>
                <input
                  type="text"
                  required
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  placeholder={PLATFORMS_META[formPlatform]?.placeholder || 'https://...'}
                  className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono text-slate-900 dark:text-white"
                />
              </div>

              {/* Visible Switch */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                <div className="space-y-0.5">
                  <p className="font-bold text-slate-900 dark:text-white">إظهار المنصة في الموقع</p>
                  <p className="text-[11px] text-slate-400">
                    عند التفعيل تظهر الأيقونة فوراً في التذييل وصفحات الموقع.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formVisible}
                  onChange={(e) => setFormVisible(e.target.checked)}
                  className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] font-bold shadow-md transition-all"
                >
                  {isAddModalOpen ? 'إضافة المنصة' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 w-full max-w-sm p-6 shadow-2xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white">
                تأكيد حذف منصة التواصل
              </h3>
              <p className="text-xs text-slate-500">
                هل أنت متأكد من حذف <span className="font-bold text-slate-900 dark:text-white">{deletingItem.name}</span>؟ يمكنك إخفاؤها فقط إذا كنت ترغب في عدم عرضها مؤقتاً.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-600/25"
              >
                نعم، احذفها
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
