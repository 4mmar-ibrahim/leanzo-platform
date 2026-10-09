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
  Loader2,
  Sparkles,
  Link2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Layers,
  FolderSync,
} from 'lucide-react';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { useAdminStore } from '@/store/useAdminStore';
import { toast } from 'sonner';
import { FooterLinkItem } from '@/types';
import { DEFAULT_FOOTER_QUICK_LINKS, DEFAULT_FOOTER_CATEGORY_LINKS } from '@/data/settingsData';

export default function AdminFooterLinksPage() {
  const branding = useSettingsStore((s) => s.settings.branding);
  const updateBranding = useSettingsStore((s) => s.updateBranding);
  const fetchAdminSettings = useSettingsStore((s) => s.fetchAdminSettings);
  const saveSettingsToDatabase = useSettingsStore((s) => s.saveSettingsToDatabase);

  const categories = useServiceStore((s) => s.categories);
  const fetchCategories = useServiceStore((s) => s.fetchCategories);

  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const addLog = useActivityLogStore((s) => s.addLog);

  const [activeTab, setActiveTab] = useState<'quick' | 'categories'>('quick');

  const [quickLinks, setQuickLinks] = useState<FooterLinkItem[]>([]);
  const [categoryLinks, setCategoryLinks] = useState<FooterLinkItem[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [targetSection, setTargetSection] = useState<'quick' | 'categories'>('quick');
  const [editingItem, setEditingItem] = useState<FooterLinkItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<{ item: FooterLinkItem; section: 'quick' | 'categories' } | null>(null);

  // Form states for Add/Edit
  const [formLabel, setFormLabel] = useState('');
  const [formLabelEn, setFormLabelEn] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formVisible, setFormVisible] = useState(true);

  // Quick URL suggestions
  const SUGGESTED_URLS = [
    { label: 'الرئيسية (/)', url: '/' },
    { label: 'صفحة الخدمات (/services)', url: '/services' },
    { label: 'خدمات السيارات (/services/car)', url: '/services/car' },
    { label: 'خدمات المنازل (/services/home)', url: '/services/home' },
    { label: 'حجز موعد (/booking)', url: '/booking' },
    { label: 'العروض الترويجية (/offers)', url: '/offers' },
    { label: 'معرض الأعمال (/gallery)', url: '/gallery' },
    { label: 'آراء العملاء (/reviews)', url: '/reviews' },
    { label: 'عن الشركة (/about)', url: '/about' },
    { label: 'الأسئلة الشائعة (/faq)', url: '/faq' },
    { label: 'اتصل بنا (/contact)', url: '/contact' },
  ];

  useEffect(() => {
    fetchAdminSettings();
    fetchCategories();
  }, [fetchAdminSettings, fetchCategories]);

  // Sync state with branding when loaded
  useEffect(() => {
    if (branding) {
      const qLinks = branding.footerQuickLinks && branding.footerQuickLinks.length > 0
        ? branding.footerQuickLinks
        : DEFAULT_FOOTER_QUICK_LINKS;
      
      const cLinks = branding.footerCategoryLinks && branding.footerCategoryLinks.length > 0
        ? branding.footerCategoryLinks
        : DEFAULT_FOOTER_CATEGORY_LINKS;

      setQuickLinks(qLinks);
      setCategoryLinks(cLinks);
    }
  }, [branding]);

  // Open modal to add link
  const handleOpenAdd = (section: 'quick' | 'categories') => {
    setModalMode('add');
    setTargetSection(section);
    setEditingItem(null);
    setFormLabel('');
    setFormLabelEn('');
    setFormUrl(section === 'quick' ? '/' : '/services/car');
    setFormVisible(true);
    setIsModalOpen(true);
  };

  // Open modal to edit link
  const handleOpenEdit = (item: FooterLinkItem, section: 'quick' | 'categories') => {
    setModalMode('edit');
    setTargetSection(section);
    setEditingItem(item);
    setFormLabel(item.label || '');
    setFormLabelEn(item.labelEn || '');
    setFormUrl(item.url || '');
    setFormVisible(item.visible !== false);
    setIsModalOpen(true);
  };

  // Save Modal Form (Add or Edit)
  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLabel.trim() || !formUrl.trim()) {
      toast.error('يرجى ملء الاسم العربي والرابط على الأقل');
      return;
    }

    if (modalMode === 'add') {
      const newItem: FooterLinkItem = {
        id: `fl-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        label: formLabel.trim(),
        labelEn: formLabelEn.trim() || formLabel.trim(),
        url: formUrl.trim(),
        visible: formVisible,
        order: targetSection === 'quick' ? quickLinks.length + 1 : categoryLinks.length + 1,
      };

      if (targetSection === 'quick') {
        setQuickLinks((prev) => [...prev, newItem]);
      } else {
        setCategoryLinks((prev) => [...prev, newItem]);
      }
      toast.success('تمت إضافة الرابط بنجاح للقائمة');
    } else if (editingItem) {
      const updated: FooterLinkItem = {
        ...editingItem,
        label: formLabel.trim(),
        labelEn: formLabelEn.trim() || formLabel.trim(),
        url: formUrl.trim(),
        visible: formVisible,
      };

      if (targetSection === 'quick') {
        setQuickLinks((prev) => prev.map((item) => (item.id === editingItem.id ? updated : item)));
      } else {
        setCategoryLinks((prev) => prev.map((item) => (item.id === editingItem.id ? updated : item)));
      }
      toast.success('تم تعديل الرابط بنجاح');
    }

    setHasChanges(true);
    setIsModalOpen(false);
  };

  // Confirm delete link
  const handleDeleteConfirm = () => {
    if (!deletingItem) return;
    const { item, section } = deletingItem;

    if (section === 'quick') {
      setQuickLinks((prev) => prev.filter((i) => i.id !== item.id));
    } else {
      setCategoryLinks((prev) => prev.filter((i) => i.id !== item.id));
    }

    setHasChanges(true);
    setDeletingItem(null);
    toast.success(`تم حذف رابط "${item.label}" من القائمة.`);
  };

  // Toggle visibility
  const handleToggleVisibility = (id: string, section: 'quick' | 'categories') => {
    if (section === 'quick') {
      setQuickLinks((prev) =>
        prev.map((i) => (i.id === id ? { ...i, visible: i.visible === false ? true : false } : i))
      );
    } else {
      setCategoryLinks((prev) =>
        prev.map((i) => (i.id === id ? { ...i, visible: i.visible === false ? true : false } : i))
      );
    }
    setHasChanges(true);
  };

  // Move link up/down
  const handleMove = (index: number, direction: 'up' | 'down', section: 'quick' | 'categories') => {
    const list = section === 'quick' ? [...quickLinks] : [...categoryLinks];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    const reordered = list.map((item, idx) => ({ ...item, order: idx + 1 }));
    if (section === 'quick') {
      setQuickLinks(reordered);
    } else {
      setCategoryLinks(reordered);
    }
    setHasChanges(true);
  };

  // Sync / Import Categories from Service Store
  const handleImportCategories = () => {
    if (!categories || categories.length === 0) {
      toast.info('لم يتم العثور على فئات مخصصة إضافية في النظام');
      return;
    }

    const imported: FooterLinkItem[] = categories.map((cat, idx) => ({
      id: `cat-${cat.id || idx}`,
      label: cat.name || cat.slug || 'فئة خدمة',
      labelEn: cat.nameEn || cat.name || '',
      url: `/services/${cat.slug || cat.id}`,
      visible: cat.active !== false,
      order: idx + 1,
    }));

    setCategoryLinks(imported);
    setHasChanges(true);
    toast.success(`تم استيراد ${imported.length} من فئات الخدمات بنجاح!`);
  };

  // Reset to Defaults
  const handleResetDefaults = () => {
    if (!window.confirm('هل تريد استعادة جميع الروابط الافتراضية للفوتر (الروابط السريعة وفئات الخدمات الأصلية)؟')) {
      return;
    }
    setQuickLinks([...DEFAULT_FOOTER_QUICK_LINKS]);
    setCategoryLinks([...DEFAULT_FOOTER_CATEGORY_LINKS]);
    setHasChanges(true);
    toast.info('تمت استعادة الروابط الافتراضية. اضغط "حفظ ونشر التعديلات" لتطبيقها في الموقع.');
  };

  // Save changes to database
  const handleSaveChanges = async () => {
    setSaving(true);
    try {
      updateBranding({
        footerQuickLinks: quickLinks,
        footerCategoryLinks: categoryLinks,
      });

      const ok = await saveSettingsToDatabase({
        branding: {
          ...(branding || {}),
          footerQuickLinks: quickLinks,
          footerCategoryLinks: categoryLinks,
        } as any,
      });

      if (ok) {
        addLog({
          adminName: currentAdmin?.name || 'Admin',
          adminRole: currentAdmin?.role || 'owner',
          action: 'تعديل روابط أسفل الموقع (الفوتر)',
          module: 'settings',
          target: 'روابط الفوتر السريعة وفئات الخدمات',
          details: `تم تحديث ${quickLinks.length} رابط سريع و ${categoryLinks.length} فئة خدمات`,
        });
        setHasChanges(false);
        toast.success('تم حفظ ونشر روابط الفوتر بنجاح! تم تحديث أسفل الموقع فوراً للزوار.');
      } else {
        toast.error('حدث خطأ أثناء حفظ الروابط في الخادم');
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ الروابط');
    } finally {
      setSaving(false);
    }
  };

  const currentList = activeTab === 'quick' ? quickLinks : categoryLinks;
  const visibleCount = currentList.filter((i) => i.visible !== false).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/admin/settings"
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="العودة للإعدادات"
            >
              <ArrowRight className="w-5 h-5 rtl:rotate-0 ltr:rotate-180" />
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Link2 className="w-6 h-6 text-[#0866C6]" />
              <span>إدارة روابط أسفل الموقع والفوتر (Footer Links)</span>
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            التحكم الكامل في الروابط السريعة وفئات الخدمات المعروضة أسفل الموقع — يمكنك حذف أي رابط تريده، تعديله، أو إضافة روابط جديدة، وستظهر فوراً في الفوتر.
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60 transition-colors flex items-center gap-2 shadow-xs"
          >
            <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
            <span>استعادة الافتراضي</span>
          </button>

          <button
            type="button"
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#07529E] text-white text-xs font-bold transition-all shadow-md shadow-[#0866C6]/20 flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري الحفظ والنشر...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>حفظ ونشر التعديلات {hasChanges && '•'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unsaved changes banner */}
      {hasChanges && (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
            <span>
              <strong>لديك تعديلات غير محفوظة:</strong> قمت بإجراء تغييرات على الروابط. تأكد من الضغط على زر &quot;حفظ ونشر التعديلات&quot; لتحديث أسفل الموقع للعملاء.
            </span>
          </div>
          <button
            onClick={handleSaveChanges}
            disabled={saving}
            className="px-3 py-1 rounded-lg bg-amber-500 text-white font-bold text-xs hover:bg-amber-600 transition-colors shrink-0"
          >
            حفظ الآن
          </button>
        </div>
      )}

      {/* Main Grid: Control Panel + Live Footer Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Management Tabs & Links List (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Section Selection Tabs */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 flex items-center gap-1 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'quick'
                  ? 'bg-[#0866C6] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>الروابط السريعة (Quick Links)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'quick' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                {quickLinks.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('categories')}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'categories'
                  ? 'bg-[#0866C6] text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>فئات الخدمات (Service Categories)</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${activeTab === 'categories' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'}`}>
                {categoryLinks.length}
              </span>
            </button>
          </div>

          {/* Section Card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {activeTab === 'quick' ? (
                    <>
                      <Link2 className="w-5 h-5 text-sky-500" />
                      <span>قائمة الروابط السريعة المعروضة في الفوتر</span>
                    </>
                  ) : (
                    <>
                      <Layers className="w-5 h-5 text-indigo-500" />
                      <span>قائمة روابط فئات الخدمات المعروضة في الفوتر</span>
                    </>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {activeTab === 'quick'
                    ? 'هذه الروابط تظهر في عمود "روابط سريعة" أسفل كل صفحات الموقع. احذف ما لا تريده أو عدل أي رابط.'
                    : 'هذه الروابط تظهر في عمود "فئات الخدمات" أسفل صفحات الموقع لتوجيه العملاء لأقسام الخدمات.'}
                  {' '}(الظاهر حالياً: <span className="font-bold text-emerald-500">{visibleCount}</span> من أصل {currentList.length})
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {activeTab === 'categories' && (
                  <button
                    type="button"
                    onClick={handleImportCategories}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 text-xs font-bold hover:bg-indigo-100 transition-colors flex items-center gap-1.5"
                    title="استيراد التصنيفات المضافة في قسم الخدمات"
                  >
                    <FolderSync className="w-3.5 h-3.5" />
                    <span>مزامنة فئات الخدمات</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenAdd(activeTab)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0866C6] hover:bg-[#07529E] text-white text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة رابط جديد</span>
                </button>
              </div>
            </div>

            {/* Links List */}
            {currentList.length === 0 ? (
              <div className="py-12 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Link2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  لا توجد أي روابط في هذا القسم حالياً!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  لقد قمت بحذف جميع الروابط. لن يظهر هذا العمود في أسفل الموقع للعملاء حتى تضيف روابط جديدة أو تستعيد الروابط الافتراضية.
                </p>
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleOpenAdd(activeTab)}
                    className="px-4 py-2 rounded-xl bg-[#0866C6] text-white text-xs font-bold hover:bg-[#07529E] transition-colors"
                  >
                    إضافة رابط جديد
                  </button>
                  <button
                    type="button"
                    onClick={handleResetDefaults}
                    className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                  >
                    استعادة الافتراضي
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                {currentList.map((item, index) => {
                  const isVisible = item.visible !== false;
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 sm:p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isVisible
                          ? 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-700'
                          : 'bg-slate-100/40 dark:bg-slate-900/40 border-dashed border-slate-200 dark:border-slate-800 opacity-60'
                      }`}
                    >
                      {/* Left info: Reorder controls + Title & URL */}
                      <div className="flex items-center gap-3 min-w-0">
                        {/* Order buttons */}
                        <div className="flex flex-col gap-0.5 shrink-0">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMove(index, 'up', activeTab)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 hover:bg-slate-200 dark:hover:bg-slate-700"
                            title="تحريك لأعلى"
                          >
                            <MoveUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === currentList.length - 1}
                            onClick={() => handleMove(index, 'down', activeTab)}
                            className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-20 hover:bg-slate-200 dark:hover:bg-slate-700"
                            title="تحريك لأسفل"
                          >
                            <MoveDown className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Link Details */}
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white">
                              {item.label}
                            </span>
                            {item.labelEn && (
                              <span className="text-[11px] font-sans px-2 py-0.5 rounded-md bg-slate-200/60 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                {item.labelEn}
                              </span>
                            )}
                            {!isVisible && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                مخفي من الموقع
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 font-mono">
                            <ExternalLink className="w-3 h-3 shrink-0 text-slate-400" />
                            <span className="truncate">{item.url}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right Actions: Visibility toggle + Edit + Delete */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                        {/* Visibility Toggle Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleVisibility(item.id, activeTab)}
                          className={`p-2 rounded-xl text-xs font-bold transition-colors ${
                            isVisible
                              ? 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'
                          }`}
                          title={isVisible ? 'إخفاء من الفوتر' : 'إظهار في الفوتر'}
                        >
                          {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                        </button>

                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item, activeTab)}
                          className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                          title="تعديل الرابط"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {/* Delete Button (The key request!) */}
                        <button
                          type="button"
                          onClick={() => setDeletingItem({ item, section: activeTab })}
                          className="p-2 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          title="حذف هذا الرابط نهائياً"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Website Footer Preview (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>معاينة حية لشكل الفوتر في الموقع</span>
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                مباشر
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              هذا هو المظهر الدقيق لكيفية ظهور هذه الروابط للزوار في أسفل الموقع الآن. أي رابط تحذفه أو تخفيه سيختفي فوراً من هذه المعاينة ومن الموقع.
            </p>

            {/* Simulated Live Website Footer Section */}
            <div className="rounded-2xl bg-[#04213B] p-5 border border-[#072C4F] text-slate-300 space-y-6 shadow-inner">
              {/* Top info badge */}
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800/80 text-[11px] text-sky-400">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>فوتر الموقع الرسمي CLEANZO</span>
              </div>

              {/* Quick Links Column Preview */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    روابط سريعة
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({quickLinks.filter((l) => l.visible !== false).length})
                  </span>
                </div>

                {quickLinks.filter((l) => l.visible !== false).length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-1">
                    (تم حذف أو إخفاء كافة الروابط السريعة)
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 gap-x-2 gap-y-1.5 text-xs text-slate-300">
                    {quickLinks
                      .filter((l) => l.visible !== false)
                      .map((link) => (
                        <li key={link.id} className="truncate hover:text-sky-400 cursor-pointer transition-colors flex items-center gap-1">
                          <span className="text-sky-500 text-[10px]">•</span>
                          <span className="truncate">{link.label}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Service Categories Column Preview */}
              <div className="space-y-2.5 pt-3 border-t border-slate-800/80">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    فئات الخدمات
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({categoryLinks.filter((l) => l.visible !== false).length})
                  </span>
                </div>

                {categoryLinks.filter((l) => l.visible !== false).length === 0 ? (
                  <p className="text-[11px] text-slate-500 italic py-1">
                    (تم حذف أو إخفاء كافة روابط فئات الخدمات)
                  </p>
                ) : (
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {categoryLinks
                      .filter((l) => l.visible !== false)
                      .map((link) => (
                        <li key={link.id} className="truncate hover:text-sky-400 cursor-pointer transition-colors flex items-center gap-1">
                          <span className="text-emerald-500 text-[10px]">•</span>
                          <span className="truncate">{link.label}</span>
                        </li>
                      ))}
                  </ul>
                )}
              </div>

              {/* Bottom Copyright Preview */}
              <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 flex items-center justify-between">
                <span>© {new Date().getFullYear()} {branding?.logoText || 'CLEANZO'}</span>
                <span>جميع الحقوق محفوظة</span>
              </div>
            </div>

            {/* Quick Actions in Side Panel */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={saving}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0866C6] hover:bg-[#07529E] text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري الحفظ والنشر...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>تطبيق وحفظ التعديلات في الموقع</span>
                  </>
                )}
              </button>

              <Link
                href="/"
                target="_blank"
                className="w-full py-2 px-4 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 text-center"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>زيارة الموقع لمعاينة الفوتر</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-[#0866C6]/10 text-[#0866C6] flex items-center justify-center">
                  {modalMode === 'add' ? <Plus className="w-5 h-5" /> : <Edit2 className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {modalMode === 'add'
                      ? targetSection === 'quick'
                        ? 'إضافة رابط سريع جديد'
                        : 'إضافة فئة خدمات جديدة'
                      : 'تعديل بيانات الرابط'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    سيظهر هذا الرابط في أسفل الموقع بمجرد الحفظ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="space-y-4">
              {/* Arabic Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  نص الرابط (بالعربية) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: الرئيسية، العروض، خدمات السيارات..."
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6] outline-hidden"
                />
              </div>

              {/* English Label */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  نص الرابط (بالإنجليزية - اختياري)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Home, Offers, Car Services..."
                  value={formLabelEn}
                  onChange={(e) => setFormLabelEn(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6] outline-hidden font-sans"
                />
              </div>

              {/* URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  مسار الرابط (URL) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: /services أو /offers أو https://..."
                  value={formUrl}
                  onChange={(e) => setFormUrl(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm font-mono text-slate-900 dark:text-white focus:ring-2 focus:ring-[#0866C6] outline-hidden"
                />

                {/* Suggestions pill */}
                <div className="pt-1">
                  <span className="text-[11px] text-slate-400 block mb-1">اقتراحات سريعة للصفحات:</span>
                  <div className="flex items-center gap-1.5 flex-wrap max-h-24 overflow-y-auto">
                    {SUGGESTED_URLS.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setFormUrl(sug.url);
                          if (!formLabel) setFormLabel(sug.label.split(' ')[0]);
                        }}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/50 text-[10px] font-mono text-slate-600 dark:text-slate-400 transition-colors border border-slate-200 dark:border-slate-700"
                      >
                        {sug.url}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Visibility toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  إظهار الرابط في الموقع
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formVisible}
                    onChange={(e) => setFormVisible(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#0866C6] hover:bg-[#07529E] text-white text-xs font-bold transition-colors shadow-xs"
                >
                  {modalMode === 'add' ? 'إضافة الرابط' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                تأكيد حذف الرابط نهائياً
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                هل أنت متأكد من رغبتك في حذف الرابط:
                <br />
                <strong className="text-slate-800 dark:text-slate-200 text-sm">
                  &quot;{deletingItem.item.label}&quot; ({deletingItem.item.url})
                </strong>
                <br />
                سيتم حذفه تماماً ولن يظهر بعد ذلك في أسفل الموقع.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition-colors"
              >
                تراجع وإلغاء
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                تأكيد الحذف الآن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
