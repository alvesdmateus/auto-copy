import { useState, useMemo } from 'react';
import {
  countText,
  exportAsMarkdown,
  exportAsHtml,
  PLATFORM_LIMITS,
  RefineAction,
} from '../api/client';

interface OutputDisplayProps {
  output: string;
  isLoading?: boolean;
  selectedPlatform?: string;
  onRefine?: (action: RefineAction) => void;
  isRefining?: boolean;
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
}: OutputDisplayProps) {
  const [copied, setCopied] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const { chars, words } = useMemo(() => countText(output), [output]);

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
          </div>
          {isOverLimit && (
            <span className="text-red-500 text-xs">
              {chars - platformLimit!.chars} over limit
            </span>
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
