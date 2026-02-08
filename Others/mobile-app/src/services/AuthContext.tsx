import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, NavigationState } from '../types';
import { authAPI } from './api';
import { storeAuthData, getStoredAuthData, clearAuthData } from '../utils/storage';

interface AuthContextType extends NavigationState {
  login: (email: string, password: string) => Promise<boolean>;
  loginWithGitHub: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => Promise<boolean>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, setState] = useState<NavigationState>({
    isAuthenticated: false,
    isLoading: true,
    user: undefined,
  });

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const storedAuth = await getStoredAuthData();
      if (storedAuth && storedAuth.token) {
        const userResponse = await authAPI.getCurrentUser(storedAuth.token);
        if (userResponse.success && userResponse.data) {
          setState({
            isAuthenticated: true,
            isLoading: false,
            user: userResponse.data,
          });
        } else {
          await clearAuthData();
          setState({
            isAuthenticated: false,
            isLoading: false,
            user: undefined,
          });
        }
      } else {
        setState({
          isAuthenticated: false,
          isLoading: false,
          user: undefined,
        });
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      await clearAuthData();
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: undefined,
      });
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authAPI.login(email, password);
      
      if (response.success && response.data) {
        await storeAuthData({
          token: response.data.token,
          user: response.data.user,
        });
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: response.data.user,
        });
        
        return true;
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const loginWithGitHub = async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const response = await authAPI.loginWithGitHub();
      
      if (response.success && response.data) {
        await storeAuthData({
          token: response.data.token,
          user: response.data.user,
        });
        
        setState({
          isAuthenticated: true,
          isLoading: false,
          user: response.data.user,
        });
        
        return true;
      }
      
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    } catch (error) {
      console.error('GitHub login error:', error);
      setState(prev => ({ ...prev, isLoading: false }));
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await clearAuthData();
      setState({
        isAuthenticated: false,
        isLoading: false,
        user: undefined,
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const updateUser = async (updates: Partial<User>): Promise<boolean> => {
    try {
      if (!state.user) return false;
      
      const response = await authAPI.updateUser(state.user.id, updates);
      
      if (response.success && response.data) {
        setState(prev => ({
          ...prev,
          user: { ...prev.user!, ...response.data },
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Update user error:', error);
      return false;
    }
  };

  const refreshUser = async (): Promise<void> => {
    try {
      const storedAuth = await getStoredAuthData();
      if (storedAuth && storedAuth.token) {
        const userResponse = await authAPI.getCurrentUser(storedAuth.token);
        if (userResponse.success && userResponse.data) {
          setState(prev => ({
            ...prev,
            user: userResponse.data,
          }));
        }
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const value: AuthContextType = {
    ...state,
    login,
    loginWithGitHub,
    logout,
    updateUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
