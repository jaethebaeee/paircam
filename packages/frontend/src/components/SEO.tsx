import { useEffect } from 'react';

interface SEOProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  type?: string;
  keywords?: string;
  jsonLd?: object | object[]; // Schema.org structured data (single or multiple)
}

/**
 * SEO Component for dynamic meta tags
 * Optimizes search engine indexing and social media sharing
 */
export default function SEO({
  title,
  description,
  image,
  url,
  type = 'website',
  keywords,
  jsonLd,
}: SEOProps) {
  const defaultTitle = 'PairCam - Free Random Video Chat | Meet New People Online Instantly';
  const defaultDescription =
    'Free random video chat with strangers worldwide. No signup required. Start chatting instantly on PairCam - the safe, anonymous video chat alternative to Omegle and Chatroulette.';
  const defaultImage = 'https://paircam.live/og-image.jpg';
  const defaultUrl = 'https://paircam.live/';
  const defaultKeywords =
    'random video chat, omegle alternative, chatroulette, free video chat, random chat, meet strangers, video chat online, anonymous chat, webcam chat, paircam';

  const seoTitle = title ? `${title} | PairCam` : defaultTitle;
  const seoDescription = description || defaultDescription;
  const seoImage = image || defaultImage;
  const seoUrl = url || defaultUrl;
  const seoKeywords = keywords || defaultKeywords;

  useEffect(() => {
    // Update document title
    document.title = seoTitle;

    // Update or create meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      const attribute = property ? 'property' : 'name';
      let element = document.querySelector(
        `meta[${attribute}="${name}"]`
      ) as HTMLMetaElement;

      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }

      element.content = content;
    };

    // Standard meta tags
    updateMetaTag('description', seoDescription);
    updateMetaTag('keywords', seoKeywords);

    // Open Graph tags
    updateMetaTag('og:title', seoTitle, true);
    updateMetaTag('og:description', seoDescription, true);
    updateMetaTag('og:image', seoImage, true);
    updateMetaTag('og:url', seoUrl, true);
    updateMetaTag('og:type', type, true);

    // Twitter Card tags
    updateMetaTag('twitter:title', seoTitle);
    updateMetaTag('twitter:description', seoDescription);
    updateMetaTag('twitter:image', seoImage);
    updateMetaTag('twitter:card', 'summary_large_image');

    // Update canonical link
    let canonical = document.querySelector(
      'link[rel="canonical"]'
    ) as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = seoUrl;

    // Add or update JSON-LD structured data
    const jsonLdId = 'jsonld-schema';
    let jsonLdScript = document.getElementById(jsonLdId) as HTMLScriptElement;

    if (jsonLd) {
      if (!jsonLdScript) {
        jsonLdScript = document.createElement('script');
        jsonLdScript.id = jsonLdId;
        jsonLdScript.type = 'application/ld+json';
        document.head.appendChild(jsonLdScript);
      }
      // Handle both single objects and arrays of schema objects
      if (Array.isArray(jsonLd)) {
        jsonLdScript.textContent = JSON.stringify(jsonLd);
      } else {
        jsonLdScript.textContent = JSON.stringify(jsonLd);
      }
    } else if (jsonLdScript) {
      // Remove if no jsonLd prop provided
      jsonLdScript.remove();
    }
  }, [seoTitle, seoDescription, seoImage, seoUrl, type, seoKeywords, jsonLd]);

  return null; // This component doesn't render anything
}

