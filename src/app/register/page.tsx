'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
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
  isValidEgyptianPhone,
} from '@/lib/validation/phoneValidation';

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale, direction } = useLocaleStore();
  const { register, isAuthenticated, authStatus } = useAuthStore();
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

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;

    // Check for invalid characters (letters, spaces, symbols, +, -)
    if (/[^0-9]/.test(rawVal)) {
      setPhoneError('يرجى إدخال أرقام فقط.');
    } else {
      setPhoneError(null);
    }

    const digits = rawVal.replace(/[^0-9]/g, '').slice(0, 11);
    setPhone(digits);

    // Validation UX: no aggressive length error on 1-2 digits
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
      // 1-2 digits: do not show aggressive length errors while typing
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
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanPassword = password.trim();

    if (!cleanName || !cleanPhone || !cleanPassword) {
      toast.error(isAr ? 'يرجى إكمال جميع الحقول المطلوبة' : 'Please fill all required fields');
      return;
    }

    // Strict Egyptian Phone Validation
    const phoneVal = validateEgyptianPhone(cleanPhone);
    if (!phoneVal.isValid) {
      setPhoneError(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
      toast.error(phoneVal.message || 'يرجى إدخال رقم هاتف مصري صحيح.');
      return;
    }

    if (cleanPassword.length < 6) {
      toast.error(isAr ? 'كلمة المرور يجب ألا تقل عن 6 أحرف أو أرقام' : 'Password must be at least 6 characters');
      return;
    }

    if (cleanPassword !== confirmPassword.trim()) {
      toast.error(isAr ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      const res = await register({
        name: cleanName,
        phone: cleanPhone,
        password: cleanPassword,
      });

      if (!res.success) {
        toast.error(res.message || (isAr ? 'تعذر إنشاء الحساب، يرجى مراجعة البيانات' : 'Failed to create account'));
        return;
      }

      toast.success(isAr ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح' : 'Account created and logged in successfully');
      router.push(redirectTarget);
    } catch {
      toast.error(isAr ? 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى' : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const branding = useSettingsStore((s) => s.settings.branding);
  const logoText = branding?.logoText || 'CLEANZO';

  return (
    <div className="py-16 bg-slate-50 dark:bg-[#0B1120] min-h-[85vh] flex items-center justify-center px-4">
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
            {t.nav.register}
          </h1>
          <p className="text-xs text-slate-500">
            {redirectTarget.includes('/booking')
              ? (isAr ? 'أنشئ حسابك سريعاً لتأكيد طلبك الحالي وربطه بحسابك' : 'Create an account to confirm and link your booking')
              : (isAr
                ? 'أنشئ حسابك خلال دقيقة للتمتع بالحجز السريع وعروض حصرية'
                : 'Create an account in 1 minute for fast booking & exclusive deals')}
          </p>
        </div>

        {/* Card */}
        <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-4 text-start">
            <Input
              label={isAr ? 'الاسم الكامل' : 'Full Name'}
              placeholder={isAr ? 'مثال: أحمد عبد الله' : 'e.g. Ahmed Abdallah'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <Input
              label={isAr ? 'رقم الهاتف' : 'Phone Number'}
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

            <Input
              label={isAr ? 'تأكيد كلمة المرور' : 'Confirm Password'}
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isLoading}
              disabled={isLoading || Boolean(phoneError) || (phone.length > 0 && phone.length !== 11)}
              className="w-full justify-center shadow-lg shadow-sky-500/25 mt-2"
            >
              <span>{t.nav.register}</span>
              <ArrowIcon className="w-4 h-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-slate-500">
            {isAr ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
            <Link
              href={rawRedirect ? `/login?redirect=${encodeURIComponent(rawRedirect)}` : '/login'}
              className="text-sky-600 dark:text-sky-400 font-bold hover:underline"
            >
              {t.nav.login}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="py-24 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
