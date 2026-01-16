import { useState } from 'react';
import { Generator } from '../components/Generator';
import { HistoryPanel } from '../components/HistoryPanel';
import { GenerationHistory } from '../api/client';

export function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleGenerated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleSelectHistory = (item: GenerationHistory) => {
    navigator.clipboard.writeText(item.output);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Auto-Copy</h1>
          <p className="text-sm text-gray-500">AI-powered copywriting assistant</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <Generator onGenerated={handleGenerated} />
            </div>
          </div>

          <div className="lg:col-span-1">
            <HistoryPanel
              onSelectHistory={handleSelectHistory}
              refreshTrigger={refreshTrigger}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
