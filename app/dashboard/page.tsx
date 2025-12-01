'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

// Dashboard page now redirects to Meters page
export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/meters');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecting to meters...</p>
      </div>
    </div>
  );
}
