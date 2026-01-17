import { useState, useEffect } from 'react';
import {
  Tag,
  TagCreate,
  fetchTags,
  createTag,
  updateTag,
  deleteTag,
} from '../api/client';

interface TagManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onTagsChange?: () => void;
}

const TAG_COLORS = [
  '#6B7280', // gray
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
  '#06B6D4', // cyan
];

export function TagManager({ isOpen, onClose, onTagsChange }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<TagCreate>({
    name: '',
    color: TAG_COLORS[0],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadTags();
    }
  }, [isOpen]);

  const loadTags = async () => {
    try {
      const data = await fetchTags();
      setTags(data);
    } catch (err) {
      setError('Failed to load tags');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (editingTag) {
        await updateTag(editingTag.id, formData);
      } else {
        await createTag(formData);
      }
      await loadTags();
      onTagsChange?.();
      resetForm();
    } catch (err) {
      setError(editingTag ? 'Failed to update tag' : 'Failed to create tag (name may already exist)');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color || TAG_COLORS[0],
    });
    setIsCreating(true);
  };

  const handleDelete = async (tag: Tag) => {
    if (!confirm(`Delete tag "${tag.name}"? It will be removed from all generations.`)) {
      return;
    }

    try {
      await deleteTag(tag.id);
      await loadTags();
      onTagsChange?.();
    } catch (err) {
      setError('Failed to delete tag');
    }
  };

  const resetForm = () => {
    setEditingTag(null);
    setIsCreating(false);
    setFormData({
      name: '',
      color: TAG_COLORS[0],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75 dark:bg-gray-900 dark:bg-opacity-75"
          onClick={onClose}
        />

        <div className="inline-block w-full max-w-lg my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 rounded-xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Tags
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Label and filter your generations
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
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Create/Edit Form */}
            {isCreating ? (
              <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {editingTag ? 'Edit Tag' : 'New Tag'}
                </h3>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Tag name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    autoFocus
                  />
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-2">
                      Color
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {TAG_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, color })}
                          className={`w-7 h-7 rounded-full transition-transform ${
                            formData.color === color ? 'ring-2 ring-offset-2 ring-blue-500 scale-110' : ''
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={loading || !formData.name.trim()}
                      className="flex-1 py-2 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Saving...' : editingTag ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={resetForm}
                      className="py-2 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full mb-4 py-3 px-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-gray-500 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-colors"
              >
                + Create New Tag
              </button>
            )}

            {/* Tag List */}
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="w-full text-center text-gray-500 dark:text-gray-400 py-8">
                  No tags yet. Create one to label your generations.
                </p>
              ) : (
                tags.map((tag) => (
                  <div
                    key={tag.id}
                    className="group flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: tag.color || TAG_COLORS[0] }}
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {tag.name}
                    </span>
                    <span className="text-xs text-gray-400">
                      ({tag.usage_count || 0})
                    </span>
                    <div className="hidden group-hover:flex items-center gap-1 ml-1">
                      <button
                        onClick={() => handleEdit(tag)}
                        className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="Edit"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(tag)}
                        className="p-0.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
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
