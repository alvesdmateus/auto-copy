import { useState, useEffect } from 'react';
import {
  Persona,
  PersonaCreate,
  fetchPersonas,
  createPersona,
  updatePersona,
  deletePersona,
} from '../api/client';

interface PersonaManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onPersonaSelect?: (persona: Persona | null) => void;
  selectedPersonaId?: number | null;
}

type ViewMode = 'list' | 'create' | 'edit';

const AGE_RANGES = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
const GENDER_OPTIONS = ['All', 'Male', 'Female', 'Non-binary'];
const INCOME_LEVELS = ['Low', 'Middle', 'Upper-middle', 'High'];
const LANGUAGE_LEVELS = ['Simple', 'Conversational', 'Professional', 'Technical'];
const COMM_STYLES = ['Direct', 'Friendly', 'Formal', 'Casual', 'Empathetic'];

export function PersonaManager({
  isOpen,
  onClose,
  onPersonaSelect,
  selectedPersonaId,
}: PersonaManagerProps) {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<PersonaCreate>({
    name: '',
    description: '',
    age_range: '',
    gender: '',
    occupation: '',
    income_level: '',
    interests: [],
    values: [],
    pain_points: [],
    goals: [],
    communication_style: '',
    language_level: '',
  });

  const [tempInterest, setTempInterest] = useState('');
  const [tempValue, setTempValue] = useState('');
  const [tempPainPoint, setTempPainPoint] = useState('');
  const [tempGoal, setTempGoal] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPersonas();
    }
  }, [isOpen]);

  const loadPersonas = async () => {
    try {
      setLoading(true);
      const data = await fetchPersonas();
      setPersonas(data);
    } catch (err) {
      setError('Failed to load personas');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      age_range: '',
      gender: '',
      occupation: '',
      income_level: '',
      interests: [],
      values: [],
      pain_points: [],
      goals: [],
      communication_style: '',
      language_level: '',
    });
    setTempInterest('');
    setTempValue('');
    setTempPainPoint('');
    setTempGoal('');
  };

  const handleCreate = () => {
    resetForm();
    setEditingPersona(null);
    setViewMode('create');
  };

  const handleEdit = (persona: Persona) => {
    setFormData({
      name: persona.name,
      description: persona.description || '',
      age_range: persona.age_range || '',
      gender: persona.gender || '',
      occupation: persona.occupation || '',
      income_level: persona.income_level || '',
      interests: persona.interests || [],
      values: persona.values || [],
      pain_points: persona.pain_points || [],
      goals: persona.goals || [],
      communication_style: persona.communication_style || '',
      language_level: persona.language_level || '',
    });
    setEditingPersona(persona);
    setViewMode('edit');
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Persona name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingPersona) {
        await updatePersona(editingPersona.id, formData);
      } else {
        await createPersona(formData);
      }
      await loadPersonas();
      setViewMode('list');
      resetForm();
    } catch (err) {
      setError('Failed to save persona');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this persona?')) return;

    try {
      await deletePersona(id);
      await loadPersonas();
    } catch (err) {
      setError('Failed to delete persona');
    }
  };

  const addToArray = (
    field: 'interests' | 'values' | 'pain_points' | 'goals',
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
    field: 'interests' | 'values' | 'pain_points' | 'goals',
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
        <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />

        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                {viewMode === 'list' && 'Audience Personas'}
                {viewMode === 'create' && 'Create Persona'}
                {viewMode === 'edit' && 'Edit Persona'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {viewMode === 'list' && 'Define target audiences for better copy'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
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
                ) : personas.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>No personas yet.</p>
                    <p className="text-sm mt-1">Create one to target your copy better.</p>
                  </div>
                ) : (
                  personas.map((persona) => (
                    <div
                      key={persona.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        selectedPersonaId === persona.id
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                      onClick={() => onPersonaSelect?.(persona)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 dark:text-gray-100">
                            {persona.name}
                          </h3>
                          {persona.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {persona.description}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-2 mt-2">
                            {persona.age_range && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                                {persona.age_range}
                              </span>
                            )}
                            {persona.occupation && (
                              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 rounded">
                                {persona.occupation}
                              </span>
                            )}
                            {persona.pain_points?.slice(0, 2).map((pp, i) => (
                              <span key={i} className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300 rounded">
                                {pp}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-4">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(persona); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(persona.id); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
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
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Persona Name *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      placeholder="e.g., Busy Professional Sarah"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none"
                      placeholder="Brief description of this persona"
                    />
                  </div>
                </div>

                {/* Demographics */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Demographics</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Age Range</label>
                      <select
                        value={formData.age_range}
                        onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="">Select...</option>
                        {AGE_RANGES.map((age) => <option key={age} value={age}>{age}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Gender</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="">Select...</option>
                        {GENDER_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Occupation</label>
                      <input
                        type="text"
                        value={formData.occupation}
                        onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                        placeholder="e.g., Marketing Manager"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Income Level</label>
                      <select
                        value={formData.income_level}
                        onChange={(e) => setFormData({ ...formData, income_level: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="">Select...</option>
                        {INCOME_LEVELS.map((inc) => <option key={inc} value={inc}>{inc}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Communication */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Communication Preferences</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Communication Style</label>
                      <select
                        value={formData.communication_style}
                        onChange={(e) => setFormData({ ...formData, communication_style: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="">Select...</option>
                        {COMM_STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Language Level</label>
                      <select
                        value={formData.language_level}
                        onChange={(e) => setFormData({ ...formData, language_level: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      >
                        <option value="">Select...</option>
                        {LANGUAGE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Pain Points */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Pain Points
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tempPainPoint}
                      onChange={(e) => setTempPainPoint(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('pain_points', tempPainPoint, setTempPainPoint))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="e.g., Not enough time, Information overload"
                    />
                    <button
                      type="button"
                      onClick={() => addToArray('pain_points', tempPainPoint, setTempPainPoint)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.pain_points?.map((pp, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded text-sm">
                        {pp}
                        <button onClick={() => removeFromArray('pain_points', i)} className="ml-1 hover:text-orange-900">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Goals */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Goals
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tempGoal}
                      onChange={(e) => setTempGoal(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('goals', tempGoal, setTempGoal))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="e.g., Save time, Grow business"
                    />
                    <button
                      type="button"
                      onClick={() => addToArray('goals', tempGoal, setTempGoal)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.goals?.map((goal, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-sm">
                        {goal}
                        <button onClick={() => removeFromArray('goals', i)} className="ml-1 hover:text-green-900">×</button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Interests
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={tempInterest}
                      onChange={(e) => setTempInterest(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addToArray('interests', tempInterest, setTempInterest))}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                      placeholder="e.g., Technology, Travel, Fitness"
                    />
                    <button
                      type="button"
                      onClick={() => addToArray('interests', tempInterest, setTempInterest)}
                      className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.interests?.map((int, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-sm">
                        {int}
                        <button onClick={() => removeFromArray('interests', i)} className="ml-1 hover:text-blue-900">×</button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-between">
              {viewMode === 'list' ? (
                <>
                  <button onClick={onClose} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    Close
                  </button>
                  <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Create Persona
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setViewMode('list'); resetForm(); }} className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save Persona'}
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
