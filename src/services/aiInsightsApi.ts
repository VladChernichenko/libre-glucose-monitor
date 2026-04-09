import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { applyClientContextHeaders } from './clientContextHeaders';
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
  sourceName?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  sourceTopic?: string;
  evidenceLevel?: string;
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
  contextWindowTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  remainingContextTokens?: number;
  latencyMs: number;
  generatedAt: string;
}

export interface AiChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface AiRuntimeOptions {
  model?: string;
  numCtx?: number;
}

export type AiStreamEvent =
  | { type: 'token'; token: string }
  | { type: 'result'; result: AiAnalysisResponse }
  | {
      type: 'done';
      promptTokens?: number;
      completionTokens?: number;
      totalTokens?: number;
      contextWindowTokens?: number;
      remainingContextTokens?: number;
    }
  | { type: 'error'; message: string };

const config = getEnvironmentConfig();

const api = axios.create({
  baseURL: config.backendUrl,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((req) => {
  applyClientContextHeaders(req);
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

  async analyzeRetrospectiveStream(
    windowHours: number,
    onEvent: (event: AiStreamEvent) => void,
    options?: {
      followUpQuestion?: string;
      conversationTurns?: AiChatTurn[];
      runtime?: AiRuntimeOptions;
    },
    signal?: AbortSignal,
  ): Promise<void> {
    if (!authService.isAuthenticated() || authService.getIsLoggingOut()) {
      throw new Error('User not authenticated or logout in progress');
    }

    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${config.backendUrl}/api/ai-insights/retrospective/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        windowHours,
        followUpQuestion: options?.followUpQuestion,
        conversationTurns: options?.conversationTurns,
        model: options?.runtime?.model,
        numCtx: options?.runtime?.numCtx,
      }),
      signal,
    });

    if (!response.ok || !response.body) {
      throw new Error(`AI stream failed with status ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        onEvent(JSON.parse(trimmed) as AiStreamEvent);
      }
    }

    const tail = buffer.trim();
    if (tail) {
      onEvent(JSON.parse(tail) as AiStreamEvent);
    }
  },
};
