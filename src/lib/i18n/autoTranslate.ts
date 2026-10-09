/**
 * Cleanzo Automatic Translation & Localization Engine
 * Provides instant Arabic <-> English translations for all Cleanzo UI,
 * database entities (categories, services, packages, addons, descriptions),
 * addresses, dates, and dynamically added user/admin content.
 */

import { Locale } from '@/store/useLocaleStore';

// Rich bidirectional dictionary for Cleanzo domain
const PHRASE_DICTIONARY: Record<string, string> = {
  // Brand & General
  'كلينزو': 'Cleanzo',
  'منصة كلينزو': 'Cleanzo Platform',
  'فريق كلينزو': 'Cleanzo Team',
  'خدمات كلينزو': 'Cleanzo Services',
  'باقات كلينزو': 'Cleanzo Packages',
  'ضمان كلينزو': 'Cleanzo Guarantee',
  'دليل كلينزو الذكي': 'Cleanzo Smart Guide',
  'كلينزو بريميوم': 'Cleanzo Premium',
  'عميل مميز لدى كلينزو': 'Cleanzo Premium Member',
  'حجز جديد': 'New Booking',
  'حجز موعد جديد': 'Book New Appointment',
  'حجز خدمة جديدة': 'New Service Booking',
  'تأكيد الحجز': 'Confirm Booking',
  'مراجعة وتأكيد': 'Review & Confirm',
  'المراجعة والتأكيد': 'Review & Confirm',
  'المراجعة': 'Review',
  'الخدمة': 'Service',
  'الموعد': 'Schedule',
  'العنوان': 'Address',
  'اختر الخدمة': 'Choose Service',
  'اختر نوع الخدمة': 'Select Service Category',
  'اختر التاريخ المناسب': 'Select Preferred Date',
  'اختر الوقت المناسب': 'Select Preferred Time',
  'اختر الوقت المتاح': 'Select Available Time',
  'اختر اليوم الأنسب': 'Choose Preferred Day',
  'خدماتنا المتميزة': 'Our Premium Services',
  'جميع باقات العناية بالسيارات': 'All Car Care Packages',
  'جميع باقات العناية بالمنازل': 'All Home Care Packages',
  'جميع باقات العناية المتكاملة': 'All Integrated Care Packages',
  'خدمات متوفرة': 'Services Available',
  'خدمات متاحة': 'Available Services',
  'عروض حصرية': 'Exclusive Offers',
  'خصم': 'Sale',
  'باقات دورية': 'Subscriptions',
  'الاشتراكات': 'Subscriptions',
  'اشتراكاتي': 'My Subscriptions',
  'العروض': 'Offers',
  'معرض الأعمال': 'Portfolio',
  'أعمالنا': 'Our Work',
  'آراء العملاء': 'Customer Reviews',
  'من نحن': 'About Us',
  'الأسئلة الشائعة': 'FAQs',
  'تواصل معنا': 'Contact Us',
  'الرئيسية': 'Home',
  'الحساب': 'Account',
  'حسابي': 'My Account',
  'لوحة التحكم': 'Dashboard',
  'تسجيل الدخول': 'Login',
  'تسجيل الخروج': 'Logout',
  'إنشاء حساب': 'Sign Up',
  'مرحباً': 'Welcome',
  'عميلنا العزيز': 'Valued Customer',

  // Categories & Common Descriptions
  'خدمات السيارات': 'Car Services',
  'خدمات المنازل': 'Home Services',
  'عناية بالسيارات': 'Car Care',
  'عناية بالمنازل': 'Home Care',
  'عناية متخصصة بالسيارات': 'Specialized Automotive Care',
  'عناية متقدمة بالمنازل والفلل': 'Advanced Residential Care',
  'غسيل احترافي متنقل': 'Mobile Professional Wash',
  'غسيل سيارات متنقل': 'Mobile Car Wash',
  'غسيل سيارات': 'Car Wash',
  'ديتيلينج وتلميع': 'Detailing & Polishing',
  'ديتيلينج سيارات': 'Car Detailing',
  'تلميع سيارات': 'Car Polishing',
  'تلميع داخلي وخارجي': 'Interior & Exterior Detailing',
  'تلميع داخلي': 'Interior Detailing',
  'تلميع خارجي': 'Exterior Detailing',
  'نانو سيراميك': 'Nano Ceramic Coating',
  'حماية الطلاء': 'Paint Protection',
  'تنظيف منازل': 'Home Cleaning',
  'تنظيف منازل بالبخار': 'Steam Home Cleaning',
  'تنظيف عميق للمنازل': 'Deep Home Cleaning',
  'تنظيف عميق': 'Deep Cleaning',
  'غسيل كنب بالبخار': 'Steam Sofa Cleaning',
  'غسيل كنب ومفروشات': 'Sofa & Upholstery Cleaning',
  'تنظيف كنب': 'Sofa Cleaning',
  'تنظيف سجاد وموكيت': 'Carpet & Rug Cleaning',
  'تنظيف سجاد': 'Carpet Cleaning',
  'تنظيف مراتب': 'Mattress Sanitization',
  'تعقيم منازل': 'Home Sanitization',
  'تعقيم وتطهير شامل': 'Comprehensive Disinfection',
  'تنظيف مطابخ وحمامات': 'Kitchen & Bathroom Deep Clean',
  'تنظيف واجهات': 'Facade Cleaning',
  'مكافحة حشرات': 'Pest Control',

  // Dynamic CMS Category phrases added by user/admin
  'كل مايتعلق بنظافة والعناية بالسيارات': 'All automotive cleaning, washing and detailing services',
  'كل مايتعلق بنظافة وعناية السيارات': 'All automotive cleaning, washing and detailing services',
  'كل مايتعلق بعناية وتنظيف المنازل': 'All residential deep cleaning, sanitization and care',
  'كل ما يتعلق بنظافة السيارات': 'All car cleaning and care services',
  'كل ما يتعلق بنظافة المنازل': 'All home cleaning and sanitization services',
  'غسيل، ديتيلينج، شمع، بخار': 'Wash, Detailing, Wax, Steam',
  'تنظيف عميق، كنب، مطابخ، مفروشات': 'Deep clean, sofas, kitchens, upholstery',
  'غسيل احترافي متكامل، ديتيلينج، تعقيم داخلي، وحماية وتلميع الطلاء باستخدام أحدث التقنيات.':
    'Integrated professional wash, detailing, interior sanitization, and paint protection using state-of-the-art technologies.',
  'حلول تنظيف متكاملة ومصممة بعناية لتلبية أعلى معايير النظافة والرفاهية لسيارتك ومنزلك.':
    'Integrated cleaning solutions crafted to meet the highest standards of cleanliness and comfort for your car and home.',
  'يمكنك اختيار أكثر من خدمة من أقسام مختلفة في نفس الحجز':
    'You can choose multiple services across categories in one booking',

  // Booking & Address Terms
  'المنزل': 'Home',
  'العمل': 'Work',
  'المكتب': 'Office',
  'الفيلا': 'Villa',
  'الشقة': 'Apartment',
  'الشارع': 'Street',
  'الحي': 'District',
  'المحافظة': 'Governorate',
  'المدينة': 'City',
  'المنطقة': 'Area',
  'اسم العميل': 'Customer Name',
  'رقم الهاتف': 'Phone Number',
  'رقم المبنى': 'Building Number',
  'المبنى': 'Building',
  'الطابق': 'Floor',
  'رقم الشقة': 'Apartment Number',
  'علامة مميزة': 'Landmark',
  'علامة مميزة (اختياري)': 'Landmark (Optional)',
  'ملاحظات إضافية': 'Additional Notes',
  'إضافة عنوان جديد': 'Add New Address',
  'إضافة عنوان جديد للحجز': 'Add New Booking Address',
  'تعديل العنوان': 'Edit Address',
  'حفظ العنوان': 'Save Address',
  'حفظ واختيار': 'Save & Select',
  'العناوين المحفوظة': 'Saved Addresses',
  'تم تحديد عنوان تقديم الخدمة': 'Service Address Confirmed',
  'العنوان المعتمد للطلب': 'Selected for Booking',
  'جاهز للمتابعة': 'Ready to Proceed',
  'تأكيد واستخدام هذا العنوان': 'Confirm & Use Address',
  'إلغاء': 'Cancel',
  'تأكيد': 'Confirm',
  'التالي': 'Next',
  'السابق': 'Back',
  'الرجوع': 'Back',
  'متابعة': 'Continue',
  'احجز الآن': 'Book Now',
  'اطلب الآن': 'Order Now',
  'عرض التفاصيل': 'View Details',

  // Egyptian Locations
  'المنيا': 'Minya',
  'المنيا الجديدة': 'New Minya',
  'القاهرة': 'Cairo',
  'الجيزة': 'Giza',
  'الإسكندرية': 'Alexandria',
  'الشيخ زايد': 'Sheikh Zayed',
  'السادس من أكتوبر': '6th of October',
  '6 أكتوبر': '6th of October',
  'التجمع الخامس': 'Fifth Settlement',
  'القاهرة الجديدة': 'New Cairo',
  'المعادي': 'Maadi',
  'مدينة نصر': 'Nasr City',
  'مصر الجديدة': 'Heliopolis',
  'الدقي': 'Dokki',
  'المهندسين': 'Mohandessin',
  'الزمالك': 'Zamalek',
  'شبرا': 'Shubra',
  'حلوان': 'Helwan',
  'ملوي': 'Mallawi',
  'بني مزار': 'Beni Mazar',
  'سمالوط': 'Samalut',
  'مغاغة': 'Maghagha',
  'أبو قرقاص': 'Abu Qurqas',

  // Packages & Addons
  'الباقة الأساسية': 'Basic Package',
  'الباقة الفضية': 'Silver Package',
  'الباقة الذهبية': 'Gold Package',
  'الباقة البلاتينية': 'Platinum Package',
  'باقة VIP': 'VIP Package',
  'باقة النخبة': 'Elite Package',
  'خدمة إضافية': 'Add-on Service',
  'الخدمات الإضافية': 'Add-on Services',
  'شامل الضريبة': 'Tax Included',
  'جنيه': 'EGP',
  'ج.م': 'EGP',
  'ريال': 'EGP',
  'دقيقة': 'min',
  'ساعة': 'hour',
};

