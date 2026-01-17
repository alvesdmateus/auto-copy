import { useState, useEffect } from 'react';
import { Template, TemplateVariable, WizardStep } from '../api/client';

interface TemplateWizardProps {
  template: Template;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (values: Record<string, string>) => void;
  initialValues?: Record<string, string>;
}

export function TemplateWizard({
  template,
  isOpen,
  onClose,
  onComplete,
  initialValues = {},
}: TemplateWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const wizardSteps = template.wizard_steps || [];
  const variables = template.variables || [];

  // Create a map of variable name to variable definition
  const variableMap = variables.reduce(
    (acc, v) => ({ ...acc, [v.name]: v }),
    {} as Record<string, TemplateVariable>
  );

  // Reset state when template changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
      setValues(initialValues);
      setErrors({});
    }
  }, [isOpen, template.id, initialValues]);

  if (!isOpen || wizardSteps.length === 0) return null;

  const currentStepData = wizardSteps[currentStep];
  const stepVariables = currentStepData.variables
    .map((name) => variableMap[name])
    .filter(Boolean);

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === wizardSteps.length - 1;

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    for (const variable of stepVariables) {
      if (variable.required && !values[variable.name]?.trim()) {
        newErrors[variable.name] = `${variable.label} is required`;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => prev - 1);
  };

  const handleComplete = () => {
    if (validateCurrentStep()) {
      onComplete(values);
      onClose();
    }
  };

  const handleSkip = () => {
    // Allow skipping if no required fields in current step
    const hasRequired = stepVariables.some((v) => v.required);
    if (!hasRequired) {
      if (isLastStep) {
        onComplete(values);
        onClose();
      } else {
        setCurrentStep((prev) => prev + 1);
      }
    }
  };

  // Calculate progress percentage
  const progress = ((currentStep + 1) / wizardSteps.length) * 100;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full">
          {/* Progress bar */}
          <div className="h-1 bg-gray-200 dark:bg-gray-700 rounded-t-lg overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Step {currentStep + 1} of {wizardSteps.length}
                </p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {currentStepData.title}
                </h2>
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
            {currentStepData.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {currentStepData.description}
              </p>
            )}
          </div>

          {/* Content */}
          <div className="px-6 py-4 space-y-4">
            {stepVariables.map((variable) => (
              <div key={variable.name}>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
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
                    rows={3}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 ${
                      errors[variable.name]
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                ) : variable.type === 'select' && variable.options ? (
                  <select
                    value={values[variable.name] || ''}
                    onChange={(e) => handleChange(variable.name, e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 ${
                      errors[variable.name]
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
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
                    className={`w-full px-3 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 ${
                      errors[variable.name]
                        ? 'border-red-500 dark:border-red-500'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  />
                )}

                {errors[variable.name] && (
                  <p className="mt-1 text-sm text-red-500">{errors[variable.name]}</p>
                )}
              </div>
            ))}
          </div>

          {/* Step indicators */}
          <div className="px-6 py-2">
            <div className="flex justify-center gap-2">
              {wizardSteps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => {
                    if (index < currentStep) {
                      setCurrentStep(index);
                    }
                  }}
                  disabled={index > currentStep}
                  className={`w-2.5 h-2.5 rounded-full transition-colors ${
                    index === currentStep
                      ? 'bg-blue-600'
                      : index < currentStep
                      ? 'bg-blue-300 dark:bg-blue-700 cursor-pointer hover:bg-blue-400'
                      : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  }`}
                  title={wizardSteps[index].title}
                />
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 rounded-b-lg">
            <div className="flex justify-between">
              <div>
                {!isFirstStep && (
                  <button
                    onClick={handleBack}
                    className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Back
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {!stepVariables.some((v) => v.required) && (
                  <button
                    onClick={handleSkip}
                    className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    Skip
                  </button>
                )}
                {isLastStep ? (
                  <button
                    onClick={handleComplete}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Complete
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
