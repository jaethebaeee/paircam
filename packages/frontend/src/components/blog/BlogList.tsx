/**
 * Blog List Component - Lists all blog posts
 * Good for SEO and AdSense placement
 */

import { Link } from 'react-router-dom';
import { blogPosts, categories } from './blogData';
import SEO from '../SEO';

export default function BlogList() {
  // Blog listing schema for SEO
  const blogListSchema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'PairCam Blog - Video Chat Tips, Safety & Guides',
    description: 'Tips, guides, and insights for better video chat experiences. Learn about safety, conversation starters, language learning, and more.',
    url: 'https://paircam.live/blog',
    mainEntity: {
      '@type': 'ItemList',
      itemListElement: blogPosts.map((post, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        item: {
          '@type': 'Article',
          headline: post.title,
          description: post.excerpt,
          url: `https://paircam.live/blog/${post.slug}`,
          datePublished: post.publishedAt,
          author: {
            '@type': 'Organization',
            name: post.author,
          },
        },
      })),
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      {/* SEO for Blog Listing */}
      <SEO
        title="Blog - Video Chat Tips, Safety & Guides"
        description="Tips, guides, and insights for better video chat experiences. Learn about safety, conversation starters, language learning, and making friends online."
        url="https://paircam.live/blog"
        keywords="video chat tips, online safety, conversation starters, language learning, random chat guide, paircam blog"
        jsonLd={blogListSchema}
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            PairCam Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tips, guides, and insights for better video chat experiences
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-3 mb-12">
          <Link
            to="/blog"
            className="px-4 py-2 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium shadow-md hover:shadow-lg transition-shadow"
          >
            All Posts
          </Link>
          {Object.entries(categories).map(([key, { name }]) => (
            <Link
              key={key}
              to={`/blog/category/${key}`}
              className="px-4 py-2 rounded-full bg-white text-gray-700 font-medium shadow-md hover:shadow-lg hover:bg-gray-50 transition-all"
            >
              {name}
            </Link>
          ))}
        </div>

        {/* Ad Placeholder - Top */}
        <div className="bg-gray-200 rounded-xl p-4 mb-8 text-center">
          <p className="text-gray-500 text-sm">Advertisement Space - 728x90 Leaderboard</p>
          <div className="h-[90px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg mt-2">
            <span className="text-gray-400">Ad Unit Here</span>
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {blogPosts.map((post) => (
            <article
              key={post.id}
              className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
            >
              {/* Featured Image Placeholder */}
              <div className="h-48 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
                <div className="text-6xl opacity-50">
                  {post.category === 'safety' && '🛡️'}
                  {post.category === 'tips' && '💡'}
                  {post.category === 'features' && '⭐'}
                  {post.category === 'community' && '👥'}
                  {post.category === 'language-learning' && '🌍'}
                </div>
              </div>

              <div className="p-6">
                {/* Category Badge */}
                <div className="mb-3">
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold
                    ${post.category === 'safety' ? 'bg-green-100 text-green-700' : ''}
                    ${post.category === 'tips' ? 'bg-blue-100 text-blue-700' : ''}
                    ${post.category === 'features' ? 'bg-purple-100 text-purple-700' : ''}
                    ${post.category === 'community' ? 'bg-pink-100 text-pink-700' : ''}
                    ${post.category === 'language-learning' ? 'bg-orange-100 text-orange-700' : ''}
                  `}>
                    {categories[post.category].name}
                  </span>
                </div>

                {/* Title */}
                <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-pink-600 transition-colors line-clamp-2">
                  <Link to={`/blog/${post.slug}`}>
                    {post.title}
                  </Link>
                </h2>

                {/* Excerpt */}
                <p className="text-gray-600 mb-4 line-clamp-3">
                  {post.excerpt}
                </p>

                {/* Meta */}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{new Date(post.publishedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}</span>
                  <span>{post.readTime} min read</span>
                </div>

                {/* Read More */}
                <Link
                  to={`/blog/${post.slug}`}
                  className="mt-4 inline-flex items-center gap-2 text-pink-600 font-semibold hover:text-pink-700 transition-colors"
                >
                  Read More
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </article>
          ))}
        </div>

        {/* Ad Placeholder - Bottom */}
        <div className="bg-gray-200 rounded-xl p-4 mt-12 text-center">
          <p className="text-gray-500 text-sm">Advertisement Space - 728x90 Leaderboard</p>
          <div className="h-[90px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg mt-2">
            <span className="text-gray-400">Ad Unit Here</span>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-16 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-3xl p-8 md:p-12 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Stay Updated</h2>
          <p className="text-lg opacity-90 mb-6 max-w-xl mx-auto">
            Get the latest tips, features, and updates delivered to your inbox.
          </p>
          <form className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 px-6 py-3 rounded-full text-gray-900 focus:outline-none focus:ring-4 focus:ring-white/30"
            />
            <button
              type="submit"
              className="px-8 py-3 bg-white text-pink-600 font-bold rounded-full hover:bg-gray-100 transition-colors shadow-lg"
            >
              Subscribe
            </button>
          </form>
          <p className="text-sm opacity-75 mt-4">No spam, unsubscribe anytime.</p>
        </div>

        {/* Back to Home */}
        <div className="mt-12 text-center">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to PairCam
          </Link>
        </div>
      </div>
    </div>
  );
}
