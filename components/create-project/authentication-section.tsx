'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertCircle, Plus, X, Users, Key, Copy, Check, Trash2, Search, ChevronDown, Star, ExternalLink } from 'lucide-react';
import { ProjectConfig, SocialProvider } from './types';
import { useState, useEffect, useRef } from 'react';
import { UserPoolModal } from '@/components/user-pool/user-pool-modal';
import { api } from '@/lib/api';
import { updateProjectConfig } from '@/lib/api/projects';
import type { AppClient, UserPool, SocialProvider as UserPoolSocialProvider } from '@/types/user-pool';
import type { Project } from '@/types/project';

// API response may have snake_case fields from the database
type AppClientResponse = AppClient & {
  client_id?: string;
  redirect_uris?: string[];
  signout_uris?: string[];
};

type SocialProviderResponse = UserPoolSocialProvider & {
  client_id?: string;
};

interface AuthenticationSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
  isEditMode?: boolean;
  project?: Project | null;
  onProjectUpdate?: (updatedProject: Project) => void; // Callback to update project in parent
  preloadedUserPools?: UserPool[]; // Optional preloaded user pools from parent
  preloadedAppClients?: Record<string, AppClient[]>; // Optional preloaded app clients keyed by userPoolId
  preloadedProviders?: Record<string, UserPoolSocialProvider[]>; // Optional preloaded providers keyed by `${userPoolId}-${appClientId}`
}

const PROVIDER_DOMAINS: Record<SocialProvider, string> = {
  google: 'https://accounts.google.com',
  microsoft: 'https://login.microsoftonline.com',
  github: 'https://github.com',
  facebook: 'https://www.facebook.com',
  auth0: 'https://YOUR_DOMAIN.auth0.com',
  other: '',
};

const PROVIDER_SETUP_GUIDES: Record<SocialProvider, string[]> = {
  google: [
    'Go to Google Cloud Console (console.cloud.google.com)',
    'Select your project or create a new one',
    'Go to APIs & Services → Library',
    'Search for and enable: Google+ API',
    'Go to APIs & Services → Credentials',
    'Click + CREATE CREDENTIALS → OAuth 2.0 Client IDs',
    'Choose Web application as application type',
    'Add the authorized redirect URI below',
    'Copy the Client ID and Client Secret',
  ],
  github: [
    'Go to GitHub Settings → Developer settings',
    'Click OAuth Apps → New OAuth App',
    'Fill in application name and homepage URL',
    'Add the authorization callback URL below',
    'Click Register application',
    'Copy the Client ID',
    'Generate a new client secret and copy it',
  ],
  microsoft: [
    'Go to Azure Portal (portal.azure.com)',
    'Navigate to Azure Active Directory',
    'Go to App registrations → New registration',
    'Enter application name and select account types',
    'Add redirect URI: Web → paste callback URL',
    'After creation, copy Application (client) ID',
    'Go to Certificates & secrets → New client secret',
    'Copy the client secret value',
  ],
  facebook: [
    'Go to Facebook Developers (developers.facebook.com)',
    'Create a new app or select existing one',
    'Add Facebook Login product',
    'Go to Settings → Basic',
    'Copy App ID and App Secret',
    'Go to Facebook Login → Settings',
    'Add Valid OAuth Redirect URIs',
  ],
  auth0: [
    'Go to Auth0 Dashboard (manage.auth0.com)',
    'Navigate to Applications → Create Application',
    'Choose Regular Web Application',
    'Go to Settings tab',
    'Copy Domain, Client ID, and Client Secret',
    'Add callback URL to Allowed Callback URLs',
    'Save changes',
  ],
  other: ['Configure your custom OAuth provider'],
};

