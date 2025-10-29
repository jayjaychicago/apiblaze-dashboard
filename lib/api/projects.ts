import { Project, ProjectListResponse, ProjectStatusResponse } from '@/types/project';

const API_BASE_URL = process.env.NEXT_PUBLIC_INTERNAL_API_URL || 'https://internalapi.apiblaze.com';
const API_KEY = process.env.NEXT_PUBLIC_API_KEY || '';

interface ListProjectsParams {
  team_id?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function listProjects(params: ListProjectsParams = {}): Promise<ProjectListResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.team_id) queryParams.append('team_id', params.team_id);
  if (params.search) queryParams.append('search', params.search);
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const url = `${API_BASE_URL}/projects?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    headers: {
      'X-API-KEY': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch projects: ${response.status}`);
  }

  return response.json();
}

export async function getProjectStatus(projectId: string): Promise<ProjectStatusResponse> {
  const url = `${API_BASE_URL}/projects/${projectId}/status`;
  
  const response = await fetch(url, {
    headers: {
      'X-API-KEY': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to fetch project status: ${response.status}`);
  }

  return response.json();
}

export async function deleteProject(projectId: string, apiVersion: string = '1.0.0'): Promise<void> {
  const url = `${API_BASE_URL}/${projectId}/${apiVersion}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'X-API-KEY': API_KEY,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to delete project: ${response.status}`);
  }
}

export async function createProject(data: any): Promise<any> {
  const url = `${API_BASE_URL}/`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'X-API-KEY': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to create project: ${response.status}`);
  }

  return response.json();
}

