import { Link } from 'react-router-dom';
import { ContentGenerator } from '../components/ContentGenerator';
import { ThemeToggle } from '../components/ThemeToggle';

export function Content() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <Link to="/" className="text-2xl font-bold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400">
                Auto-Copy
              </Link>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Multi-Format Content Generator
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                Generator
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

      <main className="py-8">
        <ContentGenerator />
      </main>
    </div>
  );
}
