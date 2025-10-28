'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { FileCode2 } from 'lucide-react';
import { ProjectConfig } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PrePostProcessingSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
}

export function PrePostProcessingSection({ config, updateConfig }: PrePostProcessingSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">Pre/Post Processing</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Add custom JavaScript processing before and after API requests
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-blue-600" />
            <CardTitle className="text-sm">Pre-processing</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Execute custom logic before the request is sent to the target server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="preProcessingPath" className="text-xs">
            GitHub Path to pre.mjs
          </Label>
          <Input
            id="preProcessingPath"
            placeholder="scripts/pre.mjs"
            value={config.preProcessingPath}
            onChange={(e) => updateConfig({ preProcessingPath: e.target.value })}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Path to your pre-processing JavaScript module in your GitHub repository
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-purple-600" />
            <CardTitle className="text-sm">Post-processing</CardTitle>
          </div>
          <CardDescription className="text-xs">
            Execute custom logic after receiving the response from the target server
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="postProcessingPath" className="text-xs">
            GitHub Path to post.mjs
          </Label>
          <Input
            id="postProcessingPath"
            placeholder="scripts/post.mjs"
            value={config.postProcessingPath}
            onChange={(e) => updateConfig({ postProcessingPath: e.target.value })}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Path to your post-processing JavaScript module in your GitHub repository
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

