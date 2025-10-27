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

/**
 * Generate login URL for GitHub OAuth flow
 * This redirects to the auth worker which handles the OAuth dance
 */
export function getLoginUrl(returnUrl?: string): string {
  const authWorkerUrl = process.env.NEXT_PUBLIC_AUTH_WORKER_URL || 'https://auth.apiblaze.com';
  
  // State includes dashboard identifier
  const state = JSON.stringify({
    tenant: 'dashboard',
    version: 'v1',
    returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
  });
  
  const encodedState = btoa(state);
  const encodedReturnUrl = encodeURIComponent(returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`);
  
  return `${authWorkerUrl}/login?state=${encodedState}&redirect_uri=${encodedReturnUrl}`;
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
    
    const githubUser = await response.json();
    
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
        const emails = await emailResponse.json();
        const primaryEmail = emails.find((e: any) => e.primary);
        email = primaryEmail?.email || emails[0]?.email;
      }
    }
    
    return {
      id: `github:${githubUser.id}`,
      username: githubUser.login,
      email: email || `${githubUser.login}@github.com`,
      name: githubUser.name,
      avatar_url: githubUser.avatar_url
    };
    
  } catch (error) {
    console.error('Error verifying GitHub token:', error);
    return null;
  }
}

/**
 * Parse callback parameters from URL
 */
export function parseCallbackParams(searchParams: URLSearchParams): {
  accessToken: string | null;
  error: string | null;
} {
  return {
    accessToken: searchParams.get('access_token'),
    error: searchParams.get('error')
  };
}

