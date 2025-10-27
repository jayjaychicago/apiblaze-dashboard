/**
 * API Client for Internal API
 * Handles communication with internalapi.apiblaze.com
 */

const INTERNAL_API_URL = process.env.INTERNAL_API_URL || 'https://internalapi.apiblaze.com';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

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
  private apiKey: string;
  
  constructor() {
    this.baseUrl = INTERNAL_API_URL;
    this.apiKey = INTERNAL_API_KEY || '';
  }
  
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-API-KEY': this.apiKey,
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
    subdomain: string;
    target_url?: string;
    openapi_spec?: any;
    team_id?: string;
  }): Promise<Project> {
    return this.request<Project>('/create-proxy', {
      method: 'POST',
      body: JSON.stringify(data),
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

