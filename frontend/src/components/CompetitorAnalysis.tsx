import { useState, useEffect } from 'react';
import {
  Brand,
  Persona,
  fetchBrands,
  fetchPersonas,
  analyzeCompetitorStream,
} from '../api/client';

interface CompetitorAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CompetitorAnalysis({ isOpen, onClose }: CompetitorAnalysisProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [competitorCopy, setCompetitorCopy] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [differentiationFocus, setDifferentiationFocus] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [output, setOutput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [brandsData, personasData] = await Promise.all([
        fetchBrands(),
        fetchPersonas(),
      ]);
      setBrands(brandsData);
      setPersonas(personasData);

      // Select defaults
      const defaultBrand = brandsData.find((b) => b.is_default);
      if (defaultBrand) setSelectedBrandId(defaultBrand.id);

      const defaultPersona = personasData.find((p) => p.is_default);
      if (defaultPersona) setSelectedPersonaId(defaultPersona.id);
    } catch (err) {
      console.error('Failed to load data:', err);
    }
  };

  const handleAnalyze = async () => {
    if (!competitorCopy.trim()) return;

    setIsAnalyzing(true);
    setOutput('');
    setError(null);

    try {
      for await (const data of analyzeCompetitorStream({
        competitor_copy: competitorCopy.trim(),
        product_description: productDescription.trim() || undefined,
        differentiation_focus: differentiationFocus.trim() || undefined,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
      })) {
        if (data.error) {
          throw new Error(data.error);
        }
        if (data.chunk) {
          setOutput((prev) => prev + data.chunk);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
  };

  const handleReset = () => {
    setCompetitorCopy('');
    setProductDescription('');
    setDifferentiationFocus('');
    setOutput('');
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Competitor Analysis
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Analyze competitor copy and generate differentiated alternatives
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Section */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Competitor Copy *
                  </label>
                  <textarea
                    value={competitorCopy}
                    onChange={(e) => setCompetitorCopy(e.target.value)}
                    placeholder="Paste the competitor copy you want to analyze..."
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Your Product Description (optional)
                  </label>
                  <textarea
                    value={productDescription}
                    onChange={(e) => setProductDescription(e.target.value)}
                    placeholder="Describe your product to help create relevant differentiation..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Differentiation Focus (optional)
                  </label>
                  <input
                    type="text"
                    value={differentiationFocus}
                    onChange={(e) => setDifferentiationFocus(e.target.value)}
                    placeholder="e.g., emphasize sustainability, highlight premium quality..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Brand Voice
                    </label>
                    <select
                      value={selectedBrandId || ''}
                      onChange={(e) => setSelectedBrandId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">No brand</option>
                      {brands.map((brand) => (
                        <option key={brand.id} value={brand.id}>
                          {brand.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Persona
                    </label>
                    <select
                      value={selectedPersonaId || ''}
                      onChange={(e) => setSelectedPersonaId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">No persona</option>
                      {personas.map((persona) => (
                        <option key={persona.id} value={persona.id}>
                          {persona.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !competitorCopy.trim()}
                    className="flex-1 py-2.5 px-4 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isAnalyzing ? 'Analyzing...' : 'Analyze & Differentiate'}
                  </button>
                  <button
                    onClick={handleReset}
                    disabled={isAnalyzing}
                    className="py-2.5 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Output Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Analysis Result
                  </label>
                  {output && (
                    <button
                      onClick={handleCopy}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <div className="h-[400px] overflow-y-auto p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
                  {error ? (
                    <div className="text-red-600 dark:text-red-400">{error}</div>
                  ) : output ? (
                    <div className="prose dark:prose-invert prose-sm max-w-none whitespace-pre-wrap">
                      {output}
                    </div>
                  ) : isAnalyzing ? (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-2">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Analyzing competitor copy...
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400 dark:text-gray-500">
                      Analysis results will appear here
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <button
              onClick={onClose}
              className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
