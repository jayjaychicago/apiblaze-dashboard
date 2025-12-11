'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus, X, Users, Key, Copy, Check, Trash2, Search, Pencil } from 'lucide-react';
import { ProjectConfig, SocialProvider } from './types';
import { useState, useEffect } from 'react';
import { UserPoolModal } from '@/components/user-pool/user-pool-modal';
import { api } from '@/lib/api';
import type { AppClient, UserPool, SocialProvider as SocialProviderType } from '@/types/user-pool';
import type { Project } from '@/types/project';

// API response may have snake_case fields from the database
type AppClientResponse = AppClient & {
  client_id?: string;
  redirect_uris?: string[];
  signout_uris?: string[];
};

type SocialProviderResponse = SocialProviderType & {
  client_id?: string;
  client_secret?: string;
  token_type?: string;
};

interface AuthenticationSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
  isEditMode?: boolean;
  project?: Project | null;
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
  initialUserPoolId
}: { 
  config: ProjectConfig; 
  updateConfig: (updates: Partial<ProjectConfig>) => void; 
  project?: Project | null;
  initialUserPoolId?: string;
}) {
  // UserPool management - use config.userPoolId directly since selection is in main component
  const selectedUserPoolId = config.userPoolId;
  
  // AppClient management
  const [appClients, setAppClients] = useState<AppClient[]>([]);
  const [loadingAppClients, setLoadingAppClients] = useState(false);
  const [selectedAppClientId, setSelectedAppClientId] = useState<string | undefined>(config.appClientId);
  const [appClientDetails, setAppClientDetails] = useState<AppClientResponse | null>(null);
  const [loadingAppClientDetails, setLoadingAppClientDetails] = useState(false);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>({});
  const [loadingSecret, setLoadingSecret] = useState<string | null>(null);
  const [showAddAppClient, setShowAddAppClient] = useState(false);
  const [newAppClientName, setNewAppClientName] = useState('');
  
  // Provider management
  const [providers, setProviders] = useState<SocialProviderResponse[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(false);
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
  const [newProvider, setNewProvider] = useState({
    type: 'google' as SocialProvider,
    clientId: '',
    clientSecret: '',
    domain: '',
    tokenType: 'thirdParty' as 'apiblaze' | 'thirdParty',
  });
  
  // UI state
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Load AppClients when UserPool is selected
  useEffect(() => {
    if (selectedUserPoolId) {
      loadAppClients(selectedUserPoolId);
      // Clear AppClient selection when UserPool changes if current selection is invalid
      if (config.appClientId && !appClients.find(c => c.id === config.appClientId)) {
        setSelectedAppClientId(undefined);
        setAppClientDetails(null);
        setProviders([]);
      }
    } else {
      setAppClients([]);
      setSelectedAppClientId(undefined);
      setAppClientDetails(null);
      setProviders([]);
    }
  }, [selectedUserPoolId]);

  // Load AppClient details and Providers when AppClient is selected
  useEffect(() => {
    if (selectedUserPoolId && selectedAppClientId) {
      loadAppClientDetails(selectedUserPoolId, selectedAppClientId);
      loadProviders(selectedUserPoolId, selectedAppClientId);
      updateConfig({ appClientId: selectedAppClientId });
    } else {
      setAppClientDetails(null);
      setProviders([]);
      updateConfig({ appClientId: undefined });
    }
  }, [selectedUserPoolId, selectedAppClientId]);


  const loadAppClients = async (poolId: string) => {
    setLoadingAppClients(true);
    try {
      const clients = await api.listAppClients(poolId);
      const clientsArray = Array.isArray(clients) ? clients : [];
      setAppClients(clientsArray);
      
      // Auto-select the last AppClient if none is selected and clients exist
      if (clientsArray.length > 0 && !selectedAppClientId) {
        const lastClient = clientsArray[clientsArray.length - 1];
        setSelectedAppClientId(lastClient.id);
      }
    } catch (error) {
      console.error('Error loading app clients:', error);
      setAppClients([]);
    } finally {
      setLoadingAppClients(false);
    }
  };

  const loadAppClientDetails = async (poolId: string, clientId: string) => {
    setLoadingAppClientDetails(true);
    try {
      const client = await api.getAppClient(poolId, clientId);
      setAppClientDetails(client);
      // If secret is in the response, store it in revealedSecrets
      if (client.clientSecret) {
        setRevealedSecrets(prev => ({
          ...prev,
          [clientId]: client.clientSecret || ''
        }));
      }
    } catch (error) {
      console.error('Error loading app client details:', error);
      setAppClientDetails(null);
    } finally {
      setLoadingAppClientDetails(false);
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
        // Also update appClientDetails if this is the selected client
        if (selectedAppClientId === clientId) {
          setAppClientDetails({
            ...client,
            clientSecret: secret
          } as AppClientResponse);
        }
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

  const loadProviders = async (poolId: string, clientId: string) => {
    setLoadingProviders(true);
    try {
      const providerList = await api.listProviders(poolId, clientId);
      setProviders(Array.isArray(providerList) ? providerList : []);
    } catch (error) {
      console.error('Error loading providers:', error);
      setProviders([]);
    } finally {
      setLoadingProviders(false);
    }
  };

  const handleCreateAppClient = async () => {
    if (!selectedUserPoolId || !newAppClientName.trim()) return;
    
    try {
      const newClient = await api.createAppClient(selectedUserPoolId, {
        name: newAppClientName,
        scopes: ['email', 'openid', 'profile'],
      });
      
      await loadAppClients(selectedUserPoolId);
      const clientId = (newClient as { id: string }).id;
      setSelectedAppClientId(clientId);
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
      await loadAppClients(selectedUserPoolId);
      if (selectedAppClientId === clientId) {
        setSelectedAppClientId(undefined);
      }
    } catch (error) {
      console.error('Error deleting app client:', error);
      alert('Failed to delete app client');
    }
  };

  const handleAddProvider = async () => {
    if (!selectedUserPoolId || !selectedAppClientId) return;
    if (!newProvider.clientId || !newProvider.clientSecret) {
      alert('Please provide Client ID and Client Secret');
      return;
    }
    
    try {
      if (editingProviderId) {
        // Update existing provider
        await api.updateProvider(selectedUserPoolId, selectedAppClientId, editingProviderId, {
          type: newProvider.type,
          clientId: newProvider.clientId,
          clientSecret: newProvider.clientSecret,
          domain: newProvider.domain || PROVIDER_DOMAINS[newProvider.type],
          tokenType: newProvider.tokenType || 'thirdParty',
        });
      } else {
        // Create new provider
        await api.addProvider(selectedUserPoolId, selectedAppClientId, {
          type: newProvider.type,
          clientId: newProvider.clientId,
          clientSecret: newProvider.clientSecret,
          domain: newProvider.domain || PROVIDER_DOMAINS[newProvider.type],
          tokenType: newProvider.tokenType || 'thirdParty',
        });
      }
      
      await loadProviders(selectedUserPoolId, selectedAppClientId);
      setNewProvider({ type: 'google', clientId: '', clientSecret: '', domain: '', tokenType: 'thirdParty' });
      setShowAddProvider(false);
      setEditingProviderId(null);
    } catch (error) {
      console.error('Error saving provider:', error);
      alert('Failed to save provider');
    }
  };

  const handleEditProvider = (provider: SocialProviderResponse) => {
    setEditingProviderId(provider.id);
    const tokenType = provider.token_type || provider.tokenType || 'thirdParty';
    setNewProvider({
      type: provider.type as SocialProvider,
      clientId: provider.client_id || provider.clientId || '',
      clientSecret: provider.client_secret || provider.clientSecret || '',
      domain: provider.domain || '',
      tokenType: (tokenType === 'apiblaze' ? 'apiblaze' : 'thirdParty') as 'apiblaze' | 'thirdParty',
    });
    setShowAddProvider(true);
  };

  const handleCancelEdit = () => {
    setShowAddProvider(false);
    setEditingProviderId(null);
    setNewProvider({ type: 'google', clientId: '', clientSecret: '', domain: '', tokenType: 'thirdParty' });
  };

  const handleDeleteProvider = async (providerId: string) => {
    if (!selectedUserPoolId || !selectedAppClientId) return;
    if (!confirm('Are you sure you want to delete this provider?')) return;
    
    try {
      await api.removeProvider(selectedUserPoolId, selectedAppClientId, providerId);
      await loadProviders(selectedUserPoolId, selectedAppClientId);
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
          Manage AppClients and Providers for this project
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
            <div className="space-y-2">
              {appClients.map((client) => {
                const clientDetails = selectedAppClientId === client.id ? appClientDetails : null;
                return (
                  <Card
                    key={client.id}
                    className={`cursor-pointer transition-colors ${
                      selectedAppClientId === client.id
                        ? 'border-blue-500 bg-blue-50/50'
                        : 'border-gray-200'
                    }`}
                    onClick={() => setSelectedAppClientId(client.id)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{client.name}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {selectedAppClientId === client.id && (
                              <Badge variant="default" className="text-xs">
                                Selected
                              </Badge>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAppClient(client.id);
                              }}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        {clientDetails && (
                          <div className="space-y-2 pt-2">
                            <div className="space-y-1.5">
                              <div>
                                <Label className="text-xs text-muted-foreground">Client ID</Label>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <code className="flex-1 text-xs bg-white px-2 py-1 rounded border font-mono break-all">
                                    {clientDetails.client_id || clientDetails.clientId || '••••••••'}
                                  </code>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      await copyToClipboard(clientDetails.client_id || clientDetails.clientId || '', 'clientId');
                                    }}
                                    className="h-6 w-6 p-0"
                                  >
                                    {copiedField === 'clientId' ? (
                                      <Check className="h-3 w-3 text-green-600" />
                                    ) : (
                                      <Copy className="h-3 w-3" />
                                    )}
                                  </Button>
                                </div>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Client Secret</Label>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <code className="flex-1 text-xs bg-white px-2 py-1 rounded border font-mono">
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
                                          await copyToClipboard(secret, 'clientSecret');
                                        }
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      {copiedField === 'clientSecret' ? (
                                        <Check className="h-3 w-3 text-green-600" />
                                      ) : (
                                        <Copy className="h-3 w-3" />
                                      )}
                                    </Button>
                                  ) : (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (selectedUserPoolId) {
                                          revealClientSecret(selectedUserPoolId, client.id);
                                        }
                                      }}
                                      className="h-6 px-2 text-xs"
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
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* AppClient Details and Providers */}
      {selectedUserPoolId && selectedAppClientId && (
        <div className="space-y-4">
          {/* Providers Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Third-Party OAuth Providers</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddProvider(!showAddProvider)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Provider
              </Button>
            </div>

            {showAddProvider && (
              <Card className="border-green-200 bg-green-50/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Add OAuth Provider</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="providerType" className="text-xs">Provider Type</Label>
                    <Select
                      value={newProvider.type}
                      onValueChange={(value) => setNewProvider({
                        ...newProvider,
                        type: value as SocialProvider,
                        domain: PROVIDER_DOMAINS[value as SocialProvider],
                      })}
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
                    <Label htmlFor="providerDomain" className="text-xs">Domain</Label>
                    <Input
                      id="providerDomain"
                      value={newProvider.domain}
                      onChange={(e) => setNewProvider({ ...newProvider, domain: e.target.value })}
                      placeholder="https://accounts.google.com"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="providerClientId" className="text-xs">Client ID</Label>
                    <Input
                      id="providerClientId"
                      value={newProvider.clientId}
                      onChange={(e) => setNewProvider({ ...newProvider, clientId: e.target.value })}
                      placeholder="your-client-id"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="providerClientSecret" className="text-xs">Client Secret</Label>
                    <Input
                      id="providerClientSecret"
                      type="password"
                      value={newProvider.clientSecret}
                      onChange={(e) => setNewProvider({ ...newProvider, clientSecret: e.target.value })}
                      placeholder="your-client-secret"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="providerTokenType" className="text-xs">Token Type</Label>
                    <Select
                      value={newProvider.tokenType}
                      onValueChange={(value) => setNewProvider({ ...newProvider, tokenType: value as 'apiblaze' | 'thirdParty' })}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="apiblaze">APIblaze tokens</SelectItem>
                        <SelectItem value="thirdParty">{newProvider.type.charAt(0).toUpperCase() + newProvider.type.slice(1)} tokens</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddProvider}
                      disabled={!newProvider.clientId || !newProvider.clientSecret}
                    >
                      {editingProviderId ? 'Update Provider' : 'Add Provider'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {loadingProviders ? (
              <div className="text-sm text-muted-foreground">Loading providers...</div>
            ) : providers.length === 0 ? (
              <div className="text-sm text-muted-foreground">No providers configured. Add one to enable third-party OAuth.</div>
            ) : (
              <div className="space-y-2">
                {providers.map((provider) => (
                  editingProviderId === provider.id ? null : (
                  <Card key={provider.id} className="border-gray-200">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm capitalize">{provider.type}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Domain: {provider.domain}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Client ID: {provider.client_id || provider.clientId}
                          </div>
                          {(provider.token_type || provider.tokenType) && (
                            <div className="text-xs text-muted-foreground">
                              Token Type: {(provider.token_type || provider.tokenType) === 'apiblaze' ? 'APIblaze' : 'Third Party'}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditProvider(provider);
                            }}
                            className="h-8 w-8 p-0"
                            title="Edit provider"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProvider(provider.id);
                            }}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="Delete provider"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  )
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function AuthenticationSection({ config, updateConfig, isEditMode = false, project }: AuthenticationSectionProps) {
  const [newScope, setNewScope] = useState('');
  const [userPoolModalOpen, setUserPoolModalOpen] = useState(false);
  const [selectedAppClient, setSelectedAppClient] = useState<AppClient & { userPoolId: string } | null>(null);
  const [existingUserPools, setExistingUserPools] = useState<UserPool[]>([]);
  const [loadingUserPools, setLoadingUserPools] = useState(false);
  const [selectedUserPoolForCreate, setSelectedUserPoolForCreate] = useState<string | undefined>(config.userPoolId);
  const [userPoolName, setUserPoolName] = useState<string>('');
  const [appClientDetails, setAppClientDetails] = useState<AppClientResponse | null>(null);
  const [loadingAppClient, setLoadingAppClient] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [thirdPartyProvider, setThirdPartyProvider] = useState<SocialProviderResponse | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(false);
  
  // Multiple providers for create mode
  const [newProvider, setNewProvider] = useState<{
    type: SocialProvider;
    domain: string;
    clientId: string;
    clientSecret: string;
  } | null>(null);

  // Load existing UserPools on mount and when social auth is enabled
  useEffect(() => {
    loadUserPools();
  }, []);

  useEffect(() => {
    if (config.enableSocialAuth) {
      loadUserPools();
    }
  }, [config.enableSocialAuth]);

  // Sync userPoolName when selectedUserPoolForCreate changes
  useEffect(() => {
    if (selectedUserPoolForCreate) {
      const pool = existingUserPools.find(p => p.id === selectedUserPoolForCreate);
      if (pool) {
        setUserPoolName(pool.name);
      }
    } else if (config.userPoolId) {
      const pool = existingUserPools.find(p => p.id === config.userPoolId);
      if (pool) {
        setUserPoolName(pool.name);
        setSelectedUserPoolForCreate(pool.id);
      }
    }
  }, [selectedUserPoolForCreate, existingUserPools, config.userPoolId]);

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

  const loadUserPools = async () => {
    setLoadingUserPools(true);
    try {
      const pools = await api.listUserPools();
      setExistingUserPools(Array.isArray(pools) ? pools : []);
      
      // If no pools exist and no name is set, suggest a default name
      if (pools.length === 0 && !userPoolName && !selectedUserPoolForCreate && !config.userPoolId) {
        setUserPoolName('my-user-pool');
      }
      
      // Auto-select first pool if none selected and pools exist
      if (pools.length > 0 && !selectedUserPoolForCreate && !config.userPoolId) {
        const firstPool = pools[0];
        setSelectedUserPoolForCreate(firstPool.id);
        setUserPoolName(firstPool.name);
        updateConfig({ userPoolId: firstPool.id, useUserPool: true });
      }
    } catch (error) {
      console.error('Error loading user pools:', error);
      setExistingUserPools([]);
    } finally {
      setLoadingUserPools(false);
    }
  };

  const handleCreateUserPool = async () => {
    if (!userPoolName.trim()) {
      alert('Please enter a user pool name');
      return;
    }
    
    // Check if a pool with this name already exists
    const existingPool = existingUserPools.find(p => p.name.toLowerCase() === userPoolName.trim().toLowerCase());
    if (existingPool) {
      setSelectedUserPoolForCreate(existingPool.id);
      setUserPoolName(existingPool.name);
      updateConfig({ userPoolId: existingPool.id, useUserPool: true });
      return;
    }
    
    try {
      const newPool = await api.createUserPool({ name: userPoolName.trim() });
      const poolId = (newPool as { id: string }).id;
      setSelectedUserPoolForCreate(poolId);
      updateConfig({ userPoolId: poolId, useUserPool: true });
      await loadUserPools();
    } catch (error) {
      console.error('Error creating user pool:', error);
      alert('Failed to create user pool');
    }
  };

  const handleSelectUserPool = (poolId: string) => {
    const pool = existingUserPools.find(p => p.id === poolId);
    if (pool) {
      setSelectedUserPoolForCreate(poolId);
      setUserPoolName(pool.name);
      updateConfig({ userPoolId: poolId, useUserPool: true });
    }
  };

  const handleUserPoolNameChange = (value: string) => {
    setUserPoolName(value);
    // Clear selection if user is typing a new name
    if (selectedUserPoolForCreate) {
      const selectedPool = existingUserPools.find(p => p.id === selectedUserPoolForCreate);
      if (selectedPool && selectedPool.name !== value) {
        setSelectedUserPoolForCreate(undefined);
        updateConfig({ userPoolId: undefined, useUserPool: false });
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
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
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

  const handleSelectUserPoolForCreate = (userPoolId: string) => {
    setSelectedUserPoolForCreate(userPoolId);
    updateConfig({
      useUserPool: true,
      userPoolId: userPoolId,
      bringOwnProvider: false,
      identityProviderClientId: '',
      identityProviderClientSecret: '',
      identityProviderDomain: '',
    });
  };

  const handleClearUserPool = () => {
    setSelectedAppClient(null);
    setSelectedUserPoolForCreate(undefined);
    updateConfig({
      useUserPool: false,
      userPoolId: undefined,
      appClientId: undefined,
    });
  };

  return (
    <div className="space-y-6">
      {/* UserPool Selection */}
      <div>
        <Label htmlFor="userPoolName" className="text-base font-semibold">
          UserPool
        </Label>
        <p className="text-sm text-muted-foreground mb-3">
          Name of the pool of users that will use this API. Can be reused across multiple APIs for shared user pools.
        </p>
        <div className="flex items-center gap-2">
          <Input
            id="userPoolName"
            value={userPoolName}
            onChange={(e) => handleUserPoolNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleCreateUserPool();
              }
            }}
            placeholder="Enter user pool name or browse existing"
            disabled={loadingUserPools}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={loadingUserPools}
                className="h-10 w-10"
              >
                <Search className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-h-64 overflow-y-auto">
              {loadingUserPools ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">Loading...</div>
              ) : existingUserPools.length === 0 ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">No user pools found</div>
              ) : (
                existingUserPools.map((pool) => (
                  <DropdownMenuItem
                    key={pool.id}
                    onClick={() => handleSelectUserPool(pool.id)}
                    className="cursor-pointer"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{pool.name}</span>
                      <span className="text-xs text-muted-foreground">{pool.id}</span>
                    </div>
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {selectedUserPoolForCreate 
            ? 'User pool selected. Type a new name to create a different pool or browse existing pools.'
            : 'Enter a name to create a new user pool, or click the search icon to browse existing pools.'}
        </p>
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
              />
            ) : (
              <>
                {/* Create Mode: Show AppClient selection when UserPool is selected from top field */}
                {config.userPoolId && (
                  <EditModeManagementUI
                    config={config}
                    updateConfig={updateConfig}
                    project={null}
                    initialUserPoolId={config.userPoolId}
                  />
                )}

                {/* OAuth Provider Configuration - only show if no UserPool is selected */}
                {!config.userPoolId && (
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold">OAuth Provider Configuration</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                      Configure a new UserPool (a pool of users you&apos;ll be able to reuse between various APIs)
                    </p>

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

                            {/* Token Type */}
                            <div>
                              <Label htmlFor="tokenType" className="text-sm">Token Type</Label>
                              <p className="text-xs text-muted-foreground mb-2">
                                Choose whether to use APIblaze tokens or {config.socialProvider.charAt(0).toUpperCase() + config.socialProvider.slice(1)} tokens
                              </p>
                              <Select
                                value={config.tokenType || 'thirdParty'}
                                onValueChange={(value) => updateConfig({ tokenType: value as 'apiblaze' | 'thirdParty' })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="apiblaze">APIblaze tokens</SelectItem>
                                  <SelectItem value="thirdParty">{config.socialProvider.charAt(0).toUpperCase() + config.socialProvider.slice(1)} tokens</SelectItem>
                                </SelectContent>
                              </Select>
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
                                  https://apiportal.myInstantAPI.com
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
                  </div>
                )}

                {/* If no UserPools exist, show simplified UI - UserPool will be created automatically */}
                {existingUserPools.length === 0 && !loadingUserPools && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-semibold">OAuth Provider Configuration</Label>
                  <p className="text-xs text-muted-foreground mb-3 italic">
                    A user pool is a pool of users you&apos;ll be able to reuse between various APIs. A new UserPool will be created automatically.
                  </p>
                </div>

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

                {/* Provider Configuration - Multiple Providers */}
                {config.bringOwnProvider && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-semibold">OAuth Providers</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setNewProvider({
                          type: 'google',
                          domain: PROVIDER_DOMAINS.google,
                          clientId: '',
                          clientSecret: '',
                        })}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Provider
                      </Button>
                    </div>

                    {/* Existing Providers List */}
                    {config.providers && config.providers.length > 0 && (
                      <div className="space-y-2">
                        {config.providers.map((provider, index) => (
                          <Card key={index} className="border-gray-200">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1 space-y-3">
                                  <div>
                                    <Label className="text-xs font-medium">Provider Type</Label>
                                    <div className="text-sm font-medium capitalize mt-1">{provider.type}</div>
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium">Domain</Label>
                                    <code className="text-xs bg-white px-2 py-1 rounded border block font-mono mt-1">
                                      {provider.domain}
                                    </code>
                                  </div>
                                  <div>
                                    <Label className="text-xs font-medium">Client ID</Label>
                                    <code className="text-xs bg-white px-2 py-1 rounded border block font-mono mt-1">
                                      {provider.clientId}
                                    </code>
                                  </div>
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    const updatedProviders = config.providers?.filter((_, i) => i !== index) || [];
                                    updateConfig({ providers: updatedProviders });
                                  }}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {/* Add New Provider Form */}
                    {newProvider && (
                      <Card className="border-green-200 bg-green-50/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm">Add OAuth Provider</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label htmlFor="newProviderType" className="text-xs">Provider Type</Label>
                            <Select
                              value={newProvider.type}
                              onValueChange={(value) => setNewProvider({
                                ...newProvider,
                                type: value as SocialProvider,
                                domain: PROVIDER_DOMAINS[value as SocialProvider],
                              })}
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
                            <Label htmlFor="newProviderDomain" className="text-xs">Domain</Label>
                            <Input
                              id="newProviderDomain"
                              value={newProvider.domain}
                              onChange={(e) => setNewProvider({ ...newProvider, domain: e.target.value })}
                              placeholder="https://accounts.google.com"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newProviderClientId" className="text-xs">Client ID</Label>
                            <Input
                              id="newProviderClientId"
                              value={newProvider.clientId}
                              onChange={(e) => setNewProvider({ ...newProvider, clientId: e.target.value })}
                              placeholder="your-client-id"
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="newProviderClientSecret" className="text-xs">Client Secret</Label>
                            <Input
                              id="newProviderClientSecret"
                              type="password"
                              value={newProvider.clientSecret}
                              onChange={(e) => setNewProvider({ ...newProvider, clientSecret: e.target.value })}
                              placeholder="your-client-secret"
                              className="mt-1"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                if (!newProvider.clientId || !newProvider.clientSecret) {
                                  alert('Please provide Client ID and Client Secret');
                                  return;
                                }
                                const updatedProviders = [...(config.providers || []), newProvider];
                                updateConfig({ providers: updatedProviders });
                                setNewProvider(null);
                              }}
                              disabled={!newProvider.clientId || !newProvider.clientSecret}
                            >
                              Add Provider
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setNewProvider(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Legacy single provider fields (for backward compatibility, but hidden if providers array exists) */}
                    {(!config.providers || config.providers.length === 0) && (
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
                            https://apiportal.myInstantAPI.com
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
              </>
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
    </div>
  );
}
