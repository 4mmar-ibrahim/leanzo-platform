'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminSettingsContactRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/content/contact');
  }, [router]);

  return null;
}
