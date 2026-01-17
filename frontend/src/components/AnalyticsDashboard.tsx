import { useState, useEffect } from 'react';
import {
  UsageAnalytics,
  ABTestStats,
  ABTestResult,
  getUsageAnalytics,
  getABTestStats,
  getABTests,
  recordABTestWinner,
} from '../api/client';

interface AnalyticsDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AnalyticsDashboard({ isOpen, onClose }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'templates' | 'ab-tests'>('overview');
  const [analytics, setAnalytics] = useState<UsageAnalytics | null>(null);
  const [abStats, setAbStats] = useState<ABTestStats | null>(null);
  const [abTests, setAbTests] = useState<ABTestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usageData, abStatsData, abTestsData] = await Promise.all([
        getUsageAnalytics(),
        getABTestStats(),
        getABTests(),
      ]);
      setAnalytics(usageData);
      setAbStats(abStatsData);
      setAbTests(abTestsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleRecordWinner = async (testId: number, winner: 'A' | 'B') => {
    try {
      await recordABTestWinner(testId, winner);
      // Refresh data
      const [abStatsData, abTestsData] = await Promise.all([
        getABTestStats(),
        getABTests(),
      ]);
      setAbStats(abStatsData);
      setAbTests(abTestsData);
    } catch (err) {
      console.error('Failed to record winner:', err);
    }
  };

  if (!isOpen) return null;

  const stats = analytics?.generation_stats;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative inline-block w-full max-w-4xl bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8">
          {/* Header */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Analytics Dashboard</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mt-4">
              {(['overview', 'templates', 'ab-tests'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'templates' ? 'Templates' : 'A/B Tests'}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
                    <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-500">{error}</div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && stats && (
                  <div className="space-y-6">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <StatCard
                        title="Total Generations"
                        value={stats.total_generations}
                        icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                      <StatCard
                        title="Today"
                        value={stats.generations_today}
                        icon="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                      <StatCard
                        title="This Week"
                        value={stats.generations_this_week}
                        icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                      <StatCard
                        title="Favorites"
                        value={stats.total_favorites}
                        icon="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        color="yellow"
                      />
                    </div>

                    {/* Additional Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg. per Day</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stats.avg_generations_per_day.toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Favorite Rate</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {stats.favorite_rate.toFixed(1)}%
                        </p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Output Length</p>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">
                          {Math.round(stats.avg_output_length)} chars
                        </p>
                      </div>
                    </div>

                    {/* Generations by Tone */}
                    {Object.keys(stats.generations_by_tone).length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">By Tone</h3>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(stats.generations_by_tone).map(([tone, count]) => (
                            <span
                              key={tone}
                              className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm"
                            >
                              {tone}: {count}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recent Activity */}
                    {analytics?.recent_activity && analytics.recent_activity.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Recent Activity</h3>
                        <div className="space-y-2">
                          {analytics.recent_activity.slice(0, 5).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded"
                            >
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                                {item.prompt}
                              </span>
                              <div className="flex items-center gap-2 ml-2">
                                {item.is_favorite && (
                                  <span className="text-yellow-500">&#9733;</span>
                                )}
                                <span className="text-xs text-gray-500">
                                  {new Date(item.created_at).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Templates Tab */}
                {activeTab === 'templates' && analytics?.top_templates && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Top Templates</h3>
                    {analytics.top_templates.length === 0 ? (
                      <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                        No template usage data yet
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {analytics.top_templates.map((template, index) => (
                          <div
                            key={template.template_id}
                            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-8 h-8 flex items-center justify-center bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full font-medium">
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium text-gray-900 dark:text-white">
                                  {template.template_name}
                                </p>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  Avg. {Math.round(template.avg_output_length)} chars | {template.favorite_rate.toFixed(0)}% favorited
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {template.usage_count}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">uses</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* A/B Tests Tab */}
                {activeTab === 'ab-tests' && (
                  <div className="space-y-6">
                    {/* A/B Test Stats */}
                    {abStats && (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard title="Total Tests" value={abStats.total_tests} />
                        <StatCard title="Decided" value={abStats.decided_tests} />
                        <StatCard title="A Wins" value={abStats.variant_a_wins} color="green" />
                        <StatCard title="B Wins" value={abStats.variant_b_wins} color="purple" />
                      </div>
                    )}

                    {/* A/B Test List */}
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Recent A/B Tests</h3>
                      {abTests.length === 0 ? (
                        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                          No A/B tests recorded yet
                        </p>
                      ) : (
                        <div className="space-y-4">
                          {abTests.map((test) => (
                            <div
                              key={test.id}
                              className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(test.created_at).toLocaleDateString()}
                                </span>
                                {test.winner ? (
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                                    test.winner === 'A'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                  }`}>
                                    Winner: {test.winner}
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">
                                    Undecided
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className={`p-3 rounded border ${
                                  test.winner === 'A'
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                    : 'border-gray-200 dark:border-gray-600'
                                }`}>
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Variant A</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                                    {test.variant_a}
                                  </p>
                                </div>
                                <div className={`p-3 rounded border ${
                                  test.winner === 'B'
                                    ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-600'
                                }`}>
                                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Variant B</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">
                                    {test.variant_b}
                                  </p>
                                </div>
                              </div>

                              {!test.winner && (
                                <div className="flex gap-2 mt-3">
                                  <button
                                    onClick={() => handleRecordWinner(test.id, 'A')}
                                    className="flex-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    A Wins
                                  </button>
                                  <button
                                    onClick={() => handleRecordWinner(test.id, 'B')}
                                    className="flex-1 px-3 py-1.5 text-sm bg-purple-600 text-white rounded hover:bg-purple-700"
                                  >
                                    B Wins
                                  </button>
                                </div>
                              )}

                              {test.winner_reason && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                  Reason: {test.winner_reason}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-3 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={loadData}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Refresh Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color = 'blue',
}: {
  title: string;
  value: number;
  icon?: string;
  color?: 'blue' | 'green' | 'yellow' | 'purple';
}) {
  const colors = {
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400',
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400',
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[color]}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
            </svg>
          </div>
        )}
        <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}
