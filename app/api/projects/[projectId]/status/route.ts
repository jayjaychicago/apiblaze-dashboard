import { NextRequest, NextResponse } from 'next/server';
import { createAPIBlazeClient } from '@/lib/apiblaze-client';
import { getUserClaims } from '../../_utils';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

function getRouteParams(context: unknown): { projectId: string } {
  if (
    typeof context === 'object' &&
    context !== null &&
    'params' in context &&
    typeof (context as { params?: unknown }).params === 'object' &&
    (context as { params: unknown }).params !== null
  ) {
    const { projectId } = (context as { params: Record<string, unknown> }).params;
    if (typeof projectId === 'string') {
      return { projectId };
    }
  }

  throw new Error('Invalid route parameters');
}

export async function GET(
  _request: NextRequest,
  context: unknown
) {
  try {
    const userClaims = await getUserClaims();
    const { projectId } = getRouteParams(context);
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });
    
    const data = await client.getProjectStatus(userClaims, projectId);
    return NextResponse.json(data);
    
  } catch (error: unknown) {
    console.error('Error fetching project status:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch project status', details: message },
      { status: 500 }
    );
  }
}

