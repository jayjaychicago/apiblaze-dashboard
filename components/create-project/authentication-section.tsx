'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Plus, X, Users } from 'lucide-react';
import { ProjectConfig, SocialProvider } from './types';
import { useState, useEffect } from 'react';
import { UserPoolModal } from '@/components/user-pool/user-pool-modal';
import { api } from '@/lib/api';
import type { AppClient, UserPool } from '@/types/user-pool';

interface AuthenticationSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
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

export function AuthenticationSection({ config, updateConfig }: AuthenticationSectionProps) {
  const [newScope, setNewScope] = useState('');
  const [userPoolModalOpen, setUserPoolModalOpen] = useState(false);
  const [selectedAppClient, setSelectedAppClient] = useState<AppClient & { userPoolId: string } | null>(null);
  const [existingUserPools, setExistingUserPools] = useState<UserPool[]>([]);
  const [loadingUserPools, setLoadingUserPools] = useState(false);

  // Load existing UserPools when social auth is enabled
  useEffect(() => {
    if (config.enableSocialAuth) {
      loadUserPools();
    }
  }, [config.enableSocialAuth]);

  const loadUserPools = async () => {
    setLoadingUserPools(true);
    try {
      const pools = await api.listUserPools();
      setExistingUserPools(Array.isArray(pools) ? pools : []);
    } catch (error) {
      console.error('Error loading user pools:', error);
      setExistingUserPools([]);
    } finally {
      setLoadingUserPools(false);
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
      {/* User Group Name */}
      <div>
        <Label htmlFor="userGroupName" className="text-base font-semibold">
          User Group Name
        </Label>
        <p className="text-sm text-muted-foreground mb-3">
          Name for RBAC control. Can be reused across multiple APIs for shared user pools.
        </p>
        <Input
          id="userGroupName"
          placeholder="my-api-users"
          value={config.userGroupName}
          onChange={(e) => updateConfig({ userGroupName: e.target.value })}
        />
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
            {/* Show UserPool selection only if UserPools exist */}
            {existingUserPools.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">OAuth Provider Configuration</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose one: Use an existing UserPool or configure a new UserPool
                </p>
                <p className="text-xs text-muted-foreground mb-3 italic">
                  A user pool is a pool of users you&apos;ll be able to reuse between various APIs
                </p>

                {/* Option 1: Use Existing UserPool */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="useExistingUserPool"
                      name="oauthOption"
                      checked={config.useUserPool && !!selectedAppClient}
                      onChange={() => {
                        // Clear bringOwnProvider when switching to existing UserPool
                        updateConfig({
                          bringOwnProvider: false,
                          identityProviderClientId: '',
                          identityProviderClientSecret: '',
                          identityProviderDomain: '',
                        });
                        if (!config.useUserPool || !selectedAppClient) {
                          setUserPoolModalOpen(true);
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="useExistingUserPool" className="text-sm font-medium cursor-pointer">
                      Use Existing UserPool
                    </Label>
                  </div>
                  {config.useUserPool && selectedAppClient ? (
                    <Card className="border-green-200 bg-green-50/50 ml-6">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Selected UserPool
                          </CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              handleClearUserPool();
                              setUserPoolModalOpen(true);
                            }}
                          >
                            Change
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <div>
                          <Label className="text-xs">Client ID</Label>
                          <code className="text-xs bg-white px-2 py-1 rounded border block font-mono">
                            {selectedAppClient.clientId}
                          </code>
                        </div>
                        {selectedAppClient.scopes && selectedAppClient.scopes.length > 0 && (
                          <div>
                            <Label className="text-xs">Scopes</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedAppClient.scopes.map((scope) => (
                                <Badge key={scope} variant="secondary" className="text-xs">
                                  {scope}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="ml-6">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setUserPoolModalOpen(true);
                        }}
                      >
                        <Users className="mr-2 h-4 w-4" />
                        Select UserPool
                      </Button>
                    </div>
                  )}
                </div>

                {/* Option 2: Configure New UserPool */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      id="configureNewUserPool"
                      name="oauthOption"
                      checked={!config.useUserPool}
                      onChange={() => {
                        // Clear UserPool selection when switching to configure new UserPool
                        handleClearUserPool();
                      }}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="configureNewUserPool" className="text-sm font-medium cursor-pointer">
                      Configure New UserPool
                    </Label>
                  </div>
                  {!config.useUserPool && (
                    <div className="ml-6 space-y-4">
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
