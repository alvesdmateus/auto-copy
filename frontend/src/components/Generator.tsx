import { useState, useEffect, useCallback } from 'react';
import {
  Template,
  fetchTemplates,
  generateCopyStream,
  generateVariationsStream,
  refineCopyStream,
  RefineAction,
} from '../api/client';
import { TemplateSelector } from './TemplateSelector';
import { ToneSelector } from './ToneSelector';
import { OutputDisplay } from './OutputDisplay';

interface GeneratorProps {
  onGenerated?: () => void;
}

interface Variation {
  id: number;
  content: string;
  isLoading: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function Generator({ onGenerated }: GeneratorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [variations, setVariations] = useState<Variation[]>([]);
  const [activeVariation, setActiveVariation] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [variationCount, setVariationCount] = useState(3);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedPlatform = selectedTemplate?.platform;

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await fetchTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load templates. Please refresh the page.');
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleGenerate = useCallback(async (retry = false) => {
    if (!prompt.trim()) return;

    if (!retry) {
      setRetryCount(0);
    }

    setIsGenerating(true);
    setOutput('');
    setVariations([]);
    setActiveVariation(0);
    setError(null);

    try {
      for await (const data of generateCopyStream({
        prompt: prompt.trim(),
        template_id: selectedTemplateId,
        tone: selectedTone,
      })) {
        if (data.error) {
          throw new Error(data.error);
        }
        if (data.chunk) {
          setOutput((prev) => prev + data.chunk);
        }
        if (data.done) {
          onGenerated?.();
        }
      }
      setRetryCount(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Generation failed';

      if (retryCount < MAX_RETRIES - 1) {
        setRetryCount((prev) => prev + 1);
        setError(`${errorMessage}. Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
        setTimeout(() => handleGenerate(true), RETRY_DELAY);
        return;
      }

      setError(errorMessage);
    } finally {
      if (retryCount >= MAX_RETRIES - 1 || !error) {
        setIsGenerating(false);
      }
    }
  }, [prompt, selectedTemplateId, selectedTone, retryCount, error, onGenerated]);

  const handleGenerateVariations = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setOutput('');
    setVariations([]);
    setActiveVariation(0);
    setError(null);

    const newVariations: Variation[] = Array.from({ length: variationCount }, (_, i) => ({
      id: i + 1,
      content: '',
      isLoading: true,
    }));
    setVariations(newVariations);

    try {
      for await (const data of generateVariationsStream({
        prompt: prompt.trim(),
        template_id: selectedTemplateId,
        tone: selectedTone,
        count: variationCount,
      })) {
        if (data.error) {
          throw new Error(data.error);
        }
        if (data.variation !== undefined && data.chunk) {
          setVariations((prev) =>
            prev.map((v) =>
              v.id === data.variation
                ? { ...v, content: v.content + data.chunk }
                : v
            )
          );
        }
        if (data.variation_done !== undefined) {
          setVariations((prev) =>
            prev.map((v) =>
              v.id === data.variation_done ? { ...v, isLoading: false } : v
            )
          );
        }
        if (data.done) {
          onGenerated?.();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate variations');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefine = async (action: RefineAction) => {
    const textToRefine = variations.length > 0
      ? variations[activeVariation]?.content
      : output;

    if (!textToRefine) return;

    setIsRefining(true);
    setError(null);

    const previousOutput = output;
    const previousVariations = [...variations];
    setOutput('');

    try {
      for await (const data of refineCopyStream({
        text: textToRefine,
        action,
        template_id: selectedTemplateId,
        tone: selectedTone,
      })) {
        if (data.error) {
          throw new Error(data.error);
        }
        if (data.chunk) {
          setOutput((prev) => prev + data.chunk);
        }
        if (data.done) {
          setVariations([]);
          onGenerated?.();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refine copy');
      setOutput(previousOutput);
      setVariations(previousVariations);
    } finally {
      setIsRefining(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    handleGenerate(false);
  };

  const currentOutput = variations.length > 0
    ? variations[activeVariation]?.content || ''
    : output;

  const currentIsLoading = variations.length > 0
    ? variations[activeVariation]?.isLoading
    : isGenerating;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TemplateSelector
          templates={templates}
          selectedId={selectedTemplateId}
          onSelect={setSelectedTemplateId}
          loading={templatesLoading}
        />
        <div className="flex items-end">
          <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Variations
            </label>
            <select
              value={variationCount}
              onChange={(e) => setVariationCount(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value={1}>1 variation</option>
              <option value={2}>2 variations</option>
              <option value={3}>3 variations</option>
              <option value={4}>4 variations</option>
              <option value={5}>5 variations</option>
            </select>
          </div>
        </div>
      </div>

      <ToneSelector selectedTone={selectedTone} onSelect={setSelectedTone} />

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Topic / Product Description
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your product, service, or topic..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400"
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleGenerate(false)}
          disabled={isGenerating || isRefining || !prompt.trim()}
          className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
        <button
          onClick={handleGenerateVariations}
          disabled={isGenerating || isRefining || !prompt.trim()}
          className="py-3 px-4 border border-blue-600 text-blue-600 dark:text-blue-400 font-medium rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {variationCount} Variations
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-red-700 dark:text-red-400">{error}</span>
            {!isGenerating && (
              <button
                onClick={handleRetry}
                className="ml-4 px-3 py-1 text-sm bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {/* Variation tabs */}
      {variations.length > 1 && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {variations.map((v, index) => (
            <button
              key={v.id}
              onClick={() => setActiveVariation(index)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeVariation === index
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Variation {v.id}
              {v.isLoading && (
                <span className="ml-2 inline-block w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              )}
            </button>
          ))}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Output
        </label>
        <OutputDisplay
          output={currentOutput}
          isLoading={currentIsLoading}
          selectedPlatform={selectedPlatform}
          onRefine={handleRefine}
          isRefining={isRefining}
        />
      </div>
    </div>
  );
}
