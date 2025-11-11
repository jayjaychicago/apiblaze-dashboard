import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import type { RestEndpointMethodTypes } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';

export async function GET() {
  try {
    // Get and validate session (NextAuth)
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      console.log('No valid session or access token found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Initialize Octokit with the GitHub access token from session
    const octokit = new Octokit({ 
      auth: session.accessToken,
      request: {
        timeout: 10000 // 10 second timeout
      }
    });

    // Verify token validity
    try {
      await octokit.users.getAuthenticated();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown GitHub authentication error';
      console.error('GitHub authentication error:', message);
      if (error instanceof RequestError && error.status === 401) {
        return NextResponse.json({ 
          error: 'Invalid or expired GitHub token'
        }, { status: 401 });
      }
      throw error;
    }

    // Fetch user repositories with pagination
    type AuthenticatedRepo =
      RestEndpointMethodTypes['repos']['listForAuthenticatedUser']['response']['data'][number];

    const repositories: AuthenticatedRepo[] = [];
    let page = 1;
    const perPage = 100;

    try {
      while (true) {
        const { data } = await octokit.repos.listForAuthenticatedUser({
          page,
          per_page: perPage,
          sort: 'updated',
          direction: 'desc',
        });

        if (data.length === 0) break;
        
        repositories.push(...data);
        
        if (data.length < perPage) break;
        page++;
        
        // Safety limit
        if (page > 10) break;
      }

      // Format repositories for frontend
      const formattedRepos = repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description || '',
        default_branch: repo.default_branch,
        updated_at: repo.updated_at,
        language: repo.language || '',
        stargazers_count: repo.stargazers_count,
      }));

      return NextResponse.json(formattedRepos);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown repository fetch error';
      console.error('Error fetching repositories:', message);
      throw error;
    }
  } catch (error: unknown) {
    console.error('Error in /api/github/repos:', error);
    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}
