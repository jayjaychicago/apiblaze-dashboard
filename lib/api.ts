/**
 * API Client for Internal API
 * Handles communication with internalapi.apiblaze.com
 */

// Use Next.js API routes to proxy requests (keeps API key server-side)
const API_BASE_URL = '/api';

export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export interface Project {
  id: string;
  name: string;
  subdomain: string;
  target_url?: string;
  openapi_spec?: any;
  created_at: string;
  updated_at: string;
  status: 'active' | 'inactive' | 'deploying';
}

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

/**
 * Base API client with authentication
 */
class ApiClient {
  private baseUrl: string;
  
  constructor() {
    this.baseUrl = API_BASE_URL;
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    if (!response.ok) {
      const error: ApiError = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`,
      }));
      throw new Error(error.error || 'API request failed');
    }
    
    return response.json();
  }
  
  // Projects
  async listProjects(): Promise<Project[]> {
    return this.request<Project[]>('/proxies');
  }
  
  async getProject(id: string): Promise<Project> {
    return this.request<Project>(`/proxies/${id}`);
  }
  
  async createProject(data: {
    name: string;
    display_name?: string;
    subdomain: string;
    target_url?: string;
    openapi_spec?: any;
    team_id?: string;
    username?: string;
    github?: {
      owner: string;
      repo: string;
      path: string;
      branch?: string;
    };
    auth_type?: string;
    oauth_config?: {
      provider_type: string;
      client_id: string;
      client_secret: string;
      scopes: string;
    };
    environments?: Record<string, { target: string }>;
  }): Promise<any> {
    // Map frontend data to backend API format
    const backendData: any = {
      target: data.target_url,
      openapi: data.openapi_spec,
      username: data.username,
    };

    // Add optional fields if provided
    if (data.github) {
      backendData.github = data.github;
    }
    if (data.auth_type) {
      backendData.auth_type = data.auth_type;
    }
    if (data.oauth_config) {
      backendData.oauth_config = data.oauth_config;
    }
    if (data.environments) {
      backendData.environments = data.environments;
    }

    console.log('[API Client] Creating project:', data.name);
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(backendData),
    });
  }
  
  async deleteProject(id: string): Promise<{ success: boolean }> {
    return this.request(`/delete-proxy/${id}`, {
      method: 'DELETE',
    });
  }
  
  // Teams
  async listTeams(): Promise<Team[]> {
    return this.request<Team[]>('/teams');
  }
  
  async createTeam(data: { name: string }): Promise<Team> {
    return this.request<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();

