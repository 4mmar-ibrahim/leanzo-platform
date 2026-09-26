'use client';

import React, { useState } from 'react';
import { X, Star, CheckCircle2, MessageSquare } from 'lucide-react';
import { Order } from '@/types';
import { toast } from 'sonner';

interface OrderReviewModalProps {
  order: Order;
  isOpen: boolean;
  onClose: () => void;
}

export function OrderReviewModal({ order, isOpen, onClose }: OrderReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      toast.error('يرجى كتابة كلمة أو ملاحظة قصيرة عن رأيك بالخدمة.');
      return;
    }

    setSubmitted(true);
    toast.success('شكرًا لتقييمك! نسعد بخدمتك دائماً.');
    setTimeout(() => {
      onClose();
      setSubmitted(false);
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-5 animate-in zoom-in-95 text-center">
        {!submitted ? (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-start">
                <span className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                  ★
                </span>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white">
                    تقييم جودة الخدمة
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    طلب #{order.id} — {order.service?.title || (order as any).serviceSnapshot?.title || (order as any).serviceName || 'خدمة كلينزو'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Star Picker */}
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  كيف كانت تجربتك مع الفني اليوم؟
                </p>
                <div className="flex items-center justify-center gap-1.5 py-2" dir="ltr">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = (hoverRating ?? rating) >= star;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1.5 transition-transform hover:scale-125 focus:outline-hidden"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors ${
                            isFilled
                              ? 'text-amber-400 fill-amber-400 drop-shadow-sm'
                              : 'text-slate-300 dark:text-slate-700'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <span className="text-[11px] font-bold text-amber-600">
                  {rating === 5 && 'ممتازة جداً (5/5) 🌟'}
                  {rating === 4 && 'جيدة جداً (4/5) 👍'}
                  {rating === 3 && 'مقبولة (3/5) 👌'}
                  {rating <= 2 && 'أقل من المتوقع ⚠️'}
                </span>
              </div>

              {/* Review Textarea */}
              <div className="space-y-1 text-start">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  اكتب رأيك وملاحظاتك
                </label>
                <textarea
                  rows={3}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="سرعة الفني، نظافة السيارة أو المكان، المواد المستخدمة..."
                  className="w-full px-3 py-2 text-xs rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-md shadow-amber-500/25 transition-all"
                >
                  إرسال التقييم
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="py-6 space-y-3 animate-in zoom-in-95">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              تم إرسال التقييم بنجاح!
            </h3>
            <p className="text-xs text-slate-400">
              شكراً لمشاركتك معنا، رأيك يساعدنا على تحسين وتطوير جودة الخدمات دوماً.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
