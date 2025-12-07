import { Link } from 'react-router-dom';
import { getAllBlogPosts, getAllCategories } from '../../data/blogPosts';
import SEO from '../SEO';
import { useState } from 'react';

export default function BlogList() {
  const posts = getAllBlogPosts();
  const categories = getAllCategories();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = posts.filter(post => {
    const matchesCategory = !selectedCategory || post.category === selectedCategory;
    const matchesSearch = !searchQuery ||
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Schema.org Blog structured data
  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    "name": "PairCam Blog",
    "description": "Tips, guides, and insights about random video chat, online safety, and making connections worldwide.",
    "url": "https://paircam.live/blog",
    "publisher": {
      "@type": "Organization",
      "name": "PairCam",
      "logo": {
        "@type": "ImageObject",
        "url": "https://paircam.live/logo.png"
      }
    },
    "blogPost": posts.slice(0, 10).map(post => ({
      "@type": "BlogPosting",
      "headline": post.title,
      "description": post.metaDescription,
      "url": `https://paircam.live/blog/${post.slug}`,
      "datePublished": post.publishedDate,
      "dateModified": post.modifiedDate,
      "author": {
        "@type": "Person",
        "name": post.author
      }
    }))
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <SEO
        title="Blog - Video Chat Tips & Guides"
        description="Expert tips on random video chat, online safety, making friends, and language learning. Stay informed with PairCam's comprehensive guides."
        url="https://paircam.live/blog"
        keywords="video chat tips, omegle alternative guide, online safety, random chat advice, video chat blog"
        jsonLd={blogSchema}
      />

      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-pink-600 via-purple-600 to-blue-600 bg-clip-text text-transparent mb-4">
            PairCam Blog
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Tips, guides, and insights about video chat, online safety, and connecting with people worldwide.
          </p>
        </header>

        {/* Search Bar */}
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-5 py-4 pl-12 rounded-2xl border-2 border-gray-200 bg-white focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none text-base transition-all placeholder:text-gray-400 shadow-sm"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Clear search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Category Filter */}
        <nav className="mb-10" aria-label="Blog categories">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-4 sm:px-5 py-2 rounded-full font-medium text-sm sm:text-base transition-all ${
                selectedCategory === null
                  ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              All Posts
            </button>
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 sm:px-5 py-2 rounded-full font-medium text-sm sm:text-base transition-all ${
                  selectedCategory === category
                    ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </nav>

        {/* Results count */}
        {(searchQuery || selectedCategory) && (
          <p className="text-center text-gray-500 mb-6">
            {filteredPosts.length} {filteredPosts.length === 1 ? 'article' : 'articles'} found
            {searchQuery && <span> for "{searchQuery}"</span>}
            {selectedCategory && <span> in {selectedCategory}</span>}
          </p>
        )}

        {/* Featured Post (First Post) - Only show when no filters active */}
        {filteredPosts.length > 0 && !selectedCategory && !searchQuery && (
          <article className="mb-12">
            <Link
              to={`/blog/${filteredPosts[0].slug}`}
              className="block group"
            >
              <div className="bg-white rounded-3xl shadow-xl overflow-hidden hover:shadow-2xl transition-shadow border border-gray-100">
                <div className="md:flex">
                  <div className="md:w-1/2 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 p-8 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-6xl mb-4 block">
                        {filteredPosts[0].category === 'Guides' ? '📚' :
                         filteredPosts[0].category === 'Safety' ? '🛡️' :
                         filteredPosts[0].category === 'Community' ? '👥' :
                         filteredPosts[0].category === 'Education' ? '🎓' : '📝'}
                      </span>
                      <span className="inline-block px-4 py-1 bg-white/80 rounded-full text-sm font-medium text-purple-600">
                        Featured
                      </span>
                    </div>
                  </div>
                  <div className="md:w-1/2 p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-xs font-semibold rounded-full">
                        {filteredPosts[0].category}
                      </span>
                      <span className="text-sm text-gray-500">
                        {filteredPosts[0].readTime} min read
                      </span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 group-hover:text-purple-600 transition-colors">
                      {filteredPosts[0].title}
                    </h2>
                    <p className="text-gray-600 mb-6 leading-relaxed">
                      {filteredPosts[0].excerpt}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-white font-bold">
                          {filteredPosts[0].author.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{filteredPosts[0].author}</p>
                          <p className="text-sm text-gray-500">
                            {new Date(filteredPosts[0].publishedDate).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <span className="text-pink-600 font-semibold group-hover:translate-x-2 transition-transform inline-flex items-center gap-1">
                        Read More
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          </article>
        )}

        {/* No Results State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No articles found</h3>
            <p className="text-gray-600 mb-6">Try adjusting your search or filter criteria</p>
            <button
              onClick={() => { setSearchQuery(''); setSelectedCategory(null); }}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-medium rounded-full hover:shadow-lg transition-all"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Blog Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {((selectedCategory || searchQuery) ? filteredPosts : filteredPosts.slice(1)).map(post => (
            <article key={post.id}>
              <Link
                to={`/blog/${post.slug}`}
                className="block group h-full"
              >
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all h-full flex flex-col border border-gray-100 hover:border-purple-200">
                  {/* Thumbnail placeholder */}
                  <div className="h-48 bg-gradient-to-br from-pink-100 via-purple-100 to-blue-100 flex items-center justify-center">
                    <span className="text-5xl">
                      {post.category === 'Guides' ? '📚' :
                       post.category === 'Safety' ? '🛡️' :
                       post.category === 'Community' ? '👥' :
                       post.category === 'Comparison' ? '⚖️' :
                       post.category === 'Education' ? '🎓' :
                       post.category === 'Wellness' ? '💚' : '📝'}
                    </span>
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                        {post.category}
                      </span>
                      <span className="text-xs text-gray-500">{post.readTime} min</span>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-3 group-hover:text-purple-600 transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 flex-1 line-clamp-3">
                      {post.excerpt}
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <span className="text-sm text-gray-500">
                        {new Date(post.publishedDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      <span className="text-pink-600 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                        Read
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        {/* CTA Section */}
        <section className="mt-16 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-3xl p-10 text-center text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Start Chatting?</h2>
          <p className="text-lg text-white/90 mb-6 max-w-xl mx-auto">
            Put these tips into practice. Connect with people from around the world in seconds.
          </p>
          <Link
            to="/"
            className="inline-block bg-white text-purple-600 font-bold px-8 py-4 rounded-full hover:shadow-xl transition-all hover:scale-105"
          >
            Start Free Video Chat
          </Link>
        </section>
      </div>
    </div>
  );
}
