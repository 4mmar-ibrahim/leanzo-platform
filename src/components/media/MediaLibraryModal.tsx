'use client';

import React, { useEffect, useState } from 'react';
import { useMediaStore } from '@/store/useMediaStore';
import { MediaItem } from '@/types';
import {
  X,
  Search,
  Image as ImageIcon,
  Film,
  Check,
  HardDrive,
  Trash2,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { toast } from 'sonner';
import { CleanzoImage } from '@/components/common/CleanzoImage';

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: MediaItem) => void;
  filterType?: 'image' | 'video' | 'both';
  selectedUrl?: string;
}

export function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  filterType = 'both',
  selectedUrl,
}: MediaLibraryModalProps) {
  const {
    items,
    isLoading,
    activeFilter,
    searchQuery,
    setFilter,
    setSearchQuery,
    fetchMedia,
    deleteMediaItem,
  } = useMediaStore();

  const [localSearch, setLocalSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (filterType === 'image') setFilter('image');
      else if (filterType === 'video') setFilter('video');
      else setFilter('all');
      fetchMedia();
    }
  }, [isOpen, filterType]);

  if (!isOpen) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchQuery(localSearch);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-5xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/70 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-[#0866C6]/15 border border-sky-100 dark:border-[#0866C6]/30 text-[#0866C6] dark:text-sky-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">مكتبة الوسائط المركزية</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">اختر وسائط من الملفات المخزنة مسبقاً في النظام</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar: Search + Filter */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-3 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/50">
          {/* Filters */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeFilter === 'all'
                  ? 'bg-[#0866C6] text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              الكل
            </button>
            <button
              onClick={() => setFilter('image')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeFilter === 'image'
                  ? 'bg-[#0866C6] text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              صور
            </button>
            <button
              onClick={() => setFilter('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                activeFilter === 'video'
                  ? 'bg-[#0866C6] text-white font-bold shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              فيديوهات
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
            <input
              type="text"
              placeholder="ابحث باسم الملف..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-[#0866C6] transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          </form>
        </div>

        {/* Media Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-500">
              <div className="w-10 h-10 border-2 border-[#0866C6] border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm">جاري تحميل الوسائط...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/50 text-slate-400 mb-3">
                <ImageIcon className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">لا توجد وسائط مطابقة</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm">
                لم يتم العثور على ملفات وسائط مطابقة للبحث أو التصفية الحالية.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {items.map((item) => {
                const isSelected = selectedUrl === item.url;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelect(item);
                      onClose();
                    }}
                    className={`group relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-md ${
                      isSelected
                        ? 'border-[#0866C6] ring-2 ring-[#0866C6]/30 bg-sky-50/50 dark:bg-slate-800/60'
                        : 'border-slate-200 dark:border-slate-700/60 hover:border-slate-400 dark:hover:border-slate-500 bg-white dark:bg-slate-800/40'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="aspect-square w-full bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative overflow-hidden">
                      {item.type === 'video' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400">
                          <Film className="w-10 h-10 text-[#0866C6] dark:text-sky-400 mb-1" />
                          <span className="text-[10px] uppercase font-mono tracking-wider bg-white dark:bg-slate-950/80 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
                            فيديو {item.mimeType.split('/')[1] || 'MP4'}
                          </span>
                        </div>
                      ) : (
                        <CleanzoImage
                          src={item.url}
                          alt={item.originalName}
                          fit="cover"
                          position="center"
                          className="transition-transform duration-300 group-hover:scale-105"
                        />
                      )}

                      {/* Selected Badge */}
                      {isSelected && (
                        <div className="absolute top-2 right-2 p-1.5 rounded-full bg-[#0866C6] text-white shadow-md">
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      )}

                      {/* Type Pill */}
                      <span className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-slate-300 font-mono">
                        {formatBytes(item.size)}
                      </span>
                    </div>

                    {/* Metadata Footer */}
                    <div className="p-2.5">
                      <p
                        className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate"
                        title={item.originalName}
                      >
                        {item.originalName}
                      </p>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 mt-1 font-mono">
                        <span>
                          {item.width && item.height ? `${item.width}×${item.height}` : item.type}
                        </span>
                        <span className="text-[#0866C6] dark:text-sky-400/80 font-sans">
                          {item.source === 'url' ? 'رابط' : 'جهاز'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 text-xs text-slate-500 dark:text-slate-400">
          <span>إجمالي الملفات: {items.length}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-white font-medium transition"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
}