// Word-level fallback dictionary for partial phrases
const WORD_DICTIONARY: Record<string, string> = {
  'خدمات': 'Services',
  'خدمة': 'Service',
  'باقات': 'Packages',
  'باقة': 'Package',
  'سيارات': 'Cars',
  'سيارة': 'Car',
  'منازل': 'Homes',
  'منزل': 'Home',
  'تنظيف': 'Cleaning',
  'غسيل': 'Wash',
  'تلميع': 'Polishing',
  'تعقيم': 'Sanitization',
  'تطهير': 'Disinfection',
  'حماية': 'Protection',
  'داخلي': 'Interior',
  'خارجي': 'Exterior',
  'شامل': 'Comprehensive',
  'عميق': 'Deep',
  'بخار': 'Steam',
  'كنب': 'Sofa',
  'سجاد': 'Carpet',
  'مراتب': 'Mattress',
  'مطابخ': 'Kitchens',
  'حمامات': 'Bathrooms',
  'فلل': 'Villas',
  'شقق': 'Apartments',
  'متنقل': 'Mobile',
  'احترافي': 'Professional',
  'متكامل': 'Complete',
  'مميز': 'Premium',
  'جديد': 'New',
  'سريع': 'Express',
  'فوري': 'Instant',
};

/**
 * Checks if a string contains Arabic characters
 */
