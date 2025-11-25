import { NextRequest, NextResponse } from 'next/server';
import { APIBlazeError, createAPIBlazeClient } from '@/lib/apiblaze-client';
import { getUserClaims } from '../../../../projects/_utils';
import type { UpdateAppClientRequest } from '@/types/user-pool';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string; clientId: string }> }
) {
  try {
    const userClaims = await getUserClaims();
    const { poolId, clientId } = await params;
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });

    const data = await client.getAppClient(userClaims, poolId, clientId);
    return NextResponse.json(data);
    
  } catch (error: unknown) {
    console.error('Error fetching app client:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch app client', details: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string; clientId: string }> }
) {
  try {
    const userClaims = await getUserClaims();
    const { poolId, clientId } = await params;
    const body = (await request.json()) as UpdateAppClientRequest;
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });
    
    const data = await client.updateAppClient(userClaims, poolId, clientId, body);
    return NextResponse.json(data);
    
  } catch (error: unknown) {
    console.error('Error updating app client:', error);
    
    if (error instanceof APIBlazeError) {
      return NextResponse.json(
        {
          error: error.body?.error || 'Failed to update app client',
          details: error.body?.details ?? error.body?.error,
          suggestions: error.body?.suggestions,
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
      { error: 'Failed to update app client', details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string; clientId: string }> }
) {
  try {
    const userClaims = await getUserClaims();
    const { poolId, clientId } = await params;
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });
    
    await client.deleteAppClient(userClaims, poolId, clientId);
    return NextResponse.json({ success: true });
    
  } catch (error: unknown) {
    console.error('Error deleting app client:', error);
    
    if (error instanceof APIBlazeError) {
      return NextResponse.json(
        {
          error: error.body?.error || 'Failed to delete app client',
          details: error.body?.details ?? error.body?.error,
          suggestions: error.body?.suggestions,
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
      { error: 'Failed to delete app client', details: message },
      { status: 500 }
    );
  }
}

