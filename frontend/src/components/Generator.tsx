import { useState, useEffect } from 'react';
import { Template, fetchTemplates, generateCopyStream } from '../api/client';
import { TemplateSelector } from './TemplateSelector';
import { ToneSelector } from './ToneSelector';
import { OutputDisplay } from './OutputDisplay';

interface GeneratorProps {
  onGenerated?: () => void;
}

export function Generator({ onGenerated }: GeneratorProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedTone, setSelectedTone] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await fetchTemplates();
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setTemplatesLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setOutput('');
    setError(null);

    try {
      for await (const data of generateCopyStream({
        prompt: prompt.trim(),
        template_id: selectedTemplateId,
        tone: selectedTone,
      })) {
        if (data.error) {
          setError(data.error);
          break;
        }
        if (data.chunk) {
          setOutput((prev) => prev + data.chunk);
        }
        if (data.done) {
          onGenerated?.();
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TemplateSelector
          templates={templates}
          selectedId={selectedTemplateId}
          onSelect={setSelectedTemplateId}
          loading={templatesLoading}
        />
        <div></div>
      </div>

      <ToneSelector selectedTone={selectedTone} onSelect={setSelectedTone} />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Topic / Product Description
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe your product, service, or topic..."
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? 'Generating...' : 'Generate Copy'}
      </button>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Output
        </label>
        <OutputDisplay output={output} isLoading={isGenerating} />
      </div>
    </div>
  );
}
