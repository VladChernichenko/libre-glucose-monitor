import React, { useState } from 'react';
import { nutritionApi, NutritionSnapshot } from '../services/nutritionApi';

interface NutritionAnalyzerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NutritionAnalyzerModal: React.FC<NutritionAnalyzerModalProps> = ({ isOpen, onClose }) => {
  const [ingredientsText, setIngredientsText] = useState('');
  const [fallbackCarbs, setFallbackCarbs] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<NutritionSnapshot | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = ingredientsText.trim();
    if (!text) {
      setError('Please enter ingredients text.');
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const carbs = fallbackCarbs.trim() ? Number(fallbackCarbs) : undefined;
      const snapshot = await nutritionApi.analyzeIngredients(text, Number.isFinite(carbs as number) ? carbs : undefined);
      setResult(snapshot);
    } catch (err: any) {
      setError(err?.response?.status === 400 ? 'Please enter valid ingredients.' : 'Failed to analyze ingredients.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Nutrition GI/GL Analyzer</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700" aria-label="Close">
            x
          </button>
        </div>

        <form onSubmit={handleAnalyze} className="p-4 space-y-3">
          <textarea
            value={ingredientsText}
            onChange={(e) => setIngredientsText(e.target.value)}
            placeholder="e.g. 50g rye bread, 200ml milk, 1 apple"
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="number"
            step="0.1"
            min="0"
            value={fallbackCarbs}
            onChange={(e) => setFallbackCarbs(e.target.value)}
            placeholder="Fallback carbs (optional), e.g. 45"
            className="w-full md:w-64 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 rounded bg-indigo-600 text-white text-sm hover:bg-indigo-700 disabled:bg-gray-300"
            >
              {isLoading ? 'Analyzing...' : 'Analyze'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-100 text-gray-700 text-sm hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </form>

        <div className="px-4 pb-4 overflow-y-auto">
          {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
          {result && (
            <div className="border border-gray-200 rounded-lg p-3 text-sm space-y-1">
              <div><span className="font-medium">Source:</span> {result.source || '--'}</div>
              <div><span className="font-medium">Absorption mode:</span> {result.absorptionMode || '--'}</div>
              <div><span className="font-medium">Speed class:</span> {result.absorptionSpeedClass || '--'}</div>
              <div><span className="font-medium">GI:</span> {result.estimatedGi ?? '--'}</div>
              <div><span className="font-medium">GL:</span> {result.glycemicLoad ?? '--'}</div>
              <div><span className="font-medium">Carbs/Fiber/Protein/Fat:</span> {result.totalCarbs ?? '--'} / {result.fiber ?? '--'} / {result.protein ?? '--'} / {result.fat ?? '--'} g</div>
              <div><span className="font-medium">Confidence:</span> {result.confidence ?? '--'}</div>
              <div><span className="font-medium">Foods:</span> {result.normalizedFoods?.length ? result.normalizedFoods.join(', ') : '--'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutritionAnalyzerModal;

