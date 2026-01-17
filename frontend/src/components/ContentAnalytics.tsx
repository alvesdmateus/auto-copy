import { useState, useEffect } from 'react';
import {
  FullAnalysis,
  getFullAnalysis,
} from '../api/client';

interface ContentAnalyticsProps {
  text: string;
  contentType?: string;
  platform?: string;
  keywords?: string[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

export function ContentAnalytics({
  text,
  contentType = 'social',
  platform,
  keywords,
  isExpanded = false,
  onToggle,
}: ContentAnalyticsProps) {
  const [analysis, setAnalysis] = useState<FullAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (text && text.length > 20) {
      analyzeContent();
    } else {
      setAnalysis(null);
    }
  }, [text, contentType, platform]);

  const analyzeContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getFullAnalysis(text, keywords, contentType, platform);
      setAnalysis(result);
    } catch (err) {
      setError('Analysis unavailable');
    } finally {
      setLoading(false);
    }
  };

  if (!text || text.length < 20) return null;

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 dark:text-green-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBg = (score: number) => {
    if (score >= 70) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 dark:text-green-400';
      case 'negative': return 'text-red-600 dark:text-red-400';
      case 'mixed': return 'text-yellow-600 dark:text-yellow-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  // Compact view - just score pills
  if (!isExpanded) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {loading ? (
          <span className="text-xs text-gray-400 animate-pulse">Analyzing...</span>
        ) : analysis ? (
          <>
            <button
              onClick={onToggle}
              className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <span className={getScoreColor(analysis.engagement.overall_score)}>
                {Math.round(analysis.engagement.overall_score)}
              </span>
              <span className="text-gray-500 dark:text-gray-400">Engagement</span>
            </button>
            <span className={`px-2 py-1 rounded-full text-xs ${
              analysis.readability.difficulty_level === 'easy'
                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                : analysis.readability.difficulty_level === 'moderate'
                ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
            }`}>
              {analysis.readability.difficulty_level}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs capitalize ${getSentimentColor(analysis.sentiment.overall_sentiment)} bg-gray-100 dark:bg-gray-700`}>
              {analysis.sentiment.overall_sentiment}
            </span>
          </>
        ) : error ? (
          <span className="text-xs text-gray-400">{error}</span>
        ) : null}
      </div>
    );
  }

  // Expanded view - full analytics
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50 cursor-pointer"
        onClick={onToggle}
      >
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Content Analytics</h4>
        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </div>

      {loading ? (
        <div className="p-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-2"></div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
          ))}
        </div>
      ) : analysis ? (
        <div className="p-4 space-y-4">
          {/* Engagement Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Engagement Score</span>
              <span className={`text-lg font-bold ${getScoreColor(analysis.engagement.overall_score)}`}>
                {Math.round(analysis.engagement.overall_score)}/100
              </span>
            </div>
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBg(analysis.engagement.overall_score)} transition-all`}
                style={{ width: `${analysis.engagement.overall_score}%` }}
              />
            </div>
            <div className="grid grid-cols-5 gap-1 mt-2 text-xs">
              {[
                { label: 'Headline', score: analysis.engagement.headline_score },
                { label: 'Hook', score: analysis.engagement.hook_score },
                { label: 'Read', score: analysis.engagement.readability_score },
                { label: 'Emotion', score: analysis.engagement.emotional_score },
                { label: 'CTA', score: analysis.engagement.cta_score },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className={`font-medium ${getScoreColor(item.score)}`}>{Math.round(item.score)}</div>
                  <div className="text-gray-500 dark:text-gray-400">{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Readability */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Readability</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                Grade {analysis.readability.flesch_kincaid_grade.toFixed(1)}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {analysis.readability.difficulty_level} - {analysis.readability.target_audience}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Reading Time</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">
                {analysis.readability.reading_time_seconds < 60
                  ? `${analysis.readability.reading_time_seconds}s`
                  : `${Math.round(analysis.readability.reading_time_seconds / 60)}m`}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {analysis.readability.word_count} words, {analysis.readability.sentence_count} sentences
              </p>
            </div>
          </div>

          {/* Sentiment */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Sentiment</p>
              <span className={`text-sm font-medium capitalize ${getSentimentColor(analysis.sentiment.overall_sentiment)}`}>
                {analysis.sentiment.overall_sentiment}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {analysis.sentiment.emotions.slice(0, 4).map((emotion) => (
                <span
                  key={emotion.emotion}
                  className="px-2 py-0.5 bg-gray-200 dark:bg-gray-600 rounded text-xs text-gray-700 dark:text-gray-300 capitalize"
                >
                  {emotion.emotion} ({Math.round(emotion.score * 100)}%)
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2 text-xs">
              {analysis.sentiment.is_urgent && (
                <span className="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded">Urgent</span>
              )}
              {analysis.sentiment.is_persuasive && (
                <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded">Persuasive</span>
              )}
              {analysis.sentiment.is_informative && (
                <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded">Informative</span>
              )}
            </div>
          </div>

          {/* SEO Score */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500 dark:text-gray-400">SEO Score</span>
              <span className={`text-sm font-medium ${getScoreColor(analysis.seo.seo_score)}`}>
                {analysis.seo.seo_score}/100
              </span>
            </div>
            {analysis.seo.suggestions.length > 0 && (
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {analysis.seo.suggestions.slice(0, 3).map((suggestion, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-yellow-500">&#8226;</span>
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Predictions */}
          <div className="grid grid-cols-3 gap-2 text-xs text-center">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
              <p className="text-gray-500 dark:text-gray-400">Click Rate</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">
                {analysis.engagement.predicted_click_rate}
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
              <p className="text-gray-500 dark:text-gray-400">Completion</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {Math.round(analysis.engagement.predicted_read_completion * 100)}%
              </p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded p-2">
              <p className="text-gray-500 dark:text-gray-400">Shareability</p>
              <p className="font-medium text-gray-900 dark:text-white capitalize">
                {analysis.engagement.predicted_share_likelihood.replace('_', ' ')}
              </p>
            </div>
          </div>

          {/* Improvements */}
          {analysis.engagement.improvements.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suggestions</p>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                {analysis.engagement.improvements.map((improvement, i) => (
                  <li key={i} className="flex items-start gap-1">
                    <span className="text-blue-500">&#10132;</span>
                    {improvement}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : error ? (
        <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">{error}</div>
      ) : null}
    </div>
  );
}
