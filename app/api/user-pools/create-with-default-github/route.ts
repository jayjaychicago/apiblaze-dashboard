import { NextRequest, NextResponse } from 'next/server';
import { APIBlazeError, createAPIBlazeClient } from '@/lib/apiblaze-client';
import { getUserClaims } from '../../projects/_utils';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

/**
 * Create a UserPool, AppClient, and Provider with default GitHub credentials
 * This keeps the GitHub client secret server-side only
 */
export async function POST(request: NextRequest) {
  try {
    const userClaims = await getUserClaims();
    const body = await request.json();
    const { userPoolName, appClientName, scopes } = body;

    if (!userPoolName || !appClientName) {
      return NextResponse.json(
        { error: 'userPoolName and appClientName are required' },
        { status: 400 }
      );
    }

    // Get default GitHub OAuth credentials from environment (server-side only)
    // Both client ID and secret are server-side only (no NEXT_PUBLIC_ prefix)
    const defaultClientId = process.env.GITHUB_CLIENT_ID;
    const defaultClientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!defaultClientId || !defaultClientSecret) {
      return NextResponse.json(
        { error: 'Default GitHub OAuth credentials not configured' },
        { status: 500 }
      );
    }

    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });

    // 1. Create UserPool
    const userPool = await client.createUserPool(userClaims, { name: userPoolName });
    const userPoolId = (userPool as { id: string }).id;

    // 2. Create AppClient
    const appClient = await client.createAppClient(userClaims, userPoolId, {
      name: appClientName,
      scopes: scopes || ['email', 'openid', 'profile'],
    });
    const appClientId = (appClient as { id: string }).id;

    // 3. Add default GitHub Provider to AppClient (server-side, secret never exposed)
    await client.addProvider(userClaims, userPoolId, appClientId, {
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
    
    if (error instanceof APIBlazeError) {
      return NextResponse.json(
        {
          error: error.body?.error || 'Failed to create UserPool with default GitHub',
          details: error.body?.details ?? error.body?.error,
          suggestions: error.body?.suggestions,
        },
        { status: error.status }
      );
    }
    
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create UserPool with default GitHub' },
      { status: 500 }
    );
  }
}

