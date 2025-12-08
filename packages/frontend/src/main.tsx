import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { enforceSecureConnection, validateSecurityConfig } from './utils/security';
import { onCLS, onFCP, onINP, onLCP, onTTFB } from 'web-vitals';
import * as Sentry from '@sentry/react';

// ═══════════════════════════════════════════════════════════════════
// ♿ ACCESSIBILITY: Runtime a11y testing in development
// ═══════════════════════════════════════════════════════════════════
if (import.meta.env.DEV) {
  // Dynamically import axe-core only in development
  import('@axe-core/react').then(axe => {
    axe.default(React, ReactDOM, 1000);
  }).catch(err => {
    console.warn('Failed to load axe-core accessibility testing:', err);
  });
}

// ═══════════════════════════════════════════════════════════════════
// 🐛 ERROR MONITORING: Initialize Sentry for production error tracking
// ═══════════════════════════════════════════════════════════════════
if (import.meta.env.PROD && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    // Ignore certain errors that aren't actionable
    ignoreErrors: [
      // Browser extensions and plugins
      'chrome-extension://',
      'moz-extension://',
      // Third-party scripts
      'top.GLOBALS',
    ],
  });
}

// ═══════════════════════════════════════════════════════════════════
// 🔒 SECURITY: Enforce HTTPS in production
// ═══════════════════════════════════════════════════════════════════
try {
  enforceSecureConnection();
  
  // Validate security configuration
  const securityCheck = validateSecurityConfig();
  if (!securityCheck.valid) {
    console.warn('⚠️  Security Configuration Warnings:');
    securityCheck.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }
} catch (error) {
  // If enforceSecureConnection redirects to HTTPS, this will throw
  // We catch it to prevent render, as the page is redirecting
  if (error instanceof Error && error.message !== 'Redirecting to HTTPS') {
    console.error('Security check failed:', error);
  }
  // Don't render if redirecting
  if (error instanceof Error && error.message === 'Redirecting to HTTPS') {
    throw error;
  }
}

const rootElement = document.getElementById('root')!;

// Support react-snap pre-rendering
if (rootElement.hasChildNodes()) {
  // Page was pre-rendered by react-snap, so we hydrate
  ReactDOM.hydrateRoot(
    rootElement,
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>,
  );
} else {
  // Normal client-side rendering
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <AuthProvider>
        <App />
      </AuthProvider>
    </React.StrictMode>,
  );
}

// ═══════════════════════════════════════════════════════════════════
// 📊 WEB VITALS: Track Core Web Vitals for SEO & Performance
// ═══════════════════════════════════════════════════════════════════
const reportWebVitals = (metric: { name: string; value: number; id: string }) => {
  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
    });
  }

  // Log in development for debugging
  if (import.meta.env.DEV) {
    console.log(`[Web Vitals] ${metric.name}:`, metric.value);
  }
};

// Track all Core Web Vitals
onCLS(reportWebVitals);  // Cumulative Layout Shift
onFCP(reportWebVitals);  // First Contentful Paint
onINP(reportWebVitals);  // Interaction to Next Paint
onLCP(reportWebVitals);  // Largest Contentful Paint
onTTFB(reportWebVitals); // Time to First Byte
