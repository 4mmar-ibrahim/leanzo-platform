import mongoose, { Schema, Document } from 'mongoose';

export interface ICMSActionButton {
  id: string;
  label: string;
  labelEn?: string;
  enabled: boolean;
  destinationType: 'internal' | 'booking' | 'services' | 'category' | 'service' | 'section' | 'external';
  destinationValue: string;
  order?: number;
  variant?: 'primary' | 'secondary' | 'outline';
}

export interface ICMSContent extends Document {
  status: 'draft' | 'published';
  version: number;
  hero: {
    headline: string;
    headlineEn: string;
    description: string;
    descriptionEn: string;
    image: string;
    carImage?: string;
    homeImage?: string;
    primaryCtaText: string;
    primaryCtaTextEn: string;
    primaryCtaLink: string;
    secondaryCtaText: string;
    secondaryCtaTextEn: string;
    secondaryCtaLink: string;
    announcement: string;
    announcementEn: string;
    actionButtons?: ICMSActionButton[];
  };
  about: {
    title: string;
    titleEn: string;
    description: string;
    descriptionEn: string;
    mission: string;
    missionEn: string;
    vision: string;
    visionEn: string;
    story: string;
    storyEn: string;
    stats: Array<{ id: string; label: string; labelEn: string; value: string }>;
  };
  contact: {
    phone: string;
    whatsapp: string;
    email: string;
    address: string;
    addressEn: string;
    workingHours: string;
    workingHoursEn: string;
    mapsUrl: string;
    supportNote: string;
    supportNoteEn: string;
  };
  social: {
    facebook: string;
    instagram: string;
    tiktok: string;
    youtube: string;
    whatsapp: string;
    twitter: string;
    linkedin: string;
    items?: any[];
    [key: string]: any;
  };
  sections: Array<{
    id: string;
    key: string;
    nameAr: string;
    nameEn: string;
    visible: boolean;
  }>;
  lastPublishedAt?: Date;
  updatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

const CMSContentSchema = new Schema<ICMSContent>(
  {
    status: { type: String, enum: ['draft', 'published'], required: true, index: true },
    version: { type: Number, default: 1 },
    hero: {
      headline: { type: String, default: 'عناية فائقة تليق بسيارتك ومنزلك' },
      headlineEn: { type: String, default: 'Premium Care for Your Vehicle and Home' },
      description: {
        type: String,
        default:
          'خدمات غسيل وتلميع متنقلة للسيارات وتنظيف عميق بالبخار للمنازل بأحدث المعدات الألمانية والمواد الآمنة حتى باب بيتك.',
      },
      descriptionEn: {
        type: String,
        default:
          'Mobile car detailing and deep home steam sanitation with professional German equipment right at your doorstep.',
      },
      image: {
        type: String,
        default: 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?auto=format&fit=crop&w=1600&q=80',
      },
      carImage: {
        type: String,
        default: '/brand/zo/cleanzo-van-hero.png',
      },
      homeImage: {
        type: String,
        default: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=85',
      },
      primaryCtaText: { type: String, default: 'احجز موعدك الآن' },
      primaryCtaTextEn: { type: String, default: 'Book Your Service' },
      primaryCtaLink: { type: String, default: '/booking' },
      secondaryCtaText: { type: String, default: 'استكشف الخدمات' },
      secondaryCtaTextEn: { type: String, default: 'Explore Services' },
      secondaryCtaLink: { type: String, default: '/services' },
      announcement: {
        type: String,
        default: '✨ خصم 20% لفترة محدودة على باقات الديتيلينج الشامل والغسيل بالبخار كود: CLEAN20',
      },
      announcementEn: {
        type: String,
        default: '✨ Limited 20% off on complete detailing and steam packages. Code: CLEAN20',
      },
      actionButtons: {
        type: [
          {
            id: String,
            label: String,
            labelEn: String,
            enabled: { type: Boolean, default: true },
            destinationType: { type: String, default: 'booking' },
            destinationValue: { type: String, default: '/booking' },
            order: { type: Number, default: 0 },
            variant: { type: String, default: 'primary' },
          },
        ],
        default: [
          {
            id: 'btn-1',
            label: 'احجز موعدك الآن',
            labelEn: 'Book Your Service',
            enabled: true,
            destinationType: 'booking',
            destinationValue: '/booking',
            order: 0,
            variant: 'primary',
          },
          {
            id: 'btn-2',
            label: 'استكشف الخدمات',
            labelEn: 'Explore Services',
            enabled: true,
            destinationType: 'services',
            destinationValue: '/services',
            order: 1,
            variant: 'secondary',
          },
        ],
      },
    },
    about: {
      title: {
        type: String,
        default: 'قصة كلينزو — معايير جديدة للنظافة والعناية الاحترافية',
      },
      titleEn: {
        type: String,
        default: 'The Cleanzo Story — Setting New Benchmarks in Cleanliness',
      },
      description: {
        type: String,
        default:
          'انطلقت كلينزو بهدف واضح: تحويل العناية بالسيارات والمنازل من مهمة روتينية مرهقة إلى تجربة فندقية مريحة وموثوقة بأعلى درجات الدقة والاحتراف.',
      },
      descriptionEn: {
        type: String,
        default:
          'Cleanzo was launched to transform car detailing and home hygiene into an effortless, premium hotel-grade experience.',
      },
      mission: {
        type: String,
        default:
          'تقديم حلول تنظيف مبتكرة وصديقة للبيئة تضمن أعلى درجات النقاء لعملائنا في أي مكان وفي الوقت المحدد دون أي متاعب.',
      },
      missionEn: {
        type: String,
        default:
          'Providing innovative, eco-friendly cleaning solutions ensuring absolute pristine hygiene on time, anywhere.',
      },
      vision: {
        type: String,
        default: 'أن نكون المنصة الرائدة والأولى المعتمدة للعناية بالممتلكات الثمينة والمنازل في الشرق الأوسط.',
      },
      visionEn: {
        type: String,
        default: 'To be the premier recognized platform for car detailing and home sanitation in the Middle East.',
      },
      story: {
        type: String,
        default:
          'بدأنا كفريق شغوف بأدق تفاصيل التلميع والديتيلينج، وقمنا بابتكار وحدات خدمة متنقلة مجهزة بأحدث مضخات البخار الإيطالية ومواد النانو سيراميك.',
      },
      storyEn: {
        type: String,
        default:
          'Starting with a passionate team in car detailing, we built mobile units equipped with Italian steam generators and nano-ceramic technology.',
      },
      stats: {
        type: [
          {
            id: String,
            label: String,
            labelEn: String,
            value: String,
          },
        ],
        default: [
          { id: 'st-1', label: 'عميل سعيد ومستمر', labelEn: 'Happy Customers', value: '+4,850' },
          { id: 'st-2', label: 'خدمة نُفذت بدقة', labelEn: 'Services Completed', value: '+12,400' },
          { id: 'st-3', label: 'فني معتمد ومحترف', labelEn: 'Certified Technicians', value: '45+' },
          { id: 'st-4', label: 'تقييم الجودة الإجمالي', labelEn: 'Average Rating', value: '4.9/5' },
        ],
      },
    },
    contact: {
      phone: { type: String, default: '01012345678' },
      whatsapp: { type: String, default: '+201012345678' },
      email: { type: String, default: 'care@cleanzo.app' },
      address: { type: String, default: 'المنيا الجديدة، الحي الرابع، المحور المركزي، مصر' },
      addressEn: { type: String, default: 'New Minya, Fourth District, Central Axis, Egypt' },
      workingHours: { type: String, default: 'يومياً من 9:00 صباحاً حتى 10:00 مساءً' },
      workingHoursEn: { type: String, default: 'Daily 9:00 AM – 10:00 PM' },
      mapsUrl: { type: String, default: 'https://maps.google.com/?q=New+Minya+Egypt' },
      supportNote: { type: String, default: 'فريق دعم العملاء جاهز لخدمتك عبر واتساب خلال 10 دقائق.' },
      supportNoteEn: { type: String, default: 'Customer support replies on WhatsApp within 10 minutes.' },
    },
    social: {
      facebook: { type: String, default: 'https://facebook.com/cleanzo.app' },
      instagram: { type: String, default: 'https://instagram.com/cleanzo.app' },
      tiktok: { type: String, default: 'https://tiktok.com/@cleanzo.app' },
      youtube: { type: String, default: 'https://youtube.com/@cleanzo' },
      whatsapp: { type: String, default: 'https://wa.me/201012345678' },
      twitter: { type: String, default: 'https://twitter.com/cleanzo_app' },
      linkedin: { type: String, default: 'https://linkedin.com/company/cleanzo' },
    },
    sections: {
      type: [
        {
          id: String,
          key: String,
          nameAr: String,
          nameEn: String,
          visible: Boolean,
        },
      ],
      default: [
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
      ],
    },
    lastPublishedAt: { type: Date },
    updatedBy: { type: String, default: 'admin' },
  },
  { timestamps: true }
);

import { createPrismaRepository } from './prismaModelBridge.js';
export const CMSContent = createPrismaRepository('cMSContent') as any;
export default CMSContent;
