import { Request, Response } from 'express';
import { ReviewModel } from '../models/Review.js';
import { sendSuccess, sendError } from '../utils/responseHandler.js';

const initialReviews = [
  {
    id: 'rev-1',
    customerName: 'طارق عبد العزيز',
    customerNameEn: 'Tarek Abdelaziz',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    date: 'منذ 3 أيام',
    comment: 'تجربة ديتيلينج السيارة VIP كانت مبهرة بحق! السيارة عادت كأنها خرجت من المعرض اليوم، ورائحة المقصورة منعشة جداً بدون أي أثر للبقع القديمة. الفنيون في قمة الذوق والالتزام بالوقت.',
    commentEn: 'The VIP car detailing experience was truly astonishing! The car feels brand new straight from the dealership showroom.',
    serviceName: 'الباقة الملكية - ديتيلينج شامل وفائق VIP',
    serviceNameEn: 'VIP Complete Car Detailing',
    category: 'car',
    verified: true,
    visible: true,
    order: 1,
  },
  {
    id: 'rev-2',
    customerName: 'د. سارة المنشاوي',
    customerNameEn: 'Dr. Sarah El-Menshawy',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    date: 'منذ أسبوع',
    comment: 'طلبت خدمة التنظيف العميق للشقة بعد التشطيب، والمستوى كان يفوق الوصف. اهتمام بأدق التفاصيل خلف الأبواب ومجاري الألوميتال وإزالة بقايا الدهان بالبخار بدون أي ضرر للأرضيات.',
    commentEn: 'Booked the deep home sanitization after renovation. The standard exceeded all expectations with extreme attention to every corner and window track.',
    serviceName: 'التنظيف العميق الشامل للمنازل والفلل',
    serviceNameEn: 'Deep Whole-Home Sanitization',
    category: 'home',
    verified: true,
    visible: true,
    order: 2,
  },
  {
    id: 'rev-3',
    customerName: 'المهندس كريم شريف',
    customerNameEn: 'Eng. Karim Sherif',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    date: 'منذ أسبوعين',
    comment: 'غسيل البريميوم مع طبقة الشمع للسيارة ممتاز جداً. استمر الماء ينساب عن سطح السيارة لأسابيع واللمعان مذهل. ميزة الحجز السلس عبر الموقع وتحديد الموعد بالدقيقة مريحة للغاية.',
    commentEn: 'The premium wash and wax beading is incredible. The water rolls right off the body even weeks later. Fast and smooth online appointment booking.',
    serviceName: 'غسيل بريميوم متكامل مع طبقة شمع',
    serviceNameEn: 'Premium Wash & Wax Seal',
    category: 'car',
    verified: true,
    visible: true,
    order: 3,
  },
  {
    id: 'rev-4',
    customerName: 'مروة الشاذلي',
    customerNameEn: 'Marwa El-Shazly',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=200&q=80',
    rating: 5,
    date: 'منذ 3 أسابيع',
    comment: 'غسيل الكنب بالبخار أنقذ صالون منزلي بعد أن سكبت عليه ابنتي عصيراً داكناً. تم التخلص من البقعة تماماً وجف القماش في ساعتين فقط. سأعتمد كلينزو دائماً!',
    commentEn: 'Steam sofa wash saved my living room couch after heavy juice spills. Zero trace left and dried within 2 hours. Truly dependable!',
    serviceName: 'غسيل وتعقيم المفروشات والكنب والسجاد بالبخار',
    serviceNameEn: 'Upholstery, Sofa & Carpet Steam Wash',
    category: 'home',
    verified: true,
    visible: true,
    order: 4,
  },
];

export let reviewsWiped = true;
export function markReviewsWiped(val: boolean = true) {
  reviewsWiped = val;
}

async function ensureSeedReviews(): Promise<void> {
  // Never auto-seed fake reviews into production database
  return;
}

export async function getPublicReviews(req: Request, res: Response): Promise<void> {
  try {
    const { category } = req.query;
    const filter: any = { visible: true };
    if (category && (category === 'car' || category === 'home')) {
      filter.category = category;
    }

    const reviews = await ReviewModel.find(filter).sort({ order: 1, createdAt: -1 });
    sendSuccess(res, reviews);
  } catch (err: any) {
    console.error('Error fetching public reviews:', err);
    sendError(res, err.message || 'فشل جلب آراء العملاء', 500);
  }
}

export async function getAllReviewsAdmin(req: Request, res: Response): Promise<void> {
  try {
    await ensureSeedReviews();
    const reviews = await ReviewModel.find().sort({ order: 1, createdAt: -1 });
    sendSuccess(res, reviews);
  } catch (err: any) {
    console.error('Error fetching admin reviews:', err);
    sendError(res, err.message || 'فشل جلب آراء العملاء', 500);
  }
}

export async function createReview(req: Request, res: Response): Promise<void> {
  try {
    reviewsWiped = false;
    const data = req.body;
    if (!data.customerName || !data.serviceName || !data.comment) {
      sendError(res, 'يرجى إدخال اسم العميل واسم الخدمة ونص التعليق', 422);
      return;
    }

    const reviewId = data.id || `rev-${Date.now()}`;
    const newReview = await ReviewModel.create({
      ...data,
      id: reviewId,
      rating: data.rating !== undefined ? Number(data.rating) : 5,
      avatar: data.avatar || '',
      image: data.image || '',
      date: data.date || 'الآن',
      order: data.order !== undefined ? Number(data.order) : 0,
      visible: data.visible !== false,
      verified: data.verified !== false,
    });

    sendSuccess(res, newReview, 'تمت إضافة رأي العميل بنجاح', 201);
  } catch (err: any) {
    console.error('Error creating review:', err);
    sendError(res, err.message || 'فشل إضافة رأي العميل', 500);
  }
}

export async function updateReview(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const updated = await ReviewModel.findOneAndUpdate({ id }, req.body, { new: true });
    if (!updated) {
      sendError(res, 'رأي العميل غير موجود', 404);
      return;
    }
    sendSuccess(res, updated, 'تم تحديث رأي العميل بنجاح');
  } catch (err: any) {
    console.error('Error updating review:', err);
    sendError(res, err.message || 'فشل تحديث رأي العميل', 500);
  }
}

export async function deleteReview(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = await ReviewModel.findOneAndDelete({ id });
    if (!deleted) {
      sendError(res, 'رأي العميل غير موجود', 404);
      return;
    }
    sendSuccess(res, null, 'تم حذف رأي العميل بنجاح');
  } catch (err: any) {
    console.error('Error deleting review:', err);
    sendError(res, err.message || 'فشل حذف رأي العميل', 500);
  }
}

export async function clearAllReviews(req: Request, res: Response): Promise<void> {
  try {
    reviewsWiped = true;
    await ReviewModel.deleteMany({});
    sendSuccess(res, { cleared: true }, 'تم مسح وحذف جميع آراء وتقييمات العملاء نهائياً');
  } catch (err: any) {
    console.error('Error clearing all reviews:', err);
    sendError(res, err.message || 'فشل مسح جميع التقييمات', 500);
  }
}
