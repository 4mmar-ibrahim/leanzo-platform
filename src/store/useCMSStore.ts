'use client';

import { create } from 'zustand';
import {
  CMSAboutSection,
  CMSContactSection,
  CMSHeroSection,
  CMSSectionConfig,
  CMSSocialLinks,
  FAQItem,
  CMSContentData,
  Review,
} from '@/types';
import {
  initialAboutContent,
  initialCMSSections,
  initialContactContent,
  initialHeroContent,
  initialSocialLinks,
  initialFAQs,
} from '@/data/cmsData';
import { cleanzoApi } from '@/lib/api/cleanzoApi';

interface CMSState {
  hero: CMSHeroSection;
  about: CMSAboutSection;
  contact: CMSContactSection;
  social: CMSSocialLinks;
  sections: CMSSectionConfig[];
  faqs: FAQItem[];
  reviews: Review[];
  isLoading: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastPublishedAt: string | null;

  // Visibility query helper
  isSectionVisible: (key: string) => boolean;

  // Fetch Actions
  fetchPublishedContent: () => Promise<void>;
  fetchDraftContent: () => Promise<void>;

  // Local State Mutations (in-memory draft)
  updateHero: (updates: Partial<CMSHeroSection>) => void;
  updateAbout: (updates: Partial<CMSAboutSection>) => void;
  updateContact: (updates: Partial<CMSContactSection>) => void;
  updateSocial: (updates: Partial<CMSSocialLinks>) => void;
  toggleSectionVisibility: (sectionId: string) => Promise<boolean>;
  reorderSections: (startIndex: number, endIndex: number) => Promise<boolean>;
  setHasUnsavedChanges: (val: boolean) => void;

  // Backend Persistence Actions
  saveDraftToDatabase: () => Promise<boolean>;
  publishToDatabase: () => Promise<boolean>;

  // FAQ Backend Actions
  fetchFAQs: () => Promise<void>;
  fetchAdminFAQs: () => Promise<void>;
  addFAQ: (faq: Omit<FAQItem, 'id'>) => Promise<FAQItem | null>;
  updateFAQ: (id: string, updates: Partial<FAQItem>) => Promise<boolean>;
  deleteFAQ: (id: string) => Promise<boolean>;
  toggleFAQVisibility: (id: string) => Promise<boolean>;
  reorderFAQs: (newFaqs: FAQItem[]) => Promise<void>;

  // Customer Reviews Backend Actions
  fetchReviews: () => Promise<void>;
  fetchAdminReviews: () => Promise<void>;
  addReview: (review: Omit<Review, 'id'>) => Promise<Review | null>;
  updateReview: (id: string, updates: Partial<Review>) => Promise<boolean>;
  deleteReview: (id: string) => Promise<boolean>;
  deleteAllReviews: () => Promise<boolean>;
  toggleReviewVisibility: (id: string) => Promise<boolean>;
  reorderReviews: (newReviews: Review[]) => Promise<void>;

  // Reset
  resetToDefaults: () => Promise<boolean>;
}

export const deduplicateReviews = (list: Review[]): Review[] => {
  if (!Array.isArray(list)) return [];
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  return list.filter((r) => {
    if (!r) return false;
    if (r.id) {
      if (seenIds.has(r.id)) return false;
      seenIds.add(r.id);
    }
    const contentKey = `${(r.customerName || '').trim().toLowerCase()}_${(r.comment || '').trim().toLowerCase()}`;
    if (contentKey && contentKey !== '_') {
      if (seenContent.has(contentKey)) return false;
      seenContent.add(contentKey);
    }
    return true;
  });
};

