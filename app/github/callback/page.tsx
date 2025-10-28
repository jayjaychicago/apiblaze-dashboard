'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // User just returned from GitHub app installation
    const setupAction = searchParams.get('setup_action');
    const installationId = searchParams.get('installation_id');
    
    console.log('[GitHub Callback] Returned from GitHub app installation');
    console.log('[GitHub Callback] Parameters:', { setupAction, installationId });
    
    // Set flags to indicate installation
    localStorage.setItem('github_app_just_installed', 'true');
    localStorage.setItem('github_app_installed', 'true');
    
    // Redirect to dashboard - it will detect the installation and open dialog
    router.push('/dashboard?open_create_dialog=true');
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          </div>
          <CardTitle className="text-2xl">GitHub Connected!</CardTitle>
          <CardDescription>
            Setting up your GitHub integration...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function GitHubCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    }>
      <CallbackContent />
    </Suspense>
  );
}

