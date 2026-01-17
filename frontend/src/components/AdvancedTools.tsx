import { useState, useEffect, useRef } from 'react';
import {
  OllamaModel,
  ContentFormat,
  Language,
  LANGUAGE_NAMES,
  BulkGenerationItem,
  BulkGenerationResultItem,
  fetchModels,
  switchModel,
  resetModel,
  urlToCopy,
  repurposeContent,
  translateContent,
  bulkGenerate,
  uploadCSVForBulk,
  imageToCopy,
  checkPlagiarism,
} from '../api/client';

type Tab = 'models' | 'url' | 'repurpose' | 'translate' | 'bulk' | 'image' | 'plagiarism';

const CONTENT_FORMATS: { value: ContentFormat; label: string }[] = [
  { value: 'blog_post', label: 'Blog Post' },
  { value: 'social_post', label: 'Social Post' },
  { value: 'email', label: 'Email' },
  { value: 'ad_copy', label: 'Ad Copy' },
  { value: 'tweet_thread', label: 'Tweet Thread' },
  { value: 'linkedin_post', label: 'LinkedIn Post' },
  { value: 'instagram_caption', label: 'Instagram Caption' },
  { value: 'video_script', label: 'Video Script' },
  { value: 'press_release', label: 'Press Release' },
  { value: 'product_description', label: 'Product Description' },
];

