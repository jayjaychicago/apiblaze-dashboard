import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

// GitHub App ID - should be set in environment variables
const GITHUB_APP_ID = process.env.GITHUB_APP_ID || '1093969'; // APIBlaze app ID

export async function GET(request: Request) {
  try {
    // Get GitHub access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    if (!accessToken) {
      console.log('No access token provided');
      return NextResponse.json({ 
        installed: false,
        error: 'Not authenticated' 
      }, { status: 401 });
    }

    // Initialize Octokit with the access token
    const octokit = new Octokit({ 
      auth: accessToken,
      request: {
        timeout: 5000 // 5 second timeout
      }
    });

    // Verify token validity
    try {
      await octokit.users.getAuthenticated();
    } catch (error: any) {
      console.error('GitHub authentication error:', error.message);
      if (error.status === 401) {
        return NextResponse.json({ 
          installed: false,
          error: 'Invalid or expired GitHub token'
        }, { status: 401 });
      }
      throw error;
    }

    // Check app installation
    const { data: installationsData } = await octokit.rest.apps.listInstallationsForAuthenticatedUser({
      per_page: 100,
      headers: {
        'If-None-Match': ''
      }
    });

    if (!Array.isArray(installationsData.installations)) {
      console.error('Invalid installations response format');
      return NextResponse.json({ 
        installed: false,
        error: 'Invalid GitHub API response'
      }, { status: 500 });
    }

    const githubAppIdNumber = parseInt(GITHUB_APP_ID, 10);
    const installation = installationsData.installations.find(
      (inst: any) => inst.app_id === githubAppIdNumber && inst.target_type === 'User'
    );

    if (!installation) {
      return NextResponse.json({ 
        installed: false,
        installUrl: process.env.GITHUB_APP_INSTALL_URL || 'https://github.com/apps/apiblaze/installations/new',
        appId: githubAppIdNumber
      });
    }

    // App is installed!
    return NextResponse.json({
      installed: true,
      installation_id: installation.id.toString(),
      repository_selection: installation.repository_selection || 'selected',
    });
  } catch (error) {
    console.error('Error checking GitHub installation status:', error);
    return NextResponse.json(
      { installed: false, error: 'Failed to check installation status' },
      { status: 500 }
    );
  }
}
