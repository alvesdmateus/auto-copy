import { useState, useMemo, useEffect } from 'react';
import {
  countText,
  exportAsMarkdown,
  exportAsHtml,
  PLATFORM_LIMITS,
  RefineAction,
  StyleViolation,
  checkStyle,
} from '../api/client';

interface OutputDisplayProps {
  output: string;
  isLoading?: boolean;
  selectedPlatform?: string;
  onRefine?: (action: RefineAction) => void;
  isRefining?: boolean;
  brandId?: number | null;
}

const REFINE_ACTIONS: { action: RefineAction; label: string; icon: string }[] = [
  { action: 'improve', label: 'Improve', icon: '\u2728' },
  { action: 'shorten', label: 'Shorten', icon: '\u2702' },
  { action: 'lengthen', label: 'Lengthen', icon: '\u2795' },
  { action: 'punchier', label: 'Punchier', icon: '\u26A1' },
  { action: 'formal', label: 'Formal', icon: '\uD83D\uDC54' },
  { action: 'casual', label: 'Casual', icon: '\uD83D\uDE0A' },
];

export function OutputDisplay({
  output,
  isLoading,
  selectedPlatform,
  onRefine,
  isRefining,
  brandId,
}: OutputDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [styleViolations, setStyleViolations] = useState<StyleViolation[]>([]);
  const [styleScore, setStyleScore] = useState<number | null>(null);
  const [showViolations, setShowViolations] = useState(true);

  const { chars, words } = useMemo(() => countText(output), [output]);

  // Check style when output changes and a brand is selected
  useEffect(() => {
    const checkStyleViolations = async () => {
      if (!output || !brandId || isLoading) {
        setStyleViolations([]);
        setStyleScore(null);
        return;
      }

      try {
        const result = await checkStyle(output, brandId);
        setStyleViolations(result.violations);
        setStyleScore(result.score);
      } catch (err) {
        console.error('Failed to check style:', err);
        setStyleViolations([]);
        setStyleScore(null);
      }
    };

    // Debounce the style check
    const timeoutId = setTimeout(checkStyleViolations, 500);
    return () => clearTimeout(timeoutId);
  }, [output, brandId, isLoading]);

  const platformLimit = selectedPlatform
    ? PLATFORM_LIMITS[selectedPlatform.toLowerCase()]
    : null;

  const isOverLimit = platformLimit ? chars > platformLimit.chars : false;

  const handleCopy = async (format: 'plain' | 'markdown' | 'html' = 'plain') => {
    try {
      let textToCopy = output;
      if (format === 'markdown') {
        textToCopy = exportAsMarkdown(output);
      } else if (format === 'html') {
        textToCopy = exportAsHtml(output);
      }
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setShowExportMenu(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  const handleDownload = (format: 'txt' | 'md' | 'html') => {
    let content = output;
    let mimeType = 'text/plain';
    let extension = 'txt';

    if (format === 'md') {
      content = exportAsMarkdown(output);
      extension = 'md';
    } else if (format === 'html') {
      content = exportAsHtml(output);
      mimeType = 'text/html';
      extension = 'html';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `copy-${Date.now()}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  if (!output && !isLoading) {
    return (
      <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg p-8 text-center text-gray-500 dark:text-gray-400">
        Your generated copy will appear here
      </div>
    );
  }

  if (isLoading && !output) {
    return (
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[200px]">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[200px] whitespace-pre-wrap text-gray-900 dark:text-gray-100">
          {output}
          {isLoading && (
            <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
          )}
        </div>

        {/* Action buttons */}
        {output && !isLoading && (
          <div className="absolute top-2 right-2 flex items-center gap-1">
            <button
              onClick={() => handleCopy('plain')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                copied
                  ? 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-2 py-1.5 text-sm rounded-md bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Export
              </button>

              {showExportMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-10">
                  <div className="py-1">
                    <button
                      onClick={() => handleCopy('markdown')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Copy as Markdown
                    </button>
                    <button
                      onClick={() => handleCopy('html')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Copy as HTML
                    </button>
                    <hr className="my-1 border-gray-200 dark:border-gray-700" />
                    <button
                      onClick={() => handleDownload('txt')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Download .txt
                    </button>
                    <button
                      onClick={() => handleDownload('md')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Download .md
                    </button>
                    <button
                      onClick={() => handleDownload('html')}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Download .html
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Character/Word counter */}
      {output && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
            <span>{words} words</span>
            <span
              className={
                isOverLimit ? 'text-red-500 font-medium' : ''
              }
            >
              {chars} characters
              {platformLimit && (
                <span className="ml-1">
                  / {platformLimit.chars} ({platformLimit.label})
                </span>
              )}
            </span>
            {styleScore !== null && (
              <span
                className={`font-medium ${
                  styleScore >= 80
                    ? 'text-green-600 dark:text-green-400'
                    : styleScore >= 50
                    ? 'text-yellow-600 dark:text-yellow-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                Style: {styleScore}%
              </span>
            )}
          </div>
          {isOverLimit && (
            <span className="text-red-500 text-xs">
              {chars - platformLimit!.chars} over limit
            </span>
          )}
        </div>
      )}

      {/* Style Violations */}
      {styleViolations.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Style Guide Warnings ({styleViolations.length})
              </span>
            </div>
            <button
              onClick={() => setShowViolations(!showViolations)}
              className="text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
            >
              {showViolations ? 'Hide' : 'Show'}
            </button>
          </div>
          {showViolations && (
            <ul className="space-y-1">
              {styleViolations.map((violation, index) => (
                <li key={index} className="text-sm text-yellow-700 dark:text-yellow-300 flex items-start gap-2">
                  <span className="mt-0.5">
                    {violation.severity === 'error' ? (
                      <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                    )}
                  </span>
                  <div>
                    <span>{violation.message}</span>
                    {violation.suggestion && (
                      <span className="block text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                        Suggestion: {violation.suggestion}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Refine actions */}
      {output && !isLoading && onRefine && (
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Refine this copy:
          </p>
          <div className="flex flex-wrap gap-2">
            {REFINE_ACTIONS.map(({ action, label, icon }) => (
              <button
                key={action}
                onClick={() => onRefine(action)}
                disabled={isRefining}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm rounded-full border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
