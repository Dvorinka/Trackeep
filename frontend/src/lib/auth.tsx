import { createContext, useContext, type ParentComponent, onMount } from 'solid-js';
import { createStore } from 'solid-js/store';
import { isEnvDemoMode } from '@/lib/demo-mode';
import { getApiV1BaseUrl } from '@/lib/api-url';

// Demo mode is controlled by environment only.
const isDemoMode = () => {
  return isEnvDemoMode();
};

// Types
export interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  theme: string;
  created_at: string;
  updated_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  fullName: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

// API base URL
const API_BASE_URL = getApiV1BaseUrl();

// Create auth context
const AuthContext = createContext<AuthContextType>();

export interface AuthContextType {
  authState: AuthState;
  login: (credentials: LoginRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => void;
  updateProfile: (data: { fullName?: string; theme?: string }) => Promise<void>;
  changePassword: (data: { currentPassword: string; newPassword: string }) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (code: string, password: string) => Promise<void>;
  setAuth: (token: string, user: User) => void;
}

// Auth provider component
export const AuthProvider: ParentComponent = (props) => {
  const [authState, setAuthState] = createStore<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  onMount(() => {
    console.log('[Auth] onMount: Initializing auth state');
    
    // First check if demo mode should be cleared
    if (!isDemoMode()) {
      console.log('[Auth] onMount: Demo mode disabled, clearing demo-specific data only');
      // Only clear demo mode data, not legitimate user auth data
      localStorage.removeItem('demoMode');
      
      // Check for existing non-demo auth
      const token = localStorage.getItem('trackeep_token') || localStorage.getItem('token');
      const userStr = localStorage.getItem('trackeep_user') || localStorage.getItem('user');
      
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          console.log('[Auth] onMount: Found existing auth, restoring:', user);
          setAuthState({
            user,
            token,
            isAuthenticated: true,
            isLoading: false,
          });
          
          // Apply theme
          if (user.theme === 'dark') {
            document.documentElement.setAttribute('data-kb-theme', 'dark');
          } else {
            document.documentElement.removeAttribute('data-kb-theme');
          }
        } catch (error) {
          console.error('[Auth] onMount: Failed to parse user data:', error);
          clearAuth();
        }
      } else {
        console.log('[Auth] onMount: No existing auth found, setting isLoading to false');
        setAuthState('isLoading', false);
        // Set dark mode by default when not authenticated
        document.documentElement.setAttribute('data-kb-theme', 'dark');
      }
      return;
    }
    
    // Demo mode is enabled - use in-memory auth only
    console.log('[Auth] onMount: Demo mode enabled, using in-memory auth');
    const mockUser = {
      id: 1,
      email: 'demo@trackeep.com',
      username: 'demo',
      full_name: 'Demo User',
      theme: 'dark',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const mockToken = 'demo-token-' + Date.now();
    
    setAuthState({
      user: mockUser,
      token: mockToken,
      isAuthenticated: true,
      isLoading: false,
    });
    
    // Apply theme
    document.documentElement.setAttribute('data-kb-theme', 'dark');
    document.title = 'Trackeep - Demo Mode';
  });


  const clearAuth = () => {
    localStorage.removeItem('trackeep_token');
    localStorage.removeItem('trackeep_user');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('demoMode');
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });
    // Reset to dark mode on logout
    document.documentElement.setAttribute('data-kb-theme', 'dark');
  };

  const setAuth = (token: string, user: User) => {
    console.log('[Auth] setAuth called with:', { token, user });
    
    // Only store in localStorage if not in demo mode
    if (!isDemoMode()) {
      localStorage.setItem('trackeep_token', token);
      localStorage.setItem('trackeep_user', JSON.stringify(user));
      // Also set the legacy keys for compatibility
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
    
    console.log('[Auth] setAuth: Updating auth state');
    setAuthState({
      user,
      token,
      isAuthenticated: true,
      isLoading: false,
    });
    
    console.log('[Auth] setAuth: Auth state updated');
    // Apply theme immediately
    if (user.theme === 'dark') {
      document.documentElement.setAttribute('data-kb-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-kb-theme');
    }
  };

  const login = async (credentials: LoginRequest) => {
    try {
      // In demo mode, use mock login
      if (isDemoMode()) {
        const mockUser: User = {
          id: 1,
          email: 'demo@trackeep.com',
          username: 'demo',
          full_name: 'Demo User',
          theme: 'dark',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const mockToken = 'demo-token-' + Date.now();
        setAuth(mockToken, mockUser);
        return;
      }

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        let error;
        try {
          const errorData = await response.json();
          error = errorData.error || 'Login failed';
        } catch (jsonError) {
          // Handle non-JSON error responses
          const text = await response.text();
          error = text || `Login failed with status ${response.status}`;
        }
        throw new Error(error);
      }

      const data: AuthResponse = await response.json();
      setAuth(data.token, data.user);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data: AuthResponse = await response.json();
      setAuth(data.token, data.user);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      if (authState.token) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authState.token}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuth();
    }
  };

  const updateProfile = async (data: { fullName?: string; theme?: string }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Profile update failed');
      }

      const result = await response.json();
      const updatedUser = result.user;
      
      localStorage.setItem('trackeep_user', JSON.stringify(updatedUser));
      localStorage.setItem('user', JSON.stringify(updatedUser)); // Keep legacy key
      setAuthState('user', updatedUser);
      
      // Apply theme change immediately
      if (updatedUser.theme === 'dark') {
        document.documentElement.setAttribute('data-kb-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-kb-theme');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      throw error;
    }
  };

  const changePassword = async (data: { currentPassword: string; newPassword: string }) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authState.token}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Password change failed');
      }
    } catch (error) {
      console.error('Password change error:', error);
      throw error;
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Password reset request failed');
      }
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  };

  const confirmPasswordReset = async (code: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/password-reset/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Password reset confirmation failed');
      }
    } catch (error) {
      console.error('Password reset confirmation error:', error);
      throw error;
    }
  };

  const authContextValue: AuthContextType = {
    authState,
    login,
    register,
    logout,
    updateProfile,
    changePassword,
    requestPasswordReset,
    confirmPasswordReset,
    setAuth,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {props.children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Helper function to get auth headers for API requests
export const getAuthHeaders = () => {
  const isDemo = isDemoMode();
  let token = null;
  
  if (isDemo) {
    token = localStorage.getItem('token') || localStorage.getItem('trackeep_token') || ('demo-token-' + Date.now());
  } else {
    token = localStorage.getItem('token') || localStorage.getItem('trackeep_token');
  }
  
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};
