import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const BASE_URL = 'https://paircam.live';

// Blog posts data (keep in sync with src/data/blogPosts.ts)
const blogPosts = [
  {
    slug: 'omegle-alternatives-2024-best-random-video-chat-sites',
    title: 'Top 10 Omegle Alternatives in 2024: Best Random Video Chat Sites',
    description: 'Discover the best Omegle alternatives for random video chat in 2024. Compare safety features, user experience, and find your perfect chat platform.',
    author: 'PairCam Team',
    publishedDate: '2024-01-15',
    category: 'Guides',
  },
  {
    slug: 'video-chat-safety-tips-protect-yourself-online',
    title: 'Video Chat Safety: 10 Essential Tips to Protect Yourself Online',
    description: 'Learn essential video chat safety tips. Protect your privacy, avoid scams, and stay secure while connecting with strangers online.',
    author: 'PairCam Safety Team',
    publishedDate: '2024-02-20',
    category: 'Safety',
  },
  {
    slug: 'make-friends-online-random-video-chat-guide',
    title: 'How to Make Friends Online: A Complete Guide to Random Video Chat',
    description: 'Learn how to make genuine connections and friends through random video chat. Tips for great conversations and building lasting friendships online.',
    author: 'PairCam Community',
    publishedDate: '2024-03-10',
    category: 'Community',
  },
  {
    slug: 'random-video-chat-vs-dating-apps-which-better',
    title: 'Random Video Chat vs Dating Apps: Which Is Better for Meeting People?',
    description: 'Compare random video chat platforms like PairCam with traditional dating apps. Discover which method works best for meeting new people.',
    author: 'PairCam Team',
    publishedDate: '2024-04-05',
    category: 'Comparison',
  },
  {
    slug: 'learn-languages-random-video-chat-native-speakers',
    title: 'Learn Languages Through Random Video Chat: Practice with Native Speakers',
    description: 'Discover how random video chat helps you learn languages faster. Practice speaking with native speakers from around the world for free.',
    author: 'PairCam Education',
    publishedDate: '2024-05-18',
    category: 'Education',
  },
  {
    slug: 'random-video-chat-for-introverts-social-anxiety-tips',
    title: 'Random Video Chat for Introverts: Overcoming Social Anxiety Online',
    description: 'Discover how random video chat can help introverts build social confidence. Tips for managing anxiety and enjoying online connections.',
    author: 'PairCam Wellness',
    publishedDate: '2024-06-22',
    category: 'Wellness',
  },
];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function generateRssFeed(): string {
  const now = new Date().toUTCString();

  const items = blogPosts
    .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime())
    .map(post => {
      const pubDate = new Date(post.publishedDate).toUTCString();
      return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${BASE_URL}/blog/${post.slug}</link>
      <guid isPermaLink="true">${BASE_URL}/blog/${post.slug}</guid>
      <description>${escapeXml(post.description)}</description>
      <author>support@paircam.live (${escapeXml(post.author)})</author>
      <category>${escapeXml(post.category)}</category>
      <pubDate>${pubDate}</pubDate>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>PairCam Blog</title>
    <link>${BASE_URL}/blog</link>
    <description>Tips, guides, and insights about random video chat, online safety, and making connections worldwide.</description>
    <language>en-us</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${BASE_URL}/blog/rss.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${BASE_URL}/logo.png</url>
      <title>PairCam Blog</title>
      <link>${BASE_URL}/blog</link>
      <width>144</width>
      <height>144</height>
    </image>
    <copyright>Copyright ${new Date().getFullYear()} PairCam. All rights reserved.</copyright>
    <managingEditor>support@paircam.live (PairCam Team)</managingEditor>
    <webMaster>support@paircam.live (PairCam Team)</webMaster>
    <ttl>60</ttl>
${items}
  </channel>
</rss>`;
}

async function main() {
  const rss = generateRssFeed();
  const outputPath = resolve(__dirname, '../public/blog/rss.xml');

  // Ensure blog directory exists
  const blogDir = resolve(__dirname, '../public/blog');
  try {
    await import('fs').then(fs => {
      if (!fs.existsSync(blogDir)) {
        fs.mkdirSync(blogDir, { recursive: true });
      }
    });
  } catch {
    // Directory might already exist
  }

  writeFileSync(outputPath, rss, 'utf-8');
  console.log('✅ RSS feed generated successfully at:', outputPath);
}

main().catch((err) => {
  console.error('❌ Error generating RSS feed:', err);
  process.exit(1);
});
