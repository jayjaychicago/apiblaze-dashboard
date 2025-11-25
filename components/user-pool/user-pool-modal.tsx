'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  X, 
  Copy, 
  Check,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import type { UserPool, AppClient, SocialProvider, CreateProviderRequest } from '@/types/user-pool';

interface UserPoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect?: (appClient: AppClient & { userPoolId: string }) => void;
  mode?: 'select' | 'manage'; // 'select' for project creation, 'manage' for standalone management
}

const PROVIDER_TYPES: Array<{ value: SocialProvider['type']; label: string }> = [
  { value: 'google', label: 'Google' },
  { value: 'github', label: 'GitHub' },
  { value: 'microsoft', label: 'Microsoft' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'auth0', label: 'Auth0' },
  { value: 'other', label: 'Other' },
];

const PROVIDER_DOMAINS: Record<SocialProvider['type'], string> = {
  google: 'https://accounts.google.com',
  microsoft: 'https://login.microsoftonline.com',
  github: 'https://github.com',
  facebook: 'https://www.facebook.com',
  auth0: 'https://YOUR_DOMAIN.auth0.com',
  other: '',
};

export function UserPoolModal({ 
  open, 
  onOpenChange, 
  onSelect,
  mode = 'select'
}: UserPoolModalProps) {
  const { toast } = useToast();
  
  // Data state
  const [userPools, setUserPools] = useState<UserPool[]>([]);
  const [appClients, setAppClients] = useState<AppClient[]>([]);
  const [providers, setProviders] = useState<SocialProvider[]>([]);
  
  // Selection state
  const [selectedUserPoolId, setSelectedUserPoolId] = useState<string>('');
  const [selectedAppClientId, setSelectedAppClientId] = useState<string>('');
  const [newUserPoolName, setNewUserPoolName] = useState('');
  const [newAppClientName, setNewAppClientName] = useState('');
  
  // Creation state
  const [isCreatingUserPool, setIsCreatingUserPool] = useState(false);
  const [isCreatingAppClient, setIsCreatingAppClient] = useState(false);
  const [newAppClientSecret, setNewAppClientSecret] = useState<string | null>(null);
  const [newAppClientId, setNewAppClientId] = useState<string | null>(null);
  
  // Provider state
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [newProvider, setNewProvider] = useState<CreateProviderRequest>({
    type: 'google',
    clientId: '',
    clientSecret: '',
    domain: '',
  });
  const [isAddingProvider, setIsAddingProvider] = useState(false);
  
  // Redirect URIs and Scopes
  const [newRedirectUri, setNewRedirectUri] = useState('');
  const [newSignoutUri, setNewSignoutUri] = useState('');
  const [newScope, setNewScope] = useState('');
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false);
  const [currentAppClient, setCurrentAppClient] = useState<AppClient | null>(null);

  // Load user pools on mount
  useEffect(() => {
    if (open) {
      loadUserPools();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Load app clients when user pool is selected
  useEffect(() => {
    if (selectedUserPoolId) {
      loadAppClients(selectedUserPoolId);
    } else {
      setAppClients([]);
      setSelectedAppClientId('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserPoolId]);

  // Load providers and app client details when app client is selected
  useEffect(() => {
    if (selectedUserPoolId && selectedAppClientId) {
      loadProviders(selectedUserPoolId, selectedAppClientId);
      loadAppClientDetails(selectedUserPoolId, selectedAppClientId);
    } else {
      setProviders([]);
      setCurrentAppClient(null);
    }
  }, [selectedUserPoolId, selectedAppClientId]);

  const loadUserPools = async () => {
    setIsLoading(true);
    try {
      const data = await api.listUserPools();
      setUserPools(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading user pools:', error);
      toast({
        title: 'Error',
        description: 'Failed to load user pools',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppClients = async (poolId: string) => {
    try {
      const data = await api.listAppClients(poolId);
      setAppClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading app clients:', error);
      toast({
        title: 'Error',
        description: 'Failed to load app clients',
        variant: 'destructive',
      });
    }
  };

  const loadAppClientDetails = async (poolId: string, clientId: string) => {
    try {
      const data = await api.getAppClient(poolId, clientId);
      setCurrentAppClient(data as AppClient);
    } catch (error) {
      console.error('Error loading app client details:', error);
    }
  };

  const loadProviders = async (poolId: string, clientId: string) => {
    try {
      const data = await api.listProviders(poolId, clientId);
      setProviders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading providers:', error);
    }
  };

  const handleCreateUserPool = async () => {
    if (!newUserPoolName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'UserPool name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingUserPool(true);
    try {
      const data = await api.createUserPool({ name: newUserPoolName.trim() });
      await loadUserPools();
      setSelectedUserPoolId((data as UserPool).id);
      setNewUserPoolName('');
      toast({
        title: 'Success',
        description: 'UserPool created successfully',
      });
    } catch (error) {
      console.error('Error creating user pool:', error);
      toast({
        title: 'Error',
        description: 'Failed to create user pool',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingUserPool(false);
    }
  };

  const handleCreateAppClient = async () => {
    if (!selectedUserPoolId) {
      toast({
        title: 'Validation Error',
        description: 'Please select or create a UserPool first',
        variant: 'destructive',
      });
      return;
    }

    if (!newAppClientName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'AppClient name is required',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingAppClient(true);
    try {
      const data = await api.createAppClient(selectedUserPoolId, {
        name: newAppClientName.trim(),
        scopes: ['email', 'openid', 'profile'],
      });
      const appClient = data as AppClient;
      setNewAppClientId(appClient.clientId);
      setNewAppClientSecret(appClient.clientSecret || null);
      setNewAppClientName('');
      await loadAppClients(selectedUserPoolId);
      setSelectedAppClientId(appClient.id);
      toast({
        title: 'Success',
        description: 'AppClient created successfully. Copy the credentials now - they won\'t be shown again!',
      });
    } catch (error) {
      console.error('Error creating app client:', error);
      toast({
        title: 'Error',
        description: 'Failed to create app client',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingAppClient(false);
    }
  };

  const handleAddProvider = async () => {
    if (!selectedUserPoolId || !selectedAppClientId) {
      toast({
        title: 'Validation Error',
        description: 'Please select a UserPool and AppClient first',
        variant: 'destructive',
      });
      return;
    }

    if (!newProvider.clientId || !newProvider.clientSecret) {
      toast({
        title: 'Validation Error',
        description: 'Provider clientId and clientSecret are required',
        variant: 'destructive',
      });
      return;
    }

    setIsAddingProvider(true);
    try {
      await api.addProvider(selectedUserPoolId, selectedAppClientId, {
        type: newProvider.type,
        clientId: newProvider.clientId,
        clientSecret: newProvider.clientSecret,
        domain: newProvider.domain || PROVIDER_DOMAINS[newProvider.type],
      });
      await loadProviders(selectedUserPoolId, selectedAppClientId);
      setNewProvider({
        type: 'google',
        clientId: '',
        clientSecret: '',
        domain: '',
      });
      setShowAddProvider(false);
      toast({
        title: 'Success',
        description: 'Provider added successfully',
      });
    } catch (error) {
      console.error('Error adding provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to add provider',
        variant: 'destructive',
      });
    } finally {
      setIsAddingProvider(false);
    }
  };

  const handleAddRedirectUri = async () => {
    if (!selectedUserPoolId || !selectedAppClientId || !currentAppClient) return;
    if (!newRedirectUri.trim()) return;

    const updatedUris = [...(currentAppClient.redirectUris || []), newRedirectUri.trim()];
    try {
      await api.updateAppClient(selectedUserPoolId, selectedAppClientId, {
        redirectUris: updatedUris,
      });
      await loadAppClientDetails(selectedUserPoolId, selectedAppClientId);
      setNewRedirectUri('');
      toast({
        title: 'Success',
        description: 'Redirect URI added',
      });
    } catch (error) {
      console.error('Error adding redirect URI:', error);
      toast({
        title: 'Error',
        description: 'Failed to add redirect URI',
        variant: 'destructive',
      });
    }
  };

  const handleAddSignoutUri = async () => {
    if (!selectedUserPoolId || !selectedAppClientId || !currentAppClient) return;
    if (!newSignoutUri.trim()) return;

    const updatedUris = [...(currentAppClient.signoutUris || []), newSignoutUri.trim()];
    try {
      await api.updateAppClient(selectedUserPoolId, selectedAppClientId, {
        signoutUris: updatedUris,
      });
      await loadAppClientDetails(selectedUserPoolId, selectedAppClientId);
      setNewSignoutUri('');
      toast({
        title: 'Success',
        description: 'Signout URI added',
      });
    } catch (error) {
      console.error('Error adding signout URI:', error);
      toast({
        title: 'Error',
        description: 'Failed to add signout URI',
        variant: 'destructive',
      });
    }
  };

  const handleAddScope = async () => {
    if (!selectedUserPoolId || !selectedAppClientId || !currentAppClient) return;
    if (!newScope.trim()) return;
    if (currentAppClient.scopes?.includes(newScope.trim())) return;

    const updatedScopes = [...(currentAppClient.scopes || []), newScope.trim()];
    try {
      await api.updateAppClient(selectedUserPoolId, selectedAppClientId, {
        scopes: updatedScopes,
      });
      await loadAppClientDetails(selectedUserPoolId, selectedAppClientId);
      setNewScope('');
      toast({
        title: 'Success',
        description: 'Scope added',
      });
    } catch (error) {
      console.error('Error adding scope:', error);
      toast({
        title: 'Error',
        description: 'Failed to add scope',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveRedirectUri = async (uri: string) => {
    if (!selectedUserPoolId || !selectedAppClientId || !currentAppClient) return;

    const updatedUris = currentAppClient.redirectUris?.filter(u => u !== uri) || [];
    try {
      await api.updateAppClient(selectedUserPoolId, selectedAppClientId, {
        redirectUris: updatedUris,
      });
      await loadAppClientDetails(selectedUserPoolId, selectedAppClientId);
    } catch (error) {
      console.error('Error removing redirect URI:', error);
    }
  };

  const handleRemoveSignoutUri = async (uri: string) => {
    if (!selectedUserPoolId || !selectedAppClientId || !currentAppClient) return;

    const updatedUris = currentAppClient.signoutUris?.filter(u => u !== uri) || [];
    try {
      await api.updateAppClient(selectedUserPoolId, selectedAppClientId, {
        signoutUris: updatedUris,
      });
      await loadAppClientDetails(selectedUserPoolId, selectedAppClientId);
    } catch (error) {
      console.error('Error removing signout URI:', error);
    }
  };

  const handleRemoveScope = async (scope: string) => {
    if (!selectedUserPoolId || !selectedAppClientId || !currentAppClient) return;
    if (['email', 'openid', 'profile'].includes(scope)) return; // Don't remove mandatory scopes

    const updatedScopes = currentAppClient.scopes?.filter(s => s !== scope) || [];
    try {
      await api.updateAppClient(selectedUserPoolId, selectedAppClientId, {
        scopes: updatedScopes,
      });
      await loadAppClientDetails(selectedUserPoolId, selectedAppClientId);
    } catch (error) {
      console.error('Error removing scope:', error);
    }
  };

  const handleRemoveProvider = async (providerId: string) => {
    if (!selectedUserPoolId || !selectedAppClientId) return;

    try {
      await api.removeProvider(selectedUserPoolId, selectedAppClientId, providerId);
      await loadProviders(selectedUserPoolId, selectedAppClientId);
      toast({
        title: 'Success',
        description: 'Provider removed',
      });
    } catch (error) {
      console.error('Error removing provider:', error);
      toast({
        title: 'Error',
        description: 'Failed to remove provider',
        variant: 'destructive',
      });
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  const handleConfirm = () => {
    if (!selectedUserPoolId || !selectedAppClientId || !currentAppClient) {
      toast({
        title: 'Validation Error',
        description: 'Please select a UserPool and AppClient',
        variant: 'destructive',
      });
      return;
    }

    if (onSelect) {
      onSelect({
        ...currentAppClient,
        userPoolId: selectedUserPoolId,
      });
    }
    onOpenChange(false);
  };

  const handleClose = () => {
    // Reset state on close
    setSelectedUserPoolId('');
    setSelectedAppClientId('');
    setNewUserPoolName('');
    setNewAppClientName('');
    setNewAppClientSecret(null);
    setNewAppClientId(null);
    setShowAddProvider(false);
    setNewProvider({
      type: 'google',
      clientId: '',
      clientSecret: '',
      domain: '',
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'select' ? 'Select or Create UserPool' : 'Manage UserPool'}
          </DialogTitle>
          <DialogDescription>
            Configure your identity provider for API authentication
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* UserPool Selection/Creation */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">UserPool</Label>
            <div className="flex gap-2">
              <Select
                value={selectedUserPoolId}
                onValueChange={setSelectedUserPoolId}
                disabled={isLoading}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select existing UserPool" />
                </SelectTrigger>
                <SelectContent>
                  {userPools.map((pool) => (
                    <SelectItem key={pool.id} value={pool.id}>
                      {pool.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2 flex-1">
                <Input
                  placeholder="Or create new UserPool"
                  value={newUserPoolName}
                  onChange={(e) => setNewUserPoolName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateUserPool();
                    }
                  }}
                />
                <Button
                  onClick={handleCreateUserPool}
                  disabled={isCreatingUserPool || !newUserPoolName.trim()}
                >
                  {isCreatingUserPool ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* AppClient Selection/Creation */}
          {selectedUserPoolId && (
            <>
              <Separator />
              <div className="space-y-3">
                <Label className="text-base font-semibold">AppClient</Label>
                <div className="flex gap-2">
                  <Select
                    value={selectedAppClientId}
                    onValueChange={setSelectedAppClientId}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select existing AppClient" />
                    </SelectTrigger>
                    <SelectContent>
                      {appClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name} ({client.clientId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 flex-1">
                    <Input
                      placeholder="Or create new AppClient"
                      value={newAppClientName}
                      onChange={(e) => setNewAppClientName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateAppClient();
                        }
                      }}
                    />
                    <Button
                      onClick={handleCreateAppClient}
                      disabled={isCreatingAppClient || !newAppClientName.trim()}
                    >
                      {isCreatingAppClient ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Show client credentials after creation */}
                {newAppClientId && newAppClientSecret && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-green-600" />
                        New AppClient Created - Copy Credentials Now!
                      </CardTitle>
                      <CardDescription className="text-xs">
                        These credentials will not be shown again
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs">Client ID</Label>
                        <div className="flex gap-2">
                          <Input value={newAppClientId} readOnly className="font-mono text-xs" />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(newAppClientId, 'Client ID')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs">Client Secret</Label>
                        <div className="flex gap-2">
                          <Input
                            type="password"
                            value={newAppClientSecret}
                            readOnly
                            className="font-mono text-xs"
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopy(newAppClientSecret, 'Client Secret')}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {/* AppClient Configuration */}
          {selectedUserPoolId && selectedAppClientId && currentAppClient && (
            <>
              <Separator />
              
              {/* Providers */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Social/External Providers</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddProvider(!showAddProvider)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Provider
                  </Button>
                </div>

                {showAddProvider && (
                  <Card className="p-4 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Provider Type</Label>
                        <Select
                          value={newProvider.type}
                          onValueChange={(value) => {
                            setNewProvider({
                              ...newProvider,
                              type: value as SocialProvider['type'],
                              domain: PROVIDER_DOMAINS[value as SocialProvider['type']],
                            });
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDER_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Domain (optional)</Label>
                        <Input
                          value={newProvider.domain}
                          onChange={(e) =>
                            setNewProvider({ ...newProvider, domain: e.target.value })
                          }
                          placeholder={PROVIDER_DOMAINS[newProvider.type]}
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Client ID</Label>
                      <Input
                        value={newProvider.clientId}
                        onChange={(e) =>
                          setNewProvider({ ...newProvider, clientId: e.target.value })
                        }
                        placeholder="Provider Client ID"
                      />
                    </div>
                    <div>
                      <Label>Client Secret</Label>
                      <Input
                        type="password"
                        value={newProvider.clientSecret}
                        onChange={(e) =>
                          setNewProvider({ ...newProvider, clientSecret: e.target.value })
                        }
                        placeholder="Provider Client Secret"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleAddProvider}
                        disabled={isAddingProvider}
                      >
                        {isAddingProvider ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        Add
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setShowAddProvider(false);
                          setNewProvider({
                            type: 'google',
                            clientId: '',
                            clientSecret: '',
                            domain: '',
                          });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </Card>
                )}

                <div className="flex flex-wrap gap-2">
                  {providers.map((provider) => (
                    <Badge key={provider.id} variant="secondary" className="text-xs">
                      {provider.type}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveProvider(provider.id)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Redirect URIs */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Authorized Redirect URIs</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/callback"
                    value={newRedirectUri}
                    onChange={(e) => setNewRedirectUri(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddRedirectUri();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAddRedirectUri} disabled={!newRedirectUri.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentAppClient.redirectUris?.map((uri) => (
                    <Badge key={uri} variant="secondary" className="text-xs">
                      {uri}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveRedirectUri(uri)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Signout URIs */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Signout URIs</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://example.com/signout"
                    value={newSignoutUri}
                    onChange={(e) => setNewSignoutUri(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddSignoutUri();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAddSignoutUri} disabled={!newSignoutUri.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentAppClient.signoutUris?.map((uri) => (
                    <Badge key={uri} variant="secondary" className="text-xs">
                      {uri}
                      <X
                        className="ml-1 h-3 w-3 cursor-pointer"
                        onClick={() => handleRemoveSignoutUri(uri)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Scopes */}
              <div className="space-y-3">
                <Label className="text-base font-semibold">Authorized Scopes</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom scope"
                    value={newScope}
                    onChange={(e) => setNewScope(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddScope();
                      }
                    }}
                  />
                  <Button size="sm" onClick={handleAddScope} disabled={!newScope.trim()}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {currentAppClient.scopes?.map((scope) => (
                    <Badge
                      key={scope}
                      variant={['email', 'openid', 'profile'].includes(scope) ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {scope}
                      {!['email', 'openid', 'profile'].includes(scope) && (
                        <X
                          className="ml-1 h-3 w-3 cursor-pointer"
                          onClick={() => handleRemoveScope(scope)}
                        />
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {mode === 'select' ? 'Cancel' : 'Close'}
          </Button>
          {mode === 'select' && (
            <Button onClick={handleConfirm} disabled={!selectedUserPoolId || !selectedAppClientId}>
              <Check className="h-4 w-4 mr-2" />
              Use This AppClient
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

