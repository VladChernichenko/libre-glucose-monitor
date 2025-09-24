import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { authService } from '../services/authService';
import { AuthState, User, AuthRequest, RegisterRequest } from '../types/auth';

// Action types
type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; accessToken: string; refreshToken: string } }
  | { type: 'AUTH_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'CLEAR_ERROR' };

// Initial state
const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

// Reducer
const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'AUTH_START':
      return {
        ...state,
        isLoading: true,
        error: null,
      };
    case 'AUTH_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshToken: action.payload.refreshToken,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'AUTH_FAILURE':
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };
    default:
      return state;
  }
};

// Context interface
interface AuthContextType extends AuthState {
  login: (credentials: AuthRequest) => Promise<void>;
  register: (userData: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  testConnection: () => Promise<boolean>;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Check if user is already authenticated on app start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (authService.isAuthenticated()) {
          const user = await authService.getCurrentUser();
          if (user) {
            const accessToken = authService.getAccessToken();
            const refreshToken = authService.getRefreshToken();
            if (accessToken && refreshToken) {
              dispatch({
                type: 'AUTH_SUCCESS',
                payload: { user, accessToken, refreshToken }
              });
            } else {
              dispatch({ type: 'LOGOUT' });
            }
          } else {
            dispatch({ type: 'LOGOUT' });
          }
        } else {
          dispatch({ type: 'AUTH_FAILURE', payload: '' });
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        dispatch({ type: 'LOGOUT' });
      }
    };

    initializeAuth();
  }, []);

  const login = async (credentials: AuthRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const authResponse = await authService.login(credentials);
      const user = await authService.getCurrentUser();
      
      if (user) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken
          }
        });
      } else {
        // If we can't get user info, still allow login with minimal user data
        const token = authService.getAccessToken();
        if (token) {
          const decoded = authService.decodeToken(token);
          if (decoded && decoded.sub) {
            const fallbackUser = {
              id: decoded.sub,
              username: decoded.sub,
              email: decoded.email || '',
              fullName: decoded.fullName || decoded.sub
            };
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: fallbackUser,
                accessToken: authResponse.accessToken,
                refreshToken: authResponse.refreshToken
              }
            });
          } else {
            throw new Error('Failed to get user information');
          }
        } else {
          throw new Error('Failed to get user information');
        }
      }
    } catch (error) {
      let errorMessage = 'Login failed';
      
      // Handle specific error cases
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      // Check if it's a user not found error
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        errorMessage = 'User account not found. Please check your credentials or contact support.';
      }
      
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const register = async (userData: RegisterRequest) => {
    try {
      dispatch({ type: 'AUTH_START' });
      
      const authResponse = await authService.register(userData);
      const user = await authService.getCurrentUser();
      
      if (user) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user,
            accessToken: authResponse.accessToken,
            refreshToken: authResponse.refreshToken
          }
        });
      } else {
        // If we can't get user info, still allow registration with minimal user data
        const token = authService.getAccessToken();
        if (token) {
          const decoded = authService.decodeToken(token);
          if (decoded && decoded.sub) {
            const fallbackUser = {
              id: decoded.sub,
              username: decoded.sub,
              email: decoded.email || '',
              fullName: decoded.fullName || decoded.sub
            };
            dispatch({
              type: 'AUTH_SUCCESS',
              payload: {
                user: fallbackUser,
                accessToken: authResponse.accessToken,
                refreshToken: authResponse.refreshToken
              }
            });
          } else {
            throw new Error('Failed to get user information');
          }
        } else {
          throw new Error('Failed to get user information');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'AUTH_FAILURE', payload: errorMessage });
      throw error;
    }
  };

  const logout = async () => {
    try {
      console.log('🔄 AuthContext: Starting logout process...');
      const success = await authService.logout();
      console.log('🔄 AuthContext: authService.logout() returned:', success);
      dispatch({ type: 'LOGOUT' });
      console.log('✅ AuthContext: Logout completed successfully');
    } catch (error) {
      console.error('❌ AuthContext: Logout failed:', error);
      // Still dispatch logout to clear frontend state
      dispatch({ type: 'LOGOUT' });
    }
  };

  const clearError = () => {
    dispatch({ type: 'CLEAR_ERROR' });
  };

  const testConnection = async (): Promise<boolean> => {
    return await authService.testConnection();
  };

  const value: AuthContextType = {
    ...state,
    login,
    register,
    logout,
    clearError,
    testConnection,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
