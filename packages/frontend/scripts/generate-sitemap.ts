import { SitemapStream, streamToPromise } from 'sitemap';
import { createWriteStream } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://paircam.live';

// Define all routes with their properties
const routes = [
  {
    url: '/',
    changefreq: 'daily',
    priority: 1.0,
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

