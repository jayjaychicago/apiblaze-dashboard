'use client';

/**
 * Cache utility for GitHub repositories search results.
 * Caches results in localStorage until user logs out.
 */

const CACHE_KEY = 'github_repos_cache';

export interface CachedGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  default_branch: string;
  updated_at: string;
  language: string;
  stargazers_count: number;
}

/**
 * Get cached GitHub repositories
 * @returns Cached repos array or null if cache doesn't exist or is invalid
 */
export function getCachedGitHubRepos(): CachedGitHubRepo[] | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) {
      return null;
    }

    const parsed = JSON.parse(cached) as CachedGitHubRepo[];
    
    // Validate that it's an array
    if (!Array.isArray(parsed)) {
      clearGitHubReposCache();
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[GitHub Cache] Error reading cache:', error);
    clearGitHubReposCache();
    return null;
  }
}

/**
 * Cache GitHub repositories
 * @param repos - Array of GitHub repositories to cache
 */
export function setCachedGitHubRepos(repos: CachedGitHubRepo[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(repos));
  } catch (error) {
    console.error('[GitHub Cache] Error writing cache:', error);
  }
}

/**
 * Clear the GitHub repositories cache
 * Should be called when user logs out
 */
export function clearGitHubReposCache(): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    localStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.error('[GitHub Cache] Error clearing cache:', error);
  }
}

