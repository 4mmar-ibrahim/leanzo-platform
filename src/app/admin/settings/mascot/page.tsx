'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AdminSettingsMascotRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/zo-studio');
  }, [router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center space-y-4">
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0866C6] to-[#F0444C] flex items-center justify-center text-white shadow-xl animate-pulse">
        <Sparkles className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-black">جاري الانتقال إلى استوديو زو 3D (Zo Studio)...</h1>
      <p className="text-xs text-slate-500 max-w-md">
        تمت ترقية نظام التميمة بالكامل إلى محرك 3D Live تفاعلي مع التحكم المستقل في كل صفحة.
      </p>
      <Link href="/admin/zo-studio">
        <Button className="bg-[#0866C6] text-white gap-2">
          <span>دخول استوديو زو 3D الآن</span>
          <ArrowRight className="w-4 h-4 rotate-180" />
        </Button>
      </Link>
    </div>
  );
}
