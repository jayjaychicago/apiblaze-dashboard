// Project types matching the backend API response

export interface Project {
  project_id: string;
  display_name: string;
  description?: string;
  api_version: string;
  team_id: string;
  status: 'active' | 'suspended' | 'deleted';
  created_at: string;
  updated_at: string;
  last_deployed_at?: string;
  mcp_enabled: boolean;
  
  urls: {
    api: string;
    portal: string;
    auth: string;
    admin: string;
  };
  
  spec_source: {
    type: 'github' | 'upload' | 'target_only';
    github?: {
      owner: string;
      repo: string;
      branch: string;
    };
  };
  
  deployer: {
    name?: string;
    email?: string;
    avatar_url?: string;
    github_username?: string;
  };
  
  deployment: {
    deployment_id: string;
    status: 'pending' | 'building' | 'live' | 'failed' | 'rolled_back';
    created_at: string;
    completed_at?: string;
    duration_seconds?: number;
    age_seconds: number;
    error?: string;
  } | null;
  
  config?: any; // Full config from KV if needed
}

export interface ProjectListResponse {
  success: true;
  projects: Project[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface ProjectStatusResponse {
  project_id: string;
  display_name: string;
  api_version: string;
  status: string;
  deployment: {
    deployment_id: string;
    status: 'pending' | 'building' | 'live' | 'failed' | 'rolled_back';
    created_at: string;
    completed_at?: string;
    duration_seconds?: number;
    age_seconds: number;
    error?: string;
  } | null;
  deployer: {
    name?: string;
    email?: string;
    avatar_url?: string;
    github_username?: string;
  };
}


