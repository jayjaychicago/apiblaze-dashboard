'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Plus, GitBranch, Globe, Users } from 'lucide-react';
import { useAuthStore } from '@/store/auth';
import { UserMenu } from '@/components/user-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardPage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login?returnUrl=/dashboard');
    }
  }, [isAuthenticated, isLoading, router]);
  
  if (isLoading || !isAuthenticated) {
    return null;
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">APIBlaze</h1>
              <p className="text-xs text-muted-foreground">Vercel for APIs</p>
            </div>
          </div>
          
          <UserMenu />
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user?.name || user?.username}! 👋
          </h2>
          <p className="text-muted-foreground">
            You haven't created any API proxies yet. Let's get started!
          </p>
        </div>
        
        {/* Zero State */}
        <Card className="mb-8 border-2 border-dashed">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 rounded-2xl flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">Create Your First API Project</CardTitle>
            <CardDescription className="text-base">
              Deploy your API proxy in seconds using GitHub, upload, or manual configuration
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button size="lg" className="h-12 px-8">
              <Plus className="mr-2 h-5 w-5" />
              Create Project
            </Button>
          </CardContent>
        </Card>
        
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader>
              <GitBranch className="w-8 h-8 text-blue-600 mb-2" />
              <CardTitle className="text-lg">GitHub Integration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Import OpenAPI specs directly from your GitHub repositories with one click.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Globe className="w-8 h-8 text-purple-600 mb-2" />
              <CardTitle className="text-lg">Custom Domains</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Deploy your APIs on custom *.apiblaze.com subdomains or bring your own domain.
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <Users className="w-8 h-8 text-green-600 mb-2" />
              <CardTitle className="text-lg">Team Collaboration</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Invite team members and manage API projects together with role-based access.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
        
        {/* Phase 0 Status */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border-blue-200 dark:border-blue-900">
          <CardHeader>
            <CardTitle className="flex items-center">
              <span className="text-2xl mr-2">🎯</span>
              Phase 0: GitHub OAuth Foundation - Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center text-sm">
              <span className="text-green-600 mr-2">✓</span>
              <span>GitHub OAuth authentication flow</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-green-600 mr-2">✓</span>
              <span>Zustand auth state management</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-green-600 mr-2">✓</span>
              <span>Protected routes and middleware</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-green-600 mr-2">✓</span>
              <span>User menu and logout functionality</span>
            </div>
            <div className="flex items-center text-sm">
              <span className="text-green-600 mr-2">✓</span>
              <span>Beautiful UI with Tailwind CSS and shadcn/ui</span>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

