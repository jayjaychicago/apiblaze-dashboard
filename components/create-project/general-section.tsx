'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GitBranch, Upload, Globe, Check, X, Loader2, Github, AlertCircle } from 'lucide-react';
import { ProjectConfig, SourceType } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitHubRepoSelectorModal } from './github-repo-selector-modal';
import { GitHubAppInstallModal } from './github-app-install-modal';

interface GeneralSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
  validationError?: 'project-name' | 'github-source' | 'target-url' | 'upload-file' | null;
}

export function GeneralSection({ config, updateConfig, validationError }: GeneralSectionProps) {
  const [checkingName, setCheckingName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [repoSelectorOpen, setRepoSelectorOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [githubAppInstalled, setGithubAppInstalled] = useState(false);
  const [checkingInstallation, setCheckingInstallation] = useState(true);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    // Check if GitHub App is installed
    console.log('[General Section] Component mounted, checking GitHub installation');
    checkGitHubInstallation();
  }, []);

  // Re-check if app was just installed
  useEffect(() => {
    const justInstalled = localStorage.getItem('github_app_just_installed');
    console.log('[General Section] Checking just_installed flag:', justInstalled);
    if (justInstalled === 'true') {
      console.log('[General Section] App was just installed! Re-checking status...');
      // Clear the flag
      localStorage.removeItem('github_app_just_installed');
      // Re-check installation status
      setTimeout(() => {
        checkGitHubInstallation();
      }, 500); // Small delay to ensure token is ready
    }
  }, []);


  const checkGitHubInstallation = async () => {
    console.log('[GitHub] checkGitHubInstallation called');

    setCheckingInstallation(true);
    try {
      // Check URL parameter first (from GitHub callback)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('github_app_installed') === 'true') {
        console.log('[GitHub] Found github_app_installed in URL');
        localStorage.setItem('github_app_installed', 'true');
        setGithubAppInstalled(true);
        setCheckingInstallation(false);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // Always check actual installation status via API (using NextAuth session)
      console.log('[GitHub] Calling API to check installation status');
      const response = await fetch('/api/github/installation-status', {
        credentials: 'include', // Include session cookie
        cache: 'no-store', // Don't cache this, always get fresh status
      });

      console.log('[GitHub] Installation API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const isInstalled = data.installed === true;
        
        console.log('[GitHub] Installation check result:', data);
        
        // Update localStorage to match actual status
        if (isInstalled) {
          localStorage.setItem('github_app_installed', 'true');
        } else {
          localStorage.removeItem('github_app_installed');
        }
        
        setGithubAppInstalled(isInstalled);
      } else if (response.status === 401) {
        // 401 = Not authenticated or token invalid
        console.warn('[GitHub] 401 Unauthorized - Access token may be invalid');
        const errorData = await response.json().catch(() => ({}));
        console.warn('[GitHub] Error details:', errorData);
        
        // Set error state to show help message
        setAuthError(true);
        
        // Assume not installed but don't clear auth
        // User can still use other sources (Target URL, Upload)
        localStorage.removeItem('github_app_installed');
        setGithubAppInstalled(false);
      } else {
        // Other errors - assume not installed
        console.error('[GitHub] API check failed with status:', response.status);
        localStorage.removeItem('github_app_installed');
        setGithubAppInstalled(false);
      }
    } catch (error) {
      console.error('[GitHub] Error checking installation:', error);
      // On error, assume not installed to be safe
      localStorage.removeItem('github_app_installed');
      setGithubAppInstalled(false);
    } finally {
      setCheckingInstallation(false);
      console.log('[GitHub] Installation check complete');
    }
  };

  const handleBrowseGitHub = async () => {
    // Re-check installation status before opening (using NextAuth session)
    try {
      console.log('[GitHub] handleBrowseGitHub - checking installation');
      const response = await fetch('/api/github/installation-status', {
        credentials: 'include', // Include session cookie
        cache: 'no-store',
      });

      if (response.ok) {
        const data = await response.json();
        const isInstalled = data.installed === true;
        
        console.log('Installation check result:', data);
        
        // Update localStorage
        if (isInstalled) {
          localStorage.setItem('github_app_installed', 'true');
          setGithubAppInstalled(true);
          setRepoSelectorOpen(true);
        } else {
          localStorage.removeItem('github_app_installed');
          setGithubAppInstalled(false);
          setInstallModalOpen(true);
        }
      } else {
        // On error, show install modal
        localStorage.removeItem('github_app_installed');
        setGithubAppInstalled(false);
        setInstallModalOpen(true);
      }
    } catch (error) {
      console.error('Error checking installation:', error);
      // On error, show install modal
      localStorage.removeItem('github_app_installed');
      setGithubAppInstalled(false);
      setInstallModalOpen(true);
    }
  };

  const handleProjectNameBlur = async () => {
    if (!config.projectName) return;
    
    setCheckingName(true);
    try {
      // TODO: Implement actual name check against backend
      await new Promise(resolve => setTimeout(resolve, 500));
      setNameAvailable(true);
    } catch (error) {
      setNameAvailable(false);
    } finally {
      setCheckingName(false);
    }
  };

  const handleSourceTypeChange = (type: SourceType) => {
    updateConfig({ sourceType: type });
  };

  return (
    <div className="space-y-6">
      {/* Project Name and API Version */}
      <div>
        <Label htmlFor="projectName" className="text-base font-semibold">
          Project Name & API Version
        </Label>
        <p className="text-sm text-muted-foreground mb-3">
          This determines the URL your API will be accessible at
        </p>
        
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Input
              id="projectName"
              placeholder="myawesomeapi"
              value={config.projectName}
              onChange={(e) => updateConfig({ projectName: e.target.value })}
              onBlur={handleProjectNameBlur}
              className={`pr-10 ${validationError === 'project-name' ? 'border-red-500 ring-2 ring-red-500 ring-offset-2' : ''}`}
            />
            {checkingName && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {!checkingName && nameAvailable === true && (
              <Check className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-green-600" />
            )}
            {!checkingName && nameAvailable === false && (
              <X className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-600" />
            )}
          </div>
          <span className="text-muted-foreground">.apiblaze.com</span>
          <span className="text-muted-foreground">/</span>
          <Input
            placeholder="1.0.0"
            value={config.apiVersion}
            onChange={(e) => updateConfig({ apiVersion: e.target.value })}
            className="w-32"
          />
        </div>
        
        {config.projectName && (
          <p className="text-sm text-muted-foreground mt-2">
            Your API will be available at: <span className="font-mono text-blue-600">
              {config.projectName}.apiblaze.com/{config.apiVersion}
            </span>
          </p>
        )}
      </div>

      <Separator />

      {/* Source Selection */}
      <div>
        <Label className="text-base font-semibold">Source</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Choose how to configure your API
        </p>

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Card 
            className={`cursor-pointer transition-all ${
              config.sourceType === 'github' 
                ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2' 
                : 'hover:border-blue-400'
            }`}
            onClick={() => handleSourceTypeChange('github')}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <GitBranch className="h-5 w-5 text-blue-600" />
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              </div>
              <CardTitle className="text-sm">GitHub</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Import OpenAPI spec from your repository
              </CardDescription>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${
              config.sourceType === 'targetUrl' 
                ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2' 
                : 'hover:border-blue-400'
            }`}
            onClick={() => handleSourceTypeChange('targetUrl')}
          >
            <CardHeader className="pb-3">
              <Globe className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-sm">Target URL</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Manually configure target backend
              </CardDescription>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all ${
              config.sourceType === 'upload' 
                ? 'border-blue-600 ring-2 ring-blue-600 ring-offset-2' 
                : 'hover:border-blue-400'
            }`}
            onClick={() => handleSourceTypeChange('upload')}
          >
            <CardHeader className="pb-3">
              <Upload className="h-5 w-5 text-green-600" />
              <CardTitle className="text-sm">Upload</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-xs">
                Upload OpenAPI spec file
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        {/* GitHub Source */}
        {config.sourceType === 'github' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            {/* Auth Error Message */}
            {authError && (
              <Card className="border-orange-200 bg-orange-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2 text-orange-900">
                    <AlertCircle className="h-4 w-4" />
                    GitHub Authentication Issue
                  </CardTitle>
                  <CardDescription className="text-xs text-orange-800">
                    Your GitHub authentication may have expired. Please try logging out and logging back in, or use Target URL / Upload options instead.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // Clear auth and redirect to login
                      localStorage.clear();
                      window.location.href = '/auth/login';
                    }}
                  >
                    Re-authenticate with GitHub
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* GitHub Spec Selected Summary */}
            {config.githubUser && config.githubRepo && config.githubPath ? (
              <Card className="border-green-200 bg-green-50/50">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium text-green-900">
                          OpenAPI Spec Selected
                        </span>
                      </div>
                      <p className="text-xs text-green-700 font-mono">
                        {config.githubUser}/{config.githubRepo}/{config.githubPath}
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        Branch: {config.githubBranch}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleBrowseGitHub}
                    >
                      Change
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className={`border-blue-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50 ${
                validationError === 'github-source' ? 'ring-2 ring-red-500 ring-offset-2 border-red-500' : ''
              }`}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Github className="w-7 h-7 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base mb-2">
                        Import API Spec from GitHub
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {githubAppInstalled 
                          ? 'Browse your repositories and select an OpenAPI specification'
                          : 'Import API specs in one click by linking to GitHub'
                        }
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleBrowseGitHub} className="w-full" disabled={checkingInstallation}>
                    {checkingInstallation ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking...
                      </>
                    ) : (
                      <>
                        <Github className="mr-2 h-4 w-4" />
                        {githubAppInstalled ? 'Browse Repositories' : 'Import from GitHub'}
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Modals */}
            <GitHubRepoSelectorModal
              open={repoSelectorOpen}
              onOpenChange={setRepoSelectorOpen}
              config={config}
              updateConfig={updateConfig}
            />
            
            <GitHubAppInstallModal
              open={installModalOpen}
              onOpenChange={setInstallModalOpen}
            />
          </div>
        )}

        {/* Target URL Source */}
        {config.sourceType === 'targetUrl' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div>
              <Label htmlFor="targetUrl" className="text-sm">Target Backend URL</Label>
              <Input
                id="targetUrl"
                placeholder="https://api.example.com"
                value={config.targetUrl}
                onChange={(e) => updateConfig({ targetUrl: e.target.value })}
                className={`mt-1 ${validationError === 'target-url' ? 'border-red-500 ring-2 ring-red-500 ring-offset-2' : ''}`}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the URL of your backend API that this proxy will forward requests to
              </p>
            </div>
          </div>
        )}

        {/* Upload Source */}
        {config.sourceType === 'upload' && (
          <div className={`space-y-4 p-4 border rounded-lg bg-muted/30 ${
            validationError === 'upload-file' ? 'ring-2 ring-red-500 ring-offset-2 border-red-500' : ''
          }`}>
            <div>
              <Label htmlFor="uploadFile" className="text-sm">OpenAPI Specification File</Label>
              <div className="mt-2 flex items-center gap-3">
                <Button 
                  variant={validationError === 'upload-file' ? 'destructive' : 'outline'} 
                  size="sm" 
                  asChild
                >
                  <label htmlFor="uploadFile" className="cursor-pointer">
                    <Upload className="mr-2 h-4 w-4" />
                    Choose File
                  </label>
                </Button>
                <input
                  id="uploadFile"
                  type="file"
                  accept=".yaml,.yml,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateConfig({ uploadedFile: file });
                    }
                  }}
                />
                {config.uploadedFile && (
                  <span className="text-sm text-muted-foreground">
                    {config.uploadedFile.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Upload your OpenAPI 3.0 specification file (YAML or JSON format)
              </p>
              <Badge variant="outline" className="mt-2 text-xs">
                UI Only - Backend integration coming soon
              </Badge>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

