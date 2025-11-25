'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Users, Key } from 'lucide-react';
import { ProjectConfig } from './types';
import { useState } from 'react';
import { UserPoolModal } from '@/components/user-pool/user-pool-modal';
import type { AppClient } from '@/types/user-pool';

interface AuthenticationSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
}

export function AuthenticationSection({ config, updateConfig }: AuthenticationSectionProps) {
  const [userPoolModalOpen, setUserPoolModalOpen] = useState(false);
  const [selectedAppClient, setSelectedAppClient] = useState<AppClient & { userPoolId: string } | null>(null);

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

        {/* UserPool Configuration */}
        {config.enableSocialAuth && (
          <div className="space-y-4 pl-4 border-l-2 border-blue-200">
            {/* Authenticate with UserPool */}
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
              <div className="space-y-1">
                <Label htmlFor="useUserPool" className="text-sm font-medium">
                  Authenticate with UserPool
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use a UserPool to manage identity providers, users, and groups for your API
                </p>
              </div>
              <Switch
                id="useUserPool"
                checked={config.useUserPool}
                onCheckedChange={(checked) => updateConfig({ useUserPool: checked })}
              />
            </div>

            {/* UserPool Selection/Configuration */}
            {config.useUserPool && (
              <div className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUserPoolModalOpen(true)}
                  className="w-full"
                >
                  <Users className="mr-2 h-4 w-4" />
                  {selectedAppClient ? 'Change UserPool/AppClient' : 'Select or Create UserPool'}
                </Button>

                {selectedAppClient && (
                  <Card className="border-green-200 bg-green-50/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Key className="h-4 w-4" />
                        Selected AppClient
                      </CardTitle>
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
                )}
              </div>
            )}
          </div>
        )}

        <UserPoolModal
          open={userPoolModalOpen}
          onOpenChange={setUserPoolModalOpen}
          mode="select"
          onSelect={(appClient) => {
            setSelectedAppClient(appClient);
            updateConfig({
              userPoolId: appClient.userPoolId,
              appClientId: appClient.id,
            });
            setUserPoolModalOpen(false);
          }}
        />
      </div>
    </div>
  );
}

