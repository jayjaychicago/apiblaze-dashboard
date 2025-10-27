/**
 * Auth Store
 * Global authentication state using Zustand
 */

import { create } from 'zustand';
import { User } from '@/lib/auth';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  setAuth: (token: string, user: User) => void;
  clearAuth: () => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isLoading: true,
  
  setAuth: (token: string, user: User) => {
    // Store token in localStorage for client-side access
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    set({ 
      accessToken: token, 
      user, 
      isAuthenticated: true,
      isLoading: false
    });
  },
  
  clearAuth: () => {
    // Clear from storage
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    
    set({ 
      accessToken: null, 
      user: null, 
      isAuthenticated: false,
      isLoading: false
    });
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  }
}));

/**
 * Initialize auth state from localStorage on app load
 * This runs only on the client side
 */
export function initializeAuth() {
  if (typeof window === 'undefined') return;
  
  const token = localStorage.getItem('access_token');
  const userStr = localStorage.getItem('user');
  
  if (token && userStr) {
    try {
      const user = JSON.parse(userStr);
      useAuthStore.setState({
        accessToken: token,
        user,
        isAuthenticated: true,
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to parse stored user:', error);
      useAuthStore.setState({ isLoading: false });
    }
  } else {
    useAuthStore.setState({ isLoading: false });
  }
}

