'use client';

import React, { useEffect, useState } from 'react';
import { useMediaStore } from '@/store/useMediaStore';
import { MediaUploadZone } from '@/components/media/MediaUploadZone';
import {
  HardDrive,
  Image as ImageIcon,
  Film,
  Search,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Plus,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { toast } from 'sonner';
import { CleanzoImage } from '@/components/common/CleanzoImage';

export default function AdminMediaPage() {
  const {
    items,
    isLoading,
    activeFilter,
    searchQuery,
    stats,
    setFilter,
    setSearchQuery,
    fetchMedia,
    deleteMediaItem,
  } = useMediaStore();

  const [showUploadDrawer, setShowUploadDrawer] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    fetchMedia();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
  };

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast.success('تم نسخ رابط الوسائط إلى الحافظة');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`هل أنت متأكد من رغبتك في حذف الملف "${name}"؟`)) {
      const ok = await deleteMediaItem(id);
      if (ok) {
        toast.success(`تم حذف "${name}" بنجاح`);
      } else {
        toast.error('فشل حذف الملف');
      }
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <HardDrive className="w-6 h-6 sm:w-7 sm:h-7 text-[#0866C6] dark:text-sky-400" />
            مكتبة الوسائط الموحدة
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            إدارة الصور والفيديوهات المركزية للنظام بالكامل مع دعم الرفع من الجهاز والاستيراد الآمن
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchMedia()}
            className="p-2.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition border border-slate-200 dark:border-slate-700 shadow-xs cursor-pointer"
            title="تحديث القائمة"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-[#0866C6] dark:text-sky-400' : ''}`} />
          </button>
          <button
            onClick={() => setShowUploadDrawer(!showUploadDrawer)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#0866C6] hover:bg-[#07345C] text-white font-bold rounded-xl text-xs sm:text-sm transition shadow-md shadow-[#0866C6]/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showUploadDrawer ? 'إغلاق نافذة الرفع' : 'رفع وسائط جديدة'}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-[#0866C6]/10 dark:bg-[#0866C6]/20 border border-[#0866C6]/20 text-[#0866C6] dark:text-sky-400">
            <FolderOpen className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">إجمالي الوسائط</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.totalItems}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">الصور المخزنة</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.imagesCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 text-purple-600 dark:text-purple-400">
            <Film className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">الفيديوهات</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{stats.videosCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
          <div className="p-3 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 text-amber-600 dark:text-amber-400">
            <HardDrive className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">الحجم الإجمالي</p>
            <p className="text-xl font-black text-slate-900 dark:text-white mt-0.5 font-mono">
              {formatBytes(stats.totalBytes)}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Upload Panel (Expandable) */}
      {showUploadDrawer && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-[#0866C6]/30 shadow-lg dark:shadow-xl animate-in slide-in-from-top-4 duration-200">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#0866C6] dark:text-sky-400" />
            رفع ملف جديد أو استيراد من رابط خارجي
          </h3>
          <MediaUploadZone
            onChange={(url, item) => {
              if (url && item) {
                setShowUploadDrawer(false);
                fetchMedia();
              }
            }}
            accept="both"
          />
        </div>
      )}

      {/* Controls Bar: Search + Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-xs">
        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/70 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeFilter === 'all'
                ? 'bg-[#0866C6] text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            الكل ({stats.totalItems})
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeFilter === 'image'
                ? 'bg-[#0866C6] text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            الصور ({stats.imagesCount})
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition ${
              activeFilter === 'video'
                ? 'bg-[#0866C6] text-white font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            الفيديوهات ({stats.videosCount})
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="ابحث باسم الملف أو الامتداد..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0866C6] transition"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </form>
      </div>

      {/* Media Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400 dark:text-slate-500">
          <div className="w-10 h-10 border-2 border-[#0866C6] border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm">جاري تحميل وسائط النظام...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-center shadow-xs">
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-slate-800/60 border border-sky-100 dark:border-slate-700/50 text-[#0866C6] dark:text-sky-400 mb-3">
            <HardDrive className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">لا توجد وسائط بعد</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
            يمكنك رفع صور وفيديوهات من جهازك أو استيرادها مباشرة من الروابط الخارجية لتكون متاحة عبر كل أجزاء الموقع.
          </p>
          <button
            onClick={() => setShowUploadDrawer(true)}
            className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#0866C6] hover:bg-[#07345C] text-white font-bold rounded-xl text-xs transition shadow-xs"
          >
            <Plus className="w-4 h-4" />
            رفع أول ملف الآن
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => {
            const isCopied = copiedId === item.id;
            return (
              <div
                key={item.id}
                className="group relative rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900/70 overflow-hidden shadow-xs hover:shadow-md transition duration-200 hover:border-slate-300 dark:hover:border-slate-600 flex flex-col"
              >
                {/* Media Preview Box - Fixed 1:1 Square Ratio */}
                <div className="relative aspect-square w-full bg-slate-100 dark:bg-slate-950 overflow-hidden flex items-center justify-center">
                  {item.type === 'video' ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">
                      <Film className="w-12 h-12 text-[#0866C6] dark:text-sky-400 mb-2" />
                      <span className="text-xs uppercase font-mono tracking-wider bg-white dark:bg-slate-950/80 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300">
                        فيديو {item.mimeType.split('/')[1] || 'MP4'}
                      </span>
                    </div>
                  ) : (
                    <CleanzoImage
                      src={item.url}
                      alt={item.originalName}
                      fit="cover"
                      position="center"
                      className="transition duration-300 group-hover:scale-105"
                    />
                  )}

                  {/* Size & Type Badges */}
                  <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none">
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-black/75 backdrop-blur-sm text-sky-400 border border-slate-800">
                      {item.type === 'video' ? 'فيديو' : 'صورة'}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md font-mono bg-black/75 backdrop-blur-sm text-slate-300 border border-slate-800">
                      {formatBytes(item.size)}
                    </span>
                  </div>

                  {item.source === 'url' && (
                    <span className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30">
                      مستورد
                    </span>
                  )}
                </div>

                {/* Details Footer */}
                <div className="p-3.5 flex-1 flex flex-col justify-between">
                  <div>
                    <h4
                      className="text-xs font-semibold text-slate-900 dark:text-slate-200 truncate"
                      title={item.originalName}
                    >
                      {item.originalName}
                    </h4>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 font-mono mt-0.5 truncate">
                      {item.url}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 mt-3 flex items-center justify-between">
                    <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
                      {item.width && item.height ? `${item.width}×${item.height}` : item.mimeType}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(item.id, item.url)}
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                        title="نسخ الرابط"
                      >
                        {isCopied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition"
                        title="فتح في نافذة جديدة"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={() => handleDelete(item.id, item.originalName)}
                        className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-500/10 dark:hover:bg-red-500/20 text-red-600 dark:text-red-400 transition"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
