import { Request, Response } from 'express';
import { CMSContent, ICMSContent } from '../models/CMSContent.js';
import { AboutContent } from '../models/AboutContent.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';
import { AuthenticatedAdminRequest } from '../middleware/adminAuthMiddleware.js';

/**
 * Ensure default published and draft documents exist in database
 */
const CANONICAL_SECTIONS = [
  { id: 'sec-1', key: 'hero', nameAr: 'واجهة البداية (Hero)', nameEn: 'Hero Header', visible: true },
  { id: 'sec-2', key: 'services', nameAr: 'خدماتنا الأساسية', nameEn: 'Core Services', visible: true },
  { id: 'sec-3', key: 'whyUs', nameAr: 'لماذا تختار كلينزو', nameEn: 'Why Choose Cleanzo', visible: true },
  { id: 'sec-4', key: 'how_it_works', nameAr: 'كيف يعمل النظام (الخطوات)', nameEn: 'How It Works', visible: true },
  { id: 'sec-5', key: 'stats', nameAr: 'إحصائيات الثقة والأرقام', nameEn: 'Trust Stats', visible: true },
  { id: 'sec-6', key: 'reviews', nameAr: 'تقييمات وآراء العملاء', nameEn: 'Client Reviews', visible: true },
  { id: 'sec-7', key: 'offers', nameAr: 'العروض والباقات الترويجية', nameEn: 'Promo Offers', visible: true },
  { id: 'sec-8', key: 'gallery', nameAr: 'معرض أعمالنا (قبل وبعد)', nameEn: 'Our Works Gallery', visible: true },
  { id: 'sec-9', key: 'booking', nameAr: 'نموذج الحجز السريع', nameEn: 'Quick Booking', visible: true },
  { id: 'sec-10', key: 'faq', nameAr: 'الأسئلة الأكثر شيوعاً', nameEn: 'FAQ Section', visible: true },
  { id: 'sec-11', key: 'about', nameAr: 'من نحن (نبذة عن كلينزو)', nameEn: 'About Us', visible: true },
  { id: 'sec-12', key: 'contact', nameAr: 'تواصل معنا ومعلومات الاتصال', nameEn: 'Contact Info', visible: true },
  { id: 'sec-13', key: 'cta', nameAr: 'بانر الحجز النهائي', nameEn: 'Final Call to Action', visible: true },
];

function mergeCanonicalSections(existingSections: any[]): any[] {
  if (!Array.isArray(existingSections) || existingSections.length === 0) {
    return CANONICAL_SECTIONS;
  }
  const norm = (k: string) => (k || '').toLowerCase().replace(/[-_\s]/g, '');
  const result = [...existingSections];

  for (const canon of CANONICAL_SECTIONS) {
    const exists = result.some(
      (s) => norm(s.key) === norm(canon.key)
    );
    if (!exists) {
      let uniqueId = canon.id;
      let counter = 1;
      while (result.some((r) => r.id === uniqueId)) {
        uniqueId = `sec-ext-${counter++}`;
      }
      result.push({
        ...canon,
        id: uniqueId,
      });
    }
  }
  return result;
}

const DEFAULT_HERO = {
  headline: 'عناية فائقة تليق بسيارتك ومنزلك',
  headlineEn: 'Premium Care for Your Car & Home',
  description: 'خدمات احترافية متنقلة بأعلى معايير الجودة والأمان في مصر',
  descriptionEn: 'Professional mobile detailing & home cleaning services',
  image: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1200&q=80',
  primaryCtaText: 'احجز الآن',
  primaryCtaTextEn: 'Book Now',
  primaryCtaLink: '/booking',
  secondaryCtaText: 'استكشف الخدمات',
  secondaryCtaTextEn: 'Explore Services',
  secondaryCtaLink: '/services',
  announcement: 'خصم 20% لفترة محدودة على جميع باقات الغسيل الشامل',
  announcementEn: '20% off for a limited time on all deep cleaning packages',
  actionButtons: [
    {
      id: 'btn-1',
      label: 'احجز الآن',
      labelEn: 'Book Now',
      enabled: true,
      destinationType: 'booking',
      destinationValue: '/booking',
      order: 0,
      variant: 'primary',
    },
    {
      id: 'btn-2',
      label: 'استكشف خدماتنا',
      labelEn: 'Explore Services',
      enabled: true,
      destinationType: 'services',
      destinationValue: '/services',
      order: 1,
      variant: 'secondary',
    },
  ],
};

