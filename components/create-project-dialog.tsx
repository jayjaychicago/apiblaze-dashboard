'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { fetchGitHubAPI } from '@/lib/github-api';
import type { Project } from '@/types/project';
import type { UserPool, AppClient, SocialProvider as UserPoolSocialProvider } from '@/types/user-pool';

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
  onProjectUpdate?: (updatedProject: Project) => void; // Callback to update project in parent
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess, openToGitHub, project, onProjectUpdate }: CreateProjectDialogProps) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project | null>(project || null);
  const [preloadedUserPools, setPreloadedUserPools] = useState<UserPool[]>([]);
  const [preloadedGitHubRepos, setPreloadedGitHubRepos] = useState<Array<{ id: number; name: string; full_name: string; description: string; default_branch: string; updated_at: string; language: string; stargazers_count: number }>>([]);
  const [preloadedAppClients, setPreloadedAppClients] = useState<Record<string, AppClient[]>>({}); // keyed by userPoolId
  const [preloadedProviders, setPreloadedProviders] = useState<Record<string, UserPoolSocialProvider[]>>({}); // keyed by `${userPoolId}-${appClientId}`

  // Initialize config from project if in edit mode
  const getInitialConfig = (): ProjectConfig => {
    const projectForConfig = currentProject || project;
    if (!projectForConfig) {
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
    userGroupName: 'my-api-users',
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

    // Populate from project (use currentProject state which may have been updated)
    const projectConfig = projectForConfig?.config as Record<string, unknown> | undefined;
    const specSource = projectForConfig?.spec_source;
    if (!specSource) {
      // Fallback if no project - this shouldn't happen but TypeScript needs it
      return getInitialConfig();
    }
    
    return {
      // General
      projectName: projectForConfig?.display_name || '',
      apiVersion: projectForConfig?.api_version || '1.0.0',
      sourceType: specSource.type === 'github' ? 'github' : specSource.type === 'upload' ? 'upload' : 'targetUrl',
      githubUser: specSource.github?.owner || '',
      githubRepo: specSource.github?.repo || '',
      githubPath: (projectConfig?.github_source as Record<string, unknown>)?.path as string || (specSource.github as Record<string, unknown>)?.path as string || '',
      githubBranch: specSource.github?.branch || 'main',
      targetUrl: (projectConfig?.target_url as string) || (projectConfig?.target as string) || '',
      uploadedFile: null,
      
      // Authentication - extract from config
      userGroupName: '',
      enableApiKey: (projectConfig?.auth_type as string) !== 'none',
      enableSocialAuth: (projectConfig?.auth_type as string) === 'oauth' || !!(projectConfig?.user_pool_id as string),
      useUserPool: !!(projectConfig?.user_pool_id as string),
      userPoolId: projectConfig?.user_pool_id as string | undefined,
      appClientId: undefined, // Not stored in config - selected at deployment time from database
      defaultAppClient: (projectConfig?.default_app_client_id || projectConfig?.defaultAppClient) as string | undefined,
      bringOwnProvider: !!(projectConfig?.oauth_config as Record<string, unknown>),
      socialProvider: 'github',
      identityProviderDomain: (projectConfig?.oauth_config as Record<string, unknown>)?.domain as string || '',
      identityProviderClientId: (projectConfig?.oauth_config as Record<string, unknown>)?.client_id as string || '',
      identityProviderClientSecret: '',
      authorizedScopes: ((projectConfig?.oauth_config as Record<string, unknown>)?.scopes as string)?.split(' ') || ['email', 'openid', 'profile'],
      
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

  // When dialog opens with openToGitHub flag, ensure we're on General tab and GitHub source
  useEffect(() => {
    if (open && openToGitHub) {
      setActiveTab('general');
      setConfig(prev => ({ ...prev, sourceType: 'github' }));
    }
  }, [open, openToGitHub]);

  // Update currentProject when project prop changes
  useEffect(() => {
    setCurrentProject(project || null);
  }, [project]);

  // Reset config when project changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      setConfig(getInitialConfig());
    }
  }, [open, currentProject, project]);

  // Preload data when dialog opens - this ensures instant response
  useEffect(() => {
    if (open) {
      // Load user pools in the background immediately when dialog opens
      const loadUserPools = async () => {
        try {
          const pools = await api.listUserPools();
          setPreloadedUserPools(Array.isArray(pools) ? pools : []);
        } catch (error) {
          console.error('Error preloading user pools:', error);
          setPreloadedUserPools([]);
        }
      };

      // Preload GitHub repos if GitHub app is installed
      const loadGitHubRepos = async () => {
        try {
          // Check if GitHub app is installed first
          const statusResponse = await fetchGitHubAPI('/api/github/installation-status', {
            cache: 'no-store',
          });
          
          if (statusResponse.ok) {
            const status = await statusResponse.json() as { installed?: boolean };
            if (status.installed) {
              // App is installed, preload repos
              const reposResponse = await fetchGitHubAPI('/api/github/repos');
              if (reposResponse.ok) {
                const repos = await reposResponse.json() as Array<{ id: number; name: string; full_name: string; description: string; default_branch: string; updated_at: string; language: string; stargazers_count: number }>;
                setPreloadedGitHubRepos(Array.isArray(repos) ? repos : []);
              }
            }
          }
        } catch (error) {
          console.error('Error preloading GitHub repos:', error);
          // Silently fail - not critical
        }
      };

      // Preload AppClients and Providers for edit mode if project has userPoolId and appClientId
      const loadEditModeData = async () => {
        const projectForEdit = currentProject || project;
        if (!projectForEdit) return;
        
        try {
          const projectConfig = projectForEdit.config as Record<string, unknown> | undefined;
          const userPoolId = projectConfig?.user_pool_id as string | undefined;
          const appClientId = projectConfig?.app_client_id as string | undefined;
          
          if (userPoolId) {
            // Preload AppClients for this userPool
            try {
              const clients = await api.listAppClients(userPoolId);
              const clientsArray = Array.isArray(clients) ? clients : [];
              setPreloadedAppClients(prev => ({
                ...prev,
                [userPoolId]: clientsArray,
              }));
              
              // If we also have an appClientId, preload providers
              if (appClientId && clientsArray.length > 0) {
                try {
                  const providers = await api.listProviders(userPoolId, appClientId);
                  const providersArray = Array.isArray(providers) ? providers : [];
                  setPreloadedProviders(prev => ({
                    ...prev,
                    [`${userPoolId}-${appClientId}`]: providersArray,
                  }));
                } catch (error) {
                  console.error('Error preloading providers:', error);
                }
              }
            } catch (error) {
              console.error('Error preloading app clients:', error);
            }
          }
        } catch (error) {
          console.error('Error preloading edit mode data:', error);
        }
      };

      // Load all data in parallel
      void loadUserPools();
      void loadGitHubRepos();
      void loadEditModeData();
    } else {
      // Clear preloaded data when dialog closes
      setPreloadedUserPools([]);
      setPreloadedGitHubRepos([]);
      setPreloadedAppClients({});
      setPreloadedProviders({});
    }
  }, [open, currentProject, project]);

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
      const authType = config.enableSocialAuth ? 'oauth' : (config.enableApiKey ? 'api_key' : 'none');
      
      let userPoolId: string | undefined;
      let appClientId: string | undefined;
      let oauthConfig;
      let defaultAppClientId: string | undefined = config.defaultAppClient; // Track default app client ID

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
        const hasExistingUserPool = config.useUserPool && config.userPoolId;
        
        if (hasExistingUserPool) {
          // Use existing UserPool
          // Use appClientId from config, or defaultAppClient if set
          let selectedAppClientId = config.appClientId || config.defaultAppClient;
          
          // If no app client is selected, automatically pick the first one from the user pool
          if (!selectedAppClientId && config.userPoolId) {
            try {
              const appClients = await api.listAppClients(config.userPoolId);
              const clientsArray = Array.isArray(appClients) ? appClients : [];
              
              if (clientsArray.length === 0) {
                toast({
                  title: 'Configuration Error',
                  description: 'The selected user pool has no app clients. Please create an app client first.',
                  variant: 'destructive',
                });
                setActiveTab('auth');
                setIsDeploying(false);
                return;
              }
              
              // Use the first app client as default
              selectedAppClientId = clientsArray[0].id;
              defaultAppClientId = selectedAppClientId;
              updateConfig({ defaultAppClient: defaultAppClientId });
              
              console.log('[CreateProject] Auto-selected first app client as default:', {
                userPoolId: config.userPoolId,
                appClientId: selectedAppClientId,
                totalClients: clientsArray.length,
              });
            } catch (error) {
              console.error('Error fetching app clients for user pool:', error);
              toast({
                title: 'Configuration Error',
                description: 'Failed to fetch app clients for the selected user pool. Please try again.',
                variant: 'destructive',
              });
              setActiveTab('auth');
              setIsDeploying(false);
              return;
            }
          } else {
            // Use the selected app client as default if not already set
            if (!config.defaultAppClient) {
              defaultAppClientId = selectedAppClientId;
              updateConfig({ defaultAppClient: defaultAppClientId });
            } else {
              defaultAppClientId = config.defaultAppClient;
            }
          }
          
          console.log('[CreateProject] Using existing UserPool:', {
            userPoolId: config.userPoolId,
            appClientId: selectedAppClientId,
            defaultAppClientId,
            isDefault: defaultAppClientId === selectedAppClientId,
          });
          userPoolId = config.userPoolId;
          appClientId = selectedAppClientId;
          oauthConfig = undefined; // Will be handled via user_pool_id and app_client_id
        } else if (config.bringOwnProvider) {
          console.log('[CreateProject] Creating UserPool with user-provided OAuth provider');
          // Validate OAuth provider fields
          // Check if providers array exists and has items, otherwise check legacy fields
          const hasProviders = config.providers && config.providers.length > 0;
          const hasLegacyProvider = config.identityProviderClientId && config.identityProviderClientSecret;
          
          if (!hasProviders && !hasLegacyProvider) {
            toast({
              title: 'Validation Error',
              description: 'Please add at least one OAuth provider with Client ID and Client Secret',
              variant: 'destructive',
            });
            setActiveTab('auth');
            setIsDeploying(false);
            return;
          }

          // Create UserPool, AppClient, and Provider automatically
          try {
            // 1. Check if UserPool with this name already exists, otherwise create it
            const userPoolName = config.userGroupName || `${config.projectName}-userpool`;
            let createdUserPoolId: string;
            
            // Check for existing user pool with the same name
            const existingUserPools = await api.listUserPools();
            const existingUserPool = Array.isArray(existingUserPools) 
              ? existingUserPools.find((pool: { name: string; id: string }) => pool.name === userPoolName)
              : null;
            
            if (existingUserPool) {
              // Reuse existing user pool
              console.log('[CreateProject] Reusing existing UserPool:', {
                id: existingUserPool.id,
                name: existingUserPool.name,
              });
              createdUserPoolId = existingUserPool.id;
            } else {
              // Create new user pool
              const userPool = await api.createUserPool({ name: userPoolName });
              createdUserPoolId = (userPool as { id: string }).id;
              console.log('[CreateProject] Created new UserPool:', {
                id: createdUserPoolId,
                name: userPoolName,
              });
            }

            // 2. Create AppClient
            const appClient = await api.createAppClient(createdUserPoolId, {
              name: `${config.projectName}-appclient`,
              scopes: config.authorizedScopes,
            });
            const createdAppClientId = (appClient as { id: string }).id;
            const createdAppClientClientId = (appClient as { clientId: string }).clientId;

            // 3. Add Provider(s) to AppClient
            // Use providers array if available, otherwise fall back to legacy single provider
            const providersToAdd = config.providers && config.providers.length > 0
              ? config.providers
              : (config.identityProviderClientId && config.identityProviderClientSecret
                  ? [{
                      type: config.socialProvider,
                      clientId: config.identityProviderClientId,
                      clientSecret: config.identityProviderClientSecret,
                      domain: config.identityProviderDomain || undefined,
                    }]
                  : []);

            for (const provider of providersToAdd) {
              await api.addProvider(createdUserPoolId, createdAppClientId, {
                type: provider.type,
                clientId: provider.clientId,
                clientSecret: provider.clientSecret,
                domain: provider.domain || undefined,
              });
            }

            // Use the created UserPool and AppClient
            userPoolId = createdUserPoolId;
            appClientId = createdAppClientId;
            oauthConfig = undefined; // Will be handled via user_pool_id and app_client_id
            
            // Set as default app client in project config (only one was created)
            // CRITICAL: Set this BEFORE project creation
            defaultAppClientId = createdAppClientId;
            // Update local config state (for UI, but we use the variable for API call)
            updateConfig({ defaultAppClient: defaultAppClientId });
            console.log('[CreateProject] Set defaultAppClientId for bringOwnProvider:', {
              defaultAppClientId,
              createdAppClientId,
              userPoolId,
            });

            console.log('[CreateProject] Created UserPool automatically:', {
              userPoolId,
              appClientId,
              provider: config.socialProvider,
              setAsDefault: true,
              defaultAppClientId,
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
          // The server-side endpoint will check for existing user pools by name
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
            
            // Set as default app client in project config (only one was created)
            // CRITICAL: Set this BEFORE project creation
            defaultAppClientId = result.appClientId;
            // Update local config state (for UI, but we use the variable for API call)
            updateConfig({ defaultAppClient: defaultAppClientId });
            console.log('[CreateProject] Set defaultAppClientId for default GitHub:', {
              defaultAppClientId,
              appClientId: result.appClientId,
              userPoolId: result.userPoolId,
            });

            console.log('[CreateProject] Created UserPool for default GitHub:', {
              userPoolId,
              appClientId,
              provider: 'github',
              setAsDefault: true,
              defaultAppClientId,
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

      // Ensure defaultAppClientId is set if we have an appClientId but no default
      if (appClientId && !defaultAppClientId) {
        defaultAppClientId = appClientId;
        console.log('[CreateProject] Auto-setting appClientId as defaultAppClientId:', defaultAppClientId);
      }

      // Create the project
      console.log('[CreateProject] Final values before project creation:', {
        userPoolId,
        appClientId,
        defaultAppClientId,
        authType,
        hasOauthConfig: !!oauthConfig,
      });
      
      // defaultAppClientId is tracked in the function scope (may have been set during app client creation)
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
        app_client_id: appClientId, // AppClient selected at deployment time (not stored in config)
        default_app_client_id: defaultAppClientId, // Default app client ID stored in project config
        environments: Object.keys(environments).length > 0 ? environments : undefined,
      };

      console.log('[CreateProject] Project data being sent:', {
        ...projectData,
        oauth_config: oauthConfig ? '[present]' : undefined,
      });

      console.log('[CreateProject] Deploying project with data:', projectData);
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
          <DialogTitle className="text-2xl">
            {project ? 'Edit API Project' : 'Create New API Project'}
          </DialogTitle>
          <DialogDescription>
            {project 
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
              <GeneralSection 
                config={config} 
                updateConfig={updateConfig} 
                validationError={validationError}
                preloadedGitHubRepos={preloadedGitHubRepos}
              />
            </TabsContent>

            <TabsContent value="auth" className="mt-0">
              <AuthenticationSection 
                config={config} 
                updateConfig={updateConfig} 
                isEditMode={!!currentProject}
                project={currentProject}
                onProjectUpdate={(updatedProject) => {
                  setCurrentProject(updatedProject);
                  onProjectUpdate?.(updatedProject);
                }}
                preloadedUserPools={preloadedUserPools}
                preloadedAppClients={preloadedAppClients}
                preloadedProviders={preloadedProviders}
              />
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

