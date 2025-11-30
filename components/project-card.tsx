'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { Project } from '@/types/project';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DeploymentStatus } from '@/components/deployment-status';
import { ExternalLink, Settings, Trash2, Github, Globe, Key, Copy, Check } from 'lucide-react';
import { api } from '@/lib/api';
import type { AppClient } from '@/types/user-pool';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  onUpdateConfig?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

// API response may have snake_case fields from the database
type AppClientResponse = AppClient & {
  client_id?: string;
  redirect_uris?: string[];
  signout_uris?: string[];
};

export function ProjectCard({ project, onUpdateConfig, onDelete }: ProjectCardProps) {
  const [appClientDetails, setAppClientDetails] = useState<AppClientResponse | null>(null);
  const [loadingCredentials, setLoadingCredentials] = useState(false);
  const [showCredentials, setShowCredentials] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const projectConfig = project.config as Record<string, unknown> | undefined;
  const userPoolId = projectConfig?.user_pool_id as string | undefined;
  const appClientId = projectConfig?.app_client_id as string | undefined;
  const hasSocialAuth = !!(userPoolId && appClientId);

  useEffect(() => {
    if (hasSocialAuth && showCredentials && !appClientDetails && !loadingCredentials) {
      loadCredentials();
    }
  }, [hasSocialAuth, showCredentials]);

  const loadCredentials = async () => {
    if (!userPoolId || !appClientId) return;
    
    setLoadingCredentials(true);
    try {
      const client = await api.getAppClient(userPoolId, appClientId);
      setAppClientDetails(client);
    } catch (error) {
      console.error('Error loading app client details:', error);
      setAppClientDetails(null);
    } finally {
      setLoadingCredentials(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleOpenPortal = () => {
    const portalUrl = project.api_version
      ? `${project.urls.portal}/${project.api_version}`
      : project.urls.portal;
    window.open(portalUrl, '_blank');
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-xl">{project.display_name}</CardTitle>
              <Badge variant="secondary" className="text-xs">
                v{project.api_version}
              </Badge>
            </div>
            <CardDescription className="font-mono text-xs">
              {project.project_id}.apiblaze.com
            </CardDescription>
          </div>

          {/* Actions menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onUpdateConfig && (
                <DropdownMenuItem onClick={() => onUpdateConfig(project)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Update Config
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={handleOpenPortal}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Portal
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(project)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Project
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Deployment Status */}
        {project.deployment && (
          <div>
            <DeploymentStatus
              status={project.deployment.status}
              ageSeconds={project.deployment.age_seconds}
              durationSeconds={project.deployment.duration_seconds}
              error={project.deployment.error}
            />
          </div>
        )}

        {/* Source Information */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {project.spec_source.type === 'github' && project.spec_source.github && (
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4" />
              <span className="font-mono text-xs">
                {project.spec_source.github.owner}/{project.spec_source.github.repo}
              </span>
              <Badge variant="outline" className="text-xs">
                {project.spec_source.github.branch}
              </Badge>
            </div>
          )}
          {project.spec_source.type === 'target_only' && (
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="text-xs">Target URL Only</span>
            </div>
          )}
          {project.spec_source.type === 'upload' && (
            <div className="flex items-center gap-2">
              <ExternalLink className="h-4 w-4" />
              <span className="text-xs">Uploaded Spec</span>
            </div>
          )}
        </div>

        {/* OAuth Credentials (if social auth is enabled) */}
        {hasSocialAuth && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowCredentials(!showCredentials);
                if (!showCredentials && !appClientDetails) {
                  loadCredentials();
                }
              }}
              className="w-full justify-start text-xs"
            >
              <Key className="mr-2 h-3 w-3" />
              {showCredentials ? 'Hide' : 'Show'} OAuth Credentials
            </Button>
            {showCredentials && (
              <div className="mt-2 space-y-2 p-3 bg-muted rounded-lg">
                {loadingCredentials ? (
                  <p className="text-xs text-muted-foreground">Loading credentials...</p>
                ) : appClientDetails ? (
                  <>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium">Client ID</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => copyToClipboard(appClientDetails.client_id || appClientDetails.clientId, 'clientId')}
                        >
                          {copiedField === 'clientId' ? (
                            <Check className="h-3 w-3" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      <code className="text-xs bg-background px-2 py-1 rounded border font-mono block break-all">
                        {appClientDetails.client_id || appClientDetails.clientId}
                      </code>
                    </div>
                    {appClientDetails.clientSecret && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">Client Secret</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2"
                            onClick={() => copyToClipboard(appClientDetails.clientSecret!, 'clientSecret')}
                          >
                            {copiedField === 'clientSecret' ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                        <code className="text-xs bg-background px-2 py-1 rounded border font-mono block break-all">
                          {appClientDetails.clientSecret}
                        </code>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Failed to load credentials</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Deployer Information */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {project.deployer?.avatar_url ? (
            <Image
              src={project.deployer.avatar_url}
              alt={project.deployer.name || project.deployer.github_username || 'User'}
              width={24}
              height={24}
              className="h-6 w-6 rounded-full object-cover"
            />
          ) : (
            <div className="h-6 w-6 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center text-white text-xs">
              {(project.deployer?.name || project.deployer?.github_username || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs font-medium">
              {project.deployer?.name || project.deployer?.github_username || 'Unknown'}
            </span>
            {project.deployer?.email && (
              <span className="text-xs text-muted-foreground">{project.deployer.email}</span>
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleOpenPortal} className="flex-1">
          <ExternalLink className="mr-2 h-4 w-4" />
          Open Portal
        </Button>
        {onUpdateConfig && (
          <Button variant="outline" size="sm" onClick={() => onUpdateConfig(project)} className="flex-1">
            <Settings className="mr-2 h-4 w-4" />
            Configure
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}