export function isArabicText(text?: string | null): boolean {
  if (!text) return false;
  return /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(text);
}

/**
 * Automatically translates text based on target locale.
 * If target is Arabic and text is Arabic, returns it directly.
 * If target is English and text is Arabic, translates or romanizes it cleanly.
 */
export function autoTranslate(text?: string | null, targetLocale: Locale = 'ar'): string {
  if (!text) return '';
  const trimmed = text.trim();
  if (!trimmed) return '';

  // If target is Arabic:
  if (targetLocale === 'ar') {
    // If text is already Arabic, return it
    if (isArabicText(trimmed)) return trimmed;
    // Check if it's an English key that has an Arabic counterpart
    for (const [arPhrase, enPhrase] of Object.entries(PHRASE_DICTIONARY)) {
      if (enPhrase.toLowerCase() === trimmed.toLowerCase()) {
        return arPhrase;
      }
    }
    return trimmed;
  }

  // Target is English:
  // If text has NO Arabic, it's already English/Latin
  if (!isArabicText(trimmed)) {
    return trimmed;
  }

  // 1. Direct exact phrase match
  if (PHRASE_DICTIONARY[trimmed]) {
    return PHRASE_DICTIONARY[trimmed];
  }

  // 2. Normalized check (ignoring punctuation / alef variations)
  const normalized = trimmed.replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه');
  for (const [arPhrase, enPhrase] of Object.entries(PHRASE_DICTIONARY)) {
    const normKey = arPhrase.replace(/[إأآا]/g, 'ا').replace(/ة/g, 'ه');
    if (normKey === normalized) {
      return enPhrase;
    }
  }

  // 3. Substring matching for complex descriptions
  let translated = trimmed;
  let hasReplaced = false;

  // Replace longest matching phrases first
  const sortedPhrases = Object.entries(PHRASE_DICTIONARY).sort(
    (a, b) => b[0].length - a[0].length
  );

  for (const [arPhrase, enPhrase] of sortedPhrases) {
    if (translated.includes(arPhrase)) {
      translated = translated.split(arPhrase).join(enPhrase);
      hasReplaced = true;
    }
  }

  if (hasReplaced && !isArabicText(translated)) {
    return translated.trim();
  }

  // 4. Word-by-word fallback for remaining Arabic words
  const words = translated.split(/\s+/);
  const translatedWords = words.map((w) => {
    // Strip leading punctuation
    const cleanWord = w.replace(/[،,.:؛!؟()]/g, '');
    if (WORD_DICTIONARY[cleanWord]) {
      return w.replace(cleanWord, WORD_DICTIONARY[cleanWord]);
    }
    // Remove "ال" prefix
    if (cleanWord.startsWith('ال') && WORD_DICTIONARY[cleanWord.slice(2)]) {
      return w.replace(cleanWord, WORD_DICTIONARY[cleanWord.slice(2)]);
    }
    return w;
  });

  const finalResult = translatedWords.join(' ');
  // If completely translated, return it
  if (!isArabicText(finalResult)) {
    return finalResult.trim();
  }

  // 5. Fallback romanization for custom names like "عهم", "محمد", etc.
  return transliterateArabic(finalResult);
}

/**
 * Phonetic transliteration for Arabic words/names that lack a dictionary entry.
 */
function transliterateArabic(str: string): string {
  const charMap: Record<string, string> = {
    'ا': 'A', 'أ': 'A', 'إ': 'E', 'آ': 'Aa',
    'ب': 'B', 'ت': 'T', 'ث': 'Th',
    'ج': 'G', 'ح': 'H', 'خ': 'Kh',
    'د': 'D', 'ذ': 'Th', 'ر': 'R', 'ز': 'Z',
    'س': 'S', 'ش': 'Sh', 'ص': 'S', 'ض': 'D',
    'ط': 'T', 'ظ': 'Z', 'ع': 'A', 'غ': 'Gh',
    'ف': 'F', 'ق': 'Q', 'ك': 'K', 'ل': 'L',
    'م': 'M', 'ن': 'N', 'ه': 'H', 'و': 'W',
    'ي': 'Y', 'ى': 'A', 'ة': 'a', 'ء': '\'',
    'ئ': 'E', 'ؤ': 'O',
  };

  let out = '';
  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (charMap[ch]) {
      out += charMap[ch];
    } else {
      out += ch;
    }
  }
  return out.trim();
}
