import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import type { RestEndpointMethodTypes } from '@octokit/rest';
import { RequestError } from '@octokit/request-error';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/next-auth';
import * as yaml from 'js-yaml';

interface ParseRequestBody {
  owner: string;
  repo: string;
  path: string;
  branch?: string;
}

type RepositoryContent =
  RestEndpointMethodTypes['repos']['getContent']['response']['data'];

type ContentFile = Extract<RepositoryContent, { type: 'file' }>;

type OpenAPISpec = {
  info?: {
    title?: string;
    version?: string;
    description?: string;
  };
  openapi?: string;
  swagger?: string;
  servers?: unknown;
  paths?: Record<string, unknown> | undefined;
};

function isContentFile(content: RepositoryContent): content is ContentFile {
  return !Array.isArray(content) && 'content' in content;
}

function parseSpec(content: string, filePath: string): OpenAPISpec {
  let rawSpec: unknown;

  if (filePath.endsWith('.json')) {
    rawSpec = JSON.parse(content);
  } else {
    rawSpec = yaml.load(content);
  }

  if (typeof rawSpec !== 'object' || rawSpec === null) {
    throw new Error('Parsed OpenAPI document is not an object');
  }

  return rawSpec as OpenAPISpec;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ParseRequestBody;
    const { owner, repo, path, branch } = body;
    
    // Get and validate session (NextAuth)
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      console.log('No valid session or access token found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Initialize Octokit with the GitHub access token from session
    const octokit = new Octokit({ 
      auth: session.accessToken,
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

    if (!isContentFile(fileData)) {
      return NextResponse.json(
        { error: 'File not found or is a directory' },
        { status: 404 }
      );
    }

    // Decode base64 content
    const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
    
    // Parse YAML or JSON
    const spec = parseSpec(content, path);

    // Extract relevant information
    const info = spec.info ?? {};
    const servers = Array.isArray(spec.servers) ? spec.servers : [];
    const pathsCount = spec.paths ? Object.keys(spec.paths).length : 0;

    const parsedSpec = {
      info: {
        title: info.title || 'API',
        version: info.version || '1.0.0',
        description: info.description || '',
      },
      openapi: spec.openapi || spec.swagger,
      servers,
      paths: pathsCount,
    };

    return NextResponse.json(parsedSpec);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error parsing OpenAPI spec:', message);

    if (error instanceof RequestError && error.status === 404) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to parse OpenAPI specification' },
      { status: 500 }
    );
  }
}