async function ensureDefaultContent(): Promise<{ published: ICMSContent; draft: ICMSContent }> {
  let published = await CMSContent.findOne({ status: 'published' });
  if (!published) {
    published = await CMSContent.create({
      status: 'published',
      version: 1,
      hero: DEFAULT_HERO,
      lastPublishedAt: new Date(),
      updatedBy: 'system',
    });
  } else {
    let heroChanged = false;
    if (!published.hero?.headline) {
      published.hero = { ...DEFAULT_HERO, ...(published.hero || {}) };
      heroChanged = true;
    }
    if (!published.hero?.actionButtons || !Array.isArray(published.hero.actionButtons) || published.hero.actionButtons.length === 0) {
      published.hero = {
        ...(published.hero || {}),
        actionButtons: DEFAULT_HERO.actionButtons,
      };
      heroChanged = true;
    }
    if (heroChanged) {
      await published.save();
    }
    const merged = mergeCanonicalSections(published.sections);
    if (merged.length !== published.sections.length) {
      published.sections = merged;
      await published.save();
    }
  }

  let draft = await CMSContent.findOne({ status: 'draft' });
  if (!draft) {
    draft = await CMSContent.create({
      status: 'draft',
      version: 1,
      hero: published.hero,
      about: published.about,
      contact: published.contact,
      social: published.social,
      sections: published.sections,
      updatedBy: 'system',
    });
  } else {
    let draftHeroChanged = false;
    if (!draft.hero?.actionButtons || !Array.isArray(draft.hero.actionButtons) || draft.hero.actionButtons.length === 0) {
      draft.hero = {
        ...(draft.hero || {}),
        actionButtons: (published.hero?.actionButtons && published.hero.actionButtons.length > 0)
          ? published.hero.actionButtons
          : DEFAULT_HERO.actionButtons,
      };
      draftHeroChanged = true;
    }
    if (draftHeroChanged) {
      await draft.save();
    }
    const merged = mergeCanonicalSections(draft.sections);
    if (merged.length !== draft.sections.length) {
      draft.sections = merged;
      await draft.save();
    }
  }

  return { published, draft };
}

/**
 * GET /api/content
 * Public endpoint: Returns the published CMS content for Customer Website.
 */
export async function getPublishedCMSContent(req: Request, res: Response): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const { published } = await ensureDefaultContent();
    sendSuccess(res, published);
  } catch (err: any) {
    console.error('Error fetching published CMS content:', err);
    sendError(res, 'فشل جلب محتوى الموقع', 500, 'CMS_FETCH_ERROR');
  }
}

/**
 * GET /api/content/admin/draft
 * Admin endpoint: Returns current draft content for editing/preview.
 */
export async function getDraftCMSContent(req: Request, res: Response): Promise<void> {
  try {
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    const { draft } = await ensureDefaultContent();
    sendSuccess(res, draft);
  } catch (err: any) {
    console.error('Error fetching draft CMS content:', err);
    sendError(res, 'فشل جلب مسودة المحتوى', 500, 'CMS_DRAFT_FETCH_ERROR');
  }
}

/**
 * PUT /api/content/admin/draft
 * Admin endpoint: Saves updates to the Draft document.
 */