// Edit Mode Management UI Component
function EditModeManagementUI({ 
  config, 
  updateConfig, 
  project,
  onProjectUpdate,
  initialUserPoolId,
  preloadedUserPools,
  preloadedAppClients,
  preloadedProviders
}: { 
  config: ProjectConfig; 
  updateConfig: (updates: Partial<ProjectConfig>) => void; 
  project?: Project | null;
  onProjectUpdate?: (updatedProject: Project) => void;
  initialUserPoolId?: string;
  preloadedUserPools?: UserPool[];
  preloadedAppClients?: Record<string, AppClient[]>;
  preloadedProviders?: Record<string, UserPoolSocialProvider[]>;
}) {
  // Save config changes immediately to backend (without redeployment)
  const saveConfigImmediately = async (updates: Partial<ProjectConfig>) => {
    if (!project) return; // Only save if we're in edit mode with an existing project
    
    try {
      // Extract only the defaultAppClient to save
      const configToSave: Record<string, unknown> = {};
      if ('defaultAppClient' in updates) {
        configToSave.default_app_client_id = updates.defaultAppClient || null;
      }
      
      if (Object.keys(configToSave).length > 0) {
        await updateProjectConfig(project.project_id, project.api_version, configToSave);
        
        // Update the project object's config immediately so UI reflects the change
        const updatedConfig = project.config 
          ? { ...(project.config as Record<string, unknown>), ...configToSave }
          : configToSave;
        
        const updatedProject = {
          ...project,
          config: updatedConfig
        };
        
        // Notify parent to update project state
        if (onProjectUpdate) {
          onProjectUpdate(updatedProject);
        }
      }
    } catch (error) {
      console.error('Error saving config immediately:', error);
      // Don't show error to user - config will be saved on next deployment anyway
    }
  };

  // Get initial values from project config in edit mode
  const getInitialUserPoolId = () => {
    if (initialUserPoolId) return initialUserPoolId;
    if (config.userPoolId) return config.userPoolId;
    if (project?.config) {
      const projectConfig = project.config as Record<string, unknown>;
      return projectConfig.user_pool_id as string | undefined;
    }
    return undefined;
  };

  const getInitialAppClients = (): AppClient[] => {
    const userPoolId = getInitialUserPoolId();
    if (userPoolId && preloadedAppClients?.[userPoolId]) {
      return preloadedAppClients[userPoolId];
    }
    return [];
  };

  const getInitialProviders = (): Record<string, SocialProviderResponse[]> => {
    const userPoolId = getInitialUserPoolId();
    const result: Record<string, SocialProviderResponse[]> = {};
    if (userPoolId && preloadedAppClients?.[userPoolId]) {
      preloadedAppClients[userPoolId].forEach((client) => {
        const key = `${userPoolId}-${client.id}`;
        if (preloadedProviders?.[key]) {
          result[client.id] = preloadedProviders[key] as SocialProviderResponse[];
        }
      });
    }
    return result;
  };

  // UserPool management
  const [userPools, setUserPools] = useState<UserPool[]>(preloadedUserPools || []);
  const [loadingUserPools, setLoadingUserPools] = useState(false);
  const [selectedUserPoolId, setSelectedUserPoolId] = useState<string | undefined>(getInitialUserPoolId());
  
  // AppClient management
  const [appClients, setAppClients] = useState<AppClient[]>(getInitialAppClients());
  const [loadingAppClients, setLoadingAppClients] = useState(false);
  const [appClientDetails, setAppClientDetails] = useState<Record<string, AppClientResponse>>({});
  const [loadingAppClientDetails, setLoadingAppClientDetails] = useState<Record<string, boolean>>({});
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [loadingSecret, setLoadingSecret] = useState<string | null>(null);
  const [showAddAppClient, setShowAddAppClient] = useState(false);
  const [newAppClientName, setNewAppClientName] = useState('');
  
  // Provider management - keyed by app client ID
  const [providers, setProviders] = useState<Record<string, SocialProviderResponse[]>>(getInitialProviders());
  const [loadingProviders, setLoadingProviders] = useState<Record<string, boolean>>({});
  const [showAddProvider, setShowAddProvider] = useState<Record<string, boolean>>({});
  
  // Update with preloaded app clients and providers when they become available
  useEffect(() => {
    const userPoolId = getInitialUserPoolId();
    
    if (userPoolId && preloadedAppClients?.[userPoolId] && appClients.length === 0) {
      setAppClients(preloadedAppClients[userPoolId]);
      // Load providers for all app clients
      preloadedAppClients[userPoolId].forEach((client) => {
        const key = `${userPoolId}-${client.id}`;
        if (preloadedProviders?.[key]) {
          setProviders(prev => ({
            ...prev,
            [client.id]: preloadedProviders[key] as SocialProviderResponse[]
          }));
        }
      });
    }
  }, [preloadedAppClients, preloadedProviders]);
  
  const [newProvider, setNewProvider] = useState<Record<string, {
    type: SocialProvider;
    clientId: string;
    clientSecret: string;
    domain: string;
    tokenType: 'apiblaze' | 'thirdParty';
  }>>({});
  
  // UI state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Initialize with preloaded user pools if provided
  useEffect(() => {
    if (preloadedUserPools && preloadedUserPools.length > 0) {
      setUserPools(preloadedUserPools);
    }
  }, [preloadedUserPools]);

  // Load UserPools on mount (only if not preloaded)
  useEffect(() => {
    if (!preloadedUserPools || preloadedUserPools.length === 0) {
      loadUserPools();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedUserPools]);

  // In edit mode, load UserPool from project config and prepopulate
  // Or use initialUserPoolId if provided (for create mode)
  // This must run before the UserPool selection effect
  useEffect(() => {
    if (initialUserPoolId && initialUserPoolId !== selectedUserPoolId) {
      setSelectedUserPoolId(initialUserPoolId);
    } else if (project?.config) {
      const projectConfig = project.config as Record<string, unknown>;
      const userPoolId = projectConfig.user_pool_id as string | undefined;
      const defaultAppClientId = (projectConfig.default_app_client_id || projectConfig.defaultAppClient) as string | undefined;
      
      if (userPoolId && userPoolId !== selectedUserPoolId) {
        setSelectedUserPoolId(userPoolId);
      }
      
      // Load defaultAppClient from project config
      if (defaultAppClientId && config.defaultAppClient !== defaultAppClientId) {
        updateConfig({ defaultAppClient: defaultAppClientId });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, initialUserPoolId, selectedUserPoolId]);

  // Track initial UserPool to avoid clearing data on first load
  const initialUserPoolIdRef = useRef<string | undefined>(getInitialUserPoolId());
  const isInitialLoadRef = useRef(true);

  // Load AppClients when UserPool is selected
  useEffect(() => {
    if (selectedUserPoolId) {
      // Use preloaded data if available, otherwise load
      const hasPreloaded = preloadedAppClients?.[selectedUserPoolId] && preloadedAppClients[selectedUserPoolId].length > 0;
      if (hasPreloaded && appClients.length === 0) {
        // Use preloaded data immediately
        const clients = preloadedAppClients[selectedUserPoolId];
        setAppClients(clients);
        // Load providers for all app clients
        clients.forEach((client) => {
          const key = `${selectedUserPoolId}-${client.id}`;
          if (preloadedProviders?.[key]) {
            setProviders(prev => ({
              ...prev,
              [client.id]: preloadedProviders[key] as SocialProviderResponse[]
            }));
          } else {
            // Load providers from API if not preloaded
            loadProviders(selectedUserPoolId, client.id, false);
          }
          // Load app client details
          loadAppClientDetails(selectedUserPoolId, client.id);
        });
      } else if (!hasPreloaded) {
        // Load if not preloaded
        loadAppClients(selectedUserPoolId, true);
      }
      updateConfig({ userPoolId: selectedUserPoolId });
      
      // Only clear data if UserPool actually changed (not on initial load)
      if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      } else if (selectedUserPoolId !== initialUserPoolIdRef.current) {
        // UserPool changed, clear all data
        setAppClientDetails({});
        setProviders({});
      }
    } else {
      setAppClients([]);
      setAppClientDetails({});
      setProviders({});
      updateConfig({ userPoolId: undefined, appClientId: undefined });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserPoolId]);


  const loadUserPools = async () => {
    setLoadingUserPools(true);
    try {
      const pools = await api.listUserPools();
      setUserPools(Array.isArray(pools) ? pools : []);
    } catch (error) {
      console.error('Error loading user pools:', error);
      setUserPools([]);
    } finally {
      setLoadingUserPools(false);
    }
  };

  const loadAppClients = async (poolId: string, showLoading = true, forceRefresh = false) => {
    // Check if we have preloaded data first (unless forcing refresh)
    if (!forceRefresh && preloadedAppClients?.[poolId] && preloadedAppClients[poolId].length > 0) {
      const clients = preloadedAppClients[poolId];
      setAppClients(clients);
      // Load providers and details for all app clients
      clients.forEach((client) => {
        const key = `${poolId}-${client.id}`;
        if (preloadedProviders?.[key]) {
          setProviders(prev => ({
            ...prev,
            [client.id]: preloadedProviders[key] as SocialProviderResponse[]
          }));
        } else {
          // Load providers from API if not preloaded
          loadProviders(poolId, client.id, false);
        }
        // Load app client details
        loadAppClientDetails(poolId, client.id);
      });
      
      // Ensure one app client is always the default
      if (clients.length === 1 && !config.defaultAppClient) {
        updateConfig({ defaultAppClient: clients[0].id });
        await saveConfigImmediately({ defaultAppClient: clients[0].id });
      }
      return;
    }
    
    if (showLoading) {
      setLoadingAppClients(true);
    }
    try {
      const clients = await api.listAppClients(poolId);
      const clientsArray = Array.isArray(clients) ? clients : [];
      setAppClients(clientsArray);
      
      // Load providers and details for all app clients
      clientsArray.forEach((client) => {
        loadProviders(poolId, client.id, false);
        loadAppClientDetails(poolId, client.id);
      });
      
      // Ensure one app client is always the default
      if (clientsArray.length === 1 && !config.defaultAppClient) {
        updateConfig({ defaultAppClient: clientsArray[0].id });
        await saveConfigImmediately({ defaultAppClient: clientsArray[0].id });
      }
    } catch (error) {
      console.error('Error loading app clients:', error);
      setAppClients([]);
    } finally {
      if (showLoading) {
        setLoadingAppClients(false);
      }
    }
  };

  const loadAppClientDetails = async (poolId: string, clientId: string) => {
    setLoadingAppClientDetails(prev => ({ ...prev, [clientId]: true }));
    try {
      const client = await api.getAppClient(poolId, clientId);
      setAppClientDetails(prev => ({
        ...prev,
        [clientId]: client
      }));
      // If secret is in the response, store it in revealedSecrets
      if (client.clientSecret) {
        setRevealedSecrets(prev => ({
          ...prev,
          [clientId]: client.clientSecret || ''
        }));
      }
    } catch (error) {
      console.error('Error loading app client details:', error);
    } finally {
      setLoadingAppClientDetails(prev => ({ ...prev, [clientId]: false }));
    }
  };

  const revealClientSecret = async (poolId: string, clientId: string) => {
    setLoadingSecret(clientId);
    try {
      // Fetch the app client - the API should now return the secret
      const client = await api.getAppClient(poolId, clientId);
      const secret = client.clientSecret;
      
      if (secret) {
        setRevealedSecrets(prev => ({
          ...prev,
          [clientId]: secret
        }));
        // Also update appClientDetails
        setAppClientDetails(prev => ({
          ...prev,
          [clientId]: {
            ...client,
            clientSecret: secret
          } as AppClientResponse
        }));
      } else {
        console.error('Secret not found in API response:', client);
        alert('Secret not available. Please check the backend API response.');
      }
    } catch (error) {
      console.error('Error revealing client secret:', error);
      alert('Failed to retrieve client secret. Please check the console for details.');
    } finally {
      setLoadingSecret(null);
    }
  };

  const loadProviders = async (poolId: string, clientId: string, showLoading = true) => {
    // Check if we have preloaded data first
    const preloadKey = `${poolId}-${clientId}`;
    if (preloadedProviders?.[preloadKey] && preloadedProviders[preloadKey].length > 0) {
      setProviders(prev => ({
        ...prev,
        [clientId]: preloadedProviders[preloadKey] as SocialProviderResponse[]
      }));
      return;
    }
    
    if (showLoading) {
      setLoadingProviders(prev => ({ ...prev, [clientId]: true }));
    }
    try {
      const providerList = await api.listProviders(poolId, clientId);
      setProviders(prev => ({
        ...prev,
        [clientId]: Array.isArray(providerList) ? providerList : []
      }));
    } catch (error) {
      console.error('Error loading providers:', error);
      setProviders(prev => ({
        ...prev,
        [clientId]: []
      }));
    } finally {
      if (showLoading) {
        setLoadingProviders(prev => ({ ...prev, [clientId]: false }));
      }
    }
  };

  const handleCreateAppClient = async () => {
    if (!selectedUserPoolId || !newAppClientName.trim()) return;
    
    try {
      const newClient = await api.createAppClient(selectedUserPoolId, {
        name: newAppClientName,
        scopes: ['email', 'openid', 'profile'],
      });
      
      // Add the new client to the state immediately so it appears right away
      // The API should return a full AppClient object
      const clientToAdd = newClient as AppClient;
      const updatedClients = [...appClients, clientToAdd];
      setAppClients(updatedClients);
      
      // Load details and providers for the new client
      const clientId = clientToAdd.id;
      loadAppClientDetails(selectedUserPoolId, clientId);
      loadProviders(selectedUserPoolId, clientId, false);
      
      // If this is the only app client (or no default is set), make it the default
      if (updatedClients.length === 1 || !config.defaultAppClient) {
        updateConfig({ defaultAppClient: clientId });
        await saveConfigImmediately({ defaultAppClient: clientId });
      }
      
      // Also refresh the full list to ensure consistency (force refresh to bypass preloaded data)
      await loadAppClients(selectedUserPoolId, false, true);
      
      setNewAppClientName('');
      setShowAddAppClient(false);
    } catch (error) {
      console.error('Error creating app client:', error);
      alert('Failed to create app client');
    }
  };

  const handleDeleteAppClient = async (clientId: string) => {
    if (!selectedUserPoolId) return;
    if (!confirm('Are you sure you want to delete this AppClient? This action cannot be undone.')) return;
    
    try {
      await api.deleteAppClient(selectedUserPoolId, clientId);
      
      // Check if the deleted client was the default
      const wasDefault = config.defaultAppClient === clientId;
      
      // Remove from state
      const remainingClients = appClients.filter(c => c.id !== clientId);
      setAppClients(remainingClients);
      setAppClientDetails(prev => {
        const next = { ...prev };
        delete next[clientId];
        return next;
      });
      setProviders(prev => {
        const next = { ...prev };
        delete next[clientId];
        return next;
      });
      
      // Handle default app client reassignment
      // One app client must always be the default
      if (wasDefault) {
        if (remainingClients.length > 0) {
          // Set the first remaining app client as default
          const newDefault = remainingClients[0].id;
          updateConfig({ defaultAppClient: newDefault });
          // Save immediately if in edit mode
          await saveConfigImmediately({ defaultAppClient: newDefault });
        } else {
          // No app clients left - this shouldn't happen in practice, but clear default if it does
          updateConfig({ defaultAppClient: undefined });
          // Save immediately if in edit mode
          await saveConfigImmediately({ defaultAppClient: undefined });
        }
      } else if (remainingClients.length === 1 && !config.defaultAppClient) {
        // If there's only one app client left and no default is set, make it the default
        const newDefault = remainingClients[0].id;
        updateConfig({ defaultAppClient: newDefault });
        await saveConfigImmediately({ defaultAppClient: newDefault });
      }
    } catch (error) {
      console.error('Error deleting app client:', error);
      alert('Failed to delete app client');
    }
  };

  const handleAddProvider = async (clientId: string) => {
    if (!selectedUserPoolId) return;
    const provider = newProvider[clientId];
    if (!provider || !provider.clientId || !provider.clientSecret) {
      alert('Please provide Client ID and Client Secret');
      return;
    }
    
    try {
      await api.addProvider(selectedUserPoolId, clientId, {
        type: provider.type,
        clientId: provider.clientId,
        clientSecret: provider.clientSecret,
        domain: provider.domain || PROVIDER_DOMAINS[provider.type],
        tokenType: provider.tokenType || 'thirdParty',
      });
      
      await loadProviders(selectedUserPoolId, clientId);
      setNewProvider(prev => {
        const next = { ...prev };
        delete next[clientId];
        return next;
      });
      setShowAddProvider(prev => ({ ...prev, [clientId]: false }));
    } catch (error) {
      console.error('Error adding provider:', error);
      alert('Failed to add provider');
    }
  };

  const handleDeleteProvider = async (clientId: string, providerId: string) => {
    if (!selectedUserPoolId) return;
    if (!confirm('Are you sure you want to delete this provider?')) return;
    
    try {
      await api.removeProvider(selectedUserPoolId, clientId, providerId);
      await loadProviders(selectedUserPoolId, clientId);
    } catch (error) {
      console.error('Error deleting provider:', error);
      alert('Failed to delete provider');
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    if (!text || text.trim() === '') {
      console.warn('No text to copy');
      return;
    }

    try {
      // Check if clipboard API is available (requires secure context)
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
        return;
      }
    } catch (clipboardError) {
      console.warn('Clipboard API failed, trying fallback:', clipboardError);
    }

    // Fallback for browsers/environments without clipboard API
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      document.body.appendChild(textArea);
      
      // For iOS
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textArea.setSelectionRange(0, 999999);
      } else {
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);
      }
      
      const successful = document.execCommand('copy');
      
      // Clean up
      if (textArea.parentNode) {
        document.body.removeChild(textArea);
      }
      
      if (successful) {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        throw new Error('Copy command returned false');
      }
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      // Last resort: show value in prompt for manual copy
      const userConfirmed = confirm(`Copy this value manually:\n\n${text}\n\nClick OK to continue.`);
      if (userConfirmed) {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">OAuth Configuration</Label>
        <p className="text-sm text-muted-foreground">
          Manage UserPool, AppClients, and Providers for this project
        </p>
      </div>

      {/* UserPool Selection */}
      <div>
        <Label htmlFor="userPoolSelect" className="text-sm font-medium">
          UserPool
        </Label>
        <div className="flex gap-2 mt-1">
          <Select
            value={selectedUserPoolId || ''}
            onValueChange={(value) => setSelectedUserPoolId(value || undefined)}
            disabled={loadingUserPools}
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={loadingUserPools ? "Loading..." : "Select a UserPool"} />
            </SelectTrigger>
            <SelectContent>
              {userPools.map((pool) => (
                <SelectItem key={pool.id} value={pool.id}>
                  {pool.name} ({pool.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => {
              loadUserPools();
              // The select dropdown will show the refreshed list
            }}
            title="Refresh user pools"
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Note: Changing UserPool will change the AppClient selection
        </p>
      </div>

      {/* AppClient Management */}
      {selectedUserPoolId && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">AppClients</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddAppClient(!showAddAppClient)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add AppClient
            </Button>
          </div>

          {showAddAppClient && (
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Create New AppClient</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label htmlFor="appClientName" className="text-xs">Name</Label>
                  <Input
                    id="appClientName"
                    value={newAppClientName}
                    onChange={(e) => setNewAppClientName(e.target.value)}
                    placeholder="my-app-client"
                    className="mt-1"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateAppClient}
                    disabled={!newAppClientName.trim()}
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowAddAppClient(false);
                      setNewAppClientName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {loadingAppClients ? (
            <div className="text-sm text-muted-foreground">Loading AppClients...</div>
          ) : appClients.length === 0 ? (
            <div className="text-sm text-muted-foreground">No AppClients found. Create one to continue.</div>
          ) : (
            <div className="space-y-6">
              {appClients.map((client) => {
                const clientDetails = appClientDetails[client.id];
                const clientProviders = providers[client.id] || [];
                const isLoadingProviders = loadingProviders[client.id];
                const isShowingAddProvider = showAddProvider[client.id];
                return (
                  <div key={client.id} className="space-y-4">
                    {/* App Client Card - More prominent styling */}
                    <Card className="border-2 border-blue-200 bg-blue-50/30 shadow-sm">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Key className="h-4 w-4 text-blue-600" />
                              <div>
                                <div className="font-semibold text-base">{client.name}</div>
                                {(() => {
                                  const clientId = clientDetails?.client_id || clientDetails?.clientId;
                                  const projectName = project?.project_id || 'project';
                                  const portalUrl = clientId 
                                    ? `https://${projectName}.portal.APIblaze.com/login?clientId=${clientId}`
                                    : `https://${projectName}.portal.APIblaze.com/login`;
                                  return (
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <div className="text-xs text-muted-foreground">
                                        API Portal login:{' '}
                                        <a
                                          href={portalUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {portalUrl}
                                        </a>
                                      </div>
                                      <a
                                        href={portalUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800"
                                        title="Open in new tab"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                      {config.defaultAppClient === client.id ? (
                                        <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600 text-xs ml-1">
                                          <Star className="h-3 w-3 mr-1" />
                                          Default
                                        </Badge>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={async () => {
                                            updateConfig({
                                              defaultAppClient: client.id,
                                            });
                                            // Save immediately if in edit mode
                                            await saveConfigImmediately({ defaultAppClient: client.id });
                                          }}
                                          className="h-6 px-2 text-xs hover:bg-blue-100 ml-1"
                                          title="Set as default"
                                        >
                                          <Star className="h-3 w-3 mr-1" />
                                          Set as Default
                                        </Button>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteAppClient(client.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          {clientDetails && (
                            <div className="space-y-3 pt-2 border-t border-blue-100">
                              <div className="space-y-2">
                                <div>
                                  <Label className="text-xs font-medium text-muted-foreground">Client ID</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <code className="flex-1 text-xs bg-white px-3 py-2 rounded-md border border-gray-200 font-mono break-all">
                                      {clientDetails.client_id || clientDetails.clientId || '••••••••'}
                                    </code>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        await copyToClipboard(clientDetails.client_id || clientDetails.clientId || '', `clientId-${client.id}`);
                                      }}
                                      className="h-8 w-8 p-0 hover:bg-blue-100"
                                    >
                                      {copiedField === `clientId-${client.id}` ? (
                                        <Check className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-xs font-medium text-muted-foreground">Client Secret</Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <code className="flex-1 text-xs bg-white px-3 py-2 rounded-md border border-gray-200 font-mono">
                                      {(() => {
                                        const secret = revealedSecrets[client.id] || 
                                                      (clientDetails as AppClientResponse).clientSecret;
                                        if (secret) {
                                          // Show first 4 and last 4 characters
                                          if (secret.length <= 8) {
                                            return secret; // Show full secret if it's short
                                          }
                                          return `${secret.substring(0, 4)}...${secret.substring(secret.length - 4)}`;
                                        }
                                        return '••••••••••••••••';
                                      })()}
                                    </code>
                                    {revealedSecrets[client.id] || 
                                     (clientDetails as AppClientResponse).clientSecret ? (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          const secret = revealedSecrets[client.id] || 
                                                        (clientDetails as AppClientResponse).clientSecret;
                                          if (secret) {
                                            await copyToClipboard(secret, `clientSecret-${client.id}`);
                                          }
                                        }}
                                        className="h-8 w-8 p-0 hover:bg-blue-100"
                                      >
                                        {copiedField === `clientSecret-${client.id}` ? (
                                          <Check className="h-4 w-4 text-green-600" />
                                        ) : (
                                          <Copy className="h-4 w-4" />
                                        )}
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                          if (selectedUserPoolId) {
                                            revealClientSecret(selectedUserPoolId, client.id);
                                          }
                                        }}
                                        className="h-8 px-3 text-xs hover:bg-blue-100"
                                        disabled={loadingSecret === client.id}
                                      >
                                        {loadingSecret === client.id ? '...' : 'Reveal'}
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Providers nested under each app client - Clearly indented with visual connection */}
                    <div className="ml-8 pl-4 border-l-2 border-gray-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <Label className="text-sm font-medium text-muted-foreground">OAuth Providers</Label>
                          {clientProviders.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {clientProviders.length}
                            </Badge>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAddProvider(prev => ({ ...prev, [client.id]: !prev[client.id] }))}
                          className="h-8 text-xs"
                        >
                          <Plus className="h-3 w-3 mr-1.5" />
                          Add Provider
                        </Button>
                      </div>

                      {isShowingAddProvider && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {/* Left Column - Configuration Fields */}
                          <Card className="border-green-200 bg-green-50/50">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm">Add OAuth Provider</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div>
                                <Label htmlFor={`providerType-${client.id}`} className="text-xs">Provider Type</Label>
                                <Select
                                  value={newProvider[client.id]?.type || 'google'}
                                  onValueChange={(value) => setNewProvider(prev => ({
                                    ...prev,
                                    [client.id]: {
                                      type: value as SocialProvider,
                                      clientId: prev[client.id]?.clientId || '',
                                      clientSecret: prev[client.id]?.clientSecret || '',
                                      domain: PROVIDER_DOMAINS[value as SocialProvider],
                                      tokenType: prev[client.id]?.tokenType || 'thirdParty',
                                    }
                                  }))}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="google">Google</SelectItem>
                                    <SelectItem value="microsoft">Microsoft</SelectItem>
                                    <SelectItem value="github">GitHub</SelectItem>
                                    <SelectItem value="facebook">Facebook</SelectItem>
                                    <SelectItem value="auth0">Auth0</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <Label htmlFor={`providerDomain-${client.id}`} className="text-xs">Domain</Label>
                                <Input
                                  id={`providerDomain-${client.id}`}
                                  value={newProvider[client.id]?.domain || ''}
                                  onChange={(e) => setNewProvider(prev => ({
                                    ...prev,
                                    [client.id]: {
                                      ...(prev[client.id] || { type: 'google', clientId: '', clientSecret: '', domain: '', tokenType: 'thirdParty' }),
                                      domain: e.target.value
                                    }
                                  }))}
                                  placeholder="https://accounts.google.com"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`providerClientId-${client.id}`} className="text-xs">Client ID</Label>
                                <Input
                                  id={`providerClientId-${client.id}`}
                                  value={newProvider[client.id]?.clientId || ''}
                                  onChange={(e) => setNewProvider(prev => ({
                                    ...prev,
                                    [client.id]: {
                                      ...(prev[client.id] || { type: 'google', clientId: '', clientSecret: '', domain: '', tokenType: 'thirdParty' }),
                                      clientId: e.target.value
                                    }
                                  }))}
                                  placeholder="your-client-id"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`providerClientSecret-${client.id}`} className="text-xs">Client Secret</Label>
                                <Input
                                  id={`providerClientSecret-${client.id}`}
                                  type="password"
                                  value={newProvider[client.id]?.clientSecret || ''}
                                  onChange={(e) => setNewProvider(prev => ({
                                    ...prev,
                                    [client.id]: {
                                      ...(prev[client.id] || { type: 'google', clientId: '', clientSecret: '', domain: '', tokenType: 'thirdParty' }),
                                      clientSecret: e.target.value
                                    }
                                  }))}
                                  placeholder="your-client-secret"
                                  className="mt-1"
                                />
                              </div>
                              <div>
                                <Label htmlFor={`providerTokenType-${client.id}`} className="text-xs">Token Type</Label>
                                <Select
                                  value={newProvider[client.id]?.tokenType || 'thirdParty'}
                                  onValueChange={(value) => setNewProvider(prev => ({
                                    ...prev,
                                    [client.id]: {
                                      ...(prev[client.id] || { type: 'google', clientId: '', clientSecret: '', domain: '', tokenType: 'thirdParty' }),
                                      tokenType: value as 'apiblaze' | 'thirdParty'
                                    }
                                  }))}
                                >
                                  <SelectTrigger className="mt-1">
                                    <SelectValue>
                                      {newProvider[client.id]?.tokenType === 'apiblaze' 
                                        ? 'APIBlaze' 
                                        : `${(newProvider[client.id]?.type || 'google').charAt(0).toUpperCase() + (newProvider[client.id]?.type || 'google').slice(1)} token`}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="apiblaze">APIBlaze</SelectItem>
                                    <SelectItem value="thirdParty">
                                      {(newProvider[client.id]?.type || 'google').charAt(0).toUpperCase() + (newProvider[client.id]?.type || 'google').slice(1)} token
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => handleAddProvider(client.id)}
                                  disabled={!newProvider[client.id]?.clientId || !newProvider[client.id]?.clientSecret}
                                >
                                  Add Provider
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setShowAddProvider(prev => ({ ...prev, [client.id]: false }));
                                    setNewProvider(prev => {
                                      const next = { ...prev };
                                      delete next[client.id];
                                      return next;
                                    });
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Right Column - Important Messages & Setup Guide */}
                          <div className="space-y-4">
                            {/* Important Callback URL */}
                            <Card className="border-orange-200 bg-orange-50/50">
                              <CardHeader className="pb-3">
                                <div className="flex items-start gap-2">
                                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                                  <div>
                                    <CardTitle className="text-sm">Important</CardTitle>
                                    <CardDescription className="text-xs mt-1">
                                      Don&apos;t forget to add this authorized callback URL to your OAuth provider:
                                    </CardDescription>
                                  </div>
                                </div>
                              </CardHeader>
                              <CardContent>
                                <code className="text-xs bg-white px-2 py-1 rounded border block">
                                  https://callback.apiblaze.com
                                </code>
                              </CardContent>
                            </Card>

                            {/* Setup Guide */}
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-sm">
                                  {(newProvider[client.id]?.type || 'google').charAt(0).toUpperCase() + (newProvider[client.id]?.type || 'google').slice(1)} Setup Guide
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <ol className="text-xs space-y-2 list-decimal list-inside text-muted-foreground">
                                  {PROVIDER_SETUP_GUIDES[newProvider[client.id]?.type || 'google'].map((step, index) => (
                                    <li key={index}>{step}</li>
                                  ))}
                                </ol>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      )}

                      {isLoadingProviders ? (
                        <div className="text-xs text-muted-foreground py-2">Loading providers...</div>
                      ) : clientProviders.length === 0 ? (
                        <div className="text-xs text-muted-foreground italic py-2">No providers configured. The default APIBlaze Github login will be used.</div>
                      ) : (
                        <div className="space-y-2">
                          {clientProviders.map((provider) => (
                            <div
                              key={provider.id}
                              className="flex items-center justify-between p-2.5 bg-gray-50/50 border border-gray-200 rounded-md hover:bg-gray-100/50 transition-colors"
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs font-medium capitalize">
                                    {provider.type}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                                  <div className="truncate">
                                    <span className="font-medium">Domain:</span> {provider.domain}
                                  </div>
                                  <div className="truncate">
                                    <span className="font-medium">Client ID:</span> {provider.client_id || provider.clientId}
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteProvider(client.id, provider.id)}
                                className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export function AuthenticationSection({ config, updateConfig, isEditMode = false, project, onProjectUpdate, preloadedUserPools, preloadedAppClients, preloadedProviders }: AuthenticationSectionProps) {
  const [newScope, setNewScope] = useState('');
  const [userPoolModalOpen, setUserPoolModalOpen] = useState(false);
  const [selectedAppClient, setSelectedAppClient] = useState<AppClient & { userPoolId: string } | null>(null);
  const [existingUserPools, setExistingUserPools] = useState<UserPool[]>(preloadedUserPools || []);
  const [loadingUserPools, setLoadingUserPools] = useState(false);
  const [appClientDetails, setAppClientDetails] = useState<AppClientResponse | null>(null);
  const [loadingAppClient, setLoadingAppClient] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [thirdPartyProvider, setThirdPartyProvider] = useState<SocialProviderResponse | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(false);
  const [userPoolSelectModalOpen, setUserPoolSelectModalOpen] = useState(false);

  // Load existing UserPools when social auth is enabled
  useEffect(() => {
    if (config.enableSocialAuth) {
      // Only show loading if pools haven't been loaded yet
      loadUserPools(existingUserPools.length === 0);
    }
  }, [config.enableSocialAuth]);

  // Initialize with preloaded user pools if provided
  useEffect(() => {
    if (preloadedUserPools && preloadedUserPools.length > 0) {
      setExistingUserPools(preloadedUserPools);
    }
  }, [preloadedUserPools]);

  // Preload user pools in the background when component mounts (if not already preloaded)
  // This ensures the dropdown feels instant when opened
  useEffect(() => {
    // Only load if we don't have preloaded data
    if (!preloadedUserPools || preloadedUserPools.length === 0) {
      // Start loading user pools immediately in the background
      // Don't wait for enableSocialAuth to be true
      // Pass false to avoid showing loading state on mount
      loadUserPools(false);
    }
  }, [preloadedUserPools]);

  // In edit mode, populate userGroupName from project's user pool
  useEffect(() => {
    if (isEditMode && project?.config) {
      const projectConfig = project.config as Record<string, unknown>;
      const userPoolId = projectConfig.user_pool_id as string | undefined;
      
      if (userPoolId) {
        // Try to find the user pool name from preloaded user pools first
        const allPools = preloadedUserPools && preloadedUserPools.length > 0 
          ? preloadedUserPools 
          : existingUserPools;
        
        const userPool = allPools.find(pool => pool.id === userPoolId);
        if (userPool && userPool.name !== config.userGroupName) {
          // Only update if the name is different to avoid unnecessary updates
          updateConfig({ userGroupName: userPool.name });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditMode, project, preloadedUserPools, existingUserPools]);

  // Load AppClient details when UserPool is configured (either from selection or from existing config)
  useEffect(() => {
    // Load details if we have userPoolId and appClientId (either from selection or from existing config)
    if (config.userPoolId && config.appClientId) {
      loadAppClientDetails(config.userPoolId, config.appClientId);
      // Only load third-party provider from API if bringOwnProvider is not already set
      // If bringOwnProvider is true, it means third_party_provider_config was already loaded from config
      // and we don't want to override it by fetching from the API
      if ((isEditMode || config.useUserPool) && !config.bringOwnProvider) {
        loadThirdPartyProvider(config.userPoolId, config.appClientId);
      }
    } else {
      setAppClientDetails(null);
      setThirdPartyProvider(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.userPoolId, config.appClientId, isEditMode, config.useUserPool, config.bringOwnProvider]);

  const loadUserPools = async (showLoading = false) => {
    // Only show loading state if explicitly requested (e.g., first load)
    // For background refreshes, don't show loading to keep UI responsive
    if (showLoading) {
      setLoadingUserPools(true);
    }
    try {
      const pools = await api.listUserPools();
      setExistingUserPools(Array.isArray(pools) ? pools : []);
    } catch (error) {
      console.error('Error loading user pools:', error);
      // Only clear pools if this was the initial load
      if (showLoading) {
        setExistingUserPools([]);
      }
    } finally {
      if (showLoading) {
        setLoadingUserPools(false);
      }
    }
  };

  const loadAppClientDetails = async (userPoolId?: string, appClientId?: string) => {
    const poolId = userPoolId || config.userPoolId;
    const clientId = appClientId || config.appClientId;
    
    if (!poolId || !clientId) return;
    
    setLoadingAppClient(true);
    try {
      const client = await api.getAppClient(poolId, clientId);
      setAppClientDetails(client);
    } catch (error) {
      console.error('Error loading app client details:', error);
      setAppClientDetails(null);
    } finally {
      setLoadingAppClient(false);
    }
  };

  const loadThirdPartyProvider = async (userPoolId?: string, appClientId?: string) => {
    const poolId = userPoolId || config.userPoolId;
    const clientId = appClientId || config.appClientId;
    
    if (!poolId || !clientId) return;
    
    setLoadingProvider(true);
    try {
      const providers = await api.listProviders(poolId, clientId);
      // Get the first provider (usually there's one per app client)
      if (providers && providers.length > 0) {
        const provider = providers[0];
        setThirdPartyProvider(provider);
        // Update config with provider info
        // Update config with third-party provider details
        // This ensures the "Bring My Own OAuth Provider" section is shown
        updateConfig({
          bringOwnProvider: true,
          socialProvider: (provider.type || 'github') as 'github' | 'google' | 'microsoft' | 'facebook' | 'auth0' | 'other',
          identityProviderDomain: provider.domain || '',
          identityProviderClientId: provider.client_id || provider.clientId || '',
          // Note: client secret is not returned for security reasons
        });
      } else {
        setThirdPartyProvider(null);
        // No provider configured - using default APIBlaze GitHub
        updateConfig({
          bringOwnProvider: false,
        });
      }
    } catch (error) {
      console.error('Error loading third-party provider:', error);
      setThirdPartyProvider(null);
    } finally {
      setLoadingProvider(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    if (!text || text.trim() === '') {
      console.warn('No text to copy');
      return;
    }

    try {
      // Check if clipboard API is available (requires secure context)
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
        return;
      }
    } catch (clipboardError) {
      console.warn('Clipboard API failed, trying fallback:', clipboardError);
    }

    // Fallback for browsers/environments without clipboard API
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      textArea.setAttribute('aria-hidden', 'true');
      document.body.appendChild(textArea);
      
      // For iOS
      if (navigator.userAgent.match(/ipad|iphone/i)) {
        const range = document.createRange();
        range.selectNodeContents(textArea);
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          selection.addRange(range);
        }
        textArea.setSelectionRange(0, 999999);
      } else {
        textArea.focus();
        textArea.select();
        textArea.setSelectionRange(0, text.length);
      }
      
      const successful = document.execCommand('copy');
      
      // Clean up
      if (textArea.parentNode) {
        document.body.removeChild(textArea);
      }
      
      if (successful) {
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
      } else {
        throw new Error('Copy command returned false');
      }
    } catch (fallbackError) {
      console.error('Fallback copy failed:', fallbackError);
      // Still show as copied to give user feedback
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      // Optionally show an error toast/alert here if you have toast system
    }
  };

  const handleProviderChange = (provider: SocialProvider) => {
    updateConfig({
      socialProvider: provider,
      identityProviderDomain: PROVIDER_DOMAINS[provider],
    });
  };

  const addScope = () => {
    if (newScope && !config.authorizedScopes.includes(newScope)) {
      updateConfig({
        authorizedScopes: [...config.authorizedScopes, newScope],
      });
      setNewScope('');
    }
  };

  const removeScope = (scope: string) => {
    if (['email', 'openid', 'profile'].includes(scope)) return; // Don't remove mandatory scopes
    updateConfig({
      authorizedScopes: config.authorizedScopes.filter(s => s !== scope),
    });
  };

  const handleUseExistingUserPool = (appClient: AppClient & { userPoolId: string }) => {
    setSelectedAppClient(appClient);
    updateConfig({
      useUserPool: true,
      userPoolId: appClient.userPoolId,
      appClientId: appClient.id,
      // Clear bringOwnProvider when using existing UserPool
      bringOwnProvider: false,
      identityProviderClientId: '',
      identityProviderClientSecret: '',
      identityProviderDomain: '',
    });
    setUserPoolModalOpen(false); 
  };

  const handleClearUserPool = () => {
    setSelectedAppClient(null);
    updateConfig({
      useUserPool: false,
      userPoolId: undefined,
      appClientId: undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* User Pool Name */}
      <div>
        <Label htmlFor="userGroupName" className="text-base font-semibold">
          User Pool Name
        </Label>
        <p className="text-sm text-muted-foreground mb-3">
          User pools are groups of users with specific permissions that can be reused between various APIs
        </p>
        <div className="relative">
          <Input
            id="userGroupName"
            placeholder="Enter a unique name (e.g., my-api-users)"
            value={config.userGroupName}
            onChange={(e) => updateConfig({ userGroupName: e.target.value })}
            className="pr-10"
          />
          <DropdownMenu
            onOpenChange={(open) => {
              // Refresh user pools in background when dropdown opens
              // Show cached data immediately, refresh silently
              if (open) {
                // Load in background without blocking UI
                // Only show loading if we have no cached data
                loadUserPools(existingUserPools.length === 0);
              }
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                title="Select existing user pool"
                onMouseEnter={() => {
                  // Preload/refresh on hover for even faster response
                  // Always refresh in background (silently) to ensure fresh data
                  if (!loadingUserPools) {
                    loadUserPools(false);
                  }
                }}
              >
                <Search className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[200px] max-w-[400px]">
              {loadingUserPools && existingUserPools.length === 0 ? (
                <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
              ) : existingUserPools.length === 0 ? (
                <DropdownMenuItem disabled>No user pools found</DropdownMenuItem>
              ) : (
                existingUserPools.map((pool) => (
                  <DropdownMenuItem
                    key={pool.id}
                    onClick={() => {
                      updateConfig({ userGroupName: pool.name });
                    }}
                  >
                    {pool.name}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <Separator />

      {/* Authentication Methods */}
      <div className="space-y-4">
        <div>
          <Label className="text-base font-semibold">Authentication Methods</Label>
          <p className="text-sm text-muted-foreground">
            Choose how end users will authenticate to access your API
          </p>
        </div>

        {/* API Key Authentication */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="enableApiKey" className="text-sm font-medium">
              Enable API Key Authentication
            </Label>
            <p className="text-xs text-muted-foreground">
              Users will authenticate using API keys. Portal helps users create them.
            </p>
          </div>
          <Switch
            id="enableApiKey"
            checked={config.enableApiKey}
            onCheckedChange={(checked) => updateConfig({ enableApiKey: checked })}
          />
        </div>

        {/* Social Authentication */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="enableSocialAuth" className="text-sm font-medium">
              Enable Social Authentication
            </Label>
            <p className="text-xs text-muted-foreground">
              Users will authenticate using OAuth tokens (GitHub default)
            </p>
          </div>
          <Switch
            id="enableSocialAuth"
            checked={config.enableSocialAuth}
            onCheckedChange={(checked) => updateConfig({ enableSocialAuth: checked })}
          />
        </div>

        {/* OAuth Provider Configuration */}
        {config.enableSocialAuth && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            {/* Edit Mode: Show UserPool/AppClient/Provider Management UI */}
            {isEditMode ? (
              <EditModeManagementUI
                config={config}
                updateConfig={updateConfig}
                project={project}
                onProjectUpdate={onProjectUpdate}
                preloadedUserPools={preloadedUserPools}
                preloadedAppClients={preloadedAppClients}
                preloadedProviders={preloadedProviders}
              />
            ) : (
              /* Create Mode: Third-party OAuth Provider Configuration */
              <div className="space-y-4">
                {/* Bring Your Own Provider Toggle */}
                <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                  <div className="space-y-1">
                    <Label htmlFor="bringOwnProvider" className="text-sm font-medium">
                      Bring My Own OAuth Provider
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Use your own Google, Auth0, or other OAuth provider 
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave off to use default APIBlaze GitHub
                    </p>
                  </div>
                  <Switch
                    id="bringOwnProvider"
                    checked={config.bringOwnProvider}
                    onCheckedChange={(checked) => updateConfig({ bringOwnProvider: checked })}
                  />
                </div>

                {/* Provider Configuration - Two Column Layout */}
                {config.bringOwnProvider && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column - Configuration Fields */}
                    <div className="space-y-4">
                      {/* Provider Selection */}
                      <div>
                        <Label htmlFor="socialProvider" className="text-sm">OAuth Provider</Label>
                        <Select
                          value={config.socialProvider}
                          onValueChange={(value) => handleProviderChange(value as SocialProvider)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="google">Google</SelectItem>
                            <SelectItem value="microsoft">Microsoft</SelectItem>
                            <SelectItem value="github">GitHub</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="auth0">Auth0</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Provider Details */}
                      <div>
                        <Label htmlFor="identityProviderDomain" className="text-sm">
                          Identity Provider Domain
                        </Label>
                        <Input
                          id="identityProviderDomain"
                          placeholder="https://accounts.google.com"
                          value={config.identityProviderDomain}
                          onChange={(e) => updateConfig({ identityProviderDomain: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="identityProviderClientId" className="text-sm">
                          Client ID
                        </Label>
                        <Input
                          id="identityProviderClientId"
                          placeholder="your-client-id"
                          value={config.identityProviderClientId}
                          onChange={(e) => updateConfig({ identityProviderClientId: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="identityProviderClientSecret" className="text-sm">
                          Client Secret
                        </Label>
                        <Input
                          id="identityProviderClientSecret"
                          type="password"
                          placeholder="your-client-secret"
                          value={config.identityProviderClientSecret}
                          onChange={(e) => updateConfig({ identityProviderClientSecret: e.target.value })}
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="tokenType" className="text-sm">Token Type</Label>
                        <Select
                          value={config.tokenType || 'thirdParty'}
                          onValueChange={(value) => updateConfig({ tokenType: value as 'apiblaze' | 'thirdParty' })}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue>
                              {config.tokenType === 'apiblaze' 
                                ? 'APIBlaze' 
                                : `${config.socialProvider.charAt(0).toUpperCase() + config.socialProvider.slice(1)} token`}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="apiblaze">APIBlaze</SelectItem>
                            <SelectItem value="thirdParty">
                              {config.socialProvider.charAt(0).toUpperCase() + config.socialProvider.slice(1)} token
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Authorized Scopes */}
                      <div>
                        <Label className="text-sm">Authorized Scopes</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          Default mandatory scopes: email, openid, profile
                        </p>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {config.authorizedScopes.map((scope) => (
                            <Badge key={scope} variant="secondary" className="text-xs">
                              {scope}
                              {!['email', 'openid', 'profile'].includes(scope) && (
                                <X
                                  className="ml-1 h-3 w-3 cursor-pointer"
                                  onClick={() => removeScope(scope)}
                                />
                              )}
                            </Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Add custom scope"
                            value={newScope}
                            onChange={(e) => setNewScope(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addScope();
                              }
                            }}
                          />
                          <Button type="button" size="sm" onClick={addScope}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Right Column - Important Messages & Setup Guide */}
                    <div className="space-y-4">
                      {/* Important Callback URL */}
                      <Card className="border-orange-200 bg-orange-50/50">
                        <CardHeader className="pb-3">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5" />
                            <div>
                              <CardTitle className="text-sm">Important</CardTitle>
                              <CardDescription className="text-xs mt-1">
                                Don&apos;t forget to add this authorized callback URL to your OAuth provider:
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <code className="text-xs bg-white px-2 py-1 rounded border block">
                            callback.apiblaze.com
                          </code>
                        </CardContent>
                      </Card>

                      {/* Setup Guide */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            {config.socialProvider.charAt(0).toUpperCase() + config.socialProvider.slice(1)} Setup Guide
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ol className="text-xs space-y-2 list-decimal list-inside text-muted-foreground">
                            {PROVIDER_SETUP_GUIDES[config.socialProvider].map((step, index) => (
                              <li key={index}>{step}</li>
                            ))}
                          </ol>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <UserPoolModal
        open={userPoolModalOpen}
        onOpenChange={setUserPoolModalOpen}
        mode="select"
        onSelect={handleUseExistingUserPool}
      />

      {/* Simple User Pool Name Selection Modal */}
      <Dialog open={userPoolSelectModalOpen} onOpenChange={setUserPoolSelectModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select User Pool</DialogTitle>
            <DialogDescription>
              Select an existing user pool to reuse its name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingUserPools ? (
              <div className="text-sm text-muted-foreground text-center py-4">Loading user pools...</div>
            ) : existingUserPools.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-4">No user pools found</div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {existingUserPools.map((pool) => (
                  <Button
                    key={pool.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      updateConfig({ userGroupName: pool.name });
                      setUserPoolSelectModalOpen(false);
                    }}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    {pool.name}
                  </Button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserPoolSelectModalOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
