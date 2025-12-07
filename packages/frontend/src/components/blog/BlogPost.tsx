/**
 * Blog Post Component - Individual blog post page
 * Good for SEO with structured content
 */

import { useParams, Link, Navigate } from 'react-router-dom';
import { getBlogPostBySlug, getRecentPosts, categories } from './blogData';
import SEO from '../SEO';

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPostBySlug(slug) : undefined;
  const recentPosts = getRecentPosts(3).filter(p => p.slug !== slug);

  if (!post) {
    return <Navigate to="/blog" replace />;
  }

  // Build Article schema for SEO
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: `https://paircam.live/blog/${post.slug}-og.jpg`,
    author: {
      '@type': 'Organization',
      name: post.author,
      url: 'https://paircam.live',
    },
    publisher: {
      '@type': 'Organization',
      name: 'PairCam',
      url: 'https://paircam.live',
      logo: {
        '@type': 'ImageObject',
        url: 'https://paircam.live/logo.png',
      },
    },
    datePublished: post.publishedAt,
    dateModified: post.updatedAt,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `https://paircam.live/blog/${post.slug}`,
    },
    articleSection: categories[post.category].name,
    keywords: post.tags.join(', '),
    wordCount: post.content.split(/\s+/).length,
  };

  // Convert markdown-like content to HTML
  const formatContent = (content: string) => {
    return content
      .split('\n')
      .map((line, index) => {
        // Headers
        if (line.startsWith('## ')) {
          return (
            <h2 key={index} className="text-2xl font-bold text-gray-900 mt-8 mb-4">
              {line.replace('## ', '')}
            </h2>
          );
        }
        if (line.startsWith('### ')) {
          return (
            <h3 key={index} className="text-xl font-semibold text-gray-900 mt-6 mb-3">
              {line.replace('### ', '')}
            </h3>
          );
        }
        // List items
        if (line.startsWith('- ')) {
          return (
            <li key={index} className="text-gray-700 ml-4">
              {formatInlineStyles(line.replace('- ', ''))}
            </li>
          );
        }
        // Block quotes
        if (line.startsWith('> ')) {
          return (
            <blockquote key={index} className="border-l-4 border-pink-500 pl-4 italic text-gray-600 my-4">
              {line.replace('> ', '')}
            </blockquote>
          );
        }
        // Tables (simple rendering)
        if (line.startsWith('|')) {
          return null; // Skip table lines for now
        }
        // Paragraphs
        if (line.trim()) {
          return (
            <p key={index} className="text-gray-700 leading-relaxed mb-4">
              {formatInlineStyles(line)}
            </p>
          );
        }
        return null;
      })
      .filter(Boolean);
  };

  // Format inline styles (bold, italic, links)
  const formatInlineStyles = (text: string) => {
    // Bold
    const parts = text.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        return <strong key={i} className="font-semibold">{part}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12 px-4">
      {/* SEO with Article Schema */}
      <SEO
        title={post.title}
        description={post.excerpt}
        url={`https://paircam.live/blog/${post.slug}`}
        image={`https://paircam.live/blog/${post.slug}-og.jpg`}
        type="article"
        keywords={post.tags.join(', ')}
        jsonLd={articleSchema}
      />

      <article className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-8">
          <Link to="/" className="hover:text-pink-600 transition-colors">Home</Link>
          <span>/</span>
          <Link to="/blog" className="hover:text-pink-600 transition-colors">Blog</Link>
          <span>/</span>
          <span className="text-gray-700">{post.title}</span>
        </nav>

        {/* Main Content Card */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
          {/* Hero Section */}
          <div className="h-64 md:h-80 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl mb-4 opacity-50">
                {post.category === 'safety' && '🛡️'}
                {post.category === 'tips' && '💡'}
                {post.category === 'features' && '⭐'}
                {post.category === 'community' && '👥'}
                {post.category === 'language-learning' && '🌍'}
              </div>
              <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold
                ${post.category === 'safety' ? 'bg-green-100 text-green-700' : ''}
                ${post.category === 'tips' ? 'bg-blue-100 text-blue-700' : ''}
                ${post.category === 'features' ? 'bg-purple-100 text-purple-700' : ''}
                ${post.category === 'community' ? 'bg-pink-100 text-pink-700' : ''}
                ${post.category === 'language-learning' ? 'bg-orange-100 text-orange-700' : ''}
              `}>
                {categories[post.category].name}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-8 md:p-12">
            {/* Title */}
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Meta */}
            <div className="flex flex-wrap items-center gap-4 text-gray-500 mb-8 pb-8 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">PC</span>
                </div>
                <span className="font-medium text-gray-700">{post.author}</span>
              </div>
              <span>•</span>
              <span>{new Date(post.publishedAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}</span>
              <span>•</span>
              <span>{post.readTime} min read</span>
            </div>

            {/* Ad Placeholder - In-Content */}
            <div className="bg-gray-100 rounded-xl p-4 mb-8 text-center">
              <p className="text-gray-500 text-xs mb-2">Advertisement</p>
              <div className="h-[250px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
                <span className="text-gray-400">300x250 Rectangle Ad</span>
              </div>
            </div>

            {/* Article Content */}
            <div className="prose prose-lg max-w-none">
              {formatContent(post.content)}
            </div>

            {/* Tags */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Tags:</h4>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Share */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Share this article:</h4>
              <div className="flex gap-3">
                <button className="p-3 bg-[#1DA1F2] text-white rounded-full hover:opacity-90 transition-opacity">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
                  </svg>
                </button>
                <button className="p-3 bg-[#3b5998] text-white rounded-full hover:opacity-90 transition-opacity">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
                  </svg>
                </button>
                <button className="p-3 bg-[#0077b5] text-white rounded-full hover:opacity-90 transition-opacity">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M4.98 3.5c0 1.381-1.11 2.5-2.48 2.5s-2.48-1.119-2.48-2.5c0-1.38 1.11-2.5 2.48-2.5s2.48 1.12 2.48 2.5zm.02 4.5h-5v16h5v-16zm7.982 0h-4.968v16h4.969v-8.399c0-4.67 6.029-5.052 6.029 0v8.399h4.988v-10.131c0-7.88-8.922-7.593-11.018-3.714v-2.155z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Related Posts */}
        {recentPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">More Articles</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {recentPosts.slice(0, 2).map((relatedPost) => (
                <Link
                  key={relatedPost.id}
                  to={`/blog/${relatedPost.slug}`}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow group"
                >
                  <div className="h-32 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
                    <div className="text-4xl opacity-50">
                      {relatedPost.category === 'safety' && '🛡️'}
                      {relatedPost.category === 'tips' && '💡'}
                      {relatedPost.category === 'features' && '⭐'}
                      {relatedPost.category === 'community' && '👥'}
                      {relatedPost.category === 'language-learning' && '🌍'}
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-pink-600 transition-colors line-clamp-2">
                      {relatedPost.title}
                    </h3>
                    <p className="text-gray-600 text-sm mt-2 line-clamp-2">{relatedPost.excerpt}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Ad Placeholder - Bottom */}
        <div className="bg-gray-200 rounded-xl p-4 mt-12 text-center">
          <p className="text-gray-500 text-sm">Advertisement Space - 728x90 Leaderboard</p>
          <div className="h-[90px] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg mt-2">
            <span className="text-gray-400">Ad Unit Here</span>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-3xl p-8 text-center text-white">
          <h2 className="text-2xl font-bold mb-4">Ready to Start Chatting?</h2>
          <p className="opacity-90 mb-6">Meet new people from around the world instantly.</p>
          <Link
            to="/"
            className="inline-block px-8 py-3 bg-white text-pink-600 font-bold rounded-full hover:bg-gray-100 transition-colors shadow-lg"
          >
            Start Video Chat
          </Link>
        </div>

        {/* Back to Blog */}
        <div className="mt-12 text-center">
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 text-pink-600 hover:text-pink-700 font-semibold transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Blog
          </Link>
        </div>
      </article>
    </div>
  );
}
