'use client';

import React, { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Search,
  Check,
  Save,
  Send,
  RotateCcw,
  Copy,
  Sliders,
  MessageSquare,
  Zap,
  Eye,
  EyeOff,
  Layers,
  Smartphone,
  Tablet as TabletIcon,
  Monitor,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Palette,
  Compass,
  ArrowRight,
  Move,
  RefreshCw,
  Clock,
  Settings,
  Upload,
  Image as ImageIcon,
  HardDrive,
} from 'lucide-react';
import { toast } from 'sonner';
import { useZoStudioStore } from '@/store/useZoStudioStore';
import { ZoCanvas } from '@/components/mascot/3d/ZoCanvas';
import { LiveZoCharacter } from '@/components/mascot/LiveZoCharacter';
import { processAndEnhanceCharacterImage, getOriginalImageDetails } from '@/lib/zo/zoImageProcessor';
import { getCachedZoImage } from '@/lib/zo/zoImageStorage';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal';
import { MediaItem } from '@/types';
import { CleanzoImage } from '@/components/common/CleanzoImage';

import { ZoSpeechBubble } from '@/components/mascot/ZoSpeechBubble';
import {
  ZoPageConfig,
  ZoExpression3D,
  ZoPose3D,
  ZoAnimationType,
  ZoDeviceBreakpoint,
  ZoTriggerRule,
  ZoTriggerEventType,
} from '@/types/zoStudioTypes';
import { DEFAULT_ZO_PAGE_CONFIGS } from '@/data/defaultZoConfigs';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

const ALL_EXPRESSIONS: { id: ZoExpression3D; nameAr: string; nameEn: string; icon: string }[] = [
  { id: 'happy', nameAr: 'سعيد وبشوش', nameEn: 'Happy', icon: '😊' },
  { id: 'confident', nameAr: 'واثق ومحترف', nameEn: 'Confident', icon: '😎' },
  { id: 'excited', nameAr: 'متحمس جداً', nameEn: 'Excited', icon: '🤩' },
  { id: 'curious', nameAr: 'فضولي ومستكشف', nameEn: 'Curious', icon: '🧐' },
  { id: 'thinking', nameAr: 'تفكير واستشارة', nameEn: 'Thinking', icon: '🤔' },
  { id: 'wink', nameAr: 'غمزة ودية', nameEn: 'Wink', icon: '😉' },
  { id: 'surprised', nameAr: 'متفاجئ ومبتهج', nameEn: 'Surprised', icon: '😮' },
  { id: 'chill', nameAr: 'هادئ ومسترخي', nameEn: 'Chill', icon: '😌' },
  { id: 'concerned', nameAr: 'مهتم ومنتبه', nameEn: 'Concerned', icon: '🥺' },
  { id: 'helpful', nameAr: 'مساعد وودود', nameEn: 'Helpful', icon: '🤝' },
  { id: 'celebrating', nameAr: 'احتفال وإنجاز', nameEn: 'Celebrating', icon: '🎉' },
  { id: 'neutral', nameAr: 'طبيعي ومحايد', nameEn: 'Neutral', icon: '🙂' },
];

const ALL_POSES: { id: ZoPose3D; nameAr: string; nameEn: string; icon: string }[] = [
  { id: 'idle', nameAr: 'وقفة طبيعية هادئة', nameEn: 'Idle', icon: '🧍' },
  { id: 'waving', nameAr: 'يلوح باليد للترحيب', nameEn: 'Waving', icon: '👋' },
  { id: 'pointing', nameAr: 'إشارة وتوجيه للخدمة', nameEn: 'Pointing', icon: '👉' },
  { id: 'welcoming', nameAr: 'ذراعان مفتوحان ترحيباً', nameEn: 'Welcoming', icon: '🤗' },
  { id: 'thumbs_up', nameAr: 'إبهام للأعلى وتأكيد', nameEn: 'Thumbs Up', icon: '👍' },
  { id: 'thinking', nameAr: 'يد على الذقن للتفكير', nameEn: 'Thinking', icon: '🤔' },
  { id: 'celebrating', nameAr: 'احتفال ورفع الذراعين', nameEn: 'Celebrating', icon: '🙌' },
  { id: 'looking_around', nameAr: 'يلتفت ويبحث في الصفحة', nameEn: 'Looking Around', icon: '👀' },
  { id: 'leaning', nameAr: 'مستند باسترخاء وثقة', nameEn: 'Leaning', icon: '😎' },
  { id: 'explaining', nameAr: 'يشرح ويوجه العميل', nameEn: 'Explaining', icon: '🗣️' },
  { id: 'holding_calendar', nameAr: 'يحمل تقويم المواعيد 📅', nameEn: 'Holding Calendar', icon: '📅' },
  { id: 'holding_location', nameAr: 'يحمل دبوس الموقع 📍', nameEn: 'Holding Location', icon: '📍' },
  { id: 'holding_checkmark', nameAr: 'يحمل علامة الإنجاز ✅', nameEn: 'Holding Checkmark', icon: '✅' },
  { id: 'walking', nameAr: 'يمشي بنشاط', nameEn: 'Walking', icon: '🚶' },
];

const ALL_ANIMATIONS: { id: ZoAnimationType; nameAr: string; nameEn: string; icon: string }[] = [
  { id: 'gentle_float', nameAr: 'طفو انسيابي ناعم', nameEn: 'Gentle Float', icon: '✨' },
  { id: 'bounce', nameAr: 'قفز حيوي ومرح', nameEn: 'Excited Bounce', icon: '⚡' },
  { id: 'wave', nameAr: 'تحية وترحيب باليد', nameEn: 'Friendly Wave', icon: '👋' },
  { id: 'point', nameAr: 'إشارة وإرشاد نحو الصفحة', nameEn: 'Guiding Point', icon: '👉' },
  { id: 'thinking', nameAr: 'حركة تفكير واستفسار', nameEn: 'Thinking Motion', icon: '🤔' },
  { id: 'celebration', nameAr: 'حماس واحتفال ونجاح', nameEn: 'Celebration Cheer', icon: '🎉' },
  { id: 'shake', nameAr: 'اهتزاز تنبيهي أو قلق', nameEn: 'Concerned Shake', icon: '🔔' },
  { id: 'none', nameAr: 'ثابت بدون حركة', nameEn: 'Static', icon: '⏹️' },
];

const TRIGGER_EVENT_TYPES: { id: ZoTriggerEventType; nameAr: string; nameEn: string }[] = [
  { id: 'page_load', nameAr: 'عند تحميل الصفحة', nameEn: 'On Page Load' },
  { id: 'service_selected', nameAr: 'عند اختيار خدمة معينة', nameEn: 'On Service Selected' },
  { id: 'booking_step_changed', nameAr: 'عند تغيير خطوة الحجز', nameEn: 'On Booking Step' },
  { id: 'date_selected', nameAr: 'عند اختيار تاريخ الموعد', nameEn: 'On Date Selected' },
  { id: 'address_completed', nameAr: 'عند إدخال العنوان والموقع', nameEn: 'On Address Filled' },
  { id: 'booking_completed', nameAr: 'عند إتمام الحجز بنجاح', nameEn: 'On Booking Confirmed' },
  { id: 'login_success', nameAr: 'عند نجاح تسجيل الدخول', nameEn: 'On Login Success' },
  { id: 'error', nameAr: 'عند حدوث خطأ أو تنبيه', nameEn: 'On System Error' },
  { id: 'button_click', nameAr: 'عند الضغط على زر تفاعلي', nameEn: 'On Button Click' },
];

