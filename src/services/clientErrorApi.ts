import axios from 'axios';
import { getEnvironmentConfig } from '../config/environments';
import { getVersionInfo } from '../config/version';

export const CLIENT_ERROR_ENDPOINT = '/api/client-errors';

const MAX_MESSAGE = 500;
const MAX_STACK = 4000;
const MAX_PER_MINUTE = 5;

export interface ClientErrorPayload {
  name: string;
  message: string;
  stack?: string;
  route: string;
  appVersion: string;
  userAgent: string;
  occurredAt: string;
  sessionId: string;
}

/**
 * Numbers that look like glucose readings are stripped before transmission.
 * This is a health app: an error string is not a licence to ship a reading.
 */
function redact(text: string): string {
  return text
    .replace(/\b\d+([.,]\d+)?\s*(mmol\/L|mg\/dL)\b/gi, '[redacted]')
    .replace(/\b\d+([.,]\d+)?\s*(g\b|units?\b|u\b)/gi, '[redacted]');
}

const sessionId = globalThis.crypto?.randomUUID?.() ?? '00000000-0000-4000-8000-000000000000';

export function buildErrorPayload(error: Error, context: { route: string }): ClientErrorPayload {
  return {
    name: error.name,
    message: redact(error.message).slice(0, MAX_MESSAGE),
    stack: error.stack?.slice(0, MAX_STACK),
    route: context.route,
    appVersion: getVersionInfo().version,
    userAgent: navigator.userAgent,
    occurredAt: new Date().toISOString(),
    sessionId,
  };
}

let sentThisMinute = 0;
let windowStart = Date.now();

export function reportClientError(error: Error, context: { route: string }): void {
  if (import.meta.env.REACT_APP_ENABLE_ERROR_REPORTING !== 'true') return;

  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    sentThisMinute = 0;
  }
  // A render loop must not flood the endpoint with thousands of identical errors.
  if (sentThisMinute >= MAX_PER_MINUTE) return;
  sentThisMinute += 1;

  const url = `${getEnvironmentConfig().backendUrl}${CLIENT_ERROR_ENDPOINT}`;
  void axios.post(url, buildErrorPayload(error, context)).catch(() => {
    // Reporting a failure must never itself fail loudly.
  });
}
