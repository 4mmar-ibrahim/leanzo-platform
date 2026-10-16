'use client';

import React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Eye, ExternalLink } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';

interface CMSPreviewBannerProps {
  pageName?: string;
  section?: string;
  adminEditUrl?: string;
}

function CMSPreviewBannerContent({ pageName, section, adminEditUrl }: CMSPreviewBannerProps) {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const { locale } = useLocaleStore();
  const isAr = locale === 'ar';
  const displayName = pageName || section;

  if (!isPreview) return null;

  return (
    <div className="sticky top-0 z-50 w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-slate-950 px-4 py-2.5 shadow-md flex items-center justify-between gap-3 text-xs font-bold border-b border-amber-400">
      <div className="flex items-center gap-2 max-w-2xl">
        <span className="p-1 rounded-md bg-white/20">
          <Eye className="w-4 h-4 text-slate-950" />
        </span>
        <span>
          {isAr
            ? `وضع المعاينة لمسودة الإدارة ${displayName ? `(${displayName})` : ''} — هذا المحتوى غير ظاهر للعامة حتى تقوم بنشره.`
            : `Admin Draft Preview Mode ${displayName ? `(${displayName})` : ''} — This content is not public until published.`}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        {adminEditUrl && (
          <Link
            href={adminEditUrl}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 text-white text-[11px] hover:bg-slate-800 transition-colors shadow-xs"
          >
            <span>{isAr ? 'العودة للتعديل' : 'Edit in Admin'}</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        )}
      </div>
    </div>
  );
}

export function CMSPreviewBanner(props: CMSPreviewBannerProps) {
  return (
    <React.Suspense fallback={null}>
      <CMSPreviewBannerContent {...props} />
    </React.Suspense>
  );
}
