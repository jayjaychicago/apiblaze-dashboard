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
import { Loader2, Rocket, Trash2 } from 'lucide-react';
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
import { deleteProject } from '@/lib/api/projects';
import type { Project } from '@/types/project';

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
  project?: Project | null; // If provided, opens in edit mode with pre-populated data
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess, openToGitHub, project }: CreateProjectDialogProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isDeploying, setIsDeploying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize config from project if in edit mode
  const getInitialConfig = (projectToUse?: Project | null): ProjectConfig => {
    const projectData = projectToUse || project;
    if (!projectData) {
      return {
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
        useUserPool: false,
        userPoolId: undefined,
        appClientId: undefined,
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
      };
    }

    // Populate from project
    const projectConfig = projectData.config as Record<string, unknown> | undefined;
    const specSource = projectData.spec_source;
    
    // Try to extract GitHub path from config or spec_source
    let githubPath = '';
    if (specSource.type === 'github') {
      // Check if path is in spec_source.github (if backend stores it there)
      githubPath = (specSource.github as Record<string, unknown>)?.path as string || '';
      // If not found, check in project config
      if (!githubPath && projectConfig) {
        const githubConfig = projectConfig.github as Record<string, unknown> | undefined;
        githubPath = githubConfig?.path as string || '';
      }
    }
    
    // Check for social auth: multiple possible formats
    // 1. auth_type === 'oauth' (old format)
    // 2. auth_config.type === 'oauth' (new format)
    // 3. user_pool_id exists (UserPool format)
    // 4. app_client_id exists (UserPool format)
    
    // Extract user pool and app client IDs from config
    const userPoolId = projectConfig?.user_pool_id as string | undefined;
    const appClientId = projectConfig?.app_client_id as string | undefined;
    
    const hasUserPool = !!userPoolId;
    const hasAppClient = !!appClientId;
    const authType = (projectConfig?.auth_type as string) || 'none';
    const authConfig = projectConfig?.auth_config as Record<string, unknown> | undefined;
    const authConfigType = authConfig?.type as string | undefined;
    
    // Social auth is enabled if any of these conditions are true:
    // - auth_type is 'oauth' (old format)
    // - auth_config.type is 'oauth' (new format)
    // - user_pool_id exists (UserPool format)
    // - app_client_id exists (UserPool format)
    const hasSocialAuth = authType === 'oauth' || authConfigType === 'oauth' || hasUserPool || hasAppClient;
    
    console.log('[getInitialConfig] Auth detection:', {
      hasConfig: !!projectConfig,
      configKeys: projectConfig ? Object.keys(projectConfig) : [],
      projectKeys: Object.keys(projectData),
      authType,
      authConfigType,
      hasUserPool,
      hasAppClient,
      userPoolId,
      appClientId,
      hasSocialAuth,
      authConfig: projectConfig?.auth_config,
      oauthConfig: projectConfig?.oauth_config,
      fullConfig: projectConfig,
      fullProject: projectData,
    });
    
    // Handle both old format (oauth_config) and new format (auth_config)
    const oauthConfig = projectConfig?.oauth_config as Record<string, unknown> | undefined;
    const authConfigForOAuth = projectConfig?.auth_config as Record<string, unknown> | undefined;
    
    // Determine if user brought their own provider (either format)
    const hasOAuthConfig = !!(oauthConfig || (authConfigForOAuth && authConfigForOAuth.type === 'oauth'));
    
    // Extract provider info from either format
    const providerType = oauthConfig?.provider_type as string 
      || authConfigForOAuth?.provider as string 
      || 'github';
    
    const providerClientId = oauthConfig?.client_id as string 
      || authConfigForOAuth?.client_id as string 
      || '';
    
    const providerDomain = oauthConfig?.domain as string 
      || authConfigForOAuth?.domain as string 
      || '';
    
    // Extract scopes - handle both string (space-separated) and array formats
    let scopes: string[] = ['email', 'openid', 'profile'];
    if (oauthConfig?.scopes) {
      const oauthScopes = oauthConfig.scopes;
      scopes = typeof oauthScopes === 'string' 
        ? oauthScopes.split(' ') 
        : Array.isArray(oauthScopes) 
          ? oauthScopes as string[]
          : ['email', 'openid', 'profile'];
    } else if (authConfigForOAuth?.scopes) {
      const authScopes = authConfigForOAuth.scopes;
      scopes = typeof authScopes === 'string'
        ? authScopes.split(' ')
        : Array.isArray(authScopes)
          ? authScopes as string[]
          : ['email', 'openid', 'profile'];
    }
    
    return {
      // General
      projectName: projectData.display_name || '',
      apiVersion: projectData.api_version || '1.0.0',
      sourceType: specSource.type === 'github' ? 'github' : specSource.type === 'upload' ? 'upload' : 'targetUrl',
      githubUser: specSource.github?.owner || '',
      githubRepo: specSource.github?.repo || '',
      githubPath: githubPath,
      githubBranch: specSource.github?.branch || 'main',
      targetUrl: (projectConfig?.target_url as string) || (projectConfig?.target as string) || '',
      uploadedFile: null,
      
      // Authentication - extract from config
      userGroupName: '',
      enableApiKey: authType !== 'oauth' && authConfigType !== 'oauth' && !hasSocialAuth,
      enableSocialAuth: hasSocialAuth,
      useUserPool: hasUserPool,
      userPoolId: userPoolId,
      appClientId: appClientId,
      bringOwnProvider: hasOAuthConfig,
      socialProvider: providerType as 'github' | 'google' | 'microsoft' | 'facebook' | 'auth0' | 'other',
      identityProviderDomain: providerDomain,
      identityProviderClientId: providerClientId,
      identityProviderClientSecret: '',
      authorizedScopes: scopes,
      
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
      
      // Domains
      customDomains: [],
    };
  };

  const [config, setConfig] = useState<ProjectConfig>(getInitialConfig());
  const [fullProject, setFullProject] = useState<Project | null>(project || null);

  // Use fullProject if available, otherwise fall back to project prop
  const currentProject = fullProject || project;

  // When dialog opens with openToGitHub flag, ensure we're on General tab and GitHub source
  useEffect(() => {
    if (open && openToGitHub) {
      setActiveTab('general');
      setConfig(prev => ({ ...prev, sourceType: 'github' }));
    }
  }, [open, openToGitHub]);

  // Fetch full project details if config is missing when opening in edit mode
  useEffect(() => {
    if (open && project && (!project.config || Object.keys(project.config).length === 0)) {
      // Fetch full project details to get the config
      api.getProject(project.project_id)
        .then((fullProjectData) => {
          setFullProject(fullProjectData as unknown as Project);
          setConfig(getInitialConfig(fullProjectData as unknown as Project));
        })
        .catch((error) => {
          console.error('Error fetching full project details:', error);
          // Fallback to using the project as-is
          setFullProject(project);
          setConfig(getInitialConfig(project));
        });
    } else if (open && project) {
      // Project already has config, use it directly
      setFullProject(project);
      setConfig(getInitialConfig(project));
    } else if (open) {
      // No project, reset to empty config
      setFullProject(null);
      setConfig(getInitialConfig());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, project]);

  const updateConfig = (updates: Partial<ProjectConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Validate if a valid source is configured
  const isSourceConfigured = () => {
    if (!config.projectName) return false;

    switch (config.sourceType) {
      case 'github':
        // GitHub requires user and repo (path is optional for existing projects)
        // For new projects, path is required. For existing projects, we allow deployment without path
        if (currentProject) {
          // Editing existing project - only require user and repo
          return !!(config.githubUser && config.githubRepo);
        } else {
          // New project - require user, repo, and path
          return !!(config.githubUser && config.githubRepo && config.githubPath);
        }
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
        // For existing projects, only require user and repo
        if (currentProject) {
          if (!config.githubUser || !config.githubRepo) {
            return 'github-source';
          }
        } else {
          // For new projects, require path too
          if (!config.githubUser || !config.githubRepo || !config.githubPath) {
            return 'github-source';
          }
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
    console.log('[CreateProject] Starting deployment with config:', {
      projectName: config.projectName,
      enableSocialAuth: config.enableSocialAuth,
      useUserPool: config.useUserPool,
      userPoolId: config.userPoolId,
      appClientId: config.appClientId,
      bringOwnProvider: config.bringOwnProvider,
    });
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
      // For existing projects, path might not be available, but we still need to send the source
      const githubSource = config.sourceType === 'github' && config.githubUser && config.githubRepo
        ? {
            owner: config.githubUser,
            repo: config.githubRepo,
            ...(config.githubPath ? { path: config.githubPath } : {}),
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
      const authType = config.enableSocialAuth ? 'oauth' : (config.enableApiKey ? 'api_key' : 'none');
      
      let userPoolId: string | undefined;
      let appClientId: string | undefined;
      let oauthConfig;

      // Handle UserPool creation/selection
      // Defensive check: if authType is oauth, we MUST have a UserPool
      const needsUserPool = config.enableSocialAuth || authType === 'oauth';
      console.warn('[CreateProject] ⚠️ CHECKING USERPOOL CREATION:', {
        enableSocialAuth: config.enableSocialAuth,
        authType: authType,
        needsUserPool: needsUserPool,
        useUserPool: config.useUserPool,
        userPoolId: config.userPoolId,
        appClientId: config.appClientId,
        bringOwnProvider: config.bringOwnProvider,
      });
      
      if (needsUserPool) {
        console.warn('[CreateProject] ✅ NEEDS USERPOOL - Entering creation logic');
        console.log('[CreateProject] Social auth enabled, checking UserPool config:', {
          useUserPool: config.useUserPool,
          userPoolId: config.userPoolId,
          appClientId: config.appClientId,
          bringOwnProvider: config.bringOwnProvider,
        });

        // Check if we should use an existing UserPool
        const hasExistingUserPool = config.useUserPool && config.userPoolId && config.appClientId;
        
        if (hasExistingUserPool) {
          // Use existing UserPool
          console.log('[CreateProject] Using existing UserPool:', {
            userPoolId: config.userPoolId,
            appClientId: config.appClientId,
          });
          userPoolId = config.userPoolId;
          appClientId = config.appClientId;
          oauthConfig = undefined; // Will be handled via user_pool_id and app_client_id
        } else if (config.bringOwnProvider) {
          console.log('[CreateProject] Creating UserPool with user-provided OAuth provider');
          // Validate OAuth provider fields
          if (!config.identityProviderClientId || !config.identityProviderClientSecret) {
            toast({
              title: 'Validation Error',
              description: 'Please provide Client ID and Client Secret for your OAuth provider',
              variant: 'destructive',
            });
            setActiveTab('auth');
            setIsDeploying(false);
            return;
          }

          // Create UserPool, AppClient, and Provider automatically
          try {
            // 1. Create UserPool
            const userPoolName = config.userGroupName || `${config.projectName}-userpool`;
            const userPool = await api.createUserPool({ name: userPoolName });
            const createdUserPoolId = (userPool as { id: string }).id;

            // 2. Create AppClient
            const appClient = await api.createAppClient(createdUserPoolId, {
              name: `${config.projectName}-appclient`,
              scopes: config.authorizedScopes,
            });
            const createdAppClientId = (appClient as { id: string }).id;

            // 3. Add Provider to AppClient
            await api.addProvider(createdUserPoolId, createdAppClientId, {
              type: config.socialProvider,
              clientId: config.identityProviderClientId,
              clientSecret: config.identityProviderClientSecret,
              domain: config.identityProviderDomain || undefined,
            });

            // Use the created UserPool and AppClient
            userPoolId = createdUserPoolId;
            appClientId = createdAppClientId;
            oauthConfig = undefined; // Will be handled via user_pool_id and app_client_id

            console.log('[CreateProject] Created UserPool automatically:', {
              userPoolId,
              appClientId,
              provider: config.socialProvider,
            });
          } catch (error) {
            console.error('Error creating UserPool automatically:', error);
            toast({
              title: 'Error Creating UserPool',
              description: 'Failed to create UserPool automatically. Please try again.',
              variant: 'destructive',
            });
            setIsDeploying(false);
            return;
          }
        } else {
          // Default GitHub case - create UserPool/AppClient/Provider automatically
          // This is done server-side to keep GitHub client secret secure
          console.warn('[CreateProject] 🚀 DEFAULT GITHUB CASE - Creating UserPool with default GitHub provider (server-side)');
          try {
            const userPoolName = config.userGroupName || `${config.projectName}-userpool`;
            const appClientName = `${config.projectName}-appclient`;
            
            console.log('[CreateProject] Creating UserPool/AppClient/Provider with default GitHub (server-side)...');
            const result = await api.createUserPoolWithDefaultGitHub({
              userPoolName,
              appClientName,
              scopes: config.authorizedScopes,
            });

            // Use the created UserPool and AppClient
            userPoolId = result.userPoolId;
            appClientId = result.appClientId;
            oauthConfig = undefined; // Will be handled via user_pool_id and app_client_id

            console.log('[CreateProject] Created UserPool for default GitHub:', {
              userPoolId,
              appClientId,
              provider: 'github',
            });
          } catch (error) {
            console.error('Error creating UserPool for default GitHub:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            toast({
              title: 'Error Creating UserPool',
              description: errorMessage.includes('not configured') 
                ? 'Default GitHub OAuth credentials are not configured. Please enable "Bring My Own OAuth Provider" and provide your own GitHub credentials, or contact support to configure default credentials.'
                : `Failed to create UserPool for default GitHub: ${errorMessage}`,
              variant: 'destructive',
            });
            setIsDeploying(false);
            return;
          }
        }
      } else {
        console.warn('[CreateProject] ❌ SKIPPING USERPOOL - Social auth is NOT enabled!', {
          enableSocialAuth: config.enableSocialAuth,
          authType: authType,
        });
      }

      // Defensive check: if we're using oauth but don't have a UserPool, that's an error
      if (authType === 'oauth' && !userPoolId) {
        console.error('[CreateProject] ERROR: OAuth auth type requires UserPool but none was created!', {
          enableSocialAuth: config.enableSocialAuth,
          useUserPool: config.useUserPool,
          userPoolId: config.userPoolId,
          appClientId: config.appClientId,
          bringOwnProvider: config.bringOwnProvider,
        });
        toast({
          title: 'Configuration Error',
          description: 'OAuth authentication requires a UserPool. Please try again or contact support.',
          variant: 'destructive',
        });
        setIsDeploying(false);
        return;
      }

      // Create the project
      console.log('[CreateProject] Final values before project creation:', {
        userPoolId,
        appClientId,
        authType,
        hasOauthConfig: !!oauthConfig,
      });
      
      const projectData = {
        name: config.projectName,
        display_name: config.projectName,
        subdomain: config.projectName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        target_url: config.targetUrl || config.targetServers.find(s => s.targetUrl)?.targetUrl,
        username: config.githubUser || session?.user?.githubHandle || session?.user?.email?.split('@')[0] || 'dashboard-user',
        github: githubSource,
        auth_type: authType,
        oauth_config: oauthConfig,
        user_pool_id: userPoolId,
        app_client_id: appClientId,
        environments: Object.keys(environments).length > 0 ? environments : undefined,
        // Include project_id and api_version for updates
        ...(currentProject ? {
          project_id: currentProject.project_id,
          api_version: currentProject.api_version,
        } : {}),
      };

      if (currentProject) {
        console.log('[CreateProject] Updating existing project:', currentProject.project_id);
      }

      console.log('[CreateProject] Deploying project with data:', projectData);
      const response = await api.createProject(projectData);
      
      console.log('[CreateProject] Success:', response);

      // Success!
      toast({
        title: currentProject ? 'Project Updated! 🎉' : 'Project Created! 🎉',
        description: `${config.projectName} has been successfully ${currentProject ? 'updated' : 'deployed'}.`,
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

  const handleDelete = async () => {
    const currentProject = fullProject || project;
    if (!currentProject) return;
    
    setIsDeleting(true);
    try {
      await deleteProject(currentProject.project_id, currentProject.api_version);
      
      toast({
        title: 'Project Deleted',
        description: `${currentProject.display_name} has been successfully deleted.`,
      });
      
      setShowDeleteConfirm(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast({
        title: 'Delete Failed',
        description: error instanceof Error ? error.message : 'Failed to delete project. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {currentProject ? 'Edit API Project' : 'Create New API Project'}
          </DialogTitle>
          <DialogDescription>
            {currentProject 
              ? 'Update your API proxy configuration. Changes will be applied on the next deployment.'
              : 'Configure your API proxy with sensible defaults. Deploy instantly or customize settings across all sections.'}
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
              <GeneralSection config={config} updateConfig={updateConfig} validationError={validationError} isEditMode={!!currentProject} />
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
                {validationError === 'github-source' && (currentProject ? 'Select a GitHub repository to continue' : 'Select a GitHub repository and spec file to continue')}
                {validationError === 'target-url' && 'Enter a target URL to continue'}
                {validationError === 'upload-file' && 'Upload an OpenAPI spec to continue'}
                {validationError === 'project-name' && 'Enter a project name to continue'}
                {!validationError && 'Configure a source to deploy'}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                {currentProject ? 'Ready to redeploy! Customize other sections or redeploy now.' : 'Ready to deploy! Customize other sections or deploy now.'}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeploying || isDeleting}>
              Cancel
            </Button>
            {currentProject && (
              <Button 
                onClick={() => setShowDeleteConfirm(true)} 
                disabled={isDeploying || isDeleting}
                variant="destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            )}
            <Button 
              onClick={handleDeploy} 
              disabled={isDeploying || isDeleting || !isSourceConfigured()}
              variant="default"
              className={!isSourceConfigured() ? 'opacity-50 cursor-not-allowed' : ''}
            >
              {isDeploying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {currentProject ? 'Redeploying...' : 'Deploying...'}
                </>
              ) : (
                <>
                  <Rocket className="mr-2 h-4 w-4" />
                  {currentProject ? 'Redeploy API' : 'Deploy API'}
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Project?</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{currentProject?.display_name}</strong>? This action cannot be undone and will permanently remove the project and all its data.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

