'use client';

import { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { GitBranch, Upload, Globe, Check, X, Loader2, Github } from 'lucide-react';
import { ProjectConfig, SourceType } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GitHubRepoSelectorModal } from './github-repo-selector-modal';
import { GitHubAppInstallModal } from './github-app-install-modal';

interface GeneralSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
}

export function GeneralSection({ config, updateConfig }: GeneralSectionProps) {
  const [checkingName, setCheckingName] = useState(false);
  const [nameAvailable, setNameAvailable] = useState<boolean | null>(null);
  const [showManualGitHub, setShowManualGitHub] = useState(false);
  const [repoSelectorOpen, setRepoSelectorOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [githubAppInstalled, setGithubAppInstalled] = useState(false);

  useEffect(() => {
    // Check if GitHub App is installed
    checkGitHubInstallation();
  }, []);

  const checkGitHubInstallation = async () => {
    try {
      // TODO: Replace with actual API call to check installation
      // For now, check localStorage or URL parameters
      const installed = localStorage.getItem('github_app_installed') === 'true';
      
      // Also check URL parameter (from GitHub callback)
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('github_app_installed') === 'true') {
        localStorage.setItem('github_app_installed', 'true');
        setGithubAppInstalled(true);
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname);
      } else {
        setGithubAppInstalled(installed);
      }
    } catch (error) {
      console.error('Error checking GitHub installation:', error);
    }
  };

  const handleBrowseGitHub = () => {
    if (githubAppInstalled) {
      setRepoSelectorOpen(true);
    } else {
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
              className="pr-10"
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
            {!showManualGitHub ? (
              <>
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
                  <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Github className="w-7 h-7 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-base mb-2">
                            {githubAppInstalled ? 'Select from GitHub' : 'Connect GitHub'}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {githubAppInstalled 
                              ? 'Browse your repositories and select an OpenAPI specification'
                              : 'Install the GitHub App to browse repositories and import specs'
                            }
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button onClick={handleBrowseGitHub} className="w-full">
                        <Github className="mr-2 h-4 w-4" />
                        {githubAppInstalled ? 'Browse Repositories' : 'Install GitHub App'}
                      </Button>
                    </CardContent>
                  </Card>
                )}
                
                <div className="flex items-center justify-center">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowManualGitHub(true)}
                    className="text-xs"
                  >
                    Or enter GitHub details manually
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium">Manual GitHub Configuration</Label>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setShowManualGitHub(false)}
                    className="text-xs"
                  >
                    ← Back to GitHub Selector
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="githubUser" className="text-sm">GitHub User/Org</Label>
                    <Input
                      id="githubUser"
                      placeholder="mycompany"
                      value={config.githubUser}
                      onChange={(e) => updateConfig({ githubUser: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="githubRepo" className="text-sm">Repository</Label>
                    <Input
                      id="githubRepo"
                      placeholder="my-api-specs"
                      value={config.githubRepo}
                      onChange={(e) => updateConfig({ githubRepo: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="githubPath" className="text-sm">Path to OpenAPI Spec</Label>
                    <Input
                      id="githubPath"
                      placeholder="specs/openapi.yaml"
                      value={config.githubPath}
                      onChange={(e) => updateConfig({ githubPath: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="githubBranch" className="text-sm">Branch</Label>
                    <Input
                      id="githubBranch"
                      placeholder="main"
                      value={config.githubBranch}
                      onChange={(e) => updateConfig({ githubBranch: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                </div>

                {config.githubUser && config.githubRepo && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Will import from: <span className="font-mono text-blue-600">
                      github.com/{config.githubUser}/{config.githubRepo}/{config.githubPath || 'openapi.yaml'} ({config.githubBranch})
                    </span>
                  </p>
                )}
              </>
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
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the URL of your backend API that this proxy will forward requests to
              </p>
            </div>
          </div>
        )}

        {/* Upload Source */}
        {config.sourceType === 'upload' && (
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div>
              <Label htmlFor="uploadFile" className="text-sm">OpenAPI Specification File</Label>
              <div className="mt-2 flex items-center gap-3">
                <Button variant="outline" size="sm" asChild>
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

