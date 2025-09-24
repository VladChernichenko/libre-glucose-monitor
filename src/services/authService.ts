import axios, { AxiosInstance } from 'axios';
import { 
  AuthRequest, 
  RegisterRequest, 
  AuthResponse, 
  RefreshTokenRequest,
  User 
} from '../types/auth';
import { getEnvironmentConfig } from '../config/environments';
import { showErrorToast } from '../utils/toast';

class AuthService {
  private api: AxiosInstance;
  private baseUrl: string;
  private isLoggingOut: boolean = false;

  constructor() {
    // Get environment-specific configuration
    const config = getEnvironmentConfig();
    this.baseUrl = config.backendUrl;
    
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: true, // Enabled for production backend with proper CORS
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
        // Block requests if logout is in progress, EXCEPT for logout endpoint
        if (this.isLoggingOut && !config.url?.includes('/api/auth/logout')) {
          console.log('🚫 Blocking request - logout in progress');
          return Promise.reject(new Error('Logout in progress'));
        }
        
        const token = this.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle token refresh and user not found
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            console.log('🔄 Token refresh failed, logging out user');
            await this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        // Handle 403 Forbidden - insufficient permissions or invalid token
        if (error.response?.status === 403) {
          console.log('🚫 Access forbidden (403), logging out user');
          await this.logout();
          showErrorToast('Access denied. Redirecting to login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000);
          return Promise.reject(error);
        }

        // Handle 404 User Not Found - user account deleted or deactivated
        if (error.response?.status === 404 && 
            error.response?.data?.error === 'User not found') {
          console.log('👤 User not found, logging out user');
          this.logout();
          // Show a user-friendly toast message
          showErrorToast('Your account was not found. Redirecting to login...');
          setTimeout(() => {
            window.location.href = '/login';
          }, 2000); // Give user time to read the message
          return Promise.reject(error);
        }

        return Promise.reject(error);
      }
    );
  }

  async login(credentials: AuthRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/login', credentials);
      const authData = response.data;
      
      this.setTokens(authData.accessToken, authData.refreshToken);
      return authData;
    } catch (error) {
      console.error('Login failed:', error);
      throw new Error('Login failed. Please check your credentials.');
    }
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    try {
      const response = await this.api.post<AuthResponse>('/api/auth/register', userData);
      const authData = response.data;
      
      this.setTokens(authData.accessToken, authData.refreshToken);
      return authData;
    } catch (error) {
      console.error('Registration failed:', error);
      if (axios.isAxiosError(error) && error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error('Registration failed. Please try again.');
    }
  }

  async refreshAccessToken(): Promise<string | null> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        return null;
      }

      const response = await this.api.post<AuthResponse>('/api/auth/refresh', {
        refreshToken
      } as RefreshTokenRequest);
      
      const authData = response.data;
      this.setTokens(authData.accessToken, authData.refreshToken);
      return authData.accessToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return null;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await this.api.get<User>('/api/users/me');
      return response.data;
    } catch (error) {
      console.error('Failed to get current user:', error);
      
      // Fallback: Try to decode user info from JWT token
      const token = this.getAccessToken();
      if (token) {
        try {
          const decoded = this.decodeToken(token);
          if (decoded && decoded.sub) {
            // Create a minimal user object from JWT claims
            return {
              id: decoded.sub, // Use username as ID
              username: decoded.sub,
              email: decoded.email || '',
              fullName: decoded.fullName || decoded.sub
            };
          }
        } catch (decodeError) {
          console.error('Failed to decode token:', decodeError);
        }
      }
      
      return null;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get('/api/auth/test');
      return response.status === 200;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAccessToken();
  }

  async logout(): Promise<boolean> {
    console.log('🔄 AuthService: logout() called');
    try {
      const accessToken = this.getAccessToken();
      const refreshToken = this.getRefreshToken();
      console.log('🔄 AuthService: tokens retrieved:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'none'
      });
      
      if (accessToken) {
        // Call backend logout endpoint FIRST to blacklist tokens
        try {
          console.log('🔄 AuthService: Calling backend logout endpoint...');
          const response = await this.api.post('/api/auth/logout', {
            accessToken,
            refreshToken
          });
          console.log('🔄 AuthService: Backend logout response:', response.data);
          
          if (response.data.success) {
            console.log('✅ AuthService: Backend logout successful');
          } else {
            console.warn('⚠️ AuthService: Backend logout failed:', response.data.message);
          }
        } catch (backendError) {
          // Don't fail logout if backend call fails
          console.error('❌ AuthService: Backend logout call failed:', backendError);
          console.warn('⚠️ AuthService: Local logout will proceed despite backend failure');
        }
      } else {
        console.log('ℹ️ AuthService: No access token found, skipping backend logout call');
      }
      
      // Set logout flag to block any new requests AFTER backend call
      this.isLoggingOut = true;
      
      // Clear tokens after backend call
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      console.log('🔄 AuthService: Local storage cleared');
      
      return true;
    } catch (error) {
      console.error('❌ AuthService: Logout error:', error);
      
      // Ensure local storage is cleared even on error
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      
      return false;
    } finally {
      // Reset logout flag
      this.isLoggingOut = false;
      console.log('🔄 AuthService: Logout process completed, flag reset');
    }
  }

  getIsLoggingOut(): boolean {
    return this.isLoggingOut;
  }

  async logoutAllDevices(): Promise<boolean> {
    try {
      const response = await this.api.post('/api/auth/logout-all');
      
      if (response.data.success) {
        // Clear local storage after successful logout from all devices
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        console.log('✅ Logged out from all devices');
        return true;
      } else {
        console.warn('⚠️ Logout all devices failed:', response.data.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Logout all devices error:', error);
      return false;
    }
  }

  // Helper method to decode JWT token (for debugging)
  decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Failed to decode token:', error);
      return null;
    }
  }
}

export const authService = new AuthService();
