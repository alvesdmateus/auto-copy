import { useState, useEffect } from 'react';
import {
  Brand,
  BrandCreate,
  fetchBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  setDefaultBrand,
} from '../api/client';

interface BrandManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandSelect?: (brand: Brand | null) => void;
  selectedBrandId?: number | null;
}

type ViewMode = 'list' | 'create' | 'edit';

const TONE_OPTIONS = [
  'professional',
  'casual',
  'playful',
  'urgent',
  'empathetic',
  'confident',
  'luxury',
];

export function BrandManager({
  isOpen,
  onClose,
  onBrandSelect,
  selectedBrandId,
}: BrandManagerProps) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<BrandCreate>({
    name: '',
    description: '',
    tone: '',
    voice_attributes: [],
    keywords: [],
    avoid_words: [],
    voice_examples: [],
    style_rules: [],
    is_default: false,
  });

  // Temp input states for array fields
  const [tempKeyword, setTempKeyword] = useState('');
  const [tempAvoidWord, setTempAvoidWord] = useState('');
  const [tempVoiceAttr, setTempVoiceAttr] = useState('');
  const [tempStyleRule, setTempStyleRule] = useState('');
  const [tempVoiceExample, setTempVoiceExample] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadBrands();
    }
  }, [isOpen]);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const data = await fetchBrands();
      setBrands(data);
    } catch (err) {
      setError('Failed to load brands');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      tone: '',
      voice_attributes: [],
      keywords: [],
      avoid_words: [],
      voice_examples: [],
      style_rules: [],
      is_default: false,
    });
    setTempKeyword('');
    setTempAvoidWord('');
    setTempVoiceAttr('');
    setTempStyleRule('');
    setTempVoiceExample('');
  };

  const handleCreate = () => {
    resetForm();
    setEditingBrand(null);
    setViewMode('create');
  };

  const handleEdit = (brand: Brand) => {
    setFormData({
      name: brand.name,
      description: brand.description || '',
      tone: brand.tone || '',
      voice_attributes: brand.voice_attributes || [],
      keywords: brand.keywords || [],
      avoid_words: brand.avoid_words || [],
      voice_examples: brand.voice_examples || [],
      style_rules: brand.style_rules || [],
      is_default: brand.is_default,
    });
    setEditingBrand(brand);
    setViewMode('edit');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Brand name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingBrand) {
        await updateBrand(editingBrand.id, formData);
      } else {
        await createBrand(formData);
      }
      await loadBrands();
      setViewMode('list');
      resetForm();
    } catch (err) {
      setError('Failed to save brand');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this brand?')) return;

    try {
      await deleteBrand(id);
      await loadBrands();
    } catch (err) {
      setError('Failed to delete brand');
    }
  };

  const handleSetDefault = async (id: number) => {
    try {
      await setDefaultBrand(id);
      await loadBrands();
    } catch (err) {
      setError('Failed to set default brand');
    }
  };

  const addToArray = (
    field: 'keywords' | 'avoid_words' | 'voice_attributes' | 'style_rules' | 'voice_examples',
    value: string,
    setter: (v: string) => void
  ) => {
    if (value.trim()) {
      setFormData((prev) => ({
        ...prev,
        [field]: [...(prev[field] || []), value.trim()],
      }));
      setter('');
    }
  };

  const removeFromArray = (
    field: 'keywords' | 'avoid_words' | 'voice_attributes' | 'style_rules' | 'voice_examples',
    index: number
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((_, i) => i !== index),
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {viewMode === 'list' && 'Brand Profiles'}
                {viewMode === 'create' && 'Create Brand'}
                {viewMode === 'edit' && 'Edit Brand'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {viewMode === 'list' && 'Manage your brand voices for consistent copy'}
                {viewMode === 'create' && 'Define a new brand voice profile'}
                {viewMode === 'edit' && `Editing: ${editingBrand?.name}`}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
                {error}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse h-20 bg-gray-200 dark:bg-gray-700 rounded-lg" />
                    ))}
                  </div>
                ) : brands.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No brand profiles yet.</p>
                    <p className="text-sm mt-1">Create one to ensure consistent brand voice.</p>
                  </div>
                ) : (
                  brands.map((brand) => (
                    <div
                      key={brand.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        selectedBrandId === brand.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => onBrandSelect?.(brand)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-gray-900 dark:text-gray-100">
                              {brand.name}
                            </h3>
                            {brand.is_default && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300">
                                Default
                              </span>
                            )}
                            {brand.tone && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                {brand.tone}
                              </span>
                            )}
                          </div>
                          {brand.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {brand.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {brand.keywords?.slice(0, 3).map((kw, i) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded"
                              >
                                {kw}
                              </span>
                            ))}
                            {(brand.keywords?.length || 0) > 3 && (
                              <span className="text-xs text-gray-400">
                                +{brand.keywords!.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-4">
                          {!brand.is_default && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetDefault(brand.id);
                              }}
                              className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                              title="Set as default"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(brand);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(brand.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {(viewMode === 'create' || viewMode === 'edit') && (
              <div className="space-y-5">
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., TechStart Inc."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Primary Tone
                    </label>
                    <select
                      value={formData.tone}
                      onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      <option value="">Select tone...</option>
                      {TONE_OPTIONS.map((tone) => (
                        <option key={tone} value={tone}>
                          {tone.charAt(0).toUpperCase() + tone.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                    placeholder="Brief description of your brand"
                  />
                </div>

                {/* Voice Attributes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Voice Attributes
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tempVoiceAttr}
                      onChange={(e) => setTempVoiceAttr(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('voice_attributes', tempVoiceAttr, setTempVoiceAttr))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="e.g., friendly, innovative, trustworthy"
                    />
                    <button
                      type="button"
                      onClick={() => addToArray('voice_attributes', tempVoiceAttr, setTempVoiceAttr)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.voice_attributes?.map((attr, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-sm">
                        {attr}
                        <button onClick={() => removeFromArray('voice_attributes', i)} className="ml-1 hover:text-purple-900">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Keywords */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Keywords to Include
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tempKeyword}
                      onChange={(e) => setTempKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('keywords', tempKeyword, setTempKeyword))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="e.g., innovation, growth, success"
                    />
                    <button
                      type="button"
                      onClick={() => addToArray('keywords', tempKeyword, setTempKeyword)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.keywords?.map((kw, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                        {kw}
                        <button onClick={() => removeFromArray('keywords', i)} className="ml-1 hover:text-blue-900">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Avoid Words */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Words to Avoid
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tempAvoidWord}
                      onChange={(e) => setTempAvoidWord(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('avoid_words', tempAvoidWord, setTempAvoidWord))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="e.g., cheap, basic, simple"
                    />
                    <button
                      type="button"
                      onClick={() => addToArray('avoid_words', tempAvoidWord, setTempAvoidWord)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.avoid_words?.map((word, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded text-sm">
                        {word}
                        <button onClick={() => removeFromArray('avoid_words', i)} className="ml-1 hover:text-red-900">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Style Rules */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Style Rules
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tempStyleRule}
                      onChange={(e) => setTempStyleRule(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('style_rules', tempStyleRule, setTempStyleRule))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="e.g., No exclamation marks, No all caps"
                    />
                    <button
                      type="button"
                      onClick={() => addToArray('style_rules', tempStyleRule, setTempStyleRule)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.style_rules?.map((rule, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded text-sm">
                        {rule}
                        <button onClick={() => removeFromArray('style_rules', i)} className="ml-1 hover:text-yellow-900">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Voice Examples */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Brand Voice Examples
                  </label>
                  <div className="flex gap-2 mb-2">
                    <textarea
                      value={tempVoiceExample}
                      onChange={(e) => setTempVoiceExample(e.target.value)}
                      rows={2}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm resize-none"
                      placeholder="Paste sample copy that represents your brand voice..."
                    />
                    <button
                      type="button"
                      onClick={() => addToArray('voice_examples', tempVoiceExample, setTempVoiceExample)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 self-end"
                    >
                      Add
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.voice_examples?.map((example, i) => (
                      <div key={i} className="p-2 bg-gray-50 dark:bg-gray-700/50 rounded text-sm text-gray-600 dark:text-gray-400 relative group">
                        <p className="pr-6 line-clamp-2">{example}</p>
                        <button
                          onClick={() => removeFromArray('voice_examples', i)}
                          className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Default checkbox */}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_default}
                    onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Set as default brand
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-between">
              {viewMode === 'list' ? (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleCreate}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Create Brand
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setViewMode('list');
                      resetForm();
                    }}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Brand'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
