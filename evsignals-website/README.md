# EVSignals Website

Professional website for EVSignals - Real-Time EV Market Intelligence & Data API.

## Tech Stack

- **Framework**: [Astro](https://astro.build/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Hosting**: [Vercel](https://vercel.com/)

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
cd evsignals-website
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) in your browser.

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

## Deployment to Vercel

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com)
3. Import the repository
4. Set root directory to `evsignals-website`
5. Build settings will be auto-detected
6. Deploy!

### Environment Variables

None required for basic deployment.

## Project Structure

```
evsignals-website/
├── public/
│   ├── favicon.svg
│   ├── robots.txt
│   └── sitemap.xml
├── src/
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Hero.astro
│   │   ├── Metrics.astro
│   │   ├── Features.astro
│   │   ├── Solutions.astro
│   │   ├── Products.astro
│   │   └── CTA.astro
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       ├── index.astro
│       ├── solutions.astro
│       ├── products.astro
│       ├── about.astro
│       ├── contact.astro
│       ├── privacy.astro
│       └── terms.astro
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
└── package.json
```

## Pages

- **/** - Homepage with hero, metrics, features, solutions overview
- **/solutions** - Industry-specific solutions (Automotive, Energy, Financial, Fleet)
- **/products** - Product details (Market Data API, Charging Feed, Battery Analytics)
- **/about** - Company mission, values, and what we do
- **/contact** - Contact form and company information
- **/privacy** - Privacy Policy
- **/terms** - Terms of Service

## Customization

### Colors

Edit `tailwind.config.mjs` to change the primary (green) and accent (blue) colors.

### Content

All content is in the `.astro` files under `src/pages/` and `src/components/`.

### Contact Form

The contact form uses Formspree. Update the form action URL in `src/pages/contact.astro`:

```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

## License

Copyright © 2024 EVSignals. All rights reserved.
