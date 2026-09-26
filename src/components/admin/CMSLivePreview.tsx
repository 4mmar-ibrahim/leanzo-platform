'use client';

import React, { useState } from 'react';
import { Eye, Smartphone, Monitor, X, ExternalLink, RefreshCw } from 'lucide-react';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

interface CMSLivePreviewProps {
  url: string;
  title?: string;
}

export function CMSLivePreview({ url, title = 'معاينة الصفحة المباشرة' }: CMSLivePreviewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [device, setDevice] = useState<'mobile' | 'desktop'>('desktop');
  const [key, setKey] = useState(0);

  const reloadIframe = () => {
    setKey((prev) => prev + 1);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
      >
        <Eye className="w-4 h-4 text-sky-500" />
        <span>معاينة مباشرة</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex flex-col p-4 sm:p-6 animate-in fade-in">
          {/* Header Bar */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl px-6 py-3 text-white mb-4 shadow-xl">
            <div className="flex items-center gap-3">
              <span className="font-black text-sm text-sky-400">{title}</span>
              <span className="text-xs text-slate-400 font-mono hidden sm:inline">{url}</span>
            </div>

            {/* Viewport Toggles */}
            <div className="flex items-center gap-2 bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setDevice('desktop')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  device === 'desktop'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">كمبيوتر (Desktop)</span>
              </button>

              <button
                type="button"
                onClick={() => setDevice('mobile')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  device === 'mobile'
                    ? 'bg-sky-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">جوال (Mobile)</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reloadIframe}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="إعادة تحميل المعاينة"
              >
                <RefreshCw className="w-4 h-4" />
              </button>

              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="فتح في تبويب جديد"
              >
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 transition-colors"
                title="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Iframe Viewport Container */}
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            <div
              className={`transition-all duration-300 h-full overflow-hidden bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-700 flex flex-col ${
                device === 'mobile' ? 'w-[390px] max-w-full rounded-[38px] border-4 border-slate-800' : 'w-full'
              }`}
            >
              <iframe
                key={key}
                src={url}
                title="Page Live Preview"
                className="w-full flex-1 border-0 rounded-2xl"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
