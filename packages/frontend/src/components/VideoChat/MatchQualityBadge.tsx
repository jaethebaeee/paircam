import { useEffect, useState } from 'react';
import { SparklesIcon } from '@heroicons/react/24/solid';

interface MatchQualityBadgeProps {
  score: number | null;
  commonInterests: string[];
  show: boolean;
}

export default function MatchQualityBadge({ score, commonInterests, show }: MatchQualityBadgeProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (show && score !== null) {
      // Delay appearance for smooth animation
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      setIsExpanded(false);
    }
  }, [show, score]);

  if (!show || score === null) return null;

  const getScoreColor = () => {
    if (score >= 80) return 'from-emerald-500 to-green-600';
    if (score >= 60) return 'from-violet-500 to-purple-600';
    if (score >= 40) return 'from-blue-500 to-indigo-600';
    return 'from-slate-500 to-slate-600';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Excellent Match';
    if (score >= 60) return 'Great Match';
    if (score >= 40) return 'Good Match';
    return 'New Connection';
  };

  return (
    <div
      className={`fixed top-24 right-4 z-30 transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`bg-gradient-to-r ${getScoreColor()} text-white px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 hover:shadow-xl transition-shadow`}
      >
        <SparklesIcon className="w-5 h-5" />
        <div className="text-left">
          <div className="text-xs opacity-90">{getScoreLabel()}</div>
          <div className="text-lg font-bold">{Math.round(score)}%</div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-4 min-w-[200px] border border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">Match Details</h4>

          {/* Score Breakdown */}
          <div className="mb-4">
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600 dark:text-slate-400">Compatibility</span>
              <span className="font-medium text-slate-900 dark:text-white">{Math.round(score)}%</span>
            </div>
            <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${getScoreColor()} rounded-full transition-all duration-500`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {/* Common Interests */}
          {commonInterests.length > 0 && (
            <div>
              <div className="text-xs text-slate-500 dark:text-slate-400 mb-2">Common Interests</div>
              <div className="flex flex-wrap gap-1">
                {commonInterests.map((interest) => (
                  <span
                    key={interest}
                    className="px-2 py-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 rounded-full text-xs"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {commonInterests.length === 0 && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              No common interests found. Try adding more interests in your preferences!
            </p>
          )}
        </div>
      )}
    </div>
  );
}
