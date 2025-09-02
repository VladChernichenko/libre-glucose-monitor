import axios, { AxiosInstance } from 'axios';
import { 
  AuthRequest, 
  RegisterRequest, 
  AuthResponse, 
  RefreshTokenRequest,
  User 
} from '../types/auth';

class AuthService {
  private api: AxiosInstance;
  private baseUrl: string;

  constructor() {
    // In Docker, backend is accessible via the same origin (no CORS needed)
    const isDocker = process.env.REACT_APP_DOCKER === 'true';
    this.baseUrl = isDocker ? '/api' : (process.env.REACT_APP_BACKEND_URL || 'http://localhost:8080');
    
    this.api = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      withCredentials: false, // Disabled for now due to CORS configuration
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use(
      (config) => {
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

    // Add response interceptor to handle token refresh
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshAccessToken();
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.logout();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
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

  logout(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
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
