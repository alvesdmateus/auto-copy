import { useState, useEffect } from 'react';
import {
  GenerationHistory,
  fetchHistory,
  toggleFavorite,
  deleteHistoryItem,
} from '../api/client';

interface HistoryPanelProps {
  onSelectHistory?: (item: GenerationHistory) => void;
  refreshTrigger?: number;
}

export function HistoryPanel({ onSelectHistory, refreshTrigger }: HistoryPanelProps) {
  const [history, setHistory] = useState<GenerationHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [search, setSearch] = useState('');

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await fetchHistory({
        favorites_only: favoritesOnly,
        search: search || undefined,
      });
      setHistory(data);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [favoritesOnly, search, refreshTrigger]);

  const handleToggleFavorite = async (id: number) => {
    try {
      const result = await toggleFavorite(id);
      setHistory((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, is_favorite: result.is_favorite } : item
        )
      );
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this item?')) return;
    try {
      await deleteHistoryItem(id);
      setHistory((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">History</h2>
        <div className="space-y-2">
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          />
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            Favorites only
          </label>
        </div>
      </div>

      <div className="max-h-[400px] overflow-y-auto">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
              </div>
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">No history yet</div>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-gray-700">
            {history.map((item) => (
              <li key={item.id} className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <button
                    onClick={() => onSelectHistory?.(item)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-medium text-gray-900 dark:text-white line-clamp-1">
                      {item.prompt}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                      {item.output}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </button>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleFavorite(item.id)}
                      className={`p-1 rounded ${
                        item.is_favorite
                          ? 'text-yellow-500'
                          : 'text-gray-400 hover:text-yellow-500'
                      }`}
                    >
                      {item.is_favorite ? '\u2605' : '\u2606'}
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                    >
                      x
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
