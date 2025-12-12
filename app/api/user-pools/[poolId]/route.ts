import { NextRequest, NextResponse } from 'next/server';
import { APIBlazeError, createAPIBlazeClient } from '@/lib/apiblaze-client';
import { getUserClaims } from '../../projects/_utils';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const userClaims = await getUserClaims();
    const { poolId } = await params;
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });

    const data = await client.getUserPool(userClaims, poolId);
    return NextResponse.json(data);
    
  } catch (error: unknown) {
    console.error('Error fetching user pool:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch user pool', details: message },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const userClaims = await getUserClaims();
    const { poolId } = await params;
    const body = (await request.json()) as { name?: string; default_app_client_id?: string };
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });
    
    const data = await client.updateUserPool(userClaims, poolId, body);
    return NextResponse.json(data);
    
  } catch (error: unknown) {
    console.error('Error updating user pool:', error);
    
    if (error instanceof APIBlazeError) {
      return NextResponse.json(
        {
          error: error.body?.error || 'Failed to update user pool',
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
      { error: 'Failed to update user pool', details: message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const userClaims = await getUserClaims();
    const { poolId } = await params;
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });
    
    await client.deleteUserPool(userClaims, poolId);
    return NextResponse.json({ success: true });
    
  } catch (error: unknown) {
    console.error('Error deleting user pool:', error);
    
    if (error instanceof APIBlazeError) {
      return NextResponse.json(
        {
          error: error.body?.error || 'Failed to delete user pool',
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
      { error: 'Failed to delete user pool', details: message },
      { status: 500 }
    );
  }
}

