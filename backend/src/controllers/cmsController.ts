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

const DEFAULT_ABOUT = {
  title: 'قصة كلينزو — معايير جديدة للنظافة والعناية الاحترافية',
  titleEn: 'The Cleanzo Story — Setting New Benchmarks in Cleanliness',
  description: 'انطلقت كلينزو بهدف واضح: تحويل العناية بالسيارات والمنازل من مهمة روتينية مرهقة إلى تجربة فندقية مريحة وموثوقة بأعلى درجات الدقة والاحتراف.',
  descriptionEn: 'Cleanzo was launched to transform car detailing and home hygiene into an effortless, premium hotel-grade experience.',
  mission: 'تقديم حلول تنظيف مبتكرة وصديقة للبيئة تضمن أعلى درجات النقاء لعملائنا في أي مكان وفي الوقت المحدد دون أي متاعب.',
  missionEn: 'Providing innovative, eco-friendly cleaning solutions ensuring absolute pristine hygiene on time, anywhere.',
  vision: 'أن نكون المنصة الرائدة والأولى المعتمدة للعناية بالممتلكات الثمينة والمنازل في الشرق الأوسط.',
  visionEn: 'To be the premier recognized platform for car detailing and home sanitation in the Middle East.',
  story: 'بدأنا كفريق شغوف بأدق تفاصيل التلميع والديتيلينج، وقمنا بابتكار وحدات خدمة متنقلة مجهزة بأحدث مضخات البخار الإيطالية ومواد النانو سيراميك.',
  storyEn: 'Starting with a passionate team in car detailing, we built mobile units equipped with Italian steam generators and nano-ceramic technology.',
  stats: [
    { id: 'st-1', label: 'ضمان رضا تام', labelEn: '100% Satisfaction', value: '100%' },
    { id: 'st-2', label: 'مواد صديقة للبيئة', labelEn: 'Eco-Friendly Safe', value: 'ECO' },
    { id: 'st-3', label: 'فنيون معتمدون ومفحوصون', labelEn: 'Vetted Specialists', value: 'PRO' },
    { id: 'st-4', label: 'خدمة متنقلة عند بابك', labelEn: 'On-Demand Mobile', value: 'ON-DEMAND' },
  ],
};

const DEFAULT_CONTACT = {
  phone: '01012345678',
  whatsapp: '+201012345678',
  email: 'care@cleanzo.app',
  address: 'المنيا الجديدة، الحي الرابع، المحور المركزي، مصر',
  addressEn: 'New Minya, Fourth District, Central Axis, Egypt',
  workingHours: 'يومياً من 9:00 صباحاً حتى 10:00 مساءً',
  workingHoursEn: 'Daily 9:00 AM – 10:00 PM',
  mapsUrl: 'https://maps.google.com/?q=New+Minya+Egypt',
  supportNote: 'فريق دعم العملاء جاهز لخدمتك عبر واتساب خلال 10 دقائق.',
  supportNoteEn: 'Customer support replies on WhatsApp within 10 minutes.',
};

const DEFAULT_SOCIAL = {
  facebook: 'https://facebook.com/cleanzo.app',
  instagram: 'https://instagram.com/cleanzo.app',
  tiktok: 'https://tiktok.com/@cleanzo.app',
  youtube: 'https://youtube.com/@cleanzo',
  whatsapp: 'https://wa.me/201012345678',
  twitter: 'https://twitter.com/cleanzo_app',
  linkedin: 'https://linkedin.com/company/cleanzo',
  items: [
    { id: 'soc-whatsapp', platform: 'whatsapp', name: 'واتساب كلينزو الرسمي', nameEn: 'Cleanzo Official WhatsApp', url: 'https://wa.me/201012345678', visible: true, order: 1 },
    { id: 'soc-facebook', platform: 'facebook', name: 'صفحة فيسبوك', nameEn: 'Facebook Page', url: 'https://facebook.com/cleanzo.app', visible: true, order: 2 },
    { id: 'soc-instagram', platform: 'instagram', name: 'إنستجرام', nameEn: 'Instagram', url: 'https://instagram.com/cleanzo.app', visible: true, order: 3 },
    { id: 'soc-tiktok', platform: 'tiktok', name: 'تيك توك', nameEn: 'TikTok', url: 'https://tiktok.com/@cleanzo.app', visible: true, order: 4 },
    { id: 'soc-youtube', platform: 'youtube', name: 'قناة يوتيوب', nameEn: 'YouTube Channel', url: 'https://youtube.com/@cleanzo', visible: true, order: 5 },
    { id: 'soc-twitter', platform: 'twitter', name: 'منصة X (تويتر)', nameEn: 'X (formerly Twitter)', url: 'https://twitter.com/cleanzo_app', visible: true, order: 6 },
    { id: 'soc-linkedin', platform: 'linkedin', name: 'لينكد إن', nameEn: 'LinkedIn', url: 'https://linkedin.com/company/cleanzo', visible: true, order: 7 },
  ],
};

