import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { createAPIBlazeClient } from '@/lib/apiblaze-client';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

async function getUserClaims() {
  const session = await getServerSession();
  
  if (!session?.user) {
    throw new Error('Unauthorized - no session');
  }

  return {
    sub: session.user.id || session.user.email || 'anonymous',
    handle: session.user.name || session.user.email || 'anonymous',
    email: session.user.email || undefined,
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

