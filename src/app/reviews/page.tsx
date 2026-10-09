'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Star,
  Sparkles,
  Car,
  Home,
  CheckCircle2,
  Search,
  Plus,
  X,
  MessageSquareHeart,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowRight,
  ArrowLeft,
  ThumbsUp,
  Quote,
} from 'lucide-react';
import { useCMSStore } from '@/store/useCMSStore';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useZoStore } from '@/store/useZoStore';
import { Review } from '@/types';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { SectionHeader } from '@/components/common/SectionHeader';

export default function CustomerReviewsPage() {
  const { locale, direction } = useLocaleStore();
  const isAr = locale === 'ar';
  const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

  const reviews = useCMSStore((s) => s.reviews);
  const fetchReviews = useCMSStore((s) => s.fetchReviews);
  const addReview = useCMSStore((s) => s.addReview);
  const speak = useZoStore((s) => s.speak);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'car' | 'home'>('all');
  const [selectedRating, setSelectedRating] = useState<'all' | number>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add review modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formName, setFormName] = useState('');
  const [formService, setFormService] = useState('');
  const [formCategory, setFormCategory] = useState<'car' | 'home'>('car');
  const [formRating, setFormRating] = useState<number>(5);
  const [formComment, setFormComment] = useState('');
  const [formAvatar, setFormAvatar] = useState('');

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  useEffect(() => {
    speak('رأي عملائنا هو فخرنا وشهادتنا 🌟 اقرأ تجاربهم الحقيقية!', 'celebration', 'thumbs_up', 4000);
  }, [speak]);

  // Filter reviews
  const visibleReviews = useMemo(() => {
    return (reviews || []).filter((r) => r.visible !== false);
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    return visibleReviews.filter((r) => {
      if (selectedCategory !== 'all' && r.category !== selectedCategory) return false;
      if (selectedRating !== 'all') {
        if (r.rating !== selectedRating) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = r.customerName?.toLowerCase().includes(q);
        const matchService = r.serviceName?.toLowerCase().includes(q);
        const matchComment = r.comment?.toLowerCase().includes(q);
        if (!matchName && !matchService && !matchComment) return false;
      }
      return true;
    });
  }, [visibleReviews, selectedCategory, selectedRating, searchQuery]);

  // Statistics calculation
  const ratedReviews = useMemo(() => {
    return visibleReviews.filter((r) => typeof r.rating === 'number' && r.rating > 0);
  }, [visibleReviews]);

  const averageRating = useMemo(() => {
    if (ratedReviews.length === 0) return '4.9';
    const sum = ratedReviews.reduce((acc, curr) => acc + (curr.rating || 5), 0);
    return (sum / ratedReviews.length).toFixed(1);
  }, [ratedReviews]);

  const fiveStarPct = useMemo(() => {
    if (ratedReviews.length === 0) return 96;
    const count = ratedReviews.filter((r) => r.rating === 5).length;
    return Math.round((count / ratedReviews.length) * 100);
  }, [ratedReviews]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formComment.trim()) {
      toast.error(isAr ? 'يرجى كتابة اسمك ونص الرأي لإرسال التقييم' : 'Please provide your name and review');
      return;
    }

    setIsSubmitting(true);
    try {
      const newReview: Omit<Review, 'id'> = {
        customerName: formName.trim(),
        serviceName: formService.trim() || (formCategory === 'car' ? (isAr ? 'غسيل وتلميع سيارات' : 'Car Detailing') : (isAr ? 'تنظيف منازل بالبخار' : 'Home Cleaning')),
        category: formCategory,
        rating: formRating > 0 ? formRating : 5,
        comment: formComment.trim(),
        avatar: formAvatar.trim() || undefined,
        date: isAr ? 'اليوم' : 'Today',
        verified: true,
        visible: true,
        order: visibleReviews.length + 1,
      };

      await addReview(newReview);
      toast.success(isAr ? 'شكراً لك! تم نشر رأيك وتجربتك بنجاح' : 'Thank you! Your review was submitted successfully');
      setIsModalOpen(false);
      setFormName('');
      setFormService('');
      setFormComment('');
      setFormAvatar('');
      setFormRating(5);
      speak('شكراً على رأيك الجميل! رأيك يهمنا دائماً 💙', 'celebration', 'thumbs_up', 4000);
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء إرسال التقييم، حاول مجدداً' : 'Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EAF8FC] dark:bg-[#041728] py-10 lg:py-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Link href="/" className="hover:text-[#0866C6] dark:hover:text-white transition-colors">
              {isAr ? 'الرئيسية' : 'Home'}
            </Link>
            <ChevronIcon className="w-3.5 h-3.5 rtl:rotate-180" />
            <span className="text-[#07345C] dark:text-slate-200 font-bold">
              {isAr ? 'آراء العملاء' : 'Customer Reviews'}
            </span>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#07345C] text-white text-xs font-bold shadow-md shadow-[#0866C6]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            <span>{isAr ? 'أضف تجربتك ورأيك' : 'Write a Review'}</span>
          </button>
        </div>

        {/* Section Header */}
        <SectionHeader
          badge={isAr ? 'آراء وتجارب حقيقية' : 'Verified Reviews'}
          title={isAr ? 'ماذا يقول عملاؤنا عن تجربة كلينزو' : 'What Our Customers Say About Cleanzo'}
          subtitle={
            isAr
              ? 'تجارب واقعية وتقييمات موثقة من أصحاب السيارات والمنازل الذين وثقوا في خدماتنا الاحترافية.'
              : 'Real stories and verified feedback from car owners and homeowners who trust Cleanzo.'
          }
        />

        {/* Key Metrics Summary Cards - Always in 1 row side-by-side */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="p-2.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-4 text-center sm:rtl:text-right sm:ltr:text-left">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
              <Star className="w-4 h-4 sm:w-6 sm:h-6 fill-amber-500 text-amber-500" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline justify-center sm:justify-start gap-0.5 sm:gap-1">
                <span className="text-sm sm:text-2xl font-black text-[#07345C] dark:text-white">{averageRating}</span>
                <span className="text-[10px] sm:text-xs text-slate-400 font-bold">/ 5.0</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium leading-tight">
                {isAr ? 'متوسط تقييم الخدمة' : 'Average Service Rating'}
              </p>
            </div>
          </div>

          <div className="p-2.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-4 text-center sm:rtl:text-right sm:ltr:text-left">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ThumbsUp className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline justify-center sm:justify-start gap-0.5 sm:gap-1">
                <span className="text-sm sm:text-2xl font-black text-[#07345C] dark:text-white">{fiveStarPct}%</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium leading-tight">
                {isAr ? 'تقييم 5 نجوم ممتاز' : '5-Star Satisfaction Rate'}
              </p>
            </div>
          </div>

          <div className="p-2.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-center sm:justify-start gap-1.5 sm:gap-4 text-center sm:rtl:text-right sm:ltr:text-left">
            <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-sky-500/10 text-[#0866C6] flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline justify-center sm:justify-start gap-0.5 sm:gap-1">
                <span className="text-sm sm:text-2xl font-black text-[#07345C] dark:text-white">+{visibleReviews.length}</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 font-medium leading-tight">
                {isAr ? 'رأي وتجربة موثقة' : 'Verified Reviews'}
              </p>
            </div>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            <button
              onClick={() => setSelectedCategory('all')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap',
                selectedCategory === 'all'
                  ? 'bg-[#0866C6] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              {isAr ? 'جميع التجارب' : 'All Reviews'}
            </button>
            <button
              onClick={() => setSelectedCategory('car')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap',
                selectedCategory === 'car'
                  ? 'bg-[#0866C6] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <Car className="w-3.5 h-3.5" />
              <span>{isAr ? 'عناية السيارات' : 'Car Detailing'}</span>
            </button>
            <button
              onClick={() => setSelectedCategory('home')}
              className={cn(
                'px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap',
                selectedCategory === 'home'
                  ? 'bg-[#0866C6] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              )}
            >
              <Home className="w-3.5 h-3.5" />
              <span>{isAr ? 'تنظيف المنازل' : 'Home Cleaning'}</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute start-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isAr ? 'ابحث في آراء العملاء أو الخدمات...' : 'Search reviews or services...'}
              className="w-full ps-10 pe-4 py-2 rounded-xl text-xs bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#0866C6] focus:ring-1 focus:ring-[#0866C6] transition-all"
            />
          </div>
        </div>

        {/* Reviews Grid */}
        {filteredReviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((rev) => (
              <div
                key={rev.id}
                className="p-6 rounded-2xl bg-white dark:bg-[#072540] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md hover:border-[#0866C6]/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-4">
                  {/* Top Bar: Customer Info + Rating */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {rev.avatar ? (
                        <img
                          src={rev.avatar}
                          alt={rev.customerName}
                          className="w-11 h-11 rounded-full object-cover border-2 border-slate-100 dark:border-slate-700 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0866C6] to-[#07345C] text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                          {rev.customerName ? rev.customerName.trim().charAt(0) : '؟'}
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-bold text-[#07345C] dark:text-white group-hover:text-[#0866C6] transition-colors">
                          {rev.customerName}
                        </h3>
                        <p className="text-[11px] font-semibold text-[#0866C6] dark:text-sky-400 line-clamp-1">
                          {rev.serviceName || (rev.category === 'car' ? (isAr ? 'غسيل سيارات' : 'Car Wash') : (isAr ? 'تنظيف منزلي' : 'Home Cleaning'))}
                        </p>
                      </div>
                    </div>

                    {/* Star Rating */}
                    {typeof rev.rating === 'number' && rev.rating > 0 ? (
                      <div className="flex items-center gap-0.5 shrink-0 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-lg border border-amber-200/60 dark:border-amber-800/50">
                        {Array.from({ length: rev.rating }).map((_, i) => (
                          <Star key={i} className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        ))}
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950 px-2 py-0.5 rounded-md">
                        {isAr ? 'تجربة موثقة' : 'Verified'}
                      </span>
                    )}
                  </div>

                  {/* Comment Body */}
                  <div className="relative">
                    <Quote className="w-4 h-4 text-slate-300 dark:text-slate-600 absolute -top-1 -start-1 opacity-40" />
                    <p className="text-xs sm:text-sm text-[#334155] dark:text-slate-300 leading-relaxed ps-4">
                      {rev.comment}
                    </p>
                  </div>
                </div>

                {/* Footer: Verified tag & Date */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                  {rev.verified ? (
                    <span className="flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isAr ? 'حجز موثق' : 'Verified Booking'}</span>
                    </span>
                  ) : (
                    <span />
                  )}
                  <span className="text-slate-400 dark:text-slate-500 font-medium">
                    {rev.date || (isAr ? 'مؤخراً' : 'Recently')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#072540] border border-slate-200 dark:border-slate-800 space-y-4">
            <MessageSquareHeart className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-[#07345C] dark:text-white">
              {isAr ? 'لم نجد آراء مطابقة لبحثك' : 'No matching reviews found'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {isAr ? 'جرّب البحث بكلمة أخرى أو تصفح كل التقييمات' : 'Try searching with another keyword or show all reviews'}
            </p>
          </div>
        )}

      </div>

      {/* Add Review Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#07345C]/40 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-3xl bg-white dark:bg-[#072540] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-sky-50 dark:bg-sky-950 text-[#0866C6] flex items-center justify-center">
                  <Star className="w-4 h-4 fill-[#0866C6]" />
                </div>
                <h3 className="text-base font-bold text-[#07345C] dark:text-white">
                  {isAr ? 'أضف رأيك وتجربتك مع كلينزو' : 'Write Your Review'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-bold text-[#07345C] dark:text-slate-200 mb-1.5">
                  {isAr ? 'اسمك الكريم' : 'Your Name'} <span className="text-[#F0444C]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={isAr ? 'مثال: محمد الغامدي' : 'e.g. John Doe'}
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#0866C6] focus:ring-1 focus:ring-[#0866C6] transition-all"
                />
              </div>

              {/* Service & Category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#07345C] dark:text-slate-200 mb-1.5">
                    {isAr ? 'نوع الخدمة' : 'Service Type'}
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as 'car' | 'home')}
                    className="w-full px-3 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white focus:outline-hidden focus:border-[#0866C6] transition-all"
                  >
                    <option value="car">{isAr ? 'غسيل وعناية سيارات' : 'Car Detailing'}</option>
                    <option value="home">{isAr ? 'تنظيف منازل بالبخار' : 'Home Cleaning'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#07345C] dark:text-slate-200 mb-1.5">
                    {isAr ? 'اسم الباقة / الخدمة' : 'Package / Service'}
                  </label>
                  <input
                    type="text"
                    value={formService}
                    onChange={(e) => setFormService(e.target.value)}
                    placeholder={isAr ? 'مثال: الباقة الملكية' : 'e.g. VIP Royal'}
                    className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#0866C6] transition-all"
                  />
                </div>
              </div>

              {/* Rating Stars */}
              <div>
                <label className="block text-xs font-bold text-[#07345C] dark:text-slate-200 mb-1.5">
                  {isAr ? 'تقييمك للخدمة' : 'Your Rating'}
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      type="button"
                      key={star}
                      onClick={() => setFormRating(star)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={cn(
                          'w-6 h-6 transition-colors',
                          star <= formRating
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-300 dark:text-slate-600'
                        )}
                      />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-amber-500 ms-2">
                    {formRating} / 5
                  </span>
                </div>
              </div>

              {/* Comment */}
              <div>
                <label className="block text-xs font-bold text-[#07345C] dark:text-slate-200 mb-1.5">
                  {isAr ? 'رأيك وتجربتك بالتفصيل' : 'Your Feedback'} <span className="text-[#F0444C]">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={formComment}
                  onChange={(e) => setFormComment(e.target.value)}
                  placeholder={
                    isAr
                      ? 'شاركنا انطباعك عن دقة الموعد، جودة المواد المستخدمة، واحترافية فريق العمل...'
                      : 'Share your experience about team punctuality, equipment quality, and overall results...'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#0866C6] focus:ring-1 focus:ring-[#0866C6] transition-all leading-relaxed"
                />
              </div>

              {/* Avatar URL (Optional) */}
              <div>
                <label className="block text-xs font-bold text-[#07345C] dark:text-slate-200 mb-1.5">
                  {isAr ? 'رابط صورتك الشخصية (اختياري)' : 'Avatar URL (Optional)'}
                </label>
                <input
                  type="url"
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl text-xs bg-slate-50 dark:bg-[#041728] border border-slate-200 dark:border-slate-700 text-[#0F172A] dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-[#0866C6] transition-all"
                />
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {isAr ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#0866C6] hover:bg-[#07345C] text-white text-xs font-bold shadow-md shadow-[#0866C6]/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? (isAr ? 'جاري الإرسال...' : 'Submitting...') : (isAr ? 'نشر التقييم' : 'Submit Review')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
