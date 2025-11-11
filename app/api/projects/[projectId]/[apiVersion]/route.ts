import { NextResponse } from 'next/server';
import { APIBlazeError, createAPIBlazeClient } from '@/lib/apiblaze-client';
import { getUserClaims } from '../../_utils';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

export async function DELETE(
  _request: Request,
  { params }: { params: { projectId: string; apiVersion: string } }
) {
  const { projectId, apiVersion } = params;

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
  } catch (error: any) {
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

    if (typeof error?.message === 'string' && error.message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete project', details: error?.message ?? 'Unknown error' },
      { status: 500 }
    );
  }
}

