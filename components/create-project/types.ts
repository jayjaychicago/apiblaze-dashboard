export type SourceType = 'github' | 'targetUrl' | 'upload';

export type SocialProvider = 'google' | 'facebook' | 'github' | 'microsoft' | 'auth0' | 'other';

export type QuotaInterval = 'day' | 'week' | 'month';

export interface TargetServerConfig {
  type: 'header' | 'parameter' | 'bodyVar';
  name: string;
  value: string;
}

export interface TargetServer {
  stage: string;
  targetUrl: string;
  config: TargetServerConfig[];
}

export interface CustomDomain {
  domain: string;
  verified: boolean;
}

export interface ProjectConfig {
  // General
  projectName: string;
  apiVersion: string;
  sourceType: SourceType;
  githubUser: string;
  githubRepo: string;
  githubPath: string;
  githubBranch: string;
  targetUrl: string;
  uploadedFile: File | null;
  
  // Authentication
  userGroupName: string;
  enableApiKey: boolean;
  enableSocialAuth: boolean;
  bringOwnProvider: boolean;
  socialProvider: SocialProvider;
  identityProviderDomain: string;
  identityProviderClientId: string;
  identityProviderClientSecret: string;
  authorizedScopes: string[];
  
  // Target Servers
  targetServers: TargetServer[];
  
  // Portal
  createPortal: boolean;
  portalLogoUrl: string;
  
  // Throttling
  throttlingRate: number;
  throttlingBurst: number;
  quota: number;
  quotaInterval: QuotaInterval;
  
  // Pre/Post Processing
  preProcessingPath: string;
  postProcessingPath: string;
  
  // Domains
  customDomains: CustomDomain[];
}

