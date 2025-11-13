'use client';

import { useEffect } from 'react';
import { initializeAuth } from '@/store/auth';

/**
 * AuthProvider component to initialize auth state from localStorage
 * This must be a client component and should be placed in the root layout
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize auth state from localStorage on mount
    initializeAuth();
  }, []);
  
  return <>{children}</>;
}




