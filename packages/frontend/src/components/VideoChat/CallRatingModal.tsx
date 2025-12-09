import { useState } from 'react';
import { StarIcon, HeartIcon, XMarkIcon } from '@heroicons/react/24/solid';
import { StarIcon as StarOutlineIcon, HeartIcon as HeartOutlineIcon } from '@heroicons/react/24/outline';

interface CallRatingModalProps {
  sessionId: string;
  peerId: string;
  callDuration: number;
  onSubmit: (data: {
    rating: number;
    comment?: string;
    tags?: string[];
    isFavorite: boolean;
  }) => Promise<void>;
  onSkip: () => void;
  isLoading?: boolean;
}

const RATING_TAGS = [
  'Friendly',
  'Funny',
  'Interesting',
  'Kind',
  'Good Listener',
  'Smart',
  'Creative',
  'Respectful',
];

export default function CallRatingModal({
  sessionId,
  peerId,
  callDuration,
  onSubmit,
  onSkip,
  isLoading = false,
}: CallRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;

    setSubmitting(true);
    try {
      await onSubmit({
        rating,
        comment: comment.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
        isFavorite,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag)
        ? prev.filter((t) => t !== tag)
        : prev.length < 3
        ? [...prev, tag]
        : prev
    );
  };

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const displayRating = hoveredRating || rating;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl transform transition-all">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">How was that?</h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              Call lasted {formatDuration(callDuration)}
            </p>
          </div>
          <button
            onClick={onSkip}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Star Rating */}
        <div className="mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 text-center">
            Rate your experience
          </p>
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoveredRating(star)}
                onMouseLeave={() => setHoveredRating(0)}
                className="p-1 transition-transform hover:scale-110 focus:outline-none"
              >
                {star <= displayRating ? (
                  <StarIcon className="w-10 h-10 text-yellow-400" />
                ) : (
                  <StarOutlineIcon className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                )}
              </button>
            ))}
          </div>
          {displayRating > 0 && (
            <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-2">
              {displayRating === 1 && 'Poor'}
              {displayRating === 2 && 'Fair'}
              {displayRating === 3 && 'Good'}
              {displayRating === 4 && 'Great'}
              {displayRating === 5 && 'Excellent!'}
            </p>
          )}
        </div>

        {/* Tags */}
        <div className="mb-6">
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            What stood out? <span className="text-slate-400">(optional, max 3)</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {RATING_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                disabled={!selectedTags.includes(tag) && selectedTags.length >= 3}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-violet-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="mb-6">
          <label className="text-sm text-slate-600 dark:text-slate-400 mb-2 block">
            Add a comment <span className="text-slate-400">(optional)</span>
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={200}
            placeholder="Share your thoughts..."
            className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl p-3 text-slate-900 dark:text-white placeholder-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            rows={3}
          />
          <p className="text-xs text-slate-400 mt-1 text-right">{comment.length}/200</p>
        </div>

        {/* Favorite Toggle */}
        <button
          onClick={() => setIsFavorite(!isFavorite)}
          className={`w-full mb-6 p-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
            isFavorite
              ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 border-2 border-pink-500'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-2 border-transparent hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          {isFavorite ? (
            <>
              <HeartIcon className="w-5 h-5" />
              Added to Favorites
            </>
          ) : (
            <>
              <HeartOutlineIcon className="w-5 h-5" />
              Add to Favorites
            </>
          )}
        </button>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onSkip}
            disabled={submitting}
            className="flex-1 px-4 py-3 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="flex-1 px-4 py-3 bg-violet-600 text-white rounded-xl hover:bg-violet-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {submitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              'Submit'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
