'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Lock, User, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { cleanzoApi } from '@/lib/api/cleanzoApi';
import { toast } from 'sonner';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, loginWithToken } = useAdminStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const sessionExpired = searchParams.get('session') === 'expired';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    if (!cleanUser || !password) {
      toast.error('يرجى إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    setLoading(true);

    try {
      const res = await cleanzoApi.admin.login(cleanUser, password);
      if (res && res.token && res.admin) {
        loginWithToken(res.admin, res.token);
        toast.success('تم تسجيل الدخول بنجاح إلى لوحة الإدارة!');
        router.push('/admin');
      } else {
        toast.error('اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err: any) {
      console.error('[AdminLogin] Error:', err);
      toast.error(err?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden text-slate-100" dir="rtl">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-[#07345C]/20 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="flex flex-col items-center mb-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0866C6] via-[#07345C] to-[#0866C6] flex items-center justify-center text-white shadow-xl shadow-[#0866C6]/25 mb-4">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">بوابة إدارة كلينزو</h1>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          مركز التحكم والعمليات الموحد لإدارة الحجوزات، العملاء، الخدمات ومحتوى المنصة
        </p>
      </div>

      {/* Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Session Expired Banner */}
        {sessionExpired && (
          <div className="flex items-center gap-3 mb-5 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <p className="text-xs font-medium">انتهت صلاحية جلستك. يرجى تسجيل الدخول مجدداً للمتابعة.</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم المستخدم أو البريد الإداري</label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="username@cleanzo.app"
                className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-hidden focus:border-sky-500 transition-colors"
              />
              <User className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">كلمة المرور</label>
              <button
                type="button"
                onClick={() => toast.info('يرجى التواصل مع مدير النظام أو الدعم الفني لتحديث كلمة المرور')}
                className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors"
              >
                نسيت كلمة المرور؟
              </button>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-3 pr-10 py-2.5 text-xs rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-hidden focus:border-sky-500 transition-colors"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-sm border-slate-700 bg-slate-800 text-sky-500 focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-slate-300">تذكر تسجيل الدخول</span>
            </label>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>جلسة مشفرة وآمنة</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white text-xs font-bold shadow-lg shadow-sky-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>دخول لوحة التحكم</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Back to Customer Website */}
      <Link
        href="/"
        className="mt-6 text-xs text-slate-400 hover:text-white transition-colors"
      >
        ← العودة إلى الموقع الرئيسي للعملاء
      </Link>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <React.Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400" dir="rtl">
          جاري التحميل...
        </div>
      }
    >
      <AdminLoginForm />
    </React.Suspense>
  );
}
