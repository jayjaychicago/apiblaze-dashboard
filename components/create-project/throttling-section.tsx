'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProjectConfig, QuotaInterval } from './types';

interface ThrottlingSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
}

export function ThrottlingSection({ config, updateConfig }: ThrottlingSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">Throttling & Quotas</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Configure rate limiting and usage quotas for your API
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Throttling */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Rate Limiting</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Control the rate of incoming requests
            </p>
          </div>

          <div>
            <Label htmlFor="throttlingRate" className="text-sm">
              Throttling Rate (requests per second)
            </Label>
            <Input
              id="throttlingRate"
              type="number"
              min="1"
              value={config.throttlingRate}
              onChange={(e) => updateConfig({ throttlingRate: parseInt(e.target.value) || 10 })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum number of requests allowed per second
            </p>
          </div>

          <div>
            <Label htmlFor="throttlingBurst" className="text-sm">
              Throttling Burst
            </Label>
            <Input
              id="throttlingBurst"
              type="number"
              min="1"
              value={config.throttlingBurst}
              onChange={(e) => updateConfig({ throttlingBurst: parseInt(e.target.value) || 20 })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum burst of requests allowed before throttling kicks in
            </p>
          </div>
        </div>

        {/* Right Column - Quotas */}
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-semibold">Usage Quotas</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Set limits on total API usage over time
            </p>
          </div>

          <div>
            <Label htmlFor="quota" className="text-sm">
              Quota Limit
            </Label>
            <Input
              id="quota"
              type="number"
              min="1"
              value={config.quota}
              onChange={(e) => updateConfig({ quota: parseInt(e.target.value) || 1000 })}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Maximum number of requests allowed
            </p>
          </div>

          <div>
            <Label htmlFor="quotaInterval" className="text-sm">
              Quota Period
            </Label>
            <Select
              value={config.quotaInterval}
              onValueChange={(value) => updateConfig({ quotaInterval: value as QuotaInterval })}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Per Day</SelectItem>
                <SelectItem value="week">Per Week</SelectItem>
                <SelectItem value="month">Per Month</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Time period for quota calculation
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