export const useCMSStore = create<CMSState>((set, get) => ({
      hero: initialHeroContent,
      about: initialAboutContent,
      contact: initialContactContent,
      social: initialSocialLinks,
      sections: initialCMSSections,
      faqs: [],
      reviews: [],
      isLoading: false,
      isSaving: false,
      hasUnsavedChanges: false,
      lastPublishedAt: null,

      isSectionVisible: (key: string) => {
        const sections = get().sections;
        if (!sections || !Array.isArray(sections) || sections.length === 0) return true;

        const norm = (k: string) => (k || '').toLowerCase().replace(/[-_\s]/g, '');
        const target = norm(key);

        const match = sections.find((s) => {
          const sKey = norm(s.key || '');
          if (sKey === target) return true;

          const sId = norm(s.id || '');
          if (sId === target) return true;

          // Match common aliases between backend & frontend
          if (
            (target === 'whyus' || target === 'whychooseus' || target === 'whycleanzo') &&
            (sKey === 'whyus' || sKey === 'whychooseus' || sKey === 'whycleanzo')
          )
            return true;
          if (
            (target === 'reviews' || target === 'testimonials' || target === 'ratings' || target === 'review' || target === 'clientreviews') &&
            (sKey === 'reviews' || sKey === 'testimonials' || sKey === 'ratings' || sKey === 'review' || sKey === 'clientreviews')
          )
            return true;
          if (
            (target === 'gallery' || target === 'portfolio' || target === 'works' || target === 'ourwork' || target === 'ourworks' || target === 'beforeafter') &&
            (sKey === 'gallery' || sKey === 'portfolio' || sKey === 'works' || sKey === 'ourwork' || sKey === 'ourworks' || sKey === 'beforeafter')
          )
            return true;
          if (
            (target === 'offers' || target === 'promotions' || target === 'deals' || target === 'offer') &&
            (sKey === 'offers' || sKey === 'promotions' || sKey === 'deals' || sKey === 'offer')
          )
            return true;
          if (
            (target === 'services' || target === 'service') &&
            (sKey === 'services' || sKey === 'service')
          )
            return true;
          if (
            (target === 'howitworks' || target === 'steps' || target === 'how_it_works') &&
            (sKey === 'howitworks' || sKey === 'steps' || sKey === 'how_it_works')
          )
            return true;
          if (
            (target === 'faq' || target === 'faqs') &&
            (sKey === 'faq' || sKey === 'faqs')
          )
            return true;
          if (
            (target === 'about' || target === 'aboutus') &&
            (sKey === 'about' || sKey === 'aboutus')
          )
            return true;
          if (
            (target === 'contact' || target === 'contactus') &&
            (sKey === 'contact' || sKey === 'contactus')
          )
            return true;
          if (
            (target === 'booking' || target === 'book') &&
            (sKey === 'booking' || sKey === 'book')
          )
            return true;
          if (
            (target === 'hero' || target === 'herosection') &&
            (sKey === 'hero' || sKey === 'herosection')
          )
            return true;

          return false;
        });

        if (!match) return true;
        return match.visible !== false;
      },

  fetchPublishedContent: async () => {
    set({ isLoading: true });
    try {
      const [contentData, faqsData, reviewsData] = await Promise.all([
        cleanzoApi.content.getPublished().catch(() => null),
        cleanzoApi.faq.getPublic().catch(() => null),
        cleanzoApi.reviews.getPublic().catch(() => null),
      ]);

      set((state) => ({
        hero: contentData?.hero ? { ...state.hero, ...contentData.hero } : state.hero,
        about: contentData?.about !== undefined ? { ...contentData.about } : state.about,
        contact: contentData?.contact !== undefined ? { ...contentData.contact } : state.contact,
        social: contentData?.social !== undefined ? { ...contentData.social } : state.social,
        sections: contentData?.sections && contentData.sections.length > 0 ? (contentData.sections as any) : state.sections,
        faqs: Array.isArray(faqsData) ? faqsData : state.faqs,
        reviews: Array.isArray(reviewsData) ? deduplicateReviews(reviewsData) : state.reviews,
        lastPublishedAt: contentData?.lastPublishedAt || null,
        isLoading: false,
        hasUnsavedChanges: false,
      }));
    } catch (err) {
      console.error('Failed to fetch published CMS content:', err);
      set({ isLoading: false });
    }
  },

  fetchDraftContent: async () => {
    set({ isLoading: true });
    try {
      const [draftData, adminFaqs, adminReviews] = await Promise.all([
        cleanzoApi.content.getDraft().catch(() => null),
        cleanzoApi.faq.getAllAdmin().catch(() => null),
        cleanzoApi.reviews.getAllAdmin().catch(() => null),
      ]);

      set((state) => ({
        hero: draftData?.hero ? { ...state.hero, ...draftData.hero } : state.hero,
        about: draftData?.about !== undefined ? { ...draftData.about } : state.about,
        contact: draftData?.contact !== undefined ? { ...draftData.contact } : state.contact,
        social: draftData?.social !== undefined ? { ...draftData.social } : state.social,
        sections: draftData?.sections && draftData.sections.length > 0 ? (draftData.sections as any) : state.sections,
        faqs: Array.isArray(adminFaqs) ? adminFaqs : state.faqs,
        reviews: Array.isArray(adminReviews) ? deduplicateReviews(adminReviews) : state.reviews,
        lastPublishedAt: draftData?.lastPublishedAt || null,
        isLoading: false,
        hasUnsavedChanges: false,
      }));
    } catch (err) {
      console.error('Failed to fetch draft CMS content:', err);
      set({ isLoading: false });
    }
  },

  updateHero: (updates) => {
    set((state) => ({
      hero: { ...state.hero, ...updates },
      hasUnsavedChanges: true,
    }));
  },

  updateAbout: (updates) => {
    set((state) => ({
      about: { ...state.about, ...updates },
      hasUnsavedChanges: true,
    }));
  },

  updateContact: (updates) => {
    set((state) => ({
      contact: { ...state.contact, ...updates },
      hasUnsavedChanges: true,
    }));
  },

  updateSocial: (updates) => {
    set((state) => ({
      social: { ...state.social, ...updates },
      hasUnsavedChanges: true,
    }));
  },

  toggleSectionVisibility: async (sectionId) => {
    let updatedSections: CMSSectionConfig[] = [];
    set((state) => {
      updatedSections = state.sections.map((s) =>
        s.id === sectionId ? { ...s, visible: !s.visible } : s
      );
      return {
        sections: updatedSections,
        hasUnsavedChanges: false,
      };
    });

    try {
      const { hero, about, contact, social } = get();
      await cleanzoApi.content.updateDraft({
        hero,
        about,
        contact,
        social,
        sections: updatedSections,
      });
      const published = await cleanzoApi.content.publish();
      if (published && published.sections) {
        set({
          sections: published.sections as any,
          lastPublishedAt: published.lastPublishedAt || new Date().toISOString(),
          hasUnsavedChanges: false,
        });
      }
      return true;
    } catch (err) {
      console.warn('Auto-publish toggleSectionVisibility warning:', err);
      return false;
    }
  },

  reorderSections: async (startIndex, endIndex) => {
    let updatedSections: CMSSectionConfig[] = [];
    set((state) => {
      const result = Array.from(state.sections);
      const [removed] = result.splice(startIndex, 1);
      result.splice(endIndex, 0, removed);
      updatedSections = result.map((item, index) => ({ ...item, order: index }));
      return {
        sections: updatedSections,
        hasUnsavedChanges: false,
      };
    });

    try {
      const { hero, about, contact, social } = get();
      await cleanzoApi.content.updateDraft({
        hero,
        about,
        contact,
        social,
        sections: updatedSections,
      });
      const published = await cleanzoApi.content.publish();
      if (published && published.sections) {
        set({
          sections: published.sections as any,
          lastPublishedAt: published.lastPublishedAt || new Date().toISOString(),
          hasUnsavedChanges: false,
        });
      }
      return true;
    } catch (err) {
      console.warn('Auto-publish reorderSections warning:', err);
      return false;
    }
  },

  setHasUnsavedChanges: (val) => {
    set({ hasUnsavedChanges: val });
  },

  saveDraftToDatabase: async () => {
    set({ isSaving: true });
    try {
      const { hero, about, contact, social, sections } = get();
      await cleanzoApi.content.updateDraft({
        hero,
        about,
        contact,
        social,
        sections,
      });
      set({ isSaving: false, hasUnsavedChanges: false });
      return true;
    } catch (err) {
      console.error('Failed to save draft to database:', err);
      set({ isSaving: false });
      return false;
    }
  },

  publishToDatabase: async () => {
    set({ isSaving: true });
    try {
      // 1. Ensure current state is saved to draft first
      const { hero, about, contact, social, sections } = get();
      await cleanzoApi.content.updateDraft({
        hero,
        about,
        contact,
        social,
        sections,
      });

      // 2. Promote draft to published
      const published = await cleanzoApi.content.publish();
      set({
        hero: published.hero,
        about: published.about,
        contact: published.contact,
        social: published.social,
        sections: published.sections as any,
        lastPublishedAt: published.lastPublishedAt || new Date().toISOString(),
        isSaving: false,
        hasUnsavedChanges: false,
      });
      return true;
    } catch (err) {
      console.error('Failed to publish CMS content:', err);
      set({ isSaving: false });
      return false;
    }
  },

  fetchFAQs: async () => {
    try {
      const faqs = await cleanzoApi.faq.getPublic();
      if (Array.isArray(faqs)) {
        set({ faqs });
      }
    } catch (err) {
      console.error('Failed to fetch public FAQs:', err);
    }
  },

  fetchAdminFAQs: async () => {
    try {
      const faqs = await cleanzoApi.faq.getAllAdmin();
      if (Array.isArray(faqs)) {
        set({ faqs });
      }
    } catch (err) {
      console.error('Failed to fetch admin FAQs:', err);
    }
  },

  addFAQ: async (faqData) => {
    try {
      const created = await cleanzoApi.faq.create(faqData);
      set((state) => ({ faqs: [...state.faqs, created] }));
      return created;
    } catch (err) {
      console.error('Failed to create FAQ:', err);
      return null;
    }
  },

  updateFAQ: async (id, updates) => {
    try {
      const updated = await cleanzoApi.faq.update(id, updates);
      set((state) => ({
        faqs: state.faqs.map((f) => (f.id === id ? { ...f, ...updated } : f)),
      }));
      return true;
    } catch (err) {
      console.error('Failed to update FAQ:', err);
      return false;
    }
  },

  deleteFAQ: async (id) => {
    try {
      await cleanzoApi.faq.delete(id);
      set((state) => ({
        faqs: state.faqs.filter((f) => f.id !== id),
      }));
      return true;
    } catch (err) {
      console.error('Failed to delete FAQ:', err);
      return false;
    }
  },

  toggleFAQVisibility: async (id) => {
    try {
      const existing = get().faqs.find((f) => f.id === id);
      if (!existing) return false;
      const newVisible = !existing.visible;
      await cleanzoApi.faq.update(id, { visible: newVisible });
      set((state) => ({
        faqs: state.faqs.map((f) => (f.id === id ? { ...f, visible: newVisible } : f)),
      }));
      return true;
    } catch (err) {
      console.error('Failed to toggle FAQ visibility:', err);
      return false;
    }
  },

  reorderFAQs: async (newFaqs) => {
    set({ faqs: newFaqs });
    try {
      await Promise.all(
        newFaqs.map((faq, idx) =>
          cleanzoApi.faq.update(faq.id, { order: idx + 1 }).catch(() => null)
        )
      );
    } catch (err) {
      console.error('Failed to update FAQ ordering on backend:', err);
    }
  },

  // Customer Reviews Actions Implementation
  fetchReviews: async () => {
    try {
      const reviews = await cleanzoApi.reviews.getPublic();
      if (Array.isArray(reviews)) {
        set({ reviews: deduplicateReviews(reviews) });
      } else {
        set({ reviews: [] });
      }
    } catch (err) {
      console.error('Failed to fetch public reviews:', err);
      set({ reviews: [] });
    }
  },

  fetchAdminReviews: async () => {
    try {
      const reviews = await cleanzoApi.reviews.getAllAdmin();
      if (Array.isArray(reviews)) {
        set({ reviews: deduplicateReviews(reviews) });
      } else {
        set({ reviews: [] });
      }
    } catch (err) {
      console.error('Failed to fetch admin reviews:', err);
      set({ reviews: [] });
    }
  },

  addReview: async (reviewData) => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('cleanzo-reviews-wiped');
      }
      const created = await cleanzoApi.reviews.create(reviewData);
      if (created) {
        set((state) => ({
          reviews: deduplicateReviews([created, ...state.reviews.filter((r) => r.id !== created.id)]),
        }));
        return created;
      }
      return null;
    } catch (err) {
      console.error('Failed to add review:', err);
      return null;
    }
  },

  updateReview: async (id, updates) => {
    try {
      const updated = await cleanzoApi.reviews.update(id, updates);
      if (updated) {
        set((state) => ({
          reviews: state.reviews.map((r) => (r.id === id ? { ...r, ...updates } : r)),
        }));
        return true;
      }
      return false;
    } catch (err) {
      console.error('Failed to update review:', err);
      return false;
    }
  },

  deleteReview: async (id) => {
    try {
      await cleanzoApi.reviews.delete(id);
      set((state) => ({
        reviews: state.reviews.filter((r) => r.id !== id),
      }));
      return true;
    } catch (err) {
      console.error('Failed to delete review:', err);
      return false;
    }
  },

  deleteAllReviews: async () => {
    try {
      await cleanzoApi.reviews.deleteAllAdmin();
    } catch (err) {
      console.warn('Backend deleteAllReviews error:', err);
    }
    // Set cleared state in frontend Zustand and localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('cleanzo-reviews-wiped', 'true');
        const cmsStorage = localStorage.getItem('cleanzo-cms-storage');
        if (cmsStorage) {
          const parsed = JSON.parse(cmsStorage);
          if (parsed && parsed.state) {
            parsed.state.reviews = [];
            localStorage.setItem('cleanzo-cms-storage', JSON.stringify(parsed));
          }
        }
      } catch {}
    }
    set({ reviews: [] });
    return true;
  },

  toggleReviewVisibility: async (id) => {
    try {
      const existing = get().reviews.find((r) => r.id === id);
      if (!existing) return false;
      const newVisible = existing.visible === false ? true : false;
      await cleanzoApi.reviews.update(id, { visible: newVisible });
      set((state) => ({
        reviews: state.reviews.map((r) => (r.id === id ? { ...r, visible: newVisible } : r)),
      }));
      return true;
    } catch (err) {
      console.error('Failed to toggle review visibility:', err);
      return false;
    }
  },

  reorderReviews: async (newReviews) => {
    set({ reviews: newReviews });
    try {
      await Promise.all(
        newReviews.map((rev, idx) =>
          cleanzoApi.reviews.update(rev.id, { order: idx + 1 }).catch(() => null)
        )
      );
    } catch (err) {
      console.error('Failed to update review ordering on backend:', err);
    }
  },

  resetToDefaults: async () => {
    try {
      await cleanzoApi.content.reset();
      set({
        hero: initialHeroContent,
        about: initialAboutContent,
        contact: initialContactContent,
        social: initialSocialLinks,
        sections: initialCMSSections,
        reviews: [],
        faqs: [],
        hasUnsavedChanges: false,
      });
      return true;
    } catch (err) {
      console.error('Failed to reset CMS defaults:', err);
      return false;
    }
  },
}));
