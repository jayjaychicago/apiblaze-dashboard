import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createAPIBlazeClient } from '@/lib/apiblaze-client';
import { authOptions } from '@/lib/next-auth';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

async function getUserClaims() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    throw new Error('Unauthorized - no session');
  }

  // Use githubHandle (username) not name (display name)
  const handle = session.user.githubHandle || session.user.email?.split('@')[0];
  
  // Defensive validation: ensure handle exists and is legitimate
  if (!handle || handle === 'anonymous' || handle.length < 2) {
    console.error('Invalid user handle in session:', session.user);
    throw new Error('Invalid user session - missing valid username');
  }

  // Defensive validation: ensure email is present (required by OAuth)
  if (!session.user.email) {
    console.error('No email in session:', session.user);
    throw new Error('Invalid user session - missing email');
  }

  const userId = session.user.id || session.user.email || `github:${handle}`;

  return {
    sub: userId,
    handle: handle,
    email: session.user.email,
    roles: ['admin'],
  };
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const userClaims = await getUserClaims();
    const { projectId } = await params;
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });
    
    const data = await client.getProjectStatus(userClaims, projectId);
    return NextResponse.json(data);
    
  } catch (error: any) {
    console.error('Error fetching project status:', error);
    
    if (error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch project status', details: error.message },
      { status: 500 }
    );
  }
}

