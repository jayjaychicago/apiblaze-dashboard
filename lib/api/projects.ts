import { Project, ProjectListResponse, ProjectStatusResponse } from '@/types/project';

interface ListProjectsParams {
  team_id?: string;
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

// Use Next.js API routes to proxy requests (keeps API key server-side)
export async function listProjects(params: ListProjectsParams = {}): Promise<ProjectListResponse> {
  const queryParams = new URLSearchParams();
  
  if (params.team_id) queryParams.append('team_id', params.team_id);
  if (params.search) queryParams.append('search', params.search);
  if (params.status) queryParams.append('status', params.status);
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());

  const url = `/api/projects?${queryParams.toString()}`;
  
  const response = await fetch(url, {
    headers: {
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
  const url = `/api/projects/${projectId}/status`;
  
  const response = await fetch(url, {
    headers: {
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
  const url = `/api/projects/${projectId}/${apiVersion}`;
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Failed to delete project: ${response.status}`);
  }
}

export async function createProject(data: any): Promise<any> {
  const url = `/api/projects`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
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

