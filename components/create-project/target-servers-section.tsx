'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Settings } from 'lucide-react';
import { ProjectConfig, TargetServer, TargetServerConfig } from './types';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface TargetServersSectionProps {
  config: ProjectConfig;
  updateConfig: (updates: Partial<ProjectConfig>) => void;
}

export function TargetServersSection({ config, updateConfig }: TargetServersSectionProps) {
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedServerIndex, setSelectedServerIndex] = useState<number | null>(null);

  const addServer = () => {
    updateConfig({
      targetServers: [
        ...config.targetServers,
        { stage: '', targetUrl: '', config: [] },
      ],
    });
  };

  const removeServer = (index: number) => {
    updateConfig({
      targetServers: config.targetServers.filter((_, i) => i !== index),
    });
  };

  const updateServer = (index: number, updates: Partial<TargetServer>) => {
    const newServers = [...config.targetServers];
    newServers[index] = { ...newServers[index], ...updates };
    updateConfig({ targetServers: newServers });
  };

  const openConfigDialog = (index: number) => {
    setSelectedServerIndex(index);
    setConfigDialogOpen(true);
  };

  const addConfigItem = () => {
    if (selectedServerIndex === null) return;
    const server = config.targetServers[selectedServerIndex];
    updateServer(selectedServerIndex, {
      config: [...server.config, { type: 'header', name: '', value: '' }],
    });
  };

  const updateConfigItem = (configIndex: number, updates: Partial<TargetServerConfig>) => {
    if (selectedServerIndex === null) return;
    const server = config.targetServers[selectedServerIndex];
    const newConfig = [...server.config];
    newConfig[configIndex] = { ...newConfig[configIndex], ...updates };
    updateServer(selectedServerIndex, { config: newConfig });
  };

  const removeConfigItem = (configIndex: number) => {
    if (selectedServerIndex === null) return;
    const server = config.targetServers[selectedServerIndex];
    updateServer(selectedServerIndex, {
      config: server.config.filter((_, i) => i !== configIndex),
    });
  };

  const getProxyUrl = (stage: string) => {
    if (!config.projectName || !stage) return '';
    return `https://${config.projectName}.apiblaze.com/${config.apiVersion}/${stage}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">Target Servers</Label>
        <p className="text-sm text-muted-foreground mb-4">
          Configure target servers for different environments. Each proxy stage will route to its corresponding target server.
        </p>
      </div>

      <div className="space-y-3">
        {config.targetServers.map((server, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="grid grid-cols-12 gap-3 items-start">
                {/* Stage */}
                <div className="col-span-3">
                  <Label htmlFor={`stage-${index}`} className="text-xs">
                    Stage
                  </Label>
                  <Input
                    id={`stage-${index}`}
                    placeholder="prod"
                    value={server.stage}
                    onChange={(e) => updateServer(index, { stage: e.target.value })}
                    className="mt-1"
                  />
                  {server.stage && config.projectName && (
                    <p className="text-xs text-muted-foreground mt-1 break-all">
                      {getProxyUrl(server.stage)}
                    </p>
                  )}
                </div>

                {/* Target Server URL */}
                <div className="col-span-6">
                  <Label htmlFor={`targetUrl-${index}`} className="text-xs">
                    Target Server URL
                  </Label>
                  <Input
                    id={`targetUrl-${index}`}
                    placeholder="https://api.example.com/prod"
                    value={server.targetUrl}
                    onChange={(e) => updateServer(index, { targetUrl: e.target.value })}
                    className="mt-1"
                  />
                </div>

                {/* Configuration */}
                <div className="col-span-2">
                  <Label className="text-xs">Configuration</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-1"
                    onClick={() => openConfigDialog(index)}
                  >
                    <Settings className="h-4 w-4 mr-1" />
                    {server.config.length || 'Add'}
                  </Button>
                </div>

                {/* Delete */}
                <div className="col-span-1 pt-6">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeServer(index)}
                    className="h-9 w-9 p-0"
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={addServer}
          className="w-full"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Target Server
        </Button>
      </div>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Server Configuration</DialogTitle>
            <DialogDescription>
              Add headers, parameters, or body variables that will be passed to this target server.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {selectedServerIndex !== null &&
              config.targetServers[selectedServerIndex]?.config.map((item, configIndex) => (
                <Card key={configIndex}>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-12 gap-2">
                      <div className="col-span-3">
                        <Select
                          value={item.type}
                          onValueChange={(value: 'header' | 'parameter' | 'bodyVar') =>
                            updateConfigItem(configIndex, { type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="header">Header</SelectItem>
                            <SelectItem value="parameter">Parameter</SelectItem>
                            <SelectItem value="bodyVar">Body Var</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Input
                          placeholder="Name (e.g. X-API-KEY)"
                          value={item.name}
                          onChange={(e) => updateConfigItem(configIndex, { name: e.target.value })}
                        />
                      </div>
                      <div className="col-span-4">
                        <Input
                          placeholder="Value"
                          value={item.value}
                          onChange={(e) => updateConfigItem(configIndex, { value: e.target.value })}
                        />
                      </div>
                      <div className="col-span-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeConfigItem(configIndex)}
                          className="h-10 w-10 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            <Button
              type="button"
              variant="outline"
              onClick={addConfigItem}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Configuration
            </Button>
          </div>

          <DialogFooter>
            <Button onClick={() => setConfigDialogOpen(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

