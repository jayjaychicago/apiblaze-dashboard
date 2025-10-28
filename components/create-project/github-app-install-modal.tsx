'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Github, Check, Shield, Zap, FileCode2 } from 'lucide-react';

interface GitHubAppInstallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubAppInstallModal({ open, onOpenChange }: GitHubAppInstallModalProps) {
  const handleInstall = () => {
    // Redirect to GitHub App installation with callback to dashboard
    const callbackUrl = `${window.location.origin}/dashboard?github_app_installed=true`;
    const installUrl = `https://github.com/apps/apiblaze/installations/new?state=${encodeURIComponent(callbackUrl)}`;
    
    // Redirect to GitHub (will come back to dashboard after installation)
    window.location.href = installUrl;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Github className="w-7 h-7 text-white" />
            </div>
            <div>
              <DialogTitle className="text-2xl">Install APIBlaze GitHub App</DialogTitle>
              <DialogDescription className="text-base mt-1">
                Connect your GitHub repositories to deploy APIs in seconds
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Value Propositions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader className="pb-3">
                <Zap className="h-8 w-8 text-blue-600 mb-2" />
                <CardTitle className="text-sm">One-Click Import</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Browse and import OpenAPI specs directly from your repos
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-green-200 bg-green-50/50">
              <CardHeader className="pb-3">
                <FileCode2 className="h-8 w-8 text-green-600 mb-2" />
                <CardTitle className="text-sm">Auto-Detection</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Automatically detect OpenAPI specs in your repositories
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="border-purple-200 bg-purple-50/50">
              <CardHeader className="pb-3">
                <Shield className="h-8 w-8 text-purple-600 mb-2" />
                <CardTitle className="text-sm">Secure Access</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-xs">
                  Read-only access to your repos, revoke anytime
                </CardDescription>
              </CardContent>
            </Card>
          </div>

          {/* What You're Authorizing */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4" />
                What You're Authorizing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Read-only access to your repository contents</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>Ability to read OpenAPI specification files</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <span>No write permissions - we never modify your code</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Installation Steps */}
          <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader>
              <CardTitle className="text-sm">Quick Installation</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="text-xs space-y-2 text-muted-foreground list-decimal list-inside">
                <li>Click "Install GitHub App" below</li>
                <li>Select which repositories to grant access to</li>
                <li>Authorize the installation</li>
                <li>Return here to browse your repos</li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <DialogFooter className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            You can revoke access anytime from your{' '}
            <a
              href="https://github.com/settings/installations"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              GitHub settings
            </a>
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Maybe Later
            </Button>
            <Button onClick={handleInstall}>
              <Github className="mr-2 h-4 w-4" />
              Install GitHub App
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

