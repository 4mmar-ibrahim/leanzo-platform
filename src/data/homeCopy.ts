export const homeCopyFields = {
  guarantee: { label: "ضمان الخدمة", ar: "ضمان كلينزو 100%", en: "100% Guaranteed" },
  punctual: { label: "الالتزام بالموعد", ar: "دقة بالمواعيد", en: "Punctual" },
  equipment: { label: "المعدات", ar: "معدات إيطالية معتمدة", en: "Italian Steam Rigs" },
  whyBadge: { label: "شارة قسم المميزات", ar: "قيمنا ومعاييرنا", en: "Why Cleanzo" },
  whyTitle: { label: "عنوان قسم المميزات", ar: "لماذا تختار كلينزو؟", en: "Why Choose Cleanzo?" },
  whyDescription: { label: "وصف قسم المميزات", ar: "نحن لا نقدم مجرد تنظيف، بل نقدم تجربة متكاملة ترتقي ببيئة معيشتك ومركبتك.", en: "We don't just clean; we elevate your living space and vehicle to showroom perfection." },
  specialistsTitle: { label: "عنوان بطاقة فريق العمل", ar: "فريق عمل محترف ومعتمد", en: "Certified Specialists" },
  specialistsDescription: { label: "وصف بطاقة فريق العمل", ar: "يخضع جميع الفنيين لتدريب صارم وفحص أمني لضمان أعلى مستويات الأمان والجودة.", en: "Rigorous vetting and intensive training ensure utmost safety and perfection in every visit." },
  arrivalTitle: { label: "عنوان بطاقة المواعيد", ar: "مواعيد دقيقة بدون تأخير", en: "Guaranteed Punctuality" },
  arrivalDescription: { label: "وصف بطاقة المواعيد", ar: "نلتزم بالموعد الذي تختاره بالدقيقة، مع تتبع حالة الطلب وتحديثات مستمرة.", en: "On-time arrival guarantee with real-time status notifications for zero hassle." },
  pricingTitle: { label: "عنوان بطاقة الأسعار", ar: "أسعار شفافة بدون مصاريف خفية", en: "Transparent Pricing" },
  pricingDescription: { label: "وصف بطاقة الأسعار", ar: "السعر الذي تراه في الموقع هو السعر النهائي دون أي مفاجآت أو تكاليف إضافية.", en: "Clear upfront pricing with no hidden equipment fees or surprise charges." },
  coverageBadge: { label: "شارة التغطية", ar: "نطاق التغطية والخدمة الحية", en: "Live Service Coverage" },
  coverageTitle: { label: "عنوان التغطية", ar: "أينما كنت في مصر.. أسطول كلينزو يصلك لباب بيتك", en: "Wherever You Are in Egypt, Cleanzo Comes to You" },
  coverageDescription: { label: "وصف التغطية", ar: "سياراتنا المتنقلة مجهزة بأحدث محطات البخار الإيطالي والألماني لتصلك أينما كان موقعك فور تأكيد حجزك.", en: "Our fully equipped mobile detailing units arrive right at your doorstep across all active governorates." },
  coverageSearch: { label: "النص داخل البحث", ar: "ابحث عن محافظتك أو مدينتك (مثل: القاهرة، الجيزة، أكتوبر...)", en: "Search city or district..." },
};

export type HomeCopyKey = keyof typeof homeCopyFields;
export type HomeCopy = Partial<Record<HomeCopyKey, Partial<Record<'ar' | 'en', string>>>>;

export function readHomeCopy(copy: HomeCopy | undefined, field: HomeCopyKey, isAr: boolean): string {
  const locale = isAr ? 'ar' : 'en';
  return copy?.[field]?.[locale] ?? homeCopyFields[field][locale];
}
