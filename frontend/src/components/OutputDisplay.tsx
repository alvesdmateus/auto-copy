import { useState } from 'react';

interface OutputDisplayProps {
  output: string;
  isLoading?: boolean;
}

export function OutputDisplay({ output, isLoading }: OutputDisplayProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      console.error('Failed to copy');
    }
  };

  if (!output && !isLoading) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-500">
        Your generated copy will appear here
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="bg-white border border-gray-200 rounded-lg p-4 min-h-[200px] whitespace-pre-wrap">
        {output}
        {isLoading && (
          <span className="inline-block w-2 h-4 bg-blue-500 animate-pulse ml-0.5" />
        )}
      </div>
      {output && (
        <button
          onClick={handleCopy}
          className={`absolute top-2 right-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
            copied
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      )}
    </div>
  );
}
