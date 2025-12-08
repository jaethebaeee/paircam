import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://livecam.app';

// Blog posts data for sitemap (update when adding new posts)
const blogPosts = [
  { slug: 'omegle-alternatives-2024-best-random-video-chat-sites', lastmod: '2024-12-01' },
  { slug: 'video-chat-safety-tips-protect-yourself-online', lastmod: '2024-12-01' },
  { slug: 'make-friends-online-random-video-chat-guide', lastmod: '2024-12-01' },
  { slug: 'random-video-chat-vs-dating-apps-which-better', lastmod: '2024-12-01' },
  { slug: 'learn-languages-random-video-chat-native-speakers', lastmod: '2024-12-01' },
  { slug: 'random-video-chat-for-introverts-social-anxiety-tips', lastmod: '2024-12-01' },
];

// Define all routes with their properties
const routes = [
  {
    url: '/',
    changefreq: 'daily',
    priority: 1.0,
  },
  {
    url: '/#faq',
    changefreq: 'weekly',
    priority: 0.8,
  },
  {
    url: '/blog',
    changefreq: 'daily',
    priority: 0.9,
  },
  ...blogPosts.map(post => ({
    url: `/blog/${post.slug}`,
    changefreq: 'weekly',
    priority: 0.7,
    lastmod: post.lastmod,
  })),
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
      lastmod: new Date().toISOString().split('T')[0], // Current date in YYYY-MM-DD
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

