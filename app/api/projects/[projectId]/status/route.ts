import { NextRequest, NextResponse } from 'next/server';

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'https://internalapi.apiblaze.com';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    
    const response = await fetch(`${INTERNAL_API_URL}/projects/${projectId}/status`, {
      headers: {
        'X-API-KEY': INTERNAL_API_KEY,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error fetching project status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch project status', details: error.message },
      { status: 500 }
    );
  }
}

