import { NextRequest, NextResponse } from 'next/server';
import { APIBlazeError, createAPIBlazeClient } from '@/lib/apiblaze-client';
import { getUserClaims } from '../../_utils';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

function getRouteParams(context: unknown): { projectId: string; apiVersion: string } {
  if (
    typeof context === 'object' &&
    context !== null &&
    'params' in context &&
    typeof (context as { params?: unknown }).params === 'object' &&
    (context as { params: unknown }).params !== null
  ) {
    const { projectId, apiVersion } = (context as { params: Record<string, unknown> }).params;
    if (typeof projectId === 'string' && typeof apiVersion === 'string') {
      return { projectId, apiVersion };
    }
  }

  throw new Error('Invalid route parameters');
}

export async function DELETE(
  _request: NextRequest,
  context: unknown
) {
  const { projectId, apiVersion } = getRouteParams(context);

  if (!projectId || !apiVersion) {
    return NextResponse.json(
      { error: 'Missing project identifier' },
      { status: 400 }
    );
  }

  try {
    const userClaims = await getUserClaims();

    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });

    await client.deleteProxy(userClaims, projectId, apiVersion);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Error deleting project:', error);

    if (error instanceof APIBlazeError) {
      return NextResponse.json(
        {
          error: error.body?.error || 'Failed to delete project',
          details: error.body?.details ?? error.body?.error,
        },
        { status: error.status }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete project', details: message },
      { status: 500 }
    );
  }
}

