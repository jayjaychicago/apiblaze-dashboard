'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { verifyGitHubToken } from '@/lib/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, setLoading } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    async function handleCallback() {
      try {
        setLoading(true);
        
        // Extract access_token from URL parameters
        const accessToken = searchParams.get('access_token');
        const errorParam = searchParams.get('error');
        const returnUrl = searchParams.get('returnUrl') || '/dashboard';
        
        if (errorParam) {
          setError(`Authentication failed: ${errorParam}`);
          setLoading(false);
          return;
        }
        
        if (!accessToken) {
          setError('No access token received. Please try logging in again.');
          setLoading(false);
          return;
        }
        
        // Verify the token and get user info
        const user = await verifyGitHubToken(accessToken);
        
        if (!user) {
          setError('Failed to verify authentication. Please try again.');
          setLoading(false);
          return;
        }
        
        // Store auth state
        setAuth(accessToken, user);
        
        // Redirect to dashboard or return URL
        router.push(returnUrl);
        
      } catch (err) {
        console.error('Callback error:', err);
        setError('An unexpected error occurred during authentication.');
        setLoading(false);
      }
    }
    
    handleCallback();
  }, [searchParams, setAuth, setLoading, router]);
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl">Authentication Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/auth/login')} 
              className="w-full"
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
          <CardTitle className="text-2xl">Completing Sign In</CardTitle>
          <CardDescription>
            Please wait while we verify your authentication...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4">
              <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-2xl">Loading...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}

