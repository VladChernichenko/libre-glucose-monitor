import { InternalAxiosRequestConfig } from 'axios';
import { getClientTimeInfo } from '../utils/timezone';

export function applyClientContextHeaders(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  const timeInfo = getClientTimeInfo();
  const headers = (config.headers ?? {}) as Record<string, string>;
  headers['X-Timezone'] = timeInfo.timezone;
  headers['X-Timezone-Offset'] = String(timeInfo.timezoneOffset);
  config.headers = headers as any;
  return config;
}
