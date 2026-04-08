import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { authService } from './authService';

export interface NutritionSnapshot {
  absorptionMode: string;
  source: string;
  confidence?: number;
  totalCarbs?: number;
  fiber?: number;
  protein?: number;
  fat?: number;
  estimatedGi?: number;
  glycemicLoad?: number;
  absorptionSpeedClass?: string;
  normalizedFoods?: string[];
}

const config = getEnvironmentConfig();

const api = axios.create({
  baseURL: `${config.backendUrl}/api/nutrition`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((requestConfig) => {
  const token = authService.getAccessToken();
  if (token) {
    requestConfig.headers.Authorization = `Bearer ${token}`;
  }
  return requestConfig;
});

export const nutritionApi = {
  async analyzeIngredients(ingredientsText: string, fallbackCarbs?: number): Promise<NutritionSnapshot> {
    const response = await api.post<NutritionSnapshot>('/analyze', {
      ingredientsText,
      fallbackCarbs,
    });
    return response.data;
  },
};

