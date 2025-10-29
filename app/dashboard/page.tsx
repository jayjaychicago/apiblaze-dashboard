'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Zap, Plus, GitBranch, Globe, Users, Rocket } from 'lucide-react';
import { UserMenu } from '@/components/user-menu';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { ProjectList } from '@/components/project-list';
import { Project } from '@/types/project';
import { listProjects } from '@/lib/api/projects';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [hasProjects, setHasProjects] = useState<boolean | null>(null);
  const [checkingProjects, setCheckingProjects] = useState(true);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?returnUrl=/dashboard');
    }
  }, [status, router]);

  // Check for GitHub App installation callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for GitHub app installation callback (setup_action=install)
    const setupAction = urlParams.get('setup_action');
    const installationId = urlParams.get('installation_id');
    const openDialog = urlParams.get('open_create_dialog');
    
    // If we have GitHub installation parameters OR explicit open request
    if (setupAction === 'install' || installationId || openDialog === 'true') {
      // Set flags
      localStorage.setItem('github_app_installed', 'true');
      localStorage.setItem('github_app_just_installed', 'true');
      
      // Open create dialog with slight delay to ensure component is ready
      setTimeout(() => {
        setCreateDialogOpen(true);
      }, 100);
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const loadProjects = async () => {
    try {
      setCheckingProjects(true);
      
      const response = await listProjects({
        page: 1,
        limit: 1, // Just check if any exist
      });
      
      setHasProjects(response.pagination.total > 0);
    } catch (error) {
      console.error('Error loading projects:', error);
      setHasProjects(false);
    } finally {
      setCheckingProjects(false);
    }
  };

  useEffect(() => {
    if (status === 'authenticated') {
      loadProjects();
    }
  }, [status]);

  const handleProjectCreated = () => {
    setCreateDialogOpen(false);
    setHasProjects(true);
  };
  
  if (status === 'loading' || status === 'unauthenticated' || checkingProjects) {
    return null;
  }
  
  const user = session?.user;

  // Show zero state if no projects
  if (hasProjects === false) {
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
                <h1 className="text-xl font-bold">APIBlaze v3.0</h1>
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
              Welcome back, {user?.name || user?.githubHandle}! 👋
            </h2>
            <p className="text-muted-foreground">
              You haven't created any API proxies yet. Let's get started!
            </p>
          </div>
          
          {/* Zero State */}
          <Card className="mb-8 border-2 border-dashed">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 rounded-2xl flex items-center justify-center mb-4">
                <Rocket className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Create Your First API Project</CardTitle>
              <CardDescription className="text-base">
                Deploy your API proxy in seconds using GitHub, upload, or manual configuration
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <Button size="lg" className="h-12 px-8" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="mr-2 h-5 w-5" />
                Create Project
              </Button>
            </CardContent>
          </Card>
          
          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        </main>

        <CreateProjectDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={handleProjectCreated}
          openToGitHub={typeof window !== 'undefined' && localStorage.getItem('github_app_just_installed') === 'true'}
        />
      </div>
    );
  }

  // Show project list
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
              <h1 className="text-xl font-bold">APIBlaze v3.0</h1>
              <p className="text-xs text-muted-foreground">Vercel for APIs</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Project
            </Button>
            <UserMenu />
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <ProjectList 
          onRefresh={loadProjects}
          onUpdateConfig={(project) => {
            // TODO: Open config dialog with project
            console.log('Update config for:', project);
          }}
          onDelete={(project) => {
            // TODO: Show delete confirmation
            console.log('Delete project:', project);
          }}
        />
      </main>

      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleProjectCreated}
        openToGitHub={typeof window !== 'undefined' && localStorage.getItem('github_app_just_installed') === 'true'}
      />
    </div>
  );
}
