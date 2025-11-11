'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth';
import { Check, X, AlertCircle, RefreshCw } from 'lucide-react';

type GitHubUser = {
  login: string;
  [key: string]: unknown;
};

type FetchError = {
  message?: string;
  [key: string]: unknown;
};

type GitHubCheckSuccess = {
  success: true;
  data: GitHubUser;
  status: number;
};

type GitHubCheckFailure = {
  success: false;
  error: FetchError | string;
  status?: number;
};

type GitHubCheckResult = GitHubCheckSuccess | GitHubCheckFailure | null;

type InstallationStatusResponse = {
  installed: boolean;
  installation_id?: string;
  [key: string]: unknown;
};

type InstallationCheckSuccess = {
  success: true;
  data: InstallationStatusResponse;
  status: number;
};

type InstallationCheckFailure = {
  success: false;
  error: FetchError | string;
  status?: number;
};

type InstallationCheckResult = InstallationCheckSuccess | InstallationCheckFailure | null;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

export default function GitHubTokenDebugPage() {
  const { accessToken, user } = useAuthStore();
  const [tokenType, setTokenType] = useState('');
  const [githubUserCheck, setGithubUserCheck] = useState<GitHubCheckResult>(null);
  const [installationCheck, setInstallationCheck] = useState<InstallationCheckResult>(null);
  const [scopes, setScopes] = useState('');

  useEffect(() => {
    if (accessToken) {
      // Determine token type
      if (accessToken.startsWith('ghp_')) setTokenType('GitHub Personal Access Token');
      else if (accessToken.startsWith('gho_')) setTokenType('GitHub OAuth Token');
      else if (accessToken.startsWith('ghs_')) setTokenType('GitHub Server Token');
      else if (accessToken.startsWith('eyJ')) setTokenType('JWT Token (Not GitHub!)');
      else setTokenType('Unknown Token Type');
    }
  }, [accessToken]);

  const testGitHubAPI = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      const scopesHeader = response.headers.get('X-OAuth-Scopes');
      setScopes(scopesHeader || 'No scopes header');

      if (response.ok) {
        const data = (await response.json()) as GitHubUser;
        setGithubUserCheck({ success: true, data, status: response.status });
      } else {
        const error = (await response.json().catch(() => ({ message: 'Unknown error' }))) as FetchError;
        setGithubUserCheck({ success: false, error, status: response.status });
      }
    } catch (error: unknown) {
      setGithubUserCheck({ success: false, error: getErrorMessage(error) });
    }
  }, [accessToken]);

  const testInstallationAPI = useCallback(async () => {
    if (!accessToken) return;

    try {
      const response = await fetch('/api/github/installation-status', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        cache: 'no-store'
      });

      if (response.ok) {
        const data = (await response.json()) as InstallationStatusResponse;
        setInstallationCheck({ success: true, data, status: response.status });
      } else {
        const error = (await response.json().catch(() => ({ message: 'Unknown error' }))) as FetchError;
        setInstallationCheck({ success: false, error, status: response.status });
      }
    } catch (error: unknown) {
      setInstallationCheck({ success: false, error: getErrorMessage(error) });
    }
  }, [accessToken]);

  useEffect(() => {
    if (accessToken) {
      void testGitHubAPI();
      void testInstallationAPI();
    }
  }, [accessToken, testGitHubAPI, testInstallationAPI]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">GitHub Token Debugger</CardTitle>
            <CardDescription>
              Diagnostic tool to troubleshoot GitHub integration issues
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Auth Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Authentication Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">User Logged In:</span>
              {user ? (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Yes ({user.username})
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" />
                  No
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Access Token Exists:</span>
              {accessToken ? (
                <Badge variant="default" className="gap-1">
                  <Check className="h-3 w-3" />
                  Yes
                </Badge>
              ) : (
                <Badge variant="destructive" className="gap-1">
                  <X className="h-3 w-3" />
                  No
                </Badge>
              )}
            </div>
            {accessToken && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Token Type:</span>
                  <Badge variant="outline">{tokenType}</Badge>
                </div>
                <div className="flex items-start justify-between">
                  <span className="text-sm">Token Preview:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">
                    {accessToken.substring(0, 30)}...
                  </code>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* GitHub API Test */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">GitHub API Test</CardTitle>
              <CardDescription>Direct test of GitHub API with your token</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={testGitHubAPI}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retest
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {githubUserCheck ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {githubUserCheck.success ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <X className="h-3 w-3" />
                      Failed ({githubUserCheck.status})
                    </Badge>
                  )}
                </div>
                {githubUserCheck.success && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">GitHub User:</span>
                      <span className="text-sm font-mono">{githubUserCheck.data.login}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Token Scopes:</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">{scopes}</code>
                    </div>
                  </>
                )}
                {!githubUserCheck.success && (
                  <div className="text-xs text-red-600 bg-red-50 p-3 rounded">
                    <strong>Error:</strong> {JSON.stringify(githubUserCheck.error, null, 2)}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Testing...</p>
            )}
          </CardContent>
        </Card>

        {/* Installation Status Test */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg">Installation Status API Test</CardTitle>
              <CardDescription>Test the /api/github/installation-status endpoint</CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={testInstallationAPI}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retest
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {installationCheck ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status:</span>
                  {installationCheck.success ? (
                    <Badge variant="default" className="gap-1">
                      <Check className="h-3 w-3" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <X className="h-3 w-3" />
                      Failed ({installationCheck.status})
                    </Badge>
                  )}
                </div>
                {installationCheck.success && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">App Installed:</span>
                      {installationCheck.data.installed ? (
                        <Badge variant="default" className="gap-1">
                          <Check className="h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Not Installed</Badge>
                      )}
                    </div>
                    {installationCheck.data.installation_id && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm">Installation ID:</span>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {installationCheck.data.installation_id}
                        </code>
                      </div>
                    )}
                  </>
                )}
                {!installationCheck.success && (
                  <div className="text-xs text-red-600 bg-red-50 p-3 rounded">
                    <strong>Error:</strong> {JSON.stringify(installationCheck.error, null, 2)}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Testing...</p>
            )}
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-blue-600" />
              Troubleshooting Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>Check if GitHub API test succeeds (should show your GitHub username)</li>
              <li>Verify token scopes include: read:user, user:email, repo</li>
              <li>If GitHub API test fails with 401, token is invalid → Re-authenticate</li>
              <li>If Installation API test fails, check backend logs</li>
              <li>Ensure GITHUB_APP_ID environment variable is set correctly (1093969)</li>
            </ol>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Actions</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/auth/login';
              }}
            >
              Re-authenticate
            </Button>
            <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

