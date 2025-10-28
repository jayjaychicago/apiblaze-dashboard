'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Github, 
  Search, 
  FileCode2, 
  Folder, 
  ChevronRight, 
  Check,
  Loader2,
  AlertCircle,
  Star,
  GitBranch,
} from 'lucide-react';
import { GitHubAppInstallModal } from './github-app-install-modal';
import { ProjectConfig } from './types';

interface GitHubSpecSelectorProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  default_branch: string;
  updated_at: string;
  language: string;
  stargazers_count: number;
}

interface OpenAPIFile {
  name: string;
  path: string;
  type: 'openapi' | 'swagger';
  version?: string;
}

export function GitHubSpecSelector({ config, updateConfig }: GitHubSpecSelectorProps) {
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [detectedSpecs, setDetectedSpecs] = useState<OpenAPIFile[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<OpenAPIFile | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

  // Check if GitHub App is installed
  useEffect(() => {
    checkGitHubAppInstallation();
  }, []);

  // Filter repos based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredRepos(repos);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = repos.filter(
        repo =>
          repo.name.toLowerCase().includes(query) ||
          repo.description?.toLowerCase().includes(query) ||
          repo.full_name.toLowerCase().includes(query)
      );
      setFilteredRepos(filtered);
    }
  }, [searchQuery, repos]);

  const checkGitHubAppInstallation = async () => {
    try {
      // TODO: Implement actual check with backend API
      // For now, check localStorage for demo purposes
      const installed = localStorage.getItem('github_app_installed') === 'true';
      setIsInstalled(installed);
      
      if (installed) {
        loadRepositories();
      }
    } catch (error) {
      console.error('Error checking GitHub app installation:', error);
    }
  };

  const loadRepositories = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual API call to backend
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockRepos: GitHubRepo[] = [
        {
          id: 1,
          name: 'api-specs',
          full_name: 'mycompany/api-specs',
          description: 'OpenAPI specifications for all our APIs',
          default_branch: 'main',
          updated_at: new Date().toISOString(),
          language: 'YAML',
          stargazers_count: 15,
        },
        {
          id: 2,
          name: 'customer-api',
          full_name: 'mycompany/customer-api',
          description: 'Customer management API',
          default_branch: 'main',
          updated_at: new Date().toISOString(),
          language: 'JavaScript',
          stargazers_count: 8,
        },
        {
          id: 3,
          name: 'payment-service',
          full_name: 'mycompany/payment-service',
          description: 'Payment processing microservice',
          default_branch: 'master',
          updated_at: new Date().toISOString(),
          language: 'TypeScript',
          stargazers_count: 23,
        },
      ];
      
      setRepos(mockRepos);
      setFilteredRepos(mockRepos);
    } catch (error) {
      console.error('Error loading repositories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const detectOpenAPISpecs = async (repo: GitHubRepo) => {
    setIsDetecting(true);
    setSelectedRepo(repo);
    setDetectedSpecs([]);
    
    try {
      // TODO: Replace with actual API call to scan repo
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockSpecs: OpenAPIFile[] = [
        {
          name: 'openapi.yaml',
          path: 'specs/openapi.yaml',
          type: 'openapi',
          version: '3.0.0',
        },
        {
          name: 'api-v2.yaml',
          path: 'docs/api-v2.yaml',
          type: 'openapi',
          version: '3.1.0',
        },
        {
          name: 'swagger.json',
          path: 'api/swagger.json',
          type: 'swagger',
          version: '2.0',
        },
      ];
      
      setDetectedSpecs(mockSpecs);
    } catch (error) {
      console.error('Error detecting specs:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSpecSelect = async (spec: OpenAPIFile) => {
    setSelectedSpec(spec);
    
    // Parse spec and populate config
    try {
      // TODO: Fetch and parse actual spec file
      const owner = selectedRepo!.full_name.split('/')[0];
      const repoName = selectedRepo!.name;
      
      // Extract API version from spec if available
      const apiVersion = spec.version || '1.0.0';
      
      // Update config with selected spec
      updateConfig({
        githubUser: owner,
        githubRepo: repoName,
        githubPath: spec.path,
        githubBranch: selectedRepo!.default_branch,
        apiVersion: apiVersion,
        projectName: config.projectName || repoName.replace(/-/g, ''),
      });
      
    } catch (error) {
      console.error('Error parsing spec:', error);
    }
  };

  const handleInstallPrompt = () => {
    setInstallModalOpen(true);
  };

  // For demo: simulate installation
  const handleInstallComplete = () => {
    localStorage.setItem('github_app_installed', 'true');
    setIsInstalled(true);
    loadRepositories();
  };

  if (!isInstalled) {
    return (
      <>
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
          <CardHeader>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Github className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg mb-2">Connect Your GitHub Account</CardTitle>
                <CardDescription>
                  Install the APIBlaze GitHub App to browse your repositories and import OpenAPI specs with one click.
                  It's secure, read-only, and you can revoke access anytime.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button onClick={handleInstallPrompt} className="flex-1">
              <Github className="mr-2 h-4 w-4" />
              Install GitHub App
            </Button>
            <Button variant="outline" onClick={handleInstallComplete}>
              I've Already Installed It
            </Button>
          </CardContent>
        </Card>

        <GitHubAppInstallModal 
          open={installModalOpen} 
          onOpenChange={setInstallModalOpen} 
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Repository Selection */}
      {!selectedRepo && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Github className="h-4 w-4" />
              Select Repository
            </CardTitle>
            <CardDescription className="text-xs">
              Choose a repository to scan for OpenAPI specifications
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Repository List */}
            <div className="max-h-64 overflow-y-auto space-y-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading repositories...
                </div>
              ) : filteredRepos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>No repositories found</p>
                  {searchQuery && (
                    <p className="text-xs mt-1">Try a different search term</p>
                  )}
                </div>
              ) : (
                filteredRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => detectOpenAPISpecs(repo)}
                    className="w-full text-left p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Folder className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          <span className="font-medium text-sm truncate">{repo.name}</span>
                          {repo.language && (
                            <Badge variant="outline" className="text-xs">
                              {repo.language}
                            </Badge>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {repo.stargazers_count}
                          </span>
                          <span className="flex items-center gap-1">
                            <GitBranch className="h-3 w-3" />
                            {repo.default_branch}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detected Specs */}
      {selectedRepo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileCode2 className="h-4 w-4" />
                  OpenAPI Specifications
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  Found in {selectedRepo.full_name}
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedRepo(null);
                  setDetectedSpecs([]);
                  setSelectedSpec(null);
                }}
              >
                Change Repo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isDetecting ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Scanning repository for OpenAPI specs...
              </div>
            ) : detectedSpecs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground text-sm">
                <AlertCircle className="h-8 w-8 mb-2" />
                <p>No OpenAPI specifications found</p>
                <p className="text-xs mt-1">Try a different repository</p>
              </div>
            ) : (
              <div className="space-y-2">
                {detectedSpecs.map((spec) => (
                  <button
                    key={spec.path}
                    onClick={() => handleSpecSelect(spec)}
                    className={`w-full text-left p-3 border rounded-lg transition-all ${
                      selectedSpec?.path === spec.path
                        ? 'border-blue-600 bg-blue-50/50 ring-2 ring-blue-600 ring-offset-2'
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <FileCode2 className="h-4 w-4 text-blue-600" />
                          <span className="font-medium text-sm">{spec.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {spec.type === 'openapi' ? 'OpenAPI' : 'Swagger'} {spec.version}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono">
                          {spec.path}
                        </p>
                      </div>
                      {selectedSpec?.path === spec.path && (
                        <Check className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Spec Summary */}
      {selectedSpec && selectedRepo && (
        <Card className="border-green-200 bg-green-50/50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-900">
                  Specification Selected
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {selectedRepo.full_name}/{selectedSpec.path} will be imported
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

