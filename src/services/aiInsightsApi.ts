import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { authService } from './authService';

export interface AiPattern {
  code: string;
  description: string;
  severity: string;
}

export interface AiRecommendation {
  code: string;
  text: string;
  priority: string;
}

export interface AiEvidence {
  chunkId: string;
  title: string;
  conditionTag: string;
}

export interface AiAnalysisResponse {
  summary: string;
  detectedPatterns: AiPattern[];
  likelyMistakes: AiPattern[];
  recommendations: AiRecommendation[];
  evidenceRefs: AiEvidence[];
  confidence: number;
  disclaimer: string;
  modelId: string;
  latencyMs: number;
  generatedAt: string;
}

const config = getEnvironmentConfig();

const api = axios.create({
  baseURL: config.backendUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((req) => {
  if (!authService.isAuthenticated() || authService.getIsLoggingOut()) {
    return Promise.reject(new Error('User not authenticated or logout in progress'));
  }
  const token = localStorage.getItem('accessToken');
  if (token) req.headers.Authorization = `Bearer ${token}`;
  return req;
});

export const aiInsightsApi = {
  async analyzeRetrospective(windowHours: number = 12): Promise<AiAnalysisResponse> {
    const { data } = await api.post<AiAnalysisResponse>('/api/ai-insights/retrospective', { windowHours });
    return data;
  },
};
