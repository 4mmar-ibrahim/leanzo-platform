'use client';

import React from 'react';
import { SocialPlatformKey, SocialLinkItem, CMSSocialLinks } from '@/types';
import { Globe } from 'lucide-react';

export interface PlatformMeta {
  key: SocialPlatformKey;
  nameAr: string;
  nameEn: string;
  brandColor: string;
  hoverBg: string;
  brandGradient?: string;
  placeholder: string;
}

export const PLATFORMS_META: Record<SocialPlatformKey, PlatformMeta> = {
  whatsapp: {
    key: 'whatsapp',
    nameAr: 'واتساب',
    nameEn: 'WhatsApp',
    brandColor: '#25D366',
    hoverBg: 'hover:bg-[#25D366]',
    placeholder: 'https://wa.me/201012345678 أو 201012345678',
  },
  facebook: {
    key: 'facebook',
    nameAr: 'فيسبوك',
    nameEn: 'Facebook',
    brandColor: '#1877F2',
    hoverBg: 'hover:bg-[#1877F2]',
    placeholder: 'https://facebook.com/cleanzo.app',
  },
  instagram: {
    key: 'instagram',
    nameAr: 'إنستجرام',
    nameEn: 'Instagram',
    brandColor: '#E4405F',
    brandGradient: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)',
    hoverBg: 'hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888]',
    placeholder: 'https://instagram.com/cleanzo.app',
  },
  tiktok: {
    key: 'tiktok',
    nameAr: 'تيك توك',
    nameEn: 'TikTok',
    brandColor: '#000000',
    hoverBg: 'hover:bg-black',
    placeholder: 'https://tiktok.com/@cleanzo.app',
  },
  youtube: {
    key: 'youtube',
    nameAr: 'يوتيوب',
    nameEn: 'YouTube',
    brandColor: '#FF0000',
    hoverBg: 'hover:bg-[#FF0000]',
    placeholder: 'https://youtube.com/@cleanzo',
  },
  twitter: {
    key: 'twitter',
    nameAr: 'منصة X (تويتر)',
    nameEn: 'X (Twitter)',
    brandColor: '#0F1419',
    hoverBg: 'hover:bg-[#000000]',
    placeholder: 'https://twitter.com/cleanzo_app أو https://x.com/cleanzo_app',
  },
  linkedin: {
    key: 'linkedin',
    nameAr: 'لينكد إن',
    nameEn: 'LinkedIn',
    brandColor: '#0A66C2',
    hoverBg: 'hover:bg-[#0A66C2]',
    placeholder: 'https://linkedin.com/company/cleanzo',
  },
  snapchat: {
    key: 'snapchat',
    nameAr: 'سناب شات',
    nameEn: 'Snapchat',
    brandColor: '#FFFC00',
    hoverBg: 'hover:bg-[#FFFC00]',
    placeholder: 'https://snapchat.com/add/cleanzo',
  },
  telegram: {
    key: 'telegram',
    nameAr: 'تيليجرام',
    nameEn: 'Telegram',
    brandColor: '#229ED9',
    hoverBg: 'hover:bg-[#229ED9]',
    placeholder: 'https://t.me/cleanzo',
  },
  threads: {
    key: 'threads',
    nameAr: 'ثريدز (Threads)',
    nameEn: 'Threads',
    brandColor: '#000000',
    hoverBg: 'hover:bg-black',
    placeholder: 'https://threads.net/@cleanzo',
  },
  pinterest: {
    key: 'pinterest',
    nameAr: 'بينترست',
    nameEn: 'Pinterest',
    brandColor: '#BD081C',
    hoverBg: 'hover:bg-[#BD081C]',
    placeholder: 'https://pinterest.com/cleanzo',
  },
  custom: {
    key: 'custom',
    nameAr: 'رابط مخصص',
    nameEn: 'Custom Link',
    brandColor: '#0284C7',
    hoverBg: 'hover:bg-sky-600',
    placeholder: 'https://yourlink.com',
  },
};

interface SocialBrandIconProps {
  platform: SocialPlatformKey | string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  colored?: boolean;
}

