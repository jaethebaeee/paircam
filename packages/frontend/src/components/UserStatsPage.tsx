import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { getUserStats, getCallHistory, UserAnalytics, CallHistoryItem } from '../api/analytics';
import { PhoneIcon, ClockIcon, ArrowTrendingUpIcon, SparklesIcon, ChartBarIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: 'up' | 'down' | 'neutral';
}

function StatCard({ icon, label, value, subValue, trend }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex items-center gap-3 mb-3">
        <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-lg text-violet-600 dark:text-violet-400">
          {icon}
        </div>
        <span className="text-sm text-slate-500 dark:text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-slate-900 dark:text-white">{value}</span>
        {subValue && (
          <span className={`text-sm ${
            trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-slate-400'
          }`}>
            {subValue}
          </span>
        )}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return `${minutes}m ${secs}s`;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const languageNames: Record<string, string> = {
  en: 'English',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  zh: 'Chinese',
  ja: 'Japanese',
  ko: 'Korean',
  ar: 'Arabic',
  hi: 'Hindi',
};

const regionNames: Record<string, string> = {
  global: 'Global',
  'us-east': 'US East',
  'us-west': 'US West',
  europe: 'Europe',
  asia: 'Asia',
};

export default function UserStatsPage() {
  const { accessToken, authenticate } = useAuth();
  const [stats, setStats] = useState<UserAnalytics | null>(null);
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'trends'>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  useEffect(() => {
    if (!accessToken) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsData, historyData] = await Promise.all([
          getUserStats(accessToken),
          getCallHistory(accessToken, 50),
        ]);

        setStats(statsData);
        setCallHistory(historyData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const weekChange = stats && stats.stats30Days.calls > 0
    ? ((stats.stats7Days.calls - stats.stats30Days.calls / 4) / (stats.stats30Days.calls / 4) * 100).toFixed(0)
    : '0';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Your Stats</h1>
          <p className="text-slate-600 dark:text-slate-400">Track your video chat activity and insights</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={<PhoneIcon className="w-5 h-5" />}
            label="Total Calls"
            value={stats?.totalCalls || 0}
            subValue={parseInt(weekChange) > 0 ? `+${weekChange}% this week` : undefined}
            trend={parseInt(weekChange) > 0 ? 'up' : 'neutral'}
          />
          <StatCard
            icon={<ClockIcon className="w-5 h-5" />}
            label="Total Time"
            value={`${stats?.totalMinutes || 0}m`}
          />
          <StatCard
            icon={<SparklesIcon className="w-5 h-5" />}
            label="Avg Call Length"
            value={formatDuration(stats?.averageCallLength || 0)}
          />
          <StatCard
            icon={<ArrowTrendingUpIcon className="w-5 h-5" />}
            label="Match Quality"
            value={`${Math.round(stats?.averageCompatibilityScore || 0)}%`}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg w-fit">
          {(['overview', 'history', 'trends'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'bg-white dark:bg-slate-700 text-violet-600 dark:text-violet-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && stats && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Languages Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <GlobeAltIcon className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Languages Used</h3>
              </div>
              {stats.topLanguages.length > 0 ? (
                <div className="space-y-3">
                  {stats.topLanguages.map(({ language, count }) => {
                    const percentage = (count / stats.totalCalls) * 100;
                    return (
                      <div key={language}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700 dark:text-slate-300">
                            {languageNames[language] || language.toUpperCase()}
                          </span>
                          <span className="text-slate-500">{count} calls</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">No data yet</p>
              )}
            </div>

            {/* Regions Chart */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2 mb-4">
                <ChartBarIcon className="w-5 h-5 text-violet-600" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Regions</h3>
              </div>
              {stats.topRegions.length > 0 ? (
                <div className="space-y-3">
                  {stats.topRegions.map(({ region, count }) => {
                    const percentage = (count / stats.totalCalls) * 100;
                    return (
                      <div key={region}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-700 dark:text-slate-300">
                            {regionNames[region] || region}
                          </span>
                          <span className="text-slate-500">{count} calls</span>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">No data yet</p>
              )}
            </div>

            {/* Quick Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700 md:col-span-2">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Performance Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-violet-600">{Math.round(100 - (stats.skipRate || 0))}%</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Connection Rate</div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-emerald-600">{Math.round(stats.averageConnectionTime || 0)}ms</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Avg Connect Time</div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{stats.stats7Days.calls}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Calls This Week</div>
                </div>
                <div className="text-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{stats.stats30Days.calls}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">Calls This Month</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            {callHistory.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 dark:bg-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Duration</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Match Score</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {callHistory.map((call) => (
                      <tr key={call.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30">
                        <td className="px-4 py-3 text-sm text-slate-900 dark:text-white">
                          {formatDate(call.createdAt)}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                          {formatDuration(call.duration)}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            call.isTextOnly
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              : 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
                          }`}>
                            {call.isTextOnly ? 'Text' : 'Video'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {call.compatibilityScore ? (
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-200 dark:bg-slate-600 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-violet-600 rounded-full"
                                  style={{ width: `${call.compatibilityScore}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500">{Math.round(call.compatibilityScore)}%</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            call.wasSkipped
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          }`}>
                            {call.wasSkipped ? 'Skipped' : 'Completed'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <PhoneIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400">No call history yet</p>
                <p className="text-sm text-slate-400 dark:text-slate-500">Start chatting to see your history here</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trends' && stats && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* 7-Day Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Last 7 Days</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Calls</span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-white">{stats.stats7Days.calls}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Total Minutes</span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-white">{stats.stats7Days.minutes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Avg Duration</span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-white">{formatDuration(stats.stats7Days.avgDuration)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Skip Rate</span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-white">{stats.stats7Days.skipRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* 30-Day Stats */}
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Last 30 Days</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Calls</span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-white">{stats.stats30Days.calls}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Total Minutes</span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-white">{stats.stats30Days.minutes}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Avg Duration</span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-white">{formatDuration(stats.stats30Days.avgDuration)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">Skip Rate</span>
                  <span className="text-xl font-semibold text-slate-900 dark:text-white">{stats.stats30Days.skipRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
