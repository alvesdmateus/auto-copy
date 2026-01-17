import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Generator } from '../components/Generator';
import { HistoryPanel } from '../components/HistoryPanel';
import { ThemeToggle } from '../components/ThemeToggle';
import { CompetitorAnalysis } from '../components/CompetitorAnalysis';
import { ProjectManager } from '../components/ProjectManager';
import { TagManager } from '../components/TagManager';
import { AnalyticsDashboard } from '../components/AnalyticsDashboard';
import { GenerationHistory } from '../api/client';

export function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [competitorAnalysisOpen, setCompetitorAnalysisOpen] = useState(false);
  const [projectManagerOpen, setProjectManagerOpen] = useState(false);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

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
              <button
                onClick={() => setProjectManagerOpen(true)}
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                Projects
              </button>
              <button
                onClick={() => setTagManagerOpen(true)}
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Tags
              </button>
              <button
                onClick={() => setCompetitorAnalysisOpen(true)}
                className="flex items-center gap-1.5 text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analyze
              </button>
              <button
                onClick={() => setAnalyticsOpen(true)}
                className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Analytics
              </button>
              <Link
                to="/content"
                className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Content Studio
              </Link>
              <Link
                to="/integrations"
                className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
                </svg>
                Integrations
              </Link>
              <Link
                to="/advanced"
                className="flex items-center gap-1.5 text-sm text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                AI Tools
              </Link>
              <Link
                to="/history"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                History
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

      {/* Competitor Analysis Modal */}
      <CompetitorAnalysis
        isOpen={competitorAnalysisOpen}
        onClose={() => setCompetitorAnalysisOpen(false)}
      />

      {/* Project Manager Modal */}
      <ProjectManager
        isOpen={projectManagerOpen}
        onClose={() => setProjectManagerOpen(false)}
        onProjectsChange={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Tag Manager Modal */}
      <TagManager
        isOpen={tagManagerOpen}
        onClose={() => setTagManagerOpen(false)}
        onTagsChange={() => setRefreshTrigger((prev) => prev + 1)}
      />

      {/* Analytics Dashboard Modal */}
      <AnalyticsDashboard
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
      />
    </div>
  );
}
