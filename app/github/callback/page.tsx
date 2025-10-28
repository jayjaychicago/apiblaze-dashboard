'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function GitHubCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    // User just returned from GitHub app installation
    console.log('Returned from GitHub app installation');
    
    // Set flags to indicate installation
    localStorage.setItem('github_app_just_installed', 'true');
    localStorage.setItem('github_app_installed', 'true');
    
    // Redirect to dashboard with flag
    router.push('/dashboard?open_create_dialog=true');
  }, [router]);

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

