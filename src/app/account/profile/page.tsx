'use client';

import React, { useState, useEffect } from 'react';
import { User, Phone, Mail, Calendar, CheckCircle2 } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import {
  validateEgyptianPhone,
  VALID_EGYPTIAN_PREFIXES,
} from '@/lib/validation/phoneValidation';

export default function ProfilePage() {
  const { t, locale } = useLocaleStore();
  const { user, updateProfile } = useAuthStore();
  const isAr = locale === 'ar';

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
    if (user?.phone) setPhone(user.phone);
    if (user?.email) setEmail(user.email);
  }, [user]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    if (/[^0-9]/.test(rawVal)) {
      setPhoneError('يرجى إدخال أرقام فقط.');
    } else {
      setPhoneError(null);
    }

    const digits = rawVal.replace(/[^0-9]/g, '').slice(0, 11);
    setPhone(digits);

    if (digits.length >= 3) {
      const prefix = digits.slice(0, 3);
      if (!VALID_EGYPTIAN_PREFIXES.includes(prefix as any)) {
        setPhoneError('رقم الهاتف يجب أن يبدأ بـ 010 أو 011 أو 012 أو 015.');
      } else if (digits.length === 11) {
        setPhoneError(null);
      } else if (phoneTouched) {
        setPhoneError('رقم الهاتف يجب أن يتكون من 11 رقمًا.');
      }
    } else if (digits.length === 0) {
      if (phoneTouched) {
        setPhoneError('يرجى إدخال رقم الهاتف.');
      } else {
        setPhoneError(null);
      }
    } else {
      if (!/[^0-9]/.test(rawVal)) {
        setPhoneError(null);
      }
    }
  };

  const handlePhoneBlur = () => {
    setPhoneTouched(true);
    if (!phone) {
      setPhoneError('يرجى إدخال رقم الهاتف.');
      return;
    }
    const val = validateEgyptianPhone(phone);
    if (!val.isValid) {
      setPhoneError(val.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
    } else {
      setPhoneError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanPhone = phone.trim();
    const phoneVal = validateEgyptianPhone(cleanPhone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
      toast.error(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateProfile({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: cleanPhone,
      });

      if (!res.success) {
        toast.error(res.message || (isAr ? 'فشل حفظ التعديلات' : 'Failed to save changes'));
        return;
      }

      toast.success(isAr ? 'تم حفظ بيانات الملف الشخصي بنجاح' : 'Profile updated successfully');
    } catch {
      toast.error(isAr ? 'حدث خطأ أثناء حفظ البيانات' : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 text-start">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          {t.account.profile}
        </h2>
        <p className="text-xs text-slate-500">
          {isAr ? 'إدارة وتعديل بياناتك الشخصية وحسابك في كلينزو' : 'Manage your personal details and Cleanzo profile'}
        </p>
      </div>

      <div className="p-6 sm:p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-8">
        {/* Avatar Display */}
        <div className="flex items-center gap-4">
          <img
            src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'}
            alt={user?.name || 'Avatar'}
            className="w-20 h-20 rounded-3xl object-cover border-2 border-sky-500 shadow-md"
          />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {user?.name}
            </h3>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>{isAr ? 'تاريخ الانضمام:' : 'Joined:'} {user?.createdAt || '2024-03-15'}</span>
            </p>
          </div>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label={isAr ? 'الاسم الكامل' : 'Full Name'}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />

          <Input
            label={isAr ? 'رقم الهاتف المحمول' : 'Mobile Phone Number'}
            type="tel"
            inputMode="numeric"
            maxLength={11}
            dir="ltr"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            placeholder="01012345678"
            error={phoneError || undefined}
            required
          />

          <Input
            label={isAr ? 'البريد الإلكتروني' : 'Email Address'}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="example@cleanzo.com"
          />

          <div className="pt-4 flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSaving}
              disabled={isSaving || Boolean(phoneError) || (phone.length > 0 && phone.length !== 11)}
              className="shadow-md shadow-sky-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{t.account.saveChanges}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