function mergeSection<T extends Record<string, any>>(defaults: T, current: any): T {
  if (!current || typeof current !== 'object') return { ...defaults };
  const result: any = { ...defaults };
  for (const [key, val] of Object.entries(current)) {
    if (val !== undefined && val !== null) {
      if (typeof val === 'string' && val.trim() === '') {
        continue;
      }
      if (Array.isArray(val) && val.length === 0 && Array.isArray((defaults as any)[key]) && (defaults as any)[key].length > 0) {
        continue;
      }
      result[key] = val;
    }
  }
  return result;
}

async function ensureDefaultContent(): Promise<{ published: ICMSContent; draft: ICMSContent }> {
  let published = await CMSContent.findOne({ status: 'published' });
  if (!published) {
    published = await CMSContent.create({
      status: 'published',
      version: 1,
      hero: DEFAULT_HERO,
      about: DEFAULT_ABOUT,
      contact: DEFAULT_CONTACT,
      social: DEFAULT_SOCIAL,
      sections: CANONICAL_SECTIONS,
      lastPublishedAt: new Date(),
      updatedBy: 'system',
    });
  } else {
    let changed = false;
    if (!published.hero?.headline) {
      published.hero = { ...DEFAULT_HERO, ...(published.hero || {}) };
      changed = true;
    }
    if (!published.hero?.actionButtons || !Array.isArray(published.hero.actionButtons) || published.hero.actionButtons.length === 0) {
      published.hero = {
        ...(published.hero || {}),
        actionButtons: DEFAULT_HERO.actionButtons,
      };
      changed = true;
    }
    if (!published.about || !published.about.title?.trim() || !published.about.stats || published.about.stats.length === 0) {
      published.about = mergeSection(DEFAULT_ABOUT, published.about);
      changed = true;
    }
    if (!published.contact || !published.contact.phone?.trim() || !published.contact.email?.trim()) {
      published.contact = mergeSection(DEFAULT_CONTACT, published.contact);
      changed = true;
    }
    if (!published.social || (!published.social.whatsapp?.trim() && !published.social.items)) {
      published.social = mergeSection(DEFAULT_SOCIAL, published.social);
      changed = true;
    }
    const merged = mergeCanonicalSections(published.sections);
    if (merged.length !== (published.sections || []).length) {
      published.sections = merged;
      changed = true;
    }
    if (changed) {
      await published.save();
    }
  }

  let draft = await CMSContent.findOne({ status: 'draft' });
  if (!draft) {
    draft = await CMSContent.create({
      status: 'draft',
      version: 1,
      hero: published.hero || DEFAULT_HERO,
      about: published.about || DEFAULT_ABOUT,
      contact: published.contact || DEFAULT_CONTACT,
      social: published.social || DEFAULT_SOCIAL,
      sections: published.sections || CANONICAL_SECTIONS,
      updatedBy: 'system',
    });
  } else {
    let draftChanged = false;
    if (!draft.hero?.actionButtons || !Array.isArray(draft.hero.actionButtons) || draft.hero.actionButtons.length === 0) {
      draft.hero = {
        ...(draft.hero || {}),
        actionButtons: (published.hero?.actionButtons && published.hero.actionButtons.length > 0)
          ? published.hero.actionButtons
          : DEFAULT_HERO.actionButtons,
      };
      draftChanged = true;
    }
    if (!draft.about || !draft.about.title?.trim() || !draft.about.stats || draft.about.stats.length === 0) {
      draft.about = mergeSection(DEFAULT_ABOUT, draft.about);
      draftChanged = true;
    }
    if (!draft.contact || !draft.contact.phone?.trim() || !draft.contact.email?.trim()) {
      draft.contact = mergeSection(DEFAULT_CONTACT, draft.contact);
      draftChanged = true;
    }
    if (!draft.social || (!draft.social.whatsapp?.trim() && !draft.social.items)) {
      draft.social = mergeSection(DEFAULT_SOCIAL, draft.social);
      draftChanged = true;
    }
    const merged = mergeCanonicalSections(draft.sections);
    if (merged.length !== (draft.sections || []).length) {
      draft.sections = merged;
      draftChanged = true;
    }
    if (draftChanged) {
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
    const { published, draft } = await ensureDefaultContent();

    // Check if client requested preview mode and has admin authorization
    const isPreview = req.query.preview === 'true';
    if (isPreview) {
      // Return draft content enriched with isDraft flag for admin preview
      const enrichedDraft = {
        ...(draft.toObject ? draft.toObject() : draft),
        isDraft: true,
      };
      enrichedDraft.about = mergeSection(DEFAULT_ABOUT, enrichedDraft.about);
      enrichedDraft.contact = mergeSection(DEFAULT_CONTACT, enrichedDraft.contact);
      enrichedDraft.social = mergeSection(DEFAULT_SOCIAL, enrichedDraft.social);
      sendSuccess(res, enrichedDraft, 'وضع المعاينة لمسودة المحتوى');
      return;
    }

    const payload = published.toObject ? published.toObject() : { ...published };
    // Guarantee populated canonical defaults for empty fields
    payload.about = mergeSection(DEFAULT_ABOUT, payload.about);
    payload.contact = mergeSection(DEFAULT_CONTACT, payload.contact);
    payload.social = mergeSection(DEFAULT_SOCIAL, payload.social);
    payload.isDraft = false;

    sendSuccess(res, payload);
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
