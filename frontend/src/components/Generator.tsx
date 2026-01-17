import { useState, useEffect, useCallback } from 'react';
import {
  Template,
  CategoryOption,
  Brand,
  Persona,
  fetchTemplates,
  fetchCategories,
  fetchBrands,
  fetchPersonas,
  generateCopyStream,
  generateVariationsStream,
  generateABTestStream,
  refineCopyStream,
  RefineAction,
} from '../api/client';
import { TemplateSelector } from './TemplateSelector';
import { ToneSelector } from './ToneSelector';
import { OutputDisplay } from './OutputDisplay';
import { TemplateVariables } from './TemplateVariables';
import { TemplateWizard } from './TemplateWizard';
import { BrandManager } from './BrandManager';
import { PersonaManager } from './PersonaManager';

interface GeneratorProps {
  onGenerated?: () => void;
}

interface Variation {
  id: number;
  content: string;
  isLoading: boolean;
}

interface ABVersion {
  version: string;
  content: string;
  isLoading: boolean;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export function Generator({ onGenerated }: GeneratorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [selectedBrandId, setSelectedBrandId] = useState<number | null>(null);
  const [selectedPersonaId, setSelectedPersonaId] = useState<number | null>(null);
  const [prompt, setPrompt] = useState('');
  const [templateVariables, setTemplateVariables] = useState<Record<string, string>>({});
  const [output, setOutput] = useState('');
  const [variations, setVariations] = useState<Variation[]>([]);
  const [abVersions, setAbVersions] = useState<ABVersion[]>([]);
  const [activeVariation, setActiveVariation] = useState<number>(0);
  const [activeAbVersion, setActiveAbVersion] = useState<number>(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRefining, setIsRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [variationCount, setVariationCount] = useState(3);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [brandManagerOpen, setBrandManagerOpen] = useState(false);
  const [personaManagerOpen, setPersonaManagerOpen] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const selectedPlatform = selectedTemplate?.platform;
  const hasVariables = selectedTemplate?.variables && selectedTemplate.variables.length > 0;
  const hasWizardSteps = selectedTemplate?.wizard_steps && selectedTemplate.wizard_steps.length > 0;

  useEffect(() => {
    loadTemplates();
    loadCategories();
    loadBrands();
    loadPersonas();
  }, []);

  // Reset template variables when template changes
  useEffect(() => {
    setTemplateVariables({});
  }, [selectedTemplateId]);

  // Open wizard automatically when a wizard-enabled template is selected
  useEffect(() => {
    if (hasWizardSteps && selectedTemplateId) {
      setWizardOpen(true);
    }
  }, [selectedTemplateId, hasWizardSteps]);

  const handleWizardComplete = (values: Record<string, string>) => {
    setTemplateVariables(values);
    setWizardOpen(false);
  };

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

  const loadCategories = async () => {
    try {
      const data = await fetchCategories();
      setCategories(data);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadBrands = async () => {
    try {
      const data = await fetchBrands();
      setBrands(data);
      // Select default brand if one exists
      const defaultBrand = data.find((b) => b.is_default);
      if (defaultBrand) {
        setSelectedBrandId(defaultBrand.id);
      }
    } catch (err) {
      console.error('Failed to load brands:', err);
    }
  };

  const loadPersonas = async () => {
    try {
      const data = await fetchPersonas();
      setPersonas(data);
      // Select default persona if one exists
      const defaultPersona = data.find((p) => p.is_default);
      if (defaultPersona) {
        setSelectedPersonaId(defaultPersona.id);
      }
    } catch (err) {
      console.error('Failed to load personas:', err);
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
    setAbVersions([]);
    setActiveVariation(0);
    setActiveAbVersion(0);
    setError(null);

    try {
      for await (const data of generateCopyStream({
        prompt: prompt.trim(),
        template_id: selectedTemplateId,
        tone: selectedTone,
        variables: Object.keys(templateVariables).length > 0 ? templateVariables : undefined,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
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
  }, [prompt, selectedTemplateId, selectedTone, templateVariables, selectedBrandId, selectedPersonaId, retryCount, error, onGenerated]);

  const handleGenerateVariations = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setOutput('');
    setVariations([]);
    setAbVersions([]);
    setActiveVariation(0);
    setActiveAbVersion(0);
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
        variables: Object.keys(templateVariables).length > 0 ? templateVariables : undefined,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
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
        brand_id: selectedBrandId,
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

  const handleGenerateABTest = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setOutput('');
    setVariations([]);
    setAbVersions([
      { version: 'A', content: '', isLoading: true },
      { version: 'B', content: '', isLoading: true },
    ]);
    setActiveVariation(0);
    setActiveAbVersion(0);
    setError(null);

    try {
      for await (const data of generateABTestStream({
        prompt: prompt.trim(),
        template_id: selectedTemplateId,
        tone: selectedTone,
        variables: Object.keys(templateVariables).length > 0 ? templateVariables : undefined,
        brand_id: selectedBrandId,
        persona_id: selectedPersonaId,
      })) {
        if (data.error) {
          throw new Error(data.error);
        }
        if (data.version !== undefined && data.chunk) {
          setAbVersions((prev) =>
            prev.map((v) =>
              v.version === data.version
                ? { ...v, content: v.content + data.chunk }
                : v
            )
          );
        }
        if (data.version_done !== undefined) {
          setAbVersions((prev) =>
            prev.map((v) =>
              v.version === data.version_done ? { ...v, isLoading: false } : v
            )
          );
        }
        if (data.done) {
          onGenerated?.();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate A/B test');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRetry = () => {
    setRetryCount(0);
    handleGenerate(false);
  };

  const currentOutput = abVersions.length > 0
    ? abVersions[activeAbVersion]?.content || ''
    : variations.length > 0
    ? variations[activeVariation]?.content || ''
    : output;

  const currentIsLoading = abVersions.length > 0
    ? abVersions[activeAbVersion]?.isLoading
    : variations.length > 0
    ? variations[activeVariation]?.isLoading
    : isGenerating;

  return (
    <div className="space-y-6">
      {/* Template Selection with Categories */}
      <TemplateSelector
        templates={templates}
        selectedId={selectedTemplateId}
        onSelect={setSelectedTemplateId}
        loading={templatesLoading}
        categories={categories}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
      />

      {/* Template Variables */}
      {hasVariables && selectedTemplate?.variables && (
        <div className="space-y-3">
          {hasWizardSteps && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {Object.keys(templateVariables).length > 0
                  ? `${Object.keys(templateVariables).length} of ${selectedTemplate.variables.length} fields filled`
                  : 'Fill in template variables'}
              </span>
              <button
                onClick={() => setWizardOpen(true)}
                disabled={isGenerating || isRefining}
                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
                Use Wizard
              </button>
            </div>
          )}
          <TemplateVariables
            variables={selectedTemplate.variables}
            values={templateVariables}
            onChange={setTemplateVariables}
            disabled={isGenerating || isRefining}
          />
        </div>
      )}

      {/* Brand & Persona Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Brand Voice
            </label>
            <button
              onClick={() => setBrandManagerOpen(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage
            </button>
          </div>
          <select
            value={selectedBrandId || ''}
            onChange={(e) => setSelectedBrandId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">No brand selected</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name} {brand.is_default ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Target Persona
            </label>
            <button
              onClick={() => setPersonaManagerOpen(true)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              Manage
            </button>
          </div>
          <select
            value={selectedPersonaId || ''}
            onChange={(e) => setSelectedPersonaId(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">No persona selected</option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id}>
                {persona.name} {persona.is_default ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ToneSelector selectedTone={selectedTone} onSelect={setSelectedTone} />
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

      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleGenerate(false)}
          disabled={isGenerating || isRefining || !prompt.trim()}
          className="flex-1 min-w-[120px] py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
        <button
          onClick={handleGenerateABTest}
          disabled={isGenerating || isRefining || !prompt.trim()}
          className="py-3 px-4 border border-indigo-600 text-indigo-600 dark:text-indigo-400 font-medium rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/20 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Generate A/B test versions (benefits vs features focused)"
        >
          A/B Test
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

      {/* A/B Test version tabs */}
      {abVersions.length > 0 && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          {abVersions.map((v, index) => (
            <button
              key={v.version}
              onClick={() => setActiveAbVersion(index)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeAbVersion === index
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Version {v.version}
              <span className="ml-1 text-xs text-gray-400">
                ({v.version === 'A' ? 'Benefits' : 'Features'})
              </span>
              {v.isLoading && (
                <span className="ml-2 inline-block w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
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
          brandId={selectedBrandId}
        />
      </div>

      {/* Template Wizard */}
      {selectedTemplate && hasWizardSteps && (
        <TemplateWizard
          template={selectedTemplate}
          isOpen={wizardOpen}
          onClose={() => setWizardOpen(false)}
          onComplete={handleWizardComplete}
          initialValues={templateVariables}
        />
      )}

      {/* Brand Manager Modal */}
      <BrandManager
        isOpen={brandManagerOpen}
        onClose={() => setBrandManagerOpen(false)}
        onBrandsChange={loadBrands}
      />

      {/* Persona Manager Modal */}
      <PersonaManager
        isOpen={personaManagerOpen}
        onClose={() => setPersonaManagerOpen(false)}
        onPersonasChange={loadPersonas}
      />
    </div>
  );
}