export async function updateDraftCMSContent(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { draft } = await ensureDefaultContent();
    const { hero, about, contact, social, sections } = req.body;

    if (hero) {
      // Validate dynamic action buttons
      if (hero.actionButtons && Array.isArray(hero.actionButtons)) {
        for (const btn of hero.actionButtons) {
          if (btn.enabled) {
            const destVal = (btn.destinationValue || '').trim();
            if (!destVal) {
              sendError(
                res,
                `يرجى تحديد وجهة صالحة لزر الإجراء "${btn.label || 'المحدد'}"`,
                400,
                'MISSING_BUTTON_DESTINATION'
              );
              return;
            }
          }

          if (btn.destinationType === 'external') {
            const rawVal = (btn.destinationValue || '').trim().toLowerCase();
            if (
              rawVal.startsWith('javascript:') ||
              rawVal.startsWith('data:') ||
              rawVal.startsWith('vbscript:') ||
              rawVal.startsWith('file:') ||
              rawVal.startsWith('about:')
            ) {
              sendError(
                res,
                `الرابط الخارجي للزر "${btn.label || 'المحدد'}" يحتوي على بروتوكول غير آمن`,
                400,
                'UNSAFE_EXTERNAL_URL'
              );
              return;
            }
          }
        }
      }

      draft.hero = { ...draft.hero, ...hero };
    }

    if (about) draft.about = { ...draft.about, ...about };
    if (contact) draft.contact = { ...draft.contact, ...contact };
    if (social) draft.social = { ...draft.social, ...social };
    if (sections && Array.isArray(sections)) draft.sections = sections;

    draft.version = (draft.version || 1) + 1;
    draft.updatedBy = req.admin?.username || 'admin';

    await draft.save();
    sendSuccess(res, draft, 'تم حفظ المسودة بنجاح');
  } catch (err: any) {
    console.error('Error updating draft CMS content:', err);
    sendError(res, err.message || 'فشل حفظ المسودة', 500, 'CMS_DRAFT_UPDATE_ERROR');
  }
}

/**
 * POST /api/content/admin/publish
 * Admin endpoint: Promotes Draft content to Published state.
 * Customer Website will immediately receive this content on next request.
 */
export async function publishCMSContent(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    const { published, draft } = await ensureDefaultContent();

    // Copy draft content to published document
    published.hero = draft.hero;
    published.about = draft.about;
    published.contact = draft.contact;
    published.social = draft.social;
    published.sections = draft.sections;
    published.version = (published.version || 1) + 1;
    published.lastPublishedAt = new Date();
    published.updatedBy = req.admin?.username || 'admin';

    await published.save();

    // Keep legacy AboutContent synchronized seamlessly
    try {
      let legacyAbout = await AboutContent.findOne();
      if (legacyAbout) {
        legacyAbout.title = draft.about.title;
        legacyAbout.titleEn = draft.about.titleEn;
        legacyAbout.description = draft.about.description;
        legacyAbout.descriptionEn = draft.about.descriptionEn;
        legacyAbout.mission = draft.about.mission;
        legacyAbout.missionEn = draft.about.missionEn;
        legacyAbout.vision = draft.about.vision;
        legacyAbout.visionEn = draft.about.visionEn;
        legacyAbout.story = draft.about.story;
        legacyAbout.storyEn = draft.about.storyEn;
        legacyAbout.stats = draft.about.stats;
        await legacyAbout.save();
      }
    } catch (syncErr) {
      console.warn('Legacy AboutContent sync notice:', syncErr);
    }

    sendSuccess(res, published, 'تم نشر محتوى المنصة بنجاح لجميع العملاء');
  } catch (err: any) {
    console.error('Error publishing CMS content:', err);
    sendError(res, err.message || 'فشل نشر المحتوى', 500, 'CMS_PUBLISH_ERROR');
  }
}

/**
 * POST /api/content/admin/reset
 * Admin endpoint: Resets CMS draft to initial baseline defaults.
 */
export async function resetCMSContent(req: AuthenticatedAdminRequest, res: Response): Promise<void> {
  try {
    await CMSContent.deleteMany({});
    const { published } = await ensureDefaultContent();
    sendSuccess(res, published, 'تمت استعادة المحتوى الافتراضي للمنصة');
  } catch (err: any) {
    console.error('Error resetting CMS content:', err);
    sendError(res, 'فشل إعادة ضبط المحتوى', 500, 'CMS_RESET_ERROR');
  }
}
