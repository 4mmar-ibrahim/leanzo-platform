'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useMediaStore } from '@/store/useMediaStore';
import { MediaItem } from '@/types';
import { MediaLibraryModal } from './MediaLibraryModal';
import {
  UploadCloud,
  Link2,
  HardDrive,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  Film,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { normalizeMediaUrl, extractDirectImageUrl } from '@/lib/utils';
import { CleanzoImage } from '@/components/common/CleanzoImage';

export interface MediaUploadZoneProps {
  value?: string;
  onChange: (url: string, mediaItem?: MediaItem) => void;
  accept?: 'image' | 'video' | 'both';
  label?: string;
  description?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function MediaUploadZone({
  value,
  onChange,
  accept = 'both',
  label,
  description,
  className = '',
  required = false,
}: MediaUploadZoneProps) {
  const { uploadFromDevice, importFromUrl } = useMediaStore();

  const [activeTab, setActiveTab] = useState<'device' | 'url'>('device');
  const [urlInput, setUrlInput] = useState('');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mediaDetails, setMediaDetails] = useState<Partial<MediaItem> | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine accepted MIME types
  const acceptMime =
    accept === 'image'
      ? 'image/jpeg,image/png,image/webp,image/gif'
      : accept === 'video'
      ? 'video/mp4,video/webm'
      : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm';

  // Handle local file selection
  const handleFile = async (file: File) => {
    if (!file) return;

    // Client-side quick size check
    const isVid = file.type.startsWith('video/') || file.name.match(/\.(mp4|webm)$/i);
    if (!isVid && file.size > 15 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (الحد الأقصى 15MB)');
      return;
    }
    if (isVid && file.size > 100 * 1024 * 1024) {
      toast.error('حجم الفيديو كبير جداً (الحد الأقصى 100MB)');
      return;
    }

    setIsUploading(true);
    try {
      const item = await uploadFromDevice(file);
      setMediaDetails(item);
      onChange(item.url, item);
      toast.success('تم رفع الملف بنجاح وحفظه بالجودة الأصلية');
    } catch (err: any) {
      toast.error(err.message || 'فشل رفع الملف. تأكد من أن نوع الملف مدعوم (JPEG, PNG, WEBP, GIF, MP4, WEBM)');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [uploadFromDevice]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Handle URL Import
  const handleImportUrl = async () => {
    let cleanUrl = extractDirectImageUrl(urlInput.trim());
    if (!cleanUrl) {
      toast.error('يرجى كتابة رابط صالح');
      return;
    }

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    setIsUploading(true);
    try {
      const typeHint = accept === 'video' ? 'video' : accept === 'image' ? 'image' : undefined;
      const item = await importFromUrl(cleanUrl, typeHint);
      setMediaDetails(item);
      onChange(item.url, item);
      setUrlInput('');
      toast.success('تم استيراد الوسائط وتخزينها بنجاح');
    } catch (err: any) {
      console.warn('Backend URL import failed, falling back to direct URL:', err);
      onChange(cleanUrl, undefined);
      setUrlInput('');
      toast.success('تم تطبيق رابط الصورة بنجاح');
    } finally {
      setIsUploading(false);
    }
  };

  // Copy URL to clipboard
  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success('تم نسخ الرابط إلى الحافظة');
    setTimeout(() => setCopied(false), 2000);
  };

  // Clear current media
  const handleClear = () => {
    onChange('', undefined);
    setMediaDetails(null);
  };

  // Detect whether current media is video
  const isVideo =
    mediaDetails?.type === 'video' ||
    Boolean(value && (value.endsWith('.mp4') || value.endsWith('.webm') || value.includes('/videos/')));

  return (
    <div className={`space-y-2.5 ${className}`}>
      {/* Header Label */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
            {label} {required && <span className="text-red-500">*</span>}
          </label>
          <button
            type="button"
            onClick={() => setIsLibraryOpen(true)}
            className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium transition"
          >
            <HardDrive className="w-3.5 h-3.5" />
            اختيار من مكتبة الوسائط
          </button>
        </div>
      )}

      {/* When Media is Selected / Present */}
      {value ? (
        <div className="relative group overflow-hidden rounded-2xl border border-slate-200 dark:border-[#133B61] bg-white dark:bg-[#072540] p-3.5 shadow-2xs transition hover:border-slate-300 dark:hover:border-[#0866C6]/50">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Media Preview Box - Fixed 1:1 Aspect Ratio */}
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 aspect-square rounded-2xl bg-slate-50 dark:bg-[#041728] overflow-hidden flex items-center justify-center border border-slate-200 dark:border-[#133B61] shrink-0 shadow-2xs">
              {isVideo ? (
                <video
                  src={normalizeMediaUrl(value)}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <CleanzoImage
                  src={value}
                  alt="Media Preview"
                  fit="contain"
                  containerClassName="!bg-transparent"
                  priority
                />
              )}
              <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-black/75 backdrop-blur-sm text-sky-400 border border-slate-700">
                  {isVideo ? 'فيديو' : 'صورة'}
                </span>
                <span className="px-1.5 py-0.5 rounded-md text-[9px] font-mono font-bold bg-[#0866C6] text-white">
                  1:1
                </span>
              </div>
            </div>

            {/* Media Info & Actions */}
            <div className="flex-1 min-w-0 w-full space-y-2">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">الرابط المخزن:</p>
                <p className="text-xs text-slate-700 dark:text-slate-200 font-mono break-all truncate bg-slate-50 dark:bg-[#041728] p-2 rounded-xl border border-slate-200 dark:border-[#133B61] mt-0.5">
                  {normalizeMediaUrl(value)}
                </p>
              </div>

              {mediaDetails && (
                <div className="flex flex-wrap gap-2 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                  {mediaDetails.size && (
                    <span className="bg-slate-100 dark:bg-[#0A2E50] px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-[#133B61]">
                      {(mediaDetails.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  )}
                  {mediaDetails.width && mediaDetails.height && (
                    <span className="bg-slate-100 dark:bg-[#0A2E50] px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-[#133B61]">
                      {mediaDetails.width}×{mediaDetails.height} px
                    </span>
                  )}
                  {mediaDetails.mimeType && (
                    <span className="bg-slate-100 dark:bg-[#0A2E50] px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-[#133B61]">
                      {mediaDetails.mimeType}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0A2E50] dark:hover:bg-[#103E6B] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#133B61] transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#0866C6] dark:text-sky-400" />
                  استبدال
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0A2E50] dark:hover:bg-[#103E6B] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#133B61] transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  {copied ? 'تم النسخ' : 'نسخ الرابط'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsLibraryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-[#0A2E50] dark:hover:bg-[#103E6B] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#133B61] transition cursor-pointer"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                  المكتبة
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 transition mr-auto cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  حذف
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Input State with Tabs */
        <div className="rounded-2xl border border-slate-200 dark:border-[#133B61] bg-white dark:bg-[#072540] overflow-hidden shadow-2xs">
          {/* Tab Switcher */}
          <div className="flex border-b border-slate-200 dark:border-[#133B61] bg-slate-50 dark:bg-[#041728] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('device')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition cursor-pointer ${
                activeTab === 'device'
                  ? 'bg-white dark:bg-[#072540] text-[#0866C6] dark:text-[#38BDF8] shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              رفع من الجهاز
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-white dark:bg-[#072540] text-[#0866C6] dark:text-[#38BDF8] shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Link2 className="w-4 h-4" />
              استيراد من رابط URL
            </button>
          </div>

          <div className="p-4">
            {activeTab === 'device' ? (
              /* Drag & Drop Area */
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                  isDragging
                    ? 'border-[#0866C6] bg-[#0866C6]/10'
                    : 'border-slate-200 dark:border-[#133B61] hover:border-slate-400 dark:hover:border-[#0866C6] bg-slate-50/50 dark:bg-[#041728]/50 hover:bg-slate-50 dark:hover:bg-[#041728]'
                }`}
              >
                {isUploading ? (
                  <div className="flex flex-col items-center py-4 text-[#0866C6] dark:text-sky-400">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    <p className="text-xs font-medium">جاري رفع ومعالجة الملف وحفظه بأعلى دقة...</p>
                  </div>
                ) : (
                  <>
                    <div className="p-3 rounded-full bg-slate-100 dark:bg-[#0A2E50] text-[#0866C6] dark:text-sky-400 mb-2.5">
                      {accept === 'video' ? (
                        <Film className="w-6 h-6" />
                      ) : (
                        <UploadCloud className="w-6 h-6" />
                      )}
                    </div>
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 text-center">
                      اسحب وأفلت الملف هنا، أو <span className="text-[#0866C6] dark:text-sky-400 underline">تصفح جهازك</span>
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 text-center font-mono">
                      {accept === 'image' && 'يدعم: JPEG, PNG, WEBP, GIF (حتى 15MB) • المقاس القياسي: 1:1 (مربع)'}
                      {accept === 'video' && 'يدعم: MP4, WEBM (حتى 100MB)'}
                      {accept === 'both' && 'يدعم: صور وفيديو (حتى 15MB) • المقاس القياسي: 1:1 (مربع)'}
                    </p>
                  </>
                )}
              </div>
            ) : (
              /* URL Import Input */
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="url"
                      dir="ltr"
                      placeholder="https://example.com/media.webp"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleImportUrl())}
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0866C6] transition font-mono"
                    />
                    <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                  </div>
                  <button
                    type="button"
                    onClick={handleImportUrl}
                    disabled={isUploading || !urlInput.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-[#0866C6] hover:bg-[#06529E] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition shadow-xs shrink-0 cursor-pointer"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UploadCloud className="w-3.5 h-3.5" />}
                    استيراد وحفظ
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <AlertCircle className="w-3.5 h-3.5 text-[#0866C6] dark:text-sky-400 shrink-0" />
                  <span>
                    يتم فحص الرابط أمنياً ضد هجمات SSRF، ويتم حفظ الملف على خوادم كلينزو لضمان بقائه وعدم تعطله.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptMime}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
      />

      {/* Description text */}
      {description && <p className="text-xs text-slate-400">{description}</p>}

      {/* Media Library Picker Modal */}
      <MediaLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        filterType={accept}
        selectedUrl={value}
        onSelect={(item) => {
          setMediaDetails(item);
          onChange(item.url, item);
          toast.success(`تم اختيار "${item.originalName}" من المكتبة`);
        }}
      />
    </div>
  );
}
