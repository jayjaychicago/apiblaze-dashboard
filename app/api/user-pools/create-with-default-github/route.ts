import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { apiblazeClient } from '@/lib/apiblaze-client';

/**
 * Create a UserPool, AppClient, and Provider with default GitHub credentials
 * This keeps the GitHub client secret server-side only
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { userPoolName, appClientName, scopes } = body;

    if (!userPoolName || !appClientName) {
      return NextResponse.json(
        { error: 'userPoolName and appClientName are required' },
        { status: 400 }
      );
    }

    // Get default GitHub OAuth credentials from environment (server-side only)
    const defaultClientId = process.env.NEXT_PUBLIC_APIBLAZE_GITHUB_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    const defaultClientSecret = process.env.APIBLAZE_GITHUB_CLIENT_SECRET || process.env.GITHUB_CLIENT_SECRET;

    if (!defaultClientId || !defaultClientSecret) {
      return NextResponse.json(
        { error: 'Default GitHub OAuth credentials not configured' },
        { status: 500 }
      );
    }

    // 1. Create UserPool
    const userPool = await apiblazeClient.createUserPool({ name: userPoolName });
    const userPoolId = (userPool as { id: string }).id;

    // 2. Create AppClient
    const appClient = await apiblazeClient.createAppClient(userPoolId, {
      name: appClientName,
      scopes: scopes || ['email', 'openid', 'profile'],
    });
    const appClientId = (appClient as { id: string }).id;

    // 3. Add default GitHub Provider to AppClient (server-side, secret never exposed)
    await apiblazeClient.addProvider(userPoolId, appClientId, {
      type: 'github',
      clientId: defaultClientId,
      clientSecret: defaultClientSecret,
      domain: 'https://github.com',
    });

    return NextResponse.json({
      userPoolId,
      appClientId,
    });
  } catch (error) {
    console.error('Error creating UserPool with default GitHub:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create UserPool with default GitHub' },
      { status: 500 }
    );
  }
}

