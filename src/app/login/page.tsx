'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, Phone, Lock, UserCheck, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { useLocaleStore } from '@/store/useLocaleStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { normalizeMediaUrl } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { toast } from 'sonner';
import {
  validateEgyptianPhone,
  VALID_EGYPTIAN_PREFIXES,
  normalizePhoneInput,
  convertArabicToAsciiDigits,
} from '@/lib/validation/phoneValidation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale, direction } = useLocaleStore();
  const { login, isAuthenticated, authStatus, resetDemoUser } = useAuthStore();
  const isAr = locale === 'ar';
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  const rawRedirect = searchParams.get('redirect');
  const redirectTarget = rawRedirect && rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')
    ? rawRedirect
    : '/account';

  React.useEffect(() => {
    if (isAuthenticated && authStatus === 'AUTHENTICATED') {
      router.replace(redirectTarget);
    }
  }, [isAuthenticated, authStatus, redirectTarget, router]);

  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const converted = convertArabicToAsciiDigits(rawVal);

    if (/[^0-9\s\+\-]/.test(converted)) {
      setPhoneError('يرجى إدخال أرقام فقط.');
    } else {
      setPhoneError(null);
    }

    const digits = normalizePhoneInput(rawVal);
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

    if (!cleanPhone || !cleanPassword) {
      toast.error(isAr ? 'يرجى إدخال رقم الهاتف وكلمة المرور' : 'Please fill all fields');
      return;
    }

    // Strict Egyptian Phone Validation
    const phoneVal = validateEgyptianPhone(cleanPhone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
      toast.error(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(cleanPhone, cleanPassword, rememberMe);
      if (!result.success) {
        toast.error(
          result.message ||
            (isAr ? 'رقم الهاتف أو كلمة المرور غير صحيحة' : 'Invalid phone number or password')
        );
        return;
      }
      toast.success(isAr ? 'تم تسجيل الدخول بنجاح' : 'Logged in successfully');
      router.push(redirectTarget);
    } catch (err: any) {
      toast.error(err.message || (isAr ? 'حدث خطأ أثناء تسجيل الدخول' : 'Login failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const branding = useSettingsStore((s) => s.settings.branding);
  const logoText = branding?.logoText || 'CLEANZO';

  return (
    <div className="py-16 bg-[#EAF8FC] dark:bg-[#041728] min-h-[85vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <Link href="/" aria-label={logoText} className="inline-flex items-center justify-center mb-2">
            <div className="h-11 w-auto flex items-center justify-center shrink-0">
              {branding?.logoUrl ? (
                <img
                  src={normalizeMediaUrl(branding.logoUrl)}
                  alt={logoText}
                  className="h-11 w-auto max-h-11 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/brand/zo/cleanzo-logo.png';
                  }}
                />
              ) : (
                <Sparkles className="w-6 h-6 text-sky-500" />
              )}
            </div>
          </Link>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            {t.nav.login}
          </h1>
          <p className="text-xs text-slate-500">
            {redirectTarget.includes('/booking')
              ? (isAr ? 'سجّل دخولك للمتابعة الفورية وتأكيد حجزك الحالي' : 'Log in to immediately confirm your current booking')
              : (isAr
                ? 'أهلاً بك مجدداً في منصة كلينزو لخدمات السيارات والمنازل'
                : 'Welcome back to Cleanzo services platform')}
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-start">
            <Input
              label={isAr ? 'رقم الهاتف' : 'Phone Number'}
              type="tel"
              inputMode="numeric"
              maxLength={11}
              dir="ltr"
              value={phone}
              onChange={handlePhoneChange}
              onBlur={handlePhoneBlur}
              placeholder={isAr ? '01xxxxxxxxx' : '01xxxxxxxxx'}
              error={phoneError || undefined}
              required
            />

            <Input
              label={isAr ? 'كلمة المرور' : 'Password'}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isAr ? 'أدخل كلمة المرور' : 'Enter your password'}
              required
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>{isAr ? 'تذكرني على هذا الجهاز' : 'Remember me'}</span>
              </label>

              <Link
                href="/forgot-password"
                className="text-sky-600 dark:text-sky-400 hover:underline font-semibold"
              >
                {isAr ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading || Boolean(phoneError) || (phone.length > 0 && phone.length !== 11)}
              className="w-full justify-center shadow-lg shadow-sky-500/25 mt-2"
            >
              <span>{t.nav.login}</span>
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500">
            {isAr ? 'ليس لديك حساب بعد؟' : "Don't have an account?"}{' '}
            <Link
              href={rawRedirect ? `/register?redirect=${encodeURIComponent(rawRedirect)}` : '/register'}
              className="text-sky-600 dark:text-sky-400 font-bold hover:underline"
            >
              {t.nav.register}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
