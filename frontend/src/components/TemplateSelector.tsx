import { Template } from '../api/client';

interface TemplateSelectorProps {
  templates: Template[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  loading?: boolean;
}

export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  loading,
}: TemplateSelectorProps) {
  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 w-20 bg-gray-200 rounded mb-2"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  const grouped = templates.reduce(
    (acc, template) => {
      const platform = template.platform;
      if (!acc[platform]) acc[platform] = [];
      acc[platform].push(template);
      return acc;
    },
    {} as Record<string, Template[]>
  );

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Template
      </label>
      <select
        value={selectedId ?? ''}
        onChange={(e) => onSelect(e.target.value ? Number(e.target.value) : null)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="">No template (free-form)</option>
        {Object.entries(grouped).map(([platform, tmplList]) => (
          <optgroup key={platform} label={platform}>
            {tmplList.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.is_custom ? ' (Custom)' : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
