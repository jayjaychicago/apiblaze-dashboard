/**
 * Auth Library
 * Utilities for authentication and session management
 */

export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string;
  avatar_url?: string;
}

export interface AuthTokens {
  access_token: string;
  token_type?: string;
  scope?: string;
}

interface GithubUserResponse {
  id: number;
  login: string;
  email: string | null;
  name?: string | null;
  avatar_url?: string | null;
}

interface GithubEmailResponse {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: 'public' | 'private' | null;
}

/**
 * Generate OAuth 2.0 authorization URL
 * Uses standard OAuth 2.0 /authorize endpoint
 */
export function getLoginUrl(returnUrl?: string): string {
  const authWorkerUrl = process.env.NEXT_PUBLIC_AUTH_WORKER_URL || 'https://auth.apiblaze.com';
  const redirectUri = returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`;
  
  // Build standard OAuth 2.0 authorize URL
  const authorizeUrl = new URL(`${authWorkerUrl}/authorize`);
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('client_id', 'apiblaze-dashboard');
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  authorizeUrl.searchParams.set('scope', 'openid profile email');
  authorizeUrl.searchParams.set('state', generateRandomState());
  
  return authorizeUrl.toString();
}

/**
 * Generate random state for CSRF protection
 */
function generateRandomState(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

/**
 * Verify GitHub access token and get user info
 */
export async function verifyGitHubToken(token: string): Promise<User | null> {
  try {
    // Get user info from GitHub API
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'User-Agent': 'APIBlaze-Dashboard'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const githubUser = (await response.json()) as GithubUserResponse;
    
    // Get user email if not public
    let email = githubUser.email;
    if (!email) {
      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          'User-Agent': 'APIBlaze-Dashboard'
        }
      });
      
      if (emailResponse.ok) {
        const emails = (await emailResponse.json()) as GithubEmailResponse[];
        const primaryEmail = emails.find((emailRecord) => emailRecord.primary);
        email = primaryEmail?.email ?? emails[0]?.email ?? null;
      }
    }
    
    return {
      id: `github:${githubUser.id}`,
      username: githubUser.login,
      email: email || `${githubUser.login}@github.com`,
      name: githubUser.name || undefined,
      avatar_url: githubUser.avatar_url || undefined
    };
    
  } catch (error: unknown) {
    console.error('Error verifying GitHub token:', error);
    return null;
  }
}

/**
 * Parse callback parameters from URL
 */
export function parseCallbackParams(searchParams: URLSearchParams): {
  code: string | null;
  error: string | null;
  state: string | null;
} {
  return {
    code: searchParams.get('code'),
    error: searchParams.get('error'),
    state: searchParams.get('state')
  };
}

/**
 * Exchange OAuth authorization code for access token
 */
export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<string | null> {
  try {
    const authWorkerUrl = process.env.NEXT_PUBLIC_AUTH_WORKER_URL || 'https://auth.apiblaze.com';
    
    const response = await fetch(`${authWorkerUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
        client_id: 'apiblaze-dashboard',
      }),
    });
    
    if (!response.ok) {
      console.error('Token exchange failed:', await response.text());
      return null;
    }
    
    const data = (await response.json()) as Partial<AuthTokens>;
    return data.access_token ?? null;
  } catch (error: unknown) {
    console.error('Error exchanging code for token:', error);
    return null;
  }
}