export default function ZoStudioPage() {
  const {
    draftConfigs,
    publishedConfigs,
    activeStudioPageId,
    dirtyPages,
    selectStudioPage,
    updateDraftConfig,
    updateDraftCharacter,
    updateDraftPosition,
    updateDraftMessage,
    updateDraftBehavior,
    addDraftTrigger,
    updateDraftTrigger,
    removeDraftTrigger,
    saveDraft,
    publishPage,
    publishAll,
    applyCharacterToAllPages,
    resetPage,
    duplicateConfig,
  } = useZoStudioStore();

  // Active page config
  const activeConfig = draftConfigs[activeStudioPageId] || DEFAULT_ZO_PAGE_CONFIGS[activeStudioPageId] || DEFAULT_ZO_PAGE_CONFIGS.home;
  const isDirty = Boolean(dirtyPages[activeStudioPageId]);

  // Studio UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'character' | 'position' | 'message' | 'triggers' | 'behavior'>('character');
  const [previewDevice, setPreviewDevice] = useState<ZoDeviceBreakpoint>('desktop');
  const [previewSpeechOpen, setPreviewSpeechOpen] = useState(true);
  const [duplicateModalOpen, setDuplicateModalOpen] = useState(false);
  const [duplicateTargetPageId, setDuplicateTargetPageId] = useState('car-services');

  // Trigger add modal
  const [newTriggerModalOpen, setNewTriggerModalOpen] = useState(false);
  const [newTriggerForm, setNewTriggerForm] = useState<Omit<ZoTriggerRule, 'id'>>({
    eventType: 'page_load',
    priority: 4,
    expression: 'happy',
    pose: 'welcoming',
    animation: 'wave',
    message: '',
    messageEn: '',
    delay: 500,
    duration: 4500,
    enabled: true,
  });

  // Custom Image Upload Refs & Handlers
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastUploadedFileRef = useRef<File | null>(null);
  const [bgTolerance, setBgTolerance] = useState<number>(30);
  const [bgMode, setBgMode] = useState<'transparent' | 'original' | 'dark' | 'light'>('transparent');
  const [isMediaLibraryOpen, setIsMediaLibraryOpen] = useState(false);

  const handleSelectFromLibrary = async (item: MediaItem) => {
    updateDraftCharacter(activeStudioPageId, {
      customImage: item.url,
      originalImageUrl: item.url,
      originalFilename: item.originalName,
      mimeType: item.mimeType,
      width: item.width,
      height: item.height,
      fileSize: item.size,
      versionTimestamp: Date.now(),
      renderMode: 'live_2d_character',
    });

    // Auto-save and auto-publish so the website immediately updates without waiting!
    saveDraft(activeStudioPageId);
    publishPage(activeStudioPageId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cleanzo-zo-updated'));
      try {
        const bc = new BroadcastChannel('cleanzo_zo_channel');
        bc.postMessage({ type: 'SYNC_ZO', pageId: activeStudioPageId });
        bc.close();
      } catch {}
    }

    // Sync to backend API
    try {
      const freshConfig = useZoStudioStore.getState().draftConfigs[activeStudioPageId];
      if (freshConfig) {
        await cleanzoApi.admin.updateZoDraft(activeStudioPageId, freshConfig);
        await cleanzoApi.admin.publishZoPage(activeStudioPageId);
      }
    } catch (apiErr) {
      console.warn('[ZoStudio] Backend sync notice:', apiErr);
    }

    toast.success(`تم تعيين "${item.originalName}" وتطبيقها فوراً على الموقع الحي! 🚀`);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 25 ميجابايت');
      return;
    }

    const toastId = toast.loading('جاري حفظ الصورة وتطبيقها مباشرة على الموقع...');

    try {
      // 1. Extract genuine original dimensions without altering a single pixel
      const details = await getOriginalImageDetails(file);

      // 2. Upload to backend media storage (preserves exact bytes on disk)
      let finalUrl = '';
      try {
        const uploaded = await cleanzoApi.media.upload(file);
        if (uploaded?.url) {
          finalUrl = uploaded.url;
        }
      } catch (uploadErr) {
        console.warn('[ZoStudio] Direct media upload fallback to data URL:', uploadErr);
      }

      // If backend upload was offline, read raw data URL directly
      if (!finalUrl) {
        finalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // 3. Update character draft with 100% original metadata
      updateDraftCharacter(activeStudioPageId, {
        customImage: finalUrl,
        originalImageUrl: finalUrl,
        originalFilename: file.name,
        mimeType: file.type,
        width: details.width,
        height: details.height,
        fileSize: file.size,
        versionTimestamp: Date.now(),
        renderMode: 'live_2d_character',
      });

      // 4. Auto-save and auto-publish so the website immediately updates without waiting!
      saveDraft(activeStudioPageId);
      publishPage(activeStudioPageId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cleanzo-zo-updated'));
        try {
          const bc = new BroadcastChannel('cleanzo_zo_channel');
          bc.postMessage({ type: 'SYNC_ZO', pageId: activeStudioPageId });
          bc.close();
        } catch {}
      }

      // 5. Sync to backend API
      try {
        const freshConfig = useZoStudioStore.getState().draftConfigs[activeStudioPageId];
        if (freshConfig) {
          await cleanzoApi.admin.updateZoDraft(activeStudioPageId, freshConfig);
          await cleanzoApi.admin.publishZoPage(activeStudioPageId);
        }
      } catch (apiErr) {
        console.warn('[ZoStudio] Backend sync notice:', apiErr);
      }

      toast.dismiss(toastId);
      toast.success(
        `تم حفظ صورة زو وتطبيقها فوراً على الموقع (${details.width} × ${details.height})! 🚀`
      );
    } catch (err: any) {
      toast.dismiss(toastId);
      console.error('[ZoStudio] Upload failed:', err);
      toast.error('حدث خطأ أثناء حفظ الصورة، يرجى المحاولة مرة أخرى');
    }
  };

  const handleClearImage = async () => {
    updateDraftCharacter(activeStudioPageId, {
      customImage: undefined,
      customImageName: undefined,
      originalImageUrl: undefined,
      renderMode: '3d_procedural',
      versionTimestamp: Date.now(),
    });
    saveDraft(activeStudioPageId);
    publishPage(activeStudioPageId);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('cleanzo-zo-updated'));
      try {
        const bc = new BroadcastChannel('cleanzo_zo_channel');
        bc.postMessage({ type: 'SYNC_ZO', pageId: activeStudioPageId });
        bc.close();
      } catch {}
    }
    try {
      const freshConfig = useZoStudioStore.getState().draftConfigs[activeStudioPageId];
      if (freshConfig) {
        await cleanzoApi.admin.updateZoDraft(activeStudioPageId, freshConfig);
        await cleanzoApi.admin.publishZoPage(activeStudioPageId);
      }
    } catch (apiErr) {
      console.warn('[ZoStudio] Backend sync notice:', apiErr);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    lastUploadedFileRef.current = null;
    toast.success('تمت استعادة مجسم زو الأصلي وتطبيقه على الموقع الحي');
  };

  // Filtered page list
  const pagesList = useMemo(() => {
    return Object.values(DEFAULT_ZO_PAGE_CONFIGS).filter((p) => {
      const matchesSearch =
        p.pageNameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.pageNameEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.pageId.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || p.pageCategory === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Save & Apply Live directly to website
  const handleSaveAndPublish = async () => {
    try {
      saveDraft(activeStudioPageId);
      publishPage(activeStudioPageId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cleanzo-zo-updated'));
        try {
          const bc = new BroadcastChannel('cleanzo_zo_channel');
          bc.postMessage({ type: 'SYNC_ZO', pageId: activeStudioPageId });
          bc.close();
        } catch {}
      }
      const freshConfig = useZoStudioStore.getState().draftConfigs[activeStudioPageId] || activeConfig;
      // Sync to backend API in sequential order to guarantee draft is saved before publishing
      try {
        await cleanzoApi.admin.updateZoDraft(activeStudioPageId, freshConfig);
        await cleanzoApi.admin.publishZoPage(activeStudioPageId);
      } catch (apiErr) {
        console.warn('[ZoStudio] Backend sync notice:', apiErr);
      }
      toast.success(`تم حفظ وتطبيق إعدادات زو لصفحة (${freshConfig.pageNameAr || activeConfig.pageNameAr}) مباشرة على الموقع! 🚀`);
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء حفظ الإعدادات');
    }
  };

  const handlePublishAll = async () => {
    try {
      applyCharacterToAllPages(activeStudioPageId);
      publishAll(activeStudioPageId);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cleanzo-zo-updated'));
        try {
          const bc = new BroadcastChannel('cleanzo_zo_channel');
          bc.postMessage({ type: 'SYNC_ZO_ALL', pageId: activeStudioPageId });
          bc.close();
        } catch {}
      }
      const allPub = useZoStudioStore.getState().publishedConfigs;
      const activeChar = allPub[activeStudioPageId]?.character;
      // Sync to backend API with full payload
      try {
        await cleanzoApi.admin.publishAllZoPages({ character: activeChar, configs: allPub });
      } catch (err) {
        console.warn('[ZoStudio] publishAll API notice:', err);
      }
      toast.success('تم تطبيق ونشر صورة وإعدادات زو فورياً لجميع صفحات الموقع! 🚀');
    } catch (err) {
      console.error(err);
      toast.error('حدث خطأ أثناء نشر الإعدادات لجميع الصفحات');
    }
  };

  const handleReset = () => {
    if (confirm(`هل أنت متأكد من استعادة الإعدادات الافتراضية لصفحة (${activeConfig.pageNameAr}) فقط؟`)) {
      resetPage(activeStudioPageId);
      toast.info('تمت استعادة الإعدادات الافتراضية لهذه الصفحة');
    }
  };

  const handleDuplicate = () => {
    duplicateConfig(activeStudioPageId, duplicateTargetPageId);
    setDuplicateModalOpen(false);
    toast.success(`تم نسخ إعدادات (${activeConfig.pageNameAr}) بنجاح إلى الصفحة المختارة!`);
  };

  const currentDevicePos = activeConfig[previewDevice] || activeConfig.desktop;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#041728] text-slate-900 dark:text-slate-100 flex flex-col">
      {/* Top Studio Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#07345C]/80 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0866C6] to-[#F0444C] flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight">Zo Studio (استوديو زو 3D)</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#0866C6]/10 text-[#0866C6] dark:text-[#60A5FA] border border-[#0866C6]/20">
                Live 3D Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              تحكم مستقل وكامل في تميمة زو التفاعلية لكل صفحة من صفحات الموقع
            </p>
          </div>
        </div>

        {/* Global Studio Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="text-xs gap-1.5 border-slate-200 dark:border-slate-700 hover:text-[#F0444C]"
            title="استعادة الإعدادات الأصلية للصفحة المحددة"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>استعادة الافتراضي</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setDuplicateModalOpen(true)}
            className="text-xs gap-1.5 border-slate-200 dark:border-slate-700"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>نسخ الإعدادات لصفحة أخرى</span>
          </Button>

          <Button
            size="sm"
            onClick={handleSaveAndPublish}
            className="text-xs gap-1.5 bg-gradient-to-r from-[#0866C6] to-[#07345C] hover:from-[#07345C] hover:to-[#0866C6] text-white shadow-md font-black shadow-[#0866C6]/25 cursor-pointer"
            title="حفظ وتطبيق فوراً على الموقع الحي"
          >
            <Save className="w-3.5 h-3.5" />
            <span>حفظ وتطبيق فوري على الموقع</span>
          </Button>

          <Button
            size="sm"
            onClick={handlePublishAll}
            className="text-xs gap-1.5 bg-[#0866C6] hover:bg-[#06529e] text-white shadow-md font-bold cursor-pointer"
            title="نشر وتطبيق على جميع صفحات الموقع فورياً"
          >
            <Check className="w-3.5 h-3.5" />
            <span>تطبيق على كل الصفحات</span>
          </Button>
        </div>
      </header>

      {/* Main 3-Column Studio Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
        {/* ========================================================= */}
        {/* COLUMN 1: Searchable Page List (3 cols)                   */}
        {/* ========================================================= */}
        <aside className="lg:col-span-3 border-e border-slate-200 dark:border-slate-800 bg-white dark:bg-[#07345C]/50 p-4 flex flex-col h-[calc(100vh-65px)] overflow-y-auto">
          <div className="mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              صفحات الموقع ({pagesList.length})
            </h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute start-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن صفحة بالاسم أو المسار..."
                className="w-full ps-9 pe-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-[#0866C6]"
              />
            </div>
          </div>

          {/* Category filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
            {['all', 'main', 'services', 'booking', 'content', 'account', 'system'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={cn(
                  'px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors',
                  selectedCategory === cat
                    ? 'bg-[#0866C6] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                )}
              >
                {cat === 'all'
                  ? 'الكل'
                  : cat === 'main'
                  ? 'الرئيسية'
                  : cat === 'services'
                  ? 'الخدمات'
                  : cat === 'booking'
                  ? 'الحجز'
                  : cat === 'content'
                  ? 'المحتوى'
                  : cat === 'account'
                  ? 'الحساب'
                  : 'النظام'}
              </button>
            ))}
          </div>

          {/* Page items list */}
          <div className="flex-1 space-y-1.5 overflow-y-auto pe-1">
            {pagesList.map((page) => {
              const isSelected = page.pageId === activeStudioPageId;
              const hasDraft = Boolean(dirtyPages[page.pageId]);
              const cfg = draftConfigs[page.pageId] || page;

              return (
                <button
                  key={page.pageId}
                  onClick={() => selectStudioPage(page.pageId)}
                  className={cn(
                    'w-full text-start p-3 rounded-xl transition-all border flex items-center justify-between gap-2',
                    isSelected
                      ? 'bg-[#0866C6]/10 border-[#0866C6] text-[#0866C6] dark:text-[#60A5FA] shadow-sm'
                      : 'bg-slate-50/50 dark:bg-[#082845]/40 border-slate-200/60 dark:border-[#133B61]/60 hover:bg-slate-100 dark:hover:bg-[#082845]/70 text-slate-700 dark:text-slate-300'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs truncate">{page.pageNameAr}</span>
                      {!cfg.enabled && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-500">
                          معطل
                        </span>
                      )}
                      {hasDraft && (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="يوجد مسودة غير منشورة" />
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block truncate">{page.pathPattern}</span>
                  </div>

                  <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200/60 dark:bg-slate-800 text-slate-500">
                    {cfg.character.expression}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ========================================================= */}
        {/* COLUMN 2: Real-time 3D Zo Live Preview (5 cols)           */}
        {/* ========================================================= */}
        <main className="lg:col-span-5 bg-gradient-to-b from-slate-100 via-slate-50 to-slate-100 dark:from-[#041728] dark:via-[#070E1A] dark:to-[#041728] p-6 flex flex-col justify-between items-center relative border-e border-slate-200 dark:border-slate-800 h-[calc(100vh-65px)]">
          {/* Top Preview Controls */}
          <div className="w-full flex items-center justify-between gap-3 z-10">
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white dark:bg-[#07345C] border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setPreviewDevice('desktop')}
                className={cn(
                  'p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors',
                  previewDevice === 'desktop'
                    ? 'bg-[#0866C6] text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
                title="معاينة الشاشات الكبيرة (Desktop)"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">كمبيوتر</span>
              </button>
              <button
                onClick={() => setPreviewDevice('tablet')}
                className={cn(
                  'p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors',
                  previewDevice === 'tablet'
                    ? 'bg-[#0866C6] text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
                title="معاينة الأجهزة اللوحية (Tablet)"
              >
                <TabletIcon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تابلت</span>
              </button>
              <button
                onClick={() => setPreviewDevice('mobile')}
                className={cn(
                  'p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors',
                  previewDevice === 'mobile'
                    ? 'bg-[#0866C6] text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                )}
                title="معاينة الجوال (Mobile) مع حماية شريط التنقل"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">موبايل</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPreviewSpeechOpen(!previewSpeechOpen)}
                className={cn(
                  'px-2.5 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors',
                  previewSpeechOpen
                    ? 'bg-[#0866C6]/10 border-[#0866C6] text-[#0866C6] dark:text-[#60A5FA]'
                    : 'bg-white dark:bg-[#07345C] border-slate-200 dark:border-slate-800 text-slate-500'
                )}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>رسالة زو</span>
              </button>

              <Link
                href={activeConfig.pathPattern}
                target="_blank"
                className="p-1.5 rounded-xl bg-white dark:bg-[#07345C] border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-[#0866C6] transition-colors"
                title="فتح الصفحة الحقيقية في الموقع لمعاينة زو المباشر"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 3D Character Stage */}
          <div className="w-full flex-1 flex flex-col items-center justify-center relative my-4">
            {/* Ambient circular stage grid */}
            <div className="absolute w-72 h-72 rounded-full border border-[#0866C6]/20 pointer-events-none -z-10 animate-pulse" />
            <div className="absolute w-96 h-96 rounded-full border border-dashed border-slate-300 dark:border-slate-800 pointer-events-none -z-10" />

            {/* Simulated Device Frame if in Mobile mode */}
            {previewDevice === 'mobile' && (
              <div className="absolute inset-x-8 bottom-0 h-14 bg-slate-900/90 text-white text-[10px] flex items-center justify-around rounded-t-2xl border-t border-slate-700 pointer-events-none shadow-xl z-20">
                <span>الرئيسية</span>
                <span>الخدمات</span>
                <span className="font-bold text-[#0866C6]">حجوزاتي</span>
                <span>العروض</span>
                <span>حسابي</span>
              </div>
            )}

            {/* Live Zo Speech Bubble */}
            {previewSpeechOpen && activeConfig.message.enabled && (
              <div className="mb-4 z-20 animate-in fade-in zoom-in-95">
                <ZoSpeechBubble
                  title={activeConfig.message.title}
                  titleEn={activeConfig.message.titleEn}
                  message={activeConfig.message.text || 'أهلاً بك! أنا زو 3D جاهز لمساعدتك.'}
                  messageEn={activeConfig.message.textEn}
                  bubbleStyle={activeConfig.message.bubbleStyle}
                  fontSize={activeConfig.message.fontSize}
                  maxWidth={activeConfig.message.maxWidth}
                  position={activeConfig.message.position}
                  textColor={activeConfig.message.textColor}
                  titleColor={activeConfig.message.titleColor}
                  backgroundColor={activeConfig.message.backgroundColor}
                  borderColor={activeConfig.message.borderColor}
                  autoHide={false}
                  showCloseButton={false}
                  playSound={false}
                />
              </div>
            )}

            {/* Live Character Stage: LiveZoCharacter when image is set, or 3D Canvas */}
            {activeConfig.character.originalImageUrl || activeConfig.character.customImage ? (
              <div
                style={{
                  width: `${currentDevicePos.size * 1.5}px`,
                  minHeight: `${currentDevicePos.size * 1.6}px`,
                }}
                className="relative flex items-center justify-center pointer-events-auto"
              >
                <LiveZoCharacter
                  imageUrl={activeConfig.character.originalImageUrl || activeConfig.character.customImage}
                  animation={activeConfig.character.animation}
                  animationSpeed={activeConfig.character.animationSpeed}
                  animationIntensity={activeConfig.character.animationIntensity || 1.0}
                  size={Math.round(currentDevicePos.size * 1.35)}
                  shadow={activeConfig.character.shadow}
                  glow={activeConfig.character.glow}
                  lookAtCursor={true}
                  interactive={true}
                />
              </div>
            ) : (
              <div
                style={{
                  width: `${currentDevicePos.size * 1.5}px`,
                  height: `${currentDevicePos.size * 1.8}px`,
                }}
                className="relative flex items-center justify-center"
              >
                <ZoCanvas
                  expression={activeConfig.character.expression}
                  pose={activeConfig.character.pose}
                  animation={activeConfig.character.animation}
                  animationSpeed={activeConfig.character.animationSpeed}
                  autoBlink={activeConfig.character.autoBlink}
                  eyeMovement={activeConfig.character.eyeMovement}
                  scale={activeConfig.character.scale}
                  rotationY={activeConfig.character.rotationY}
                  opacity={activeConfig.character.opacity}
                  shadow={activeConfig.character.shadow}
                  glow={activeConfig.character.glow}
                  allowOrbit={true}
                  lookAtCursor={true}
                  className="w-full h-full"
                />
              </div>
            )}

            {/* Live interactive hint */}
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 select-none">
              <Sparkles className="w-3.5 h-3.5 text-[#0866C6]" />
              <span>
                {activeConfig.character.originalImageUrl || activeConfig.character.customImage
                  ? 'حركة حية وتفاعل طبيعي مع حركة الفأرة (Live Character Animation)'
                  : 'اضغط واسحب بالفأرة لتدوير زو بزاوية 360° ثلاثية الأبعاد'}
              </span>
            </div>
          </div>

          {/* Bottom Live Info Bar */}
          <div className="w-full p-3 rounded-2xl bg-white/90 dark:bg-[#07345C]/90 border border-slate-200 dark:border-slate-800 backdrop-blur-md flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="font-bold">{activeConfig.pageNameAr}</span>
              <span className="text-slate-400">({activeConfig.pageId})</span>
            </div>

            <div className="flex items-center gap-4 text-slate-500 text-[11px]">
              <span>الحجم: {currentDevicePos.size}px</span>
              <span>المحاذاة: {currentDevicePos.horizontal}</span>
              <span>الارتفاع: {currentDevicePos.offsetY}px</span>
            </div>
          </div>
        </main>

        {/* ========================================================= */}
        {/* COLUMN 3: Page Configuration Tabs (4 cols)                */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 bg-white dark:bg-[#07345C]/80 p-5 flex flex-col h-[calc(100vh-65px)] overflow-y-auto">
          {/* Enable / Disable Page Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className={cn(
                  'w-8 h-8 rounded-xl flex items-center justify-center text-white',
                  activeConfig.enabled ? 'bg-[#0866C6]' : 'bg-slate-400'
                )}
              >
                {activeConfig.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              </div>
              <div>
                <span className="text-xs font-bold block">تفعيل زو في هذه الصفحة</span>
                <span className="text-[10px] text-slate-400">
                  {activeConfig.enabled ? 'زو ظاهر للعملاء' : 'مخفي حالياً'}
                </span>
              </div>
            </div>

            <button
              onClick={() => updateDraftConfig(activeStudioPageId, { enabled: !activeConfig.enabled })}
              className={cn(
                'w-11 h-6 rounded-full transition-colors relative p-0.5',
                activeConfig.enabled ? 'bg-[#0866C6]' : 'bg-slate-300 dark:bg-slate-700'
              )}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full bg-white transition-transform',
                  activeConfig.enabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* Config Tabs - Clean Rectangular Cards Grid (مستطيل واضح لكل خانة بدون أي قص) */}
          <div className="shrink-0 mb-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'character', label: 'الشخصية', icon: Sparkles },
                { id: 'position', label: 'الموقع والحجم', icon: Sliders },
                { id: 'message', label: 'الرسائل', icon: MessageSquare },
                { id: 'triggers', label: 'التفاعلات', icon: Zap },
                { id: 'behavior', label: 'السلوك', icon: ShieldCheck },
              ].map((tab, idx) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'h-12 px-3 rounded-2xl border-2 flex items-center justify-center gap-2 transition-all select-none cursor-pointer text-xs font-black shadow-xs',
                      idx === 4 ? 'col-span-2 sm:col-span-1' : '',
                      isActive
                        ? 'bg-[#0866C6] border-[#0866C6] text-white shadow-md shadow-[#0866C6]/30 scale-[1.02]'
                        : 'bg-slate-50 dark:bg-[#041728] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#0866C6]/50 hover:bg-white dark:hover:bg-[#07345C]'
                    )}
                  >
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-white' : 'text-[#0866C6] dark:text-[#3894ec]')} />
                    <span className="truncate">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: CHARACTER SETTINGS */}
          {activeTab === 'character' && (
            <div className="space-y-5">
              {/* Custom Live Zo Character Section */}
              <div className="p-4 rounded-2xl bg-slate-50/70 dark:bg-[#061E35] border border-slate-200 dark:border-[#0E3A64] shadow-sm space-y-3.5 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#0866C6] to-[#054484] text-white flex items-center justify-center shadow-md shadow-[#0866C6]/30 shrink-0">
                      <Upload className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white">
                        شخصية زو الحية (Zo Character)
                      </h4>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">
                        الصورة الأصلية 100% دون عزل خلفية أو مساس بالجودة
                      </p>
                    </div>
                  </div>

                  {(activeConfig.character.originalImageUrl || activeConfig.character.customImage) && (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shrink-0 shadow-2xs">
                      <Check className="w-3 h-3" />
                      <span>صورة أصلية نشطة</span>
                    </span>
                  )}
                </div>

                {/* Upload Hidden Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/webp,image/svg+xml,image/jpeg,image/jpg"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Active Image Display with Original Metadata Badge */}
                {(activeConfig.character.originalImageUrl || activeConfig.character.customImage) ? (
                  <div className="p-3.5 rounded-xl bg-white dark:bg-[#041525] border border-slate-200 dark:border-[#0A2E50] shadow-2xs space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 sm:w-18 sm:h-18 rounded-xl overflow-hidden bg-slate-100/80 dark:bg-[#061E35] border border-slate-200/90 dark:border-[#0E3A64] relative shrink-0 aspect-square p-1 flex items-center justify-center shadow-2xs">
                        <CleanzoImage
                          src={activeConfig.character.originalImageUrl || activeConfig.character.customImage}
                          alt="Original Zo Preview"
                          fit="contain"
                          priority
                          containerClassName="!bg-transparent w-full h-full"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold truncate text-slate-900 dark:text-slate-100 font-mono" dir="ltr">
                            {activeConfig.character.originalFilename || activeConfig.character.customImageName || 'zo-original-asset.png'}
                          </p>
                          <span className="text-[9px] px-2 py-0.5 rounded-md bg-blue-500/10 dark:bg-sky-500/15 text-[#0866C6] dark:text-[#38BDF8] border border-blue-500/20 dark:border-sky-500/30 font-mono font-bold shrink-0">
                            Original Asset
                          </span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                          <span>
                            الأبعاد: <strong className="text-slate-800 dark:text-slate-200">{activeConfig.character.width || 2000} × {activeConfig.character.height || 2000}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            الصيغة: <strong className="text-slate-800 dark:text-slate-200">{activeConfig.character.mimeType?.replace('image/', '').toUpperCase() || 'PNG'}</strong>
                          </span>
                          {activeConfig.character.fileSize && (
                            <>
                              <span>•</span>
                              <span>
                                الحجم: <strong className="text-slate-800 dark:text-slate-200">{(activeConfig.character.fileSize / (1024 * 1024)).toFixed(2)} MB</strong>
                              </span>
                            </>
                          )}
                        </div>

                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span>الصورة الأصلية محفوظة 100% دون عزل خلفية أو ضغط أو تشويه</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-[#0A2E50]">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-1 py-2 px-3 rounded-xl text-xs font-bold bg-[#0866C6] hover:bg-[#0756A8] text-white transition-all cursor-pointer text-center shadow-xs active:scale-[0.99]"
                      >
                        رفع صورة أخرى
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsMediaLibraryOpen(true)}
                        className="py-2 px-3.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-[#0E3A64] bg-slate-50 dark:bg-[#072540] hover:bg-slate-100 dark:hover:bg-[#0a355c] text-slate-700 dark:text-slate-200 transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                      >
                        <HardDrive className="w-3.5 h-3.5 text-[#0866C6] dark:text-sky-400" />
                        <span>من المكتبة</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleClearImage}
                        className="p-2 rounded-xl text-xs font-bold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/50 dark:border-rose-900/50 transition-colors cursor-pointer"
                        title="استعادة مجسم زو الأصلي"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full py-5 px-4 rounded-xl border-2 border-dashed border-[#0866C6]/30 hover:border-[#0866C6] bg-white dark:bg-[#041525] hover:bg-[#0866C6]/5 transition-all text-center space-y-2 group cursor-pointer"
                    >
                      <div className="w-10 h-10 mx-auto rounded-full bg-[#0866C6]/10 text-[#0866C6] flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                          اضغط هنا لاختيار ورفع صورة شخصية زو [ Choose Image ]
                        </p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                          مدعوم: PNG • JPG • JPEG • WEBP (تبقى بجودتها وخلفيتها الأصلية 100%)
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsMediaLibraryOpen(true)}
                      className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-[#0E3A64] bg-white dark:bg-[#072540] hover:bg-slate-50 dark:hover:bg-[#0a355c] text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
                    >
                      <HardDrive className="w-4 h-4 text-[#0866C6] dark:text-sky-400" />
                      <span>أو اختر صورة من مكتبة الوسائط الموحدة</span>
                    </button>
                  </div>
                )}

                {/* Unified Media Library Modal */}
                <MediaLibraryModal
                  isOpen={isMediaLibraryOpen}
                  onClose={() => setIsMediaLibraryOpen(false)}
                  filterType="image"
                  onSelect={handleSelectFromLibrary}
                />
              </div>

              {/* Animation Selector Engine */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#07345C]/50 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0866C6]" />
                    <span>حركة الشخصية الحية (Live Animation Engine)</span>
                  </label>
                  <span className="text-[10px] text-[#0866C6] dark:text-[#60A5FA] font-bold">
                    حركات ناعمة دون تشويه الصورة
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {ALL_ANIMATIONS.map((anim) => {
                    const isSelected = activeConfig.character.animation === anim.id;
                    return (
                      <button
                        key={anim.id}
                        type="button"
                        onClick={() =>
                          updateDraftCharacter(activeStudioPageId, {
                            animation: anim.id,
                            animationPreset: anim.id as any,
                          })
                        }
                        className={cn(
                          'p-2.5 rounded-xl border text-start flex items-center gap-2 transition-all cursor-pointer',
                          isSelected
                            ? 'bg-[#0866C6]/15 border-[#0866C6] text-[#0866C6] dark:text-[#60A5FA] font-black shadow-sm'
                            : 'bg-slate-50 dark:bg-[#041728] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-[#0866C6]/40'
                        )}
                      >
                        <span className="text-lg shrink-0">{anim.icon}</span>
                        <div className="min-w-0">
                          <span className="text-[11px] block truncate font-bold">{anim.nameAr}</span>
                          <span className="text-[9px] text-slate-400 block truncate">{anim.nameEn}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Animation Sliders: Speed & Intensity */}
                {activeConfig.character.animation !== 'none' && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">سرعة الحركة (Speed)</span>
                        <span className="font-mono font-bold text-[#0866C6]">{activeConfig.character.animationSpeed ?? 1.0}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={activeConfig.character.animationSpeed ?? 1.0}
                        onChange={(e) =>
                          updateDraftCharacter(activeStudioPageId, { animationSpeed: parseFloat(e.target.value) })
                        }
                        className="w-full accent-[#0866C6] h-1.5"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-bold text-slate-700 dark:text-slate-300">شدة وتأثير الحركة (Intensity)</span>
                        <span className="font-mono font-bold text-[#0866C6]">{activeConfig.character.animationIntensity ?? 1.0}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.0"
                        step="0.1"
                        value={activeConfig.character.animationIntensity ?? 1.0}
                        onChange={(e) =>
                          updateDraftCharacter(activeStudioPageId, { animationIntensity: parseFloat(e.target.value) })
                        }
                        className="w-full accent-[#0866C6] h-1.5"
                      />
                    </div>
                  </div>
                )}

                {/* Toggles: Shadow, Glow & Mouse Tracking */}
                <div className="space-y-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">الظل الأرضي التفاعلي (Dynamic Shadow)</span>
                    <input
                      type="checkbox"
                      checked={Boolean(activeConfig.character.shadow)}
                      onChange={(e) => updateDraftCharacter(activeStudioPageId, { shadow: e.target.checked })}
                      className="w-4 h-4 rounded text-[#0866C6] accent-[#0866C6]"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">تتبع حركة الفأرة (Look-at Cursor Parallax)</span>
                    <input
                      type="checkbox"
                      checked={Boolean(activeConfig.character.eyeMovement)}
                      onChange={(e) => updateDraftCharacter(activeStudioPageId, { eyeMovement: e.target.checked })}
                      className="w-4 h-4 rounded text-[#0866C6] accent-[#0866C6]"
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">توهج خلفي خفيف (Ambient Glow)</span>
                    <input
                      type="checkbox"
                      checked={Boolean(activeConfig.character.glow)}
                      onChange={(e) => updateDraftCharacter(activeStudioPageId, { glow: e.target.checked })}
                      className="w-4 h-4 rounded text-[#0866C6] accent-[#0866C6]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: POSITION & RESPONSIVE */}
          {activeTab === 'position' && (
            <div className="space-y-4">
              <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 text-xs text-blue-800 dark:text-blue-300">
                يتم حفظ موقع وحجم زو بشكل مستقل لكل جهاز (كمبيوتر، تابلت، وموبايل) مع حماية شريط التنقل السفلي.
              </div>

              {/* Device Selector in Tab */}
              <div className="flex rounded-xl bg-slate-100 dark:bg-[#041728] p-1 gap-1">
                {(['desktop', 'tablet', 'mobile'] as ZoDeviceBreakpoint[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setPreviewDevice(d)}
                    className={cn(
                      'flex-1 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors',
                      previewDevice === d ? 'bg-[#0866C6] text-white shadow' : 'text-slate-500'
                    )}
                  >
                    {d === 'desktop' ? 'كمبيوتر' : d === 'tablet' ? 'تابلت' : 'موبايل'}
                  </button>
                ))}
              </div>

              {/* Size Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold">حجم زو على ({previewDevice})</span>
                  <span>{currentDevicePos?.size ?? 140}px</span>
                </div>
                <input
                  type="range"
                  min="80"
                  max="280"
                  step="5"
                  value={currentDevicePos?.size ?? 140}
                  onChange={(e) =>
                    updateDraftPosition(activeStudioPageId, previewDevice, { size: parseInt(e.target.value) })
                  }
                  className="w-full accent-[#0866C6]"
                />
              </div>

              {/* Horizontal Position */}
              <div>
                <label className="text-xs font-bold block mb-1">المحاذاة الأفقية</label>
                <select
                  value={currentDevicePos?.horizontal || 'corner-right'}
                  onChange={(e) =>
                    updateDraftPosition(activeStudioPageId, previewDevice, { horizontal: e.target.value as any })
                  }
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                >
                  <option value="corner-right">الزاوية اليمنى (Right Corner)</option>
                  <option value="corner-left">الزاوية اليسرى (Left Corner)</option>
                  <option value="center">في المنتصف (Centered)</option>
                </select>
              </div>

              {/* Vertical Position */}
              <div>
                <label className="text-xs font-bold block mb-1">المحاذاة الرأسية</label>
                <select
                  value={currentDevicePos?.vertical || 'bottom'}
                  onChange={(e) =>
                    updateDraftPosition(activeStudioPageId, previewDevice, { vertical: e.target.value as any })
                  }
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                >
                  <option value="bottom">أسفل الشاشة (Bottom)</option>
                  <option value="center">وسط الشاشة (Center)</option>
                  <option value="top">أعلى الشاشة (Top)</option>
                </select>
              </div>

              {/* Offset X Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold">الإزاحة الجانبية (Offset X)</span>
                  <span>{currentDevicePos?.offsetX ?? 24}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentDevicePos?.offsetX ?? 24}
                  onChange={(e) =>
                    updateDraftPosition(activeStudioPageId, previewDevice, { offsetX: parseInt(e.target.value) })
                  }
                  className="w-full accent-[#0866C6]"
                />
              </div>

              {/* Offset Y Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold">
                    الإزاحة الرأسية (Offset Y){previewDevice === 'mobile' ? ' (أمان التنقل)' : ''}
                  </span>
                  <span>{currentDevicePos?.offsetY ?? 24}px</span>
                </div>
                <input
                  type="range"
                  min={previewDevice === 'mobile' ? 80 : 0}
                  max="200"
                  value={currentDevicePos?.offsetY ?? 24}
                  onChange={(e) =>
                    updateDraftPosition(activeStudioPageId, previewDevice, { offsetY: parseInt(e.target.value) })
                  }
                  className="w-full accent-[#0866C6]"
                />
              </div>
            </div>
          )}

          {/* TAB 3: MESSAGE CONFIGURATION */}
          {activeTab === 'message' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-100 dark:bg-[#041728]">
                <span className="font-bold">تفعيل رسالة زو في هذه الصفحة</span>
                <input
                  type="checkbox"
                  checked={Boolean(activeConfig.message?.enabled)}
                  onChange={(e) => updateDraftMessage(activeStudioPageId, { enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0866C6]"
                />
              </div>

              {/* Arabic Title & Text */}
              <div>
                <label className="text-xs font-bold block mb-1">عنوان الرسالة (عربي)</label>
                <input
                  type="text"
                  value={activeConfig.message?.title ?? ''}
                  onChange={(e) => updateDraftMessage(activeStudioPageId, { title: e.target.value })}
                  placeholder="مثال: أهلاً بيك في Cleanzo 👋"
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                />
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">نص الرسالة (عربي)</label>
                <textarea
                  rows={3}
                  value={activeConfig.message?.text ?? ''}
                  onChange={(e) => updateDraftMessage(activeStudioPageId, { text: e.target.value })}
                  placeholder="نص كلام زو للعميل في هذه الصفحة..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* English Version */}
              <div>
                <label className="text-xs font-bold block mb-1">نص الرسالة (English)</label>
                <textarea
                  rows={2}
                  dir="ltr"
                  value={activeConfig.message?.textEn ?? ''}
                  onChange={(e) => updateDraftMessage(activeStudioPageId, { textEn: e.target.value })}
                  placeholder="Zo's speech bubble in English..."
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                />
              </div>

              {/* Bubble Style */}
              <div>
                <label className="text-xs font-bold block mb-1">شكل بالون الكلام (Bubble Style)</label>
                <select
                  value={activeConfig.message.bubbleStyle}
                  onChange={(e) => updateDraftMessage(activeStudioPageId, { bubbleStyle: e.target.value as any })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                >
                  <option value="cleanzo_blue">Cleanzo Signature Blue (أزرق داكن فخم)</option>
                  <option value="glass">Glassmorphic (زجاجي شفاف مع بلور)</option>
                  <option value="modern">Modern Clean (أبيض بحواف زرقاء)</option>
                  <option value="gradient">Cleanzo Gradient (تدرج لوني أزرق)</option>
                </select>
              </div>

              {/* Color Customization Section */}
              <div className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Palette className="w-4 h-4 text-[#0866C6]" />
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      ألوان وتنسيق بالون الكلام (Colors)
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      updateDraftMessage(activeStudioPageId, {
                        textColor: undefined,
                        titleColor: undefined,
                        backgroundColor: undefined,
                        borderColor: undefined,
                      })
                    }
                    className="text-[10px] text-slate-400 hover:text-rose-500 font-bold transition-colors cursor-pointer"
                  >
                    استعادة الافتراضي
                  </button>
                </div>

                {/* 1. Message Text Color */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      لون نص الرسالة (Message Text Color)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400">
                        {activeConfig.message.textColor || '(تلقائي عالي الوضوح)'}
                      </span>
                      <input
                        type="color"
                        value={activeConfig.message.textColor || '#0F172A'}
                        onChange={(e) =>
                          updateDraftMessage(activeStudioPageId, { textColor: e.target.value })
                        }
                        className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-700 cursor-pointer p-0"
                      />
                    </div>
                  </div>

                  {/* Preset quick color chips for message text */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { name: 'كحلي داكن', hex: '#0F172A' },
                      { name: 'أبيض ناصع', hex: '#FFFFFF' },
                      { name: 'أزرق كلينزو', hex: '#0866C6' },
                      { name: 'سماوي فاقع', hex: '#0284C7' },
                      { name: 'أحمر كلينزو', hex: '#F0444C' },
                      { name: 'رمادي احترافي', hex: '#475569' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() =>
                          updateDraftMessage(activeStudioPageId, { textColor: c.hex })
                        }
                        className={cn(
                          'px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer',
                          activeConfig.message.textColor === c.hex
                            ? 'ring-2 ring-[#0866C6] border-[#0866C6] bg-[#0866C6]/10 text-[#0866C6]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        )}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Message Title Color */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      لون عنوان الرسالة (Title Color)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400">
                        {activeConfig.message.titleColor || '(افتراضي)'}
                      </span>
                      <input
                        type="color"
                        value={activeConfig.message.titleColor || '#0866C6'}
                        onChange={(e) =>
                          updateDraftMessage(activeStudioPageId, { titleColor: e.target.value })
                        }
                        className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-700 cursor-pointer p-0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { name: 'أزرق كلينزو', hex: '#0866C6' },
                      { name: 'أحمر حيوي', hex: '#F0444C' },
                      { name: 'أبيض ناصع', hex: '#FFFFFF' },
                      { name: 'أسود فخم', hex: '#091322' },
                      { name: 'كحلي كلينزو', hex: '#07345C' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() =>
                          updateDraftMessage(activeStudioPageId, { titleColor: c.hex })
                        }
                        className={cn(
                          'px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer',
                          activeConfig.message.titleColor === c.hex
                            ? 'ring-2 ring-[#0866C6] border-[#0866C6] bg-[#0866C6]/10 text-[#0866C6]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        )}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Bubble Background Color */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      لون خلفية البالون (Bubble Background)
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-[10px] text-slate-400">
                        {activeConfig.message.backgroundColor || '(حسب النمط)'}
                      </span>
                      <input
                        type="color"
                        value={activeConfig.message.backgroundColor || '#FFFFFF'}
                        onChange={(e) =>
                          updateDraftMessage(activeStudioPageId, { backgroundColor: e.target.value })
                        }
                        className="w-6 h-6 rounded-md border border-slate-300 dark:border-slate-700 cursor-pointer p-0"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      { name: 'أبيض ناصع', hex: '#FFFFFF' },
                      { name: 'كحلي كلينزو (Cleanzo Navy)', hex: '#07345C' },
                      { name: 'رمادي خفيف جداً', hex: '#F8FAFD' },
                      { name: 'أزرق داكن ليلي', hex: '#041728' },
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() =>
                          updateDraftMessage(activeStudioPageId, { backgroundColor: c.hex })
                        }
                        className={cn(
                          'px-2 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer',
                          activeConfig.message.backgroundColor === c.hex
                            ? 'ring-2 ring-[#0866C6] border-[#0866C6] bg-[#0866C6]/10 text-[#0866C6]'
                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-400'
                        )}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/10"
                          style={{ backgroundColor: c.hex }}
                        />
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Timing Controls */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold block mb-1">وقت الظهور (Delay ms)</label>
                  <input
                    type="number"
                    step="100"
                    value={activeConfig.message?.delay ?? 0}
                    onChange={(e) => updateDraftMessage(activeStudioPageId, { delay: parseInt(e.target.value) || 0 })}
                    className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold block mb-1">مدة البقاء (Duration ms)</label>
                  <input
                    type="number"
                    step="500"
                    value={activeConfig.message?.duration ?? 6000}
                    onChange={(e) =>
                      updateDraftMessage(activeStudioPageId, { duration: parseInt(e.target.value) || 0 })
                    }
                    className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TRIGGERS & EVENT SYSTEM */}
          {activeTab === 'triggers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold">تفاعلات زو مع العميل ({activeConfig.triggers?.length || 0})</h3>
                  <span className="text-[10px] text-slate-400">
                    أحداث ذكية يتفاعل معها زو أثناء تفاعل الزائر مع هذه الصفحة
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setNewTriggerModalOpen(true)}
                  className="text-xs gap-1 border-dashed"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة تفاعل</span>
                </Button>
              </div>

              <div className="space-y-2">
                {activeConfig.triggers?.map((trig) => (
                  <div
                    key={trig.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#041728] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-500" />
                        <span className="text-xs font-bold">
                          {TRIGGER_EVENT_TYPES.find((t) => t.id === trig.eventType)?.nameAr || trig.eventType}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          أولوية {trig.priority}
                        </span>
                      </div>
                      <button
                        onClick={() => removeDraftTrigger(activeStudioPageId, trig.id)}
                        className="text-slate-400 hover:text-red-500 p-1"
                        title="حذف هذا التفاعل"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-3">
                      <span>التعبير: <b>{trig.expression}</b></span>
                      <span>الوضعية: <b>{trig.pose}</b></span>
                    </div>

                    {trig.message && (
                      <p className="text-xs bg-white dark:bg-[#07345C] p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        {trig.message}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: SMART BEHAVIOR & RULES */}
          {activeTab === 'behavior' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold block mb-1">قاعدة تكرار الظهور للعميل</label>
                <select
                  value={activeConfig.behavior.frequency}
                  onChange={(e) => updateDraftBehavior(activeStudioPageId, { frequency: e.target.value as any })}
                  className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                >
                  <option value="every_visit">في كل زيارة للصفحة (Every Visit)</option>
                  <option value="once_per_session">مرة واحدة لكل جلسة تصفح (Once Per Session)</option>
                  <option value="once_per_page">مرة واحدة فقط للصفحة (Once Per Page)</option>
                  <option value="only_on_trigger">فقط عند حدوث تفاعل محدد (Only On Trigger)</option>
                </select>
              </div>

              <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="font-bold block">احترام إغلاق العميل (Respect Dismissal)</span>
                  <span className="text-[10px] text-slate-400">
                    إذا أغلق العميل كلام زو، لا تكرر إظهاره ثانية أثناء نفس الجلسة
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={Boolean(activeConfig.behavior?.respectDismissal)}
                  onChange={(e) => updateDraftBehavior(activeStudioPageId, { respectDismissal: e.target.checked })}
                  className="w-4 h-4 rounded text-[#0866C6]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DUPLICATE CONFIGURATION MODAL */}
      {duplicateModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#07345C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold">نسخ إعدادات ({activeConfig.pageNameAr})</h3>
            <p className="text-xs text-slate-500">
              اختر الصفحة الهدف التي تريد نسخ إعدادات الشخصية والرسائل إليها:
            </p>

            <select
              value={duplicateTargetPageId}
              onChange={(e) => setDuplicateTargetPageId(e.target.value)}
              className="w-full p-2.5 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
            >
              {Object.values(DEFAULT_ZO_PAGE_CONFIGS)
                .filter((p) => p.pageId !== activeStudioPageId)
                .map((p) => (
                  <option key={p.pageId} value={p.pageId}>
                    {p.pageNameAr} ({p.pageId})
                  </option>
                ))}
            </select>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setDuplicateModalOpen(false)}>
                إلغاء
              </Button>
              <Button size="sm" onClick={handleDuplicate} className="bg-[#0866C6] text-white">
                تأكيد النسخ
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* NEW TRIGGER MODAL */}
      {newTriggerModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#07345C] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 max-w-md w-full shadow-2xl space-y-3">
            <h3 className="text-base font-bold">إضافة تفاعل جديد لزو</h3>

            <div>
              <label className="text-xs font-bold block mb-1">نوع الحدث (Event Trigger)</label>
              <select
                value={newTriggerForm.eventType}
                onChange={(e) => setNewTriggerForm({ ...newTriggerForm, eventType: e.target.value as any })}
                className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
              >
                {TRIGGER_EVENT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold block mb-1">التعبير</label>
                <select
                  value={newTriggerForm.expression}
                  onChange={(e) => setNewTriggerForm({ ...newTriggerForm, expression: e.target.value as any })}
                  className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                >
                  {ALL_EXPRESSIONS.map((exp) => (
                    <option key={exp.id} value={exp.id}>
                      {exp.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold block mb-1">الوضعية</label>
                <select
                  value={newTriggerForm.pose}
                  onChange={(e) => setNewTriggerForm({ ...newTriggerForm, pose: e.target.value as any })}
                  className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
                >
                  {ALL_POSES.map((pose) => (
                    <option key={pose.id} value={pose.id}>
                      {pose.nameAr}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold block mb-1">رسالة التفاعل (عربي)</label>
              <input
                type="text"
                value={newTriggerForm.message}
                onChange={(e) => setNewTriggerForm({ ...newTriggerForm, message: e.target.value })}
                placeholder="كلام زو عند هذا الحدث..."
                className="w-full p-2 text-xs rounded-xl bg-slate-100 dark:bg-[#041728] border border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3">
              <Button variant="outline" size="sm" onClick={() => setNewTriggerModalOpen(false)}>
                إلغاء
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  addDraftTrigger(activeStudioPageId, newTriggerForm);
                  setNewTriggerModalOpen(false);
                  toast.success('تمت إضافة التفاعل بنجاح');
                }}
                className="bg-[#07345C] hover:bg-[#052644] text-white dark:bg-[#0866C6] dark:hover:bg-[#0A74DC] font-bold shadow-md transition-all"
              >
                إضافة
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
