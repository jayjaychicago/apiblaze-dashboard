'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  
  useEffect(() => {
    if (status === 'loading') return;
    
    // Preserve URL parameters when redirecting
    const searchParams = window.location.search;
    
    if (status === 'authenticated') {
      router.push(`/dashboard${searchParams}`);
    } else {
      router.push('/auth/login');
    }
  }, [status, router]);
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
    </div>
  );
}

