'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RolesRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin/users?tab=roles');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full" />
    </div>
  );
}

