export const bookingStepGuide = {
  1: { label: 'اختيار الخدمة', ar: 'اختر الباقة الأنسب لعربيتك أو بيتك 💧', en: 'Select the best package for your car or home 💧' },
  2: { label: 'اختيار الموعد', ar: 'حدد اليوم والوقت الأنسب ليك.. أسطولنا بيوصل في الميعاد تماماً ⏱️', en: 'Choose date & time. Our fleet is 100% punctual ⏱️' },
  3: { label: 'العنوان', ar: 'اكتب عنوانك وهنجيلك بعربيتنا المجهزة بأحدث أجهزة البخار 📍', en: 'Set your address and our mobile van will arrive ready 📍' },
  4: { label: 'المراجعة والتأكيد', ar: 'راجع بيانات حجزك ودوس تأكيد.. واستمتع بنتيجة تفرحك 🎉', en: 'Review details and confirm. Enjoy pristine cleanliness 🎉' },
};

export type BookingGuideStep = keyof typeof bookingStepGuide;
export type BookingGuide = Partial<Record<BookingGuideStep, Partial<Record<'ar' | 'en', string>>>>;
