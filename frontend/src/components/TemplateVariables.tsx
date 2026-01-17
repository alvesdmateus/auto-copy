import { TemplateVariable } from '../api/client';

interface TemplateVariablesProps {
  variables: TemplateVariable[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
  disabled?: boolean;
}

export function TemplateVariables({
  variables,
  values,
  onChange,
  disabled = false,
}: TemplateVariablesProps) {
  const handleChange = (name: string, value: string) => {
    onChange({ ...values, [name]: value });
  };

  if (!variables || variables.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Template Variables
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {variables.map((variable) => (
          <div key={variable.name}>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {variable.label}
              {variable.required && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </label>
            {variable.type === 'textarea' ? (
              <textarea
                value={values[variable.name] || ''}
                onChange={(e) => handleChange(variable.name, e.target.value)}
                placeholder={variable.placeholder}
                disabled={disabled}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            ) : variable.type === 'select' && variable.options ? (
              <select
                value={values[variable.name] || ''}
                onChange={(e) => handleChange(variable.name, e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select {variable.label.toLowerCase()}...</option>
                {variable.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={values[variable.name] || ''}
                onChange={(e) => handleChange(variable.name, e.target.value)}
                placeholder={variable.placeholder}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
