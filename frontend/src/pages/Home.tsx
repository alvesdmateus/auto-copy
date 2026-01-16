import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Generator } from '../components/Generator';
import { HistoryPanel } from '../components/HistoryPanel';
import { ThemeToggle } from '../components/ThemeToggle';
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Auto-Copy
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                AI-powered copywriting assistant
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/history"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                View All History
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
