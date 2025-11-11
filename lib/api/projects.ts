import { ProjectListResponse, ProjectStatusResponse } from '@/types/project';
import type { CreateProxyPayload } from '@/lib/apiblaze-client';

type ErrorResponse = {
  error?: string;
  details?: unknown;
  suggestions?: unknown;
};

type ErrorDetailsObject = {
  message?: string;
  line?: number;
  column?: number;
  snippet?: string;
  format?: string;
};

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
    const error = await parseErrorResponse(response);
    throw new Error(error.error || `Failed to fetch projects: ${response.status}`);
  }

  return (await response.json()) as ProjectListResponse;
}

export async function getProjectStatus(projectId: string): Promise<ProjectStatusResponse> {
  const url = `/api/projects/${projectId}/status`;
  
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    throw new Error(error.error || `Failed to fetch project status: ${response.status}`);
  }

  return (await response.json()) as ProjectStatusResponse;
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
    const error = await parseErrorResponse(response);
    throw new Error(error.error || `Failed to delete project: ${response.status}`);
  }
}

export async function createProject(data: CreateProxyPayload): Promise<unknown> {
  const url = `/api/projects`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await parseErrorResponse(response);
    const messageParts = [
      error.error || `Failed to create project: ${response.status}`,
    ];

    if (typeof error.details === 'string') {
      messageParts.push(error.details);
    } else if (isErrorDetailsObject(error.details)) {
      if (error.details.message) {
        messageParts.push(error.details.message);
      }
      if (error.details.line !== undefined && error.details.column !== undefined) {
        messageParts.push(`line ${error.details.line}, column ${error.details.column}`);
      } else if (error.details.line !== undefined) {
        messageParts.push(`line ${error.details.line}`);
      }
      if (error.details.snippet) {
        messageParts.push(`\n${error.details.snippet}`);
      }
    }

    const suggestions = Array.isArray(error.suggestions) ? error.suggestions : [];
    if (suggestions.length > 0) {
      messageParts.push(`Suggestions: ${suggestions.join('; ')}`);
    }

    const message = messageParts.filter(Boolean).join(' — ');
    const err: ErrorWithContext = new Error(message);
    err.details = error.details;
    err.suggestions = error.suggestions;
    throw err;
  }

  return response.json() as Promise<unknown>;
}

async function parseErrorResponse(response: Response): Promise<ErrorResponse> {
  try {
    return (await response.json()) as ErrorResponse;
  } catch {
    return { error: 'Unknown error' };
  }
}

function isErrorDetailsObject(value: unknown): value is ErrorDetailsObject {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    ('message' in record ? typeof record.message === 'string' : true) &&
    ('line' in record ? typeof record.line === 'number' : true) &&
    ('column' in record ? typeof record.column === 'number' : true) &&
    ('snippet' in record ? typeof record.snippet === 'string' : true) &&
    ('format' in record ? typeof record.format === 'string' : true)
  );
}

interface ErrorWithContext extends Error {
  details?: unknown;
  suggestions?: unknown;
}

