/**
 * APIBlaze Admin API Client
 * 
 * Handles authenticated requests to the internal admin API with JWT user assertions
 */

import { createJWTSigner, UserAssertionClaims } from './jwt-signer';

type APIErrorBody = {
  error?: string;
  details?: unknown;
  suggestions?: unknown;
};

export interface CreateProxyPayload {
  target?: string;
  target_url?: string;
  name?: string;
  display_name?: string;
  subdomain?: string;
  auth_type?: 'none' | 'api_key' | 'oauth';
  openapi?: string;
  github?: {
    owner: string;
    repo: string;
    path: string;
    branch?: string;
  };
  oauth_config?: {
    provider_type: string;
    client_id: string;
    client_secret: string;
    scopes?: string;
  };
  environments?: Record<string, { target: string; description?: string }>;
}

interface APIBlazeClientOptions {
  apiKey: string;
  baseUrl?: string;
  jwtPrivateKey?: string;
  jwtPrivateKeyPath?: string;
}

export class APIBlazeError extends Error {
  status: number;
  body: APIErrorBody;

  constructor(status: number, body: APIErrorBody) {
    super(body?.error ?? `HTTP ${status}`);
    this.name = 'APIBlazeError';
    this.status = status;
    this.body = body;
  }
}

export class APIBlazeClient {
  private apiKey: string;
  private baseUrl: string;
  private jwtSigner: ReturnType<typeof createJWTSigner>;

  constructor(options: APIBlazeClientOptions) {
    this.apiKey = options.apiKey;
    this.baseUrl = options.baseUrl || 'https://internalapi.apiblaze.com';
    
    this.jwtSigner = createJWTSigner({
      privateKey: options.jwtPrivateKey,
      privateKeyPath: options.jwtPrivateKeyPath,
    });
  }

  /**
   * Make an authenticated request to the admin API
   */
  async request<T = unknown>(
    path: string,
    options: RequestInit & {
      userClaims: UserAssertionClaims;
    }
  ): Promise<T> {
    const { userClaims, ...fetchOptions } = options;
    
    // Prepare headers
    const headers = new Headers(fetchOptions.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('X-API-KEY', this.apiKey);
    
    // Create JWT user assertion with body hash binding
    const userAssertion = this.jwtSigner.createAuthHeader(
      userClaims,
      fetchOptions.body
    );
    headers.set('X-User-Assertion', userAssertion);
    
    // Make request
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...fetchOptions,
      headers,
    });
    
    if (!response.ok) {
      let errorBody: APIErrorBody = { error: 'Unknown error' };
      try {
        errorBody = (await response.json()) as APIErrorBody;
      } catch (jsonError) {
        console.error('Failed to parse error body from APIBlaze response:', jsonError);
      }
      throw new APIBlazeError(response.status, errorBody);
    }
    
    const responseBody = (await response.json()) as T;
    return responseBody;
  }

  /**
   * Create a new proxy
   */
  async createProxy(
    userClaims: UserAssertionClaims,
    proxyData: CreateProxyPayload
  ) {
    return this.request('/', {
      method: 'POST',
      body: JSON.stringify(proxyData),
      userClaims,
    });
  }

  /**
   * List proxies
   */
  async listProxies(userClaims: UserAssertionClaims, params?: {
    page?: number;
    limit?: number;
    search?: string;
    team_id?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.set('page', params.page.toString());
    if (params?.limit) queryParams.set('limit', params.limit.toString());
    if (params?.search) queryParams.set('search', params.search);
    if (params?.team_id) queryParams.set('team_id', params.team_id);
    
    const query = queryParams.toString();
    return this.request(`/projects${query ? `?${query}` : ''}`, {
      method: 'GET',
      userClaims,
    });
  }

  /**
   * Delete a proxy
   */
  async deleteProxy(
    userClaims: UserAssertionClaims,
    projectId: string,
    version: string
  ) {
    return this.request(`/${projectId}/${version}`, {
      method: 'DELETE',
      userClaims,
    });
  }

  /**
   * Get project status
   */
  async getProjectStatus(userClaims: UserAssertionClaims, projectId: string) {
    return this.request(`/projects/${projectId}/status`, {
      method: 'GET',
      userClaims,
    });
  }
}

/**
 * Create an APIBlaze client instance
 */
export function createAPIBlazeClient(options: APIBlazeClientOptions): APIBlazeClient {
  return new APIBlazeClient(options);
}

/**
 * Example usage in Next.js API route:
 * 
 * ```typescript
 * import { createAPIBlazeClient } from '@/lib/apiblaze-client';
 * import { getServerSession } from 'next-auth/next';
 * 
 * export async function POST(req: Request) {
 *   const session = await getServerSession();
 *   if (!session) {
 *     return Response.json({ error: 'Unauthorized' }, { status: 401 });
 *   }
 * 
 *   const client = createAPIBlazeClient({
 *     apiKey: process.env.APIBLAZE_ADMIN_API_KEY!,
 *   });
 * 
 *   const result = await client.createProxy(
 *     {
 *       sub: session.user.id,
 *       handle: session.user.name || 'anonymous',
 *       email: session.user.email,
 *       roles: ['admin'],
 *     },
 *     {
 *       target: 'https://httpbin.org',
 *       auth_type: 'api_key',
 *     }
 *   );
 * 
 *   return Response.json(result);
 * }
 * ```
 */

