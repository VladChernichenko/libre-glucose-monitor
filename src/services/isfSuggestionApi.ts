import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { applyClientContextHeaders } from './clientContextHeaders';
import { authService } from './authService';

/** Mirrors IsfMealWindowSuggestionDTO.WindowProposal in the backend. */
export interface WindowProposal {
  mealWindow: string;
  currentIsf?: number;
  proposedIsf?: number;
  hasData?: boolean;
  weightedSamples?: number;
}

/** Mirrors IsfMealWindowSuggestionDTO. Fields are omitted when null. */
export interface IsfSuggestion {
  show: boolean;
  suppressReason?: string;
  twinReady?: boolean;
  twinApplied?: boolean;
  windows?: WindowProposal[];
}

const api = axios.create({
  baseURL: `${getEnvironmentConfig().backendUrl}/api/isf/meal-windows`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  applyClientContextHeaders(config);
  if (!authService.isAuthenticated() || authService.getIsLoggingOut()) {
    return Promise.reject(new Error('User not authenticated or logout in progress'));
  }
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Same refresh-and-retry contract as glucoseCalculationsApi, so a suggestion
// request does not log the user out on a merely expired access token.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      const newToken = await authService.refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export const isfSuggestionApi = {
  async fetch(): Promise<IsfSuggestion> {
    const res = await api.get<IsfSuggestion>('/suggestion');
    return res.data;
  },
  async accept(): Promise<void> {
    await api.post('/suggestion/accept');
  },
  async dismiss(): Promise<void> {
    await api.post('/suggestion/dismiss');
  },
};
