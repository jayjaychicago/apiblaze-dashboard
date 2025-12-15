import { NextRequest, NextResponse } from 'next/server';
import { APIBlazeError, createAPIBlazeClient } from '@/lib/apiblaze-client';
import { getUserClaims } from '../../../../../../projects/_utils';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ poolId: string; clientId: string; providerId: string }> }
) {
  let poolId: string | undefined;
  let clientId: string | undefined;
  let providerId: string | undefined;
  
  try {
    const userClaims = await getUserClaims();
    const resolvedParams = await params;
    poolId = resolvedParams.poolId;
    clientId = resolvedParams.clientId;
    providerId = resolvedParams.providerId;
    
    console.log('DELETE provider request:', {
      poolId,
      clientId,
      providerId,
      providerIdLength: providerId?.length,
    });
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });
    
    await client.removeProvider(userClaims, poolId, clientId, providerId);
    // Return 204 No Content - DELETE operations should not have a response body
    return new NextResponse(null, { status: 204 });
    
  } catch (error: unknown) {
    console.error('Error removing provider:', error);
    
    if (error instanceof APIBlazeError) {
      console.error('APIBlazeError details:', {
        status: error.status,
        body: error.body,
        message: error.message,
        poolId,
        clientId,
        providerId,
      });
      
      return NextResponse.json(
        {
          error: error.body?.error || 'Failed to remove provider',
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
      { error: 'Failed to remove provider', details: message },
      { status: 500 }
    );
  }
}

