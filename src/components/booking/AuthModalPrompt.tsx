'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, UserCheck, Sparkles, LogIn, UserPlus } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useBookingStore } from '@/store/useBookingStore';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import {
  validateEgyptianPhone,
  VALID_EGYPTIAN_PREFIXES,
} from '@/lib/validation/phoneValidation';

interface AuthModalPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModalPrompt({ isOpen, onClose, onSuccess }: AuthModalPromptProps) {
  const { t, locale } = useLocaleStore();
  const { login, register } = useAuthStore();
  const { guestName, guestPhone, setGuestInfo } = useBookingStore();
  const isAr = locale === 'ar';

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState(guestName || '');
  const [phone, setPhone] = useState(guestPhone || '');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (guestPhone) setPhone(guestPhone);
      if (guestName) setName(guestName);
    }
  }, [isOpen, guestPhone, guestName]);

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
    const cleanPassword = password.trim();
    const cleanName = name.trim();

    if (!cleanPhone) {
      toast.error(isAr ? 'يرجى إدخال رقم الهاتف' : 'Please enter phone number');
      return;
    }

    const phoneVal = validateEgyptianPhone(cleanPhone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
      toast.error(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
      return;
    }

    if (!cleanPassword) {
      toast.error(isAr ? 'يرجى إدخال كلمة المرور' : 'Please enter password');
      return;
    }

    setGuestInfo(cleanName || guestName || '', cleanPhone);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!cleanName) {
          toast.error(isAr ? 'يرجى إدخال الاسم بالكامل' : 'Please enter full name');
          setIsLoading(false);
          return;
        }
        const res = await register({
          name: cleanName,
          phone: cleanPhone,
          password: cleanPassword,
        });
        if (!res.success) {
          toast.error(res.message || (isAr ? 'تعذر إنشاء الحساب' : 'Failed to create account'));
          return;
        }
        toast.success(isAr ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح' : 'Account created & logged in');
      } else {
        const res = await login(cleanPhone, cleanPassword);
        if (!res.success) {
          toast.error(res.message || (isAr ? 'بيانات الدخول غير صحيحة' : 'Invalid credentials'));
          return;
        }
        toast.success(isAr ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully');
      }

      onSuccess();
      onClose();
    } catch {
      toast.error(isAr ? 'حدث خطأ، يرجى المحاولة مرة أخرى' : 'An error occurred, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isAr ? 'لإتمام الحجز، يرجى تسجيل الدخول أو إنشاء حساب' : 'Sign In or Register to Confirm Booking'}
      description={
        isAr
          ? 'بيانات حجزك وموقعك وموعدك محفوظة بالكامل وستنتقل معك فوراً لتأكيد الحجز.'
          : 'Your booking draft, date, time and address are preserved safely.'
      }
      maxWidth="md"
    >
      <div className="space-y-5 pt-2 text-start">
        {/* Tab switcher: Login / Register */}
        <div className="flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>{t.nav.login}</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('register')}
            className={`flex-1 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-bold'
                : 'text-slate-500'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{t.nav.register}</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <Input
              label={isAr ? 'الاسم الكامل' : 'Full Name'}
              placeholder={isAr ? 'مثال: أحمد عبد الله' : 'e.g. Ahmed Abdallah'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <Input
            label={isAr ? 'رقم الهاتف المحمول' : 'Mobile Phone Number'}
            placeholder="01012345678"
            type="tel"
            inputMode="numeric"
            maxLength={11}
            dir="ltr"
            value={phone}
            onChange={handlePhoneChange}
            onBlur={handlePhoneBlur}
            error={phoneError || undefined}
            required
          />

          <Input
            label={isAr ? 'كلمة المرور' : 'Password'}
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            disabled={isLoading || Boolean(phoneError) || (phone.length > 0 && phone.length !== 11)}
            className="w-full justify-center"
          >
            <span>{mode === 'login' ? isAr ? 'تسجيل الدخول ومتابعة الحجز' : 'Log In & Continue' : isAr ? 'إنشاء الحساب ومتابعة الحجز' : 'Register & Continue'}</span>
          </Button>
        </form>

        <div className="text-center pt-1 border-t border-slate-100 dark:border-slate-800">
          <Link
            href={mode === 'login' ? '/login?redirect=/booking' : '/register?redirect=/booking'}
            className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline"
          >
            {isAr ? 'فتح صفحة تسجيل الدخول الكاملة (مع الاحتفاظ بالحجز)' : 'Open full login page (retaining booking)'}
          </Link>
        </div>
      </div>
    </Dialog>
  );
}
