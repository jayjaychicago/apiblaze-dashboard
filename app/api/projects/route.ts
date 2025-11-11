import { NextRequest, NextResponse } from 'next/server';
import { APIBlazeError, createAPIBlazeClient, type CreateProxyPayload } from '@/lib/apiblaze-client';
import { getUserClaims } from './_utils';

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

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
    
  } catch (error: unknown) {
    console.error('Error fetching projects:', error);
    
    const message = error instanceof Error ? error.message : 'Unknown error';

    if (message.includes('Unauthorized')) {
      return NextResponse.json(
        { error: 'Unauthorized', details: 'Please sign in' },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to fetch projects', details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userClaims = await getUserClaims();
    const body = (await request.json()) as CreateProxyPayload;
    
    const client = createAPIBlazeClient({
      apiKey: INTERNAL_API_KEY,
      jwtPrivateKey: process.env.JWT_PRIVATE_KEY,
    });
    
    const data = await client.createProxy(userClaims, body);
    return NextResponse.json(data);
    
  } catch (error: unknown) {
    console.error('Error creating project:', error);
    
    if (error instanceof APIBlazeError) {
      return NextResponse.json(
        {
          error: error.body?.error || 'Failed to create project',
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
      { error: 'Failed to create project', details: message },
      { status: 500 }
    );
  }
}

