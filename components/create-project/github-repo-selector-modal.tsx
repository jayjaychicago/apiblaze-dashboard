'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { ProjectConfig } from './types';

interface GitHubRepoSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

interface ParsedOpenAPISpec {
  info?: {
    title?: string;
    version?: string;
  };
}

export function GitHubRepoSelectorModal({ 
  open, 
  onOpenChange, 
  config, 
  updateConfig 
}: GitHubRepoSelectorModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [filteredRepos, setFilteredRepos] = useState<GitHubRepo[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [detectedSpecs, setDetectedSpecs] = useState<OpenAPIFile[]>([]);
  const [selectedSpec, setSelectedSpec] = useState<OpenAPIFile | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);

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

  const loadRepositories = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call backend API to get user's GitHub repositories (using NextAuth session)
      const response = await fetch('/api/github/repos', {
        credentials: 'include', // Include session cookie
      });

      if (!response.ok) {
        // If we get 401/403, GitHub app likely not installed
        if (response.status === 401 || response.status === 403) {
          // Close modal and trigger reinstall
          onOpenChange(false);
          // Clear installation status
          localStorage.removeItem('github_app_installed');
          // User will need to reinstall
          throw new Error('GitHub App not installed or access revoked');
        }
        throw new Error('Failed to load repositories');
      }

      const data = (await response.json()) as GitHubRepo[];
      
      // If we get an empty array, might be installation issue
      if (!data || data.length === 0) {
        // Double-check installation status
        const statusResponse = await fetch('/api/github/installation-status', {
          credentials: 'include', // Include session cookie
        });
        
        if (statusResponse.ok) {
          const status = (await statusResponse.json()) as { installed?: boolean };
          if (!status.installed) {
            // App not installed - close modal and show install prompt
            localStorage.removeItem('github_app_installed');
            onOpenChange(false);
            // Parent component will handle showing install modal
            return;
          }
        }
      }
      
      setRepos(data);
      setFilteredRepos(data);
    } catch (error) {
      console.error('Error loading repositories:', error);
      // Show error to user
      setRepos([]);
      setFilteredRepos([]);
    } finally {
      setIsLoading(false);
    }
  }, [onOpenChange]);

  // Load repositories when modal opens
  useEffect(() => {
    if (open) {
      void loadRepositories();
    } else {
      // Reset state when modal closes
      setRepos([]);
      setFilteredRepos([]);
      setSelectedRepo(null);
      setDetectedSpecs([]);
      setSelectedSpec(null);
      setSearchQuery('');
    }
  }, [open, loadRepositories]);

  const detectOpenAPISpecs = async (repo: GitHubRepo) => {
    setIsDetecting(true);
    setSelectedRepo(repo);
    setDetectedSpecs([]);
    setSelectedSpec(null);
    
    try {
      // Call backend API to scan repository for OpenAPI specs (using NextAuth session)
      const [owner, repoName] = repo.full_name.split('/');
      const response = await fetch(`/api/github/repos/${owner}/${repoName}/openapi-specs`, {
        credentials: 'include', // Include session cookie
      });

      if (!response.ok) {
        throw new Error('Failed to detect OpenAPI specs');
      }

      const specs = (await response.json()) as OpenAPIFile[];
      setDetectedSpecs(specs);
    } catch (error) {
      console.error('Error detecting specs:', error);
      setDetectedSpecs([]);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleSpecSelect = async (spec: OpenAPIFile) => {
    if (!selectedRepo) {
      return;
    }

    setSelectedSpec(spec);
    
    // Parse spec and populate config
    try {
      const [owner, repoName] = selectedRepo.full_name.split('/');
      
      // Fetch and parse the OpenAPI spec to extract version and other details (using NextAuth session)
      const response = await fetch('/api/openapi/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookie
        body: JSON.stringify({
          owner,
          repo: repoName,
          path: spec.path,
          branch: selectedRepo!.default_branch,
        }),
      });

      let apiVersion = spec.version || '1.0.0';
      let suggestedProjectName = repoName.replace(/-/g, '');

      if (response.ok) {
        const parsedSpec = (await response.json()) as ParsedOpenAPISpec;
        // Extract version from spec if available
        if (parsedSpec.info?.version) {
          apiVersion = parsedSpec.info.version;
        }
        // Use title as project name if available
        if (parsedSpec.info?.title) {
          suggestedProjectName = parsedSpec.info.title.toLowerCase().replace(/[^a-z0-9]/g, '');
        }
      }
      
      // Update config with selected spec
      updateConfig({
        githubUser: owner,
        githubRepo: repoName,
        githubPath: spec.path,
        githubBranch: selectedRepo.default_branch,
        apiVersion: apiVersion,
        projectName: config.projectName || suggestedProjectName,
      });
      
    } catch (error) {
      console.error('Error parsing spec:', error);
      // Still update with basic info even if parsing fails
      const [owner, repoName] = selectedRepo.full_name.split('/');
      updateConfig({
        githubUser: owner,
        githubRepo: repoName,
        githubPath: spec.path,
        githubBranch: selectedRepo.default_branch,
        apiVersion: spec.version || '1.0.0',
        projectName: config.projectName || repoName.replace(/-/g, ''),
      });
    }
  };

  const handleConfirm = () => {
    if (selectedSpec) {
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    setSelectedRepo(null);
    setDetectedSpecs([]);
    setSelectedSpec(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Select OpenAPI Specification from GitHub
          </DialogTitle>
          <DialogDescription>
            {!selectedRepo 
              ? 'Choose a repository to scan for OpenAPI specifications'
              : `Found in ${selectedRepo.full_name}`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Repository Selection */}
          {!selectedRepo && (
            <div className="space-y-3">
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
              <div className="space-y-2">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    Loading repositories...
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
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
                      className="w-full text-left p-4 border rounded-lg hover:bg-muted/50 transition-colors"
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
                            <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                              {repo.description}
                            </p>
                          )}
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
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
            </div>
          )}

          {/* Detected Specs */}
          {selectedRepo && (
            <div className="space-y-4">
              {isDetecting ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="h-6 w-6 animate-spin mr-2" />
                  Scanning repository for OpenAPI specs...
                </div>
              ) : detectedSpecs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-sm">
                  <AlertCircle className="h-8 w-8 mb-2" />
                  <p>No OpenAPI specifications found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBack}
                    className="mt-4"
                  >
                    Try Another Repository
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    {detectedSpecs.map((spec) => (
                      <button
                        key={spec.path}
                        onClick={() => handleSpecSelect(spec)}
                        className={`w-full text-left p-4 border rounded-lg transition-all ${
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

                  {selectedSpec && (
                    <Card className="border-green-200 bg-green-50/50">
                      <CardContent className="pt-4">
                        <div className="flex items-start gap-2">
                          <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-green-900">
                              Specification Selected
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              {selectedRepo.full_name}/{selectedSpec.path}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-4 border-t">
          <div>
            {selectedRepo && (
              <Button variant="ghost" onClick={handleBack}>
                ← Back to Repositories
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {selectedSpec && (
              <Button onClick={handleConfirm}>
                <Check className="mr-2 h-4 w-4" />
                Confirm Selection
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

