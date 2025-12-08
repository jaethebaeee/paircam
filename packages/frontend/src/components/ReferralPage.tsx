import { useState } from 'react';
import { toast } from 'sonner';
import { useReferral, ReferralTier } from '../hooks/useReferral';
import AnimatedBackground from './ui/AnimatedBackground';
import SEO from './SEO';

// Tier badge colors
const tierColors: Record<number, { bg: string; text: string; border: string; emoji: string }> = {
  1: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300', emoji: '🌱' },
  2: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', emoji: '🥉' },
  3: { bg: 'bg-slate-200', text: 'text-slate-700', border: 'border-slate-400', emoji: '🥈' },
  4: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-400', emoji: '🥇' },
  5: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-400', emoji: '👑' },
  6: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-400', emoji: '💎' },
};

const tierNames: Record<number, string> = {
  1: 'Starter',
  2: 'Bronze',
  3: 'Silver',
  4: 'Gold',
  5: 'Platinum',
  6: 'Diamond',
};

export default function ReferralPage() {
  const { stats, history, tiers, status, isLoading, error, refreshStats, applyReferralCode } = useReferral();
  const [referralInput, setReferralInput] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const handleCopyCode = async () => {
    if (!stats?.referralCode) return;

    try {
      await navigator.clipboard.writeText(stats.referralCode);
      setIsCopied(true);
      toast.success('Code copied! Now share it 🚀');
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy code');
    }
  };

  const handleShare = async () => {
    if (!stats?.referralCode) return;

    const shareData = {
      title: 'Join me on PairCam! 🎥',
      text: `Yo! Use my code ${stats.referralCode} and we both get free coins! 🪙`,
      url: `https://paircam.live?ref=${stats.referralCode}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(
          `${shareData.text}\n${shareData.url}`
        );
        toast.success('Link copied! Send it to your friends 🎉');
      }
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const handleApplyCode = async () => {
    if (!referralInput.trim()) {
      toast.error('Enter a code first!');
      return;
    }

    setIsApplying(true);
    try {
      const result = await applyReferralCode(referralInput.trim());
      toast.success(result.message);
      setReferralInput('');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That code didn\'t work');
    } finally {
      setIsApplying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && referralInput.trim() && !isApplying) {
      handleApplyCode();
    }
  };

  const currentTierColors = tierColors[stats?.currentTier || 1];
  const currentTierName = tierNames[stats?.currentTier || 1];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">😢</span>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Oops! Something broke</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => refreshStats()}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Refer Friends & Earn Free Coins"
        description="Invite your squad to PairCam and stack free coins! Get 100-350 coins for every friend who joins. They get 150 coins too. Level up your rewards!"
        url="https://paircam.live/referrals"
        keywords="paircam referral, free coins, invite friends, referral rewards, earn coins, video chat rewards"
      />
      <div className="min-h-screen py-8 px-4 relative overflow-hidden">
        <AnimatedBackground variant="gradient-orbs" />

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-2">
            Squad Up & Get Paid 💰
          </h1>
          <p className="text-gray-600 text-lg">
            Bring your friends. Stack coins. No cap.
          </p>
        </div>

        {/* Main Stats Card */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          {/* Referral Code */}
          <div className="text-center mb-6">
            <p className="text-sm text-gray-500 mb-2">Your Code</p>
            <div className="flex items-center justify-center gap-3">
              <div className="bg-gradient-to-r from-pink-50 to-purple-50 border-2 border-dashed border-pink-300 rounded-xl px-6 py-3">
                <span className="text-2xl sm:text-3xl font-bold tracking-wider text-gray-800">
                  {stats?.referralCode || '------'}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className={`p-3 rounded-xl transition-all ${
                  isCopied
                    ? 'bg-green-100 text-green-600'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title="Copy code"
              >
                {isCopied ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Share Button */}
          <button
            onClick={handleShare}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 text-lg"
          >
            <span>🚀</span>
            Share & Get Coins
          </button>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-pink-600">{stats?.totalReferrals || 0}</p>
              <p className="text-sm text-gray-600">Friends Invited</p>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats?.qualifiedReferrals || 0}</p>
              <p className="text-sm text-gray-600">Active</p>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-yellow-600">{stats?.totalCoinsEarned || 0}</p>
              <p className="text-sm text-gray-600">Coins Earned</p>
            </div>
            <div className={`${currentTierColors.bg} rounded-xl p-4 text-center border ${currentTierColors.border}`}>
              <p className={`text-2xl font-bold ${currentTierColors.text}`}>
                {currentTierColors.emoji} {currentTierName}
              </p>
              <p className="text-sm text-gray-600">Your Rank</p>
            </div>
          </div>

          {/* Progress to Next Tier */}
          {stats && stats.nextTierReferrals > 0 && (
            <div className="mt-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Level up progress</span>
                <span className="font-medium text-purple-600">
                  {stats.nextTierReferrals} more to unlock
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, ((stats.totalReferrals) / (stats.totalReferrals + stats.nextTierReferrals)) * 100)}%`,
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1 text-center">
                Next level: +{stats.nextTierBonus} bonus coins 🎁
              </p>
            </div>
          )}
        </div>

        {/* Apply Referral Code (if not already applied) */}
        {status && !status.hasAppliedReferralCode && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Got a friend's code? 👀</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={referralInput}
                onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                onKeyDown={handleKeyDown}
                placeholder="Enter code here"
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-500 focus:border-pink-500 uppercase tracking-wider"
                maxLength={20}
              />
              <button
                onClick={handleApplyCode}
                disabled={isApplying}
                className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-semibold px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50"
              >
                {isApplying ? '...' : 'Claim'}
              </button>
            </div>
            <p className="text-sm text-gray-500 mt-2">
              Get <span className="font-bold text-green-600">150 free coins</span> instantly! 🪙
            </p>
          </div>
        )}

        {/* Reward Tiers */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mb-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Level Up Rewards 🎮</h2>
          <div className="space-y-3">
            {tiers.map((tier: ReferralTier) => {
              const isCurrentTier = tier.tier === stats?.currentTier;
              const isUnlocked = tier.tier <= (stats?.currentTier || 1);
              const colors = tierColors[tier.tier];

              return (
                <div
                  key={tier.tier}
                  className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                    isCurrentTier
                      ? `${colors.bg} ${colors.border} shadow-md`
                      : isUnlocked
                        ? `${colors.bg} ${colors.border} opacity-80`
                        : 'bg-gray-50 border-gray-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${colors.bg} ${colors.text} text-xl border ${colors.border}`}>
                      {colors.emoji}
                    </div>
                    <div>
                      <p className={`font-semibold ${isCurrentTier ? colors.text : 'text-gray-700'}`}>
                        {tier.name}
                        {isCurrentTier && (
                          <span className="ml-2 text-xs bg-pink-500 text-white px-2 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500">
                        {tier.minReferrals}+ friends
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+{tier.bonusPerReferral} coins</p>
                    <p className="text-xs text-gray-500">per friend</p>
                    {tier.milestoneBonus > 0 && (
                      <p className="text-xs text-purple-600 font-medium">
                        +{tier.milestoneBonus} level bonus
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Referral History */}
        {history.length > 0 && (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Your Squad 👥</h2>
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                      {item.referredUserUsername?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">
                        {item.referredUserUsername || 'Anonymous'}
                      </p>
                      <p className="text-xs text-gray-500">
                        Joined {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-bold">+{item.coinsRewarded}</span>
                    <span className="text-yellow-500">🪙</span>
                    {item.isQualified && (
                      <span className="text-green-500">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl p-6 mt-6 border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">How It Works 🤔</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
                📤
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">Share Your Code</h3>
              <p className="text-sm text-gray-600">
                Send it to friends, post it anywhere
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
                🎉
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">They Join</h3>
              <p className="text-sm text-gray-600">
                They use your code when signing up
              </p>
            </div>
            <div className="text-center p-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-3xl">
                💰
              </div>
              <h3 className="font-semibold text-gray-800 mb-1">You Both Win</h3>
              <p className="text-sm text-gray-600">
                Free coins for everyone, instantly
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
