import React, { useEffect, useRef, useState } from 'react';
import { aiInsightsApi, AiAnalysisResponse, AiStreamEvent } from '../services/aiInsightsApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const STREAM_STUCK_TIMEOUT_MS = 20000;
const LONG_DECIMAL_PATTERN = /\b\d+\.\d{2,}\b/g;

const AIInsightPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<AiAnalysisResponse | null>(null);
  const [streamText, setStreamText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamUsage, setStreamUsage] = useState<{
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    contextWindowTokens?: number;
    remainingContextTokens?: number;
  } | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);
  const stoppedByUserRef = useRef(false);
  const stoppedByTimeoutRef = useRef(false);
  const lastStreamActivityAtRef = useRef<number>(0);
  const streamWatchdogRef = useRef<number | null>(null);

  const stopAnalysis = () => {
    stoppedByUserRef.current = true;
    streamAbortRef.current?.abort();
    setIsLoading(false);
  };

  const normalizeNumericPrecision = (text: string): string => {
    return text.replace(LONG_DECIMAL_PATTERN, (raw) => {
      const value = Number(raw);
      if (!Number.isFinite(value)) return raw;
      return value.toFixed(1);
    });
  };

  const runAnalysis = async () => {
    streamAbortRef.current?.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;
    stoppedByUserRef.current = false;
    stoppedByTimeoutRef.current = false;
    lastStreamActivityAtRef.current = Date.now();

    if (streamWatchdogRef.current) {
      window.clearInterval(streamWatchdogRef.current);
    }
    streamWatchdogRef.current = window.setInterval(() => {
      if (!streamAbortRef.current) return;
      const idleMs = Date.now() - lastStreamActivityAtRef.current;
      if (idleMs >= STREAM_STUCK_TIMEOUT_MS) {
        stoppedByTimeoutRef.current = true;
        streamAbortRef.current.abort();
        setError('AI analysis got stuck (no response chunks). The process was stopped.');
        setIsLoading(false);
      }
    }, 1000);

    try {
      setIsLoading(true);
      setError(null);
      setResult(null);
      setStreamText('');
      setStreamUsage(null);
      await aiInsightsApi.analyzeRetrospectiveStream(
        12,
        (event: AiStreamEvent) => {
          if (event.type === 'token') {
            lastStreamActivityAtRef.current = Date.now();
            setStreamText((prev) => prev + event.token);
          } else if (event.type === 'result') {
            lastStreamActivityAtRef.current = Date.now();
            setResult(event.result);
          } else if (event.type === 'done') {
            lastStreamActivityAtRef.current = Date.now();
            setStreamUsage({
              promptTokens: event.promptTokens,
              completionTokens: event.completionTokens,
              totalTokens: event.totalTokens,
              contextWindowTokens: event.contextWindowTokens,
              remainingContextTokens: event.remainingContextTokens,
            });
          } else if (event.type === 'error') {
            lastStreamActivityAtRef.current = Date.now();
            setError(event.message || 'Failed to run AI analysis');
          }
        },
        controller.signal,
      );
    } catch (e) {
      if ((e as Error).name !== 'AbortError' && !stoppedByUserRef.current && !stoppedByTimeoutRef.current) {
        setError('Failed to run AI analysis');
      }
    } finally {
      setIsLoading(false);
      streamAbortRef.current = null;
      if (streamWatchdogRef.current) {
        window.clearInterval(streamWatchdogRef.current);
        streamWatchdogRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        stopAnalysis();
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  useEffect(() => {
    return () => {
      streamAbortRef.current?.abort();
      if (streamWatchdogRef.current) {
        window.clearInterval(streamWatchdogRef.current);
      }
    };
  }, []);

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          void runAnalysis();
        }}
        className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
      >
        AI Analyzer
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">AI Insight (12h)</h3>
              <button
                onClick={() => {
                  stopAnalysis();
                  setIsOpen(false);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close AI analyzer modal"
              >
                x
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-end mb-3">
        <button
          onClick={() => {
            if (isLoading) {
              stopAnalysis();
            } else {
              setIsOpen(false);
            }
          }}
          className="text-xs px-3 py-1.5 rounded bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300"
        >
          {isLoading ? 'Stop' : 'Close'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && !result && !streamText && <p className="text-xs text-gray-500">Starting analysis...</p>}
      {streamText && (
        <div className="mb-3 p-2 rounded border border-gray-200 bg-gray-50">
          <div className="text-[11px] font-medium text-gray-500 mb-1">Live model output</div>
          <div className="text-sm text-gray-800 break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li>{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {normalizeNumericPrecision(streamText)}
            </ReactMarkdown>
          </div>
          {streamUsage && (
            <div className="mt-2 text-[11px] text-gray-600">
              Tokens used: {streamUsage.totalTokens ?? 0} (prompt {streamUsage.promptTokens ?? 0}, completion {streamUsage.completionTokens ?? 0}){' '}
              | context: {streamUsage.contextWindowTokens ?? 0} | remaining: {streamUsage.remainingContextTokens ?? 0}
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="space-y-2 text-sm">
          <p className="text-gray-800"><span className="font-medium">Summary:</span> {normalizeNumericPrecision(result.summary)}</p>
          <p className="text-gray-600">Confidence: {(result.confidence * 100).toFixed(0)}% | Model: {result.modelId}</p>
          {(result.totalTokens ?? result.remainingContextTokens) !== undefined && (
            <p className="text-[11px] text-gray-600">
              Tokens used: {result.totalTokens ?? 0} (prompt {result.promptTokens ?? 0}, completion {result.completionTokens ?? 0}) | context:{' '}
              {result.contextWindowTokens ?? 0} | remaining: {result.remainingContextTokens ?? 0}
            </p>
          )}

          <div>
            <div className="font-medium text-gray-800">Likely mistakes</div>
            {result.likelyMistakes.length === 0 ? (
              <p className="text-gray-500">No obvious mistakes detected.</p>
            ) : (
              <ul className="list-disc list-inside text-gray-700">
                {result.likelyMistakes.map((m) => (
                  <li key={m.code}>{normalizeNumericPrecision(m.description)}</li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <div className="font-medium text-gray-800">Recommendations</div>
            {result.recommendations.length === 0 ? (
              <p className="text-gray-500">No recommendations.</p>
            ) : (
              <ul className="list-disc list-inside text-gray-700">
                {result.recommendations.map((r) => (
                  <li key={r.code}>{normalizeNumericPrecision(r.text)}</li>
                ))}
              </ul>
            )}
          </div>

          {result.evidenceRefs && result.evidenceRefs.length > 0 && (
            <div>
              <div className="font-medium text-gray-800">Evidence references</div>
              <ul className="list-disc list-inside text-gray-700">
                {result.evidenceRefs.map((e) => (
                  <li key={e.chunkId}>
                    {(e.sourceTitle || e.title) ?? 'Reference'} ({e.conditionTag})
                    {e.sourceTopic ? ` - ${e.sourceTopic}` : ''}
                    {e.sourceUrl ? (
                      <>
                        {' '}
                        <a
                          href={e.sourceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          open source
                        </a>
                      </>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-gray-500">{result.disclaimer}</p>
        </div>
      )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIInsightPanel;
