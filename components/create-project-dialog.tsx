'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Rocket } from 'lucide-react';
import { GeneralSection } from './create-project/general-section';
import { AuthenticationSection } from './create-project/authentication-section';
import { TargetServersSection } from './create-project/target-servers-section';
import { PortalSection } from './create-project/portal-section';
import { ThrottlingSection } from './create-project/throttling-section';
import { PrePostProcessingSection } from './create-project/preprocessing-section';
import { DomainsSection } from './create-project/domains-section';
import { ProjectConfig } from './create-project/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

type ProjectCreationSuggestions = string[];

type ProjectCreationDetails = {
  message?: string;
  format?: string;
  line?: number;
  column?: number;
  snippet?: string;
};

type ProjectCreationErrorShape = {
  message?: string;
  details?: unknown;
  suggestions?: unknown;
};

function isProjectCreationError(value: unknown): value is ProjectCreationErrorShape {
  return typeof value === 'object' && value !== null;
}

function isProjectCreationDetails(value: unknown): value is ProjectCreationDetails {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    ('message' in record ? typeof record.message === 'string' : true) &&
    ('format' in record ? typeof record.format === 'string' : true) &&
    ('line' in record ? typeof record.line === 'number' : true) &&
    ('column' in record ? typeof record.column === 'number' : true) &&
    ('snippet' in record ? typeof record.snippet === 'string' : true)
  );
}

