/**
 * Usage Indicator Component
 * Shows free tier users their remaining daily usage
 */

interface UsageIndicatorProps {
  matchesRemaining: number;
  maxMatches: number;
  skipsRemaining: number;
  maxSkips: number;
  sessionTimeRemaining: number;
  isPremium: boolean;
  onUpgrade: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function UsageIndicator({
  matchesRemaining,
  maxMatches,
  skipsRemaining,
  maxSkips,
  sessionTimeRemaining,
  isPremium,
  onUpgrade,
}: UsageIndicatorProps) {
  // Don't show for premium users
  if (isPremium) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full text-white text-sm font-medium shadow-md">
        <span>⭐</span>
        <span>Premium</span>
      </div>
    );
  }

  const matchPercentage = (matchesRemaining / maxMatches) * 100;
  const isLow = matchesRemaining <= 3;

  return (
    <div className="flex items-center gap-4">
      {/* Matches Remaining */}
      <div
        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm ${
          isLow
            ? 'bg-red-100 text-red-700 border border-red-200'
            : 'bg-gray-100 text-gray-700 border border-gray-200'
        }`}
        title={`${matchesRemaining} matches remaining today`}
      >
        <span className="text-base">🎯</span>
        <span>{matchesRemaining}/{maxMatches}</span>
        <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              isLow ? 'bg-red-500' : 'bg-green-500'
            }`}
            style={{ width: `${matchPercentage}%` }}
          />
        </div>
      </div>

      {/* Session Timer */}
      {sessionTimeRemaining < Infinity && sessionTimeRemaining > 0 && (
        <div
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium shadow-sm ${
            sessionTimeRemaining < 300
              ? 'bg-orange-100 text-orange-700 border border-orange-200'
              : 'bg-gray-100 text-gray-700 border border-gray-200'
          }`}
          title="Session time remaining"
        >
          <span className="text-base">⏱️</span>
          <span>{formatTime(sessionTimeRemaining)}</span>
        </div>
      )}

      {/* Upgrade Button */}
      <button
        onClick={onUpgrade}
        className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-500 hover:to-orange-600 rounded-full text-white text-sm font-medium shadow-md hover:shadow-lg transition-all"
      >
        <span>⭐</span>
        <span>Upgrade</span>
      </button>
    </div>
  );
}
