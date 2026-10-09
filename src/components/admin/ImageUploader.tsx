'use client';

import React, { useState, useRef, useCallback } from 'react';
import { useMediaStore } from '@/store/useMediaStore';
import { MediaItem } from '@/types';
import { MediaLibraryModal } from '@/components/media/MediaLibraryModal';
import {
  UploadCloud,
  Link2,
  HardDrive,
  RefreshCw,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Move,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { normalizeMediaUrl, extractDirectImageUrl } from '@/lib/utils';
import { CleanzoImage, CleanzoImageFit, CleanzoImagePosition } from '@/components/common/CleanzoImage';

export interface ImageUploaderProps {
  value?: string;
  onChange: (url: string, details?: Partial<MediaItem> & { fit?: CleanzoImageFit; position?: CleanzoImagePosition }) => void;
  label?: string;
  description?: string;
  defaultFit?: CleanzoImageFit;
  defaultPosition?: CleanzoImagePosition;
  allowFitToggle?: boolean;
  allowPosition?: boolean;
  className?: string;
  required?: boolean;
  maxSizeMB?: number;
  compact?: boolean;
}

/**
 * ImageUploader — Central Unified Admin Image Uploader
 *
 * Implements Cleanzo Global 1:1 Image Rule with:
 * - 1:1 Live Preview showing exact customer presentation
 * - Fit mode toggle: Contain (for logos, Zo, icons) vs Cover (for photos)
 * - Position selector (center, top, bottom, left, right)
 * - Device upload + URL import + Media Library modal
 * - Dimensions, size, and MIME validation
 * - Clean, eye-friendly white theme styling
 */
export function ImageUploader({
  value,
  onChange,
  label = 'صورة المحتوى',
  description = 'المقاس القياسي الموحد لكافة صور كلينزو بنسبة 1:1 مربع',
  defaultFit = 'cover',
  defaultPosition = 'center',
  allowFitToggle = true,
  allowPosition = true,
  className = '',
  required = false,
  maxSizeMB = 15,
  compact = false,
}: ImageUploaderProps) {
  const { uploadFromDevice, importFromUrl } = useMediaStore();

  const [activeTab, setActiveTab] = useState<'device' | 'url'>('device');
  const [urlInput, setUrlInput] = useState('');
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [copied, setCopied] = useState(false);

  // Display modes for 1:1 container
  const [fit, setFit] = useState<CleanzoImageFit>(defaultFit);
  const [position, setPosition] = useState<CleanzoImagePosition>(defaultPosition);
  const [metaDetails, setMetaDetails] = useState<{
    width?: number;
    height?: number;
    size?: number;
    fileName?: string;
    mimeType?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Validate and handle file upload
  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;

      // Validate MIME type
      const validMimes = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'image/svg+xml',
        'image/x-icon',
        'image/vnd.microsoft.icon',
        'image/ico',
      ];
      if (!validMimes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp|gif|svg|ico)$/i)) {
        toast.error('نوع الملف غير مدعوم. يرجى رفع صورة (JPG, PNG, WEBP, GIF, SVG, ICO)');
        return;
      }

      // Validate file size
      if (file.size > maxSizeMB * 1024 * 1024) {
        toast.error(`حجم الصورة يتجاوز الحد الأقصى المسموح به (${maxSizeMB}MB)`);
        return;
      }

      // Inspect image dimensions client-side before upload
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        setMetaDetails({
          width: img.naturalWidth,
          height: img.naturalHeight,
          size: file.size,
          fileName: file.name,
          mimeType: file.type,
        });
        URL.revokeObjectURL(objectUrl);
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
      };

      setIsUploading(true);
      try {
        const item = await uploadFromDevice(file);
        setMetaDetails({
          width: item.width || img.naturalWidth,
          height: item.height || img.naturalHeight,
          size: item.size || file.size,
          fileName: item.originalName || file.name,
          mimeType: item.mimeType || file.type,
        });
        onChange(item.url, { ...item, fit, position });
        toast.success('تم رفع الصورة بنجاح وتخزينها بنسبة 1:1');
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'فشل رفع الصورة. يرجى المحاولة مجدداً';
        toast.error(message);
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [maxSizeMB, uploadFromDevice, fit, position, onChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    },
    [handleFile]
  );

  const handleUrlSubmit = async (e?: React.SyntheticEvent, directUrlInput?: string) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const rawUrl = directUrlInput !== undefined ? directUrlInput : urlInput;
    let cleanUrl = extractDirectImageUrl(rawUrl.trim());
    if (!cleanUrl) return;

    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('data:')) {
      cleanUrl = `https://${cleanUrl}`;
    }

    setIsUploading(true);
    try {
      // 1. Try importing through backend media system for permanent local persistence
      const item = await importFromUrl(cleanUrl, 'image');
      setMetaDetails({
        width: item.width,
        height: item.height,
        size: item.size,
        fileName: item.originalName,
        mimeType: item.mimeType,
      });
      onChange(item.url, { ...item, fit, position });
      setUrlInput('');
      toast.success('تم استيراد الصورة بنجاح وتخزينها');
    } catch (err: unknown) {
      // 2. If backend fetch was blocked or failed, fallback to direct URL so user is never blocked!
      console.warn('Backend URL import failed, falling back to direct URL:', err);

      const img = new Image();
      img.referrerPolicy = 'no-referrer';
      img.src = cleanUrl;
      img.onload = () => {
        setMetaDetails({
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileName: cleanUrl.split('/').pop()?.split('?')[0] || 'remote-image',
        });
      };

      onChange(cleanUrl, { fit, position });
      setUrlInput('');
      toast.success('تم تطبيق رابط الصورة بنجاح');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLibrarySelect = (item: MediaItem) => {
    setMetaDetails({
      width: item.width,
      height: item.height,
      size: item.size,
      fileName: item.originalName,
      mimeType: item.mimeType,
    });
    onChange(item.url, { ...item, fit, position });
    toast.success('تم اختيار الصورة من المكتبة');
  };

  const handleRemove = () => {
    onChange('', undefined);
    setMetaDetails(null);
    toast.info('تمت إزالة الصورة');
  };

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(normalizeMediaUrl(value));
    setCopied(true);
    toast.success('تم نسخ رابط الصورة');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFitChange = (newFit: CleanzoImageFit) => {
    setFit(newFit);
    const details = metaDetails
      ? { ...metaDetails, fit: newFit, position }
      : { fit: newFit, position };
    onChange(value || '', details);
  };

  const handlePositionChange = (newPos: CleanzoImagePosition) => {
    setPosition(newPos);
    const details = metaDetails
      ? { ...metaDetails, fit, position: newPos }
      : { fit, position: newPos };
    onChange(value || '', details);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header Label & Media Library Quick Trigger */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-slate-800 dark:text-slate-100">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {description && (
            <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
          )}
        </div>

        <button
          type="button"
          onClick={() => setIsLibraryOpen(true)}
          className="inline-flex items-center gap-1.5 text-xs text-[#0866C6] hover:text-[#06529E] font-bold transition cursor-pointer"
        >
          <HardDrive className="w-3.5 h-3.5" />
          <span>مكتبة الوسائط</span>
        </button>
      </div>

      {/* Hidden Native File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml,image/x-icon,image/vnd.microsoft.icon,.ico"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
          }
        }}
        className="hidden"
      />

      {/* When Image Exists: 1:1 Live Preview + Controls */}
      {value ? (
        <div className={`rounded-2xl border border-slate-200 dark:border-[#133B61] bg-slate-50/50 dark:bg-[#072540]/60 ${compact ? 'p-3' : 'p-4'} shadow-2xs`}>
          <div className={compact ? 'flex flex-col items-center gap-3.5 w-full' : 'flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5'}>
            {/* 1:1 Preview Box (Exact Website Scale) */}
            <div className="flex flex-col items-center shrink-0">
              <div className={`relative ${compact ? 'w-32 h-32 sm:w-36 sm:h-36' : 'w-36 h-36 sm:w-44 sm:h-44'} rounded-2xl overflow-hidden border-2 border-slate-200/90 dark:border-[#133B61] shadow-xs bg-white dark:bg-[#041728]`}>
                <CleanzoImage
                  src={value}
                  alt="1:1 Preview"
                  fit={fit}
                  position={position}
                  containerClassName="!bg-transparent"
                  priority
                />

                {/* 1:1 Mode Badge */}
                <div className="absolute top-2 start-2 z-20 flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-black bg-black/75 backdrop-blur-sm text-sky-400 border border-white/20">
                    1:1 مربع
                  </span>
                  <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#0866C6] text-white">
                    {fit === 'contain' ? 'احتواء' : 'تغطية'}
                  </span>
                </div>
              </div>

              <span className="text-[10px] text-slate-400 mt-1.5 font-medium text-center">
                معاينة بنسبة 1:1 مطابقة لواجهة الموقع
              </span>
            </div>

            {/* Image Details & Display Fit/Position Controls */}
            <div className="flex-1 min-w-0 w-full space-y-3 text-right">
              {/* Fit Mode Toggle */}
              {allowFitToggle && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5 text-[#0866C6] dark:text-sky-400" />
                    <span>نمط احتواء الصورة (Display Fit)</span>
                  </label>
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-white dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] gap-1">
                    <button
                      type="button"
                      onClick={() => handleFitChange('cover')}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                        fit === 'cover'
                          ? 'bg-sky-50 dark:bg-[#072540] text-[#0866C6] dark:text-[#38BDF8] shadow-xs border border-sky-200 dark:border-sky-800/60'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      تغطية (Cover)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleFitChange('contain')}
                      className={`w-full px-2.5 py-1.5 rounded-lg text-xs font-bold transition text-center cursor-pointer ${
                        fit === 'contain'
                          ? 'bg-sky-50 dark:bg-[#072540] text-[#0866C6] dark:text-[#38BDF8] shadow-xs border border-sky-200 dark:border-sky-800/60'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      احتواء (Contain)
                    </button>
                  </div>
                </div>
              )}

              {/* Position selector when Cover is active */}
              {allowPosition && fit === 'cover' && (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
                    <Move className="w-3.5 h-3.5 text-[#0866C6] dark:text-sky-400" />
                    <span>نقطة التركيز (Object Position)</span>
                  </label>
                  <div className={`flex flex-wrap gap-1.5 text-xs ${compact ? 'justify-center' : ''}`}>
                    {(['center', 'top', 'bottom', 'right', 'left'] as CleanzoImagePosition[]).map((pos) => {
                      const labels: Record<CleanzoImagePosition, string> = compact
                        ? { center: 'وسط', top: 'أعلى', bottom: 'أسفل', right: 'يمين', left: 'يسار' }
                        : { center: 'وسط (Center)', top: 'أعلى (Top)', bottom: 'أسفل (Bottom)', right: 'يمين (Right)', left: 'يسار (Left)' };
                      return (
                        <button
                          key={pos}
                          type="button"
                          onClick={() => handlePositionChange(pos)}
                          className={`px-2.5 py-1 rounded-lg font-medium text-[11px] border transition cursor-pointer ${compact ? 'flex-1 min-w-[40px] text-center' : ''} ${
                            position === pos
                              ? 'bg-[#0866C6] text-white border-[#0866C6] font-bold'
                              : 'bg-white dark:bg-[#041728] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-[#133B61] hover:bg-slate-50 dark:hover:bg-[#0A2E50]'
                          }`}
                        >
                          {labels[pos]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Image Metadata Bar */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-[#041728] border border-slate-200 dark:border-[#133B61] space-y-1 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2 truncate">
                  <span className="text-slate-400 shrink-0 font-sans">الرابط:</span>
                  <span className="truncate flex-1 text-slate-700 dark:text-slate-200 text-left font-mono" dir="ltr" title={normalizeMediaUrl(value)}>
                    {normalizeMediaUrl(value)}
                  </span>
                </div>
                {metaDetails && (
                  <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-[#133B61]/60 font-sans">
                    {metaDetails.width && metaDetails.height && (
                      <span>الأبعاد: <strong className="font-mono">{metaDetails.width}×{metaDetails.height}px</strong></span>
                    )}
                    {metaDetails.size && (
                      <span>• الحجم: <strong className="font-mono">{(metaDetails.size / (1024 * 1024)).toFixed(2)} MB</strong></span>
                    )}
                    {metaDetails.mimeType && (
                      <span>• النوع: <strong className="font-mono">{metaDetails.mimeType.replace('image/', '').toUpperCase()}</strong></span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons: Replace, Copy, View, Delete */}
              <div className={compact ? 'grid grid-cols-2 gap-1.5 pt-1 w-full' : 'flex flex-wrap items-center gap-2 pt-1'}>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 dark:bg-[#0A2E50] dark:hover:bg-[#103E6B] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#133B61] shadow-2xs transition cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-[#0866C6] dark:text-sky-400" />
                  <span>تغيير الصورة</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopy}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-100 dark:bg-[#0A2E50] dark:hover:bg-[#103E6B] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#133B61] shadow-2xs transition cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
                </button>

                <a
                  href={normalizeMediaUrl(value)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white hover:bg-slate-100 dark:bg-[#0A2E50] dark:hover:bg-[#103E6B] text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-[#133B61] shadow-2xs transition cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  <span>عرض بالحجم الكامل</span>
                </a>

                <button
                  type="button"
                  onClick={handleRemove}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/60 transition cursor-pointer ${compact ? '' : 'mr-auto'}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>إزالة</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State / Upload Zone */
        <div className="rounded-2xl border border-slate-200 dark:border-[#133B61] bg-white dark:bg-[#072540] overflow-hidden shadow-2xs">
          {/* Tabs: Device vs URL */}
          <div className="flex border-b border-slate-100 dark:border-[#133B61] bg-slate-50/60 dark:bg-[#041728] p-1">
            <button
              type="button"
              onClick={() => setActiveTab('device')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'device'
                  ? 'bg-white dark:bg-[#072540] text-[#0866C6] dark:text-[#38BDF8] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>رفع من الجهاز (1:1)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'url'
                  ? 'bg-white dark:bg-[#072540] text-[#0866C6] dark:text-[#38BDF8] shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Link2 className="w-4 h-4" />
              <span>رابط خارجي</span>
            </button>
          </div>

          <div className="p-5">
            {activeTab === 'device' ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center transition cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                  isDragging
                    ? 'border-[#0866C6] bg-sky-50/50 dark:bg-[#0866C6]/10'
                    : 'border-slate-200 dark:border-[#133B61] hover:border-[#0866C6]/60 hover:bg-slate-50/50 dark:hover:bg-[#041728]'
                }`}
              >
                {isUploading ? (
                  <div className="py-4 flex flex-col items-center gap-2 text-slate-500 dark:text-slate-400">
                    <Loader2 className="w-8 h-8 animate-spin text-[#0866C6] dark:text-sky-400" />
                    <p className="text-xs font-bold">جاري رفع وحفظ الصورة...</p>
                  </div>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-[#0A2E50] text-[#0866C6] dark:text-sky-400 flex items-center justify-center shadow-2xs">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-white">
                        اضغط لرفع الصورة أو اسحبها وأفلتها هنا
                      </p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        JPG, PNG, WEBP, GIF (حتى {maxSizeMB}MB) • المقاس القياسي 1:1
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        e.stopPropagation();
                        handleUrlSubmit(e);
                      }
                    }}
                    placeholder="https://example.com/image.jpg"
                    dir="ltr"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#133B61] bg-white dark:bg-[#041728] text-xs font-mono text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0866C6]"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleUrlSubmit(e);
                    }}
                    disabled={isUploading || !urlInput.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#06529E] disabled:opacity-50 text-white text-xs font-bold transition cursor-pointer flex items-center justify-center min-w-[75px]"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'استيراد'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  سيتم استيراد الصورة وتخزينها محلياً وعرضها بنسبة 1:1 مطابقة للهوية
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Media Library Selection Modal */}
      <MediaLibraryModal
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelect={handleLibrarySelect}
        filterType="image"
        selectedUrl={value}
      />
    </div>
  );
}

export default ImageUploader;
