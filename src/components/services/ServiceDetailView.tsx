'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Car,
  Home,
  Clock,
  Star,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Share2,
  Calendar,
  Heart,
  AlertTriangle,
  Loader2,
  ArrowUpRight,
  Info,
  Package as PackageIcon,
  Check,
  Sparkles,
} from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useBookingStore } from '@/store/useBookingStore';
import { useServiceStore } from '@/store/useServiceStore';
import { useFavoriteStore } from '@/store/useFavoriteStore';
import { useRecentlyViewedStore } from '@/store/useRecentlyViewedStore';
import { PriceDisplay } from '@/components/common/PriceDisplay';
import { ServiceCard } from '@/components/services/ServiceCard';
import { ServiceHowItWorks } from '@/components/services/ServiceHowItWorks';

import { Button } from '@/components/ui/Button';
import { formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { CleanzoImage } from '@/components/common/CleanzoImage';
import { calculateItemizedPricing } from '@/lib/pricing';
import { Service, ServiceCategory, ServicePackage, ServiceAddon } from '@/types';

interface ServiceDetailViewProps {
  serviceId: string;
  expectedCategory?: ServiceCategory;
}

export function ServiceDetailView({ serviceId, expectedCategory }: ServiceDetailViewProps) {
  const router = useRouter();
  const { t, locale, direction } = useLocaleStore();
  const { selectService, selectPackage, toggleAddon, clearAddons } = useBookingStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const storeServices = useServiceStore((s) => s.services);
  const fetchServices = useServiceStore((s) => s.fetchServices);

  const [service, setService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadService() {
      if (!serviceId) {
        setNotFound(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const data = await cleanzoApi.services.getServiceById(serviceId);
        if (!isMounted) return;

        if (!data || (data as any).isArchived || data.available === false) {
          setNotFound(true);
          setService(null);
        } else {
          setService(data);
          setNotFound(false);
        }
      } catch (err) {
        if (!isMounted) return;
        setNotFound(true);
        setService(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadService();
    fetchServices(); // keep related services up to date

    return () => {
      isMounted = false;
    };
  }, [serviceId, fetchServices]);


  const isFav = useFavoriteStore((s) => (service ? s.isFavorite(service.id) : false));
  const toggleFavorite = useFavoriteStore((s) => s.toggleFavorite);
  const addRecentlyViewed = useRecentlyViewedStore((s) => s.addRecentlyViewed);

  useEffect(() => {
    if (service?.id) {
      addRecentlyViewed(service.id);
    }
  }, [service?.id, addRecentlyViewed]);

  const handleToggleFavorite = () => {
    if (!service) return;
    toggleFavorite(service.id);
    if (!isFav) {
      toast.success(isAr ? 'تمت إضافة الخدمة إلى المفضلة' : 'Added to favorites');
    } else {
      toast.info(isAr ? 'تمت إزالة الخدمة من المفضلة' : 'Removed from favorites');
    }
  };

  // Strictly filter related services by this service's category
  const relatedServices = storeServices
    .filter((s) => service && s.category === service.category && s.id !== service.id && s.available !== false && !(s as any).isArchived)
    .slice(0, 3);

  const [selectedPkg, setSelectedPkg] = useState<ServicePackage | null>(null);
  const [selectedAddonsList, setSelectedAddonsList] = useState<ServiceAddon[]>([]);

  useEffect(() => {
    setSelectedPkg(null);
    setSelectedAddonsList([]);
  }, [service]);

  const handleToggleAddon = (addon: ServiceAddon) => {
    setSelectedAddonsList((prev) =>
      prev.some((a) => a.id === addon.id) ? prev.filter((a) => a.id !== addon.id) : [...prev, addon]
    );
  };

  const itemizedPricing = service
    ? calculateItemizedPricing({
        service: {
          id: service.id,
          price: Number(service.price) || 0,
          originalPrice: service.originalPrice,
          discount: service.discount,
        },
        selectedPackage: selectedPkg
          ? {
              id: selectedPkg.id,
              name: selectedPkg.name,
              price: Number(selectedPkg.price) || 0,
              originalPrice: selectedPkg.originalPrice,
            }
          : null,
        addons: selectedAddonsList.map((a) => ({
          id: a.id,
          name: a.name,
          price: Number(a.price) || 0,
        })),
      })
    : null;

  const displayPrice = itemizedPricing ? itemizedPricing.finalPrice : 0;
  const displayOriginalPrice =
    itemizedPricing && itemizedPricing.catalogDiscount > 0
      ? itemizedPricing.originalTotal
      : undefined;

  const displayDuration = selectedPkg
    ? Number(selectedPkg.durationMinutes) + selectedAddonsList.reduce((s, a) => s + (Number(a.durationMinutes) || 0), 0)
    : service
    ? Number(service.serviceDurationMinutes || service.duration || 45) + selectedAddonsList.reduce((s, a) => s + (Number(a.durationMinutes) || 0), 0)
    : 45;

  const handleBookService = () => {
    if (!service) return;
    selectService(service);
    selectPackage(selectedPkg);
    clearAddons();
    selectedAddonsList.forEach((a) => toggleAddon(a));
    router.push(`/booking?category=${service.category}&serviceId=${service.id}`);
  };

  const handleShare = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success(isAr ? 'تم نسخ رابط الخدمة' : 'Service link copied to clipboard');
    }
  };

  // Loading State
  if (isLoading) {
    return (
      <div className="py-32 flex flex-col items-center justify-center min-h-[60vh] text-center space-y-4">
        <Loader2 className="w-10 h-10 text-sky-500 animate-spin" />
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {isAr ? 'جاري تحميل تفاصيل الخدمة...' : 'Loading service details...'}
        </p>
      </div>
    );
  }

  // Not Found / Service Unavailable State
  if (notFound || !service) {
    return (
      <div className="py-24 max-w-2xl mx-auto px-4 text-center space-y-6">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 shadow-xl shadow-amber-500/5">
          <AlertTriangle className="w-10 h-10" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isAr ? 'الخدمة غير متوفرة أو تم حذفها' : 'Service Unavailable or Removed'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {isAr
              ? 'نعتذر منك، الخدمة التي تحاول الوصول إليها لم تعد متاحة للحجز حالياً أو تم إزالتها من الكتالوج بواسطة الإدارة.'
              : 'Sorry, the service you are trying to access is no longer available for booking or has been removed from our catalog.'}
          </p>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/services" className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto shadow-lg shadow-sky-500/25">
              <span>{isAr ? 'تصفح كافة الخدمات المتاحة' : 'Browse Available Services'}</span>
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </Link>
          <Link href="/" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <span>{isAr ? 'العودة للصفحة الرئيسية' : 'Return to Home'}</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Category Mismatch Guard: If URL specifies a category (e.g. /services/car/123) and service is 'home'
  if (expectedCategory && service.category !== expectedCategory) {
    const isCarExpected = expectedCategory === 'car';
    return (
      <div className="py-24 max-w-2xl mx-auto px-4 text-center space-y-6 animate-in fade-in">
        <div className="w-20 h-20 mx-auto rounded-3xl bg-sky-500/10 text-sky-500 flex items-center justify-center border border-sky-500/20 shadow-xl shadow-sky-500/5">
          {service.category === 'home' ? <Home className="w-10 h-10 text-[#07345C] dark:text-sky-300" /> : <Car className="w-10 h-10 text-sky-500" />}
        </div>
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-200 dark:border-amber-800">
            <Info className="w-3.5 h-3.5" />
            <span>{isAr ? 'تنبيه قسم الخدمة' : 'Category Section Notice'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {isCarExpected
              ? (isAr ? 'هذه الخدمة تتبع باقات المنازل 🏡' : 'This is a Home Care Service 🏡')
              : (isAr ? 'هذه الخدمة تتبع باقات السيارات 🚗' : 'This is a Car Care Service 🚗')}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            {isCarExpected
              ? (isAr
                  ? `لقد فتحت رابط الخدمة من خلال قسم السيارات، في حين أن خدمة (${service.title}) تنتمي حصراً لقسم خدمات المنازل.`
                  : `You opened this link under Car Services, but (${service.titleEn || service.title}) belongs to Home Services.`
                )
              : (isAr
                  ? `لقد فتحت رابط الخدمة من خلال قسم المنازل، في حين أن خدمة (${service.title}) تنتمي حصراً لقسم خدمات السيارات.`
                  : `You opened this link under Home Services, but (${service.titleEn || service.title}) belongs to Car Services.`
                )}
          </p>
        </div>
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href={`/services/${service.category}/${service.id}`} className="w-full sm:w-auto">
            <Button className="w-full sm:w-auto shadow-lg shadow-sky-500/25">
              <span>{isAr ? `عرض الخدمة في قسم ${service.category === 'car' ? 'السيارات' : 'المنازل'}` : 'View in Correct Category'}</span>
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </Link>
          <Link href={`/services/${expectedCategory}`} className="w-full sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto">
              <span>{isAr ? `العودة لباقات ${isCarExpected ? 'السيارات' : 'المنازل'}` : `Back to ${isCarExpected ? 'Car' : 'Home'} Catalog`}</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="py-10 bg-slate-50 dark:bg-[#0B1120] min-h-screen space-y-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-sky-600 transition-colors">
            {t.nav.home}
          </Link>
          <span>/</span>
          <Link href="/services" className="hover:text-sky-600 transition-colors">
            {t.nav.services}
          </Link>
          <span>/</span>
          <Link
            href={service.category === 'car' ? '/services/car' : '/services/home'}
            className="hover:text-sky-600 transition-colors"
          >
            {service.category === 'car' ? t.nav.carServices : t.nav.homeServices}
          </Link>
          <span>/</span>
          <span className="text-slate-900 dark:text-white font-semibold truncate max-w-[200px]">
            {isAr ? service.title : service.titleEn}
          </span>
        </div>

        {/* Main Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left / Main Column: Imagery & Details */}
          <div className="lg:col-span-8 space-y-8">
            {/* Top Action & Badge Bar (Cleanly Outside Image) */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white shadow-2xs">
                  {service.category === 'car' ? (
                    <>
                      <Car className="w-4 h-4 text-sky-500" />
                      <span>{isAr ? 'خدمات السيارات' : 'Car Service'}</span>
                    </>
                  ) : (
                    <>
                      <Home className="w-4 h-4 text-[#07345C] dark:text-[#83AED0]" />
                      <span>{isAr ? 'خدمات المنازل' : 'Home Service'}</span>
                    </>
                  )}
                </span>
                {service.popular && (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white shadow-2xs">
                    {isAr ? 'الأكثر طلباً' : 'Popular'}
                  </span>
                )}
              </div>

              {/* Top Actions: Favorite, Share */}
              <div className="flex items-center gap-2">

                <button
                  onClick={handleToggleFavorite}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-rose-500 transition-colors shadow-2xs border border-slate-200/60 dark:border-slate-700"
                  title={isFav ? (isAr ? 'إزالة من المفضلة' : 'Remove favorite') : (isAr ? 'إضافة للمفضلة' : 'Add favorite')}
                >
                  <Heart className={`w-4 h-4 ${isFav ? 'fill-rose-500 text-rose-500' : 'text-slate-700 dark:text-slate-200'}`} />
                </button>

                <button
                  onClick={handleShare}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-sky-500 transition-colors shadow-2xs border border-slate-200/60 dark:border-slate-700"
                  title={isAr ? 'مشاركة الخدمة' : 'Share'}
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clean Circular Service Image Presentation — No Overlays */}
            <div className="p-8 sm:p-12 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col items-center justify-center">
              <div className="relative w-56 h-56 sm:w-72 sm:h-72 lg:w-80 lg:h-80 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 shadow-xl bg-slate-100 dark:bg-slate-800 shrink-0">
                <CleanzoImage
                  src={service.image}
                  alt={isAr ? service.title : service.titleEn}
                  fit="cover"
                  position="center"
                  priority
                  className="w-full h-full object-cover rounded-full"
                />
              </div>

              {/* Service Meta: Rating & Duration (Cleanly Positioned Below Image) */}
              <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm font-semibold">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  <span>{service.rating}</span>
                  <span className="text-slate-400 font-normal">({service.reviewCount} {isAr ? 'تقييم' : 'reviews'})</span>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-3.5 py-1.5 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  <Clock className="w-4 h-4 text-sky-500" />
                  <span>{formatDuration(service.duration, isAr)}</span>
                </div>
              </div>
            </div>

            {/* Description & Overview */}
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-6 text-start shadow-xs">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  {isAr ? service.title : service.titleEn}
                </h1>
                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  {isAr ? service.description : service.descriptionEn}
                </p>
              </div>

              {/* Key Highlights / Features */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.services.includedFeatures}
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(isAr ? service.features : service.featuresEn).map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                      <CheckCircle2 className="w-4 h-4 text-[#0866C6] shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 font-medium">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* What's Included in Detail */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {t.services.whatsIncluded}
                </h3>
                <ul className="space-y-2.5">
                  {(isAr ? service.inclusions : service.inclusionsEn).map((inc, idx) => (
                    <li key={idx} className="flex items-center gap-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                      <div className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                      <span>{inc}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Packages Section */}
              {service.packages && service.packages.filter((p) => p.active !== false).length > 0 && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <PackageIcon className="w-4 h-4 text-sky-500" />
                      <span>{isAr ? 'الباقات البديلة (اختياري)' : 'Alternative Packages (Optional)'}</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {isAr ? '(اختياري - تستبدل السعر الأساسي)' : '(Optional - replaces base price)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Option 0: Base Service (No Package) */}
                    <div
                      onClick={() => setSelectedPkg(null)}
                      className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                        selectedPkg === null
                          ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-500/20 shadow-md'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              selectedPkg === null ? 'border-sky-500 bg-sky-500' : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {selectedPkg === null && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </div>
                          <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {isAr ? 'بدون باقة (الخدمة الأساسية)' : 'No Package (Base Service)'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                          {isAr ? 'الافتراضي' : 'Default'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 ps-6">
                        {isAr ? 'الاستمتاع بالخدمة بالسعر والمدة الأساسية دون ترقية' : 'Enjoy service at base rate and duration without tier upgrade'}
                      </p>
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-mono ps-6">
                        <span className="text-slate-400">{service.serviceDurationMinutes || service.duration || 45} {isAr ? 'دقيقة' : 'min'}</span>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{service.price} {isAr ? 'ج.م' : 'EGP'}</span>
                      </div>
                    </div>

                    {service.packages.filter((p) => p.active !== false).map((pkg) => {
                      const isChosen = selectedPkg?.id === pkg.id;
                      const hasDiscount = pkg.originalPrice && pkg.originalPrice > pkg.price;
                      const savings = hasDiscount ? pkg.originalPrice! - pkg.price : 0;

                      return (
                        <div
                          key={pkg.id}
                          onClick={() => setSelectedPkg(isChosen ? null : pkg)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                            isChosen
                              ? 'border-sky-500 bg-sky-50/50 dark:bg-sky-950/30 ring-2 ring-sky-500/20 shadow-md'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                                  isChosen ? 'border-sky-500 bg-sky-500' : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isChosen && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                              <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                                {isAr ? pkg.name : pkg.nameEn || pkg.name}
                              </span>
                            </div>

                            {hasDiscount && (
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500 text-white shrink-0">
                                {isAr ? `وفر ${savings} ج.م` : `Save ${savings} EGP`}
                              </span>
                            )}
                          </div>

                          {pkg.description && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 ps-6 line-clamp-2">
                              {isAr ? pkg.description : pkg.descriptionEn || pkg.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 ps-6">
                            <span className="text-[11px] text-slate-400 flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-sky-500" />
                              <span>{pkg.durationMinutes} {isAr ? 'دقيقة' : 'min'}</span>
                            </span>

                            <PriceDisplay price={pkg.price} originalPrice={pkg.originalPrice} size="sm" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Add-ons Section */}
              {service.addons && service.addons.filter((a) => a.active !== false).length > 0 && (
                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      <span>{isAr ? 'إضافات اختيارية متاحة مع الخدمة' : 'Optional Add-ons Available'}</span>
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {isAr ? '(اختياري)' : '(Optional)'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {service.addons.filter((a) => a.active !== false).map((addon) => {
                      const isAdded = selectedAddonsList.some((a) => a.id === addon.id);

                      return (
                        <div
                          key={addon.id}
                          onClick={() => handleToggleAddon(addon)}
                          className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 cursor-pointer transition-all ${
                            isAdded
                              ? 'border-amber-500/80 bg-amber-50/40 dark:bg-amber-950/20 ring-1 ring-amber-500/30 shadow-xs'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                                isAdded ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isAdded && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>

                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {isAr ? addon.name : addon.nameEn || addon.name}
                              </p>
                              {addon.durationMinutes > 0 && (
                                <p className="text-[10px] text-slate-400">
                                  +{addon.durationMinutes} {isAr ? 'دقيقة إضافية' : 'extra min'}
                                </p>
                              )}
                            </div>
                          </div>

                          <span className="text-xs font-black text-slate-900 dark:text-white shrink-0 font-mono">
                            +{addon.price} {isAr ? 'ج.م' : 'EGP'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* How It Works 5 Steps */}
            <ServiceHowItWorks />
          </div>

          {/* Right Column: Sticky Booking Card */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-28">
            <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border-2 border-sky-500/30 dark:border-sky-500/20 shadow-xl space-y-6 text-start">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400">
                  {selectedPkg
                    ? isAr
                      ? `سعر الباقة (${selectedPkg.name})`
                      : `Package (${selectedPkg.nameEn || selectedPkg.name})`
                    : isAr
                    ? 'سعر الخدمة'
                    : 'Service Price'}
                </span>
                <PriceDisplay price={displayPrice} originalPrice={displayOriginalPrice} size="lg" />
              </div>

              {selectedAddonsList.length > 0 && (
                <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                  <span className="font-bold text-slate-700 dark:text-slate-300 block">
                    {isAr ? 'الإضافات المحددة:' : 'Selected Add-ons:'}
                  </span>
                  {selectedAddonsList.map((a) => (
                    <div key={a.id} className="flex justify-between">
                      <span>• {isAr ? a.name : a.nameEn || a.name}</span>
                      <span className="font-bold font-mono">+{a.price} {isAr ? 'ج.م' : 'EGP'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Inclusions summary list */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>
                    {isAr ? 'المدة المتوقعة للخدمة:' : 'Duration:'}{' '}
                    <strong className="text-slate-900 dark:text-white">{formatDuration(displayDuration, isAr)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>{isAr ? 'ضمان الرضا الفوري بنسبة 100%' : '100% Satisfaction Guarantee'}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                  <Calendar className="w-4 h-4 text-sky-500 shrink-0" />
                  <span>{isAr ? 'حجز فوري وتأكيد مباشر' : 'Instant booking & direct confirmation'}</span>
                </div>
              </div>

              <Button
                variant="primary"
                size="lg"
                onClick={handleBookService}
                className="w-full justify-center rounded-2xl shadow-xl shadow-sky-500/25 font-bold"
              >
                <span>{t.nav.bookNow}</span>
                <ArrowIcon className="w-4 h-4" />
              </Button>

              <p className="text-[11px] text-center text-slate-400">
                {isAr ? 'لا يلزم الدفع الآن، الدفع عند إتمام الخدمة والمعاينة' : 'No advance payment needed, pay on completion'}
              </p>
            </div>
          </div>
        </div>

        {/* Related Services in the SAME category */}
        {relatedServices.length > 0 && (
          <div className="pt-12 border-t border-slate-200/80 dark:border-slate-800 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                {service.category === 'car'
                  ? (isAr ? 'خدمات سيارات أخرى قد تناسبك' : 'Other Car Services You May Like')
                  : (isAr ? 'خدمات منزلية أخرى قد تناسبك' : 'Other Home Services You May Like')}
              </h3>
              <Link
                href={service.category === 'car' ? '/services/car' : '/services/home'}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>{isAr ? 'عرض الكل' : 'View All'}</span>
                <ArrowIcon className="w-3 h-3" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedServices.map((rel) => (
                <ServiceCard key={rel.id} service={rel} />
              ))}
            </div>
          </div>
        )}
      </div>


    </div>
  );
}