export default function AdvancedTools() {
  const [activeTab, setActiveTab] = useState<Tab>('models');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Model state
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [currentModel, setCurrentModel] = useState<string>('');

  // URL-to-Copy state
  const [urlInput, setUrlInput] = useState('');
  const [urlOutputType, setUrlOutputType] = useState<'rewrite' | 'summarize' | 'extract'>('rewrite');
  const [urlResult, setUrlResult] = useState<string>('');

  // Repurpose state
  const [repurposeContent, setRepurposeContentState] = useState('');
  const [sourceFormat, setSourceFormat] = useState<ContentFormat>('blog_post');
  const [targetFormat, setTargetFormat] = useState<ContentFormat>('social_post');
  const [repurposeResult, setRepurposeResult] = useState<string>('');

  // Translate state
  const [translateInput, setTranslateInput] = useState('');
  const [targetLang, setTargetLang] = useState<Language>('es');
  const [translateResult, setTranslateResult] = useState<string>('');

  // Bulk state
  const [bulkItems, setBulkItems] = useState<BulkGenerationItem[]>([]);
  const [bulkResults, setBulkResults] = useState<BulkGenerationResultItem[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{ total: number; successful: number; failed: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image state
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageOutputType, setImageOutputType] = useState<'description' | 'ad_copy' | 'social_post'>('description');
  const [imageResult, setImageResult] = useState<string>('');

  // Plagiarism state
  const [plagiarismInput, setPlagiarismInput] = useState('');
  const [plagiarismResult, setPlagiarismResult] = useState<{
    is_original: boolean;
    originality_score: number;
    unique_phrases_ratio: number;
  } | null>(null);

  useEffect(() => {
    if (activeTab === 'models') {
      loadModels();
    }
  }, [activeTab]);

  async function loadModels() {
    try {
      const data = await fetchModels();
      setModels(data.models);
      setCurrentModel(data.current_model);
    } catch (err) {
      setError('Failed to load models. Is Ollama running?');
    }
  }

  async function handleSwitchModel(modelName: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await switchModel(modelName);
      setCurrentModel(result.current_model);
    } catch (err) {
      setError('Failed to switch model');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetModel() {
    setLoading(true);
    try {
      const result = await resetModel();
      setCurrentModel(result.current_model);
    } catch (err) {
      setError('Failed to reset model');
    } finally {
      setLoading(false);
    }
  }

  async function handleUrlToCopy() {
    if (!urlInput) return;
    setLoading(true);
    setError(null);
    try {
      const result = await urlToCopy({ url: urlInput, output_type: urlOutputType });
      setUrlResult(result.generated_copy);
    } catch (err) {
      setError('Failed to process URL');
    } finally {
      setLoading(false);
    }
  }

  async function handleRepurpose() {
    if (!repurposeContent) return;
    setLoading(true);
    setError(null);
    try {
      const result = await repurposeContent({
        content: repurposeContent,
        source_format: sourceFormat,
        target_format: targetFormat,
      });
      setRepurposeResult(result.repurposed_content);
    } catch (err) {
      setError('Failed to repurpose content');
    } finally {
      setLoading(false);
    }
  }

  async function handleTranslate() {
    if (!translateInput) return;
    setLoading(true);
    setError(null);
    try {
      const result = await translateContent({
        content: translateInput,
        target_language: targetLang,
        preserve_tone: true,
      });
      setTranslateResult(result.translated_content);
    } catch (err) {
      setError('Failed to translate');
    } finally {
      setLoading(false);
    }
  }

  async function handleCSVUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const result = await uploadCSVForBulk(file);
      setBulkItems(result.items);
      if (result.errors.length > 0) {
        setError(`Parsed ${result.rows_parsed} rows with ${result.errors.length} errors`);
      }
    } catch (err) {
      setError('Failed to parse CSV');
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkGenerate() {
    if (bulkItems.length === 0) return;
    setLoading(true);
    setError(null);
    setBulkResults([]);
    try {
      const result = await bulkGenerate({ items: bulkItems });
      setBulkResults(result.results);
      setBulkProgress({ total: result.total, successful: result.successful, failed: result.failed });
    } catch (err) {
      setError('Failed to generate bulk content');
    } finally {
      setLoading(false);
    }
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      setImageBase64(base64);
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  }

  async function handleImageToCopy() {
    if (!imageBase64) return;
    setLoading(true);
    setError(null);
    try {
      const result = await imageToCopy({
        image_base64: imageBase64,
        output_type: imageOutputType,
      });
      setImageResult(result.generated_copy);
    } catch (err) {
      setError('Failed to process image. Make sure you have a vision-capable model (like llava).');
    } finally {
      setLoading(false);
    }
  }

  async function handlePlagiarismCheck() {
    if (!plagiarismInput) return;
    setLoading(true);
    setError(null);
    try {
      const result = await checkPlagiarism({ content: plagiarismInput });
      setPlagiarismResult({
        is_original: result.is_original,
        originality_score: result.originality_score,
        unique_phrases_ratio: result.unique_phrases_ratio,
      });
    } catch (err) {
      setError('Failed to check plagiarism');
    } finally {
      setLoading(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Advanced AI Tools</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-500 hover:text-red-700">
            Dismiss
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6 overflow-x-auto">
        <nav className="flex gap-4 min-w-max">
          {[
            { id: 'models', label: 'Models' },
            { id: 'url', label: 'URL to Copy' },
            { id: 'repurpose', label: 'Repurpose' },
            { id: 'translate', label: 'Translate' },
            { id: 'bulk', label: 'Bulk Generate' },
            { id: 'image', label: 'Image to Copy' },
            { id: 'plagiarism', label: 'Plagiarism Check' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`pb-3 px-2 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Models Tab */}
      {activeTab === 'models' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600">Switch between available Ollama models.</p>
              <p className="text-sm text-gray-500 mt-1">
                Current model: <span className="font-mono font-semibold text-purple-600">{currentModel}</span>
              </p>
            </div>
            <button
              onClick={handleResetModel}
              disabled={loading}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Reset to Default
            </button>
          </div>

          {models.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <p className="text-gray-500">No models found</p>
              <p className="text-sm text-gray-400 mt-1">Make sure Ollama is running and has models installed</p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {models.map((model) => (
                <div
                  key={model.name}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    currentModel === model.name
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                  onClick={() => handleSwitchModel(model.name)}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-800">{model.name}</h3>
                    {currentModel === model.name && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-1">Size: {formatBytes(model.size)}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono truncate">{model.digest.slice(0, 12)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* URL to Copy Tab */}
      {activeTab === 'url' && (
        <div className="space-y-6">
          <p className="text-gray-600">Extract content from a URL and generate copy.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">URL</label>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="https://example.com/article"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Output Type</label>
              <select
                value={urlOutputType}
                onChange={(e) => setUrlOutputType(e.target.value as 'rewrite' | 'summarize' | 'extract')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="rewrite">Rewrite</option>
                <option value="summarize">Summarize</option>
                <option value="extract">Extract Key Points</option>
              </select>
            </div>

            <button
              onClick={handleUrlToCopy}
              disabled={loading || !urlInput}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {loading ? 'Processing...' : 'Generate'}
            </button>

            {urlResult && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-700 mb-2">Result</h4>
                <p className="text-gray-800 whitespace-pre-wrap">{urlResult}</p>
                <button
                  onClick={() => navigator.clipboard.writeText(urlResult)}
                  className="mt-2 text-sm text-purple-600 hover:text-purple-700"
                >
                  Copy to clipboard
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Repurpose Tab */}
      {activeTab === 'repurpose' && (
        <div className="space-y-6">
          <p className="text-gray-600">Convert content from one format to another.</p>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Format</label>
              <select
                value={sourceFormat}
                onChange={(e) => setSourceFormat(e.target.value as ContentFormat)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {CONTENT_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Format</label>
              <select
                value={targetFormat}
                onChange={(e) => setTargetFormat(e.target.value as ContentFormat)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                {CONTENT_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={repurposeContent}
              onChange={(e) => setRepurposeContentState(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Paste your content here..."
            />
          </div>

          <button
            onClick={handleRepurpose}
            disabled={loading || !repurposeContent}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Converting...' : 'Repurpose'}
          </button>

          {repurposeResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Repurposed Content</h4>
              <p className="text-gray-800 whitespace-pre-wrap">{repurposeResult}</p>
              <button
                onClick={() => navigator.clipboard.writeText(repurposeResult)}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Translate Tab */}
      {activeTab === 'translate' && (
        <div className="space-y-6">
          <p className="text-gray-600">Translate content to different languages.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Language</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value as Language)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              {Object.entries(LANGUAGE_NAMES).map(([code, name]) => (
                <option key={code} value={code}>{name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
            <textarea
              value={translateInput}
              onChange={(e) => setTranslateInput(e.target.value)}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Enter text to translate..."
            />
          </div>

          <button
            onClick={handleTranslate}
            disabled={loading || !translateInput}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Translating...' : 'Translate'}
          </button>

          {translateResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Translation</h4>
              <p className="text-gray-800 whitespace-pre-wrap">{translateResult}</p>
              <button
                onClick={() => navigator.clipboard.writeText(translateResult)}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Bulk Generate Tab */}
      {activeTab === 'bulk' && (
        <div className="space-y-6">
          <p className="text-gray-600">Upload a CSV file to generate content in bulk.</p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleCSVUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Upload CSV
            </button>
            <p className="text-sm text-gray-500 mt-2">
              CSV should have columns: prompt, tone (optional), template_id (optional)
            </p>
          </div>

          {bulkItems.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-gray-700">{bulkItems.length} items loaded</p>
                <button
                  onClick={handleBulkGenerate}
                  disabled={loading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {loading ? 'Generating...' : 'Generate All'}
                </button>
              </div>

              {bulkProgress && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700">
                    Total: {bulkProgress.total} | Success: {bulkProgress.successful} | Failed: {bulkProgress.failed}
                  </p>
                </div>
              )}

              {bulkResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {bulkResults.map((result) => (
                    <div
                      key={result.index}
                      className={`p-3 rounded-lg ${result.success ? 'bg-green-50' : 'bg-red-50'}`}
                    >
                      <p className="text-sm font-medium text-gray-700">{result.prompt}</p>
                      {result.success ? (
                        <p className="text-sm text-gray-600 mt-1">{result.output.slice(0, 200)}...</p>
                      ) : (
                        <p className="text-sm text-red-600 mt-1">{result.error}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Image to Copy Tab */}
      {activeTab === 'image' && (
        <div className="space-y-6">
          <p className="text-gray-600">Generate copy from an image (requires vision-capable model like llava).</p>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
              id="image-upload"
            />
            <label
              htmlFor="image-upload"
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer"
            >
              Upload Image
            </label>
          </div>

          {imagePreview && (
            <div className="flex justify-center">
              <img src={imagePreview} alt="Preview" className="max-w-md max-h-64 rounded-lg shadow" />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Output Type</label>
            <select
              value={imageOutputType}
              onChange={(e) => setImageOutputType(e.target.value as 'description' | 'ad_copy' | 'social_post')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
            >
              <option value="description">Description</option>
              <option value="ad_copy">Ad Copy</option>
              <option value="social_post">Social Post</option>
            </select>
          </div>

          <button
            onClick={handleImageToCopy}
            disabled={loading || !imageBase64}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Generate from Image'}
          </button>

          {imageResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Generated Copy</h4>
              <p className="text-gray-800 whitespace-pre-wrap">{imageResult}</p>
              <button
                onClick={() => navigator.clipboard.writeText(imageResult)}
                className="mt-2 text-sm text-purple-600 hover:text-purple-700"
              >
                Copy to clipboard
              </button>
            </div>
          )}
        </div>
      )}

      {/* Plagiarism Check Tab */}
      {activeTab === 'plagiarism' && (
        <div className="space-y-6">
          <p className="text-gray-600">Check content originality.</p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content to Check</label>
            <textarea
              value={plagiarismInput}
              onChange={(e) => setPlagiarismInput(e.target.value)}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              placeholder="Paste content to check for originality..."
            />
          </div>

          <button
            onClick={handlePlagiarismCheck}
            disabled={loading || !plagiarismInput}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? 'Checking...' : 'Check Originality'}
          </button>

          {plagiarismResult && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-4 mb-4">
                <div
                  className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                    plagiarismResult.is_original
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {Math.round(plagiarismResult.originality_score)}%
                </div>
                <div>
                  <p className="font-medium text-gray-800">
                    {plagiarismResult.is_original ? 'Content appears original' : 'Potential similarity detected'}
                  </p>
                  <p className="text-sm text-gray-500">
                    Unique phrases ratio: {(plagiarismResult.unique_phrases_ratio * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
