import { NextResponse } from 'next/server';

/**
 * Get default GitHub OAuth credentials for APIBlaze projects
 * These are the system-wide GitHub OAuth app credentials
 */
export async function GET() {
  // Get default GitHub OAuth credentials from environment
  // These should be the APIBlaze GitHub OAuth app credentials for projects
  const defaultClientId = process.env.NEXT_PUBLIC_APIBLAZE_GITHUB_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  const defaultClientSecret = process.env.APIBLAZE_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;

  if (!defaultClientId || !defaultClientSecret) {
    return NextResponse.json(
      { error: 'Default GitHub OAuth credentials not configured' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    clientId: defaultClientId,
    clientSecret: defaultClientSecret,
    domain: 'https://github.com',
    type: 'github',
  });
}

