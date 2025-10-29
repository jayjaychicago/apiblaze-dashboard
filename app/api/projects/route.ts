import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createAPIBlazeClient } from '@/lib/apiblaze-client';
import { authOptions } from '@/lib/next-auth';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

/**
 * Get user claims from session for JWT
 */
async function getUserClaims() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Unauthorized - no session');
  }

  // Use githubHandle (username) not name (display name)
  const handle = session.user.githubHandle || session.user.email?.split('@')[0] || 'anonymous';

  return {
    sub: session.user.id || session.user.email || `user:${handle}`,
    handle: handle,
    email: session.user.email || undefined,
    roles: ['admin'], // TODO: Get from actual user roles
  };
}

export async function GET(request: NextRequest) {
  try {
    const userClaims = await getUserClaims();
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });

    const searchParams = request.nextUrl.searchParams;
    const params = {
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined,
      search: searchParams.get('search') || undefined,
      team_id: searchParams.get('team_id') || undefined,
    };
    
    const data = await client.listProxies(userClaims, params);
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userClaims = await getUserClaims();
    const body = await request.json();
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });
    
    const data = await client.createProxy(userClaims, body);
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Error creating project:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to create project', details: error.message },
      { status: 500 }
    );
  }
}