function extractProjectCreationContext(error: unknown) {
  const fallbackMessage = error instanceof Error ? error.message.split('\n')[0] : 'Unknown error occurred';

  if (!isProjectCreationError(error)) {
    return {
      message: fallbackMessage,
      details: undefined as ProjectCreationDetails | undefined,
      suggestions: undefined as ProjectCreationSuggestions | undefined,
    };
  }

  const details = isProjectCreationDetails(error.details) ? error.details : undefined;
  const suggestions = Array.isArray(error.suggestions)
    ? (error.suggestions.filter((item): item is string => typeof item === 'string') as ProjectCreationSuggestions)
    : undefined;

  const message =
    typeof error.message === 'string' && error.message.length > 0 ? error.message : fallbackMessage;

  return { message, details, suggestions };
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  openToGitHub?: boolean;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess, openToGitHub }: CreateProjectDialogProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isDeploying, setIsDeploying] = useState(false);

  // When dialog opens with openToGitHub flag, ensure we're on General tab and GitHub source
  useEffect(() => {
    if (open && openToGitHub) {
      setActiveTab('general');
      setConfig(prev => ({ ...prev, sourceType: 'github' }));
    }
  }, [open, openToGitHub]);
  const [config, setConfig] = useState<ProjectConfig>({
    // General
    projectName: '',
    apiVersion: '1.0.0',
    sourceType: 'github',
    githubUser: '',
    githubRepo: '',
    githubPath: '',
    githubBranch: 'main',
    targetUrl: '',
    uploadedFile: null,
    
    // Authentication
    userGroupName: '',
    enableApiKey: true,
    enableSocialAuth: false,
    bringOwnProvider: false,
    socialProvider: 'github',
    identityProviderDomain: '',
    identityProviderClientId: '',
    identityProviderClientSecret: '',
    authorizedScopes: ['email', 'openid', 'profile'],
    
    // Target Servers
    targetServers: [
      { stage: 'dev', targetUrl: '', config: [] },
      { stage: 'test', targetUrl: '', config: [] },
      { stage: 'prod', targetUrl: '', config: [] },
    ],
    
    // Portal
    createPortal: true,
    portalLogoUrl: '',
    
    // Throttling
    throttlingRate: 10,
    throttlingBurst: 20,
    quota: 1000,
    quotaInterval: 'day',
    
    // Pre/Post Processing
    preProcessingPath: '',
    postProcessingPath: '',
    
    // Domains (placeholder)
    customDomains: [],
  });

  const updateConfig = (updates: Partial<ProjectConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Validate if a valid source is configured
  const isSourceConfigured = () => {
    if (!config.projectName) return false;

    switch (config.sourceType) {
      case 'github':
        // GitHub requires user, repo, and path
        return !!(config.githubUser && config.githubRepo && config.githubPath);
      case 'targetUrl':
        // Target URL requires a URL
        return !!config.targetUrl;
      case 'upload':
        // Upload requires a file
        return !!config.uploadedFile;
      default:
        return false;
    }
  };

  // Get validation error type
  // Priority: Check source first, then project name
  const getValidationError = (): 'project-name' | 'github-source' | 'target-url' | 'upload-file' | null => {
    // Check if source is configured first
    switch (config.sourceType) {
      case 'github':
        if (!config.githubUser || !config.githubRepo || !config.githubPath) {
          return 'github-source';
        }
        break;
      case 'targetUrl':
        if (!config.targetUrl) return 'target-url';
        break;
      case 'upload':
        if (!config.uploadedFile) return 'upload-file';
        break;
    }
    
    // Then check project name
    if (!config.projectName) return 'project-name';
    
    return null;
  };

  const validationError = getValidationError();

  const handleDeploy = async () => {
    setIsDeploying(true);
    try {
      // Validate required fields
      if (!config.projectName) {
        toast({
          title: 'Validation Error',
          description: 'Project name is required',
          variant: 'destructive',
        });
        setActiveTab('general');
        setIsDeploying(false);
        return;
      }

      // Prepare GitHub source data if applicable
      const githubSource = config.sourceType === 'github' && config.githubUser && config.githubRepo && config.githubPath
        ? {
            owner: config.githubUser,
            repo: config.githubRepo,
            path: config.githubPath,
            branch: config.githubBranch || 'main',
          }
        : undefined;

      // Prepare environments from target servers
      const environments: Record<string, { target: string }> = {};
      config.targetServers.forEach(server => {
        if (server.targetUrl) {
          environments[server.stage] = { target: server.targetUrl };
        }
      });

      // Prepare auth config
      const authType = config.enableApiKey ? 'api_key' : (config.enableSocialAuth ? 'oauth' : 'none');
      const oauthConfig = config.enableSocialAuth && config.bringOwnProvider ? {
        provider_type: config.socialProvider,
        client_id: config.identityProviderClientId,
        client_secret: config.identityProviderClientSecret,
        scopes: config.authorizedScopes.join(' '),
      } : undefined;

      // Create the project
      const projectData = {
        name: config.projectName,
        display_name: config.projectName,
        subdomain: config.projectName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        target_url: config.targetUrl || config.targetServers.find(s => s.targetUrl)?.targetUrl,
        username: config.githubUser || session?.user?.githubHandle || session?.user?.email?.split('@')[0] || 'dashboard-user',
        github: githubSource,
        auth_type: authType,
        oauth_config: oauthConfig,
        environments: Object.keys(environments).length > 0 ? environments : undefined,
      };

      console.log('[CreateProject] Deploying project:', config.projectName);
      const response = await api.createProject(projectData);
      
      console.log('[CreateProject] Success:', response);

      // Success!
      toast({
        title: 'Project Created! 🎉',
        description: `${config.projectName} has been successfully deployed.`,
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create project:', error);

      const { message, details, suggestions } = extractProjectCreationContext(error);
      const detailMessage = details?.message ?? message;

      toast({
        title: 'Deployment Failed',
        description: (
          <div className="space-y-3">
            <div>
              <p className="font-medium">{detailMessage}</p>
              {details?.format && (
                <p className="text-sm text-muted-foreground">
                  Format: {details.format.toUpperCase()}
                  {details.line !== undefined && (
                    <>
                      {' · '}Line {details.line}
                    </>
                  )}
                  {details.column !== undefined && (
                    <>
                      {' · '}Column {details.column}
                    </>
                  )}
                </p>
              )}
            </div>

            {details?.snippet && (
              <pre className="bg-muted text-sm rounded-md p-3 overflow-x-auto whitespace-pre-wrap leading-snug">
                {details.snippet}
              </pre>
            )}

            {suggestions && suggestions.length > 0 && (
              <div>
                <p className="text-sm font-medium">Suggestions</p>
                <ul className="mt-1 list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  {suggestions.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ),
        variant: 'destructive',
      });
    } finally {
      setIsDeploying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">Create New API Project</DialogTitle>
          <DialogDescription>
            Configure your API proxy with sensible defaults. Deploy instantly or customize settings across all sections.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid grid-cols-7 w-full">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="auth">Auth</TabsTrigger>
            <TabsTrigger value="targets">Targets</TabsTrigger>
            <TabsTrigger value="portal">Portal</TabsTrigger>
            <TabsTrigger value="throttling">Throttling</TabsTrigger>
            <TabsTrigger value="preprocessing">Processing</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4">
            <TabsContent value="general" className="mt-0">
              <GeneralSection config={config} updateConfig={updateConfig} validationError={validationError} />
            </TabsContent>

            <TabsContent value="auth" className="mt-0">
              <AuthenticationSection config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="targets" className="mt-0">
              <TargetServersSection config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="portal" className="mt-0">
              <PortalSection config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="throttling" className="mt-0">
              <ThrottlingSection config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="preprocessing" className="mt-0">
              <PrePostProcessingSection config={config} updateConfig={updateConfig} />
            </TabsContent>

              <TabsContent value="domains" className="mt-0">
                <DomainsSection config={config} />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <div className="flex-1">
            {!isSourceConfigured() ? (
              <p className="text-sm text-orange-600">
                {validationError === 'github-source' && 'Select a GitHub repository to continue'}
                {validationError === 'target-url' && 'Enter a target URL to continue'}
                {validationError === 'upload-file' && 'Upload an OpenAPI spec to continue'}
                {validationError === 'project-name' && 'Enter a project name to continue'}
                {!validationError && 'Configure a source to deploy'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Ready to deploy! Customize other sections or deploy now.
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeploying}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeploy} 
              disabled={isDeploying || !isSourceConfigured()}
              className={!isSourceConfigured() ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deploying...
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  Deploy API
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

