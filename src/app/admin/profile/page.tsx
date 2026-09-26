'use client';

import React, { useState } from 'react';
import { User, Mail, Phone, Shield, Save, KeyRound } from 'lucide-react';
import { useAdminStore } from '@/store/useAdminStore';
import { useActivityLogStore } from '@/store/useActivityLogStore';
import { toast } from 'sonner';

export default function AdminProfilePage() {
  const currentAdmin = useAdminStore((s) => s.currentAdmin);
  const updateAdminUser = useAdminStore((s) => s.updateAdminUser);
  const addLog = useActivityLogStore((s) => s.addLog);

  const [name, setName] = useState(currentAdmin?.name || '');
  const [email, setEmail] = useState(currentAdmin?.email || '');
  const [phone, setPhone] = useState(currentAdmin?.phone || '');
  const [avatar, setAvatar] = useState(currentAdmin?.avatar || '');

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAdmin) return;

    updateAdminUser(currentAdmin.id, {
      name,
      email,
      phone,
      avatar,
    });

    addLog({
      adminName: name,
      adminRole: currentAdmin.role,
      action: 'تحديث بيانات الملف الشخصي الإداري',
      module: 'users',
      target: name,
    });

    toast.success('تم تحديث بياناتك الشخصية بنجاح');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
          الملف الشخصي للمسؤول
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          إدارة بيانات الدخول، صورة الحساب، ومعلومات التواصل الإدارية
        </p>
      </div>

      <form onSubmit={handleSave} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 space-y-5 shadow-xs text-xs">
        {/* Avatar preview */}
        <div className="flex items-center gap-4">
          <img
            src={avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'}
            alt={name}
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-sky-500/20 shadow-md"
          />
          <div className="flex-1">
            <label className="block font-semibold mb-1">رابط الصورة الشخصية (URL)</label>
            <input
              type="url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">الاسم الكامل</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-bold"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">اسم المستخدم (المعرف)</label>
            <input
              type="text"
              disabled
              value={currentAdmin?.username || ''}
              className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 font-mono text-slate-500 cursor-not-allowed"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-semibold mb-1">البريد الإلكتروني</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            />
          </div>

          <div>
            <label className="block font-semibold mb-1">رقم الهاتف</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono"
            />
          </div>
        </div>

        <div className="p-3 rounded-2xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-500/20 flex items-center justify-between">
          <div>
            <span className="font-bold text-sky-800 dark:text-sky-300 block">الدور الحالي في النظام</span>
            <span className="text-[11px] text-slate-500">{currentAdmin?.role}</span>
          </div>
          <span className="px-3 py-1 rounded-xl text-xs font-bold bg-sky-500 text-white">
            نشط
          </span>
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={() => toast.info('يمكنك تغيير كلمة المرور عبر طلب إعادة التعيين')}
            className="text-xs font-semibold text-slate-500 hover:text-sky-500 flex items-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>تغيير كلمة المرور</span>
          </button>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-md shadow-sky-500/25 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>حفظ الملف الشخصي</span>
          </button>
        </div>
      </form>
    </div>
  );
}
