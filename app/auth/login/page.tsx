'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession, signIn } from 'next-auth/react';
import { Github, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  
  // Redirect if already authenticated
  useEffect(() => {
    if (status === 'authenticated') {
      const returnUrl = searchParams.get('returnUrl') || '/dashboard';
      router.push(returnUrl);
    }
  }, [status, router, searchParams]);
  
  const handleLogin = () => {
    const returnUrl = searchParams.get('returnUrl') || '/dashboard';
    signIn('github', { callbackUrl: returnUrl });
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 10V3L4 14h7v7l9-11h-7z" 
              />
            </svg>
          </div>
          
          <div>
            <CardTitle className="text-3xl font-bold">
              Welcome to APIBlaze
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Vercel for APIs - Deploy and manage your API proxies
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <Button 
            onClick={handleLogin} 
            className="w-full h-12 text-base"
            size="lg"
          >
            <Github className="mr-2 h-5 w-5" />
            Sign in with GitHub
          </Button>
          
          <div className="text-center text-sm text-muted-foreground">
            Secure authentication via OAuth 2.0
          </div>
          
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4 mt-6">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
              ⚡ Phase 0: OAuth Foundation
            </h3>
            <p className="text-xs text-blue-800 dark:text-blue-200">
              Rock-solid GitHub OAuth authentication with secure token management and HTTP-only cookies.
            </p>
          </div>
          
          <div className="pt-4 space-y-2">
            <div className="flex items-center text-xs text-muted-foreground">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Create unlimited API proxies
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Import from GitHub or upload OpenAPI specs
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Deploy in seconds with custom domains
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}

