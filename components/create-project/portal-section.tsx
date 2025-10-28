'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ProjectConfig } from './types';

interface PortalSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
}

export function PortalSection({ config, updateConfig }: PortalSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">API Developer Portal</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Configure the developer portal for your API users
        </p>
      </div>

      {/* Create Portal */}
      <div className="flex items-center justify-between p-4 border rounded-lg">
        <div className="space-y-1">
          <Label htmlFor="createPortal" className="text-sm font-medium">
            Create API Developer Portal
          </Label>
          <p className="text-xs text-muted-foreground">
            Generate an interactive portal for API documentation and testing
          </p>
        </div>
        <Switch
          id="createPortal"
          checked={config.createPortal}
          onCheckedChange={(checked) => updateConfig({ createPortal: checked })}
        />
      </div>

      {/* Portal Logo */}
      {config.createPortal && (
        <div className="space-y-4 pl-4 border-l-2 border-blue-200">
          <div>
            <Label htmlFor="portalLogoUrl" className="text-sm">
              Portal Logo URL
            </Label>
            <Input
              id="portalLogoUrl"
              placeholder="https://example.com/logo.png"
              value={config.portalLogoUrl}
              onChange={(e) => updateConfig({ portalLogoUrl: e.target.value })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              URL to your logo image that will be displayed in the developer portal
            </p>
          </div>

          {config.projectName && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                Your portal will be available at:
              </p>
              <p className="text-sm font-mono text-blue-600 mt-1">
                https://{config.projectName}.portal.apiblaze.com
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

