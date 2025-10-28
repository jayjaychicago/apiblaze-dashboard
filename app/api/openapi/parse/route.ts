import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import * as yaml from 'js-yaml';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { owner, repo, path, branch } = body;
    
    // Get GitHub access token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const accessToken = authHeader?.replace('Bearer ', '');
    
    if (!accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Initialize Octokit
    const octokit = new Octokit({ 
      auth: accessToken,
      request: {
        timeout: 10000
      }
    });

    // Fetch file content from GitHub
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (!('content' in fileData)) {
      return NextResponse.json(
        { error: 'File not found or is a directory' },
        { status: 404 }
      );
    }

    // Decode base64 content
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    
    // Parse YAML or JSON
    let spec: any;
    if (path.endsWith('.json')) {
      spec = JSON.parse(content);
    } else {
      spec = yaml.load(content);
    }

    // Extract relevant information
    const parsedSpec = {
      info: {
        title: spec.info?.title || 'API',
        version: spec.info?.version || '1.0.0',
        description: spec.info?.description || '',
      },
      openapi: spec.openapi || spec.swagger,
      servers: spec.servers || [],
      paths: Object.keys(spec.paths || {}).length,
    };

    return NextResponse.json(parsedSpec);
  } catch (error: any) {
    console.error('Error parsing OpenAPI spec:', error.message);
    return NextResponse.json(
      { error: 'Failed to parse OpenAPI specification' },
      { status: 500 }
    );
  }
}
