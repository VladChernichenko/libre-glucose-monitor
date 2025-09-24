import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { authService } from './authService';
import { showErrorToast } from '../utils/toast';
import { getClientTimeInfo } from '../utils/timezone';

export interface GlucoseCalculationsResponse {
  // Active Carbs (COB)
  activeCarbsOnBoard: number;
  activeCarbsUnit: string;
  
  // Active Insulin (IOB)
  activeInsulinOnBoard: number;
  activeInsulinUnit: string;
  
  // 2-Hour Prediction
  twoHourPrediction: number;
  predictionTrend: 'rising' | 'falling' | 'stable';
  predictionUnit: string;
  
  // Current glucose reading used for calculations
  currentGlucose: number;
  currentGlucoseUnit: string;
  
  // Calculation metadata
  calculatedAt: string;
  confidence: number;
  
  // Breakdown of factors contributing to prediction
  factors: PredictionFactors;
}

export interface PredictionFactors {
  carbContribution: number;     // mmol/L glucose rise from remaining carbs
  insulinContribution: number;  // mmol/L glucose drop from remaining insulin
  baselineContribution: number; // mmol/L from baseline trend
  trendContribution: number;    // mmol/L from glucose trend
}

const config = getEnvironmentConfig();

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: `${config.backendUrl}/api/glucose-calculations`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token and check authentication
apiClient.interceptors.request.use((config) => {
  // Check if user is still authenticated or logout is in progress
  if (!authService.isAuthenticated() || authService.getIsLoggingOut()) {
    console.log('🚫 Blocking glucose calculations API request - user not authenticated or logout in progress');
    return Promise.reject(new Error('User not authenticated or logout in progress'));
  }
  
  const token = localStorage.getItem('accessToken');
  console.log('🔍 Glucose Calculations API Request:', {
    url: (config.baseURL || '') + (config.url || ''),
    method: config.method,
    hasToken: !!token,
    params: config.params
  });
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    console.log('✅ Glucose Calculations API Success:', {
      status: response.status,
      url: response.config.url,
      data: response.data
    });
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error('❌ Glucose Calculations API Error:', {
      status: error.response?.status,
      statusText: error.response?.statusText,
      url: error.config?.url,
      message: error.message,
      data: error.response?.data
    });

    // Handle token refresh for 401 errors
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        console.log('🔄 Attempting token refresh for Glucose Calculations API...');
        const newToken = await authService.refreshAccessToken();
        if (newToken) {
          console.log('✅ Token refreshed successfully, retrying request');
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        authService.logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.log('🚫 Access forbidden (403), logging out user');
      authService.logout();
      showErrorToast('Access denied. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return Promise.reject(error);
    }

    // Handle 404 User Not Found
    if (error.response?.status === 404 && 
        error.response?.data?.error === 'User not found') {
      console.log('👤 User not found, logging out user');
      authService.logout();
      showErrorToast('Your account was not found. Redirecting to login...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export const glucoseCalculationsApi = {
  /**
   * Get comprehensive glucose calculations for the current user
   */
  async getGlucoseCalculations(currentGlucose: number): Promise<GlucoseCalculationsResponse> {
    try {
      // Include client time information for accurate calculations
      const clientTimeInfo = getClientTimeInfo();
      
      const response = await apiClient.post('/', {
        currentGlucose,
        clientTimeInfo,
        includePredictionFactors: true
      });
      
      // Check if response indicates backend mode
      if (response.data.backendMode === true && response.data.data) {
        console.log('✅ Using backend calculations data:', response.data.data);
        return response.data.data; // Extract nested data object
      } else {
        console.log('ℹ️ Backend response indicates frontend logic should be used:', response.data.message);
        throw new Error(response.data.message || 'Backend calculations not available for this user');
      }
    } catch (error) {
      console.error('Error fetching glucose calculations:', error);
      throw error;
    }
  },

};

export default glucoseCalculationsApi;