export function SocialBrandIcon({
  platform,
  size = 'md',
  className = '',
  colored = false,
}: SocialBrandIconProps) {
  const sizeMap = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const dim = sizeMap[size] || sizeMap.md;
  const key = (platform?.toLowerCase() || 'custom') as SocialPlatformKey;

  switch (key) {
    case 'facebook':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#1877F2' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      );

    case 'instagram':
      if (colored) {
        return (
          <svg viewBox="0 0 24 24" className={`${dim} ${className}`}>
            <defs>
              <radialGradient id="igGradient" r="150%" cx="30%" cy="107%">
                <stop stopColor="#fdf497" offset="0%" />
                <stop stopColor="#fdf497" offset="5%" />
                <stop stopColor="#fd5949" offset="45%" />
                <stop stopColor="#d6249f" offset="60%" />
                <stop stopColor="#285AEB" offset="90%" />
              </radialGradient>
            </defs>
            <path
              fill="url(#igGradient)"
              d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
            />
          </svg>
        );
      }
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`${dim} ${className}`}
        >
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
        </svg>
      );

    case 'whatsapp':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#25D366' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      );

    case 'tiktok':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#000000' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
        </svg>
      );

    case 'youtube':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#FF0000' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
      );

    case 'twitter':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#000000' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );

    case 'linkedin':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#0A66C2' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
        </svg>
      );

    case 'snapchat':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#FFFC00' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M12.007 0C6.398 0 4.152 4.092 4.152 6.554c0 1.542.417 3.328 1.488 4.298-.242.825-.992 1.34-1.895 1.428-.43.042-.647.265-.647.476 0 .285.344.52.887.65 1.52.366 2.378.892 2.656 1.62.247.649-.133 1.583-1.636 2.502-.454.278-.667.575-.667.876 0 .546.684.978 2.054 1.298 1.05.245 2.193.393 3.393.393.208 0 .413-.005.617-.015.549.444 1.365.918 2.296.918.932 0 1.748-.474 2.297-.918.204.01.409.015.617.015 1.2 0 2.343-.148 3.393-.393 1.37-.32 2.054-.752 2.054-1.298 0-.301-.213-.598-.667-.876-1.503-.919-1.883-1.853-1.636-2.502.278-.728 1.136-1.254 2.656-1.62.543-.13.887-.365.887-.65 0-.211-.217-.434-.647-.476-.903-.088-1.653-.603-1.895-1.428 1.071-.97 1.488-2.756 1.488-4.298C19.862 4.092 17.616 0 12.007 0z" />
        </svg>
      );

    case 'telegram':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#229ED9' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.939z" />
        </svg>
      );

    case 'threads':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#000000' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M12.186 24C5.454 24 0 18.597 0 11.93 0 5.263 5.454 0 12.186 0c6.643 0 11.99 5.21 12.064 11.758h-3.326c-.073-4.707-3.92-8.432-8.738-8.432-4.907 0-8.86 3.906-8.86 8.604 0 4.698 3.953 8.604 8.86 8.604 3.738 0 6.945-2.27 8.261-5.545-1.077-.492-2.348-.778-3.702-.778-4.417 0-7.394 2.766-7.394 6.095 0 3.242 2.825 5.548 6.438 5.548 3.197 0 5.867-1.877 6.892-4.664.81.446 1.748.71 2.753.757C23.953 20.342 18.72 24 12.186 24zm-.397-6.022c-2.152 0-3.791-1.31-3.791-3.084 0-1.745 1.639-3.056 3.791-3.056 1.109 0 2.146.363 2.955.996-.452 3.167-1.895 5.144-2.955 5.144z" />
        </svg>
      );

    case 'pinterest':
      return (
        <svg
          viewBox="0 0 24 24"
          fill={colored ? '#BD081C' : 'currentColor'}
          className={`${dim} ${className}`}
        >
          <path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345-.09.375-.291 1.199-.332 1.357-.053.211-.174.256-.402.155-1.503-.699-2.442-2.895-2.442-4.662 0-3.796 2.758-7.284 7.954-7.284 4.178 0 7.425 2.977 7.425 6.956 0 4.152-2.617 7.494-6.25 7.494-1.22 0-2.368-.635-2.76-1.382l-.752 2.868c-.272 1.045-1.009 2.356-1.503 3.155 1.109.342 2.288.528 3.512.528 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
        </svg>
      );

    default:
      return <Globe className={`${dim} ${className}`} />;
  }
}

/**
 * Resolves full list of SocialLinkItems from CMSSocialLinks:
 * 1. Checks if `social.items` exists and has entries.
 * 2. If empty or absent, automatically creates items from legacy fields (facebook, instagram, etc.)
 *    ensuring zero data loss and seamless backward compatibility.
 */
export function resolveSocialItems(social?: CMSSocialLinks | null): SocialLinkItem[] {
  if (social?.items && Array.isArray(social.items) && social.items.length > 0) {
    return [...social.items].sort((a, b) => (a.order || 0) - (b.order || 0));
  }

  // Fallback: build from legacy keys
  const items: SocialLinkItem[] = [];
  let order = 1;

  if (social?.whatsapp) {
    items.push({
      id: 'legacy-whatsapp',
      platform: 'whatsapp',
      name: 'واتساب كلينزو الرسمي',
      nameEn: 'Cleanzo WhatsApp',
      url: social.whatsapp.startsWith('http') || social.whatsapp.startsWith('+')
        ? social.whatsapp
        : `https://wa.me/${social.whatsapp.replace(/\D/g, '')}`,
      visible: true,
      order: order++,
    });
  }

  if (social?.facebook) {
    items.push({
      id: 'legacy-facebook',
      platform: 'facebook',
      name: 'صفحة فيسبوك',
      nameEn: 'Facebook Page',
      url: social.facebook,
      visible: true,
      order: order++,
    });
  }

  if (social?.instagram) {
    items.push({
      id: 'legacy-instagram',
      platform: 'instagram',
      name: 'إنستجرام',
      nameEn: 'Instagram',
      url: social.instagram,
      visible: true,
      order: order++,
    });
  }

  if (social?.tiktok) {
    items.push({
      id: 'legacy-tiktok',
      platform: 'tiktok',
      name: 'تيك توك',
      nameEn: 'TikTok',
      url: social.tiktok,
      visible: true,
      order: order++,
    });
  }

  if (social?.youtube) {
    items.push({
      id: 'legacy-youtube',
      platform: 'youtube',
      name: 'قناة يوتيوب',
      nameEn: 'YouTube Channel',
      url: social.youtube,
      visible: true,
      order: order++,
    });
  }

  if (social?.twitter) {
    items.push({
      id: 'legacy-twitter',
      platform: 'twitter',
      name: 'منصة X (تويتر)',
      nameEn: 'X (formerly Twitter)',
      url: social.twitter,
      visible: true,
      order: order++,
    });
  }

  if (social?.linkedin) {
    items.push({
      id: 'legacy-linkedin',
      platform: 'linkedin',
      name: 'لينكد إن',
      nameEn: 'LinkedIn',
      url: social.linkedin,
      visible: true,
      order: order++,
    });
  }

  return items;
}
