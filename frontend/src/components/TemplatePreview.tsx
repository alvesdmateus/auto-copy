import { Template } from '../api/client';

interface TemplatePreviewProps {
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TemplatePreview({ template, isOpen, onClose }: TemplatePreviewProps) {
  if (!isOpen || !template) return null;

  const categoryColors: Record<string, string> = {
    social: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
    email: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    ads: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
    ecommerce: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    seo: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    general: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                  {template.name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {template.platform}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      categoryColors[template.category] || categoryColors.general
                    }`}
                  >
                    {template.category}
                  </span>
                  {template.is_ab_template && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300">
                      A/B Test
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-200px)]">
            {template.description && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {template.description}
                </p>
              </div>
            )}

            {template.variables && template.variables.length > 0 && (
              <div className="mb-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Variables
                </h3>
                <div className="flex flex-wrap gap-2">
                  {template.variables.map((v) => (
                    <span
                      key={v.name}
                      className="px-2 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                    >
                      {'{{'}
                      {v.name}
                      {'}}'}
                      {v.required && <span className="text-red-500 ml-1">*</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Prompt Template
              </h3>
              <pre className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono overflow-x-auto">
                {template.prompt_template}
              </pre>
            </div>

            {template.example_output && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Example Output
                </h3>
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {template.example_output}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
