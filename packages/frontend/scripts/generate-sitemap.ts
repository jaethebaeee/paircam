import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://paircam.live';

// Blog posts data - kept in sync with blogData.ts
const blogPosts = [
  { slug: 'how-to-stay-safe-video-chatting-strangers', updatedAt: '2024-12-01' },
  { slug: 'best-conversation-starters-video-chat', updatedAt: '2024-11-28' },
  { slug: 'language-learning-video-chat', updatedAt: '2024-11-25' },
  { slug: 'paircam-premium-features-guide', updatedAt: '2024-12-01' },
  { slug: 'making-friends-online-video-chat', updatedAt: '2024-11-15' },
];

// Define all static routes with their properties
const staticRoutes = [
  {
    url: '/',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    url: '/blog',
    changefreq: 'daily',
    priority: 0.9,
  },
  {
    url: '/terms-of-service',
    changefreq: 'monthly',
    priority: 0.5,
  },
  {
    url: '/privacy-policy',
    changefreq: 'monthly',
    priority: 0.5,
  },
  {
    url: '/cookie-policy',
    changefreq: 'monthly',
    priority: 0.5,
  },
];

// Generate blog post routes dynamically
const blogRoutes = blogPosts.map((post) => ({
  url: `/blog/${post.slug}`,
  changefreq: 'weekly' as const,
  priority: 0.8,
  lastmod: post.updatedAt,
}));

// Combine all routes
const routes = [...staticRoutes, ...blogRoutes];

async function generateSitemap() {
  const sitemap = new SitemapStream({ hostname: BASE_URL });
  const outputPath = resolve(__dirname, '../public/sitemap.xml');
  const writeStream = createWriteStream(outputPath);

  sitemap.pipe(writeStream);

  // Add all routes
  routes.forEach((route) => {
    sitemap.write({
      url: route.url,
      changefreq: route.changefreq as any,
      priority: route.priority,
      lastmod: (route as any).lastmod || new Date().toISOString().split('T')[0],
    });
  });

  sitemap.end();

  await streamToPromise(sitemap);
  console.log('✅ Sitemap generated successfully at:', outputPath);
}

generateSitemap().catch((err) => {
  console.error('❌ Error generating sitemap:', err);
  process.exit(1);
});

