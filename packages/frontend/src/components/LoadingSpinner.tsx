/**
 * Loading Spinner Component
 * Provides visual feedback during lazy loading and async operations
 * Improves perceived performance and SEO (Core Web Vitals)
 */
export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-50 via-white to-purple-50">
      <div className="text-center">
        {/* Animated spinner */}
        <div className="relative w-20 h-20 mx-auto mb-4">
          <div className="absolute inset-0 border-4 border-violet-200 rounded-full animate-ping"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-violet-600 rounded-full animate-spin"></div>
    <div
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-white to-purple-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 transition-colors"
      role="status"
      aria-live="polite"
      aria-label="Loading content"
    >
      <div className="text-center">
        {/* Animated spinner */}
        <div className="relative w-20 h-20 mx-auto mb-4" aria-hidden="true">
          <div className="absolute inset-0 border-4 border-pink-200 dark:border-pink-800 rounded-full animate-ping"></div>
          <div className="absolute inset-0 border-4 border-transparent border-t-pink-600 dark:border-t-pink-400 rounded-full animate-spin"></div>
        </div>

        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-gradient">Loading...</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Please wait</p>
        </div>

        {/* Decorative elements */}
        <div className="mt-8 flex gap-2 justify-center">
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-violet-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        <div className="mt-8 flex gap-2 justify-center" aria-hidden="true">
          <div className="w-2 h-2 bg-pink-600 dark:bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="w-2 h-2 bg-purple-600 dark:bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="w-2 h-2 bg-pink-600 dark:bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
}
