import React, { useEffect, useState } from 'react';
import { aiInsightsApi, AiAnalysisResponse } from '../services/aiInsightsApi';

const AIInsightPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<AiAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runAnalysis = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await aiInsightsApi.analyzeRetrospective(12);
      setResult(res);
    } catch (e) {
      setError('Failed to run AI analysis');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
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
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close AI analyzer modal"
              >
                ✕
              </button>
            </div>

            <div className="p-4">
              <div className="flex items-center justify-end mb-3">
        <button
          onClick={runAnalysis}
          disabled={isLoading}
          className="text-xs px-3 py-1.5 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400"
        >
          {isLoading ? 'Analyzing...' : 'Analyze'}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {!error && !result && <p className="text-xs text-gray-500">Run analysis to get management feedback.</p>}

      {result && (
        <div className="space-y-2 text-sm">
          <p className="text-gray-800"><span className="font-medium">Summary:</span> {result.summary}</p>
          <p className="text-gray-600">Confidence: {(result.confidence * 100).toFixed(0)}% • Model: {result.modelId}</p>

          <div>
            <div className="font-medium text-gray-800">Likely mistakes</div>
            {result.likelyMistakes.length === 0 ? (
              <p className="text-gray-500">No obvious mistakes detected.</p>
            ) : (
              <ul className="list-disc list-inside text-gray-700">
                {result.likelyMistakes.map((m) => (
                  <li key={m.code}>{m.description}</li>
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
                  <li key={r.code}>{r.text}</li>
                ))}
              </ul>
            )}
          </div>

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
