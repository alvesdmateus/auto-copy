import { useState } from 'react';
import { Template, CategoryOption } from '../api/client';
import { TemplatePreview } from './TemplatePreview';

interface TemplateSelectorProps {
  templates: Template[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  loading?: boolean;
  categories?: CategoryOption[];
  selectedCategory?: string | null;
  onCategoryChange?: (category: string | null) => void;
}

export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  loading,
  categories,
  selectedCategory,
  onCategoryChange,
}: TemplateSelectorProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === selectedId) || null;

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  // Filter by category if selected
  const filteredTemplates = selectedCategory
    ? templates.filter((t) => t.category === selectedCategory)
    : templates;

  // Group by category first, then by platform
  const groupedByCategory = filteredTemplates.reduce(
    (acc, template) => {
      const category = template.category || 'general';
      if (!acc[category]) acc[category] = {};
      const platform = template.platform;
      if (!acc[category][platform]) acc[category][platform] = [];
      acc[category][platform].push(template);
      return acc;
    },
    {} as Record<string, Record<string, Template[]>>
  );

  const categoryColors: Record<string, string> = {
    social: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
    email: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
    ads: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
    ecommerce: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
    seo: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300',
    general: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="space-y-2">
      {/* Category filter pills */}
      {categories && categories.length > 0 && onCategoryChange && (
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => onCategoryChange(null)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              !selectedCategory
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                selectedCategory === cat.value
                  ? 'bg-blue-600 text-white'
                  : categoryColors[cat.value] || categoryColors.general
              } hover:opacity-80`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Template
          </label>
          <select
            value={selectedId ?? ''}
            onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">No template (free-form)</option>
            {Object.entries(groupedByCategory).map(([category, platforms]) => (
              <optgroup
                key={category}
                label={`--- ${category.toUpperCase()} ---`}
              >
                {Object.entries(platforms).map(([platform, tmplList]) =>
                  tmplList.map((template) => (
                    <option key={template.id} value={template.id}>
                      [{platform}] {template.name}
                      {template.is_custom ? ' (Custom)' : ''}
                      {template.is_ab_template ? ' [A/B]' : ''}
                    </option>
                  ))
                )}
              </optgroup>
            ))}
          </select>
        </div>

        {/* Preview button */}
        {selectedTemplate && (
          <div className="flex items-end">
            <button
              onClick={() => setPreviewOpen(true)}
              className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
              title="Preview template"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Template description */}
      {selectedTemplate?.description && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {selectedTemplate.description}
        </p>
      )}

      <TemplatePreview
        template={selectedTemplate}
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
      />
    </div>
  );
}
