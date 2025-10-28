'use client';

import { useState } from 'react';
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
import { ProjectConfig, SourceType } from './create-project/types';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CreateProjectDialog({ open, onOpenChange, onSuccess }: CreateProjectDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  const [isDeploying, setIsDeploying] = useState(false);
  const [config, setConfig] = useState<ProjectConfig>({
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
    userGroupName: '',
    enableApiKey: true,
    enableSocialAuth: false,
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
  });

  const updateConfig = (updates: Partial<ProjectConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const handleDeploy = async () => {
    setIsDeploying(true);
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

      // Create the project
      await api.createProject({
        name: config.projectName,
        subdomain: config.projectName.toLowerCase().replace(/[^a-z0-9]/g, ''),
        target_url: config.targetUrl || config.targetServers[0]?.targetUrl,
        // TODO: Add full configuration when backend supports it
      });

      // Success!
      toast({
        title: 'Project Created! 🎉',
        description: `${config.projectName} has been successfully deployed.`,
      });
      
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to create project:', error);
      toast({
        title: 'Deployment Failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
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
          <DialogTitle className="text-2xl">Create New API Project</DialogTitle>
          <DialogDescription>
            Configure your API proxy with sensible defaults. Deploy instantly or customize settings across all sections.
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
              <GeneralSection config={config} updateConfig={updateConfig} />
            </TabsContent>

            <TabsContent value="auth" className="mt-0">
              <AuthenticationSection config={config} updateConfig={updateConfig} />
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
              <DomainsSection config={config} updateConfig={updateConfig} />
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            All sections have defaults. Deploy now or customize first.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isDeploying}>
              Cancel
            </Button>
            <Button onClick={handleDeploy} disabled={isDeploying}>
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

