import React, { useEffect, useRef, useState } from 'react';
import { aiInsightsApi, AiStreamEvent, AiChatTurn } from '../services/aiInsightsApi';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const STREAM_STUCK_TIMEOUT_MS = 20000;
const LONG_DECIMAL_PATTERN = /\b\d+\.\d{2,}\b/g;
const MODEL_OPTIONS = ['llama3.1:8b', 'llama3.2:3b', 'llama3.2:1b', 'qwen2.5:7b', 'mistral:7b'];
const MEMORY_OPTIONS = [2048, 4096, 8192, 16384];
type ChatMessage = {
  id: string;
  role: 'assistant' | 'user';
  content: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    contextWindowTokens?: number;
    remainingContextTokens?: number;
  };
};

const AIInsightPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draftQuestion, setDraftQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canRetry, setCanRetry] = useState(false);
  const [modelName, setModelName] = useState(() => {
    const raw = localStorage.getItem('ai_runtime_model') || 'llama3.1:8b';
    return MODEL_OPTIONS.includes(raw) ? raw : 'llama3.1:8b';
  });
  const [numCtx, setNumCtx] = useState<number>(() => {
    const raw = localStorage.getItem('ai_runtime_num_ctx');
    const parsed = raw ? Number(raw) : 4096;
    const normalized = Number.isFinite(parsed) ? Math.max(512, Math.min(32768, parsed)) : 4096;
    return MEMORY_OPTIONS.includes(normalized) ? normalized : 4096;
  });
  const streamAbortRef = useRef<AbortController | null>(null);
  const stoppedByUserRef = useRef(false);
  const stoppedByTimeoutRef = useRef(false);
  const lastStreamActivityAtRef = useRef<number>(0);
  const streamWatchdogRef = useRef<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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

  const runAnalysis = async (
    question?: string,
    turns?: AiChatTurn[],
    runtimeOverride?: { model?: string; numCtx?: number },
  ) => {
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
        setCanRetry(true);
        setIsLoading(false);
      }
    }, 1000);

    try {
      setIsLoading(true);
      setError(null);
      setCanRetry(false);

      const assistantId = `assistant-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setMessages((prev) => [...prev, { id: assistantId, role: 'assistant', content: '' }]);

      const conversationTurns: AiChatTurn[] = turns ?? messages
        .slice(-10)
        .map((m) => ({ role: m.role, content: m.content }));

      await aiInsightsApi.analyzeRetrospectiveStream(
        12,
        (event: AiStreamEvent) => {
          if (event.type === 'token') {
            lastStreamActivityAtRef.current = Date.now();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + event.token } : m,
              ),
            );
          } else if (event.type === 'done') {
            lastStreamActivityAtRef.current = Date.now();
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? {
                      ...m,
                      usage: {
                        promptTokens: event.promptTokens,
                        completionTokens: event.completionTokens,
                        totalTokens: event.totalTokens,
                        contextWindowTokens: event.contextWindowTokens,
                        remainingContextTokens: event.remainingContextTokens,
                      },
                    }
                  : m,
              ),
            );
          } else if (event.type === 'error') {
            lastStreamActivityAtRef.current = Date.now();
            setError(event.message || 'Failed to run AI analysis');
            setCanRetry(true);
          }
        },
        {
          followUpQuestion: question,
          conversationTurns,
          runtime: {
            model: runtimeOverride?.model ?? modelName,
            numCtx: runtimeOverride?.numCtx ?? numCtx,
          },
        },
        controller.signal,
      );
    } catch (e) {
      if ((e as Error).name !== 'AbortError' && !stoppedByUserRef.current && !stoppedByTimeoutRef.current) {
        setError('Failed to run AI analysis');
        setCanRetry(true);
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

  const retryLast = () => {
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUser) {
      const nextTurns: AiChatTurn[] = messages.slice(-10).map((m) => ({ role: m.role, content: m.content }));
      void runAnalysis(lastUser.content, nextTurns);
      return;
    }
    void runAnalysis(undefined, []);
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
    if (!isOpen) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, isOpen]);

  useEffect(() => {
    localStorage.setItem('ai_runtime_model', modelName);
  }, [modelName]);

  useEffect(() => {
    localStorage.setItem('ai_runtime_num_ctx', String(numCtx));
  }, [numCtx]);

  const rerunWithRuntime = (nextModel: string, nextNumCtx: number) => {
    if (!isOpen) return;
    setMessages([]);
    setDraftQuestion('');
    void runAnalysis(undefined, [], { model: nextModel, numCtx: nextNumCtx });
  };

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
          setMessages([]);
          setDraftQuestion('');
          void runAnalysis(undefined, []);
        }}
        className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
      >
        AI Analyzer
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl h-[80vh] bg-white rounded-xl shadow-xl flex flex-col">
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

            <div className="p-4 border-b border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-3">
                <select
                  value={modelName}
                  onChange={(e) => {
                    const nextModel = e.target.value;
                    setModelName(nextModel);
                    rerunWithRuntime(nextModel, numCtx);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-xs"
                >
                  {MODEL_OPTIONS.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <select
                  value={numCtx}
                  onChange={(e) => {
                    const nextNumCtx = Number(e.target.value);
                    setNumCtx(nextNumCtx);
                    rerunWithRuntime(modelName, nextNumCtx);
                  }}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-xs"
                >
                  {MEMORY_OPTIONS.map((ctx) => (
                    <option key={ctx} value={ctx}>
                      {ctx}
                    </option>
                  ))}
                </select>
              </div>
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

      {error && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-red-600">{error}</p>
          {canRetry && !isLoading && (
            <button
              onClick={retryLast}
              className="text-xs px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700"
            >
              Retry
            </button>
          )}
        </div>
      )}
      {!error && messages.length === 0 && <p className="text-xs text-gray-500">Starting analysis...</p>}
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'ml-auto bg-indigo-600 text-white'
                      : 'mr-auto bg-white border border-gray-200 text-gray-800'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => <p className="mb-2 leading-relaxed">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      }}
                    >
                      {normalizeNumericPrecision(message.content || (isLoading ? '...' : ''))}
                    </ReactMarkdown>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.usage && (
                    <div className="mt-2 text-[11px] text-gray-500">
                      Tokens: {message.usage.totalTokens ?? 0} (p {message.usage.promptTokens ?? 0}, c {message.usage.completionTokens ?? 0}) | ctx {message.usage.contextWindowTokens ?? 0} | rem {message.usage.remainingContextTokens ?? 0}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <form
              className="border-t border-gray-200 p-3 flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = draftQuestion.trim();
                if (!text || isLoading) return;
                const nextTurns: AiChatTurn[] = [
                  ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
                  { role: 'user', content: text },
                ];
                setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }]);
                setDraftQuestion('');
                void runAnalysis(text, nextTurns);
              }}
            >
              <textarea
                value={draftQuestion}
                onChange={(e) => setDraftQuestion(e.target.value)}
                placeholder="Ask follow-up question..."
                className="flex-1 resize-none border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const text = draftQuestion.trim();
                    if (!text || isLoading) return;
                    const nextTurns: AiChatTurn[] = [
                      ...messages.slice(-10).map((m) => ({ role: m.role, content: m.content })),
                      { role: 'user', content: text },
                    ];
                    setMessages((prev) => [...prev, { id: `user-${Date.now()}`, role: 'user', content: text }]);
                    setDraftQuestion('');
                    void runAnalysis(text, nextTurns);
                  }
                }}
              />
              <button
                type="submit"
                disabled={isLoading || !draftQuestion.trim()}
                className="h-10 px-4 rounded bg-indigo-600 text-white text-sm disabled:bg-gray-300"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIInsightPanel;
